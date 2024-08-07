import path from "path";
import fsp from "fs/promises";
import chalk from "chalk";
import { scan } from "./scan";
import { getStringFilesize, isAvailableDirectory } from "./utils";
import type {
  CompiledLocales,
  LocaleFile,
  LocaleFiles,
  Matcher,
} from "./types";
import { isCompiledLocales, isEnoentError } from "./types";
import { isRecord, isString, isUndefined, isBoolean } from "tsguarder";

export interface EmitterOptions {
  compiledLocales: CompiledLocales;
  outputPath: string;
  clear?: boolean;
}

type Snapshot = Map<string, LocaleFile>;

export interface Stats {
  filePath: string;
  isNew: boolean;
  isChanged: boolean;
  isDeleted: boolean;
  localeFileNew: LocaleFile | null;
  localeFileBefore: LocaleFile | null;
}

function log(outputPath: string, stats: Stats[]) {
  console.log(`\n📁 Compiled files in ${chalk.blue.bold(outputPath.trim())}:`);

  stats.forEach((item, index) => {
    const relativePath = path.basename(item.filePath);
    const fileNameLog = `${chalk.white.bold(`${index + 1}`)}. ${chalk.blue.bold(
      relativePath,
    )}`;

    if (item.isNew) {
      const newLog = chalk.bgGreenBright("new");
      const fileSize = Number(item.localeFileNew?.bytes);
      const sizeLog = chalk.white(getStringFilesize(fileSize));
      console.log(`${fileNameLog} ${newLog} ${sizeLog}`);
    } else if (item.isChanged) {
      const changedLog = chalk.bgYellow("changed");

      const fileSizeBefore = Number(item.localeFileBefore?.bytes);

      const sizeBeforeString = getStringFilesize(fileSizeBefore);
      const sizeBeforeLog = chalk.white(sizeBeforeString);
      const dividerLog = chalk.white("->");

      const fileSizeNew = Number(item.localeFileNew?.bytes);
      const sizeAfterLog = chalk.white(getStringFilesize(fileSizeNew));
      console.log(
        `${fileNameLog} ${changedLog} ${sizeBeforeLog} ${dividerLog} ${sizeAfterLog}`,
      );
    } else if (item.isDeleted) {
      const unchangedLog = chalk.bgRed("deleted");
      const fileSize = Number(item.localeFileBefore?.bytes);
      const sizeLog = chalk.white(getStringFilesize(fileSize));
      console.log(`${fileNameLog} ${unchangedLog} ${sizeLog}`);
    } else {
      const unchangedLog = chalk.bgGrey("unchanged");
      const fileSize = Number(item.localeFileBefore?.bytes);
      const sizeLog = chalk.white(getStringFilesize(fileSize));
      console.log(`${fileNameLog} ${unchangedLog} ${sizeLog}`);
    }
  });

  console.log("");
}

async function emitFile(
  filePath: string,
  content: Buffer,
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

async function emitFiles(compiledLocales: CompiledLocales, outputPath: string) {
  const savings = Object.keys(compiledLocales).map((key) => {
    const filePath = path.resolve(outputPath, key + ".json");
    const content = Buffer.from(JSON.stringify(compiledLocales[key]));
    return emitFile(filePath, content);
  });

  return Promise.all(savings);
}

function getStats(before: Snapshot, after: LocaleFiles, withDeleted: boolean) {
  const stats: Stats[] = [];
  const copyMap = new Map(before);

  after.forEach((file) => {
    const snapshot = copyMap.get(file.filePath);
    const isNew = !snapshot;
    const isChanged =
      !isNew && snapshot && !snapshot.content.equals(file.content);

    copyMap.delete(file.filePath);

    stats.push({
      filePath: file.filePath,
      isNew,
      isChanged,
      isDeleted: false,
      localeFileNew: file,
      localeFileBefore: snapshot ? snapshot : null,
    });
  });

  if (withDeleted) {
    [...copyMap.entries()].forEach(([filePath, file]) => {
      stats.push({
        filePath: file.filePath,
        isNew: false,
        isChanged: false,
        isDeleted: true,
        localeFileNew: null,
        localeFileBefore: file,
      });
    });
  }

  return stats;
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

async function getSnapshot(path: string, matcher: Matcher): Promise<Snapshot> {
  const map = new Map<string, LocaleFile>();

  const exist = await isAvailableDirectory(path);

  if (!exist) {
    return map;
  }

  const files = await scan({
    path,
    matcher,
  });

  files.forEach((file) => {
    map.set(file.filePath, file);
  });

  return map;
}

/**
 * Writes compiled locales to the file system
 * @param options Options
 * @param options.compiledLocales Compiled locales
 * @param options.outputPath Output path
 * @param options.clear Clear output path before emit
 *
 * @example
 * const compiledLocales = await compile(...);
 * await emit({
 *     compiledLocales,
 *     outputPath: "./locales",
 *     clear: true,
 * })
 *
 * @returns Array of changed files
 */
export async function emit(options: EmitterOptions) {
  isRecord.assert(options, "options");

  isString.assert(options.outputPath, "outputPath");

  isCompiledLocales.assert(options.compiledLocales, "compiledLocales");

  if (!isUndefined(options.clear)) {
    isBoolean.assert(options.clear, "clear");
  }

  const clear = isBoolean(options.clear) ? options.clear : false;

  const snapshot = await getSnapshot(options.outputPath, /.\.json/);

  await makeOutputDirectory(options.outputPath, clear);

  const emitted = await emitFiles(options.compiledLocales, options.outputPath);

  const stats = getStats(snapshot, emitted, clear);

  log(options.outputPath, stats);

  return stats;
}
