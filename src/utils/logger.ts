import * as fs from "fs";
import * as path from "path";

const LOGS_DIR = path.resolve(process.cwd(), ".agent-hive/logs");

export class Logger {
  private logDir: string;

  constructor(taskId: string, agentName: string) {
    this.logDir = path.join(LOGS_DIR, taskId);
    fs.mkdirSync(this.logDir, { recursive: true });
    this.agentName = agentName;
    this.logFile = path.join(this.logDir, `${agentName}.log`);
  }

  private agentName: string;
  private logFile: string;

  log(entry: {
    from: string;
    to: string;
    prompt?: string;
    response?: string;
    type: string;
  }): void {
    const record = {
      taskId: path.basename(this.logDir),
      ...entry,
      timestamp: new Date().toISOString(),
    };
    fs.appendFileSync(
      this.logFile,
      JSON.stringify(record) + "\n"
    );
  }

  info(msg: string): void {
    this.log({ from: this.agentName, to: "system", response: msg, type: "INFO" });
  }

  error(msg: string): void {
    this.log({ from: this.agentName, to: "system", response: msg, type: "ERROR" });
  }
}
