import type { ParserOptions } from "./../src/types";
import {
  NOT_RECORD_TYPES,
  NOT_STRING_TYPES,
  ALL_TYPES,
  excludeTypes,
} from "./utils";
import { parse } from "../src/parser";

describe("parser.ts", () => {
  let correctOptions: ParserOptions;

  beforeEach(() => {
    correctOptions = {
      filePath: "namespace.locale.json",
      fileContent: Buffer.from(
        JSON.stringify({
          namespace: "module",
          translations: {
            key: "value",
          },
        }),
      ),
    };
  });

  test("Should throw an error if options is not an object", () => {
    for (const options of NOT_RECORD_TYPES) {
      const act = () => parse(options);

      const result = expect(act);

      result.toThrow("options: must be a record");
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

      result.toThrow("filePath: must be a string");
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

      result.toThrow("fileContent: must be a Buffer");
    }
  });

  test("Should return null if buffer is empty", () => {
    const options: ParserOptions = {
      ...correctOptions,
      filePath: "__namespace__.locale.json",
      fileContent: Buffer.alloc(0),
    };

    const result = parse(options);

    expect(result).toEqual({
      id: "__namespace__.locale.json",
      namespace: "__namespace__",
      translations: {},
    });
  });

  test("Should return an empty object if buffer contains an empty string", () => {
    const options: ParserOptions = {
      ...correctOptions,
      filePath: "__namespace__.locale.json",
      fileContent: Buffer.from("    "),
    };

    const result = parse(options);

    expect(result).toEqual({
      id: "__namespace__.locale.json",
      namespace: "__namespace__",
      translations: {},
    });
  });

  test("Should throw an error if file content is not valid JSON", () => {
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

      result.toThrow("locale file: must be a record");
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
      "namespace.locale.xml",
    ];

    for (const fileName of invalidFileNames) {
      const options: ParserOptions = {
        ...correctOptions,
        filePath: fileName,
      };

      const act = () => parse(options);

      const result = expect(act);

      result.toThrow(
        `Filename should contain language code in format "[namespace].locale.json"`,
      );
    }
  });

  test("Should return provided namespace", () => {
    const options: ParserOptions = {
      ...correctOptions,
      filePath: "_my_namespace_.locale.json",
      fileContent: Buffer.from(
        JSON.stringify({
          en: {
            key: "value",
          },
        }),
      ),
    };

    const result = parse(options);

    expect(result).toEqual({
      namespace: "_my_namespace_",
      translations: {
        en: {
          key: "value",
        },
      },
      id: "_my_namespace_.locale.json",
    });
  });

  test("Should return an empty translations if translations are not specified", () => {
    const options: ParserOptions = {
      ...correctOptions,
      filePath: "/src/_my_namespace_.locale.json",
      fileContent: Buffer.from(""),
    };

    const result = parse(options);

    expect(result).toEqual({
      namespace: "_my_namespace_",
      translations: {},
      id: "/src/_my_namespace_.locale.json",
    });
  });

  test("Should return correct result", () => {
    const options: ParserOptions = {
      ...correctOptions,
      filePath: "/src/module/_super_namespace_.locale.json",
      fileContent: Buffer.from(
        JSON.stringify({
          uk: {
            key: "value",
            nestedObject: {
              _key_: "_value_",
              nestedObject2: {
                __key__: "__value__",
              },
            },
          },
          en: {
            key: "value_2",
            nestedObject: {
              _key_: "_value__2",
              nestedObject2: {
                __key__: "__value___2",
              },
            },
          },
        }),
      ),
    };

    const result = parse(options);

    expect(result).toEqual({
      namespace: "_super_namespace_",
      translations: {
        uk: {
          key: "value",
          nestedObject: {
            _key_: "_value_",
            nestedObject2: {
              __key__: "__value__",
            },
          },
        },
        en: {
          key: "value_2",
          nestedObject: {
            _key_: "_value__2",
            nestedObject2: {
              __key__: "__value___2",
            },
          },
        },
      },
      id: "/src/module/_super_namespace_.locale.json",
    });
  });
});
