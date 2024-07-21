import { excludeTypes, NOT_RECORD_TYPES, NOT_STRING_TYPES } from "./utils";
import { run, RunnerOptions } from "../src/runner";
import { vol } from "memfs";

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

        await expect(act).rejects.toThrow("options: must be a record");
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

        await result.rejects.toThrow("outputPath: must be a string");
      }
    });

    test('Should throw an error if "merge" is not a boolean and undefined', async () => {
      for (const value of excludeTypes(["undefined", "boolean"])) {
        const params: RunnerOptions = { ...validRunnerOptions, merge: value };

        const act = () => run(params);

        const result = await expect(act);

        await result.rejects.toThrow("merge: must be boolean");
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

        await result.rejects.toThrow("recursive: must be boolean");
      }
    });

    test('Should throw an error if "matcher" has an invalid type', async () => {
      for (const value of excludeTypes(["function", "undefined"])) {
        const params: RunnerOptions = { ...validRunnerOptions, matcher: value };

        const act = () => run(params);

        const result = await expect(act);

        await result.rejects.toThrow(
          `matcher: must be a RegExp or (fileName: string) => boolean`,
        );
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

        await result.rejects.toThrow("inputPath: must be a string");
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

        await result.rejects.toThrow(`parser: must be a function`);
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
        "/src",
      );

      const params: RunnerOptions = {
        ...validRunnerOptions,
        inputPath: "/file",
      };

      const act = () => run(params);

      const result = await expect(act);

      await result.rejects.toThrow(
        `inputPath "/file" does not exist or it is not a directory`,
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
          "/src",
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
      vol.fromNestedJSON(
        {
          dont_compile_these_files: {
            "other.locale.json": JSON.stringify({
              en: {
                key: "value",
              },
            }),
          },
          some_other_directory: {
            "image.png": "image_content",
          },
          src: {
            module1: {
              "model_1.locale.json": JSON.stringify({
                uk: {
                  key1: "value1",
                },
                en: {
                  key2: "value2",
                },
              }),
            },
            some_directory: {
              "some-component.locale.json": JSON.stringify({
                uk: {
                  key3: "value3",
                },
                en: {
                  key4: "value4",
                },
              }),
            },

            module2: {
              "some-module.locale.json": JSON.stringify({
                en: {
                  key5: "value5",
                },
              }),
            },

            module3: {
              "some-module-2.locale.json": JSON.stringify({
                gr: {
                  key6: "value7",
                },
              }),
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
        "/home",
      );

      const options: RunnerOptions = {
        inputPath: "/home/src",
        outputPath: "/home/dist",
        merge: true,
        clear: true,
      };

      await run(options);

      expect(vol.toJSON()).toEqual({
        "/home/dont_compile_these_files/other.locale.json":
          '{"en":{"key":"value"}}',
        "/home/some_other_directory/image.png": "image_content",
        "/home/src/module1/model_1.locale.json":
          '{"uk":{"key1":"value1"},"en":{"key2":"value2"}}',
        "/home/src/some_directory/some-component.locale.json":
          '{"uk":{"key3":"value3"},"en":{"key4":"value4"}}',
        "/home/src/module2/some-module.locale.json": '{"en":{"key5":"value5"}}',
        "/home/src/module3/some-module-2.locale.json":
          '{"gr":{"key6":"value7"}}',
        "/home/src/module4/uk.locale.json": "",
        "/home/dist/uk.json":
          '{"model_1":{"key1":"value1"},"some-component":{"key3":"value3"}}',
        "/home/dist/en.json":
          '{"model_1":{"key2":"value2"},"some-module":{"key5":"value5"},"some-component":{"key4":"value4"}}',
        "/home/dist/gr.json": '{"some-module-2":{"key6":"value7"}}',
      });
    });
  });
});
