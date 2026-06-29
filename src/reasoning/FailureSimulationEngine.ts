/**
 * Failure Simulation Engine — Architecture Reasoning Layer 5
 * 
 * 模拟：
 * - DB overload
 * - API saturation
 * - Queue backlog
 * - Single point of failure
 */

import { ArchitectureCandidate } from "./ArchitectureCandidateGenerator";

// Failure Simulation
export interface FailureSimulation {
  bottlenecks: string[];
  failureModes: string[];
  saturationPoints: string[];
  breakingConditions: string[];
}

export class FailureSimulationEngine {
  /**
   * 模拟故障
   */
  simulate(candidate: ArchitectureCandidate): FailureSimulation {
    const [pattern, db, backend] = candidate.type.split("+");

    return {
      bottlenecks: this.getBottlenecks(pattern, db, backend),
      failureModes: this.getFailureModes(pattern, db, backend),
      saturationPoints: this.getSaturationPoints(pattern, db, backend),
      breakingConditions: this.getBreakingConditions(pattern, db, backend)
    };
  }

  private getBottlenecks(pattern: string, db: string, backend: string): string[] {
    const bottlenecks: string[] = [];

    // DB overload
    if (db === "sqlite") {
      bottlenecks.push("SQLite write lock under concurrent load");
    }
    if (db === "postgres") {
      bottlenecks.push("Connection pool exhaustion at high concurrency");
    }

    // API saturation
    if (backend === "express") {
      bottlenecks.push("Single-threaded event loop saturation");
    }

    // Queue backlog
    if (pattern === "microservices") {
      bottlenecks.push("Message queue backlog under burst load");
    }

    return bottlenecks;
  }

  private getFailureModes(pattern: string, db: string, backend: string): string[] {
    const modes: string[] = [];

    modes.push("Database connection timeout");
    modes.push("API response timeout");
    
    if (pattern === "microservices") {
      modes.push("Service discovery failure");
      modes.push("Circuit breaker open");
    }

    return modes;
  }

  private getSaturationPoints(pattern: string, db: string, backend: string): string[] {
    const points: string[] = [];

    if (db === "sqlite") {
      points.push("~100 concurrent writes");
    }
    if (db === "postgres") {
      points.push("~10,000 concurrent connections");
    }
    if (backend === "express") {
      points.push("~10,000 requests/second per instance");
    }

    return points;
  }

  private getBreakingConditions(pattern: string, db: string, backend: string): string[] {
    const conditions: string[] = [];

    if (db === "sqlite") {
      conditions.push("Multiple writers will cause SQLITE_BUSY");
    }
    if (pattern === "monolith") {
      conditions.push("Single server memory limit");
    }

    return conditions;
  }
}
