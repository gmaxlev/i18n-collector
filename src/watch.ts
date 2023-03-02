import { run, RunnerOptions, validateRunnerOptions } from "./runner";
import fs from "fs";
import { useMatcher } from "./utils";
import path from "path";
import { isEnoentError } from "./types";

export async function watch(options: RunnerOptions) {
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
      await run(validOptions);
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
