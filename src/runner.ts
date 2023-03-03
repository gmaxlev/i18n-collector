import { scan } from "./scan";
import { compile, CompilerOptions } from "./compiler";
import { defaultMatcher } from "./constants";
import { emit } from "./emitter";
import { isAvailableDirectory } from "./utils";
import type { Matcher, ParserFunction } from "./types";
import {
  isMatcher,
  MatcherTypeDescription,
  isBoolean,
  isRecord,
  isString,
  isUndefined,
  isParserFunction,
  ParserFunctionTypeDescription,
} from "./types";
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
  defaultNamespace?: string;
}

export interface ValidRunnerOptions {
  outputPath: string;
  inputPath: string;
  merge: boolean;
  matcher: Matcher;
  recursive: boolean;
  clear: boolean;
  parser: ParserFunction;
  defaultNamespace?: string;
}

export function validateRunnerOptions(
  options: RunnerOptions
): ValidRunnerOptions {
  if (!isRecord(options)) {
    throw new TypeError("params should be an object");
  }

  if (!isString(options.outputPath)) {
    throw new TypeError("outputPath: should be a string");
  }

  if (!isUndefined(options.merge) && !isBoolean(options.merge)) {
    throw new TypeError("merge: should be a boolean");
  }

  if (!isUndefined(options.matcher) && !isMatcher(options.matcher)) {
    throw new TypeError(`matcher: ${MatcherTypeDescription}`);
  }

  if (!isUndefined(options.recursive) && !isBoolean(options.recursive)) {
    throw new TypeError("recursive: should be a boolean");
  }

  if (!isUndefined(options.inputPath) && !isString(options.inputPath)) {
    throw new TypeError("inputPath: should be a string");
  }

  if (!isUndefined(options.parser) && !isParserFunction(options.parser)) {
    throw new TypeError(`parser: ${ParserFunctionTypeDescription}`);
  }

  if (
    !isUndefined(options.defaultNamespace) &&
    !isString(options.defaultNamespace)
  ) {
    throw new TypeError("defaultNamespace: should be a string");
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

  if (isString(options.defaultNamespace)) {
    validOptions.defaultNamespace = options.defaultNamespace;
  }

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
 * @param options.defaultNamespace The default namespace to use if not specified in the file
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
 *     defaultNamespace: 'common'
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

  if (options.defaultNamespace) {
    compilerOptions = {
      ...compilerOptions,
      defaultNamespace: options.defaultNamespace,
    };
  }

  const compiledLocales = await compile(compilerOptions);

  const stats = await emit({
    outputPath: options.outputPath,
    clear: validOptions.clear,
    compiledLocales,
  });

  console.log("🏁 Finished in", performance.now() - now, "ms");

  return stats;
}
