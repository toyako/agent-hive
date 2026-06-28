/**
 * File System Tool
 */

import { Tool } from "./registry";
import * as fs from "fs";

export class FSTool implements Tool {
  name = "fs";

  async run(input: any): Promise<any> {
    const { action, path, content } = input;

    switch (action) {
      case "read":
        return fs.readFileSync(path, "utf-8");
      case "write":
        fs.writeFileSync(path, content);
        return { success: true };
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }
}
