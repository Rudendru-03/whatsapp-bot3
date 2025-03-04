import { NextRequest, NextResponse } from "next/server";
// import getRabbitMQChannel from "@/lib/rabbitmq";
import { readExcel } from "@/lib/readExcel";
import { addUser, getUsers } from "@/lib/state";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const WHATSAPP_API_TOKEN = process.env.NEXT_PUBLIC_WHATSAPP_API_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID =
  process.env.NEXT_PUBLIC_WHATSAPP_PHONE_NUMBER_ID;
let messageHistory: any[] = [];
let userStates: { [key: string]: string } = {};
function log(message: string, emoji = "📄") {
  const timestamp = new Date().toISOString();
  console.log(`${emoji} [${timestamp}] ${message}`);
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    log("Webhook verified successfully", "✅");
    return new NextResponse(challenge, { status: 200 });
  } else {
    log("Webhook verification failed", "❌");
    return new NextResponse("Forbidden", { status: 403 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const entry = body.entry?.[0];
    // const channel = await getRabbitMQChannel();

    if (entry) {
      const changes = entry.changes?.[0];
      if (changes) {
        // Handle incoming messages
        if (changes.value.messages) {
          const message = changes.value.messages[0];
          const from = message.from;

          log(`Received ${message.type} message from: ${from}`, "📩");

          if (message.type === "text") {
            if (userStates[from] === "awaiting_order_id") {
              const orderId = message.text.body;
              await sendShippingStatus(from, orderId);
              userStates[from] = "";
            } else {
              await sendMainMenu(from);
              messageHistory.push({
                type: "received",
                from,
                message: message.text.body,
                timestamp: new Date().toISOString(),
              });
            }
          }

          if (
            ["image", "document", "audio", "video", "sticker"].includes(
              message.type
            )
          ) {
            const media = message[message.type];
            messageHistory.push({
              type: "received",
              from,
              message: `[${message.type.toUpperCase()}] ${media.caption || ""}`,
              mediaUrl: media.url || media.link,
              mediaType: message.type,
              timestamp: new Date().toISOString(),
            });
          }

          if (message.type === "interactive") {
            const interaction = message.interactive;
            if (interaction.type === "list_reply") {
              const selected = interaction.list_reply;
              log(`${from} selected menu option: ${selected.title}`, "🔘");

              messageHistory.push({
                type: "received",
                from,
                message: `${selected.title}`,
                timestamp: new Date().toISOString(),
              });

              switch (selected.id) {
                case "inventory_row":
                  await sendCatalogMessage(from);
                  break;
                case "shipping_row":
                  await requestOrderNumber(from);
                  userStates[from] = "awaiting_order_id";
                  break;
                case "notifications_row":
                  await handleNotificationOptIn(from);
                  break;
              }
            } else if (interaction.type === "nfm_reply") {
              try {
                const flowResponse = JSON.parse(
                  interaction.nfm_reply.response_json
                );
                const flowToken =
                  flowResponse.flow_token === "unused"
                    ? from
                    : flowResponse.flow_token;

                let isDuplicate = false;
                // let messages: any[] = [];
                let messages: any[] = await fetch(
                  `${process.env.BASE_URL}/api/users`
                ).then((res) => res.json());

                isDuplicate = messages.some(
                  (msg) => msg.flow_token === flowToken
                );

                if (!isDuplicate) {
                  // log(`${from} completed form submission`, '📋');
                  // channel.sendToQueue(
                  //     "whatsapp_incoming_queue",
                  //     Buffer.from(
                  //         JSON.stringify(flowResponse, (key, value) =>
                  //             key === "flow_token" && value === "unused" ? from : value
                  //         )
                  //     ),
                  //     { persistent: true }
                  // );
                  // console.log("Form data sent to RabbitMQ");
                  log(`${from} completed form submission`, "📋");
                  const transformedFlowResponse = JSON.parse(
                    JSON.stringify(flowResponse, (key, value) =>
                      key === "flow_token" && value === "unused" ? from : value
                    )
                  );

                  await fetch(`${process.env.BASE_URL}/api/users`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify(transformedFlowResponse),
                  });

                  console.log(
                    "Form data saved to state",
                    transformedFlowResponse
                  );
                } else {
                  console.log("Duplicate entry");
                }

                messageHistory.push({
                  type: "flow_submission",
                  from,
                  flowData: flowResponse,
                  timestamp: new Date().toISOString(),
                });
              } catch (error: any) {
                log(
                  `Form processing failed for ${from}: ${error.message}`,
                  "❌"
                );
              }
            }
          }
        }

        // message status updates
        if (changes.value.statuses) {
          const statuses = changes.value.statuses;
          for (const status of statuses) {
            if (status.status === "failed") {
              log(
                `❌ Message ${status.id} failed for ${
                  status.recipient_id
                }. Full response: ${JSON.stringify(status, null, 2)}`,
                "📊"
              );
            } else {
              log(
                `✅ Message ${status.id} status: ${status.status} for ${status.recipient_id}`,
                "📊"
              );
            }
          }
        }
      }
    }
    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  } catch (error: any) {
    log(`Critical error: ${error.message}`, "🚨");
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

async function sendCatalogMessage(to: string) {
  try {
    log(`Sending product catalog to ${to}`, "📋");
    const url = `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const { products } = await readExcel();
    const messageBody = Object.entries(products)
      .map(([grade, items]) => `*Grade ${grade}*\n${items.join("\n")}`)
      .join("\n\n");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "text",
        text: {
          preview_url: false,
          body: messageBody,
        },
      }),
    });

    const responseData = await response.json();
    if (!response.ok) {
      log(`Catalog send failed to ${to}: ${responseData.error?.message}`, "❌");
      throw new Error(responseData.error?.message);
    }

    log(`Catalog sent successfully to ${to}`, "✅");
    messageHistory.push({
      type: "sent",
      to,
      messageId: responseData.messages?.[0]?.id,
      messageType: "catalog",
      timestamp: new Date().toISOString(),
    });

    return responseData;
  } catch (error: any) {
    log(`Catalog send error to ${to}: ${error.message}`, "❌");
    throw error;
  }
}

async function sendShippingUpdate(to: string) {
  try {
    log(`Requesting order number from ${to}`, "🚚");
    const url = `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "text",
        text: {
          body: "Please enter your order number to check shipping status:",
        },
      }),
    });

    const responseData = await response.json();
    if (!response.ok) {
      log(
        `Shipping update failed to ${to}: ${responseData.error?.message}`,
        "❌"
      );
      throw new Error(responseData.error?.message);
    }

    log(`Shipping update sent to ${to}`, "✅");
    messageHistory.push({
      type: "sent",
      to,
      messageId: responseData.messages?.[0]?.id,
      messageType: "shipping_update",
      timestamp: new Date().toISOString(),
    });

    return responseData;
  } catch (error: any) {
    log(`Shipping update error to ${to}: ${error.message}`, "❌");
    throw error;
  }
}

