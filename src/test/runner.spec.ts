import { excludeTypes, NOT_RECORD_TYPES, NOT_STRING_TYPES } from "./utils";
import { run, RunnerOptions } from "../runner";
import { vol } from "memfs";
import { MatcherTypeDescription } from "../types";

jest.mock("fs/promises");

describe("Runner", () => {
  afterEach(() => {
    vol.reset();
  });

  describe("run()", () => {
    let correctOptions: RunnerOptions;

    beforeEach(() => {
      correctOptions = {
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
        const params = { ...correctOptions, outputPath: value };

        const act = () => run(params);

        await expect(act).rejects.toThrow(
          "params.outputPath should be a string"
        );
      }
    });

    test('Should throw an error if "merge" is not a boolean and undefined', async () => {
      for (const value of excludeTypes(["boolean", "undefined"])) {
        const params = { ...correctOptions, merge: value };

        const act = () => run(params);

        await expect(act).rejects.toThrow("params.merge should be a boolean");
      }
    });

    test('Should throw an error if "matcher" has an invalid type', async () => {
      const params = { ...correctOptions, matcher: "null" };

      const act = () =>
        // @ts-expect-error
        run(params);

      await expect(act).rejects.toThrow(
        `params.matcher: ${MatcherTypeDescription}`
      );
    });

    test('Should throw an error if "recursive" is not a boolean and undefined', async () => {
      for (const value of excludeTypes(["boolean", "undefined"])) {
        const params = { ...correctOptions, recursive: value };

        const act = () => run(params);

        await expect(act).rejects.toThrow(
          "params.recursive should be a boolean"
        );
      }
    });

    test('Should throw an error if "inputPath" is not a string and undefined', async () => {
      for (const value of excludeTypes(["string", "undefined"])) {
        const params = { ...correctOptions, inputPath: value };

        const act = () => run(params);

        await expect(act).rejects.toThrow(
          "params.inputPath should be a string"
        );
      }
    });

    test("Should complete successfully", async () => {
      vol.fromNestedJSON(
        {
          "some_file.json": "content",
          other_directory: {
            "also.locale.json": JSON.stringify({
              namespace: "this is not compiled file",
              translations: {
                "some key": "some translation",
              },
            }),
          },
          locales: {
            "uk.locale.json": JSON.stringify({
              namespace: "module 1",
              translations: {
                "key 1": "translation 1",
              },
            }),
            "en.locale.json": JSON.stringify({
              namespace: "module 1",
              translations: {
                "key 1": "translation 2",
              },
            }),
            "fr.locale.json": JSON.stringify({
              namespace: "module 2",
              translations: {
                "key 2": "translation 3",
              },
            }),
          },
          public: {
            "old.file.json": "content",
          },
        },
        "/src"
      );

      await run({
        outputPath: "/src/public",
        inputPath: "/src/locales",
        clear: true,
      });

      expect(vol.toJSON()).toEqual({
        "/src/some_file.json": "content",
        "/src/other_directory/also.locale.json": JSON.stringify({
          namespace: "this is not compiled file",
          translations: { "some key": "some translation" },
        }),
        "/src/locales/uk.locale.json": JSON.stringify({
          namespace: "module 1",
          translations: { "key 1": "translation 1" },
        }),
        "/src/locales/en.locale.json": JSON.stringify({
          namespace: "module 1",
          translations: { "key 1": "translation 2" },
        }),
        "/src/locales/fr.locale.json": JSON.stringify({
          namespace: "module 2",
          translations: { "key 2": "translation 3" },
        }),
        "/src/public/en.json": JSON.stringify({
          "module 1": { "key 1": "translation 2" },
        }),
        "/src/public/fr.json": JSON.stringify({
          "module 2": { "key 2": "translation 3" },
        }),
        "/src/public/uk.json": JSON.stringify({
          "module 1": { "key 1": "translation 1" },
        }),
      });
    });
  });
});
