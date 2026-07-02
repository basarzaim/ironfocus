import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

try {
  const output = execSync('git grep -n -E "amber-|pink-" -- "src" ":(exclude)lib/accentStyles.ts"', {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();

  if (output) {
    console.error("Hardcoded accent Tailwind classes found:\n");
    console.error(output);
    process.exit(1);
  }

  console.log("No amber-/pink- drift in src.");
} catch (error) {
  const status = error && typeof error === "object" && "status" in error ? error.status : 1;
  if (status === 1 && !String(error.stdout ?? "").trim() && !String(error.stderr ?? "").trim()) {
    console.log("No amber-/pink- drift in src.");
    process.exit(0);
  }
  throw error;
}
