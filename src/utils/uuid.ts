import * as crypto from "crypto";

export function uuid(): string {
  return crypto.randomUUID().slice(0, 8);
}
