import * as shell from "shelljs";

export function cmd_rand() {
  return Math.random();
}

export function cmd_shelltest() {
  shell.echo("cmd_shelltest");
}

export function dummy() {
  return 1;
}
