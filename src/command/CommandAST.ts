/**
 * CommandAST — typed command representation.
 * No raw shell strings allowed. All commands are AST nodes.
 */

export type CommandAST = ExecCommand | SequenceCommand | PipeCommand;

export interface ExecCommand {
  type: "exec";
  cmd: string;
  args: string[];
  env?: Record<string, string>;
  cwd?: string;
}

export interface SequenceCommand {
  type: "sequence";
  steps: CommandAST[];
}

export interface PipeCommand {
  type: "pipe";
  left: CommandAST;
  right: CommandAST;
}

/** Helper: create an exec command */
export function exec(cmd: string, args: string[] = [], env?: Record<string, string>, cwd?: string): ExecCommand {
  return { type: "exec", cmd, args, env, cwd };
}

/** Helper: create a sequence of commands */
export function sequence(...steps: CommandAST[]): SequenceCommand {
  return { type: "sequence", steps };
}

/** Helper: create a pipe between two commands */
export function pipe(left: CommandAST, right: CommandAST): PipeCommand {
  return { type: "pipe", left, right };
}
