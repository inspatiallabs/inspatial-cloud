import { InCloud } from "./in-cloud.ts";

export class InCloudMigrator extends InCloud {
  constructor(appName: string, config: any) {
    super(appName, config, "migrator");
  }
  async migrate(): Promise<void> {
    // const schemas = await this.orm.db.getSchemaList();
    const result = await this.orm.migrateGlobal();
    console.log(result);
  }
}
