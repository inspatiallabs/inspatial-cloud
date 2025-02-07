import { RealtimeClient } from "#realtime";

const client = new RealtimeClient("ws://0.0.0.0:8000/ws");

client.onStatusChange((status) => {
  console.log("Status changed:", status);
  if (status === "open") {
    client.join("notifications");
  }
});

client.onMessage((room, event, data) => {
  console.log("Message received:", room, event, data);
});
client.connect();

const done = new Promise<void>((resolve) => {
  setTimeout(() => {
    if (client.closed) {
      resolve();
    }
  }, 1000);
});

await done;
