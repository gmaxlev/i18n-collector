import type { ParseResult, ParserOptions } from "./types";
import path from "path";
import { isBuffer, isRecord, isString } from "./types";

function getNamespace(content: object) {
  let namespace: string | undefined = undefined;

  if ("namespace" in content) {
    if (typeof content.namespace !== "string") {
      throw new TypeError("Namespace must be a string");
    }
    namespace = content.namespace;
  }

  return namespace;
}

function getLanguage(filePath: string) {
  const basename = path.basename(filePath);

  const result = [...basename.matchAll(/(.+)\.locale\.json/g)];

  if (
    result.length === 0 ||
    !Array.isArray(result[0]) ||
    typeof result[0][1] !== "string" ||
    result[0][1].trim() === ""
  ) {
    throw new Error(
      `Filename  ${filePath} has an invalid name. Filename should contain language code in format "[lang].locale.json"`
    );
  }

  return result[0][1];
}

function getTranslations(content: object) {
  if (!("translations" in content)) {
    return {};
  }

  if (!isRecord(content.translations)) {
    throw new Error(`"translations" must be an object`);
  }

  return content.translations as object;
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

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
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

    if (parsed === null) {
      return null;
    }

    const language = getLanguage(options.filePath);
    const namespace = getNamespace(parsed);
    const translations = getTranslations(parsed);
    const id = options.filePath;

    return {
      language,
      namespace,
      translations,
      id,
    };
  } catch (e) {
    console.error("Error while parsing file", options?.filePath);
    throw e;
  }
}
