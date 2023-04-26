import type { LocaleFile, Matcher } from "./types";
import fsp from "fs/promises";
import path from "path";
import { isAvailableDirectory, useMatcher } from "./utils";
import { isMatcher } from "./types";
import { isBoolean, isRecord, isString, isUndefined } from "tsguarder";

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
  isRecord.assert(options, "options");

  isString.assert(options.path, "path");

  isMatcher.assert(options.matcher, "matcher");

  if (!isUndefined(options.recursive)) {
    isBoolean.assert(options.recursive, "recursive");
  }
}

/**
 * Scans the directory for localization files
 * @param options Options
 * @param options.path The path to the directory to scan
 * @param options.matcher The matcher to use to filter files
 * @param options.recursive Whether to scan the directory recursively
 *
 * @example
 * scan({
 *     path: "./src",
 *     matcher: /.+\.locale\.json/,
 *     recursive: true
 * })
 *
 * @returns the list of files
 */
export async function scan(options: ScanOptions) {
  try {
    validateOptions(options);

    const exist = await isAvailableDirectory(options.path);

    if (!exist) {
      throw new Error(
        `Path "${options.path}" does not exist or it is not a directory`
      );
    }

    return scanDirectory(options.path, options.matcher, options.recursive);
  } catch (e) {
    console.error("Error while scanning files");
    throw e;
  }
}
