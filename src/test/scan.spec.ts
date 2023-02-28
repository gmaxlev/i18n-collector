import { vol } from "memfs";
import { scan, ScanOptions } from "../scan";
import {
  excludeTypes,
  NOT_FUNCTION_TYPES,
  NOT_RECORD_TYPES,
  NOT_STRING_TYPES,
} from "./utils";
import { MatcherTypeDescription, LocaleFile } from "../types";

jest.mock("fs/promises");

describe("scan.ts", () => {
  let correctOptions: ScanOptions;

  beforeEach(() => {
    correctOptions = {
      path: "/specify/in/test",
      matcher: () => true,
    };
  });

  afterEach(() => {
    vol.reset();
  });

  describe("scan()", () => {
    test("Should throw an error if options is not an object", async () => {
      for (const value of NOT_RECORD_TYPES) {
        await expect(() => scan(value)).rejects.toThrow(
          "Scan options is not an object"
        );
      }
    });

    test('Should throw an error if "path" is not a string', async () => {
      for (const value of NOT_STRING_TYPES) {
        await expect(() =>
          scan({ ...correctOptions, path: value })
        ).rejects.toThrow("Scan options.path is not a string");
      }
    });

    test('Should throw an error if "matcher" is not a function', async () => {
      for (const value of NOT_FUNCTION_TYPES) {
        await expect(() =>
          scan({ ...correctOptions, matcher: value })
        ).rejects.toThrow(`Scan options.matcher: ${MatcherTypeDescription}`);
      }
    });

    test('Should not throw an error if "matcher" is a regex', async () => {
      await expect(() =>
        scan({ ...correctOptions, matcher: /test/ })
      ).rejects.not.toThrow(`Scan options.matcher: ${MatcherTypeDescription}`);
    });

    test('Should throw an error if "recursive" is not a boolean and undefined', async () => {
      for (const value of excludeTypes(["undefined", "boolean"])) {
        await expect(() =>
          scan({ ...correctOptions, recursive: value })
        ).rejects.toThrow("Scan options.recursive is not a boolean");
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

      await expect(() =>
        scan({ ...correctOptions, path: "/src/directory_b" })
      ).rejects.toThrow(
        "Scan path /src/directory_b does not exist or it is not a directory"
      );
    });

    test('Should throw an error if "path" is not a directory', async () => {
      vol.fromNestedJSON(
        {
          directory_b: "content",
          directory_a: {
            "file.json": "content",
          },
        },
        "/src"
      );

      await expect(() =>
        scan({ ...correctOptions, path: "/src/directory_b" })
      ).rejects.toThrow(
        "Scan path /src/directory_b does not exist or it is not a directory"
      );
    });

    test('Should not scan nested directories if "recursive" is false', async () => {
      vol.fromNestedJSON(
        {
          "file.json": "content",
          directory_a: {
            "file.json": "content",
          },
        },
        "/src"
      );

      const result = await scan({
        ...correctOptions,
        path: "/src",
        recursive: false,
      });

      expect(result).toHaveLength(1);
      const file = (result as any[])[0] as LocaleFile;
      expect(file.filePath).toBe("/src/file.json");
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

      const result = await scan({
        ...correctOptions,
        path: "/src",
        recursive: true,
      });

      expect(result).toHaveLength(2);

      const file1 = (result as any[])[1] as LocaleFile;
      const file2 = (result as any[])[0] as LocaleFile;

      expect(file1.filePath).toBe("/src/file1.json");
      expect(file2.filePath).toBe("/src/directory_a/file2.json");
    });

    test('Should return only files that match the "matcher" function', async () => {
      vol.fromNestedJSON(
        {
          "file1.json": "content",
          "file2.json": "content",
          directory_a: {
            "file3.json": "content",
          },
        },
        "/src"
      );

      const result = await scan({
        ...correctOptions,
        path: "/src",
        recursive: true,
        matcher: (filePath) => filePath.includes("file1"),
      });

      expect(result).toHaveLength(1);

      const file = (result as any[])[0] as LocaleFile;

      expect(file.filePath).toBe("/src/file1.json");
    });

    test('Should return only files that match the "matcher" regex', async () => {
      vol.fromNestedJSON(
        {
          "file1.json": "content",
          "file2.json": "content",
          directory_a: {
            "file3.json": "content",
          },
        },
        "/src"
      );

      const result = await scan({
        ...correctOptions,
        path: "/src",
        recursive: true,
        matcher: /file2/,
      });

      expect(result).toHaveLength(1);

      const file = (result as any[])[0] as LocaleFile;

      expect(file.filePath).toBe("/src/file2.json");
    });

    test("Should return correct result", async () => {
      vol.fromNestedJSON(
        {
          "file1.local.json": "1",
          "file2.local.json": "",
          directory_a: {
            "file3.local.json": "3",
          },
          directory_b: {
            "file3.js": "content",
          },
          empty_directory: {},
        },
        "/src"
      );

      const result = await scan({
        ...correctOptions,
        path: "/src",
        recursive: true,
        matcher: /.+\.local\.json$/,
      });

      expect(result).toHaveLength(3);

      const file1 = (result as any[])[1] as LocaleFile;
      expect(file1.filePath).toBe("/src/file1.local.json");
      expect(file1.content.toString()).toBe("1");
      expect(file1.bytes).toBe(1);

      const file2 = (result as any[])[0] as LocaleFile;
      expect(file2.filePath).toBe("/src/directory_a/file3.local.json");
      expect(file2.content.toString()).toBe("3");
      expect(file2.bytes).toBe(1);

      const file3 = (result as any[])[2] as LocaleFile;
      expect(file3.filePath).toBe("/src/file2.local.json");
      expect(file3.content.toString()).toBe("");
      expect(file3.bytes).toBe(0);
    });
  });
});
