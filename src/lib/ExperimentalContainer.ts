import { ExperimentalRpcEndpoint } from '../types';
import { PeerRpc } from './PeerRpc';

export type Value = string | number | boolean | symbol | bigint | object | null
                    | ((...args: any[]) => any)
                    | ((...args: any[]) => Promise<any>);

export class ExperimentalContainer<T extends Record<keyof T, Value>> {
  constructor(obj: T) {
    Object.assign(this, obj);
  }

  get<K extends keyof T>(key: K): T[K] {
    return (this as unknown as T)[key];
  }

  set<K extends keyof T>(key: K, value: T[K]): void {
    (this as unknown as T)[key] = value;
  }
}

export type ValueType = "string" | "number" | "boolean" | "symbol" | "bigint" | "object" | "null" | "function" | "async_function";

export interface TypeInfo {
  valueType: ValueType;
  value?: Value;
}

export type TypeMapping = Map<string, TypeInfo>;

export function createTypeMapping<T extends Record<keyof T, Value>>(obj: T): TypeMapping {
  const typeMapping = new Map<string, TypeInfo>();

  for (const key in obj) {
    const value = obj[key];

    if (typeof value === "function") {
      const valueType = value.constructor.name === "AsyncFunction" ? "async_function" : "function";
      typeMapping.set(key, { valueType });
    } else if (typeof value === "object") {
      typeMapping.set(key, { valueType: "object", value: JSON.parse(JSON.stringify(value)) });
    } else {
      typeMapping.set(key, { valueType: typeof value as ValueType, value });
    }
  }

  return typeMapping;
}

export async function executeOrGetProperty(
  container: ExperimentalContainer<any>,
  name: string,
  ...args: any[]
): Promise<Value> {
  const typeMapping = createTypeMapping(container);
  const typeInfo = typeMapping.get(name);

  if (!typeInfo) {
    throw new Error(`No property or function with the name '${name}' found.`);
  }

  if (typeInfo.valueType === "function" || typeInfo.valueType === "async_function") {
    const fn: (...args: any[]) => any | Promise<any> = (container as any)[name];
    return await fn(...args);
  }

  return (container as any)[name];
}

export function serializeTypeMapping(typeMapping: TypeMapping): string {
  const plainObj: Record<string, TypeInfo> = {};
  typeMapping.forEach((value, key) => {
    plainObj[key] = value;
  });
  return JSON.stringify(plainObj);
}

export function deserializeTypeMapping(jsonString: string): TypeMapping {
  const plainObj: Record<string, TypeInfo> = JSON.parse(jsonString);
  const typeMapping = new Map<string, TypeInfo>();
  for (const key in plainObj) {
    typeMapping.set(key, plainObj[key]);
  }
  return typeMapping;
}

export const buildApiCalls = (
  rpc: PeerRpc,
  serializedApiMapping: string,
  endpoint: ExperimentalRpcEndpoint
): Record<string, Value> => {
  const experimentalMapping = deserializeTypeMapping(serializedApiMapping);
  const apiObject: Record<string, Value> = {};

  for (const method of experimentalMapping.keys()) {
    const typeInfo = experimentalMapping.get(method);
    if (!typeInfo) continue;

    if (typeInfo.valueType === "function" || typeInfo.valueType === "async_function") {
      apiObject[method] = (...params: Array<any>) => {
        params = params ?? [];
        return new Promise((resolve, reject) => {
          rpc.call(endpoint, [method, ...params], (result: any) => {
            if (result.error) {
              reject(result.error);
            } else {
              resolve(result);
            }
          });
        });
      };
    } else {
      apiObject[method] = typeInfo.value ?? null;
    }
  }

  return apiObject;
};

export const registerExperimentalEndpoint = (
  rpc: PeerRpc,
  endpoint: ExperimentalRpcEndpoint,
  experimentalContainer: ExperimentalContainer<any>,
  identifier: string
) => {
  rpc.register(
    endpoint,
    async (address: string, args: Array<any>, callback: Function) => {
      if (address === identifier) {
        const functionName = args[0] as string;
        const result = await executeOrGetProperty(experimentalContainer, functionName, ...args.splice(1));
        if (typeof result !== 'undefined') {
          callback(result);
        }
      }
    }
  );
};
