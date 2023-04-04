import {
  excludeTypes,
  NOT_ARRAY_TYPES,
  NOT_RECORD_TYPES,
  NOT_FUNCTION_TYPES,
  typesInArray,
} from "./utils";
import { compile, CompilerOptions } from "../src/compiler";
import {
  LocaleFilesTypeDescription,
  LocaleNamespaceTypeDescription,
  ParseResultTypeDescription,
  ParserFunctionTypeDescription,
} from "../src/types";

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

        await result.rejects.toThrow("Options is not an object");
      }
    });

    test('Should throw an error if "merge" is not a boolean and undefined', async () => {
      for (const value of excludeTypes(["boolean", "undefined"])) {
        const params = { ...correctParams, merge: value };

        const act = () => compile(params);

        const result = await expect(act);

        await result.rejects.toThrow("merge: must be a boolean or undefined");
      }
    });

    test('Should throw an error if "defaultNamespace" has an invalid type', async () => {
      for (const value of excludeTypes(["string", "undefined"])) {
        const params = { ...correctParams, defaultNamespace: value };

        const act = () => compile(params);

        const result = await expect(act);

        await result.rejects.toThrow(
          `defaultNamespace: ${LocaleNamespaceTypeDescription}`
        );
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

        await result.rejects.toThrow(`files: ${LocaleFilesTypeDescription}`);
      }
    });

    test('Should throw an error if "parser" is not a function', async () => {
      for (const value of excludeTypes(["undefined", "function"])) {
        const params = { ...correctParams, parser: value };

        const act = () => compile(params);

        const result = await expect(act);

        await result.rejects.toThrow(
          `parser: ${ParserFunctionTypeDescription}`
        );
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
        `Parser has returned an invalid type: ${ParseResultTypeDescription}`
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
        `Parser has returned an invalid type: ${ParseResultTypeDescription}`
      );
    });

    test("Should use a provided parser function", async () => {
      const parser = () => {
        return {
          id: "file.not.json",
          language: "__lng__",
          namespace: "_module",
          translations: {
            key: "_value_",
          },
        };
      };

      const content = Buffer.from("This content needs a special parser");

      const params = {
        ...correctParams,
        files: [
          {
            filePath: "file.not.json",
            content,
            bytes: content.length,
          },
        ],
        parser,
      };

      const result = await compile(params);

      expect(result).toEqual({
        __lng__: {
          _module: {
            key: "_value_",
          },
        },
      });
    });

    test('Should use the default parser function if "parser" is not provided', async () => {
      const params = {
        ...correctParams,
        files: [
          {
            filePath: "en.locale.json",
            content: Buffer.from(
              JSON.stringify({
                namespace: "$module$",
                translations: {
                  key: "_value_",
                },
              })
            ),
            bytes: 15,
          },
        ],
      };

      const result = await compile(params);

      expect(result).toEqual({
        en: {
          $module$: {
            key: "_value_",
          },
        },
      });
    });

    test('Should throw an error if "defaultNamespace" is not provided and a namespace is not found in a file', async () => {
      const file = {
        filePath: "en.locale.json",
        content: Buffer.from(
          JSON.stringify({
            translations: {
              key: "_value_",
            },
          })
        ),
        bytes: 15,
      };

      const params: CompilerOptions = {
        ...correctParams,
        files: [file],
      };

      const act = () => compile(params);

      const result = await expect(act);

      await result.rejects.toThrow(
        `"namespace" is not defined in locale [${file.filePath}] and no default namespace is provided`
      );
    });

    test('Should use provided "defaultNamespace" if no provided namespace in a locale', async () => {
      const file = {
        filePath: "en.locale.json",
        content: Buffer.from(
          JSON.stringify({
            translations: {
              key: "_value_",
            },
          })
        ),
        bytes: 15,
      };

      const params: CompilerOptions = {
        ...correctParams,
        defaultNamespace: "__default_namespace__",
        files: [file],
      };

      const result = await compile(params);

      expect(result).toEqual({
        en: { __default_namespace__: { key: "_value_" } },
      });
    });

    test('Should merge the same namespace from different files if "merge" is true', async () => {
      const file1 = {
        filePath: "/src/en.locale.json",
        content: Buffer.from(
          JSON.stringify({
            namespace: "the_same_namespace",
            translations: {
              key_1: "_value_1",
            },
          })
        ),
        bytes: 15,
      };

      const file2WithSameNamespace = {
        filePath: "/src/other/module/en.locale.json",
        content: Buffer.from(
          JSON.stringify({
            namespace: "the_same_namespace",
            translations: {
              key_2: "_value_2",
            },
          })
        ),
        bytes: 15,
      };

      const file3WithAnotherNamespace = {
        filePath: "/src/another/module/en.locale.json",
        content: Buffer.from(
          JSON.stringify({
            namespace: "another_namespace",
            translations: {
              key_3: "_value_3",
            },
          })
        ),
        bytes: 15,
      };

      const file3WithAnotherNamespaceAndLocale = {
        filePath: "/src/another/module/fr.locale.json",
        content: Buffer.from(
          JSON.stringify({
            namespace: "another_namespace",
            translations: {
              key_3: "_value_3",
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
        en: {
          the_same_namespace: {
            key_1: "_value_1",
            key_2: "_value_2",
          },
          another_namespace: {
            key_3: "_value_3",
          },
        },
        fr: {
          another_namespace: {
            key_3: "_value_3",
          },
        },
      });
    });

    test('Should throw error if "merge" is false and the same namespace are located in different files', async () => {
      const file1 = {
        filePath: "/src/en.locale.json",
        content: Buffer.from(
          JSON.stringify({
            namespace: "the_same_namespace",
            translations: {
              key_1: "_value_1",
            },
          })
        ),
        bytes: 15,
      };

      const file2WithSameNamespace = {
        filePath: "/src/other/module/en.locale.json",
        content: Buffer.from(
          JSON.stringify({
            namespace: "the_same_namespace",
            translations: {
              key_2: "_value_2",
            },
          })
        ),
        bytes: 15,
      };

      const file3WithAnotherNamespace = {
        filePath: "/src/another/module/en.locale.json",
        content: Buffer.from(
          JSON.stringify({
            namespace: "another_namespace",
            translations: {
              key_3: "_value_3",
            },
          })
        ),
        bytes: 15,
      };

      const file3WithAnotherNamespaceAndLocale = {
        filePath: "/src/another/module/fr.locale.json",
        content: Buffer.from(
          JSON.stringify({
            namespace: "another_namespace",
            translations: {
              key_3: "_value_3",
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
        `Locales [${file2WithSameNamespace.filePath}] and [${file1.filePath}] have the same namespace. If you want to allow merging, set the "merge" option to true`
      );
    });
  });
});
