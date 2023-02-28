import type {
  LocaleFiles,
  LocaleNamespace,
  ParserFunction,
  ParserOptions,
} from "./types";
import { parse } from "./parser";
import type { CompiledLocaled, ParseResult } from "./types";
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

export interface CompilerParams {
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
): CompiledLocaled {
  let languages: CompiledLocaled = {};

  for (const locale of locales) {
    if (locale === null) {
      continue;
    }

    const { id, language } = locale;

    let { namespace } = locale;

    if (isUndefined(namespace)) {
      if (isUndefined(defaultNamespace)) {
        throw new Error(
          "Namespace is undefined and defaultNamespace is not specified"
        );
      }
      namespace = defaultNamespace;
    }

    let languageRecord = (languages[language] = languages[language] || {});

    if (!isUndefined(languageRecord[namespace]) && !merge) {
      const conflictedLocaleId = findIdInLocales(locales, language, namespace);

      throw new Error(
        `Locales [${id}] and [${conflictedLocaleId}] have the same namespace. If you want to allow merging, set the merge option to true`
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
        `Parser returned value is wrong: ${ParseResultTypeDescription}`
      );
    }

    return parserResultMayPromise;
  };
}

export async function compile(params: CompilerParams) {
  if (!isRecord(params)) {
    throw new TypeError("params error: must be an object");
  }

  if (!isUndefined(params.merge) && !isBoolean(params.merge)) {
    throw new TypeError("params.merge error: must be a boolean or undefined");
  }

  if (
    !isUndefined(params.defaultNamespace) &&
    !isLocaleNamespace(params.defaultNamespace)
  ) {
    throw new TypeError(
      `params.defaultNamespace error: ${LocaleNamespaceTypeDescription}`
    );
  }

  if (!isLocaleFiles(params.files)) {
    throw new TypeError(`params.files error: ${LocaleFilesTypeDescription}`);
  }

  if (!isUndefined(params.parser) && !isParserFunction(params.parser)) {
    throw new TypeError(
      `parser parameter error: ${ParserFunctionTypeDescription}`
    );
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
}
