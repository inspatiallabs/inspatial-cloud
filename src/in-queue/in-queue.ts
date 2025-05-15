import type InCloud from "@inspatial/cloud";

export class InQueue {
  static schedule: Deno.CronSchedule = {
    minute: {
      every: 1,
    },
  };
  static async handler(inCloud: InCloud): Promise<void> {
    await inCloud.ready;
    inCloud.inLog.info("Rannn", "InQueue");
  }
}
