/**
 * Shell Completion Commands
 * Generate shell completion scripts for bash and zsh
 */

import { Command } from 'commander';

/**
 * Generate bash completion script
 */
// TODO(@gwicho38): Review - generateBashCompletion
function generateBashCompletion(): string {
  return `# lsh bash completion script
# Source this file or add to ~/.bashrc:
#   source <(lsh completion bash)
# Or save to completion directory:
#   lsh completion bash > /etc/bash_completion.d/lsh

// TODO(@gwicho38): Review - _lsh_completion

_lsh_completion() {
    local cur prev words cword
    _init_completion || return

    local commands="help init doctor push pull list ls env key create sync status info get set delete supabase daemon cron self completion"
    local global_opts="-V --version -v --verbose -d --debug -h --help"

    # If we're completing the first word (command)
    if [ $` + `{cword} -eq 1 ]; then
        COMPREPLY=( $` + `(compgen -W "$` + `{commands} $` + `{global_opts}" -- "$` + `{cur}") )
        return 0
    fi

    # Get the command (first argument)
    local command="$` + `{words[1]}"

    case "$` + `{command}" in
        get)
            case "$` + `{prev}" in
                -f|--file)
                    COMPREPLY=( $` + `(compgen -f -- "$` + `{cur}") )
                    return 0
                    ;;
                --format)
                    COMPREPLY=( $(compgen -W "env json yaml toml export" -- "$cur") )
                    return 0
                    ;;
                *)
                    local opts="-f --file --all --export --format --exact -h --help"
                    COMPREPLY=( $(compgen -W "$opts" -- "$cur") )
                    return 0
                    ;;
            esac
            ;;
        set)
            case "$prev" in
                -f|--file)
                    COMPREPLY=( $(compgen -f -- "$cur") )
                    return 0
                    ;;
                *)
                    local opts="-f --file --stdin -h --help"
                    COMPREPLY=( $(compgen -W "$opts" -- "$cur") )
                    return 0
                    ;;
            esac
            ;;
        push|pull)
            case "$prev" in
                -f|--file)
                    COMPREPLY=( $(compgen -f -- "$cur") )
                    return 0
                    ;;
                -e|--env)
                    COMPREPLY=( $(compgen -W "dev development staging production prod test" -- "$cur") )
                    return 0
                    ;;
                *)
                    local opts="-f --file -e --env --force -h --help"
                    COMPREPLY=( $(compgen -W "$opts" -- "$cur") )
                    return 0
                    ;;
            esac
            ;;
        sync)
            case "$prev" in
                -f|--file)
                    COMPREPLY=( $(compgen -f -- "$cur") )
                    return 0
                    ;;
                -e|--env)
                    COMPREPLY=( $(compgen -W "dev development staging production prod test" -- "$cur") )
                    return 0
                    ;;
                *)
                    local opts="-f --file -e --env --dry-run --legacy --load --force -h --help"
                    COMPREPLY=( $(compgen -W "$opts" -- "$cur") )
                    return 0
                    ;;
            esac
            ;;
        list|ls)
            case "$prev" in
                -f|--file)
                    COMPREPLY=( $(compgen -f -- "$cur") )
                    return 0
                    ;;
                --format)
                    COMPREPLY=( $(compgen -W "env json yaml toml export" -- "$cur") )
                    return 0
                    ;;
                *)
                    local opts="-f --file --keys-only --format --no-mask -h --help"
                    COMPREPLY=( $(compgen -W "$opts" -- "$cur") )
                    return 0
                    ;;
            esac
            ;;
        env)
            case "$prev" in
                --format)
                    COMPREPLY=( $(compgen -W "env json yaml toml export" -- "$cur") )
                    return 0
                    ;;
                env)
                    COMPREPLY=( $(compgen -W "dev development staging production prod test" -- "$cur") )
                    return 0
                    ;;
                *)
                    local opts="--all-files --format -h --help"
                    COMPREPLY=( $(compgen -W "$opts" -- "$cur") )
                    return 0
                    ;;
            esac
            ;;
        key)
            local opts="--export -h --help"
            COMPREPLY=( $(compgen -W "$opts" -- "$cur") )
            return 0
            ;;
        create)
            case "$prev" in
                -f|--file)
                    COMPREPLY=( $(compgen -f -- "$cur") )
                    return 0
                    ;;
                *)
                    local opts="-f --file -t --template -h --help"
                    COMPREPLY=( $(compgen -W "$opts" -- "$cur") )
                    return 0
                    ;;
            esac
            ;;
        delete)
            case "$prev" in
                -f|--file)
                    COMPREPLY=( $(compgen -f -- "$cur") )
                    return 0
                    ;;
                *)
                    local opts="-f --file -y --yes -h --help"
                    COMPREPLY=( $(compgen -W "$opts" -- "$cur") )
                    return 0
                    ;;
            esac
            ;;
        status|info)
            case "$prev" in
                -f|--file)
                    COMPREPLY=( $(compgen -f -- "$cur") )
                    return 0
                    ;;
                -e|--env)
                    COMPREPLY=( $(compgen -W "dev development staging production prod test" -- "$cur") )
                    return 0
                    ;;
                *)
                    local opts="-f --file -e --env -h --help"
                    COMPREPLY=( $(compgen -W "$opts" -- "$cur") )
                    return 0
                    ;;
            esac
            ;;
        init|doctor)
            local opts="-h --help"
            COMPREPLY=( $(compgen -W "$opts" -- "$cur") )
            return 0
            ;;
        completion)
            local opts="bash zsh -h --help"
            COMPREPLY=( $(compgen -W "$opts" -- "$cur") )
            return 0
            ;;
        supabase|daemon|cron|self)
            # These have subcommands, just complete help for now
            local opts="-h --help"
            COMPREPLY=( $(compgen -W "$opts" -- "$cur") )
            return 0
            ;;
        *)
            # Default: complete global options
            COMPREPLY=( $(compgen -W "$global_opts" -- "$cur") )
            return 0
            ;;
    esac
}

complete -F _lsh_completion lsh
`;
}

