import type { InRequest } from "~/serve/in-request.ts";
import type { InResponse } from "~/serve/in-response.ts";
import { raiseServerException } from "~/serve/server-exception.ts";
import type { InField } from "~/orm/field/field-def-types.ts";
import type { InSpatialORM } from "~/orm/inspatial-orm.ts";
import type { CloudParam, ExtractParams } from "~/api/api-types.ts";
import convertString from "~/utils/convert-string.ts";
import type { SessionData } from "~/auth/types.ts";
import type { InCloud } from "~/in-cloud.ts";

export type ActionMethod<
  K extends PropertyKey = PropertyKey,
  P extends Array<CloudParam<K>> = Array<CloudParam<K>>,
> = (args: {
  inCloud: InCloud;
  orm: InSpatialORM;
  params: ExtractParams<K, P>;
  inRequest: InRequest;
  inResponse: InResponse;
}) => Promise<any> | any;

export type ActionConfig<
  K extends PropertyKey = PropertyKey,
  P extends Array<CloudParam<K>> = Array<CloudParam<K>>,
  R extends ActionMethod<K, P> = ActionMethod<K, P>,
> = {
  run: R;
  /**
   * Whether to skip reading the request body. Should be set to true if the action
   * will be reading the request body itself, such as when uploading files.
   */
  raw?: boolean;
  description?: string;
  label?: string;
  authRequired?: boolean;
  hideFromApi?: boolean;
  params: P;
};
export class CloudAPIAction<
  K extends PropertyKey = PropertyKey,
  P extends Array<CloudParam<K>> = Array<CloudParam<K>>,
  R extends ActionMethod<K, P> = ActionMethod<K, P>,
> {
  description: string = "This is a Cloud API action";
  label?: string;
  raw: boolean = false;
  actionName: string;
  groupName: string = "";
  authRequired: boolean = true;

  includeInAPI: boolean = true;
  params: Map<string, CloudParam<PropertyKey>>;
  requiredParams: string[] = [];

  #_run: (args: {
    inCloud: InCloud;
    orm: InSpatialORM;
    params: any;
    inRequest: InRequest;
    inResponse: InResponse;
  }) => Promise<any> | any;

  raiseError(message: string): never {
    raiseServerException(400, message);
  }

  constructor(
    actionName: string,
    config: ActionConfig<K, P, R>,
  ) {
    this.#_run = config.run;
    this.actionName = actionName;
    this.raw = config.raw || false;
    this.label = config.label || this.label ||
      convertString(actionName, "title", true);
    this.description = config.description || this.description;
    if (config.authRequired === false) {
      this.authRequired = false;
    }
    if (config.hideFromApi === true) {
      this.includeInAPI = false;
    }
    this.params = new Map(config.params.map((p) => [p.key as string, p]));
    this.requiredParams = config.params.filter((param) => param.required).map(
      (p) => p.key as string,
    );
  }

  #validateParams(
    orm: InSpatialORM,
    params?: Record<string, any>,
  ) {
    const requiredParams = this.requiredParams;
    if (requiredParams.length === 0 && !params) {
      this.raiseError(
        `${requiredParams.join(", ")} are required for ${this.actionName}`,
      );
    }
    if (!params) {
      return {};
    }
    const missingParams = new Set();
    const incomingParams = new Map(Object.entries(params));
    for (const key of this.requiredParams) {
      if (!incomingParams.has(key)) {
        missingParams.add(key);
      }
    }

    const errors: string[] = [];
    for (const key of incomingParams.keys()) {
      const paramConfig = this.params.get(key) as InField;
      if (!paramConfig) {
        this.raiseError(
          `${key} is not a valid parameter for ${this.actionName}`,
        );
      }

      let isEmpty = false;
      let value = incomingParams.get(key);
      if (value === undefined || value === null) {
        isEmpty = true;
      }
      const fieldType = orm._getFieldType(paramConfig.type);
      value = fieldType.normalize(value, paramConfig);
      const isValid = fieldType.validate(value, paramConfig);
      if (!isValid) {
        errors.push(`${key} doesn't have a valid value`);
      }
      incomingParams.set(key, value);
      if (isEmpty && paramConfig.required) {
        missingParams.add(key);
      }
    }
    if (missingParams.size) {
      this.raiseError(
        `${[...missingParams].join(", ")} ${
          missingParams.size === 1 ? "is" : "are"
        } required for ${this.actionName}`,
      );
    }
    if (errors.length) {
      this.raiseError(errors.join(", "));
    }

    return Object.fromEntries(incomingParams);
  }
  #raisePermissionError(): never {
    raiseServerException(
      403,
      "User does not have permission to access this action",
    );
  }
  async run(args: {
    inCloud: InCloud;
    params?: Record<string, any>;
    inRequest: InRequest;
    inResponse: InResponse;
  }): Promise<any> {
    const validatedData = this.#validateParams(args.inCloud.orm, args.params);
    const runObject = {
      ...args,
      params: validatedData,
      orm: args.inCloud.orm,
    };
    if (this.authRequired) {
      const user = args.inRequest.context.get<SessionData>("user");
      if (!user) {
        raiseServerException(401, "User is not authenticated");
      }
      const role = args.inCloud.roles.getRole(user.role);
      const groupPermission = role.apiGroups.get(this.groupName);

      switch (groupPermission) {
        case true:
          break;
        case undefined:
          this.#raisePermissionError();
          break;
        default:
          if (!groupPermission.has(this.actionName)) {
            this.#raisePermissionError();
          }
      }

      runObject.orm = args.inCloud.orm.withUser(user);
    }

    return await this.#_run(runObject);
  }
}
