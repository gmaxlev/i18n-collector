import { Command, InvalidArgumentError } from "commander";
import * as runner from "./runner";
import { isString } from "./types";
import pkg from "../package.json";
import * as watch from "./watch";

const program = new Command();

let description = `CLI to ${pkg.name} package\n`;
description += `See docs at ${pkg.homepage}`;

program.name(pkg.name).description(description).version(pkg.version);

program
  .command("run")
  .description("Find and compile locales files into output path")
  .argument("<output>", "output path")
  .option("-w, --watch [value]", "watch mode", parseBooleanInput, false)
  .option(
    "-r, --recursive [value]",
    "scan all subdirectories",
    parseBooleanInput,
    true
  )
  .option("-c, --clear [value]", "clear output path", parseBooleanInput, false)
  .option(
    "-m, --merge [value]",
    "allow merging the same namespaces from different files",
    parseBooleanInput,
    false
  )
  .option("-n, --defaultNamespace <value>", "default namespace")
  .option("-i, --input <value>", "input path")
  .option("-g, --matcher <value>", "RegExp to match locales files")
  .action(async (output, options) => {
    // ! IMPORTANT
    // That options must contain only required options and options with default values
    const runnerOptions: runner.RunnerOptions = {
      outputPath: output,
      recursive: options.recursive,
      clear: options.clear,
      merge: options.merge,
    };

    if (isString(options.defaultNamespace)) {
      runnerOptions.defaultNamespace = options.defaultNamespace;
    }

    if (isString(options.regexp)) {
      runnerOptions.matcher = new RegExp(options.regexp);
    }

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
