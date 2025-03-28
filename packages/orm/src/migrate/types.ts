import type {
  ForeignKeyConstraint,
  PgColumnDefinition,
  PgDataTypeDefinition,
} from "#db/types.ts";
import type { EntryMigrationPlan } from "#/migrate/entry-type/entry-migration-plan.ts";
import type { SettingsMigrationPlan } from "#/migrate/settings-type/settings-migration-plan.ts";

export interface ColumnMigrationPlan {
  columnName: string;
  dataType?: {
    from: PgDataTypeDefinition;
    to: PgDataTypeDefinition;
  };
  nullable?: {
    from: PgColumnDefinition["isNullable"];
    to: PgColumnDefinition["isNullable"];
  };
  unique?: {
    from: boolean;
    to: boolean;
  };
  foreignKey?: {
    drop?: string;
    create?: ForeignKeyConstraint;
  };
}

export interface ColumnCreatePlan {
  columnName: string;
  column: PgColumnDefinition;
  foreignKey?: {
    create: ForeignKeyConstraint;
  };
}
