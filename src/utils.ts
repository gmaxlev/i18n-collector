import * as filesize from "filesize";
import type { Matcher } from "./types";
import fsp from "fs/promises";
import { isEnoentError } from "./types";

export function getStringFilesize(bytes: number) {
  return String(filesize.filesize(bytes));
}

export async function useMatcher(matcher: Matcher, filePath: string) {
  if (matcher instanceof RegExp) {
    return matcher.test(filePath);
  }

  const result = await matcher(filePath);

  if (typeof result !== "boolean") {
    throw new Error("Matcher should return boolean or Promise<boolean>");
  }

  return result;
}

export async function isExistingPath(path: string) {
  try {
    await fsp.access(path);
    return true;
  } catch (e) {
    if (!isEnoentError(e)) {
      throw e;
    }
    return false;
  }
}

export async function isAvailableDirectory(path: string) {
  const exist = await isExistingPath(path);

  if (!exist) {
    return false;
  }

  const stat = await fsp.stat(path);
  return stat.isDirectory();
}
