/**
 * Cron Service - CLI command registration
 * Uses CronCommandRegistrar for clean, maintainable command setup
 */

import { Command } from 'commander';
import { CronCommandRegistrar } from './cron-registrar.js';

export async function init_cron(program: Command) {
  const registrar = new CronCommandRegistrar();
  await registrar.register(program);
}
