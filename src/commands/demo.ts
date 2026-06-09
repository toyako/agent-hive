/**
 * Demo: Agent Hive v1.1 — Mock mode (architecture verification)
 */
import { Broker } from "../broker/Broker";
import { MockCodexAdapter } from "../adapters/MockCodexAdapter";
import { MockClaudeAdapter } from "../adapters/MockClaudeAdapter";

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║     Agent Hive v1.1 — Mock Demo         ║");
  console.log("╚══════════════════════════════════════════╝\n");

  // ── Scenario 1: Direct pass ──
  console.log("━━━ Scenario 1: Direct Pass ━━━\n");
  {
    const broker = new Broker();
    await broker.registerAdapter(new MockCodexAdapter());
    await broker.registerAdapter(new MockClaudeAdapter({ failCount: 0 }));
    broker.registry.link("codex", "claude");

    broker.submit({
      instruction: "Optimize Navbar.vue scroll animation",
      executor: "codex",
      reviewer: "claude",
    });

    await broker.run();
  }

  console.log("\n━━━ Scenario 2: Revision Loop (fail 2x then pass) ━━━\n");
  {
    const broker = new Broker();
    await broker.registerAdapter(new MockCodexAdapter());
    await broker.registerAdapter(new MockClaudeAdapter({ failCount: 2 }));
    broker.registry.link("codex", "claude");

    broker.submit({
      instruction: "Refactor authentication module",
      executor: "codex",
      reviewer: "claude",
      maxRevision: 3,
    });

    await broker.run();

    // Show revision history
    const history = broker.history.get(broker.listTasks()[0]?.id || "");
    if (history.length) {
      console.log("  Revision History:");
      for (const r of history) {
        console.log(`    #${r.attempt}: ${r.decision} (score=${r.score})`);
      }
    }
  }

  console.log("\n━━━ Scenario 3: Max Revision Exceeded ━━━\n");
  {
    const broker = new Broker();
    await broker.registerAdapter(new MockCodexAdapter());
    await broker.registerAdapter(new MockClaudeAdapter({ failCount: 10 }));
    broker.registry.link("codex", "claude");

    broker.submit({
      instruction: "Implement impossible feature",
      executor: "codex",
      reviewer: "claude",
      maxRevision: 2,
    });

    await broker.run();
  }

  console.log("╔══════════════════════════════════════════╗");
  console.log("║            Demo Complete                 ║");
  console.log("╚══════════════════════════════════════════╝");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
