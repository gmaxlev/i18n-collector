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
  isParseResult,
  isParserFunction,
  isPromise,
} from "./types";
import { isBoolean, isRecord, isUndefined } from "tsguarder";

export interface CompilerOptions {
  files: LocaleFiles;
  merge?: boolean;
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
    if (language in locale.translations && locale.namespace === namespace) {
      return locale.id;
    }
  }
  return null;
}

function join(locales: ParseResult[], merge = true): CompiledLocales {
  let languages: CompiledLocales = {};

  for (const locale of locales) {
    if (locale === null) {
      continue;
    }

    const { id, translations, namespace } = locale;

    for (const language in translations) {
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

      const namespaceTranslations = translations[language];

      isRecord.assert(
        namespaceTranslations,
        `Translations for language [${language}] and namespace [${namespace}]`
      );

      namespaceRecord = {
        ...namespaceRecord,
        ...namespaceTranslations,
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

    isParseResult.assert(parserValue, "return value of a custom parser");

    return parserResultMayPromise;
  };
}

/**
 * Compiles locales
 * @param options Compiler options
 * @param options.files Array of locale files
 * @param options.merge If true, the locales with the same namespace from different files will be merged. Default: false
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
 *     parser: myCustomParser
 * })
 *
 * @returns Compiled locales ready to be saved
 */
export async function compile(options: CompilerOptions) {
  try {
    isRecord.assert(options, "options");

    isLocaleFiles.assert(options.files, "files");

    if (!isUndefined(options.merge)) {
      isBoolean.assert(options.merge, "merge");
    }

    if (!isUndefined(options.parser)) {
      isParserFunction.assert(options.parser, "parser");
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

    return join(parsed, options.merge);
  } catch (error) {
    console.error("Error while compiling");
    throw error;
  }
}
