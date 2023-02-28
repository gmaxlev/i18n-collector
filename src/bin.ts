import { Command } from "commander";
import * as runner from "./runner";
import { isString } from "./types";
import pkg from "../package.json";

const program = new Command();

let description = `CLI to ${pkg.name} package\n`;
description += `See documentation at ${pkg.homepage}`;

program.name("i18n-collector").description(description).version(pkg.version);

program
  .command("run")
  .description("Bundler for locales files")
  .argument("<output>", "output directory")
  .option("-w, --watch [value]", "watch mode", getBool, false)
  .option("-r, --recursive [value]", "recursive mode", getBool, true)
  .option("-c, --clear [value]", "clear output directory", getBool, false)
  .option(
    "-m, --merge [value]",
    "merge the same namespaces from different files",
    getBool,
    false
  )
  .option("-i, --input <value>", "input directory")
  .option("-g, --regexp <value>", "regexp to match localization files")
  .action((output, options) => {
    let runnerOptions: runner.RunnerOptions = {
      outputPath: output,
      merge: options.merge,
      clear: options.clear,
      recursive: options.recursive,
      watch: options.watch,
    };

    if (isString(options.input)) {
      runnerOptions.inputPath = options.input;
    }

    if (isString(options.regexp)) {
      runnerOptions.matcher = new RegExp(options.regexp);
    }

    return runner.run(runnerOptions);
  });

program.parse();

function getBool(value: unknown) {
  if (value === "true") {
    return true;
  } else if (value === "false") {
    return false;
  } else if (value === "1") {
    return true;
  } else if (value === "0") {
    return false;
  } else {
    throw new Error(`Invalid boolean value: ${value}`);
  }
}
