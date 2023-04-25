import type { ParseResult, ParserOptions } from "./types";
import path from "path";
import { isBuffer, isRecord, isString } from "./types";

function getNamespace(filePath: string) {
  const basename = path.basename(filePath);

  const result = [...basename.matchAll(/(.+)\.locale\.json/g)];

  if (
    result.length === 0 ||
    !Array.isArray(result[0]) ||
    !isString(result[0][1]) ||
    result[0][1].trim() === ""
  ) {
    throw new Error(
      `Filename  ${filePath} has an invalid name. Filename should contain language code in format "[namespace].locale.json"`
    );
  }

  return result[0][1];
}

function getTranslations(content: Record<string, unknown> | null) {
  if (content === null) {
    return {};
  }
  return content;
}

function parseJSON(content: Buffer) {
  if (content.length === 0) {
    return null;
  }

  const string = content.toString();

  if (string.trim() === "") {
    return null;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(string);
  } catch (e) {
    console.error("By default locale file must be a valid JSON");
    throw e;
  }

  if (!isRecord(parsed)) {
    throw new Error("By default locale file must be a valid JSON object");
  }

  return parsed;
}

export function parse(options: ParserOptions): ParseResult {
  try {
    if (!isRecord(options)) {
      throw new Error("Options should be an object");
    }

    if (!isString(options.filePath)) {
      throw new Error("filePath: should be a string");
    }

    if (!isBuffer(options.fileContent)) {
      throw new Error("fileContent: should be a Buffer");
    }

    const parsed = parseJSON(options.fileContent);

    const namespace = getNamespace(options.filePath);
    const translations = getTranslations(parsed);
    const id = options.filePath;

    return {
      namespace,
      translations,
      id,
    };
  } catch (e) {
    console.error("Error while parsing file", options?.filePath);
    throw e;
  }
}
