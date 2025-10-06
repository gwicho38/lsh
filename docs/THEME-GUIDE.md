# LSH Theme Guide

Make your shell beautiful! Import Oh-My-Zsh themes or use built-in themes for better readability.

## Quick Start

```bash
# Import your current ZSH theme
lsh theme from-zshrc --apply

# Or browse and choose a theme
lsh theme list
lsh theme preview robbyrussell
lsh theme apply robbyrussell --save
```

## Commands

### List Available Themes

```bash
lsh theme list                    # All themes
lsh theme list --builtin          # Built-in only
lsh theme list --ohmyzsh          # Oh-My-Zsh only
```

### Import Oh-My-Zsh Theme

```bash
lsh theme import half-life
lsh theme import agnoster
lsh theme import robbyrussell
```

### Preview Theme

```bash
lsh theme preview robbyrussell
lsh theme preview minimal
```

### Apply Theme

```bash
# Apply for current session
lsh theme apply robbyrussell

# Apply and save to ~/.lshrc (persistent)
lsh theme apply robbyrussell --save
```

### Import from .zshrc

```bash
# Import whatever theme you're using in ZSH
lsh theme from-zshrc --apply
```

### Check Current Theme

```bash
lsh theme current
```

### Reset to Default

```bash
lsh theme reset
```

## Built-in Themes

### default
Classic shell prompt with username, host, and directory.
```
user@hostname:~/projects$
```

### minimal
Clean, minimal prompt.
```
~/projects ❯
```

### powerline
Powerline-style with segments.
```
 user   ~/projects
```

### robbyrussell
Popular Oh-My-Zsh theme.
```
➜ ~/projects git:(main)
```

### simple
Simple colored prompt.
```
~/projects$
```

## Oh-My-Zsh Theme Support

LSH can import most Oh-My-Zsh themes! Popular themes include:

- **robbyrussell** - Simple and fast
- **agnoster** - Powerline-style
- **half-life** - Colorful with git info
- **bureau** - Detailed info
- **avit** - Clean and informative
- **bira** - Two-line with time
- **cloud** - Minimal cloud theme
- **dallas** - Dallas-inspired
- **eastwood** - Eastwood style
- **fino** - Detailed git info

### Import Any Oh-My-Zsh Theme

```bash
# List what's available
ls ~/.oh-my-zsh/themes/

# Import and preview
lsh theme import agnoster --preview

# Apply
lsh theme apply agnoster --save
```

## Theme Features

### What Gets Imported

✅ **Colors** - All color definitions
✅ **Prompts** - Left and right prompts
✅ **Git Info** - Branch, status indicators
✅ **Directory** - Current path with ~
✅ **User/Host** - Username and hostname
✅ **Time/Date** - Various formats
✅ **Virtualenv** - Python virtualenv display

### Automatic Conversions

ZSH format → LSH format:
- `%n` → username
- `%m` → hostname
- `%~` → current directory (with ~)
- `%T` → time (24h)
- `%D` → date
- `$vcs_info_msg_0_` → git info
- Color codes → ANSI colors

## Examples

### Example 1: Use Your ZSH Theme

```bash
# You're using "half-life" in ZSH
# Import it to LSH
lsh theme from-zshrc --apply

# Now LSH looks like your ZSH!
```

### Example 2: Try Different Themes

```bash
# Preview a few themes
lsh theme preview robbyrussell
lsh theme preview minimal
lsh theme preview powerline

# Apply the one you like
lsh theme apply minimal --save
```

### Example 3: Import Specific Theme

```bash
# Import agnoster theme
lsh theme import agnoster

# Preview it
lsh theme preview agnoster

# Apply and save
lsh theme apply agnoster --save
```

## Customization

### Edit Theme in .lshrc

After applying a theme, you can customize it in `~/.lshrc`:

```bash
# LSH Theme: robbyrussell
export LSH_PROMPT='\[\033[36m\]➜ \[\033[36m\]$(pwd | sed "s|^$HOME|~|") $(git_prompt_info)'
# End LSH Theme

# Add your customizations below
export LSH_PROMPT="${LSH_PROMPT} 🚀 "
```

### Create Custom Theme

Create `~/.lsh/themes/my-theme.lsh-theme`:

```json
{
  "name": "my-theme",
  "prompts": {
    "left": "\\[\\033[35m\\]λ \\[\\033[32m\\]%~ \\[\\033[0m\\]",
    "right": "\\[\\033[33m\\]%T\\[\\033[0m\\]"
  },
  "colors": {
    "purple": "35",
    "green": "32",
    "yellow": "33"
  }
}
```

Then apply:
```bash
lsh theme apply my-theme --save
```

## Troubleshooting

### Theme Not Found

```bash
# Check if Oh-My-Zsh is installed
ls ~/.oh-my-zsh/themes/

# List available themes
lsh theme list
```

### Theme Looks Wrong

```bash
# Reset and try again
lsh theme reset
lsh theme apply <name> --save
```

### Colors Not Working

Make sure your terminal supports colors:
```bash
# Check TERM variable
echo $TERM

# Should be something like:
# xterm-256color
# screen-256color
```

### Git Info Not Showing

Some themes require git. Make sure you're in a git repository:
```bash
cd ~/my-git-project
# Git info should appear in prompt
```

## Advanced

### Theme Structure

LSH themes are JSON files with:

```json
{
  "name": "theme-name",
  "prompts": {
    "left": "main prompt string",
    "right": "optional right prompt"
  },
  "colors": {
    "colorname": "ansi-code"
  },
  "gitFormats": {
    "branch": "git branch format",
    "unstaged": "unstaged indicator",
    "staged": "staged indicator"
  },
  "dependencies": ["git", "virtualenv"]
}
```

### ANSI Color Codes

- `30` = Black
- `31` = Red
- `32` = Green
- `33` = Yellow
- `34` = Blue
- `35` = Magenta
- `36` = Cyan
- `37` = White

### Prompt Escapes

- `%n` = Username
- `%m` = Hostname (short)
- `%M` = Hostname (full)
- `%~` = Current directory with ~
- `%/` = Current directory (full path)
- `%c` = Directory basename
- `%T` = Time (24h HH:MM)
- `%t` = Time (12h HH:MM AM/PM)
- `%D` = Date (MM/DD/YY)
- `%#` = # if root, $ otherwise

## Tips

1. ✅ Preview before applying
2. ✅ Use `--save` to make it permanent
3. ✅ Start with `lsh theme from-zshrc` to match your ZSH
4. ✅ Try built-in themes first (fast and reliable)
5. ✅ Customize in ~/.lshrc after applying

## See Also

- [ZSH Import Guide](./ZSH-IMPORT-GUIDE.md) - Import ZSH configs
- [Interactive Shell Guide](./INTERACTIVE-SHELL.md) - Shell features
