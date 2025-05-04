import type { InCloud } from "#/inspatial-cloud.ts";
import type { InRequest } from "#/app/in-request.ts";
import type { InResponse } from "#/app/in-response.ts";
import { raiseServerException } from "#/app/server-exception.ts";
import type { InField } from "#/orm/field/field-def-types.ts";
import type { InSpatialORM } from "#/orm/inspatial-orm.ts";
import type { CloudParam, ExtractParams } from "#/api/api-types.ts";

export class CloudAPIAction<
  K extends PropertyKey = PropertyKey,
  P extends Array<CloudParam<K>> = Array<CloudParam<K>>,
  D extends ExtractParams<K, P> = ExtractParams<K, P>,
  R extends (args: {
    app: InCloud;
    params: D;
    inRequest: InRequest;
    inResponse: InResponse;
  }) => Promise<any> | any = (args: {
    app: InCloud;
    params: D;
    inRequest: InRequest;
    inResponse: InResponse;
  }) => Promise<any> | any,
> {
  description: string = "This is an easy action";
  label?: string;
  raw: boolean = false;
  actionName: string;
  authRequired: boolean = true;

  includeInAPI: boolean = true;
  params: Map<string, CloudParam<K>>;
  requiredParams: string[] = [];

  #_run: (args: {
    app: InCloud;
    params: any;
    inRequest: InRequest;
    inResponse: InResponse;
  }) => Promise<any> | any;

  raiseError(message: string): never {
    raiseServerException(400, message);
  }

  constructor(
    actionName: string,
    config: {
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
    },
  ) {
    this.#_run = config.run;
    this.actionName = actionName;
    this.raw = config.raw || false;
    this.label = config.label || this.label;
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
  ): D {
    const requiredParams = this.requiredParams;
    if (requiredParams.length === 0 && !params) {
      this.raiseError(
        `${requiredParams.join(", ")} are required for ${this.actionName}`,
      );
    }
    if (!params) {
      return {} as D;
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

    return Object.fromEntries(incomingParams) as D;
  }

  async run(args: {
    app: InCloud;
    params?: Record<string, any>;
    inRequest: InRequest;
    inResponse: InResponse;
  }): Promise<ReturnType<R>> {
    const validatedData = this.#validateParams(args.app.orm, args.params);
    return await this.#_run({
      app: args.app,
      params: validatedData as any,
      inRequest: args.inRequest,
      inResponse: args.inResponse,
    });
  }
}

export class CloudAPIGroup<
  G extends string = string,
> {
  groupName: G;
  description: string;
  label?: string;
  actions: Map<string, CloudAPIAction>;

  constructor(groupName: G, config: {
    description: string;
    label?: string;
    actions: Array<CloudAPIAction>;
  }) {
    this.groupName = groupName;
    this.description = config.description;
    this.label = config.label;
    this.actions = new Map(
      config.actions.map((action) => [action.actionName, action]),
    );
  }
}
