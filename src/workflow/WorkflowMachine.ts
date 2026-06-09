import { setup, assign, interpret } from "xstate";
import { TaskStatus, ReviewResult } from "../types";

// ─── Context ─────────────────────────────────────────

interface WorkflowContext {
  taskId: string;
  revisionCount: number;
  maxRevision: number;
  error?: string;
  // v2.0 multi-agent additions
  agentChain: string[];           // ordered list of agents to process
  currentAgentIndex: number;      // index into agentChain
  agentResults: Map<string, string>;  // agentId → result
  planningComplete: boolean;
}

// ─── Events ──────────────────────────────────────────

type WorkflowEvent =
  | { type: "START" }
  | { type: "EXEC_DONE" }
  | { type: "REVIEW_PASS"; result: ReviewResult }
  | { type: "REVIEW_FAIL"; result: ReviewResult }
  | { type: "REVISION_DONE" }
  | { type: "TIMEOUT" }
  | { type: "ERROR"; error: string }
  // v2.0 multi-agent events
  | { type: "PLAN_DONE"; agentChain: string[] }
  | { type: "AGENT_STEP_DONE"; agentId: string; result: string }
  | { type: "CHAIN_COMPLETE" }
  | { type: "NEXT_AGENT" };

// ─── v1.1 Machine (backward compatible) ──────────────

export const workflowMachine = setup({
  types: {
    context: {} as WorkflowContext,
    events: {} as WorkflowEvent,
    input: {} as { taskId: string; maxRevision: number },
  },
  guards: {
    canRevise: ({ context }) => context.revisionCount < context.maxRevision,
  },
  actions: {
    incrementRevision: assign({
      revisionCount: ({ context }) => context.revisionCount + 1,
    }),
    setError: assign({
      error: ({ event }) => {
        if ("error" in event) return (event as any).error;
        return undefined;
      },
    }),
  },
}).createMachine({
  id: "workflow",
  initial: "PENDING",
  context: ({ input }) => ({
    taskId: input.taskId,
    revisionCount: 0,
    maxRevision: input.maxRevision,
    agentChain: [],
    currentAgentIndex: 0,
    agentResults: new Map(),
    planningComplete: false,
  }),
  states: {
    PENDING: {
      on: { START: "EXECUTING" },
    },
    EXECUTING: {
      on: {
        EXEC_DONE: "REVIEWING",
        TIMEOUT: "FAILED",
        ERROR: { target: "FAILED", actions: "setError" },
      },
    },
    REVIEWING: {
      on: {
        REVIEW_PASS: "COMPLETED",
        REVIEW_FAIL: [
          {
            guard: "canRevise",
            target: "REVISION_REQUIRED",
            actions: "incrementRevision",
          },
          { target: "FAILED" },
        ],
      },
    },
    REVISION_REQUIRED: {
      on: {
        REVISION_DONE: "EXECUTING",
      },
    },
    COMPLETED: { type: "final" },
    FAILED: { type: "final" },
  },
});

// ─── v2.0 Multi-Agent Workflow Machine ──────────────

export const multiAgentWorkflowMachine = setup({
  types: {
    context: {} as WorkflowContext,
    events: {} as WorkflowEvent,
    input: {} as { taskId: string; maxRevision: number; agentChain?: string[] },
  },
  guards: {
    canRevise: ({ context }) => context.revisionCount < context.maxRevision,
    hasChain: ({ context }) => context.agentChain.length > 0,
    hasMoreAgents: ({ context }) =>
      context.currentAgentIndex < context.agentChain.length - 1,
    isLastAgent: ({ context }) =>
      context.currentAgentIndex >= context.agentChain.length - 1,
  },
  actions: {
    incrementRevision: assign({
      revisionCount: ({ context }) => context.revisionCount + 1,
    }),
    setError: assign({
      error: ({ event }) => {
        if ("error" in event) return (event as any).error;
        return undefined;
      },
    }),
    setAgentChain: assign({
      agentChain: ({ event }) => {
        if ("agentChain" in event) return (event as any).agentChain;
        return [];
      },
      planningComplete: () => true,
    }),
    advanceAgent: assign({
      currentAgentIndex: ({ context }) => context.currentAgentIndex + 1,
    }),
    recordAgentResult: assign({
      agentResults: ({ context, event }) => {
        const results = new Map(context.agentResults);
        if ("agentId" in event && "result" in event) {
          results.set((event as any).agentId, (event as any).result);
        }
        return results;
      },
    }),
    resetAgentIndex: assign({
      currentAgentIndex: () => 0,
    }),
  },
}).createMachine({
  id: "multi-agent-workflow",
  initial: "PENDING",
  context: ({ input }) => ({
    taskId: input.taskId,
    revisionCount: 0,
    maxRevision: input.maxRevision,
    agentChain: input.agentChain || [],
    currentAgentIndex: 0,
    agentResults: new Map(),
    planningComplete: false,
  }),
  states: {
    PENDING: {
      on: {
        START: [
          {
            guard: "hasChain",
            target: "EXECUTING",
          },
          {
            target: "PLANNING",
          },
        ],
      },
    },
    PLANNING: {
      on: {
        PLAN_DONE: {
          target: "EXECUTING",
          actions: "setAgentChain",
        },
        ERROR: { target: "FAILED", actions: "setError" },
      },
    },
    EXECUTING: {
      on: {
        EXEC_DONE: "REVIEWING",
        AGENT_STEP_DONE: [
          {
            guard: "hasMoreAgents",
            target: "EXECUTING",
            actions: ["recordAgentResult", "advanceAgent"],
          },
          {
            guard: "isLastAgent",
            target: "REVIEWING",
            actions: "recordAgentResult",
          },
        ],
        CHAIN_COMPLETE: "REVIEWING",
        TIMEOUT: "FAILED",
        ERROR: { target: "FAILED", actions: "setError" },
      },
    },
    REVIEWING: {
      on: {
        REVIEW_PASS: "COMPLETED",
        REVIEW_FAIL: [
          {
            guard: "canRevise",
            target: "REVISION_REQUIRED",
            actions: "incrementRevision",
          },
          { target: "FAILED" },
        ],
      },
    },
    REVISION_REQUIRED: {
      on: {
        REVISION_DONE: "EXECUTING",
        NEXT_AGENT: "EXECUTING",
      },
    },
    COMPLETED: { type: "final" },
    FAILED: { type: "final" },
  },
});

// ─── Helper: map state to TaskStatus ─────────────────

export function stateToStatus(state: string): TaskStatus {
  return state as TaskStatus;
}

// ─── Helper: create a multi-agent actor ──────────────

export function createMultiAgentActor(
  taskId: string,
  maxRevision: number,
  agentChain?: string[]
) {
  return interpret(multiAgentWorkflowMachine, {
    input: { taskId, maxRevision, agentChain },
  });
}