const handleNotificationOptIn = async (phone: string) => {
  try {
    // const payload = {
    //     messaging_product: "whatsapp",
    //     to: phone,
    //     type: "template",
    //     template: {
    //         name: "hello_world",
    //         language: {
    //             code: "en_US",
    //         },
    //     },
    // };
    const payload = {
      messaging_product: "whatsapp",
      to: phone,
      type: "template",
      template: {
        name: "form",
        language: {
          code: "en_US",
        },
        components: [
          {
            type: "header",
            parameters: [
              {
                type: "image",
                image: {
                  id: "28418804584401992",
                },
              },
            ],
          },
          {
            type: "button",
            sub_type: "flow",
            index: "0",
          },
        ],
      },
    };

    const response = await fetch(
      `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();
    console.log(response);

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error.message },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: "Template message sent" });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
};

async function sendMainMenu(to: string) {
  try {
    log(`Sending main menu to ${to}`, "📜");

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "interactive",
      interactive: {
        type: "list",
        header: {
          type: "text",
          text: "Square Group",
        },
        body: {
          text: "Please select an option from the list:",
        },
        footer: {
          text: "Click on product for more information",
        },
        action: {
          button: "Main Menu",
          sections: [
            {
              title: "Our Products",
              rows: [
                {
                  id: "inventory_row",
                  title: "📦 Available Inventory",
                },
                {
                  id: "shipping_row",
                  title: "🚚 Shipping Status",
                },
                {
                  id: "notifications_row",
                  title: "📢 Subscribe Broadcasts",
                },
              ],
            },
          ],
        },
      },
    };

    const response = await fetch(
      `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
        },
        body: JSON.stringify(payload),
      }
    );

    const responseData = await response.json();

    if (!response.ok) {
      log(
        `Main menu send failed to ${to}: ${responseData.error?.message}`,
        "❌"
      );
      log(`Response data: ${JSON.stringify(responseData)}`, "❌");
      throw new Error(responseData.error?.message);
    }

    log(`Main menu sent successfully to ${to}`, "✅");
    messageHistory.push({
      type: "sent",
      to,
      messageId: responseData.messages?.[0]?.id,
      messageType: "main_menu",
      timestamp: new Date().toISOString(),
    });

    return responseData;
  } catch (error: any) {
    log(`Main menu send error to ${to}: ${error.message}`, "❌");
    throw error;
  }
}

async function requestOrderNumber(to: string) {
  try {
    log(`Requesting order number from ${to}`, "🚚");
    const url = `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "text",
        text: {
          body: "Please enter your order number to check shipping status:",
        },
      }),
    });

    const responseData = await response.json();
    if (!response.ok) {
      log(
        `Order number request failed to ${to}: ${responseData.error?.message}`,
        "❌"
      );
      throw new Error(responseData.error?.message);
    }

    log(`Order number request sent to ${to}`, "✅");
    messageHistory.push({
      type: "sent",
      to,
      messageId: responseData.messages?.[0]?.id,
      messageType: "order_number_request",
      timestamp: new Date().toISOString(),
    });

    return responseData;
  } catch (error: any) {
    log(`Order number request error to ${to}: ${error.message}`, "❌");
    throw error;
  }
}

async function sendShippingStatus(to: string, orderId: string) {
  try {
    log(`Sending shipping status for order ${orderId} to ${to}`, "🚚");
    const url = `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "text",
        text: { body: `Your order ${orderId} has been Shipped` },
      }),
    });

    const responseData = await response.json();
    if (!response.ok) {
      log(
        `Shipping status send failed to ${to}: ${responseData.error?.message}`,
        "❌"
      );
      throw new Error(responseData.error?.message);
    }

    log(`Shipping status sent to ${to}`, "✅");
    messageHistory.push({
      type: "sent",
      to,
      messageId: responseData.messages?.[0]?.id,
      messageType: "shipping_status",
      timestamp: new Date().toISOString(),
    });

    return responseData;
  } catch (error: any) {
    log(`Shipping status error to ${to}: ${error.message}`, "❌");
    throw error;
  }
}
