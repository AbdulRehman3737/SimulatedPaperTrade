import fs from "fs";
import path from "path";

const DATA_DIR = path.join(__dirname, "..", "data");

function resolveDataPath(fileName: string): string {
  return path.join(DATA_DIR, fileName);
}

/**
 * Reads and parses a JSON file from the data directory.
 * Falls back to `defaultValue` (and writes it back) if the file is missing.
 */
export function readJsonFile<T>(fileName: string, defaultValue: T): T {
  const filePath = resolveDataPath(fileName);

  if (!fs.existsSync(filePath)) {
    writeJsonFile(fileName, defaultValue);
    return defaultValue;
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  if (!raw.trim()) {
    return defaultValue;
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    throw new Error(`Failed to parse JSON file "${fileName}": ${(error as Error).message}`);
  }
}

/**
 * Serializes `data` and writes it to the data directory, creating the
 * directory if it does not already exist. Writes atomically via a temp
 * file + rename to avoid corrupting the JSON on a crash mid-write.
 */
export function writeJsonFile<T>(fileName: string, data: T): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const filePath = resolveDataPath(fileName);
  const tempPath = `${filePath}.tmp`;
  const serialized = JSON.stringify(data, null, 2);

  fs.writeFileSync(tempPath, serialized, "utf-8");
  fs.renameSync(tempPath, filePath);
}
