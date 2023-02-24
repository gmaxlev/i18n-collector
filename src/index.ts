import path from "path";
import { watch } from "./runner";

const entry = path.resolve(process.cwd(), "locales");
const output = path.resolve(process.cwd(), "public");

watch({
  entry,
  outputPath: output,
});
