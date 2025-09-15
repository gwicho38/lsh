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
      // Check if raw mode is supported before rendering
      if (process.stdin.isTTY && process.stdin.setRawMode !== undefined) {
        render(<Terminal/>);
      } else {
        console.log('⚠️  Interactive mode not supported');
        console.log('Raw mode is not supported in this environment.');
        console.log('To use the interactive REPL, run this command in a proper terminal:');
        console.log('  npm start repl');
        console.log('or');
        console.log('  node dist/app.js repl');
        console.log('For testing, use the shell lib functions directly in your Node.js code.');
        process.exit(1);
      }
    });
}