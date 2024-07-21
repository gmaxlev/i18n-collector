import { vol } from "memfs";
import { emit } from "../src/emitter";
import { NOT_RECORD_TYPES, NOT_STRING_TYPES, excludeTypes } from "./utils";
import type { EmitterOptions } from "../src/emitter";

jest.mock("fs/promises");

describe("emitter.ts", () => {
  afterEach(() => {
    vol.reset();
  });

  describe("emit()", () => {
    let correctOptions: EmitterOptions;

    beforeEach(() => {
      correctOptions = {
        compiledLocales: {
          uk: {
            namespace: {
              key: "value",
            },
          },
        },
        outputPath: "/replace/in/each/test",
      };
    });

    test("Should throw an error if options is not an object", async () => {
      for (const value of NOT_RECORD_TYPES) {
        const act = () => emit(value);

        const result = await expect(act);

        await result.rejects.toThrow("options: must be a record");
      }
    });

    test('Should throw an error if "compiledLocales" has an invalid type', async () => {
      const options = { ...correctOptions, compiledLocales: "invalid" };

      // @ts-expect-error
      const act = () => emit(options);

      const result = await expect(act);

      await result.rejects.toThrow(
        `compiledLocales: must be Record<string, Record<string, unknown>>`,
      );
    });

    test('Should throw an error if "outputPath" is not a string', async () => {
      for (const value of NOT_STRING_TYPES) {
        const options = { ...correctOptions, outputPath: value };

        const act = () => emit(options);

        const result = await expect(act);

        await result.rejects.toThrow("outputPath: must be a string");
      }
    });

    test('Should throw an error if "clear" is not a boolean and undefined', async () => {
      for (const value of excludeTypes(["undefined", "boolean"])) {
        const options = { ...correctOptions, clear: value };

        const act = () => emit(options);

        const result = await expect(act);

        await result.rejects.toThrow("clear: must be boolean");
      }
    });

    test('Should throw an error if "outputPath" is not a directory', async () => {
      vol.fromNestedJSON(
        {
          directory: "file content",
          real_directory: {
            "file3.local.json": "1",
          },
        },
        "/src",
      );

      const options = { ...correctOptions, outputPath: "/src/directory" };

      const act = () => emit(options);

      const result = await expect(act);

      await result.rejects.toThrow(
        'Output path "/src/directory" is not a directory',
      );
    });

    test('Should create directory and emit files if "outputPath" is not exist and "clear" has true or false', async () => {
      const cases = [
        {
          clear: false,
        },
        {
          clear: true,
        },
      ];

      expect.assertions(7 * cases.length);

      for (const item of cases) {
        vol.reset();

        vol.fromNestedJSON(
          {
            file: "file content",
            directory: {
              "program.ts": "...",
            },
          },
          "/src",
        );

        const options = {
          ...correctOptions,
          outputPath: "/src/locales",
          clear: item.clear,
          compiledLocales: {
            uk: {
              module1: {
                key_1: "value_1",
              },
            },
            en: {
              module1: {
                key_1: "value_2",
              },
            },
          },
        };

        const result = await emit(options);

        expect(result).toHaveLength(2);

        expect(result).toMatchObject([
          {
            filePath: "/src/locales/uk.json",
            localeFileBefore: null,
            isChanged: false,
            isDeleted: false,
            isNew: true,
          },
          {
            filePath: "/src/locales/en.json",
            localeFileBefore: null,
            isChanged: false,
            isDeleted: false,
            isNew: true,
          },
        ]);

        const resultElement1 = result[0];
        const resultElement2 = result[1];

        if (resultElement1) {
          expect(resultElement1.localeFileNew?.content).toBeInstanceOf(Buffer);

          const bufferMatchResult =
            resultElement1.localeFileNew?.content.equals(
              Buffer.from(JSON.stringify(options.compiledLocales.uk)),
            );

          expect(bufferMatchResult).toBe(true);
        }

        if (resultElement2) {
          expect(resultElement2.localeFileNew?.content).toBeInstanceOf(Buffer);

          const bufferMatchResult =
            resultElement2.localeFileNew?.content.equals(
              Buffer.from(JSON.stringify(options.compiledLocales.en)),
            );

          expect(bufferMatchResult).toBe(true);
        }

        expect(vol.toJSON()).toEqual({
          "/src/file": "file content",
          "/src/directory/program.ts": "...",
          "/src/locales/uk.json": JSON.stringify({
            module1: { key_1: "value_1" },
          }),
          "/src/locales/en.json": JSON.stringify({
            module1: { key_1: "value_2" },
          }),
        });
      }
    });

    test('Should clear a directory if "clear" is true', async () => {
      const fsSnapshot = {
        file: "file content",
        directory: {
          "program.ts": "...",
        },
        locales: {
          "uk.json": JSON.stringify({
            module1: { key_1: "old_value_1" },
          }),
          "en.json": JSON.stringify({
            module1: { key_1: "old_value_2" },
          }),
          "fr.json": JSON.stringify({
            module1: { key_1: "should_be_deleted" },
          }),
        },
      };

      vol.fromNestedJSON(fsSnapshot, "/src");

      const options = {
        ...correctOptions,
        outputPath: "/src/locales",
        clear: true,
        compiledLocales: {
          uk: {
            module1: {
              key_1: "value_1",
            },
          },
          en: {
            module1: {
              key_1: "value_2",
            },
          },
        },
      };

      const result = await emit(options);

      expect.assertions(13);

      expect(result).toHaveLength(3);

      expect(result).toMatchObject([
        {
          filePath: "/src/locales/uk.json",
          isChanged: true,
          isDeleted: false,
          isNew: false,
        },
        {
          filePath: "/src/locales/en.json",
          isChanged: true,
          isDeleted: false,
          isNew: false,
        },
        {
          filePath: "/src/locales/fr.json",
          localeFileNew: null,
          isChanged: false,
          isDeleted: true,
          isNew: false,
        },
      ]);

      const resultElement1 = result[0];
      const resultElement2 = result[1];
      const resultElement3 = result[2];

      if (resultElement1) {
        expect(resultElement1.localeFileNew?.content).toBeInstanceOf(Buffer);
        expect(resultElement1.localeFileBefore?.content).toBeInstanceOf(Buffer);

        const bufferMatchNewResult =
          resultElement1.localeFileNew?.content.equals(
            Buffer.from(JSON.stringify(options.compiledLocales.uk)),
          );

        const bufferMatchOldResult =
          resultElement1.localeFileBefore?.content.equals(
            Buffer.from(fsSnapshot.locales["uk.json"]),
          );

        expect(bufferMatchNewResult).toBe(true);
        expect(bufferMatchOldResult).toBe(true);
      }

      if (resultElement2) {
        expect(resultElement2.localeFileNew?.content).toBeInstanceOf(Buffer);
        expect(resultElement2.localeFileBefore?.content).toBeInstanceOf(Buffer);

        const bufferMatchNewResult =
          resultElement2.localeFileNew?.content.equals(
            Buffer.from(JSON.stringify(options.compiledLocales.en)),
          );

        const bufferMatchOldResult =
          resultElement2.localeFileBefore?.content.equals(
            Buffer.from(fsSnapshot.locales["en.json"]),
          );

        expect(bufferMatchNewResult).toBe(true);
        expect(bufferMatchOldResult).toBe(true);
      }

      if (resultElement3) {
        expect(resultElement3.localeFileBefore?.content).toBeInstanceOf(Buffer);

        const bufferMatchOldResult =
          resultElement3.localeFileBefore?.content.equals(
            Buffer.from(fsSnapshot.locales["fr.json"]),
          );

        expect(bufferMatchOldResult).toBe(true);
      }

      expect(vol.toJSON()).toEqual({
        "/src/file": "file content",
        "/src/directory/program.ts": "...",
        "/src/locales/uk.json": JSON.stringify({
          module1: { key_1: "value_1" },
        }),
        "/src/locales/en.json": JSON.stringify({
          module1: { key_1: "value_2" },
        }),
      });
    });

    test('Should not clear a directory if "clear" is false', async () => {
      const fsSnapshot = {
        file: "file content",
        directory: {
          "program.ts": "...",
        },
        locales: {
          "uk.json": JSON.stringify({
            module1: { key_1: "old_value_1" },
          }),
          "en.json": JSON.stringify({
            module1: { key_1: "old_value_2" },
          }),
          "fr.json": JSON.stringify({
            module1: { key_1: "should_not_be_deleted" },
          }),
        },
      };

      vol.fromNestedJSON(fsSnapshot, "/src");

      const options = {
        ...correctOptions,
        outputPath: "/src/locales",
        clear: false,
        compiledLocales: {
          uk: {
            module1: {
              key_1: "value_1",
            },
          },
          en: {
            module1: {
              key_1: "value_2",
            },
          },
        },
      };

      const result = await emit(options);

      expect.assertions(11);

      expect(result).toHaveLength(2);

      expect(result).toMatchObject([
        {
          filePath: "/src/locales/uk.json",
          isChanged: true,
          isDeleted: false,
          isNew: false,
        },
        {
          filePath: "/src/locales/en.json",
          isChanged: true,
          isDeleted: false,
          isNew: false,
        },
      ]);

      const resultElement1 = result[0];
      const resultElement2 = result[1];

      if (resultElement1) {
        expect(resultElement1.localeFileNew?.content).toBeInstanceOf(Buffer);
        expect(resultElement1.localeFileBefore?.content).toBeInstanceOf(Buffer);

        const bufferMatchNewResult =
          resultElement1.localeFileNew?.content.equals(
            Buffer.from(JSON.stringify(options.compiledLocales.uk)),
          );

        const bufferMatchOldResult =
          resultElement1.localeFileBefore?.content.equals(
            Buffer.from(fsSnapshot.locales["uk.json"]),
          );

        expect(bufferMatchNewResult).toBe(true);
        expect(bufferMatchOldResult).toBe(true);
      }

      if (resultElement2) {
        expect(resultElement2.localeFileNew?.content).toBeInstanceOf(Buffer);
        expect(resultElement2.localeFileBefore?.content).toBeInstanceOf(Buffer);

        const bufferMatchNewResult =
          resultElement2.localeFileNew?.content.equals(
            Buffer.from(JSON.stringify(options.compiledLocales.en)),
          );

        const bufferMatchOldResult =
          resultElement2.localeFileBefore?.content.equals(
            Buffer.from(fsSnapshot.locales["en.json"]),
          );

        expect(bufferMatchNewResult).toBe(true);
        expect(bufferMatchOldResult).toBe(true);
      }

      expect(vol.toJSON()).toEqual({
        "/src/file": "file content",
        "/src/directory/program.ts": "...",
        "/src/locales/uk.json": JSON.stringify({
          module1: { key_1: "value_1" },
        }),
        "/src/locales/en.json": JSON.stringify({
          module1: { key_1: "value_2" },
        }),
        "/src/locales/fr.json": JSON.stringify({
          module1: { key_1: "should_not_be_deleted" },
        }),
      });
    });
  });
});
