import { excludeTypes, NOT_RECORD_TYPES, NOT_STRING_TYPES } from "./utils";
import { run, RunnerOptions } from "../src/runner";
import { vol } from "memfs";
import {
  MatcherTypeDescription,
  ParserFunctionTypeDescription,
} from "../src/types";

jest.mock("fs/promises");

describe("Runner", () => {
  afterEach(() => {
    vol.reset();
  });

  describe("run()", () => {
    let validRunnerOptions: RunnerOptions;

    beforeEach(() => {
      validRunnerOptions = {
        outputPath: "/replace/in/test",
      };
    });

    test("Should throw error if options is not an object", async () => {
      for (const value of NOT_RECORD_TYPES) {
        const act = () => run(value);

        await expect(act).rejects.toThrow("params should be an object");
      }
    });

    test('Should throw an error if "outputPath" is not a string', async () => {
      for (const value of NOT_STRING_TYPES) {
        const params: RunnerOptions = {
          ...validRunnerOptions,
          outputPath: value,
        };

        const act = () => run(params);

        const result = await expect(act);

        await result.rejects.toThrow("outputPath: should be a string");
      }
    });

    test('Should throw an error if "merge" is not a boolean and undefined', async () => {
      for (const value of excludeTypes(["undefined", "boolean"])) {
        const params: RunnerOptions = { ...validRunnerOptions, merge: value };

        const act = () => run(params);

        const result = await expect(act);

        await result.rejects.toThrow("merge: should be a boolean");
      }
    });

    test('Should throw an error if "recursive" is not a boolean and undefined', async () => {
      for (const value of excludeTypes(["undefined", "boolean"])) {
        const params: RunnerOptions = {
          ...validRunnerOptions,
          recursive: value,
        };

        const act = () => run(params);

        const result = await expect(act);

        await result.rejects.toThrow("recursive: should be a boolean");
      }
    });

    test('Should throw an error if "matcher" has an invalid type', async () => {
      for (const value of excludeTypes(["function", "undefined"])) {
        const params: RunnerOptions = { ...validRunnerOptions, matcher: value };

        const act = () => run(params);

        const result = await expect(act);

        await result.rejects.toThrow(`matcher: ${MatcherTypeDescription}`);
      }
    });

    test('Should throw an error if "inputPath" is not a string and undefined', async () => {
      for (const value of excludeTypes(["string", "undefined"])) {
        const params: RunnerOptions = {
          ...validRunnerOptions,
          inputPath: value,
        };

        const act = () => run(params);

        const result = await expect(act);

        await result.rejects.toThrow("inputPath: should be a string");
      }
    });

    test('Should throw an error if "defaultNamespace" is not a string and undefined', async () => {
      for (const value of excludeTypes(["string", "undefined"])) {
        const params: RunnerOptions = {
          ...validRunnerOptions,
          defaultNamespace: value,
        };

        const act = () => run(params);

        const result = await expect(act);

        await result.rejects.toThrow("defaultNamespace: should be a string");
      }
    });

    test('Should throw an error if "parser" has an invalid type', async () => {
      for (const value of excludeTypes(["function", "undefined"])) {
        const params: RunnerOptions = {
          ...validRunnerOptions,
          parser: value,
        };

        const act = () => run(params);

        const result = await expect(act);

        await result.rejects.toThrow(
          `parser: ${ParserFunctionTypeDescription}`
        );
      }
    });

    test('Should throw an error if "inputPath" does not exist or it is not a directory', async () => {
      vol.fromNestedJSON(
        {
          directory: {
            file: "content",
          },
          file: "content",
        },
        "/src"
      );

      const params: RunnerOptions = {
        ...validRunnerOptions,
        inputPath: "/file",
      };

      const act = () => run(params);

      const result = await expect(act);

      await result.rejects.toThrow(
        `inputPath "/file" does not exist or it is not a directory`
      );
    });

    test("Should return an empty array is no locales files are found", async () => {
      const options: RunnerOptions[] = [
        {
          ...validRunnerOptions,
          inputPath: "/src/locales",
          outputPath: "/src/dist",
          clear: true,
        },
        {
          ...validRunnerOptions,
          inputPath: "/src/locales",
          outputPath: "/src/dist",
          clear: false,
        },
        {
          ...validRunnerOptions,
          inputPath: "/src/locales",
          outputPath: "/src/dist",
          clear: true,
          matcher: (filename: string) =>
            filename.endsWith("some.specific.extension"),
        },
        {
          ...validRunnerOptions,
          inputPath: "/src/locales",
          outputPath: "/src/dist",
          clear: false,
          matcher: (filename: string) =>
            filename.endsWith("some.specific.extension"),
        },
      ];

      for (const option of options) {
        vol.fromNestedJSON(
          {
            locales: {
              some_other_file: "some_other_content",
            },
            dist: {
              some_file: "some_content",
            },
            file: "content",
          },
          "/src"
        );

        const result = await run(option);

        await expect(result).toEqual([]);

        expect(vol.toJSON()).toEqual({
          "/src/locales/some_other_file": "some_other_content",
          "/src/dist/some_file": "some_content",
          "/src/file": "content",
        });
      }
    });

    test("Should scan, compile and write locales files", async () => {
      const localeFile1 = {
        namespace: "module_1",
        translations: {
          key_1: "value_1",
          key_2: "value_2",
        },
      };

      const localeFile2 = {
        namespace: "module_1",
        translations: {
          key_1: "value_3",
          key_2: "value_4",
        },
      };

      const localeFile3 = {
        namespace: "module_1",
        translations: {
          key_3: "value_5",
          key_4: "value_6",
        },
      };

      const localeFile4 = {
        namespace: "module_2",
        translations: {
          key_3: "value_7",
        },
      };

      const localeFile5 = {
        translations: {
          key_4: "value_8",
        },
      };

      vol.fromNestedJSON(
        {
          dont_compile_these_files: {
            "uk.locale.json": JSON.stringify({
              namespace: "other_domain",
              translations: {
                key: "value",
              },
            }),
          },
          some_other_directory: {
            "image.png": "image_content",
          },
          src: {
            module1: {
              "en.locale.json": JSON.stringify(localeFile1),
              "uk.locale.json": JSON.stringify(localeFile2),
            },
            some_directory: {
              "en.locale.json": JSON.stringify(localeFile3),
            },

            module2: {
              "uk.locale.json": JSON.stringify(localeFile4),
            },

            module3: {
              "uk.locale.json": JSON.stringify(localeFile5),
            },

            module4: {
              "uk.locale.json": "",
            },
          },
          dist: {
            "uk.locale.json": JSON.stringify({
              module1: {
                old: "data",
              },
            }),
            some_other_file_but_should_be_delete: "some_other_content",
          },
        },
        "/src"
      );

      const options: RunnerOptions = {
        inputPath: "/src/src",
        outputPath: "/src/dist",
        defaultNamespace: "some_default_namespace",
        merge: true,
        clear: true,
      };

      await run(options);

      expect(vol.toJSON()).toEqual({
        "/src/dont_compile_these_files/uk.locale.json":
          '{"namespace":"other_domain","translations":{"key":"value"}}',
        "/src/some_other_directory/image.png": "image_content",
        "/src/src/module1/en.locale.json":
          '{"namespace":"module_1","translations":{"key_1":"value_1","key_2":"value_2"}}',
        "/src/src/module1/uk.locale.json":
          '{"namespace":"module_1","translations":{"key_1":"value_3","key_2":"value_4"}}',
        "/src/src/some_directory/en.locale.json":
          '{"namespace":"module_1","translations":{"key_3":"value_5","key_4":"value_6"}}',
        "/src/src/module2/uk.locale.json":
          '{"namespace":"module_2","translations":{"key_3":"value_7"}}',
        "/src/src/module3/uk.locale.json":
          '{"translations":{"key_4":"value_8"}}',
        "/src/src/module4/uk.locale.json": "",
        "/src/dist/en.json":
          '{"module_1":{"key_1":"value_1","key_2":"value_2","key_3":"value_5","key_4":"value_6"}}',
        "/src/dist/uk.json":
          '{"module_1":{"key_1":"value_3","key_2":"value_4"},"module_2":{"key_3":"value_7"},"some_default_namespace":{"key_4":"value_8"}}',
      });
    });
  });
});
