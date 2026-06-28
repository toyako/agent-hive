/**
 * Scheduler — Production Runtime Phase 3
 * 
 * 支持：
 * - Cron
 * - Delay
 * - Interval
 * - Queue
 * - Webhook Trigger
 * - API Trigger
 */

// Schedule Type
export type ScheduleType = "cron" | "delay" | "interval" | "queue" | "webhook" | "api";

// Schedule Job
export interface ScheduleJob {
  id: string;
  type: ScheduleType;
  task: string;
  config: {
    cron?: string;
    delay?: number;
    interval?: number;
    webhookUrl?: string;
    apiEndpoint?: string;
  };
  enabled: boolean;
  lastRun?: number;
  nextRun?: number;
}

export class Scheduler {
  private jobs: Map<string, ScheduleJob> = new Map();

  /**
   * 添加定时任务
   */
  addJob(job: Omit<ScheduleJob, "id">): ScheduleJob {
    const fullJob: ScheduleJob = {
      ...job,
      id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    this.jobs.set(fullJob.id, fullJob);
    return fullJob;
  }

  /**
   * 删除任务
   */
  removeJob(jobId: string): boolean {
    return this.jobs.delete(jobId);
  }

  /**
   * 启用/禁用任务
   */
  toggleJob(jobId: string, enabled: boolean): boolean {
    const job = this.jobs.get(jobId);
    if (job) {
      job.enabled = enabled;
      return true;
    }
    return false;
  }

  /**
   * 获取所有任务
   */
  getJobs(): ScheduleJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * 获取任务
   */
  getJob(jobId: string): ScheduleJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * 获取需要执行的任务
   */
  getDueJobs(): ScheduleJob[] {
    const now = Date.now();
    return Array.from(this.jobs.values()).filter(job => {
      if (!job.enabled) return false;
      if (!job.nextRun) return true;
      return job.nextRun <= now;
    });
  }
}
