import {
  type InRequest,
  type InResponse,
  raiseServerException,
} from "@inspatial/serve";
import type { InSpatialCloud } from "#/inspatial-cloud.ts";
import type { ActionParamProp } from "#/types.ts";
import type { ParamsMap } from "@inspatial/serve/actions-api";

export class CloudAction<
  N extends string,
  K extends string,
  P extends Array<ActionParamProp<K>>,
  D extends ParamsMap<P>,
  R extends (args: {
    app: InSpatialCloud;
    params: D;
    inRequest: InRequest;
    inResponse: InResponse;
  }) => Promise<any> | any = (args: {
    app: InSpatialCloud;
    params: D;
    inRequest: InRequest;
    inResponse: InResponse;
  }) => Promise<any> | any,
> {
  description: string = "This is an easy action";
  label?: string;
  actionName: N;
  authRequired: boolean = true;

  includeInAPI: boolean = true;
  params: Map<string, ActionParamProp<K>>;
  requiredParams: string[] = [];

  #_run: (args: {
    app: InSpatialCloud;
    params: any;
    inRequest: InRequest;
    inResponse: InResponse;
  }) => Promise<any> | any;

  raiseError(message: string): never {
    raiseServerException(400, message);
  }

  constructor(
    actionName: N,
    config: {
      run: R;
      description?: string;
      label?: string;
      authRequired?: boolean;
      hideFromApi?: boolean;
      params: P;
    },
  ) {
    this.#_run = config.run;
    this.actionName = actionName;
    this.label = config.label || this.label;
    this.description = config.description || this.description;
    this.authRequired = config.authRequired || this.authRequired;
    this.includeInAPI = config.hideFromApi
      ? !config.hideFromApi
      : this.includeInAPI;

    this.params = new Map(config.params.map((p) => [p.key, p]));
    this.requiredParams = config.params.filter((param) => param.required).map(
      (p) => p.key,
    );
  }

  validateRequiredParams(params?: Record<string, any>): ParamsMap<P> {
    const requiredParams = this.requiredParams;
    if (!params) {
      this.raiseError(
        `${requiredParams.join(", ")} are required for ${this.actionName}`,
      );
    }
    const missingParams = new Set();
    const data: Record<string, any> = {};
    for (const [key, param] of this.params) {
      if (param.required && !params[key]) {
        missingParams.add(key);
        continue;
      }
      if (params[key] === undefined) {
        continue;
      }
      data[key] = params[key];
    }
    if (missingParams.size) {
      this.raiseError(
        `${[...missingParams].join(", ")} are required for ${this.actionName}`,
      );
    }
    return data as ParamsMap<P>;
  }

  validateDataTypes(
    params: Record<string, any>,
  ): ParamsMap<P> {
    for (const [key, value] of Object.entries(params)) {
      const paramConfig = this.params.get(key);
      if (!paramConfig) {
        this.raiseError(`Invalid param config for ${key}`);
      }
      switch (paramConfig.type) {
        case "string":
          if (typeof value !== "string") {
            this.raiseError(`${key} must be a string`);
          }
          break;
        case "number":
          if (typeof value !== "number") {
            this.raiseError(`${key} must be a number`);
          }
          break;
        case "boolean":
          if (typeof value !== "boolean") {
            this.raiseError(`${key} must be a boolean`);
          }
          break;
        case "object":
          if (typeof value !== "object") {
            this.raiseError(`${key} must be an object`);
          }
          break;
        case "array":
          if (!Array.isArray(value)) {
            this.raiseError(`${key} must be an array`);
          }
          break;
        default:
          break;
      }
    }
    return params as ParamsMap<P>;
  }

  async run(args: {
    app: InSpatialCloud;
    params?: Record<string, any>;
    inRequest: InRequest;
    inResponse: InResponse;
  }): Promise<ReturnType<R>> {
    const data = this.validateRequiredParams(args.params);
    const validatedData = this.validateDataTypes(data);
    return await this.#_run({
      app: args.app,
      params: validatedData as any,
      inRequest: args.inRequest,
      inResponse: args.inResponse,
    });
  }
}

export class CloudActionGroup<
  G extends string = string,
  N extends string = string,
  K extends string = string,
  P extends Array<ActionParamProp<K>> = Array<ActionParamProp<K>>,
  D extends ParamsMap<P> = ParamsMap<P>,
  A extends Array<CloudAction<N, K, P, D>> = Array<CloudAction<N, K, P, D>>,
> {
  groupName: G;
  description: string;
  label?: string;
  actions: A;

  constructor(groupName: G, config: {
    description: string;
    label?: string;
    actions: A;
  }) {
    this.groupName = groupName;
    this.description = config.description;
    this.label = config.label;
    this.actions = config.actions;
  }
}
