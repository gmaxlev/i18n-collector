import type {
  LocaleFiles,
  LocaleNamespace,
  ParserFunction,
  ParserOptions,
} from "./types";
import { parse } from "./parser";
import type { CompiledLocales, ParseResult } from "./types";
import {
  isLocaleFiles,
  isLocaleNamespace,
  isParseResult,
  isParserFunction,
  LocaleFilesTypeDescription,
  LocaleNamespaceTypeDescription,
  ParseResultTypeDescription,
  ParserFunctionTypeDescription,
} from "./types";
import { isBoolean, isRecord, isPromise, isUndefined } from "./types";

export interface CompilerOptions {
  files: LocaleFiles;
  merge?: boolean;
  defaultNamespace?: LocaleNamespace;
  parser?: ParserFunction;
}

function findIdInLocales(
  locales: ParseResult[],
  language: string,
  namespace?: LocaleNamespace
) {
  for (const locale of locales) {
    if (locale === null) {
      continue;
    }
    if (locale.language === language && locale.namespace === namespace) {
      return locale.id;
    }
  }
  return null;
}

function join(
  locales: ParseResult[],
  defaultNamespace?: LocaleNamespace,
  merge = true
): CompiledLocales {
  let languages: CompiledLocales = {};

  for (const locale of locales) {
    if (locale === null) {
      continue;
    }

    const { id, language } = locale;

    let { namespace } = locale;

    if (isUndefined(namespace)) {
      if (isUndefined(defaultNamespace)) {
        throw new Error(
          `"namespace" is not defined in locale [${id}] and no default namespace is provided"`
        );
      }
      namespace = defaultNamespace;
    }

    let languageRecord = (languages[language] = languages[language] || {});

    if (!isUndefined(languageRecord[namespace]) && !merge) {
      const conflictedLocaleId = findIdInLocales(
        locales.filter((item) => item !== locale),
        language,
        namespace
      );

      throw new Error(
        `Locales [${id}] and [${conflictedLocaleId}] have the same namespace. If you want to allow merging, set the "merge" option to true`
      );
    }

    let namespaceRecord = (languageRecord[namespace] =
      languageRecord[namespace] || {});

    namespaceRecord = {
      ...namespaceRecord,
      ...locale.translations,
    };

    languageRecord = {
      ...languageRecord,
      [namespace]: namespaceRecord,
    };

    languages = {
      ...languages,
      [language]: languageRecord,
    };
  }

  return languages;
}

function wrapParseFunction(parser: ParserFunction) {
  return async function wrappedParserFunction(params: ParserOptions) {
    const parserResultMayPromise = parser(params);
    let parserValue = parserResultMayPromise;

    if (isPromise(parserResultMayPromise)) {
      await parserResultMayPromise
        .then((value) => {
          parserValue = value;
        })
        .catch((error) => {
          console.error("Error using custom parser");
          throw error;
        });
    }

    if (!isParseResult(parserValue)) {
      throw new Error(
        `Parser has returned an invalid type: ${ParseResultTypeDescription}`
      );
    }

    return parserResultMayPromise;
  };
}

export async function compile(params: CompilerOptions) {
  try {
    if (!isRecord(params)) {
      throw new TypeError("Options is not an object");
    }

    if (!isUndefined(params.merge) && !isBoolean(params.merge)) {
      throw new TypeError("merge: must be a boolean or undefined");
    }

    if (
      !isUndefined(params.defaultNamespace) &&
      !isLocaleNamespace(params.defaultNamespace)
    ) {
      throw new TypeError(
        `defaultNamespace: ${LocaleNamespaceTypeDescription}`
      );
    }

    if (!isLocaleFiles(params.files)) {
      throw new TypeError(`files: ${LocaleFilesTypeDescription}`);
    }

    if (!isUndefined(params.parser) && !isParserFunction(params.parser)) {
      throw new TypeError(`parser: ${ParserFunctionTypeDescription}`);
    }

    // Wrap the parser function if it is provided or use the default parser
    const parser = params.parser ? wrapParseFunction(params.parser) : parse;

    const parsed = await Promise.all(
      params.files.map((file) =>
        parser({
          filePath: file.filePath,
          fileContent: file.content,
        })
      )
    );

    return join(parsed, params.defaultNamespace, params.merge);
  } catch (error) {
    console.error("Error while compiling");
    throw error;
  }
}
