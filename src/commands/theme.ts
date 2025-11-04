/**
 * Theme Commands
 * Import, preview, and apply ZSH themes
 */

import { Command } from 'commander';
import { ThemeManager } from '../lib/theme-manager.js';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export function registerThemeCommands(program: Command): void {
  const themeCommand = program
    .command('theme')
    .description('Manage shell themes (import Oh-My-Zsh themes, apply built-in themes)');

  themeCommand
    .command('list')
    .description('List available themes')
    .option('--ohmyzsh', 'Show only Oh-My-Zsh themes')
    .option('--builtin', 'Show only built-in themes')
    .option('--custom', 'Show only custom themes')
    .action(async (options) => {
      const manager = new ThemeManager();
      const themes = manager.listThemes();

      console.log(chalk.bold('\n🎨 Available Themes\n'));

      if (!options.ohmyzsh && !options.custom || options.builtin) {
        console.log(chalk.cyan('Built-in Themes:'));
        themes.builtin.forEach(name => {
          console.log(`  ${chalk.green('✓')} ${name}`);
        });
        console.log('');
      }

      if (!options.builtin && !options.custom || options.ohmyzsh) {
        if (themes.ohmyzsh.length > 0) {
          console.log(chalk.cyan('Oh-My-Zsh Themes:'));
          themes.ohmyzsh.slice(0, 20).forEach(name => {
            console.log(`  ${chalk.yellow('◆')} ${name}`);
          });
          if (themes.ohmyzsh.length > 20) {
            console.log(chalk.dim(`  ... and ${themes.ohmyzsh.length - 20} more`));
          }
          console.log('');
        } else {
          console.log(chalk.dim('No Oh-My-Zsh themes found. Install Oh-My-Zsh first.'));
          console.log('');
        }
      }

      if (!options.builtin && !options.ohmyzsh || options.custom) {
        if (themes.custom.length > 0) {
          console.log(chalk.cyan('Custom Themes:'));
          themes.custom.forEach(name => {
            console.log(`  ${chalk.magenta('●')} ${name}`);
          });
        } else {
          console.log(chalk.dim('No custom themes found.'));
        }
        console.log('');
      }

      console.log(chalk.dim('Usage:'));
      console.log(chalk.dim('  lsh theme preview <name>'));
      console.log(chalk.dim('  lsh theme import <name>    # For Oh-My-Zsh themes'));
      console.log(chalk.dim('  lsh theme apply <name>'));
      console.log('');

      // Note: Removed process.exit(0) to allow proper Jest testing
      // Commander will handle exit automatically
    });

  themeCommand
    .command('import <name>')
    .description('Import Oh-My-Zsh theme')
    .option('--preview', 'Preview before importing')
    .action(async (name, options) => {
      try {
        const manager = new ThemeManager();

        console.log(chalk.dim(`Importing theme: ${name}...`));

        const theme = await manager.importOhMyZshTheme(name);

        console.log(chalk.green(`✓ Successfully imported theme: ${name}`));

        if (options.preview) {
          manager.previewTheme(theme);
        }

        console.log(chalk.dim('\nTo apply this theme:'));
        console.log(chalk.cyan(`  lsh theme apply ${name}`));
        console.log('');

        process.exit(0);
      } catch (error) {
        const err = error as Error;
        console.error(chalk.red(`✗ Failed to import theme: ${err.message}`));
        process.exit(1);
      }
    });

  themeCommand
    .command('preview <name>')
    .description('Preview theme without applying')
    .action(async (name) => {
      try {
        const manager = new ThemeManager();

        // Try to load theme
        let theme;
        try {
          theme = await manager.importOhMyZshTheme(name);
        } catch {
          // Try built-in
          theme = manager.getBuiltinTheme(name);
        }

        manager.previewTheme(theme);

        console.log(chalk.dim('To apply this theme:'));
        console.log(chalk.cyan(`  lsh theme apply ${name}`));
        console.log('');

        process.exit(0);
      } catch (_error) {
        console.error(chalk.red(`✗ Theme not found: ${name}`));
        console.log(chalk.dim('\nAvailable themes:'));
        console.log(chalk.dim('  lsh theme list'));
        process.exit(1);
      }
    });

  themeCommand
    .command('apply <name>')
    .description('Apply theme to current shell')
    .option('--save', 'Save to ~/.lshrc for persistent use')
    .action(async (name, options) => {
      try {
        const manager = new ThemeManager();

        // Try to import/load theme
        let theme;
        try {
          // Try as Oh-My-Zsh theme first
          theme = await manager.importOhMyZshTheme(name);
        } catch {
          // Try as built-in theme
          theme = manager.getBuiltinTheme(name);
        }

        const commands = manager.applyTheme(theme);

        console.log(chalk.green(`✓ Applied theme: ${name}`));
        console.log('');
        console.log(chalk.dim('Theme settings:'));
        console.log(commands);
        console.log('');

        if (options.save) {
          const lshrcPath = path.join(os.homedir(), '.lshrc');
          let lshrcContent = '';

          if (fs.existsSync(lshrcPath)) {
            lshrcContent = fs.readFileSync(lshrcPath, 'utf8');
            // Remove old theme settings
            lshrcContent = lshrcContent.replace(/# LSH Theme[\s\S]*?# End LSH Theme\n*/g, '');
          }

          const themeBlock = `
# LSH Theme: ${name}
${commands}
# End LSH Theme
`;

          lshrcContent += themeBlock;
          fs.writeFileSync(lshrcPath, lshrcContent, 'utf8');

          console.log(chalk.green('✓ Theme saved to ~/.lshrc'));
          console.log(chalk.dim('  Theme will be applied automatically on next shell start'));
        } else {
          console.log(chalk.dim('To save permanently:'));
          console.log(chalk.cyan(`  lsh theme apply ${name} --save`));
        }

        console.log('');

        process.exit(0);
      } catch (error) {
        const err = error as Error;
        console.error(chalk.red(`✗ Failed to apply theme: ${err.message}`));
        process.exit(1);
      }
    });

  themeCommand
    .command('current')
    .description('Show current theme')
    .action(() => {
      const lshrcPath = path.join(os.homedir(), '.lshrc');

      if (!fs.existsSync(lshrcPath)) {
        console.log(chalk.dim('No theme configured (using default)'));
        process.exit(0);
        return;
      }

      const content = fs.readFileSync(lshrcPath, 'utf8');
      const themeMatch = content.match(/# LSH Theme: (.+)/);

      if (themeMatch) {
        console.log(chalk.bold(`Current theme: ${chalk.cyan(themeMatch[1])}`));
      } else {
        console.log(chalk.dim('No theme configured (using default)'));
      }

      process.exit(0);
    });

  themeCommand
    .command('reset')
    .description('Reset to default theme')
    .action(() => {
      const lshrcPath = path.join(os.homedir(), '.lshrc');

      if (fs.existsSync(lshrcPath)) {
        let content = fs.readFileSync(lshrcPath, 'utf8');
        content = content.replace(/# LSH Theme[\s\S]*?# End LSH Theme\n*/g, '');
        fs.writeFileSync(lshrcPath, content, 'utf8');
      }

      console.log(chalk.green('✓ Reset to default theme'));
      console.log(chalk.dim('Restart shell to see changes'));

      process.exit(0);
    });

  themeCommand
    .command('from-zshrc')
    .description('Import current ZSH theme from ~/.zshrc')
    .option('--apply', 'Apply after importing')
    .action(async (options) => {
      try {
        const zshrcPath = path.join(os.homedir(), '.zshrc');

        if (!fs.existsSync(zshrcPath)) {
          console.error(chalk.red('✗ ~/.zshrc not found'));
          process.exit(1);
          return;
        }

        const zshrcContent = fs.readFileSync(zshrcPath, 'utf8');
        const themeMatch = zshrcContent.match(/ZSH_THEME="([^"]+)"/);

        if (!themeMatch) {
          console.error(chalk.red('✗ No theme found in ~/.zshrc'));
          process.exit(1);
          return;
        }

        const themeName = themeMatch[1];
        console.log(chalk.dim(`Found ZSH theme: ${themeName}`));

        const manager = new ThemeManager();
        const theme = await manager.importOhMyZshTheme(themeName);

        console.log(chalk.green(`✓ Imported theme: ${themeName}`));

        if (options.apply) {
          const commands = manager.applyTheme(theme);

          const lshrcPath = path.join(os.homedir(), '.lshrc');
          let lshrcContent = '';

          if (fs.existsSync(lshrcPath)) {
            lshrcContent = fs.readFileSync(lshrcPath, 'utf8');
            lshrcContent = lshrcContent.replace(/# LSH Theme[\s\S]*?# End LSH Theme\n*/g, '');
          }

          const themeBlock = `
# LSH Theme: ${themeName}
${commands}
# End LSH Theme
`;

          lshrcContent += themeBlock;
          fs.writeFileSync(lshrcPath, lshrcContent, 'utf8');

          console.log(chalk.green('✓ Theme applied and saved to ~/.lshrc'));
        } else {
          console.log(chalk.dim('\nTo apply:'));
          console.log(chalk.cyan(`  lsh theme apply ${themeName} --save`));
        }

        console.log('');
        process.exit(0);
      } catch (error) {
        const err = error as Error;
        console.error(chalk.red(`✗ Failed to import theme: ${err.message}`));
        process.exit(1);
      }
    });
}
