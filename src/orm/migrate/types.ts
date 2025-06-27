import type {
  ForeignKeyConstraint,
  PgColumnDefinition,
  PgDataTypeDefinition,
} from "~/orm/db/db-types.ts";

export interface ColumnMigrationPlan {
  columnName: string;
  dataType?: {
    from: PgDataTypeDefinition;
    to: PgDataTypeDefinition;
  };
  nullable?: {
    from: PgColumnDefinition["isNullable"];
    to: PgColumnDefinition["isNullable"];
    defaultValue?: PgColumnDefinition["columnDefault"];
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
