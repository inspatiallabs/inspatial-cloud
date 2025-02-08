export interface ListOptions {
  columns?: string[] | "*";
  filter?: Record<string, string | number | AdvancedFilter>;
  orFilter?: Array<{ field: string } & AdvancedFilter>;
  limit?: number;
  offset?: number;
  orderBy?: string;
  order?: "asc" | "desc";
}

export type AdvancedFilter = {
  op:
    | "contains"
    | "notContains"
    | "inList"
    | "notInList"
    | "between"
    | "notBetween"
    | "is"
    | "isNot"
    | "isEmpty"
    | "isNotEmpty"
    | "startsWith"
    | "endsWith"
    | "greaterThan"
    | "lessThan"
    | "greaterThanOrEqual"
    | "lessThanOrEqual"
    | "equal"
    | ">"
    | "<"
    | ">="
    | "<="
    | "="
    | "!=";
  value: any;
};
