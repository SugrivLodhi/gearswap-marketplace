require("dotenv").config();
const { Kafka } = require("kafkajs");
const { MongoClient } = require("mongodb");
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
const clientId = process.env.KAFKA_CLIENT_ID || "gearswap-analytics-service";
const groupId = process.env.KAFKA_GROUP_ID || "analytics-service";
const mongodbUri = process.env.MONGODB_URI || "mongodb://mongo:27017/gearswap";
const dbName = process.env.DATABASE_NAME || "gearswap";

const topics = [
  "user.registered",
  "product.created",
  "product.updated",
  "product.deleted",
  "product.moderated",
  "order.checkout.initiated",
  "order.confirmed",
  "order.status.changed",
  "payment.succeeded",
  "payment.failed",
];

function metricUpdate(topic, event) {
  switch (topic) {
    case "user.registered":
      return { $inc: { totalUsers: 1 } };
    case "product.created":
      return { $inc: { totalProductsCreated: 1, activeProducts: 1 } };
    case "product.deleted":
    case "product.moderated":
      return { $inc: { totalProductsRemoved: 1, activeProducts: -1 } };
    case "order.checkout.initiated":
      return { $inc: { totalCheckoutsInitiated: 1 }, $set: { lastCheckoutOrderId: event.orderId || null } };
    case "order.confirmed":
      return { $inc: { totalOrdersConfirmed: 1 } };
    case "payment.succeeded":
      return { $inc: { totalPaymentsSucceeded: 1, totalRevenue: Number(event.amount || 0) } };
    case "payment.failed":
      return { $inc: { totalPaymentsFailed: 1 } };
    default:
      return null;
  }
}

async function run() {
  if (!kafkaEnabled) {
    logger.warn("KAFKA_ENABLED is false. Analytics service is idle.");
    return;
  }

  const mongo = new MongoClient(mongodbUri);
  await mongo.connect();
  const db = mongo.db(dbName);
  const metrics = db.collection("analytics_metrics");
  const events = db.collection("analytics_events");

  const kafka = new Kafka({ clientId, brokers });
  const consumer = kafka.consumer({ groupId });

  await consumer.connect();
  for (const topic of topics) {
    await consumer.subscribe({ topic, fromBeginning: false });
  }
  logger.info({ topics, brokers, groupId }, "Analytics service started");

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      if (!message.value) return;
      try {
        const event = JSON.parse(message.value.toString("utf8"));
        await events.insertOne({
          topic,
          key: message.key ? message.key.toString("utf8") : null,
          payload: event,
          receivedAt: new Date(),
        });
        const update = metricUpdate(topic, event);
        if (!update) {
          return;
        }
        await metrics.updateOne(
          { _id: "global" },
          {
            ...update,
            $set: update.$set
              ? { ...update.$set, updatedAt: new Date() }
              : { updatedAt: new Date() },
          },
          { upsert: true }
        );
      } catch (error) {
        logger.error({ err: error, topic }, "Failed to process analytics event");
      }
    },
  });

  const shutdown = async () => {
    logger.info("Shutting down analytics service");
    await consumer.disconnect();
    await mongo.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

run().catch((error) => {
  logger.error({ err: error }, "Analytics service failed");
  process.exit(1);
});
