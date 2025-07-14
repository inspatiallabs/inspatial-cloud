export interface Choice {
  key: string;
  label: string;
  description?: string;
  color?: string;
}

export type InValue<T extends keyof InValueTypeMap = keyof InValueTypeMap> =
  InValueTypeMap[T];

type InValueTypeMap = {
  IDField: string;
  DataField: string;
  IntField: number;
  BigIntField: bigint;
  DecimalField: number;
  DateField: string;
  TimeStampField: number;
  BooleanField: boolean;
  PasswordField: string;
  ChoicesField: string | number;
  MultiChoiceField: string[];
  TextField: string;
  EmailField: string;
  ImageField: string;
  FileField: string;
  JSONField: Record<string, unknown>;
  PhoneField: string;
  ConnectionField: {
    id: string;
    display: string;
  };
  RichTextField: Record<string, unknown>;
  URLField: string;
  ListField: string[];
  CurrencyField: number;
  TimeField: string;
};

export type IDMode = "uuid" | "ulid" | "auto";
