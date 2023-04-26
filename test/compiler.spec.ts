import {
  excludeTypes,
  NOT_ARRAY_TYPES,
  NOT_RECORD_TYPES,
  typesInArray,
} from "./utils";
import { compile, CompilerOptions } from "../src/compiler";

describe("compiler.ts", () => {
  describe("compile()", () => {
    const correctParams: CompilerOptions = {
      files: [
        {
          filePath: "/replace/in/test",
          content: Buffer.from(
            '{"namespace": "module", "translations":{"key":"value"}}'
          ),
          bytes: 15,
        },
      ],
    };

    test("Should throw an error if params is not an object", async () => {
      for (const params of NOT_RECORD_TYPES) {
        const act = () => compile(params);

        const result = await expect(act);

        await result.rejects.toThrow("options: must be a record");
      }
    });

    test('Should throw an error if "merge" is not a boolean and undefined', async () => {
      for (const value of excludeTypes(["boolean", "undefined"])) {
        const params = { ...correctParams, merge: value };

        const act = () => compile(params);

        const result = await expect(act);

        await result.rejects.toThrow("merge: must be boolean");
      }
    });

    test('Should throw an error if "files" has a wrong type', async () => {
      const invalidTypes = [
        ...NOT_ARRAY_TYPES,
        ...typesInArray(NOT_ARRAY_TYPES),
      ];

      for (const value of invalidTypes) {
        const params = { ...correctParams, files: value };

        const act = () => compile(params);

        const result = await expect(act);

        await result.rejects.toThrow(
          `files: must be Array<{ filePath: string, content: Buffer, bytes: number }>`
        );
      }
    });

    test('Should throw an error if "parser" is not a function', async () => {
      for (const value of excludeTypes(["undefined", "function"])) {
        const params = { ...correctParams, parser: value };

        const act = () => compile(params);

        const result = await expect(act);

        await result.rejects.toThrow(`parser: must be a function`);
      }
    });

    test("Should throw an error if a sync parser function returns a wrong type", async () => {
      const params: CompilerOptions = {
        ...correctParams,
        // @ts-expect-error
        parser: () => {
          return "null";
        },
      };

      const act = () => compile(params);

      const result = await expect(act);

      await result.rejects.toThrow(
        `return value of a custom parser: must be { translations: object, namespace: string, id: unknown }`
      );
    });

    test("Should throw an error if an async parser function returns a wrong type", async () => {
      const params: CompilerOptions = {
        ...correctParams,
        // @ts-expect-error
        parser: async () => {
          return Promise.resolve("null");
        },
      };

      const act = () => compile(params);

      const result = await expect(act);

      await result.rejects.toThrow(
        `return value of a custom parser: must be { translations: object, namespace: string, id: unknown }`
      );
    });

    test("Should use a provided parser function", async () => {
      const parser = () => {
        return {
          id: "_module.not.json",
          namespace: "_module",
          translations: {
            uk: {
              key: "_value_",
            },
            en: {
              key: "_value_2",
            },
          },
        };
      };

      const content = Buffer.from("This content needs a special parser");

      const params = {
        ...correctParams,
        files: [
          {
            filePath: "_module.not.json",
            content,
            bytes: content.length,
          },
        ],
        parser,
      };

      const result = await compile(params);

      expect(result).toEqual({
        uk: { _module: { key: "_value_" } },
        en: { _module: { key: "_value_2" } },
      });
    });

    test('Should use the default parser function if "parser" is not provided', async () => {
      const params = {
        ...correctParams,
        files: [
          {
            filePath: "_cool_namespace_.locale.json",
            content: Buffer.from(
              JSON.stringify({
                uk: {
                  key: "_value_",
                },
                en: {
                  key: "_value_2",
                },
              })
            ),
            bytes: 15,
          },
        ],
      };

      const result = await compile(params);

      expect(result).toEqual({
        uk: {
          _cool_namespace_: {
            key: "_value_",
          },
        },
        en: {
          _cool_namespace_: {
            key: "_value_2",
          },
        },
      });
    });

    test('Should merge the same namespace from different files if "merge" is true', async () => {
      const file1 = {
        filePath: "/src/_some_namespace_.locale.json",
        content: Buffer.from(
          JSON.stringify({
            uk: {
              key_1: "_value_1",
            },
          })
        ),
        bytes: 15,
      };

      const file2WithSameNamespace = {
        filePath: "/src/other/module/_some_namespace_.locale.json",
        content: Buffer.from(
          JSON.stringify({
            en: {
              key_2: "_value_2",
            },
          })
        ),
        bytes: 15,
      };

      const file3WithAnotherNamespace = {
        filePath: "/src/another/module/_another_namespace_.locale.json",
        content: Buffer.from(
          JSON.stringify({
            fr: {
              key_3: "_value_3",
            },
          })
        ),
        bytes: 15,
      };

      const file3WithAnotherNamespaceAndLocale = {
        filePath: "/src/another/module/two/_another_namespace_.locale.json",
        content: Buffer.from(
          JSON.stringify({
            fr: {
              key_4: "_value_4",
            },
          })
        ),
        bytes: 15,
      };

      const params = {
        ...correctParams,
        merge: true,
        files: [
          file1,
          file2WithSameNamespace,
          file3WithAnotherNamespace,
          file3WithAnotherNamespaceAndLocale,
        ],
      };

      const result = await compile(params);

      expect(result).toEqual({
        uk: { _some_namespace_: { key_1: "_value_1" } },
        en: { _some_namespace_: { key_2: "_value_2" } },
        fr: { _another_namespace_: { key_3: "_value_3", key_4: "_value_4" } },
      });
    });

    test('Should throw error if "merge" is false and the same namespace are located in different files', async () => {
      const file1 = {
        filePath: "/src/_some_namespace_.locale.json",
        content: Buffer.from(
          JSON.stringify({
            uk: {
              key_1: "_value_1",
            },
          })
        ),
        bytes: 15,
      };

      const file2WithSameNamespace = {
        filePath: "/src/other/module/_some_namespace_.locale.json",
        content: Buffer.from(
          JSON.stringify({
            en: {
              key_2: "_value_2",
            },
          })
        ),
        bytes: 15,
      };

      const file3WithAnotherNamespace = {
        filePath: "/src/another/module/_another_namespace_.locale.json",
        content: Buffer.from(
          JSON.stringify({
            fr: {
              key_3: "_value_3",
            },
          })
        ),
        bytes: 15,
      };

      const file3WithAnotherNamespaceAndLocale = {
        filePath: "/src/another/module/two/_another_namespace_.locale.json",
        content: Buffer.from(
          JSON.stringify({
            fr: {
              key_4: "_value_4",
            },
          })
        ),
        bytes: 15,
      };

      const params = {
        ...correctParams,
        merge: false,
        files: [
          file1,
          file2WithSameNamespace,
          file3WithAnotherNamespace,
          file3WithAnotherNamespaceAndLocale,
        ],
      };
      const act = () => compile(params);

      const result = await expect(act);

      await result.rejects.toThrow(
        `Locales [/src/another/module/two/_another_namespace_.locale.json] and [/src/another/module/_another_namespace_.locale.json] have the same namespace. If you want to allow merging, set the \"merge\" option to true`
      );
    });
  });
});
