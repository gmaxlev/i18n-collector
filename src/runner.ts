import { scan, useMatcher } from "./scaner";
import { compile, emit, logCompiledFiles } from "./compiler";
import fs from "fs";
import { defaultMatcher } from "./constants";
import chalk from "chalk";

export function watch(config: { entry: string; outputPath: string }) {
  let planned = false;
  let processing = false;
  let needToRun = false;

  async function runInWatchContext() {
    if (processing) {
      needToRun = true;
      return;
    }

    try {
      await run(config);
    } catch (e) {
      console.error("Error during localization collector execution", e);
    } finally {
      processing = false;
      if (needToRun) {
        needToRun = false;
        runInWatchContext();
      }
    }
  }

  fs.watch(config.entry, { recursive: true }, async (_event, filename) => {
    if (!useMatcher(defaultMatcher, filename) || planned) {
      return;
    }

    planned = true;

    console.log(chalk.blue("\n👀 Detected changes in localization files"));

    setTimeout(() => {
      planned = false;
      runInWatchContext();
    });
  });

  runInWatchContext();
}

export async function run(config: { entry: string; outputPath: string }) {
  const now = performance.now();

  console.log("💫 Starting localization collector");

  const files = await scan(config.entry);

  console.log("📝 Found", files.length, "files to process");

  const result = await compile({ files });
  const emitted = await emit({ result, outputPath: config.outputPath });

  logCompiledFiles(emitted);

  console.log("🏁 Finished in", performance.now() - now, "ms");
}
