require("dotenv").config();
const { Kafka } = require("kafkajs");
const { Client: TypesenseClient } = require("typesense");
const mongoose = require("mongoose");
const pino = require("pino");

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
const clientId = process.env.KAFKA_CLIENT_ID || "gearswap-search-indexer";
const groupId = process.env.KAFKA_GROUP_ID || "search-indexer";
const mongodbUri = process.env.MONGODB_URI || "mongodb://mongo:27017/gearswap";
const dbName = process.env.DATABASE_NAME || "gearswap";

const typesenseClient = new TypesenseClient({
  nodes: [
    {
      host: process.env.TYPESENSE_HOST || "typesense",
      port: Number.parseInt(process.env.TYPESENSE_PORT || "8108", 10),
      protocol: process.env.TYPESENSE_PROTOCOL || "http",
    },
  ],
  apiKey: process.env.TYPESENSE_API_KEY || "typesense-secret-key-gearswap",
  connectionTimeoutSeconds: 5,
});

const topics = ["product.created", "product.updated", "product.deleted", "product.moderated"];

function toTypesenseDoc(product) {
  return {
    id: product._id.toString(),
    name: product.name,
    description: product.description,
    category: product.category,
    sellerId: product.sellerId.toString(),
    prices: (product.variants || []).map((variant) => variant.price),
    imageUrl: product.imageUrl,
  };
}

async function upsertFromMongo(db, productId) {
  const products = db.collection("products");
  const product = await products.findOne({ _id: new mongoose.Types.ObjectId(productId) });
  if (!product || product.isDeleted) {
    await deleteInTypesense(productId);
    return;
  }

  await typesenseClient.collections("products").documents().upsert(toTypesenseDoc(product));
  logger.info({ productId }, "Indexed product in Typesense");
}

async function deleteInTypesense(productId) {
  try {
    await typesenseClient.collections("products").documents(productId).delete();
    logger.info({ productId }, "Deleted product from Typesense");
  } catch (error) {
    logger.warn({ err: error, productId }, "Delete in Typesense skipped or failed");
  }
}

async function run() {
  if (!kafkaEnabled) {
    logger.warn("KAFKA_ENABLED is false. Search indexer is idle.");
    return;
  }

  await mongoose.connect(mongodbUri, { dbName });
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("MongoDB connection db handle is unavailable");
  }

  const kafka = new Kafka({ clientId, brokers });
  const consumer = kafka.consumer({ groupId });
  await consumer.connect();
  for (const topic of topics) {
    await consumer.subscribe({ topic, fromBeginning: false });
  }

  logger.info({ topics, brokers, groupId }, "Search indexer started");

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      if (!message.value) return;
      try {
        const event = JSON.parse(message.value.toString("utf8"));
        const productId = event.productId;
        if (!productId) return;

        if (topic === "product.deleted" || topic === "product.moderated" || event.isDeleted) {
          await deleteInTypesense(productId);
        } else {
          await upsertFromMongo(db, productId);
        }
      } catch (error) {
        logger.error({ err: error, topic }, "Failed to process search indexing event");
      }
    },
  });

  const shutdown = async () => {
    logger.info("Shutting down search indexer");
    await consumer.disconnect();
    await mongoose.disconnect();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

run().catch((error) => {
  logger.error({ err: error }, "Search indexer failed");
  process.exit(1);
});
