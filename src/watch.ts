import { run, RunnerOptions, validateRunnerOptions } from "./runner";
import fs from "fs";
import { useMatcher } from "./utils";
import path from "path";
import { isEnoentError, MayAsync } from "./types";
import type { Stats } from "./emitter";

export interface WatcherOptions extends RunnerOptions {
  hooks?: {
    beforeRun?: () => unknown;
    afterRun?: (stats: Stats[]) => unknown;
  };
}

/**
 * The same as {@link run} but watch for changes in input directory
 *
 * @param options Options
 * @param options.outputPath The path to the directory where to write the compiled files
 * @param options.inputPath The path to the directory where to scan for files to compile
 * @param options.merge If true, the locales with the same namespace from different files will be merged. Default: false
 * @param options.matcher The matcher to use to find locale files
 * @param options.recursive If true, the scan will be recursive. Default: true
 * @param options.clear If true, the output directory will be cleared before writing the compiled files. Default: false
 * @param options.parser The parser to use to parse the locale files
 * @param options.hooks Allows you to hook into the watch process
 * @param options.hooks.beforeRun Called before the compilation process
 * @param options.hooks.afterRun Called after the compilation process
 */
export async function watch(options: WatcherOptions) {
  const validOptions = validateRunnerOptions(options);

  let planned = false;
  let processing = false;
  const cache = new Map<string, Buffer>();

  async function runInWatchContext() {
    if (processing) {
      planned = true;
      return;
    }

    processing = true;

    try {
      if (options.hooks?.beforeRun) {
        await options.hooks.beforeRun();
      }
      const stats = await run(validOptions);
      if (options.hooks?.afterRun) {
        await options.hooks.afterRun(stats);
      }
    } catch (e) {
      console.error("Error while processing locales", e);
    } finally {
      processing = false;
      if (planned) {
        planned = false;
        runInWatchContext();
      }
    }
  }

  fs.watch(
    validOptions.inputPath,
    { recursive: validOptions.recursive },
    async (_event, filename) => {
      if (planned || !(await useMatcher(validOptions.matcher, filename))) {
        return;
      }

      const filePath = path.join(validOptions.inputPath, filename);
      let content: Buffer;

      try {
        content = fs.readFileSync(filePath);
      } catch (e) {
        cache.delete(filePath);
        if (!isEnoentError(e)) {
          throw e;
        }
        return;
      }

      const exist = cache.get(filePath);

      if (exist && exist.equals(content)) {
        return;
      }

      cache.set(filePath, content);

      planned = true;

      console.log("\n👀 Detected changes in locales");

      setTimeout(() => {
        planned = false;
        runInWatchContext();
      });
    }
  );

  await runInWatchContext();
}
