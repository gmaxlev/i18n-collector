export type ParseResult = {
  language: string;
  translations?: object;
  namespace: string | undefined;
} | null;

export interface LoadedFile {
  filePath: string;
  content: Buffer;
  bytes: number;
}

export type JoinedLocales = Record<string, Record<string, unknown>>;

export type Matcher = RegExp | MayAsync<(fileName: string) => boolean>;

export type ParserFunction = MayAsync<
  (filePath: string, content: string) => ParseResult
>;

export type MayAsync<T extends (...args: any[]) => unknown> =
  | T
  | ((...args: Parameters<T>) => Promise<ReturnType<T>>);
