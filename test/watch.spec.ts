import { watch } from "../src";
import { vol } from "memfs";
jest.mock("fs/promises");
import fs from "fs";
import type { WatcherOptions } from "../src/watch";
describe("watch.ts", () => {
  jest.spyOn(fs, "watch").mockImplementation(() => {
    return void 0 as any;
  });

  afterEach(() => {
    vol.reset();
  });

  describe("watch()", () => {
    test("Should call beforeRun hook", async () => {
      vol.fromNestedJSON(
        {
          src: {
            module1: {
              "model_1.locale.json": JSON.stringify({
                uk: {
                  key1: "value1",
                },
                en: {
                  key2: "value2",
                },
              }),
            },
          },
        },
        "/home",
      );

      const beforeRun = jest.fn();

      const options: WatcherOptions = {
        inputPath: "/home/src",
        outputPath: "/home/dist",
        merge: true,
        clear: true,
        hooks: {
          beforeRun,
        },
      };

      await watch(options);

      expect(beforeRun).toHaveBeenCalledTimes(1);

      expect(vol.toJSON()).toEqual({
        "/home/dist/uk.json": '{"model_1":{"key1":"value1"}}',
        "/home/dist/en.json": '{"model_1":{"key2":"value2"}}',
        "/home/src/module1/model_1.locale.json":
          '{"uk":{"key1":"value1"},"en":{"key2":"value2"}}',
      });
    });

    test("Should call afterRun hook", async () => {
      vol.fromNestedJSON(
        {
          src: {
            module1: {
              "model_1.locale.json": JSON.stringify({
                uk: {
                  key1: "value1",
                },
                en: {
                  key2: "value2",
                },
              }),
            },
          },
        },
        "/home",
      );

      const afterRun = jest.fn();

      const options: WatcherOptions = {
        inputPath: "/home/src",
        outputPath: "/home/dist",
        merge: true,
        clear: true,
        hooks: {
          afterRun,
        },
      };

      await watch(options);

      expect(afterRun).toHaveBeenCalledTimes(1);

      expect(afterRun).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            filePath: "/home/dist/uk.json",
          }),
          expect.objectContaining({
            filePath: "/home/dist/en.json",
          }),
        ]),
      );

      expect(vol.toJSON()).toEqual({
        "/home/dist/uk.json": '{"model_1":{"key1":"value1"}}',
        "/home/dist/en.json": '{"model_1":{"key2":"value2"}}',
        "/home/src/module1/model_1.locale.json":
          '{"uk":{"key1":"value1"},"en":{"key2":"value2"}}',
      });
    });

    test("Should scan, compile and write locales files", async () => {
      vol.fromNestedJSON(
        {
          dont_compile_these_files: {
            "other.locale.json": JSON.stringify({
              en: {
                key: "value",
              },
            }),
          },
          some_other_directory: {
            "image.png": "image_content",
          },
          src: {
            module1: {
              "model_1.locale.json": JSON.stringify({
                uk: {
                  key1: "value1",
                },
                en: {
                  key2: "value2",
                },
              }),
            },
            some_directory: {
              "some-component.locale.json": JSON.stringify({
                uk: {
                  key3: "value3",
                },
                en: {
                  key4: "value4",
                },
              }),
            },

            module2: {
              "some-module.locale.json": JSON.stringify({
                en: {
                  key5: "value5",
                },
              }),
            },

            module3: {
              "some-module-2.locale.json": JSON.stringify({
                gr: {
                  key6: "value7",
                },
              }),
            },

            module4: {
              "uk.locale.json": "",
            },
          },
          dist: {
            "uk.locale.json": JSON.stringify({
              module1: {
                old: "data",
              },
            }),
            some_other_file_but_should_be_delete: "some_other_content",
          },
        },
        "/home",
      );

      const options: WatcherOptions = {
        inputPath: "/home/src",
        outputPath: "/home/dist",
        merge: true,
        clear: true,
      };

      await watch(options);

      expect(vol.toJSON()).toEqual({
        "/home/dont_compile_these_files/other.locale.json":
          '{"en":{"key":"value"}}',
        "/home/some_other_directory/image.png": "image_content",
        "/home/src/module1/model_1.locale.json":
          '{"uk":{"key1":"value1"},"en":{"key2":"value2"}}',
        "/home/src/some_directory/some-component.locale.json":
          '{"uk":{"key3":"value3"},"en":{"key4":"value4"}}',
        "/home/src/module2/some-module.locale.json": '{"en":{"key5":"value5"}}',
        "/home/src/module3/some-module-2.locale.json":
          '{"gr":{"key6":"value7"}}',
        "/home/src/module4/uk.locale.json": "",
        "/home/dist/uk.json":
          '{"model_1":{"key1":"value1"},"some-component":{"key3":"value3"}}',
        "/home/dist/en.json":
          '{"model_1":{"key2":"value2"},"some-module":{"key5":"value5"},"some-component":{"key4":"value4"}}',
        "/home/dist/gr.json": '{"some-module-2":{"key6":"value7"}}',
      });
    });
  });
});
