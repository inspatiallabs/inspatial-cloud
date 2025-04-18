import type { InSpatialCloud } from "#/inspatial-cloud.ts";
import type { ActionParamProp } from "#/app/types.ts";
import type { ParamsMap } from "#/api/api-types.ts";
import type { InRequest } from "#/app/in-request.ts";
import type { InResponse } from "#/app/in-response.ts";
import { raiseServerException } from "#/app/server-exception.ts";

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
    if (config.authRequired === false) {
      this.authRequired = false;
    }
    if (config.hideFromApi === true) {
      this.includeInAPI = false;
    }
    this.params = new Map(config.params.map((p) => [p.key, p]));
    this.requiredParams = config.params.filter((param) => param.required).map(
      (p) => p.key,
    );
  }

  #validateParams(
    params?: Record<string, any>,
  ): ParamsMap<P> {
    const requiredParams = this.requiredParams;
    if (requiredParams.length === 0 && !params) {
      this.raiseError(
        `${requiredParams.join(", ")} are required for ${this.actionName}`,
      );
    }
    if (!params) {
      return {} as ParamsMap<P>;
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
      const paramConfig = this.params.get(key);
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

      switch (paramConfig.type) {
        case "string":
          if (value === "") {
            isEmpty = true;
            break;
          }
          if (isEmpty) {
            break;
          }
          if (typeof value !== "string") {
            errors.push(`${key} must be a string`);
          }
          break;
        case "number":
          if (isEmpty) {
            break;
          }
          if (typeof value !== "number") {
            value = Number(value);
          }
          if (Number.isNaN(value)) {
            errors.push(`${key} must be a number`);
          }
          break;
        case "boolean":
          if (isEmpty) {
            value = false;
            break;
          }
          if (typeof value !== "boolean") {
            if (value === 0 || value === "0" || value === "false") {
              value = false;
              break;
            }
            if (value === 1 || value === "1" || value === "true") {
              value = true;
              break;
            }
            errors.push(`${key} must be a boolean`);
          }
          break;
        case "object":
          if (isEmpty) {
            break;
          }
          if (typeof value === "string") {
            try {
              value = JSON.parse(value);
            } catch (_e) {
              errors.push(`${key} must be a valid JSON object`);
            }
            break;
          }
          if (typeof value !== "object") {
            errors.push(`${key} must be a JSON object`);
          }
          break;
        case "array":
          if (isEmpty) {
            break;
          }
          if (typeof value === "string") {
            try {
              value = JSON.parse(value);
            } catch (_e) {
              errors.push(`${key} must be a valid JSON array`);
            }
            break;
          }
          if (!Array.isArray(value)) {
            errors.push(`${key} must be an array`);
          }
          break;
        default:
          errors.push(`${key} is not a valid parameter type`);
          break;
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

    return Object.fromEntries(incomingParams) as ParamsMap<P>;
  }

  async run(args: {
    app: InSpatialCloud;
    params?: Record<string, any>;
    inRequest: InRequest;
    inResponse: InResponse;
  }): Promise<ReturnType<R>> {
    const validatedData = this.#validateParams(args.params);
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
