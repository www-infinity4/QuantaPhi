// scripts/verify-bubbles-pr416.mjs
// This script runs the project's test suite to verify that Bubbles PR 416
// has been merged correctly. It relies on the existing npm test command,
// which should include the Bubbles PR 416 specific tests.

import { execSync } from "node:child_process";

console.log("=== Running Bubbles PR 416 verification tests ===");

try {
  // Execute the npm test script defined in package.json.
  // The test runner will output results to the console.
  execSync("npm test", { stdio: "inherit" });
  console.log("✅ Bubbles PR 416 verification tests passed.");
} catch (error) {
  console.error("❌ Bubbles PR 416 verification tests failed.");
  // Propagate the error code so CI can detect failure.
  process.exit(error.status ?? 1);
}
