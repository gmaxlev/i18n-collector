import {
  createTypeGuard,
  isFunction,
  isNumber,
  isRecord,
  isString,
  isUndefined,
  TypeGuard,
} from "tsguarder";

export const isBuffer: TypeGuard<Buffer> = createTypeGuard(
  "must be a Buffer",
  (value: unknown): value is Buffer => {
    return value instanceof Buffer;
  },
);

export const isPromise: TypeGuard<Promise<unknown>> = createTypeGuard(
  "must be a Promise",
  (value: unknown): value is Promise<unknown> => {
    return isRecord(value) && typeof value["then"] === "function";
  },
);

export const isEnoentError: TypeGuard<NodeJS.ErrnoException> = createTypeGuard(
  "must be a NodeJS.ErrnoException",
  (value: unknown): value is NodeJS.ErrnoException => {
    return isRecord(value) && value["code"] === "ENOENT";
  },
);

/**
 * Some function can be sync or async, and it is better to use this type
 */

export type MayAsync<T extends (...args: any[]) => unknown> =
  | T
  | ((...args: Parameters<T>) => Promise<ReturnType<T>>);

/** Matcher Type */

export type Matcher = RegExp | MayAsync<(filePath: string) => boolean>;

export const isMatcher: TypeGuard<Matcher> = createTypeGuard(
  "must be a RegExp or (fileName: string) => boolean",
  (value: unknown): value is Matcher => {
    return value instanceof RegExp || typeof value === "function";
  },
);

/** Namespace Type */

export type LocaleNamespace = string;

export const isLocaleNamespace: TypeGuard<LocaleNamespace> = createTypeGuard(
  "must be a string",
  (value: unknown): value is LocaleNamespace => {
    return isString(value);
  },
);

/** LocaleFile Type */

export interface LocaleFile {
  filePath: string;
  content: Buffer;
  bytes: number;
}

export const isLocaleFile: TypeGuard<LocaleFile> = createTypeGuard(
  "must be { filePath: string, content: Buffer, bytes: number }",
  (value: unknown): value is LocaleFile => {
    if (!isRecord(value)) {
      return false;
    }

    const { filePath, content, bytes } = value;

    if (!isString(filePath)) {
      return false;
    }

    if (!isBuffer(content)) {
      return false;
    }

    if (!isNumber(bytes)) {
      return false;
    }

    return true;
  },
);

export type LocaleFiles = LocaleFile[];

export const isLocaleFiles: TypeGuard<LocaleFile[]> = createTypeGuard(
  "must be Array<{ filePath: string, content: Buffer, bytes: number }>",
  (value: unknown): value is LocaleFile[] => {
    return Array.isArray(value) && value.every(isLocaleFile);
  },
);

/** ParserFunction Type */

export interface ParserOptions {
  filePath: string;
  fileContent: Buffer;
}

export type ParserFunction = MayAsync<(options: ParserOptions) => ParseResult>;

export const isParserFunction: TypeGuard<ParserFunction> = createTypeGuard(
  "must be a function",
  (value: unknown): value is ParserFunction => {
    return isFunction(value);
  },
);

/** ParseResult Type */

export type ParseResult = {
  id: unknown;
  translations: Record<string, unknown>;
  namespace: LocaleNamespace;
};

export const isParseResult: TypeGuard<ParseResult> = createTypeGuard(
  "must be { translations: object, namespace: string, id: unknown }",
  (value: unknown): value is ParseResult => {
    if (value === null) {
      return true;
    }

    if (!isRecord(value)) {
      return false;
    }

    const { translations, namespace, id } = value;

    if (isUndefined(id)) {
      return false;
    }

    if (!isRecord(translations)) {
      return false;
    }

    if (!isLocaleNamespace(namespace)) {
      return false;
    }

    return true;
  },
);

/** CompiledLocales Type */

export type CompiledLocales = Record<string, Record<string, unknown>>;

export const isCompiledLocales: TypeGuard<CompiledLocales> = createTypeGuard(
  "must be Record<string, Record<string, unknown>>",
  (value: unknown): value is CompiledLocales => {
    if (!isRecord(value)) {
      return false;
    }

    for (const key in value) {
      if (!isRecord(value[key])) {
        return false;
      }
    }

    return true;
  },
);
