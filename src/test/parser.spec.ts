import type { ParserOptions } from "./../types";
import {
  NOT_RECORD_TYPES,
  NOT_STRING_TYPES,
  ALL_TYPES,
  excludeTypes,
} from "./utils";
import { parse } from "../parser";

describe("parser.ts", () => {
  let correctOptions: ParserOptions;

  beforeEach(() => {
    correctOptions = {
      filePath: "en.locale.json",
      fileContent: Buffer.from(
        JSON.stringify({
          namespace: "module",
          translations: {
            key: "value",
          },
        })
      ),
    };
  });

  test("Should throw an error if options is not an object", () => {
    for (const options of NOT_RECORD_TYPES) {
      const act = () => parse(options);

      const result = expect(act);

      result.toThrow("Options should be an object");
    }
  });

  test('Should throw an error if "filePath" is not a string', () => {
    for (const value of NOT_STRING_TYPES) {
      const options: ParserOptions = {
        ...correctOptions,
        filePath: value,
      };

      const act = () => parse(options);

      const result = expect(act);

      result.toThrow("filePath: should be a string");
    }
  });

  test('Should throw an error if "fileContent" is not a Buffer', () => {
    for (const value of ALL_TYPES) {
      const options: ParserOptions = {
        ...correctOptions,
        fileContent: value,
      };

      const act = () => parse(options);

      const result = expect(act);

      result.toThrow("fileContent: should be a Buffer");
    }
  });

  test("Should return null if buffer is empty", () => {
    const options: ParserOptions = {
      ...correctOptions,
      fileContent: Buffer.alloc(0),
    };

    const result = parse(options);

    expect(result).toBeNull();
  });

  test("Should return null if buffer contains an empty string", () => {
    const options: ParserOptions = {
      ...correctOptions,
      fileContent: Buffer.from("    "),
    };

    const result = parse(options);

    expect(result).toBeNull();
  });

  test("Should throw an error if file content is not a valid JSON", () => {
    const options: ParserOptions = {
      ...correctOptions,
      fileContent: Buffer.from("!_not_valid_json_!"),
    };

    const act = () => parse(options);

    const result = expect(act);

    result.toThrow();
  });

  test("Should throw an error if file content does not contain object", () => {
    const contents = [1, [], null];

    for (const content of contents) {
      const options: ParserOptions = {
        ...correctOptions,
        fileContent: Buffer.from(JSON.stringify(content)),
      };

      const act = () => parse(options);

      const result = expect(act);

      result.toThrow("By default locale file must be a valid JSON object");
    }
  });

  test("Should throw error if filename does not match pattern", () => {
    const invalidFileNames = [
      "",
      "  ",
      "a",
      "a.a",
      "a json",
      "locale.json",
      ".locale.json",
      "uk.locale.xml",
    ];

    for (const fileName of invalidFileNames) {
      const options: ParserOptions = {
        ...correctOptions,
        filePath: fileName,
      };

      const act = () => parse(options);

      const result = expect(act);

      result.toThrow(
        `Filename should contain language code in format "[lang].locale.json"`
      );
    }
  });

  test("Should return language from filename", () => {
    const validFilePaths = {
      "en.locale.json": "en",
      "en-US.locale.json": "en-US",
      "en-us.locale.json": "en-us",
      "uk.locale.json": "uk",
      "a.b.c.d.locale.json": "a.b.c.d",
    };

    const keys = Object.keys(validFilePaths) as Array<
      keyof typeof validFilePaths
    >;

    for (const filePath of keys) {
      const options: ParserOptions = {
        ...correctOptions,
        filePath,
        fileContent: Buffer.from(
          JSON.stringify({
            translations: {
              key: "value",
            },
          })
        ),
      };

      const result = parse(options);

      expect(result).toEqual({
        language: (validFilePaths as any)[filePath],
        namespace: undefined,
        translations: { key: "value" },
        id: filePath,
      });
    }
  });

  test("Should return 'undefined' namespace if it is not specified in file", () => {
    const options: ParserOptions = {
      ...correctOptions,
      fileContent: Buffer.from(
        JSON.stringify({
          translations: {
            key: "value",
          },
        })
      ),
    };

    const result = parse(options);

    expect(result).toEqual({
      language: "en",
      namespace: undefined,
      translations: { key: "value" },
      id: "en.locale.json",
    });
  });

  test("Should return provided namespace", () => {
    const options: ParserOptions = {
      ...correctOptions,
      fileContent: Buffer.from(
        JSON.stringify({
          namespace: "_provided_namespace_",
          translations: {
            key: "value",
          },
        })
      ),
    };

    const result = parse(options);

    expect(result).toEqual({
      language: "en",
      namespace: "_provided_namespace_",
      translations: { key: "value" },
      id: "en.locale.json",
    });
  });

  test("Should return an empty translations if translations are not specified", () => {
    const options: ParserOptions = {
      ...correctOptions,
      filePath: "/src/en.locale.json",
      fileContent: Buffer.from(
        JSON.stringify({
          namespace: "_provided_namespace_",
        })
      ),
    };

    const result = parse(options);

    expect(result).toEqual({
      language: "en",
      namespace: "_provided_namespace_",
      translations: {},
      id: "/src/en.locale.json",
    });
  });

  test("Should throw an error if translations are not an object", () => {
    const invalidContent = [1, null, []];

    for (const content of invalidContent) {
      const options: ParserOptions = {
        ...correctOptions,
        fileContent: Buffer.from(
          JSON.stringify({
            translations: content,
          })
        ),
      };

      const act = () => parse(options);

      expect(act).toThrow(`"translations" must be an object`);
    }
  });

  test("Should return correct result", () => {
    const options: ParserOptions = {
      ...correctOptions,
      filePath: "/src/module/en-US.locale.json",
      fileContent: Buffer.from(
        JSON.stringify({
          namespace: "_provided_namespace_",
          translations: {
            key: "value",
            nestedObject: {
              _key_: "_value_",
              nestedObject2: {
                __key__: "__value__",
              },
            },
          },
        })
      ),
    };

    const result = parse(options);

    expect(result).toEqual({
      language: "en-US",
      namespace: "_provided_namespace_",
      translations: {
        key: "value",
        nestedObject: {
          _key_: "_value_",
          nestedObject2: {
            __key__: "__value__",
          },
        },
      },
      id: "/src/module/en-US.locale.json",
    });
  });
});
