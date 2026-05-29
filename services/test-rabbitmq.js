// test-rabbitmq.js
const amqp = require("amqplib");

async function send() {
  const conn = await amqp.connect("amqp://guest:guest@localhost:5672");
  const channel = await conn.createChannel();

  const queue = "community.user.suspended";
  await channel.assertQueue(queue, { durable: true });
  channel.sendToQueue(queue, Buffer.from(JSON.stringify({ userId: 1 })));
  console.log("메시지 발행 완료");

  setTimeout(() => conn.close(), 500);
}

send();
