import { excludeTypes, NOT_RECORD_TYPES } from "./utils";
import { compile, CompilerParams } from "../compiler";
import {
  LocaleFilesTypeDescription,
  LocaleNamespaceTypeDescription,
  ParseResultTypeDescription,
} from "../types";

describe("compiler", () => {
  describe("compile()", () => {
    const correctParams: CompilerParams = {
      files: [
        {
          filePath: "en.locale.json",
          content: Buffer.from(
            '{"namespace": "module", "translations":{"key":"value"}}'
          ),
          bytes: 15,
        },
      ],
    };

    test("should throw an error if params is not an object", async () => {
      for (const params of NOT_RECORD_TYPES) {
        const act = () => compile(params);
        await expect(act).rejects.toThrow("params error: must be an object");
      }
    });

    test('Should throw an error if "merge" is not a boolean', async () => {
      for (const value of excludeTypes(["boolean", "undefined"])) {
        const act = () => compile({ ...correctParams, merge: value });

        await expect(act).rejects.toThrow(
          "params.merge error: must be a boolean or undefined"
        );
      }
    });

    test('Should throw an error if "defaultNamespace" has a wrong type', async () => {
      for (const value of excludeTypes(["string", "undefined"])) {
        const act = () =>
          compile({ ...correctParams, defaultNamespace: value });

        await expect(act).rejects.toThrow(
          `params.defaultNamespace error: ${LocaleNamespaceTypeDescription}`
        );
      }
    });

    test('Should throw an error if "files" has a wrong type', async () => {
      // @ts-expect-error
      const act = () => compile({ ...correctParams, files: "null" });

      await expect(act).rejects.toThrow(
        `params.files error: ${LocaleFilesTypeDescription}`
      );
    });

    test("Should throw an error if parser function returns a wrong type", async () => {
      const act = () =>
        compile({
          ...correctParams,
          // @ts-expect-error
          parser: () => {
            return "null";
          },
        });

      await expect(act).rejects.toThrow(
        `Parser returned value is wrong: ${ParseResultTypeDescription}`
      );
    });

    test("Should use provided parser function", async () => {
      const result = await compile({
        ...correctParams,
        parser: () => {
          return {
            id: "±!@#$%^&*.locale.json",
            language: "__lng__",
            namespace: "_module",
            translations: {
              key: "_value",
            },
          };
        },
      });

      expect(result).toEqual({
        __lng__: {
          _module: {
            key: "_value",
          },
        },
      });
    });

    test('Should use default parser function if "parser" is not provided', async () => {
      const result = await compile({
        ...correctParams,
        files: [
          {
            filePath: "en.locale.json",
            content: Buffer.from(
              JSON.stringify({
                namespace: "module",
                translations: {
                  key: "_value_",
                },
              })
            ),
            bytes: 15,
          },
        ],
      });

      expect(result).toEqual({
        en: {
          module: {
            key: "_value_",
          },
        },
      });
    });

    test('Should merge namespaces if "merge" is true', async () => {
      const result = await compile({
        ...correctParams,
        merge: true,
        files: [
          {
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
          },
          {
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
          },
          {
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
          },
        ],
      });

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
      });
    });

    test('Should throw error if "merge" is false and namespaces are located in different files', async () => {
      const act = () =>
        compile({
          ...correctParams,
          merge: false,
          files: [
            {
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
            },
            {
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
            },
            {
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
            },
          ],
        });

      await expect(act).rejects.toThrow(
        "Locales [/src/other/module/en.locale.json] and [/src/en.locale.json] have the same namespace. If you want to allow merging, set the merge option to true"
      );
    });
  });
});
