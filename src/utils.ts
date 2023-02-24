import filesize from "filesize";

export function getStringSize(bytes: number) {
  return String(filesize.filesize(bytes));
}
