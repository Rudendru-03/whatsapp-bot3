"use client";

import { useEffect, useState } from "react";
import { getUsers } from "@/lib/state";

interface Message {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  screen_0_First_0?: string;
  screen_0_Last_1?: string;
  screen_0_Email_2?: string;
  flow_token?: string;
}

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  // useEffect(() => {
  //   async function fetchMessages() {
  //     try {
  //       const res = await fetch("/api/messages");
  //       if (!res.ok) {
  //         throw new Error("Failed to fetch messages");
  //       }
  //       const data = await res.json();
  //       console.log("Fetched messages:", data.messages);

  //       // Transform messages to replace "flow_token" with "phone"
  //       const formattedMessages = data.messages.map((msg: Message) => ({
  //         firstName: msg.screen_0_First_0 || "N/A",
  //         lastName: msg.screen_0_Last_1 || "N/A",
  //         email: msg.screen_0_Email_2 || "N/A",
  //         phone: msg.flow_token || "N/A",
  //       }));

  //       setMessages(formattedMessages);
  //     } catch (error) {
  //       console.error("Error fetching messages:", error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   }

  //   fetchMessages();
  // }, []);

  // useEffect(() => {
  //   async function fetchMessages() {
  //     try {
  //       const users = getUsers();
  //       console.log("Fetched users:", users);

  //       const formattedMessages = users.map((user: any) => ({
  //         firstName: user.screen_0_First_0 || "N/A",
  //         lastName: user.screen_0_Last_1 || "N/A",
  //         email: user.screen_0_Email_2 || "N/A",
  //         phone: user.flow_token || "N/A",
  //       }));

  //       setMessages(formattedMessages);
  //     } catch (error) {
  //       console.error("Error fetching messages:", error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   }

  //   fetchMessages();
  // }, []);

  useEffect(() => {
    async function fetchMessages() {
      try {
        const res = await fetch("/api/users");
        if (!res.ok) {
          throw new Error("Failed to fetch users");
        }
        const users = await res.json();
        console.log("Fetched users:", users);

        const formattedMessages = users.map((user: any) => ({
          firstName: user.screen_0_First_0 || "N/A",
          lastName: user.screen_0_Last_1 || "N/A",
          email: user.screen_0_Email_2 || "N/A",
          phone: user.flow_token || "N/A",
        }));

        setMessages(formattedMessages);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchMessages();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Users</h1>

      {loading ? (
        <p className="text-gray-600">Loading messages...</p>
      ) : messages.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-300 px-4 py-2 text-left">First Name</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Last Name</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Email</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Phone</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((msg, index) => (
                <tr key={index} className="hover:bg-gray-100">
                  <td className="border border-gray-300 px-4 py-2">{msg.firstName}</td>
                  <td className="border border-gray-300 px-4 py-2">{msg.lastName}</td>
                  <td className="border border-gray-300 px-4 py-2">{msg.email}</td>
                  <td className="border border-gray-300 px-4 py-2">{msg.phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-600">No messages found in the queue.</p>
      )}
    </div>
  );
}
