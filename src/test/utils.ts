const types = Object.freeze({
  null: null,
  undefined: undefined,
  boolean: true,
  number: 1,
  bigint: BigInt(Number.MAX_SAFE_INTEGER),
  string: "string",
  symbol: Symbol("symbol"),
  array: [],
  record: {},
  function: () => {},
});

export function excludeTypes(exclude: Array<keyof typeof types>) {
  return Object.keys(types)
    .filter((key) => {
      return !exclude.includes(key as keyof typeof types);
    })
    .map((key) => (types as any)[key]);
}

export function typesInArray(types: any[]) {
  return types.map((value) => [value]);
}

export const NOT_NULL_TYPES = excludeTypes(["null"]);
export const NOT_UNDEFINED_TYPES = excludeTypes(["undefined"]);
export const NOT_BOOLEAN_TYPES = excludeTypes(["boolean"]);
export const NOT_NUMBER_TYPES = excludeTypes(["number"]);
export const NOT_BIGINT_TYPES = excludeTypes(["bigint"]);
export const NOT_STRING_TYPES = excludeTypes(["string"]);
export const NOT_SYMBOL_TYPES = excludeTypes(["symbol"]);
export const NOT_RECORD_TYPES = excludeTypes(["record"]);
export const NOT_FUNCTION_TYPES = excludeTypes(["function"]);
export const NOT_ARRAY_TYPES = excludeTypes(["array"]);
