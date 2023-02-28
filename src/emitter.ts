import path from "path";
import fsp from "fs/promises";
import chalk from "chalk";
import { scan } from "./scan";
import { getStringFilesize, isAvailableDirectory } from "./utils";
import type {
  CompiledLocaled,
  LocaleFile,
  LocaleFiles,
  Matcher,
} from "./types";
import {
  CompiledLocaledTypeDescription,
  isCompiledLocales,
  isBoolean,
  isEnoentError,
  isRecord,
  isString,
  isUndefined,
} from "./types";

export interface EmitterParams {
  compiled: CompiledLocaled;
  outputPath: string;
  clean?: boolean;
  matcher?: Matcher;
}

function logCompiledFiles(
  snapshotBeforeWriting: Map<string, LocaleFile>,
  files: LocaleFiles,
  clear: boolean
) {
  console.log("\n✅  Compiled files:");

  files.forEach((file, index) => {
    const snapshot = snapshotBeforeWriting.get(file.filePath);
    snapshotBeforeWriting.delete(file.filePath);
    const isNew = !snapshot;
    const isChanged =
      !isNew && snapshot && !snapshot.content.equals(file.content);
    const relativePath = path.basename(file.filePath);
    const fileNameLog = chalk.white.bold(`${index + 1}. ${relativePath}`);

    if (isNew) {
      const newLog = chalk.bgGreenBright("new");
      const sizeLog = chalk.white(getStringFilesize(file.bytes));
      console.log(`${fileNameLog} ${newLog} ${sizeLog}`);
    } else if (isChanged) {
      const changedLog = chalk.bgYellow("changed");
      const sizeBeforeString = getStringFilesize(snapshot.bytes);
      const sizeBeforeLog = chalk.white(sizeBeforeString);

      const dividerLog = chalk.white("->");
      const sizeAfterLog = chalk.white(getStringFilesize(file.bytes));
      console.log(
        `${fileNameLog} ${changedLog} ${sizeBeforeLog} ${dividerLog} ${sizeAfterLog}`
      );
    } else {
      const unchangedLog = chalk.bgGrey("unchanged");
      const sizeLog = chalk.white(getStringFilesize(file.bytes));
      console.log(`${fileNameLog} ${unchangedLog} ${sizeLog}`);
    }
  });

  if (clear) {
    const deletedFiles = [...snapshotBeforeWriting.entries()];

    if (deletedFiles.length) {
      console.log("\n🗑  Deleted files:");
      deletedFiles.forEach(([filePath, file], index) => {
        const relativePath = path.basename(file.filePath);
        const fileNameLog = chalk.white.bold(`${index + 1}. ${relativePath}`);
        const newLog = chalk.bgRedBright("new");
        const sizeLog = chalk.white(getStringFilesize(file.bytes));
        console.log(`${fileNameLog} ${newLog} ${sizeLog}`);
      });
    }
  }

  console.log("");
}

async function emitFile(
  filePath: string,
  content: Buffer
): Promise<LocaleFile> {
  await fsp.access(filePath).catch((e) => {
    if (!isEnoentError(e)) {
      throw e;
    }
  });

  await fsp.writeFile(filePath, content);

  const stat = await fsp.stat(filePath);

  return {
    filePath,
    content,
    bytes: stat.size,
  };
}

async function makeOutputDirectory(outputPath: string, clear: boolean) {
  let exist = true;

  await fsp.access(outputPath).catch((e) => {
    if (!isEnoentError(e)) {
      throw e;
    }
    exist = false;
  });

  if (exist) {
    const stat = await fsp.stat(outputPath);

    if (!stat.isDirectory()) {
      throw new Error(`Output path "${outputPath}" is not a directory`);
    }

    if (clear) {
      await fsp.rm(outputPath, { recursive: true, force: true });
      await fsp.mkdir(outputPath, { recursive: true });
    }
  } else {
    await fsp.mkdir(outputPath, { recursive: true });
  }
}

async function makeSnapshot(path: string, matcher: Matcher) {
  const map = new Map<string, LocaleFile>();

  const exist = await isAvailableDirectory(path);

  if (!exist) {
    return map;
  }

  const files = await scan({
    path,
    matcher: /.\.json/,
  });
  files.forEach((file) => {
    map.set(file.filePath, file);
  });
  return map;
}

export async function emit(params: EmitterParams) {
  if (!isRecord(params)) {
    throw new Error("params argument: should be an object");
  }

  if (!isCompiledLocales(params.compiled)) {
    throw new Error(`params.compiled: ${CompiledLocaledTypeDescription}`);
  }

  if (!isString(params.outputPath)) {
    throw new Error("params.outputPath: should be a string");
  }

  if (!isUndefined(params.clean) && !isBoolean(params.clean)) {
    throw new Error("params.clean: should be a boolean");
  }

  const clear = isBoolean(params.clean) ? params.clean : false;

  const snapshot = await makeSnapshot(params.outputPath, /.\.json/);

  await makeOutputDirectory(params.outputPath, clear);

  const savings = Object.keys(params.compiled).map((key) => {
    const filePath = path.resolve(params.outputPath, key + ".json");
    const content = Buffer.from(JSON.stringify(params.compiled[key]));
    return emitFile(filePath, content);
  });

  const emitted = await Promise.all(savings);

  logCompiledFiles(snapshot, emitted, clear);
}
