export function isNumber(value: unknown): value is number {
  return typeof value === "number";
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function isBuffer(value: unknown): value is Buffer {
  return value instanceof Buffer;
}

export function isUndefined(value: unknown): value is undefined {
  return value === undefined;
}

export function isPromise(value: unknown): value is Promise<unknown> {
  return isRecord(value) && typeof value["then"] === "function";
}

export function isEnoentError(value: unknown): value is NodeJS.ErrnoException {
  return isRecord(value) && value["code"] === "ENOENT";
}

export type MayAsync<T extends (...args: any[]) => unknown> =
  | T
  | ((...args: Parameters<T>) => Promise<ReturnType<T>>);

/** Matcher Type */

export type Matcher = RegExp | MayAsync<(fileName: string) => boolean>;

export function isMatcher(value: unknown): value is Matcher {
  return value instanceof RegExp || typeof value === "function";
}

export const MatcherTypeDescription = "Matcher must be a RegExp or function";

/** Namespace Type */

export type LocaleNamespace = string;

export function isLocaleNamespace(value: unknown): value is LocaleNamespace {
  return typeof value === "string";
}

export const LocaleNamespaceTypeDescription =
  "LocaleNamespace must be a string";

/** LocaleFile Type */

export interface LocaleFile {
  filePath: string;
  content: Buffer;
  bytes: number;
}

export function isLocaleFile(value: unknown): value is LocaleFile {
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
}

export const localeFileTypeDescription =
  "LoadedFile must be an object { filePath: string, content: Buffer, bytes: number }";

export type LocaleFiles = LocaleFile[];

export function isLocaleFiles(value: unknown): value is LocaleFile[] {
  return Array.isArray(value) && value.every(isLocaleFile);
}

export const LocaleFilesTypeDescription =
  "LoadedFiles must be an array of { filePath: string, content: Buffer, bytes: number }";

/** ParserFunction Type */

export interface ParserOptions {
  filePath: string;
  fileContent: Buffer;
}

export type ParserFunction = MayAsync<(options: ParserOptions) => ParseResult>;

export function isParserFunction(value: unknown): value is ParserFunction {
  return typeof value === "function";
}

export const ParserFunctionTypeDescription =
  "ParserFunction must be a function";

/** ParseResult Type */

export type ParseResult = {
  id: unknown;
  language: string;
  translations?: object;
  namespace: LocaleNamespace | undefined;
} | null;

export function isParseResult(value: unknown): value is ParseResult {
  if (value === null) {
    return true;
  }

  if (!isRecord(value)) {
    return false;
  }

  const { language, translations, namespace, id } = value;

  if (isUndefined(id)) {
    return false;
  }

  if (!isString(language)) {
    return false;
  }

  if (!isUndefined(translations) && !isRecord(translations)) {
    return false;
  }

  if (!isUndefined(namespace) && typeof namespace !== "string") {
    return false;
  }

  return true;
}

export const ParseResultTypeDescription =
  "ParseResult must be an object { language: string, translations?: object, namespace?: string, id: unknown } or null";

/** CompiledLocales Type */

export type CompiledLocaled = Record<string, Record<string, unknown>>;

export function isCompiledLocales(value: unknown): value is CompiledLocaled {
  if (!isRecord(value)) {
    return false;
  }

  for (const key in value) {
    if (!isRecord(value[key])) {
      return false;
    }
  }

  return true;
}

export const CompiledLocaledTypeDescription =
  "CompiledLocales must be an object";
