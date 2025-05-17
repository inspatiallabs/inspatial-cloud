type EntryTypeKey = string;
type FieldKey = string;

export type EntryTypeRegistry = Map<FieldKey, Array<RegistryField>>;

interface RegisterFieldConfig {
  referencingEntryType: EntryTypeKey;
  referencingFieldKey: FieldKey;
  referencingIdFieldKey: FieldKey;
  referencedEntryType: EntryTypeKey;
  referencedFieldKey: FieldKey;
}

interface RegistryField {
  targetEntryType: EntryTypeKey;
  targetIdField: FieldKey;
  targetValueField: FieldKey;
}

type Registry = Map<EntryTypeKey, EntryTypeRegistry>;

export class ConnectionRegistry {
  #registry: Registry;
  constructor() {
    this.#registry = new Map();
  }

  registerField(config: RegisterFieldConfig): void {
    const registryFields = this.#ensureField(
      config.referencedEntryType,
      config.referencedFieldKey,
    );
    registryFields.push({
      targetEntryType: config.referencingEntryType,
      targetIdField: config.referencingIdFieldKey,
      targetValueField: config.referencingFieldKey,
    });
  }

  #ensureEntryType(entryType: EntryTypeKey): EntryTypeRegistry {
    if (!this.#registry.has(entryType)) {
      const entryTypeRegistry: EntryTypeRegistry = new Map();
      this.#registry.set(entryType, entryTypeRegistry);
    }
    return this.#registry.get(entryType)!;
  }
  #ensureField(
    entryType: EntryTypeKey,
    fieldKey: FieldKey,
  ): Array<RegistryField> {
    const entryTypeRegistry = this.#ensureEntryType(entryType);
    if (!entryTypeRegistry.has(fieldKey)) {
      const registryFields: Array<RegistryField> = [];
      entryTypeRegistry.set(fieldKey, registryFields);
    }
    return entryTypeRegistry.get(fieldKey)!;
  }

  getEntryTypeRegistry(entryType: EntryTypeKey): EntryTypeRegistry | undefined {
    return this.#registry.get(entryType);
  }
}
