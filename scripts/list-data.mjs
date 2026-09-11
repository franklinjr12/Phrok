import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const dataDir = path.resolve("public/assets/data");
const collections = new Set(
  fs.readdirSync(dataDir).filter((file) => file.endsWith(".json")).map((file) => file.slice(0, -5)),
);

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith("--")) throw new Error(`Unexpected argument: ${key}`);
    const name = key.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for --${name}`);
    args[name] = value;
    index += 1;
  }
  return args;
}

function getField(entry, field) {
  return field.split(".").reduce((value, key) => value == null ? undefined : value[key], entry);
}

try {
  const args = parseArgs(process.argv.slice(2));
  if (!args.collection || !collections.has(args.collection)) {
    throw new Error(`Unknown collection. Use one of: ${[...collections].sort().join(", ")}`);
  }
  const entries = JSON.parse(fs.readFileSync(path.join(dataDir, `${args.collection}.json`), "utf8"));
  const field = args.field;
  const rows = entries.map((entry) => {
    const row = { id: entry.id };
    if (field) row[field] = getField(entry, field);
    else {
      for (const key of ["name", "type", "level", "regionId", "serviceType", "classId"]) {
        if (entry[key] !== undefined) row[key] = entry[key];
      }
    }
    return row;
  });
  process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
