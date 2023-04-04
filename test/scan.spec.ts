import { vol } from "memfs";
import { scan, ScanOptions } from "../src/scan";
import {
  excludeTypes,
  NOT_FUNCTION_TYPES,
  NOT_RECORD_TYPES,
  NOT_STRING_TYPES,
} from "./utils";
import { MatcherTypeDescription, LocaleFile } from "../src/types";

jest.mock("fs/promises");

describe("scan.ts", () => {
  let correctOptions: ScanOptions;

  beforeEach(() => {
    correctOptions = {
      path: "/replace/in/test",
      matcher: () => true,
    };
    vol.reset();
  });

  describe("scan()", () => {
    test("Should throw an error if options is not an object", async () => {
      for (const options of NOT_RECORD_TYPES) {
        const act = () => scan(options);

        const result = await expect(act);

        await result.rejects.toThrow("Options is not an object");
      }
    });

    test('Should throw an error if "path" is not a string', async () => {
      for (const value of NOT_STRING_TYPES) {
        const options = { ...correctOptions, path: value };

        const act = () => scan(options);

        const result = await expect(act);

        await result.rejects.toThrow("path is not a string");
      }
    });

    test('Should throw an error if "matcher" is not a function', async () => {
      for (const value of NOT_FUNCTION_TYPES) {
        const options = { ...correctOptions, matcher: value };

        const act = () => scan(options);

        const result = await expect(act);

        await result.rejects.toThrow(`matcher: ${MatcherTypeDescription}`);
      }
    });

    test('Should not throw an error if "matcher" is a regexp', async () => {
      const options = { ...correctOptions, matcher: /test/ };

      const act = () => scan(options);

      const result = await expect(act);

      await result.rejects.not.toThrow(`matcher: ${MatcherTypeDescription}`);
    });

    test('Should throw an error if "recursive" is not a boolean and undefined', async () => {
      for (const value of excludeTypes(["undefined", "boolean"])) {
        const options = { ...correctOptions, recursive: value };

        const act = () => scan(options);

        const result = await expect(act);

        await result.rejects.toThrow("recursive is not a boolean");
      }
    });

    test('Should throw an error if "path" does not exist', async () => {
      vol.fromNestedJSON(
        {
          "file.json": "content",
          directory_a: {
            "file.json": "content",
          },
        },
        "/src"
      );

      const path = "/src/directory_b";

      const params = { ...correctOptions, path };

      const act = () => scan(params);

      const result = await expect(act);

      await result.rejects.toThrow(
        `Path "${path}" does not exist or it is not a directory`
      );
    });

    test('Should throw an error if "path" is not a directory', async () => {
      vol.fromNestedJSON(
        {
          "file.json": "content",
          directory_b: "it is a file",
          directory_a: {
            "file.json": "content",
          },
        },
        "/src"
      );

      const path = "/src/directory_b";

      const params = { ...correctOptions, path };

      const act = () => scan(params);

      const result = await expect(act);

      await result.rejects.toThrow(
        `Path "${path}" does not exist or it is not a directory`
      );
    });

    test('Should not scan nested directories if "recursive" is false', async () => {
      expect.assertions(2);

      vol.fromNestedJSON(
        {
          "file.json": "content",
          directory_a: {
            "file.json": "content",
          },
        },
        "/src"
      );

      const params = {
        ...correctOptions,
        path: "/src",
        recursive: false,
      };

      const result = await scan(params);

      expect(result).toHaveLength(1);
      const file = result[0];

      if (file) {
        expect(file.filePath).toBe("/src/file.json");
      }
    });

    test('Should scan nested directories if "recursive" is true', async () => {
      vol.fromNestedJSON(
        {
          "file1.json": "content",
          directory_a: {
            "file2.json": "content",
          },
        },
        "/src"
      );

      const params = {
        ...correctOptions,
        path: "/src",
        recursive: true,
      };

      const result = await scan(params);

      expect.assertions(3);

      expect(result).toHaveLength(2);

      const file1 = result[0];
      if (file1) {
        expect(file1.filePath).toBe("/src/directory_a/file2.json");
      }

      const file2 = result[1];
      if (file2) {
        expect(file2.filePath).toBe("/src/file1.json");
      }
    });

    test('Should return only files that match the "matcher" function', async () => {
      vol.fromNestedJSON(
        {
          "_file1.json": "matched file",
          "file2.json": "not matched file",
          directory_a: {
            "_file3.json": "matched file",
          },
        },
        "/src"
      );

      const params: ScanOptions = {
        ...correctOptions,
        path: "/src",
        recursive: true,
        matcher: (filePath) => filePath.includes("_file"),
      };

      const result = await scan(params);

      expect.assertions(3);

      expect(result).toHaveLength(2);

      const file1 = result[0];
      if (file1) {
        expect(file1.filePath).toBe("/src/_file1.json");
      }

      const file2 = result[1];
      if (file2) {
        expect(file2.filePath).toBe("/src/directory_a/_file3.json");
      }
    });

    test('Should return only files that match the "matcher" regex', async () => {
      vol.fromNestedJSON(
        {
          "_file1.json": "matched file",
          "file2.json": "not matched file",
          directory_a: {
            "_file3.json": "matched file",
          },
        },
        "/src"
      );

      const params: ScanOptions = {
        ...correctOptions,
        path: "/src",
        recursive: true,
        matcher: /_file/,
      };

      const result = await scan(params);

      expect.assertions(3);

      expect(result).toHaveLength(2);

      const file1 = result[0];
      if (file1) {
        expect(file1.filePath).toBe("/src/_file1.json");
      }

      const file2 = result[1];
      if (file2) {
        expect(file2.filePath).toBe("/src/directory_a/_file3.json");
      }
    });
  });
});
