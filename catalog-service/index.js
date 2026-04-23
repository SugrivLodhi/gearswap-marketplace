require("dotenv").config();
const { Kafka } = require("kafkajs");
const { MongoClient, ObjectId } = require("mongodb");
const pino = require("pino");
const express = require("express");

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  ...(process.env.NODE_ENV !== "production" && {
    transport: {
      target: "pino-pretty",
      options: { colorize: true, translateTime: "SYS:standard", ignore: "pid,hostname" },
    },
  }),
});

const kafkaEnabled = process.env.KAFKA_ENABLED === "true";
const brokers = (process.env.KAFKA_BROKERS || "kafka:9092").split(",").map((v) => v.trim());
const clientId = process.env.KAFKA_CLIENT_ID || "gearswap-catalog-service";
const groupId = process.env.KAFKA_GROUP_ID || "catalog-service";
const mongodbUri = process.env.MONGODB_URI || "mongodb://mongo:27017/gearswap";
const dbName = process.env.DATABASE_NAME || "gearswap";
const port = Number.parseInt(process.env.PORT || "9002", 10);

let producer;

function startOpsServer(reservations) {
  const app = express();

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "catalog-service", timestamp: nowIso() });
  });

  app.get("/ops/inventory-reservations", async (req, res) => {
    const limitRaw = req.query.limit;
    const limit = Math.max(1, Math.min(200, Number.parseInt(limitRaw || "50", 10)));
    const items = await reservations
      .find({})
      .sort({ updatedAt: -1 })
      .limit(limit)
      .toArray();
    res.json(items);
  });

  app.get("/ops/inventory-reservations/:requestId", async (req, res) => {
    const item = await reservations.findOne({ requestId: req.params.requestId });
    if (!item) {
      return res.status(404).json({ message: "Reservation not found" });
    }
    return res.json(item);
  });

  app.listen(port, () => {
    logger.info({ port }, "Catalog ops server started");
  });
}

function nowIso() {
  return new Date().toISOString();
}

async function publish(topic, payload, key) {
  if (!producer) return;
  await producer.send({
    topic,
    messages: [
      {
        key,
        value: JSON.stringify({ ...payload, eventType: topic, emittedAt: nowIso() }),
      },
    ],
  });
}

async function validateOrReserveItems(products, items, mode) {
  const reserved = [];
  for (const item of items) {
    const productId = item.productId;
    const variantId = item.variantId;
    const quantity = Number(item.quantity || 0);
    if (!productId || !variantId || quantity <= 0) {
      throw new Error("Invalid inventory item");
    }

    if (mode === "shadow") {
      const exists = await products.findOne({
        _id: new ObjectId(productId),
        isDeleted: false,
        variants: { $elemMatch: { _id: new ObjectId(variantId), stock: { $gte: quantity } } },
      });
      if (!exists) {
        throw new Error(`Insufficient stock for ${productId}/${variantId}`);
      }
      continue;
    }

    const result = await products.updateOne(
      {
        _id: new ObjectId(productId),
        isDeleted: false,
        variants: { $elemMatch: { _id: new ObjectId(variantId), stock: { $gte: quantity } } },
      },
      {
        $inc: { "variants.$.stock": -quantity },
      }
    );

    if (result.modifiedCount !== 1) {
      throw new Error(`Insufficient stock for ${productId}/${variantId}`);
    }
    reserved.push({ productId, variantId, quantity });
  }

  return reserved;
}

async function rollbackReservation(products, reserved) {
  for (const item of reserved) {
    await products.updateOne(
      {
        _id: new ObjectId(item.productId),
        variants: { $elemMatch: { _id: new ObjectId(item.variantId) } },
      },
      {
        $inc: { "variants.$.stock": item.quantity },
      }
    );
  }
}

async function getReservationByRequestId(reservations, requestId) {
  if (!requestId) return null;
  return reservations.findOne({ requestId });
}

