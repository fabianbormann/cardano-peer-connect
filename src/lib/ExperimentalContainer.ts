/**
 * The ExperimentalContainer is a utility designed to facilitate communication
 * between two distributed systems, such as Peer DApps, by serializing an
 * object's structure, properties, and functions. This allows the object to
 * be transferred to a remote system, which can then interact with the object
 * without prior knowledge of its structure or implementation details.
 *
 * By capturing the blueprint of an object, including its properties and
 * functions, and converting it into a transferable format called TypeMapping,
 * the ExperimentalContainer enables seamless integration between different
 * systems. The receiving system, or Peer DApp, can use this blueprint to
 * interact with the object as if it had direct knowledge of the object's
 * structure. This is particularly useful when the remote system needs to call
 * the other endpoint or interact with it in a more complex manner, as it can
 * do so without requiring prior knowledge of the specific object.
 *
 * In summary, the ExperimentalContainer provides a powerful tool for
 * facilitating communication between distributed systems like Peer DApps by
 * allowing them to share and interact with objects without needing to know
 * the details of their implementation. This enables seamless integration and
 * interaction between different systems, even when they need to call each
 * other's endpoints or perform complex operations.
 */
import { ExperimentalRpcEndpoint } from '../types';
import Meerkat from '@fabianbormann/meerkat';

// The Value type represents all possible types of values in a DynamicObject.
export type Value = string | number | boolean | symbol | bigint | object | null
                    | ((...args: any[]) => any)
                    | ((...args: any[]) => Promise<any>);

/**
 * The ExperimentalContainer class allows adding properties and functions of
 * various types, and provides methods to set and get these values using their
 * keys.
 *
 * The ExperimentalContainer is used to store properties and functions of
 * a wallets experimental features.
 */
export class ExperimentalContainer<T extends Record<keyof T, Value>> {
  /**
   * The constructor takes an object of type T and assigns its properties
   * to the class instance using Object.assign.
   */
  constructor(obj: T) {
    Object.assign(this, obj);
  }

  /**
   * The get method retrieves the value of the specified key.
   * @param key The key of the property or function to retrieve.
   * @returns The value of the specified key.
   */
  get<K extends keyof T>(key: K): T[K] {
    return (this as unknown as T)[key];
  }

  /**
   * The set method sets the value of the specified key.
   * @param key The key of the property or function to set.
   * @param value The new value to set for the specified key.
   */
  set<K extends keyof T>(key: K, value: T[K]): void {
    (this as unknown as T)[key] = value;
  }
}

// The ValueType type represents all possible value types in a TypeMapping.
export type ValueType = "string" | "number" | "boolean" | "symbol" | "bigint" | "object" | "null" | "function" | "async_function";

// The TypeInfo interface represents the type information for each property or function.
export interface TypeInfo {
  valueType: ValueType;
  value?: Value; // Add an optional value property for non-function values
}

// The TypeMapping type is a Map that stores the type information for each property or function.
export type TypeMapping = Map<string, TypeInfo>;

/**
 * The createTypeMapping function generates a TypeMapping for an object.
 * @param obj The object for which to create a TypeMapping.
 * @returns A TypeMapping containing the type information and values for each property or function in the object.
 */
export function createTypeMapping<T extends Record<keyof T, Value>>(obj: T): TypeMapping {
  const typeMapping = new Map<string, TypeInfo>();

  for (const key in obj) {
    const value = obj[key];
    let valueType: ValueType;

    if (typeof value === "function") {
      valueType = value.constructor.name === "AsyncFunction" ? "async_function" : "function";
      typeMapping.set(key, { valueType });
    } else if (typeof value === "object") {
      valueType = "object";
      typeMapping.set(key, { valueType, value: JSON.parse(JSON.stringify(value)) }); // Deep copy the object value
    } else {
      valueType = typeof value as ValueType;
      typeMapping.set(key, { valueType, value }); // Include the value for non-function properties
    }
  }

  return typeMapping;
}

