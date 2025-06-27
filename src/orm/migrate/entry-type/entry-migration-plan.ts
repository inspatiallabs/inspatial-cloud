import type { ForeignKeyConstraint } from "~/orm/db/db-types.ts";
import type { IDMode } from "~/orm/field/types.ts";
import type {
  ColumnCreatePlan,
  ColumnMigrationPlan,
} from "~/orm/migrate/types.ts";
import type { EntryIndex } from "~/orm/entry/types.ts";

export class EntryMigrationPlan {
  entryType: string;
  table: {
    tableName: string;
    create: boolean;
    idMode: IDMode;
    updateDescription?: {
      from: string;
      to: string;
    };
  };
  columns: {
    create: Array<ColumnCreatePlan>;
    drop: Array<any>;
    modify: Array<ColumnMigrationPlan>;
  };
  constraints: {
    foreignKey: {
      create: Array<ForeignKeyConstraint>;
      drop: Array<ForeignKeyConstraint>;
    };
  };
  indexes: {
    create: Array<EntryIndex<string> & { indexName: string }>;
    drop: Array<string>;
  };
  children: Array<EntryMigrationPlan>;
  constructor(entryType: string) {
    this.entryType = entryType;
    this.table = {
      tableName: "",
      idMode: "ulid",
      create: false,
    };
    this.columns = {
      create: [],
      drop: [],
      modify: [],
    };

    this.constraints = {
      foreignKey: {
        create: [],
        drop: [],
      },
    };
    this.children = [];
    this.indexes = {
      create: [],
      drop: [],
    };
  }
}
