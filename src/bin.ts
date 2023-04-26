import { Command, InvalidArgumentError } from "commander";
import * as runner from "./runner";
import { isString } from "tsguarder";
import pkg from "../package.json";
import * as watch from "./watch";

const program = new Command();

let description = `CLI to ${pkg.name} package\n`;
description += `See docs at ${pkg.homepage}`;

program.name(pkg.name).description(description).version(pkg.version);

program
  .command("compile")
  .description("Find and compile locales files into output path")
  .argument("<output>", "output path")
  .option("-w, --watch [value]", "watch mode", parseBooleanInput, false)
  .option(
    "-r, --recursive [value]",
    "whether to scan the directory recursively",
    parseBooleanInput,
    true
  )
  .option("-c, --clear [value]", "clear output path", parseBooleanInput, false)
  .option(
    "-m, --merge [value]",
    "allow merging the same namespace from different files",
    parseBooleanInput,
    false
  )
  .option("-i, --input <value>", "input path")
  .action(async (output, options) => {
    // ⛔️ IMPORTANT
    // output and options have "any" type
    // This options must contain only required options and options with default values
    // to avoid type errors do not rely on typescript to check this
    const runnerOptions: runner.RunnerOptions = {
      outputPath: output,
      recursive: options.recursive,
      clear: options.clear,
      merge: options.merge,
    };

    if (isString(options.input)) {
      runnerOptions.inputPath = options.input;
    }

    if (options.watch) {
      await watch.watch(runnerOptions);
    } else {
      await runner.run(runnerOptions);
    }
  });

program.parse();

function parseBooleanInput(value: unknown) {
  if (value === "true") {
    return true;
  } else if (value === "false") {
    return false;
  } else if (value === "1") {
    return true;
  } else if (value === "0") {
    return false;
  } else {
    throw new InvalidArgumentError(`Use "true" or "false", "1" or "0"`);
  }
}
