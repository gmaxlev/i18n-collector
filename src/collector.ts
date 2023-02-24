import type { JoinedLocales, ParseResult } from "./types";

export function join(
  locales: ParseResult[],
  defaultNamespace: string
): JoinedLocales {
  let languages: Record<string, Record<string, any>> = {};

  for (const locale of locales) {
    if (locale === null) {
      continue;
    }

    const namespace = locale.namespace ? locale.namespace : defaultNamespace;

    const languageRecord = languages[locale.language] || {};

    languageRecord[namespace] = {
      ...languageRecord[namespace],
      ...locale.translations,
    };

    languages = {
      ...languages,
      [locale.language]: languageRecord,
    };
  }

  return languages;
}
