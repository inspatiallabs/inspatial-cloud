import { ORMFieldDef } from "#/field/field-def-types.ts";
import { convertString } from "@inspatial/serve/utils";
import { raiseORMException } from "#/orm-exception.ts";
import { BaseType } from "#/shared/base-type-class.ts";

/**
 * Defines a settings type for the ORM.
 */
export class SettingsType<N extends string = string> extends BaseType<N> {
  /**
   * Defines a settings type for the ORM.
   * @param name The name of the settings type.
   * @param fields The fields of the settings type.
   */

  constructor(
    name: N,
    config: {
      fields: Array<ORMFieldDef>;
      label?: string;
    },
  ) {
    super(name, config);
  }
}
