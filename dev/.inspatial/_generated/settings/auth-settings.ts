import type { SettingsBase } from "#orm/types";
export interface AuthSettings extends SettingsBase {
  _name: "authSettings";
  /**
   * **Enabled** (BooleanField)
   * @description Enable or disable authentication
   * @type {boolean}
   */
  enabled?: boolean;
}
