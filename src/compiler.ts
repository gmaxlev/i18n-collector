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
          `"namespace" is not defined in locale [${id}] and no default namespace is provided`
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

/**
 * Compiles the locales
 * @param options Compiler options
 * @param options.files Array of locale files
 * @param options.merge If true, the locales with the same namespace from different files will be merged. Default: false
 * @param options.defaultNamespace Default namespace to use if it is not defined in the locale file
 * @param options.parser Custom parser of locale files
 *
 * @example
 * const files = await scan({
 *     path: "./src",
 *     matcher: /.+\.locale\.json/,
 *     recursive: true
 * })
 * await compile({
 *     files: await scan(files),
 *     merge: true,
 *     defaultNamespace: "common",
 *     parser: myCustomParser
 * })
 *
 * @returns Compiled locales ready to be saved
 */
export async function compile(options: CompilerOptions) {
  try {
    if (!isRecord(options)) {
      throw new TypeError("Options is not an object");
    }

    if (!isUndefined(options.merge) && !isBoolean(options.merge)) {
      throw new TypeError("merge: must be a boolean or undefined");
    }

    if (
      !isUndefined(options.defaultNamespace) &&
      !isLocaleNamespace(options.defaultNamespace)
    ) {
      throw new TypeError(
        `defaultNamespace: ${LocaleNamespaceTypeDescription}`
      );
    }

    if (!isLocaleFiles(options.files)) {
      throw new TypeError(`files: ${LocaleFilesTypeDescription}`);
    }

    if (!isUndefined(options.parser) && !isParserFunction(options.parser)) {
      throw new TypeError(`parser: ${ParserFunctionTypeDescription}`);
    }

    // Wrap the parser function if it is provided or use the default parser
    const parser = options.parser ? wrapParseFunction(options.parser) : parse;

    const parsed = await Promise.all(
      options.files.map((file) =>
        parser({
          filePath: file.filePath,
          fileContent: file.content,
        })
      )
    );

    return join(parsed, options.defaultNamespace, options.merge);
  } catch (error) {
    console.error("Error while compiling");
    throw error;
  }
}
