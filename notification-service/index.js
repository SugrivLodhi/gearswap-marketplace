require("dotenv").config();
const { Kafka } = require("kafkajs");
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
const clientId = process.env.KAFKA_CLIENT_ID || "gearswap-notification-service";
const groupId = process.env.KAFKA_GROUP_ID || "notification-service";

const topics = ["order.status.changed", "order.confirmed"];

const formatStatusMessage = (event) => {
  const status = event.currentStatus || event.status || "UPDATED";
  return `Order ${event.orderId} status changed to ${status}.`;
};

async function run() {
  if (!kafkaEnabled) {
    logger.warn("KAFKA_ENABLED is false. Notification service is idle.");
    return;
  }

  const kafka = new Kafka({ clientId, brokers });
  const consumer = kafka.consumer({ groupId });

  await consumer.connect();
  for (const topic of topics) {
    await consumer.subscribe({ topic, fromBeginning: false });
  }

  logger.info({ topics, groupId, brokers }, "Notification service started");

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      if (!message.value) return;
      try {
        const event = JSON.parse(message.value.toString("utf8"));

        // This service is intentionally non-invasive for now:
        // it consumes domain events independently and can later fan out to
        // email/push/SMS providers without impacting API request latency.
        logger.info(
          {
            topic,
            key: message.key ? message.key.toString("utf8") : undefined,
            orderId: event.orderId,
          },
          formatStatusMessage(event)
        );
      } catch (error) {
        logger.error({ err: error, topic }, "Failed to process notification event");
      }
    },
  });

  const shutdown = async () => {
    logger.info("Shutting down notification service");
    await consumer.disconnect();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

run().catch((error) => {
  logger.error({ err: error }, "Notification service failed");
  process.exit(1);
});
