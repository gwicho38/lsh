/**
 * Supabase Service - CLI command registration
 * Uses SupabaseCommandRegistrar for clean, maintainable command setup
 */

import { Command } from 'commander';
import { SupabaseCommandRegistrar } from './supabase-registrar.js';


export async function init_supabase(program: Command) {
  const registrar = new SupabaseCommandRegistrar();
  await registrar.register(program);
}
