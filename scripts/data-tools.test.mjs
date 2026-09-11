import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";

const run = (script, args) => JSON.parse(execFileSync(process.execPath, [script, ...args], {
  cwd: process.cwd(),
  encoding: "utf8",
}));

test("query-data returns one definition by id", () => {
  const result = run("scripts/query-data.mjs", ["--collection", "monsters", "--id", "green-jelly"]);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "green-jelly");
});

test("query-data supports text and field filters", () => {
  const byText = run("scripts/query-data.mjs", ["--collection", "monsters", "--contains", "green jelly"]);
  assert.equal(byText[0].id, "green-jelly");

  const byField = run("scripts/query-data.mjs", ["--collection", "monsters", "--field", "level", "--value", "1"]);
  assert.ok(byField.some((entry) => entry.id === "green-jelly"));
});

test("list-data returns compact selected metadata", () => {
  const result = run("scripts/list-data.mjs", ["--collection", "monsters", "--field", "level"]);
  assert.equal(result.length, 56);
  assert.deepEqual(Object.keys(result[0]), ["id", "level"]);
});
