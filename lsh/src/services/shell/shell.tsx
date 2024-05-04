import { Command } from "commander";
import { Box, Text } from 'ink';
import React from "react";

interface Spec {
  function: String;
}

export async function get_ishell(
  type: String = "Jvm",
  spec: Spec = { function: "currentUsage" }
) {}

export async function init_ishell(program: Command) {
  cmd_interactive(program);
}

// Header Component
const Header = ({ version }) => (
  <Box justifyContent="space-between" height={1}>
    <Text color="green">MyShell</Text>
    <Text color="yellow">v{version}</Text>
  </Box>
);

// Footer Component
const Footer = () => (
  <Box justifyContent="space-between" height={1}>
    <Text color="green">-----</Text>
    <Text color="yellow">-----</Text>
  </Box>
);

async function cmd_interactive(program: Command) {
  program
    .command("repl")
    .description("lsh interactive shell")
    .action(() => console.log('hi'));
}
