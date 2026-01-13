/**
 * Storacha Commands
 * Manage Storacha (IPFS network) authentication and configuration
 */

import { Command } from 'commander';
import { getStorachaClient } from '../lib/storacha-client.js';

export function registerStorachaCommands(program: Command) {
  const storacha = program
    .command('storacha')
    .description('Manage Storacha (IPFS network) sync');

  // Login command
  storacha
    .command('login <email>')
    .description('Authenticate with Storacha via email')
    .action(async (email: string) => {
      try {
        const client = getStorachaClient();

        console.log('\n🔐 Storacha Authentication\n');
        console.log('━'.repeat(60));
        console.log('');

        await client.login(email);

      } catch (error) {
        const err = error as Error;
        console.error('\n❌ Authentication failed:', err.message);
        console.error('');
        console.error('💡 Troubleshooting:');
        console.error('   - Check your email for the verification link');
        console.error('   - Complete signup at: https://console.storacha.network/');
        console.error('   - Ensure you have an active internet connection');
        console.error('');
        process.exit(1);
      }
    });

  // Status command
  storacha
    .command('status')
    .description('Show Storacha authentication and configuration status')
    .action(async () => {
      try {
        const client = getStorachaClient();
        const status = await client.getStatus();

        console.log('\n☁️  Storacha Status\n');
        console.log('━'.repeat(60));
        console.log('');

        // Authentication status
        console.log('🔐 Authentication:');
        if (status.authenticated) {
          console.log(`   Status: ✅ Authenticated`);
          if (status.email) {
            console.log(`   Email: ${status.email}`);
          }
        } else {
          console.log(`   Status: ❌ Not authenticated`);
          console.log('');
          console.log('💡 To authenticate:');
          console.log('   lsh storacha login [email protected]');
        }
        console.log('');

        // Network sync status
        console.log('🌐 Network Sync:');
        console.log(`   Enabled: ${status.enabled ? '✅ Yes' : '❌ No'}`);
        if (!status.enabled) {
          console.log('');
          console.log('💡 To enable:');
          console.log('   export LSH_STORACHA_ENABLED=true');
          console.log('   # Add to ~/.bashrc or ~/.zshrc for persistence');
        }
        console.log('');

        // Spaces status
        if (status.authenticated) {
          console.log('📦 Spaces:');
          if (status.spaces.length === 0) {
            console.log('   No spaces found');
            console.log('');
            console.log('💡 Create a space:');
            console.log('   lsh storacha space create my-space');
          } else {
            console.log(`   Total: ${status.spaces.length}`);
            if (status.currentSpace) {
              console.log(`   Current: ${status.currentSpace}`);
            }
            console.log('');
            console.log('   Available spaces:');
            status.spaces.forEach(space => {
              const marker = space.name === status.currentSpace ? '→' : ' ';
              console.log(`   ${marker} ${space.name}`);
            });
          }
          console.log('');
        }

        // Quick actions
        console.log('💡 Quick Actions:');
        if (!status.authenticated) {
          console.log('   lsh storacha login [email protected]');
        } else if (!status.enabled) {
          console.log('   export LSH_STORACHA_ENABLED=true');
        } else {
          console.log('   lsh push    # Will sync to Storacha network');
          console.log('   lsh pull    # Will download from Storacha if needed');
        }
        console.log('');
        console.log('━'.repeat(60));
        console.log('');

      } catch (error) {
        const err = error as Error;
        console.error('❌ Failed to get status:', err.message);
        process.exit(1);
      }
    });

  // Space commands
  const space = storacha
    .command('space')
    .description('Manage Storacha spaces');

  space
    .command('create <name>')
    .description('Create a new space')
    .action(async (name: string) => {
      try {
        const client = getStorachaClient();

        const status = await client.getStatus();
        if (!status.authenticated) {
          console.error('❌ Not authenticated');
          console.error('');
          console.error('💡 First, authenticate:');
          console.error('   lsh storacha login [email protected]');
          process.exit(1);
        }

        console.log(`\n🆕 Creating space: ${name}...\n`);
        await client.createSpace(name);
        console.log('');

      } catch (error) {
        const err = error as Error;
        console.error('\n❌ Failed to create space:', err.message);
        process.exit(1);
      }
    });

  space
    .command('auto')
    .description('Auto-select space based on current project (git repo or directory name)')
    .action(async () => {
      try {
        const client = getStorachaClient();

        const status = await client.getStatus();
        if (!status.authenticated) {
          console.error('❌ Not authenticated');
          console.error('');
          console.error('💡 First, authenticate:');
          console.error('   lsh storacha login [email protected]');
          process.exit(1);
        }

        const projectName = client.getProjectName();
        console.log(`\n🔍 Detected project: ${projectName}\n`);

        const spaceName = await client.ensureProjectSpace();
        console.log(`✅ Active space: ${spaceName}\n`);

      } catch (error) {
        const err = error as Error;
        console.error('\n❌ Failed to auto-select space:', err.message);
        process.exit(1);
      }
    });

  space
    .command('use <name>')
    .description('Switch to a specific space')
    .action(async (name: string) => {
      try {
        const client = getStorachaClient();

        const status = await client.getStatus();
        if (!status.authenticated) {
          console.error('❌ Not authenticated');
          console.error('');
          console.error('💡 First, authenticate:');
          console.error('   lsh storacha login [email protected]');
          process.exit(1);
        }

        const found = await client.selectSpace(name);
        if (found) {
          console.log(`\n✅ Switched to space: ${name}\n`);
        } else {
          console.error(`\n❌ Space not found: ${name}`);
          console.error('');
          console.error('💡 To list available spaces:');
          console.error('   lsh storacha space list');
          console.error('');
          console.error('💡 To create a new space:');
          console.error(`   lsh storacha space create ${name}`);
          process.exit(1);
        }

      } catch (error) {
        const err = error as Error;
        console.error('\n❌ Failed to switch space:', err.message);
        process.exit(1);
      }
    });

  space
    .command('list')
    .description('List all spaces')
    .action(async () => {
      try {
        const client = getStorachaClient();
        const status = await client.getStatus();

        if (!status.authenticated) {
          console.error('❌ Not authenticated');
          console.error('');
          console.error('💡 First, authenticate:');
          console.error('   lsh storacha login [email protected]');
          process.exit(1);
        }

        console.log('\n📦 Storacha Spaces\n');
        console.log('━'.repeat(60));
        console.log('');

        if (status.spaces.length === 0) {
          console.log('No spaces found');
          console.log('');
          console.log('💡 Create a space:');
          console.log('   lsh storacha space create my-space');
        } else {
          status.spaces.forEach((space, index) => {
            const marker = space.name === status.currentSpace ? '→' : ' ';
            console.log(`${marker} ${index + 1}. ${space.name}`);
            console.log(`   DID: ${space.did}`);
            console.log(`   Registered: ${space.registered}`);
            console.log('');
          });

          if (status.currentSpace) {
            console.log(`Current space: ${status.currentSpace}`);
          }
        }

        console.log('━'.repeat(60));
        console.log('');

      } catch (error) {
        const err = error as Error;
        console.error('❌ Failed to list spaces:', err.message);
        process.exit(1);
      }
    });

  // Enable/disable commands
  storacha
    .command('enable')
    .description('Enable Storacha network sync')
    .action(() => {
      const client = getStorachaClient();
      client.enable();
      console.log('');
      console.log('💡 For persistence, add to your shell profile:');
      console.log('   echo "export LSH_STORACHA_ENABLED=true" >> ~/.bashrc');
      console.log('   # or ~/.zshrc for zsh');
      console.log('');
    });

  storacha
    .command('disable')
    .description('Disable Storacha network sync (local cache only)')
    .action(() => {
      const client = getStorachaClient();
      client.disable();
      console.log('');
    });
}
