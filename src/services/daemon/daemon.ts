/**
 * Daemon Service - CLI command registration
 * Uses DaemonCommandRegistrar for clean, maintainable command setup
 */

import { Command } from 'commander';
import { DaemonCommandRegistrar } from './daemon-registrar.js';


export async function init_daemon(program: Command) {
  const registrar = new DaemonCommandRegistrar();
  await registrar.register(program);
}
