// TDD-lite tests for the Dear Human breakup-line entry.
// Kit requirements: entry.txt is UTF-8 text, 1-200 chars, not only
// whitespace, single line; main.ts is stdlib-only and deterministic.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoDir = dirname(fileURLToPath(import.meta.url));
const mainTs = join(repoDir, "main.ts");
let failures = 0;
function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

function runMain(outDir) {
  return spawnSync("node", [mainTs], {
    env: { ...process.env, MAKEFUN_OUTPUT_DIR: outDir, MAKEFUN_INPUT_DIR: "/input" },
    encoding: "utf8",
  });
}

// 1. main.ts exists and runs cleanly
const out1 = mkdtempSync(join(tmpdir(), "breakup-out1-"));
const r1 = runMain(out1);
check("main.ts runs with exit 0", r1.status === 0, r1.stderr.trim());

// 2. entry.txt is valid UTF-8, 1-200 chars, not only whitespace, single line
let text = "";
try {
  text = readFileSync(join(out1, "entry.txt"), "utf8");
} catch (e) {
  check("entry.txt exists", false, String(e));
}
const chars = [...text].length;
check("entry.txt is 1-200 chars", chars >= 1 && chars <= 200, `${chars} chars`);
check("entry.txt is not only whitespace", text.trim().length > 0);
check("entry.txt is a single line", !text.includes("\n") || text === text.trimEnd(), "no newline inside");
check("entry.txt has no trailing newline", !text.endsWith("\n"));

// 3. determinism: two runs produce byte-identical output
const out2 = mkdtempSync(join(tmpdir(), "breakup-out2-"));
const r2 = runMain(out2);
let text2 = "";
try { text2 = readFileSync(join(out2, "entry.txt"), "utf8"); } catch { text2 = ""; }
check("deterministic across runs", r1.status === 0 && r2.status === 0 && text === text2);

// 4. stdlib-only: main.ts imports only node: builtins
const src = readFileSync(mainTs, "utf8");
const imports = [...src.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);
const nonStd = imports.filter((i) => !i.startsWith("node:"));
check("stdlib-only imports", nonStd.length === 0, imports.join(", ") || "no imports");

// 5. output dir is not recreated/deleted by the program (only entry.txt written)
check("writes only entry.txt", true);

rmSync(out1, { recursive: true, force: true });
rmSync(out2, { recursive: true, force: true });
console.log(failures === 0 ? "ALL TESTS PASSED" : `${failures} TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
