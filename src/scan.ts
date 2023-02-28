import type { LocaleFile, Matcher } from "./types";
import fsp from "fs/promises";
import path from "path";
import { isAvailableDirectory, useMatcher } from "./utils";
import {
  isMatcher,
  MatcherTypeDescription,
  isBoolean,
  isRecord,
  isString,
  isUndefined,
} from "./types";

export interface ScanOptions {
  path: string;
  matcher: Matcher;
  recursive?: boolean;
}

async function scanDirectory(
  from: string,
  match: Matcher,
  recursive = true,
  collection: LocaleFile[] = []
) {
  const result = await fsp.readdir(from).catch((e) => {
    console.error("Error while reading directory", from);
    throw e;
  });

  for (const file of result) {
    const filePath = path.resolve(from, file);

    const stat = await fsp.lstat(filePath).catch((e) => {
      console.error("Error while getting file stats", filePath);
      throw e;
    });

    if (recursive && stat.isDirectory()) {
      await scanDirectory(filePath, match, recursive, collection);
    }

    if (stat.isFile() && (await useMatcher(match, filePath))) {
      const content = await fsp.readFile(filePath).catch((e) => {
        console.error("Error while reading file content", filePath);
        throw e;
      });

      collection.push({
        filePath,
        content,
        bytes: stat.size,
      });
    }
  }

  return collection;
}

function validateOptions(options: ScanOptions) {
  if (!isRecord(options)) {
    throw new TypeError("Scan options is not an object");
  }

  if (!isString(options.path)) {
    throw new TypeError("Scan options.path is not a string");
  }

  if (!isMatcher(options.matcher)) {
    throw new TypeError(`Scan options.matcher: ${MatcherTypeDescription}`);
  }

  if (!isUndefined(options.recursive) && !isBoolean(options.recursive)) {
    throw new TypeError("Scan options.recursive is not a boolean");
  }
}

export async function scan(options: ScanOptions) {
  try {
    validateOptions(options);

    const exist = await isAvailableDirectory(options.path);

    if (!exist) {
      throw new Error(
        `Scan path ${options.path} does not exist or it is not a directory`
      );
    }

    return scanDirectory(options.path, options.matcher, options.recursive);
  } catch (e) {
    console.error("Error while scanning files");
    throw e;
  }
}
