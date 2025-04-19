export interface ErrorInfo {
  statusCode: number;
  message: string;
  title?: string;
}

export type ServerCall = <T>(
  group: string,
  action: string,
  data?: Record<string, any>,
  method?: RequestInit["method"],
) => Promise<T>;

export interface ListOptions {
  columns?: string[];
  filter?: DBFilter;
  orFilter?: DBFilter;
  limit?: number;
  offset?: number;
  orderBy?: string;
  order?: "asc" | "desc";
}

export type DBFilter = Record<
  string,
  string | number | boolean | null | AdvancedFilter
>;

export interface AdvancedFilter {
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
}
