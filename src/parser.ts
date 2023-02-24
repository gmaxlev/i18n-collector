import type { ParseResult } from "./types";
import path from "path";

interface ParserOptions {
  filePath: string;
  fileContent: Buffer;
}

function getNamespace(content: object) {
  let namespace: string | undefined = undefined;

  if ("namespace" in content) {
    if (typeof content.namespace !== "string") {
      throw new Error("Namespace must be a string");
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
    typeof result[0][1] !== "string"
  ) {
    throw new Error(`
            Error while detecting language from file name,
            by default it should be [language].locale.json.
            `);
  }

  return result[0][1];
}

function getTranslations(content: object) {
  if (!("translations" in content)) {
    throw new Error("Translations is not found in the file");
  }

  if (typeof content.translations !== "object") {
    throw new Error("Translations must be an object");
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
    console.error("By default localization file must be a valid JSON", e);
    throw e;
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("By default localization file must be a valid JSON object");
  }

  return parsed;
}

export async function parse(options: ParserOptions): Promise<ParseResult> {
  const parsed = parseJSON(options.fileContent);

  if (parsed === null) {
    return null;
  }

  const language = getLanguage(options.filePath);
  const namespace = getNamespace(parsed);
  const translations = getTranslations(parsed);
  return {
    language,
    namespace,
    translations,
  };
}
