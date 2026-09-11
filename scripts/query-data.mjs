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

function containsValue(value, needle) {
  if (typeof value === "string") return value.toLowerCase().includes(needle.toLowerCase());
  if (Array.isArray(value)) return value.some((item) => containsValue(item, needle));
  if (value && typeof value === "object") return Object.values(value).some((item) => containsValue(item, needle));
  return String(value ?? "").toLowerCase().includes(needle.toLowerCase());
}

try {
  const args = parseArgs(process.argv.slice(2));
  if (!args.collection || !collections.has(args.collection)) {
    throw new Error(`Unknown collection. Use one of: ${[...collections].sort().join(", ")}`);
  }
  if (!args.id && !args.contains && !(args.field && args.value)) {
    throw new Error("Provide --id, --contains, or --field with --value");
  }
  const entries = JSON.parse(fs.readFileSync(path.join(dataDir, `${args.collection}.json`), "utf8"));
  const matches = entries.filter((entry) => {
    if (args.id && entry.id !== args.id) return false;
    if (args.contains && !containsValue(entry, args.contains)) return false;
    if (args.field && String(getField(entry, args.field)) !== args.value) return false;
    return true;
  });
  process.stdout.write(`${JSON.stringify(matches, null, 2)}\n`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
