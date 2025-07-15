import { InCloud } from "~/in-cloud.ts";

export class InCloudMigrator extends InCloud {
  constructor(appName: string, config: any) {
    super(appName, config, "migrator");
  }
  async migrate(): Promise<void> {
    await this.#migrateGlobal();
    await this.#migrateAccounts();
  }

  async #migrateGlobal() {
    await this.orm.migrateGlobal();
    for (const migrateAction of this.extensionManager.afterMigrate.global) {
      await migrateAction.action({
        inCloud: this,
        orm: this.orm,
      });
    }
  }

  async #migrateAccounts() {
    const { rows: accounts } = await this.orm.getEntryList(
      "account",
      {
        columns: ["id"],
        limit: 0,
      },
    );
    for (const { id } of accounts) {
      await this.orm.migrate(id);
    }
  }
}
