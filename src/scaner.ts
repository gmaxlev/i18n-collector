import type { LoadedFile, Matcher } from "./types";
import fsp from "fs/promises";
import path from "path";
import { defaultMatcher } from "./constants";

export function useMatcher(matcher: Matcher, filePath: string) {
  if (matcher instanceof RegExp) {
    return matcher.test(filePath);
  }

  return matcher(filePath);
}

export async function scan(
  from: string,
  match: Matcher = defaultMatcher,
  collection: LoadedFile[] = []
) {
  const result = await fsp.readdir(from).catch((e) => {
    console.log("Error while reading directory", from, e);
    throw e;
  });

  for (const file of result) {
    const filePath = path.resolve(from, file);

    const stat = await fsp.lstat(filePath).catch((e) => {
      console.log("Error while getting file stats", filePath);
      throw e;
    });

    if (stat.isDirectory()) {
      await scan(filePath, match, collection);
    }

    if (stat.isFile() && (await useMatcher(match, filePath))) {
      const content = await fsp.readFile(filePath);

      collection.push({
        filePath,
        bytes: stat.size,
        content: content,
      });
    }
  }

  return collection;
}