async function saveReservationOutcome(reservations, payload) {
  await reservations.updateOne(
    { requestId: payload.requestId },
    {
      $set: {
        ...payload,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );
}

async function handleReserveRequest({ event, products, reservations }) {
  const requestId = event.requestId || `reserve-${Date.now()}`;
  const mode = event.mode || "reserve";
  const orderId = event.orderId || null;
  const items = Array.isArray(event.items) ? event.items : [];

  const existing = await getReservationByRequestId(reservations, requestId);
  if (existing) {
    await publish(
      "inventory.reserve.reply",
      {
        requestId,
        orderId,
        success: existing.success,
        mode: existing.mode || mode,
        reason: existing.reason || undefined,
        deduplicated: true,
      },
      orderId || requestId
    );
    return;
  }

  let reserved = [];
  try {
    reserved = await validateOrReserveItems(products, items, mode);
    await saveReservationOutcome(reservations, {
      requestId,
      orderId,
      mode,
      success: true,
      released: false,
      items: mode === "reserve" ? reserved : items,
      reason: null,
    });
    await publish(
      "inventory.reserve.reply",
      {
        requestId,
        orderId,
        success: true,
        mode,
      },
      orderId || requestId
    );
  } catch (error) {
    if (reserved.length > 0) {
      await rollbackReservation(products, reserved);
    }
    await saveReservationOutcome(reservations, {
      requestId,
      orderId,
      mode,
      success: false,
      released: false,
      items,
      reason: error.message || "Reservation failed",
    });
    await publish(
      "inventory.reserve.reply",
      {
        requestId,
        orderId,
        success: false,
        mode,
        reason: error.message || "Reservation failed",
      },
      orderId || requestId
    );
  }
}

async function handleReleaseRequest({ event, products, reservations }) {
  const requestId = event.requestId || event.reservationRequestId || null;

  if (requestId) {
    const reservation = await getReservationByRequestId(reservations, requestId);
    if (!reservation?.success) {
      logger.info({ requestId }, "Release skipped for missing/failed reservation");
      return;
    }
    if (reservation.released) {
      logger.info({ requestId }, "Release skipped for already released reservation");
      return;
    }

    const items = Array.isArray(reservation.items) ? reservation.items : [];
    await rollbackReservation(products, items);
    await reservations.updateOne(
      { requestId },
      { $set: { released: true, releasedAt: new Date(), updatedAt: new Date() } }
    );
    return;
  }

  // Backward compatibility fallback for older event shape
  const items = Array.isArray(event.items) ? event.items : [];
  await rollbackReservation(products, items);
}

async function run() {
  if (!kafkaEnabled) {
    logger.warn("KAFKA_ENABLED is false. Catalog service is idle.");
    return;
  }

  const mongo = new MongoClient(mongodbUri);
  await mongo.connect();
  const db = mongo.db(dbName);
  const products = db.collection("products");
  const reservations = db.collection("inventory_reservations");
  await reservations.createIndex({ requestId: 1 }, { unique: true });
  startOpsServer(reservations);

  const kafka = new Kafka({ clientId, brokers });
  producer = kafka.producer();
  await producer.connect();

  const consumer = kafka.consumer({ groupId });
  await consumer.connect();
  const topics = [
    "inventory.reserve.request",
    "inventory.release.request",
    "user.deleted",
    "product.moderated",
  ];
  for (const topic of topics) {
    await consumer.subscribe({ topic, fromBeginning: false });
  }

  logger.info({ topics, groupId, brokers }, "Catalog service started");

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      if (!message.value) return;

      try {
        const event = JSON.parse(message.value.toString("utf8"));

        if (topic === "inventory.reserve.request") {
          await handleReserveRequest({ event, products, reservations });
          return;
        }

        if (topic === "inventory.release.request") {
          await handleReleaseRequest({ event, products, reservations });
          return;
        }

        if (topic === "user.deleted") {
          const userId = event.userId;
          if (!userId) return;
          const result = await products.updateMany(
            { sellerId: new ObjectId(userId), isDeleted: { $ne: true } },
            { $set: { isDeleted: true } }
          );
          logger.info({ userId, modified: result.modifiedCount }, "Soft-deleted seller products");
          return;
        }

        if (topic === "product.moderated") {
          const productId = event.productId;
          if (!productId) return;
          await products.updateOne(
            { _id: new ObjectId(productId) },
            { $set: { isDeleted: true } }
          );
        }
      } catch (error) {
        logger.error({ err: error, topic }, "Catalog event processing failed");
      }
    },
  });

  const shutdown = async () => {
    logger.info("Shutting down catalog service");
    await consumer.disconnect();
    await producer.disconnect();
    await mongo.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

run().catch((error) => {
  logger.error({ err: error }, "Catalog service failed");
  process.exit(1);
});
