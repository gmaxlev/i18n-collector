import { scan } from "./scan";
import { compile, CompilerOptions } from "./compiler";
import { defaultMatcher } from "./constants";
import { emit } from "./emitter";
import { isAvailableDirectory } from "./utils";
import type { Matcher, ParserFunction } from "./types";
import { isMatcher, isParserFunction } from "./types";
import { isBoolean, isRecord, isString, isUndefined } from "tsguarder";
import { parse } from "./parser";
import { performance } from "perf_hooks";
import chalk from "chalk";

export interface RunnerOptions {
  outputPath: string;
  inputPath?: string;
  merge?: boolean;
  matcher?: Matcher;
  recursive?: boolean;
  clear?: boolean;
  parser?: ParserFunction;
}

export interface ValidRunnerOptions {
  outputPath: string;
  inputPath: string;
  merge: boolean;
  matcher: Matcher;
  recursive: boolean;
  clear: boolean;
  parser: ParserFunction;
}

export function validateRunnerOptions(
  options: RunnerOptions
): ValidRunnerOptions {
  isRecord.assert(options, "options");

  isString.assert(options.outputPath, "outputPath");

  if (!isUndefined(options.merge)) {
    isBoolean.assert(options.merge, "merge");
  }

  if (!isUndefined(options.matcher)) {
    isMatcher.assert(options.matcher, "matcher");
  }

  if (!isUndefined(options.recursive)) {
    isBoolean.assert(options.recursive, "recursive");
  }

  if (!isUndefined(options.inputPath)) {
    isString.assert(options.inputPath, "inputPath");
  }

  if (!isUndefined(options.parser)) {
    isParserFunction.assert(options.parser, "parser");
  }

  const inputPath = options.inputPath || process.cwd();
  const merge = isBoolean(options.merge) ? options.merge : false;
  const clear = isBoolean(options.clear) ? options.clear : false;
  const recursive = isBoolean(options.recursive) ? options.recursive : true;
  const matcher = isMatcher(options.matcher) ? options.matcher : defaultMatcher;
  const parser = isParserFunction(options.parser) ? options.parser : parse;

  const validOptions: ValidRunnerOptions = {
    outputPath: options.outputPath,
    inputPath,
    merge,
    matcher,
    recursive,
    clear,
    parser,
  };

  return validOptions;
}

/**
 * Default runner
 * If you need to specific pipeline, you can use our JS API
 *
 * @param options Options
 * @param options.outputPath The path to the directory where to write the compiled files
 * @param options.inputPath The path to the directory where to scan for files to compile
 * @param options.merge If true, the locales with the same namespace from different files will be merged. Default: false
 * @param options.matcher The matcher to use to find locale files
 * @param options.recursive If true, the scan will be recursive. Default: true
 * @param options.clear If true, the output directory will be cleared before writing the compiled files. Default: false
 * @param options.parser The parser to use to parse the locale files
 *
 * @example
 * await run({
 *     outputPath: './locales',
 *     inputPath: './src',
 *     merge: true,
 *     matcher: /.+\.locale\.json$/,
 *     recursive: true,
 *     clear: true,
 *     parser: customParserFunction,
 * })
 *
 * @returns The stats of the emitted files
 */
export async function run(options: RunnerOptions) {
  validateRunnerOptions(options);

  const validOptions = validateRunnerOptions(options);

  const inputPathExists = await isAvailableDirectory(validOptions.inputPath);

  if (!inputPathExists) {
    throw new Error(
      `inputPath "${validOptions.inputPath}" does not exist or it is not a directory`
    );
  }

  const now = performance.now();

  console.log(`💫 Starting i18n-collector`);

  const files = await scan({
    path: validOptions.inputPath,
    matcher: validOptions.matcher,
    recursive: validOptions.recursive,
  });

  if (!files.length) {
    console.warn(`\n🛑 No files found in ${validOptions.inputPath}`);
    return [];
  }

  console.log(
    `📝 Found ${chalk.yellow(files.length)} files in ${chalk.blue.bold(
      validOptions.inputPath
    )} to process`
  );

  let compilerOptions: CompilerOptions = {
    merge: validOptions.merge,
    parser: validOptions.parser,
    files,
  };

  const compiledLocales = await compile(compilerOptions);

  const stats = await emit({
    outputPath: options.outputPath,
    clear: validOptions.clear,
    compiledLocales,
  });

  console.log("🏁 Finished in", performance.now() - now, "ms");

  return stats;
}
