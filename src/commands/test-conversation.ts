/**
 * Test: Multi-Turn Conversation — ConversationManager and Safety Layer
 *
 * Verifies:
 * 1. ConversationManager create/addMessage/complete/fail lifecycle
 * 2. Multi-turn message history
 * 3. Conversation persistence and reload
 * 4. HopCounter message loop prevention
 * 5. MessageDeduplicator duplicate detection
 * 6. CircuitBreaker state transitions
 * 7. TimeBudget enforcement
 */
import { ConversationManager } from "../conversation/ConversationManager";
import { HopCounter } from "../safety/HopCounter";
import { MessageDeduplicator } from "../safety/MessageDeduplicator";
import { CircuitBreaker } from "../safety/CircuitBreaker";
import { TimeBudget } from "../safety/TimeBudget";
import { MessageEnvelope } from "../types";
import * as fs from "fs";
import * as path from "path";

const TEST_DIR = "/tmp/test-conversations-" + Date.now();

function makeEnvelope(
  from: string, to: string, taskId: string, convId: string,
  type: MessageEnvelope["type"], payload: any
): MessageEnvelope {
  return {
    id: `env-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    taskId,
    conversationId: convId,
    from,
    to,
    type,
    payload,
    metadata: { hopCount: 0, maxHops: 10, priority: 5, routingPath: [from] },
    timestamp: Date.now(),
  };
}

// ─── Tests ─────────────────────────────────────────────

function test1_ConversationLifecycle(): boolean {
  console.log("\n  [Test 1] Conversation Lifecycle");
  console.log("  ────────────────────────────────────");

  const dir = path.join(TEST_DIR, "conv-1");
  const mgr = new ConversationManager(dir);
  let pass = true;

  // Create
  const conv = mgr.create("task-1", ["executor", "reviewer"]);
  if (conv.status !== "active") { console.log("    ✗ Initial status not active"); pass = false; }
  else console.log("    ✓ Conversation created (active)");

  // Add messages
  const msg1 = makeEnvelope("executor", "reviewer", "task-1", conv.id, "TASK", { instruction: "do work" });
  mgr.addMessage(conv.id, msg1);

  const msg2 = makeEnvelope("reviewer", "executor", "task-1", conv.id, "REVIEW", { decision: "FAIL" });
  mgr.addMessage(conv.id, msg2);

  const msg3 = makeEnvelope("executor", "reviewer", "task-1", conv.id, "RESULT", { output: "fixed" });
  mgr.addMessage(conv.id, msg3);

  const msg4 = makeEnvelope("reviewer", "executor", "task-1", conv.id, "REVIEW", { decision: "PASS" });
  mgr.addMessage(conv.id, msg4);

  const messages = mgr.getMessages(conv.id);
  if (messages.length !== 4) { console.log(`    ✗ Message count: ${messages.length}`); pass = false; }
  else console.log("    ✓ 4 messages recorded");

  // Complete
  mgr.complete(conv.id);
  const updated = mgr.get(conv.id);
  if (updated?.status !== "completed") { console.log(`    ✗ Status: ${updated?.status}`); pass = false; }
  else console.log("    ✓ Conversation completed");

  // Can't add to completed
  try {
    mgr.addMessage(conv.id, makeEnvelope("x", "y", "task-1", conv.id, "TASK", {}));
    console.log("    ✗ Should have thrown on completed conversation");
    pass = false;
  } catch {
    console.log("    ✓ Cannot add message to completed conversation");
  }

  // getByTask
  const byTask = mgr.getByTask("task-1");
  if (byTask.length !== 1) { console.log(`    ✗ getByTask count: ${byTask.length}`); pass = false; }
  else console.log("    ✓ getByTask works");

  console.log(`\n  Test 1: ${pass ? "PASS ✓" : "FAIL ✗"}`);
  return pass;
}

function test2_ConversationPersistence(): boolean {
  console.log("\n  [Test 2] Conversation Persistence");
  console.log("  ────────────────────────────────────");

  const dir = path.join(TEST_DIR, "conv-2");
  let pass = true;

  // Create and populate
  const mgr1 = new ConversationManager(dir);
  const conv = mgr1.create("task-persist", ["a", "b"]);
  mgr1.addMessage(conv.id, makeEnvelope("a", "b", "task-persist", conv.id, "TASK", { data: 1 }));

  // Reload from disk
  const mgr2 = new ConversationManager(dir);
  const loaded = mgr2.get(conv.id);
  if (!loaded) { console.log("    ✗ Conversation not reloaded"); pass = false; }
  else if (loaded.messages.length !== 1) { console.log(`    ✗ Reloaded message count: ${loaded.messages.length}`); pass = false; }
  else console.log("    ✓ Conversation persisted and reloaded");

  console.log(`\n  Test 2: ${pass ? "PASS ✓" : "FAIL ✗"}`);
  return pass;
}

function test3_HopCounter(): boolean {
  console.log("\n  [Test 3] HopCounter");
  console.log("  ────────────────────────────────────");

  const hc = new HopCounter(3); // max 3 hops
  let pass = true;

  const msg = makeEnvelope("a", "b", "t1", "c1", "TASK", {});
  // Metadata starts at hopCount=0
  if (hc.isExceeded(msg)) { console.log("    ✗ Should not be exceeded at hop 0"); pass = false; }
  else console.log("    ✓ Not exceeded at hop 0");

  // Increment
  let current = hc.increment(msg); // hop 1
  current = hc.increment(current); // hop 2
  current = hc.increment(current); // hop 3

  if (!hc.isExceeded(current)) { console.log("    ✗ Should be exceeded at hop 3"); pass = false; }
  else console.log("    ✓ Exceeded at hop 3 (max)");

  // Cycle detection
  const msgWithPath = makeEnvelope("a", "b", "t1", "c1", "TASK", {});
  msgWithPath.metadata.routingPath = ["a", "b", "c"];
  if (!hc.wouldCreateCycle(msgWithPath, "b")) { console.log("    ✗ Cycle not detected"); pass = false; }
  else console.log("    ✓ Cycle detection works");

  if (hc.wouldCreateCycle(msgWithPath, "d")) { console.log("    ✗ False positive cycle"); pass = false; }
  else console.log("    ✓ No false positive cycle");

  console.log(`\n  Test 3: ${pass ? "PASS ✓" : "FAIL ✗"}`);
  return pass;
}

function test4_MessageDeduplicator(): boolean {
  console.log("\n  [Test 4] MessageDeduplicator");
  console.log("  ────────────────────────────────────");

  const dedup = new MessageDeduplicator(5000);
  let pass = true;

  const msg1 = makeEnvelope("a", "b", "t1", "c1", "TASK", { data: "hello" });
  const msg2 = makeEnvelope("a", "b", "t1", "c1", "TASK", { data: "hello" }); // same content
  const msg3 = makeEnvelope("a", "b", "t1", "c1", "TASK", { data: "different" }); // different

  if (dedup.isDuplicate(msg1)) { console.log("    ✗ First message flagged as dup"); pass = false; }
  else console.log("    ✓ First message not duplicate");

  if (!dedup.isDuplicate(msg2)) { console.log("    ✗ Duplicate not detected"); pass = false; }
  else console.log("    ✓ Duplicate detected");

  if (dedup.isDuplicate(msg3)) { console.log("    ✗ Different message flagged as dup"); pass = false; }
  else console.log("    ✓ Different message not duplicate");

  const stats = dedup.stats();
  if (stats.tracked < 2) { console.log(`    ✗ Stats tracked: ${stats.tracked}`); pass = false; }
  else console.log(`    ✓ Stats: ${stats.tracked} tracked`);

  console.log(`\n  Test 4: ${pass ? "PASS ✓" : "FAIL ✗"}`);
  return pass;
}

function test5_CircuitBreaker(): boolean {
  console.log("\n  [Test 5] CircuitBreaker");
  console.log("  ────────────────────────────────────");

  const cb = new CircuitBreaker({ threshold: 3, cooldownMs: 100 });
  let pass = true;

  // Initially available
  if (!cb.isAvailable("agent-1")) { console.log("    ✗ Should be available initially"); pass = false; }
  else console.log("    ✓ Initially available (closed)");

  // Record failures
  cb.recordFailure("agent-1");
  cb.recordFailure("agent-1");
  if (!cb.isAvailable("agent-1")) { console.log("    ✗ Should still be available after 2 failures"); pass = false; }
  else console.log("    ✓ Still available after 2 failures");

  cb.recordFailure("agent-1"); // 3rd failure → open
  if (cb.isAvailable("agent-1")) { console.log("    ✗ Should be unavailable after 3 failures"); pass = false; }
  else console.log("    ✓ Unavailable after threshold failures (open)");

  const state = cb.getState("agent-1");
  if (state.state !== "open") { console.log(`    ✗ State: ${state.state}`); pass = false; }
  else console.log("    ✓ State is 'open'");

  // Reset
  cb.reset("agent-1");
  if (!cb.isAvailable("agent-1")) { console.log("    ✗ Should be available after reset"); pass = false; }
  else console.log("    ✓ Available after reset");

  // Success resets failures
  cb.recordFailure("agent-2");
  cb.recordFailure("agent-2");
  cb.recordSuccess("agent-2");
  const state2 = cb.getState("agent-2");
  if (state2.failures !== 0) { console.log(`    ✗ Failures after success: ${state2.failures}`); pass = false; }
  else console.log("    ✓ Success resets failure count");

  console.log(`\n  Test 5: ${pass ? "PASS ✓" : "FAIL ✗"}`);
  return pass;
}

function test6_TimeBudget(): boolean {
  console.log("\n  [Test 6] TimeBudget");
  console.log("  ────────────────────────────────────");

  const tb = new TimeBudget();
  let pass = true;

  tb.create("task-1", { totalMs: 5000, perAgentMs: 2000, reviewCycleMs: 1000 });

  if (tb.isTotalExceeded("task-1")) { console.log("    ✗ Should not be exceeded initially"); pass = false; }
  else console.log("    ✓ Not exceeded initially");

  if (tb.remainingTotal("task-1") <= 0) { console.log("    ✗ Remaining should be positive"); pass = false; }
  else console.log("    ✓ Remaining time positive");

  // Check all
  const check = tb.checkAll("task-1");
  if (check.anyExceeded) { console.log("    ✗ Any exceeded should be false"); pass = false; }
  else console.log("    ✓ checkAll reports no violations");

  // Unknown task
  if (tb.isTotalExceeded("nonexistent")) { console.log("    ✗ Unknown task should not be exceeded"); pass = false; }
  else console.log("    ✓ Unknown task not exceeded");

  // Remove
  tb.remove("task-1");
  if (tb.getTracker("task-1")) { console.log("    ✗ Tracker should be removed"); pass = false; }
  else console.log("    ✓ Tracker removed");

  console.log(`\n  Test 6: ${pass ? "PASS ✓" : "FAIL ✗"}`);
  return pass;
}

// ─── Main ──────────────────────────────────────────────

function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  Test Suite: Conversation & Safety (Phase 2)");
  console.log("═══════════════════════════════════════════");

  const results: boolean[] = [];
  results.push(test1_ConversationLifecycle());
  results.push(test2_ConversationPersistence());
  results.push(test3_HopCounter());
  results.push(test4_MessageDeduplicator());
  results.push(test5_CircuitBreaker());
  results.push(test6_TimeBudget());

  // Cleanup
  try { fs.rmSync(TEST_DIR, { recursive: true, force: true }); } catch {}

  const passed = results.filter(Boolean).length;
  const total = results.length;

  console.log("\n═══════════════════════════════════════════");
  console.log(`  Results: ${passed}/${total} passed`);
  console.log("═══════════════════════════════════════════\n");

  if (passed < total) process.exit(1);
}

main();
