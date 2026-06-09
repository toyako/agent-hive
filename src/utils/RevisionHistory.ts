import * as fs from "fs";
import * as path from "path";
import { RevisionRecord } from "../types";

const HISTORY_DIR = path.resolve(process.cwd(), ".agent-hive/history");

export class RevisionHistory {
  private historyDir: string;

  constructor(baseDir?: string) {
    this.historyDir = baseDir || HISTORY_DIR;
    fs.mkdirSync(this.historyDir, { recursive: true });
  }

  add(record: RevisionRecord): void {
    const file = path.join(this.historyDir, `${record.taskId}.jsonl`);
    fs.appendFileSync(file, JSON.stringify(record) + "\n");
  }

  get(taskId: string): RevisionRecord[] {
    const file = path.join(this.historyDir, `${taskId}.jsonl`);
    if (!fs.existsSync(file)) return [];
    return fs
      .readFileSync(file, "utf-8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }

  all(): RevisionRecord[] {
    if (!fs.existsSync(this.historyDir)) return [];
    const files = fs.readdirSync(this.historyDir).filter((f) => f.endsWith(".jsonl"));
    const records: RevisionRecord[] = [];
    for (const f of files) {
      records.push(...this.get(f.replace(".jsonl", "")));
    }
    return records.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }
}
