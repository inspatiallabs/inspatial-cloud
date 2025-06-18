import type InCloud from "@inspatial/cloud";
import type { InTask } from "./generated-types/in-task.ts";

Deno.env.set("AUTO_MIGRATE", "false");
Deno.env.set("AUTO_TYPES", "false");
Deno.env.set("ORM_DEBUG_MODE", "false");
Deno.env.set("SERVE_AUTO_CONFIG", "false");
export class InQueue {
  static schedule: Deno.CronSchedule = {
    minute: {
      every: 1,
    },
  };

  static clients: Map<string, WebSocket> = new Map();
  static announce(message: Record<string, any>): void {
    for (const client of InQueue.clients.values()) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      } else {
        console.warn("WebSocket client not open, skipping send.");
      }
    }
  }
  static async run(inCloud: InCloud): Promise<void> {
    await inCloud.ready;
    Deno.serve({
      hostname: "127.0.0.1",
      port: 8080,
    }, async (request) => {
      const { response, socket } = Deno.upgradeWebSocket(request);
      const clientId = crypto.randomUUID();
      socket.onopen = () => {
        InQueue.clients.set(clientId, socket);
      };
      socket.onclose = () => {
        InQueue.clients.delete(clientId);
      };
      socket.onerror = (event) => {
        console.error("WebSocket error:", event);
      };
      socket.onmessage = async (event) => {
        console.log("Received message:", event.data);
        // const message = JSON.parse(event.data);
        // if (message.type === "task") {
        //   const task = await inCloud.orm.createEntry<InTask>("inTask", {
        //     ...message.data,
        //     status: "queued",
        //   });
        //   await task.save();
        //   console.log("Task queued:", task.id);
        // } else {
        //   console.warn("Unknown message type:", message.type);
        // }
      };
      return response;
    });
    await processTasks(inCloud);
  }
}

async function processTasks(inCloud: InCloud): Promise<void> {
  console.log("processing tasks");
  const orm = inCloud.orm;
  const taskResults = await orm.getEntryList<InTask>("inTask", {
    filter: {
      status: "queued",
    },
    columns: ["id"],
  });

  for (const { id } of taskResults.rows) {
    const task = await orm.getEntry<InTask>("inTask", id);
    await task.runAction("runTask");
  }
  setTimeout(() => processTasks(inCloud), 10000);
}
