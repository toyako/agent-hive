import { AgentAdapter, Task } from "../types";

export interface BenchmarkCase {
  id: string;
  category: "coding" | "review" | "planning" | "reasoning";
  name: string;
  instruction: string;
  evaluate: (output: string) => number; // 0-100 score
}

export interface BenchmarkResult {
  caseId: string;
  category: string;
  runtimeId: string;
  success: boolean;
  score: number;
  latencyMs: number;
  output: string;
}

/**
 * Benchmark Suite — predefined test cases for each category.
 */
export const BENCHMARK_CASES: BenchmarkCase[] = [
  // ── Category A: Coding ──
  {
    id: "code-01",
    category: "coding",
    name: "Hello World",
    instruction: "Write a JavaScript function called greet that takes a name and returns 'Hello, {name}!'. Return ONLY the code.",
    evaluate: (output) => {
      const hasFunction = output.includes("function greet") || output.includes("greet =") || output.includes("const greet");
      const hasReturn = output.includes("return") || output.includes("=>");
      const hasHello = output.includes("Hello");
      return (hasFunction ? 40 : 0) + (hasReturn ? 30 : 0) + (hasHello ? 30 : 0);
    },
  },
  {
    id: "code-02",
    category: "coding",
    name: "CRUD API",
    instruction: "Design a REST API schema for a User resource with fields: id, name, email. Return as JSON.",
    evaluate: (output) => {
      const hasId = output.includes("id");
      const hasName = output.includes("name");
      const hasEmail = output.includes("email");
      const isJson = output.includes("{") && output.includes("}");
      return (hasId ? 25 : 0) + (hasName ? 25 : 0) + (hasEmail ? 25 : 0) + (isJson ? 25 : 0);
    },
  },
  {
    id: "code-03",
    category: "coding",
    name: "Refactor",
    instruction: "Refactor this code to use async/await: function getData() { return fetch('/api').then(r => r.json()).then(d => d.items); }",
    evaluate: (output) => {
      const hasAsync = output.includes("async");
      const hasAwait = output.includes("await");
      const noThen = !output.includes(".then(");
      return (hasAsync ? 35 : 0) + (hasAwait ? 35 : 0) + (noThen ? 30 : 0);
    },
  },
  {
    id: "code-04",
    category: "coding",
    name: "Bug Fix",
    instruction: "Fix this bug: const sum = (a, b) => a + b; console.log(sum(1, '2')); What's wrong and how to fix it?",
    evaluate: (output) => {
      const identifiesType = output.includes("type") || output.includes("string") || output.includes("concatenat");
      const hasFix = output.includes("Number") || output.includes("parseInt") || output.includes("parseFloat") || output.includes("+") ;
      const hasExplanation = output.length > 50;
      return (identifiesType ? 40 : 0) + (hasFix ? 35 : 0) + (hasExplanation ? 25 : 0);
    },
  },

  // ── Category B: Review ──
  {
    id: "review-01",
    category: "review",
    name: "Security Review",
    instruction: "Review this code for security issues: app.get('/user', (req, res) => { const id = req.query.id; db.query('SELECT * FROM users WHERE id=' + id); });",
    evaluate: (output) => {
      const identifiesSQLi = output.toLowerCase().includes("sql injection") || output.includes("SQL");
      const identifiesSanitize = output.includes("parameterized") || output.includes("prepared") || output.includes("sanitize") || output.includes("escape");
      const hasRecommendation = output.length > 50;
      return (identifiesSQLi ? 45 : 0) + (identifiesSanitize ? 35 : 0) + (hasRecommendation ? 20 : 0);
    },
  },
  {
    id: "review-02",
    category: "review",
    name: "Architecture Review",
    instruction: "Review this architecture: Monolith with 500 tables, single database, no caching, synchronous processing. What are the risks?",
    evaluate: (output) => {
      const identifiesScale = output.toLowerCase().includes("scal") || output.includes("bottleneck");
      const identifiesSPOF = output.toLowerCase().includes("single point") || output.toLowerCase().includes("spof") || output.includes("availability");
      const hasSuggestions = output.includes("cache") || output.includes("microservice") || output.includes("async") || output.includes("queue");
      return (identifiesScale ? 35 : 0) + (identifiesSPOF ? 35 : 0) + (hasSuggestions ? 30 : 0);
    },
  },
  {
    id: "review-03",
    category: "review",
    name: "Code Review",
    instruction: "Review this function: function divide(a, b) { return a / b; } What's missing?",
    evaluate: (output) => {
      const identifiesDivisionByZero = output.includes("zero") || output.includes("0") || output.includes("division");
      const hasInputValidation = output.includes("check") || output.includes("valid") || output.includes("handle") || output.includes("throw");
      const hasErrorHandling = output.includes("error") || output.includes("exception") || output.includes("NaN") || output.includes("Infinity");
      return (identifiesDivisionByZero ? 40 : 0) + (hasInputValidation ? 30 : 0) + (hasErrorHandling ? 30 : 0);
    },
  },

  // ── Category C: Planning ──
  {
    id: "plan-01",
    category: "planning",
    name: "System Design",
    instruction: "Design a URL shortener system. List the main components and data flow.",
    evaluate: (output) => {
      const hasComponents = output.includes("database") || output.includes("cache") || output.includes("API");
      const hasFlow = output.includes("redirect") || output.includes("shorten") || output.includes("generate");
      const hasStorage = output.includes("store") || output.includes("mapping") || output.includes("hash");
      const depth = Math.min(output.length / 20, 30);
      return (hasComponents ? 25 : 0) + (hasFlow ? 25 : 0) + (hasStorage ? 20 : 0) + depth;
    },
  },
  {
    id: "plan-02",
    category: "planning",
    name: "Agent Design",
    instruction: "Design a multi-agent system for automated code review. What agents do you need and how do they collaborate?",
    evaluate: (output) => {
      const hasMultipleAgents = (output.match(/agent/gi) || []).length >= 2;
      const hasCollaboration = output.includes("collaborat") || output.includes("communicat") || output.includes("pass") || output.includes("share");
      const hasRoles = output.includes("reviewer") || output.includes("executor") || output.includes("planner") || output.includes("tester");
      const depth = Math.min(output.length / 20, 30);
      return (hasMultipleAgents ? 25 : 0) + (hasCollaboration ? 25 : 0) + (hasRoles ? 20 : 0) + depth;
    },
  },
  {
    id: "plan-03",
    category: "planning",
    name: "Workflow Design",
    instruction: "Design a CI/CD pipeline for a Node.js project with testing, linting, and deployment stages.",
    evaluate: (output) => {
      const hasTest = output.includes("test") || output.includes("jest") || output.includes("mocha");
      const hasLint = output.includes("lint") || output.includes("eslint") || output.includes("prettier");
      const hasDeploy = output.includes("deploy") || output.includes("production") || output.includes("release");
      const hasStages = output.includes("stage") || output.includes("step") || output.includes("phase") || output.includes("job");
      return (hasTest ? 25 : 0) + (hasLint ? 25 : 0) + (hasDeploy ? 25 : 0) + (hasStages ? 25 : 0);
    },
  },

  // ── Category D: Reasoning ──
  {
    id: "reason-01",
    category: "reasoning",
    name: "Escalation Decision",
    instruction: "A junior developer's code has been rejected 3 times. The issues are: missing error handling, no tests, inconsistent naming. What should happen next?",
    evaluate: (output) => {
      const hasEscalation = output.includes("escalat") || output.includes("senior") || output.includes("mentor") || output.includes("pair");
      const hasPrioritization = output.includes("priorit") || output.includes("first") || output.includes("critical");
      const hasAction = output.includes("review") || output.includes("guid") || output.includes("train") || output.includes("help");
      return (hasEscalation ? 40 : 0) + (hasPrioritization ? 30 : 0) + (hasAction ? 30 : 0);
    },
  },
  {
    id: "reason-02",
    category: "reasoning",
    name: "Multi-step Task",
    instruction: "You need to migrate a database from MySQL to PostgreSQL. List the steps in order.",
    evaluate: (output) => {
      const hasSchema = output.includes("schema") || output.includes("create table") || output.includes("DDL");
      const hasData = output.includes("data") || output.includes("migrat") || output.includes("export") || output.includes("import");
      const hasTest = output.includes("test") || output.includes("verify") || output.includes("validat");
      const hasRollback = output.includes("rollback") || output.includes("backup") || output.includes("revert");
      return (hasSchema ? 25 : 0) + (hasData ? 25 : 0) + (hasTest ? 25 : 0) + (hasRollback ? 25 : 0);
    },
  },
  {
    id: "reason-03",
    category: "reasoning",
    name: "Conflict Resolution",
    instruction: "Two microservices disagree on the data format for a shared event. Service A wants XML, Service B wants JSON. How do you resolve this?",
    evaluate: (output) => {
      const hasAdapter = output.includes("adapter") || output.includes("transform") || output.includes("convert") || output.includes("translator");
      const hasStandard = output.includes("standard") || output.includes("common") || output.includes("agree") || output.includes("contract");
      const hasEventDriven = output.includes("event") || output.includes("message") || output.includes("queue") || output.includes("broker");
      return (hasAdapter ? 35 : 0) + (hasStandard ? 35 : 0) + (hasEventDriven ? 30 : 0);
    },
  },
];
