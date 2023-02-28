import { parse } from "../parser";

describe("parser.ts", () => {
  let correctFilePath = "en.locale.json";
  let correctFileLang = "en";

  test("Should throw an error if options is not an object", () => {
    [null, 7, "2", []].forEach((value) => {
      // @ts-expect-error
      expect(() => parse(value)).toThrow("Options must be an object");
    });
  });

  test("Should throw an error if options.filePath is not a string", () => {
    [null, 1, {}, []].forEach((value) => {
      // @ts-expect-error
      expect(() => parse({ filePath: value })).toThrow(
        "File path must be a string"
      );
    });
  });

  test("Should throw an error if file content is not a Buffer", () => {
    [null, 1, {}, []].forEach((value) => {
      expect(() =>
        // @ts-expect-error
        parse({ filePath: correctFilePath, fileContent: value })
      ).toThrow("Content file must be a Buffer");
    });
  });

  test("Should return null if buffer is empty if contains an empty string", () => {
    [Buffer.from(""), Buffer.from("   "), Buffer.alloc(0)].forEach((value) => {
      expect(
        parse({ filePath: correctFilePath, fileContent: value })
      ).toBeNull();
    });
  });

  test("Should throw an error if file content is not a valid JSON", () => {
    const content = Buffer.from("±!@#$%^&*()_+");
    expect(() =>
      parse({ filePath: correctFilePath, fileContent: content })
    ).toThrow();
  });

  test("Should throw an error if parsed JSON is not an object", () => {
    const content = Buffer.from("±!@#$%^&*()_+");

    ["1", "[]"].forEach((value) => {
      expect(() =>
        parse({ filePath: correctFilePath, fileContent: Buffer.from(value) })
      ).toThrow("By default localization file must be a valid JSON object");
    });
  });

  test("Should throw an error if file name does not contain a language", () => {
    const content = Buffer.from('{"translations": {}}');

    [
      "",
      " ",
      ".",
      "json",
      ".json",
      "locale.json",
      ".locale.json",
      " .locale.json",
    ].forEach((wrongFileName) => {
      expect(() =>
        parse({ filePath: wrongFileName, fileContent: content })
      ).toThrow(
        'Filename should contain language code in format "[lang].locale.json"'
      );
    });
  });

  describe.each`
    filename               | language
    ${"en.locale.json"}    | ${"en"}
    ${"uk.locale.json"}    | ${"uk"}
    ${"a.b.c.locale.json"} | ${"a.b.c"}
  `(`$filename and $language`, ({ filename, language }) => {
    test("Should return language code", () => {
      const content = Buffer.from('{"translations": {}}');

      const result = parse({ filePath: filename, fileContent: content });

      expect(result).toEqual({
        id: filename,
        language,
        namespace: undefined,
        translations: {},
      });
    });
  });

  test("Should throw an error if namespace is not a string", () => {
    [1, {}, [], null].forEach((namespace) => {
      const fineContent = {
        translations: {},
        namespace,
      };

      const act = () =>
        parse({
          filePath: correctFilePath,
          fileContent: Buffer.from(JSON.stringify(fineContent)),
        });

      expect(act).toThrow("Namespace must be a string");
    });
  });

  test("Should return namespace as undefined if it is not specified", () => {
    const fineContent = {
      translations: {},
    };

    const result = parse({
      filePath: correctFilePath,
      fileContent: Buffer.from(JSON.stringify(fineContent)),
    });

    expect(result).toEqual({
      id: correctFilePath,
      language: correctFileLang,
      namespace: undefined,
      translations: {},
    });
  });

  test("Should return namespace if it is specified", () => {
    const fineContent = {
      translations: {},
      namespace: "test",
    };

    const result = parse({
      filePath: correctFilePath,
      fileContent: Buffer.from(JSON.stringify(fineContent)),
    });

    expect(result).toEqual({
      id: correctFilePath,
      language: correctFileLang,
      namespace: "test",
      translations: {},
    });
  });

  test("Should throw error if translations is not an object", () => {
    [1, "2", null, []].forEach((translations) => {
      const fineContent = {
        namespace: "test",
        translations,
      };

      const act = () =>
        parse({
          filePath: correctFilePath,
          fileContent: Buffer.from(JSON.stringify(fineContent)),
        });

      expect(act).toThrow("Translations must be an object");
    });
  });

  test("Should return translations as an empty object if it is not specified", () => {
    const fineContent = {
      namespace: "test",
    };

    const result = parse({
      filePath: correctFilePath,
      fileContent: Buffer.from(JSON.stringify(fineContent)),
    });

    expect(result).toEqual({
      id: correctFilePath,
      language: correctFileLang,
      namespace: "test",
      translations: {},
    });
  });

  test("Should return translations if it is specified", () => {
    const fineContent = {
      namespace: "test",
      translations: {
        key: "value",
      },
    };

    const result = parse({
      filePath: correctFilePath,
      fileContent: Buffer.from(JSON.stringify(fineContent)),
    });

    expect(result).toEqual({
      id: correctFilePath,
      language: correctFileLang,
      namespace: "test",
      translations: {
        key: "value",
      },
    });
  });
});
