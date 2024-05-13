import shell from "shelljs";

export function cmd_rand() {
  return Math.random();
}

export function cmd_test() {
  shell.echo("gshell.ts | cmd_test");
}
