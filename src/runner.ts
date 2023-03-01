import fs from "fs";
import path from "path";
import { scan } from "./scan";
import { compile } from "./compiler";
import { defaultMatcher } from "./constants";
import { emit } from "./emitter";
import { isAvailableDirectory, useMatcher } from "./utils";
import type { Matcher } from "./types";
import {
  isMatcher,
  MatcherTypeDescription,
  isBoolean,
  isEnoentError,
  isRecord,
  isString,
  isUndefined,
} from "./types";

export interface RunnerOptions {
  outputPath: string;
  inputPath?: string;
  merge?: boolean;
  matcher?: Matcher;
  watch?: boolean;
  recursive?: boolean;
  clear?: boolean;
}

function validateRunnerOptions(params: RunnerOptions) {
  if (!isRecord(params)) {
    throw new TypeError("params should be an object");
  }

  if (!isString(params.outputPath)) {
    throw new TypeError("params.outputPath should be a string");
  }

  if (!isUndefined(params.merge) && !isBoolean(params.merge)) {
    throw new TypeError("params.merge should be a boolean");
  }

  if (!isUndefined(params.matcher) && !isMatcher(params.matcher)) {
    throw new TypeError(`params.matcher: ${MatcherTypeDescription}`);
  }

  if (!isUndefined(params.watch) && !isBoolean(params.watch)) {
    throw new TypeError("params.watch should be a boolean");
  }

  if (!isUndefined(params.recursive) && !isBoolean(params.recursive)) {
    throw new TypeError("params.recursive should be a boolean");
  }

  if (!isUndefined(params.inputPath) && !isString(params.inputPath)) {
    throw new TypeError("params.inputPath should be a string");
  }
}

async function watch(params: {
  outputPath: string;
  inputPath: string;
  merge: boolean;
  recursive: boolean;
  matcher: Matcher;
  clear: boolean;
}) {
  let planned = false;
  let processing = false;
  const latestContents = new Map<string, Buffer>();

  async function runInWatchContext() {
    if (processing) {
      planned = true;
      return;
    }

    processing = true;

    try {
      await processLocales(params);
    } catch (e) {
      console.error("Error during localization collector execution", e);
    } finally {
      processing = false;
      if (planned) {
        planned = false;
        runInWatchContext();
      }
    }
  }

  fs.watch(
    params.inputPath,
    { recursive: params.recursive },
    async (_event, filename) => {
      if (planned || !(await useMatcher(params.matcher, filename))) {
        return;
      }

      // since event can be triggered for not only changed files
      // we need to save its content and compare it with the next one
      const filePath = path.join(params.inputPath, filename);
      let content: Buffer;

      try {
        content = fs.readFileSync(filePath);
      } catch (e) {
        latestContents.delete(filePath);
        if (!isEnoentError) {
          throw e;
        }
        return;
      }

      const exist = latestContents.get(filePath);
      if (exist && exist.equals(content)) {
        return;
      }
      latestContents.set(filePath, content);

      planned = true;

      console.log("\n👀 Detected changes in localization files");

      setTimeout(() => {
        planned = false;
        runInWatchContext();
      });
    }
  );

  await runInWatchContext();
}

async function processLocales(params: {
  outputPath: string;
  inputPath: string;
  merge: boolean;
  recursive: boolean;
  matcher: Matcher;
  clear: boolean;
}) {
  const now = performance.now();

  console.log("💫 Starting localization collector");

  const files = await scan({
    path: params.inputPath,
    matcher: params.matcher,
    recursive: params.recursive,
  });

  if (!files.length) {
    console.warn(`\n🛑 No files found in ${params.inputPath}`);
    console.info(
      `ℹ️ By default files should math the pattern ${defaultMatcher}`
    );
    console.info(
      `ℹ️ If you have special files naming, you can pass custom matcher using JS API.\n`
    );
    return;
  }

  console.log("📝 Found", files.length, "files to process");

  const compiledLocales = await compile({ files });

  await emit({
    compiledLocales,
    outputPath: params.outputPath,
    clear: params.clear,
  });

  console.log("🏁 Finished in", performance.now() - now, "ms");
}

export async function run(options: RunnerOptions) {
  validateRunnerOptions(options);

  const inputPath = options.inputPath || process.cwd();

  const inputPathExists = await isAvailableDirectory(inputPath);

  if (!inputPathExists) {
    console.log(
      `\n🛑 Provided input path ${inputPath} does not exist or it is not a directory`
    );
    console.info(`ℹ️  Check it and try again\n`);
    return;
  }

  const merge = isBoolean(options.merge) ? options.merge : false;
  const clear = isBoolean(options.clear) ? options.clear : false;
  const recursive = isBoolean(options.recursive) ? options.recursive : true;
  const matcher = options.matcher || defaultMatcher;

  if (options.watch) {
    watch({
      outputPath: options.outputPath,
      inputPath,
      merge,
      recursive,
      matcher,
      clear,
    });
  } else {
    await processLocales({
      outputPath: options.outputPath,
      inputPath,
      merge,
      recursive,
      matcher,
      clear,
    });
  }
}
