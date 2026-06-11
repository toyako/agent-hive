/**
 * EvaluationMetrics — quantitative evaluation of Agent Hive components.
 */
export interface EvaluationMetrics {
  taskCompletionRate: number;
  taskSuccessRate: number;
  reviewAccuracy: number;
  judgeAccuracy: number;
  reviewFalsePositiveRate: number;
  reviewFalseNegativeRate: number;
  judgeIndependenceScore: number;
  retryRate: number;
  failureRate: number;
  averageExecutionTime: number;
}

export class EvaluationMetricsCollector {
  private results: { completed: boolean; success: boolean; reviewCorrect: boolean; judgeCorrect: boolean; reviewFP: boolean; reviewFN: boolean; judgeIndependent: boolean; retried: boolean; failed: boolean; executionTime: number }[] = [];

  record(r: { completed: boolean; success: boolean; reviewCorrect: boolean; judgeCorrect: boolean; reviewFP: boolean; reviewFN: boolean; judgeIndependent: boolean; retried: boolean; failed: boolean; executionTime: number }): void {
    this.results.push(r);
  }

  compute(): EvaluationMetrics {
    const n = this.results.length || 1;
    return {
      taskCompletionRate: this.results.filter(r => r.completed).length / n,
      taskSuccessRate: this.results.filter(r => r.success).length / n,
      reviewAccuracy: this.results.filter(r => r.reviewCorrect).length / n,
      judgeAccuracy: this.results.filter(r => r.judgeCorrect).length / n,
      reviewFalsePositiveRate: this.results.filter(r => r.reviewFP).length / n,
      reviewFalseNegativeRate: this.results.filter(r => r.reviewFN).length / n,
      judgeIndependenceScore: this.results.filter(r => r.judgeIndependent).length / n,
      retryRate: this.results.filter(r => r.retried).length / n,
      failureRate: this.results.filter(r => r.failed).length / n,
      averageExecutionTime: this.results.reduce((s, r) => s + r.executionTime, 0) / n,
    };
  }

  reset(): void { this.results = []; }
  count(): number { return this.results.length; }
}
