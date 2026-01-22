/**
 * Cron Service - CLI command registration
 * Uses CronCommandRegistrar for clean, maintainable command setup
 */

import { Command } from 'commander';
import { CronCommandRegistrar } from './cron-registrar.js';

// TODO(@gwicho38): Review - init_cron

// TODO(@gwicho38): Review - init_cron
export async function init_cron(program: Command) {
  const registrar = new CronCommandRegistrar();
  await registrar.register(program);
}
