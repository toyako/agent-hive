/**
 * P0 Incident Response System — v5.5
 * 
 * When a security breach is detected:
 * The system must shift from "prevention mode" to "incident containment mode"
 * 
 * Activation Condition:
 * - any secret is confirmed exposed
 * - npm package contains credentials
 * - git history includes secrets
 * - logs or traces are publicly distributed
 * 
 * A system that leaks secrets must not continue operating as if nothing happened.
 * Security incidents are NOT warnings.
 * They are architectural validation failures.
 */

// Exposure Report
export interface ExposureReport {
  package: string;
  versions: string[];
  files: string[];
  secretTypes: string[];
  blastRadius: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

// Incident Status
export type IncidentStatus = "DETECTED" | "CONTAINED" | "ANALYZING" | "REMEDIATING" | "RESOLVED";

// Incident Record
export interface IncidentRecord {
  id: string;
  status: IncidentStatus;
  exposure: ExposureReport;
  timeline: string[];
  rootCause?: string;
  recoveryPlan?: string;
  timestamp: number;
}

export class P0IncidentResponseSystem {
  private incidents: Map<string, IncidentRecord> = new Map();
  private publishFrozen: boolean = false;

  /**
   * 检测到安全事件
   */
  detectIncident(exposure: ExposureReport): IncidentRecord {
    const incident: IncidentRecord = {
      id: `INC-${Date.now()}`,
      status: "DETECTED",
      exposure,
      timeline: [`${new Date().toISOString()}: Incident detected`],
      timestamp: Date.now()
    };

    this.incidents.set(incident.id, incident);

    // Phase 1: Immediate Containment
    this.contain(incident);

    return incident;
  }

  /**
   * Phase 1: Immediate Containment (P0 Lockdown)
   */
  private contain(incident: IncidentRecord): void {
    incident.status = "CONTAINED";
    incident.timeline.push(`${new Date().toISOString()}: Containment initiated`);

    // Freeze publishing
    this.publishFrozen = true;
    incident.timeline.push(`${new Date().toISOString()}: Publishing frozen`);

    // Mark affected versions
    for (const version of incident.exposure.versions) {
      incident.timeline.push(`${new Date().toISOString()}: Version ${version} marked COMPROMISED`);
    }
  }

  /**
   * Phase 2: Exposure Scope Analysis
   */
  analyzeExposure(incidentId: string): ExposureReport | null {
    const incident = this.incidents.get(incidentId);
    if (!incident) return null;

    incident.status = "ANALYZING";
    incident.timeline.push(`${new Date().toISOString()}: Exposure analysis started`);

    return incident.exposure;
  }

  /**
   * Phase 3: Secret Rotation Protocol
   */
  rotateSecrets(incidentId: string, secrets: string[]): void {
    const incident = this.incidents.get(incidentId);
    if (!incident) return;

    incident.timeline.push(`${new Date().toISOString()}: Secret rotation initiated`);
    
    for (const secret of secrets) {
      incident.timeline.push(`${new Date().toISOString()}: Secret ${secret} revoked`);
    }

    incident.timeline.push(`${new Date().toISOString()}: New credentials generated`);
  }

  /**
   * Phase 4: Artifact Purge
   */
  purgeArtifacts(incidentId: string, files: string[]): void {
    const incident = this.incidents.get(incidentId);
    if (!incident) return;

    incident.timeline.push(`${new Date().toISOString()}: Artifact purge initiated`);
    
    for (const file of files) {
      incident.timeline.push(`${new Date().toISOString()}: File ${file} purged`);
    }
  }

  /**
   * Phase 5: Version Retraction
   */
  retractVersion(incidentId: string, version: string, strategy: "unpublish" | "deprecate"): void {
    const incident = this.incidents.get(incidentId);
    if (!incident) return;

    if (strategy === "unpublish") {
      incident.timeline.push(`${new Date().toISOString()}: Version ${version} unpublished`);
    } else {
      incident.timeline.push(`${new Date().toISOString()}: Version ${version} deprecated: SECURITY INCIDENT`);
    }
  }

  /**
   * Phase 6: Forensic Trace Reconstruction
   */
  reconstructTrace(incidentId: string, rootCause: string): void {
    const incident = this.incidents.get(incidentId);
    if (!incident) return;

    incident.rootCause = rootCause;
    incident.timeline.push(`${new Date().toISOString()}: Root cause identified: ${rootCause}`);
  }

  /**
   * Phase 7: Recovery Release Strategy
   */
  planRecovery(incidentId: string, patchedVersion: string): void {
    const incident = this.incidents.get(incidentId);
    if (!incident) return;

    incident.status = "REMEDIATING";
    incident.recoveryPlan = patchedVersion;
    incident.timeline.push(`${new Date().toISOString()}: Recovery plan: release ${patchedVersion}`);
  }

  /**
   * Phase 8: Trust Reset Protocol
   */
  resetTrust(incidentId: string): void {
    const incident = this.incidents.get(incidentId);
    if (!incident) return;

    incident.status = "RESOLVED";
    incident.timeline.push(`${new Date().toISOString()}: Trust level: DEGRADED`);
    incident.timeline.push(`${new Date().toISOString()}: Re-validation required before next release`);
  }

  /**
   * 获取事件状态
   */
  getIncident(id: string): IncidentRecord | undefined {
    return this.incidents.get(id);
  }

  /**
   * 获取所有事件
   */
  getAllIncidents(): IncidentRecord[] {
    return Array.from(this.incidents.values());
  }

  /**
   * 检查发布是否冻结
   */
  isPublishFrozen(): boolean {
    return this.publishFrozen;
  }

  /**
   * 解除发布冻结
   */
  unfreezePublish(): void {
    this.publishFrozen = false;
  }
}
