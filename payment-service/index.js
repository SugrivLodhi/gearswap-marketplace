require("dotenv").config();
const express = require("express");
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

const app = express();
app.use(express.json({ limit: "1mb" }));

const port = Number.parseInt(process.env.PORT || "9001", 10);
const kafkaEnabled = process.env.KAFKA_ENABLED === "true";
const brokers = (process.env.KAFKA_BROKERS || "kafka:9092").split(",").map((v) => v.trim());
const clientId = process.env.KAFKA_CLIENT_ID || "gearswap-payment-service";
const groupId = process.env.KAFKA_GROUP_ID || "payment-service";

let producer = null;
const intentStore = new Map();

function nowIso() {
  return new Date().toISOString();
}

async function publish(topic, payload, key) {
  if (!producer) return;
  try {
    await producer.send({
      topic,
      messages: [{ key, value: JSON.stringify({ ...payload, eventType: topic, emittedAt: nowIso() }) }],
    });
  } catch (error) {
    logger.error({ err: error, topic }, "Payment event publish failed");
  }
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "payment-service", timestamp: nowIso() });
});

app.get("/intents/:orderId", (req, res) => {
  const intent = intentStore.get(req.params.orderId);
  if (!intent) {
    return res.status(404).json({ message: "Payment intent not found" });
  }
  return res.json(intent);
});

// Webhook endpoint (ready for Razorpay callback integration).
app.post("/webhooks/razorpay", async (req, res) => {
  const body = req.body || {};
  const orderId = body.orderId || body.payload?.payment?.entity?.notes?.orderId;
  const paymentId = body.paymentId || body.payload?.payment?.entity?.id;
  const status = body.status || body.event;

  if (!orderId) {
    return res.status(400).json({ message: "Missing orderId" });
  }

  if (status === "payment.captured" || status === "payment.authorized" || body.success === true) {
    await publish(
      "payment.succeeded",
      {
        orderId,
        paymentId,
        paymentProvider: "razorpay",
        rawStatus: status,
      },
      orderId
    );
    await publish("order.confirmed", { orderId, source: "payment-webhook" }, orderId);
  } else {
    await publish(
      "payment.failed",
      {
        orderId,
        paymentId,
        paymentProvider: "razorpay",
        rawStatus: status || "failed",
      },
      orderId
    );
  }

  return res.json({ ok: true });
});

async function startKafka() {
  if (!kafkaEnabled) {
    logger.warn("KAFKA_ENABLED is false. Payment service runs in HTTP-only mode.");
    return;
  }

  const kafka = new Kafka({ clientId, brokers });
  producer = kafka.producer();
  await producer.connect();

  const consumer = kafka.consumer({ groupId });
  await consumer.connect();
  await consumer.subscribe({ topic: "order.checkout.initiated", fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      try {
        const event = JSON.parse(message.value.toString("utf8"));
        const orderId = event.orderId;
        if (!orderId) return;
        intentStore.set(orderId, {
          orderId,
          amount: event.grandTotal,
          currency: "INR",
          status: "AWAITING_PAYMENT",
          createdAt: nowIso(),
        });
        logger.info({ orderId }, "Created payment intent from checkout event");
      } catch (error) {
        logger.error({ err: error }, "Failed processing checkout event");
      }
    },
  });
}

async function start() {
  await startKafka();
  app.listen(port, () => {
    logger.info({ port }, "Payment service started");
  });
}

start().catch((error) => {
  logger.error({ err: error }, "Payment service failed");
  process.exit(1);
});
