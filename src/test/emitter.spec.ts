import { vol } from "memfs";
import { CompiledLocaledTypeDescription } from "./../types";
import type { EmitterParams } from "./../emitter";
import { emit } from "../emitter";
import { NOT_RECORD_TYPES, NOT_STRING_TYPES, excludeTypes } from "./utils";

jest.mock("fs/promises");

describe("Emitter", () => {
  afterEach(() => {
    vol.reset();
  });

  describe("emit()", () => {
    let correctParams: EmitterParams;

    beforeEach(() => {
      correctParams = {
        compiled: {
          uk: {
            namespace: {
              key: "value",
            },
          },
        },
        outputPath: "/replace/in/each/test",
      };
    });

    test("Should throw an error if params is not an object", async () => {
      for (const value of NOT_RECORD_TYPES) {
        await expect(emit(value)).rejects.toThrow(
          "params argument: should be an object"
        );
      }
    });

    test('Should throw an error if "compiled" has an invalid type', async () => {
      const params = { ...correctParams, compiled: "invalid" };

      // @ts-expect-error
      const act = () => emit(params);

      await expect(act).rejects.toThrow(
        `params.compiled: ${CompiledLocaledTypeDescription}`
      );
    });

    test('Should throw an error if "outputPath" is not a string', async () => {
      for (const value of NOT_STRING_TYPES) {
        const params = { ...correctParams, outputPath: value };

        const act = () => emit(params);

        await expect(act).rejects.toThrow(
          "params.outputPath: should be a string"
        );
      }
    });

    test("Should throw an error if 'clean' is not a boolean and undefined", async () => {
      for (const value of excludeTypes(["boolean", "undefined"])) {
        const params = { ...correctParams, clean: value };

        const act = () => emit(params);

        await expect(act).rejects.toThrow("params.clean: should be a boolean");
      }
    });

    test("Should throw an error if 'outputPath' is not a directory", async () => {
      vol.fromNestedJSON(
        {
          directory: "file content",
          real_directory: {
            "file3.local.json": "1",
          },
        },
        "/src"
      );

      const params = { ...correctParams, outputPath: "/src/directory" };

      const act = () => emit(params);

      await expect(act).rejects.toThrow(
        'Output path "/src/directory" is not a directory'
      );
    });

    test('Should create directory and emit files if "outputPath" is not exist', async () => {
      vol.fromNestedJSON(
        {
          file: "file content",
          directory1: {
            "program.ts": "...",
          },
        },
        "/src"
      );

      const params = {
        ...correctParams,
        outputPath: "/src/locales",
        compiled: {
          uk: {
            namespace: {
              key_1: "value_2",
            },
          },
        },
      };

      await emit(params);

      expect(vol.toJSON()).toEqual({
        "/src/file": "file content",
        "/src/directory1/program.ts": "...",
        "/src/locales/uk.json": '{"namespace":{"key_1":"value_2"}}',
      });
    });

    test('Should not clear directory if "clean" is false', async () => {
      vol.fromNestedJSON(
        {
          file: "file content",
          directory1: {
            "program.ts": "...",
          },
          locales: {
            someFile: "some content",
          },
        },
        "/src"
      );

      const params = {
        ...correctParams,
        outputPath: "/src/locales",
        clean: false,
        compiled: {
          uk: {
            namespace: {
              key_1: "value_2",
            },
          },
        },
      };

      await emit(params);

      expect(vol.toJSON()).toEqual({
        "/src/file": "file content",
        "/src/directory1/program.ts": "...",
        "/src/locales/uk.json": '{"namespace":{"key_1":"value_2"}}',
        "/src/locales/someFile": "some content",
      });
    });

    test('Should clear directory if "clean" is true', async () => {
      vol.fromNestedJSON(
        {
          file: "file content",
          directory1: {
            "program.ts": "...",
          },
          locales: {
            someFile: "some content",
          },
        },
        "/src"
      );

      const params = {
        ...correctParams,
        outputPath: "/src/locales",
        clean: true,
        compiled: {
          uk: {
            namespace: {
              key_1: "value_2",
            },
          },
        },
      };

      await emit(params);

      expect(vol.toJSON()).toEqual({
        "/src/file": "file content",
        "/src/directory1/program.ts": "...",
        "/src/locales/uk.json": '{"namespace":{"key_1":"value_2"}}',
      });
    });
  });
});
