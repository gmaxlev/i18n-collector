import { vol } from "memfs";
import {
  getStringFilesize,
  isAvailableDirectory,
  isExistingPath,
  useMatcher,
} from "../utils";

jest.mock("fs/promises");

describe("Utils", () => {
  afterEach(() => {
    vol.reset();
  });

  describe("getStringFilesize()", () => {
    test("Should return a string", () => {
      expect(getStringFilesize(1)).toBe("1 B");
      expect(getStringFilesize(1000)).toBe("1 kB");
    });
  });

  describe("useMatcher()", () => {
    test("Should use regex", async () => {
      const result1 = await useMatcher(/file2/, "/src/file2.json");
      expect(result1).toBe(true);
      const result2 = await useMatcher(/notexistingfile/, "/src/file2.json");
      expect(result2).toBe(false);
    });
    test("Should use function", async () => {
      const result1 = await useMatcher(
        (filePath) => /file2/.test(filePath),
        "/src/file2.json"
      );
      expect(result1).toBe(true);
      const result2 = await useMatcher(
        (filePath) => /notexistingfile/.test(filePath),
        "/src/file2.json"
      );
      expect(result2).toBe(false);
    });
    test("Should throw an error is funtion returns not boolean", async () => {
      const act = () =>
        useMatcher(
          // @ts-expect-error
          () => "not boolean",
          "/src/file2.json"
        );
      await expect(act).rejects.toThrowError(
        "Matcher should return boolean or Promise<boolean>"
      );
    });
  });

  describe("isExistingPath()", () => {
    test("Should return true if path exists", async () => {
      vol.fromJSON({
        "/src/file1.json": "1",
        "/src/file2.json": "2",
      });
      const result1 = await isExistingPath("/src/file1.json");
      expect(result1).toBe(true);
      const result2 = await isExistingPath("/src/non-existent-file.json");
      expect(result2).toBe(false);
    });
  });

  describe("isAvailableDirectory()", () => {
    test("Should return true if path exists and is a directory", async () => {
      vol.fromNestedJSON({
        "/src/file1.json": "1",
        "/src/file2.json": "2",
        "/src/directory": {},
      });
      const result1 = await isAvailableDirectory("/src/directory");
      expect(result1).toBe(true);
      const result2 = await isAvailableDirectory("/src/file1.json");
      expect(result2).toBe(false);
    });
  });
});
