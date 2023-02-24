import type { LoadedFile } from "./types";
import fsp from "fs/promises";
import { join } from "./collector";
import { parse } from "./parser";
import path from "path";
import type { Stats } from "fs";
import chalk from "chalk";
import { getStringSize } from "./utils";

class IsNotAFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DirectoryInsteadOfFileError";
  }
}

//todo improve
export async function emitFile(filePath: string, content: Buffer) {
  let current = {
    stats: null as Stats | null,
    content: null as Buffer | null,
  };

  try {
    await fsp.access(filePath); // todo check the second argument

    try {
      current.stats = await fsp.lstat(filePath);
    } catch (e) {
      console.error("Error while getting file stats during emitting", filePath);
      throw e;
    }

    if (!current.stats.isFile()) {
      throw new IsNotAFileError(
        "Attempt to rewrite a directory during emitting"
      ); // todo add clear information
    }

    let currentContent: Buffer;

    try {
      currentContent = await fsp.readFile(filePath);
    } catch (e) {
      console.error(
        "Error while reading current file content during emitting",
        filePath
      );
      throw e;
    }

    current.content = currentContent;
  } catch (e) {
    if (e instanceof IsNotAFileError) {
      throw e;
    }
  }

  const before = current.content
    ? {
        size: current.stats ? current.stats.size : null,
      }
    : null;

  await fsp.writeFile(filePath, content);

  const emittedStats = await fsp.stat(filePath);

  const after = {
    size: emittedStats.size,
  };

  const changed = current.content ? !current.content.equals(content) : false;

  return {
    filePath,
    before,
    after,
    changed,
  };
}

export async function emit(config: {
  result: Record<string, Record<string, any>>;
  outputPath: string;
}) {
  await fsp.mkdir(config.outputPath, { recursive: true });

  const savings = Object.keys(config.result).map((key) => {
    const filePath = path.resolve(config.outputPath, key + ".json");
    const content = Buffer.from(JSON.stringify(config.result[key]));

    return emitFile(filePath, content);
  });

  return Promise.all(savings);
}

export async function compile(config: { files: LoadedFile[] }) {
  const parsed = await Promise.all(
    config.files.map((file) =>
      parse({
        filePath: file.filePath,
        fileContent: file.content,
      })
    )
  );

  return join(parsed, "default");
}

export function logCompiledFiles(files: Awaited<ReturnType<typeof emit>>) {
  console.log("\n✅  Compiled files:");

  files.forEach((file, index) => {
    const relativePath = path.basename(file.filePath);

    const sizeAfterString = getStringSize(file.after.size);

    const fileNameLog = chalk.white.bold(`${index + 1}. ${relativePath}`);

    // Log for new file
    if (!file.before) {
      const newLog = chalk.bgGreenBright("new");
      const sizeLog = chalk.white(sizeAfterString);
      console.log(`${fileNameLog} ${newLog} ${sizeLog}`);
    }
    // log for unchanged file
    else if (!file.changed) {
      const unchangedLog = chalk.bgGrey("unchanged");
      const sizeLog = chalk.white(sizeAfterString);
      console.log(`${fileNameLog} ${unchangedLog} ${sizeLog}`);
    }
    // log for changed file
    else {
      const changedLog = chalk.bgYellow("changed");
      const sizeBeforeString = file.before.size
        ? getStringSize(file.before.size)
        : "?";
      const sizeBeforeLog = chalk.white(sizeBeforeString);

      const dividerLog = chalk.white("->");
      const sizeAfterLog = chalk.white(sizeAfterString);
      console.log(
        `${fileNameLog} ${changedLog} ${sizeBeforeLog} ${dividerLog} ${sizeAfterLog}`
      );
    }
  });
  console.log("");
}