/**
 * Generate zsh completion script
 */
// TODO(@gwicho38): Review - generateZshCompletion
function generateZshCompletion(): string {
  return `#compdef lsh
# lsh zsh completion script
# Install to: ~/.zsh/completions/_lsh
# Or source directly:
#   source <(lsh completion zsh)
# Make sure ~/.zsh/completions is in your fpath:
#   fpath=(~/.zsh/completions $fpath)
#   autoload -Uz compinit && compinit

// TODO(@gwicho38): Review - _lsh

_lsh() {
    local -a commands
    local -a global_opts
    local state line

    global_opts=(
        '(-V --version)'{-V,--version}'[Output version number]'
        '(-v --verbose)'{-v,--verbose}'[Verbose output]'
        '(-d --debug)'{-d,--debug}'[Debug mode]'
        '(-h --help)'{-h,--help}'[Display help]'
    )

    commands=(
        'help:Show detailed help'
        'init:Interactive setup wizard'
        'doctor:Health check and troubleshooting'
        'push:Push local .env to encrypted cloud storage'
        'pull:Pull .env from encrypted cloud storage'
        'list:List secrets in the current local .env file'
        'ls:List secrets (alias for list)'
        'env:List all stored environments'
        'key:Generate a new encryption key'
        'create:Create a new .env file'
        'sync:Automatically set up and synchronize secrets'
        'status:Get detailed secrets status'
        'info:Show current directory context'
        'get:Get a specific secret value'
        'set:Set a specific secret value'
        'delete:Delete .env file'
        'completion:Generate shell completion scripts'
        'supabase:Supabase database management'
        'daemon:LSH daemon management'
        'cron:Cron job management'
        'self:Manage and update LSH'
    )

    _arguments -C \
        $global_opts \
        '1: :->command' \
        '*:: :->args'

    case $state in
        command)
            _describe -t commands 'lsh commands' commands
            ;;
        args)
            case $line[1] in
                get)
                    _arguments \
                        '(-f --file)'{-f,--file}'[Path to .env file]:file:_files' \
                        '--all[Get all secrets]' \
                        '--export[Output in export format]' \
                        '--format[Output format]:format:(env json yaml toml export)' \
                        '--exact[Require exact key match]' \
                        '(-h --help)'{-h,--help}'[Display help]' \
                        '1:key:'
                    ;;
                set)
                    _arguments \
                        '(-f --file)'{-f,--file}'[Path to .env file]:file:_files' \
                        '--stdin[Read from stdin]' \
                        '(-h --help)'{-h,--help}'[Display help]' \
                        '1:key:' \
                        '2:value:'
                    ;;
                push|pull)
                    _arguments \
                        '(-f --file)'{-f,--file}'[Path to .env file]:file:_files' \
                        '(-e --env)'{-e,--env}'[Environment name]:environment:(dev development staging production prod test)' \
                        '--force[Force operation]' \
                        '(-h --help)'{-h,--help}'[Display help]'
                    ;;
                sync)
                    _arguments \
                        '(-f --file)'{-f,--file}'[Path to .env file]:file:_files' \
                        '(-e --env)'{-e,--env}'[Environment name]:environment:(dev development staging production prod test)' \
                        '--dry-run[Show what would be done]' \
                        '--legacy[Use legacy sync mode]' \
                        '--load[Output eval-able export commands]' \
                        '--force[Force sync]' \
                        '(-h --help)'{-h,--help}'[Display help]'
                    ;;
                list|ls)
                    _arguments \
                        '(-f --file)'{-f,--file}'[Path to .env file]:file:_files' \
                        '--keys-only[Show only keys]' \
                        '--format[Output format]:format:(env json yaml toml export)' \
                        '--no-mask[Show full values]' \
                        '(-h --help)'{-h,--help}'[Display help]'
                    ;;
                env)
                    _arguments \
                        '--all-files[List all tracked files]' \
                        '--format[Output format]:format:(env json yaml toml export)' \
                        '(-h --help)'{-h,--help}'[Display help]' \
                        '1:environment:(dev development staging production prod test)'
                    ;;
                key)
                    _arguments \
                        '--export[Output in export format]' \
                        '(-h --help)'{-h,--help}'[Display help]'
                    ;;
                create)
                    _arguments \
                        '(-f --file)'{-f,--file}'[Path to .env file]:file:_files' \
                        '(-t --template)'{-t,--template}'[Create with template]' \
                        '(-h --help)'{-h,--help}'[Display help]'
                    ;;
                delete)
                    _arguments \
                        '(-f --file)'{-f,--file}'[Path to .env file]:file:_files' \
                        '(-y --yes)'{-y,--yes}'[Skip confirmation]' \
                        '(-h --help)'{-h,--help}'[Display help]'
                    ;;
                status|info)
                    _arguments \
                        '(-f --file)'{-f,--file}'[Path to .env file]:file:_files' \
                        '(-e --env)'{-e,--env}'[Environment name]:environment:(dev development staging production prod test)' \
                        '(-h --help)'{-h,--help}'[Display help]'
                    ;;
                completion)
                    _arguments \
                        '(-h --help)'{-h,--help}'[Display help]' \
                        '1:shell:(bash zsh)'
                    ;;
                init|doctor|help)
                    _arguments \
                        '(-h --help)'{-h,--help}'[Display help]'
                    ;;
            esac
            ;;
    esac
}

_lsh "$@"
`;
}

/**
 * Register completion commands
 */
// TODO(@gwicho38): Review - registerCompletionCommands
export function registerCompletionCommands(program: Command): void {
  program
    .command('completion <shell>')
    .description('Generate shell completion script (bash or zsh)')
    .action((shell: string) => {
      const shellLower = shell.toLowerCase();

      if (shellLower === 'bash') {
        console.log(generateBashCompletion());
      } else if (shellLower === 'zsh') {
        console.log(generateZshCompletion());
      } else {
        console.error(`❌ Unknown shell: ${shell}`);
        console.error('Supported shells: bash, zsh');
        console.error('');
        console.error('Usage:');
        console.error('  lsh completion bash > ~/.lsh-completion.bash');
        console.error('  lsh completion zsh > ~/.zsh/completions/_lsh');
        process.exit(1);
      }
    });
}

export default registerCompletionCommands;