/**
 * Execute the function or retrieve the property value from an object using a given TypeMapping.
 * @param container The object containing the properties and functions to interact with.
 * @param name The name of the property or function to retrieve or call.
 * @param args Optional arguments for the function if `name` corresponds to a function.
 * @returns The result of calling the function or the value of the property, or an error if the name is not found.
 */
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
  } else {
    return (container as any)[name];
  }
}


/**
 * Serializes a type mapping object into a JSON string representation.
 * The serialized string can be easily transmitted or stored and later deserialized back into a type mapping object.
 *
 * @param typeMapping A type mapping object containing information about methods and properties.
 * @returns A JSON string representation of the type mapping object.
 */
export function serializeTypeMapping(typeMapping: TypeMapping): string {
  const plainObj: Record<string, TypeInfo> = {};

  typeMapping.forEach((value, key) => {
    plainObj[key] = value;
  });

  return JSON.stringify(plainObj);
}

/**
 * Deserializes a serialized type mapping JSON string into a type mapping object.
 * The deserialized object can be used to interact with the remote endpoint or for reconstructing the original object.
 *
 * @param serializedTypeMapping A JSON string representation of a type mapping object.
 * @returns A type mapping object containing information about methods and properties.
 */
export function deserializeTypeMapping(jsonString: string): TypeMapping {
  const plainObj: Record<string, TypeInfo> = JSON.parse(jsonString);
  const typeMapping = new Map<string, TypeInfo>();

  for (const key in plainObj) {
    typeMapping.set(key, plainObj[key]);
  }

  return typeMapping;
}

/**
 * Builds a set of API calls for a given Meerkat instance, address, serialized API mapping, and remote endpoint.
 * The function creates an object containing methods and properties from the serialized API mapping, making it
 * easy to interact with the remote endpoint.
 *
 * @param meerkat A Meerkat instance used to perform JSON-RPC calls.
 * @param address The address to send to.
 * @param serializedApiMapping A string created from serializeTypeMapping.
 * @param endpoint Remote endpoint to call.
 * @returns An object containing methods and properties for the specified experimental mapping.
 */
export const buildApiCalls = (
  meerkat: Meerkat,
  address: string,
  serializedApiMapping: string,
  endpoint: ExperimentalRpcEndpoint
): Record<string, Value> => {

  const experimentalMapping = deserializeTypeMapping(serializedApiMapping);

  const apiObjectRecord: Record<string, Value> = {};

  for (const method of experimentalMapping.keys()) {
    const typeInfo = experimentalMapping.get(method);

    if (!typeInfo) continue;

    if (typeInfo.valueType === "function" || typeInfo.valueType === "async_function") {
      apiObjectRecord[method] = (...params: Array<any>) => {
        // Default to an empty array if params are undefined.
        params = params ?? [];

        return new Promise((resolve, reject) => {
          meerkat.rpc(address, endpoint, [method, ...params], (result: any) => {
            if (result.error) {
              reject(result.error)
            } else {
              resolve(result)
            }
          });
        });
      };
    } else {

      // dealing with non-function properties.
      apiObjectRecord[method] = typeInfo.value ?? null;
    }
  }

  return apiObjectRecord;
};


/**
 * Registers an experimental endpoint with a Meerkat instance, enabling the remote endpoint to interact with
 * the given experimental container. The function associates the specified identifier with the experimental
 * container and sets up a callback to handle incoming requests.
 *
 * @param meerkat A Meerkat instance used to register the experimental endpoint.
 * @param endpoint The experimental RPC endpoint to be registered.
 * @param experimentalContainer An ExperimentalContainer instance containing methods and properties to be exposed.
 * @param identifier A unique string identifier to associate with the experimental container.
 */
export const registerExperimentalEndpoint = (
  meerkat: Meerkat,
  endpoint: ExperimentalRpcEndpoint,
  experimentalContainer: ExperimentalContainer<any>,
  identifier: string
) => {

  meerkat.register(
    endpoint,
    async (address: string, args: Array<any>, callback: Function) => {

      const functionName = args[0] as string;

      if (address === identifier) {

        const result = await executeOrGetProperty(experimentalContainer, functionName, ...args.splice(1))

        if (typeof result !== 'undefined') {
          callback(result);
        }
      }
    }
  )
}
