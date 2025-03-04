import { NextResponse } from "next/server";
import amqp from "amqplib";
import getRabbitMQChannel from "@/lib/rabbitmq";

const QUEUE_NAME = "whatsapp_incoming_queue";

export async function GET() {
    try {
        const channel = await getRabbitMQChannel();
        await channel.assertQueue(QUEUE_NAME, { durable: true });

        let messages: any[] = [];

        await new Promise<void>((resolve) => {
            channel.consume(
                QUEUE_NAME,
                (msg) => {
                    if (msg) {
                        messages.push(JSON.parse(msg.content.toString()));
                    }
                },
                { noAck: false }
            );
            setTimeout(resolve, 11000);
        });

        await channel.close();

        return NextResponse.json({ messages });
    } catch (error) {
        console.error("Error fetching messages:", error);
        return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }
}