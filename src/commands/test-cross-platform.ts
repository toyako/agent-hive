/**
 * Cross-platform smoke test — validates AST execution consistency.
 */
import { ExecutionEngine } from "../engine/ExecutionEngine";
import { exec } from "../command/CommandAST";
import { ExecutionSandbox } from "../sandbox/ExecutionSandbox";
import { ResultNormalizer } from "../engine/ResultNormalizer";
import { detectCapabilities } from "../platform/PlatformCapabilities";

let pass = 0, fail = 0;

function check(name: string, ok: boolean) {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}`); }
}

async function main() {
  console.log("\n═══ Cross-Platform Smoke Test ═══\n");

  // Test 1: AST validation
  const sandbox = new ExecutionSandbox();
  const validAST = exec("node", ["-v"]);
  const result1 = sandbox.validate(validAST);
  check("Valid AST passes validation", result1.valid);

  // Test 2: Unsafe AST rejected
  const unsafeAST = exec("rm -rf /; echo hacked", []);
  const result2 = sandbox.validate(unsafeAST);
  check("Unsafe shell injection rejected", !result2.valid);

  // Test 3: Empty cmd rejected
  const emptyAST = exec("", []);
  const result3 = sandbox.validate(emptyAST);
  check("Empty cmd rejected", !result3.valid);

  // Test 4: ExecutionEngine.run with AST
  const engine = new ExecutionEngine();
  const result4 = await engine.run(exec("node", ["-e", "console.log('hello')"]));
  check("AST execution returns stdout", result4.stdout === "hello");
  check("AST execution returns exit 0", result4.exitCode === 0);
  check("AST execution has traceId", result4.traceId.length > 0);
  check("AST execution has durationMs", result4.durationMs >= 0);

  // Test 5: ResultNormalizer
  const caps = detectCapabilities();
  const normalized = ResultNormalizer.normalize("line1\r\nline2\r\n", "err\r\n", caps.pathStyle === "windows" ? "windows" : "linux");
  check("CRLF normalized to LF", normalized.stdout.includes("\n") && !normalized.stdout.includes("\r\n"));

  // Test 6: Platform capabilities
  const pcaps = detectCapabilities();
  check("Platform detected", pcaps.pathStyle === "windows" || pcaps.pathStyle === "unix");
  check("Shell detected", ["cmd", "bash", "pwsh"].includes(pcaps.shell));

  // Test 7: CommandCompiler
  const { CommandCompiler } = require("../compiler/CommandCompiler");
  const compiler = new CommandCompiler(pcaps);
  const compiled = compiler.compile(exec("node", ["-v"]));
  check("Compiler produces CompiledCommand", compiled.length === 1);
  check("CompiledCommand has executable", compiled[0].executable === "node");

  console.log(`\n  Results: ${pass} passed, ${fail} failed\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
