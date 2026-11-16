import { execFileSync } from "node:child_process";

const ALLOWED = new Set(["MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC", "0BSD", "Unlicense", "Hippocratic-2.1"]);

const byLicense = JSON.parse(execFileSync("pnpm", ["licenses", "list", "--prod", "--json"], { encoding: "utf8" }));

const rows = Object.entries(byLicense).flatMap(([license, packages]) =>
  packages.map((p) => ({ license, name: p.name, versions: p.versions.join(", ") })),
);
const rejected = rows.filter((r) => !ALLOWED.has(r.license));

for (const r of rows) console.log(`${ALLOWED.has(r.license) ? "ok " : "BAD"} ${r.license.padEnd(16)} ${r.name}@${r.versions}`);

if (rejected.length) {
  console.error(`\n${rejected.length} production package(s) use a license outside the allowlist.`);
  process.exit(1);
}
console.log(`\nAll ${rows.length} production packages use allowed licenses.`);
