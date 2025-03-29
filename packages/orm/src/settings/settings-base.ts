export interface SettingsBase {
  _name: string;

  save(): Promise<void>;
}

export interface GenericSettings extends SettingsBase {
  [key: string]: any;
}
