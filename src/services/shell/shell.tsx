import { Command } from 'commander';
import { render } from "ink";
import React from "react";
import { Terminal } from "../../components/Terminal.js";

interface Spec {
  function: String;
}

export async function get_ishell(
  type: String = "Jvm",
  spec: Spec = { function: "currentUsage" }
) {}

export async function init_ishell(program: Command) {
  await cmd_interactive(program);
}

async function cmd_interactive(program: Command) {
  program
    .command("repl")
    .description("lsh interactive shell")
    .action(async (type: String, action: String, spec: Spec) => {
      // render(<UserInput userInput={program} Props={undefined} />);
      render(<Terminal/>);
    });
}