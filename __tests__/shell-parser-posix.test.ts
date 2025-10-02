/**
 * POSIX Shell Grammar Parser Tests
 * Validates full POSIX shell grammar parsing capabilities
 * Tests for Issue #28
 */

import {
  parseShellCommand,
  TokenType,
  SimpleCommand,
  Pipeline,
  CommandList,
  Subshell,
  CommandGroup,
  IfStatement,
  ForStatement,
  WhileStatement,
  CaseStatement,
  FunctionDefinition
} from '../src/lib/shell-parser';

describe('POSIX Shell Grammar Parser', () => {
  describe('Simple Commands', () => {
    test('should parse simple command with arguments', () => {
      const ast = parseShellCommand('ls -la /tmp');
      expect(ast.type).toBe('SimpleCommand');
      if (ast.type === 'SimpleCommand') {
        const cmd = ast as SimpleCommand;
        expect(cmd.name).toBe('ls');
        expect(cmd.args).toEqual(['-la', '/tmp']);
      }
    });

    test('should parse command with environment variables', () => {
      const ast = parseShellCommand('ENV=prod node app.js');
      expect(ast.type).toBe('SimpleCommand');
    });
  });

  describe('Pipelines', () => {
    test('should parse simple pipeline', () => {
      const ast = parseShellCommand('ls | grep test');
      expect(ast.type).toBe('Pipeline');
      if (ast.type === 'Pipeline') {
        const pipe = ast as Pipeline;
        expect(pipe.commands).toHaveLength(2);
        expect(pipe.commands[0].type).toBe('SimpleCommand');
        expect(pipe.commands[1].type).toBe('SimpleCommand');
      }
    });

    test('should parse multi-stage pipeline', () => {
      const ast = parseShellCommand('cat file.txt | grep pattern | sort | uniq');
      expect(ast.type).toBe('Pipeline');
      if (ast.type === 'Pipeline') {
        const pipe = ast as Pipeline;
        expect(pipe.commands).toHaveLength(4);
      }
    });
  });

  describe('Command Lists', () => {
    test('should parse sequential commands with semicolon', () => {
      const ast = parseShellCommand('cd /tmp; ls');
      expect(ast.type).toBe('CommandList');
      if (ast.type === 'CommandList') {
        const list = ast as CommandList;
        expect(list.operator).toBe(';');
        expect(list.left.type).toBe('SimpleCommand');
        expect(list.right?.type).toBe('SimpleCommand');
      }
    });

    test('should parse AND command list', () => {
      const ast = parseShellCommand('test -f file && cat file');
      expect(ast.type).toBe('CommandList');
      if (ast.type === 'CommandList') {
        const list = ast as CommandList;
        expect(list.operator).toBe('&&');
      }
    });

    test('should parse OR command list', () => {
      const ast = parseShellCommand('test -f file || echo "not found"');
      expect(ast.type).toBe('CommandList');
      if (ast.type === 'CommandList') {
        const list = ast as CommandList;
        expect(list.operator).toBe('||');
      }
    });

    test('should parse complex command list with mixed operators', () => {
      const ast = parseShellCommand('cmd1 && cmd2 || cmd3; cmd4');
      expect(ast.type).toBe('CommandList');
      // This will be a nested CommandList structure
    });
  });

  describe('Subshells', () => {
    test('should parse subshell', () => {
      const ast = parseShellCommand('(cd /tmp && ls)');
      expect(ast.type).toBe('Subshell');
      if (ast.type === 'Subshell') {
        const subshell = ast as Subshell;
        expect(subshell.command.type).toBe('CommandList');
      }
    });

    test('should parse nested subshells', () => {
      const ast = parseShellCommand('(cd /tmp && (ls | wc -l))');
      expect(ast.type).toBe('Subshell');
    });
  });

  describe('Command Groups', () => {
    test('should parse command group', () => {
      const ast = parseShellCommand('{ echo start; ls; echo end; }');
      expect(ast.type).toBe('CommandGroup');
      if (ast.type === 'CommandGroup') {
        const group = ast as CommandGroup;
        expect(group.command.type).toBe('CommandList');
      }
    });
  });

  describe('Background Processes', () => {
    test('should parse background command', () => {
      const ast = parseShellCommand('sleep 100 &');
      expect(ast.type).toBe('CommandList');
      if (ast.type === 'CommandList') {
        const list = ast as CommandList;
        expect(list.operator).toBe('&');
        expect(list.left.type).toBe('SimpleCommand');
      }
    });

    test('should parse background pipeline', () => {
      const ast = parseShellCommand('ls | grep test &');
      expect(ast.type).toBe('CommandList');
      if (ast.type === 'CommandList') {
        const list = ast as CommandList;
        expect(list.operator).toBe('&');
        expect(list.left.type).toBe('Pipeline');
      }
    });
  });

  describe('Redirections', () => {
    test('should parse output redirection', () => {
      const ast = parseShellCommand('echo hello > output.txt');
      expect(ast.type).toBe('SimpleCommand');
      if (ast.type === 'SimpleCommand') {
        const cmd = ast as SimpleCommand;
        expect(cmd.redirections).toHaveLength(1);
        expect(cmd.redirections[0].type).toBe('output');
      }
    });

    test('should parse input redirection', () => {
      const ast = parseShellCommand('cat < input.txt');
      expect(ast.type).toBe('SimpleCommand');
      if (ast.type === 'SimpleCommand') {
        const cmd = ast as SimpleCommand;
        expect(cmd.redirections).toHaveLength(1);
        expect(cmd.redirections[0].type).toBe('input');
      }
    });

    test('should parse append redirection', () => {
      const ast = parseShellCommand('echo line >> file.txt');
      expect(ast.type).toBe('SimpleCommand');
      if (ast.type === 'SimpleCommand') {
        const cmd = ast as SimpleCommand;
        expect(cmd.redirections[0].type).toBe('append');
      }
    });

    test('should parse heredoc', () => {
      const ast = parseShellCommand('cat << EOF\\nline1\\nline2\\nEOF');
      expect(ast.type).toBe('SimpleCommand');
      if (ast.type === 'SimpleCommand') {
        const cmd = ast as SimpleCommand;
        expect(cmd.redirections[0].type).toBe('heredoc');
      }
    });

    test('should parse multiple redirections', () => {
      const ast = parseShellCommand('command < input.txt > output.txt 2> error.txt');
      expect(ast.type).toBe('SimpleCommand');
      if (ast.type === 'SimpleCommand') {
        const cmd = ast as SimpleCommand;
        expect(cmd.redirections.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Control Structures', () => {
    test('should parse if statement', () => {
      const ast = parseShellCommand('if test -f file; then cat file; fi');
      expect(ast.type).toBe('IfStatement');
      if (ast.type === 'IfStatement') {
        const ifStmt = ast as IfStatement;
        expect(ifStmt.condition).toBeDefined();
        expect(ifStmt.thenClause).toBeDefined();
      }
    });

    test('should parse if-else statement', () => {
      const ast = parseShellCommand('if test -f file; then cat file; else echo "not found"; fi');
      expect(ast.type).toBe('IfStatement');
      if (ast.type === 'IfStatement') {
        const ifStmt = ast as IfStatement;
        expect(ifStmt.elseClause).toBeDefined();
      }
    });

    test('should parse for loop', () => {
      const ast = parseShellCommand('for i in 1 2 3; do echo $i; done');
      expect(ast.type).toBe('ForStatement');
      if (ast.type === 'ForStatement') {
        const forStmt = ast as ForStatement;
        expect(forStmt.variable).toBe('i');
        expect(forStmt.words).toEqual(['1', '2', '3']);
        expect(forStmt.body).toBeDefined();
      }
    });

    test('should parse while loop', () => {
      const ast = parseShellCommand('while test $i -lt 10; do echo $i; done');
      expect(ast.type).toBe('WhileStatement');
      if (ast.type === 'WhileStatement') {
        const whileStmt = ast as WhileStatement;
        expect(whileStmt.condition).toBeDefined();
        expect(whileStmt.body).toBeDefined();
      }
    });

    test('should parse case statement', () => {
      const ast = parseShellCommand('case $var in pattern1) cmd1 ;; pattern2) cmd2 ;; esac');
      expect(ast.type).toBe('CaseStatement');
      if (ast.type === 'CaseStatement') {
        const caseStmt = ast as CaseStatement;
        expect(caseStmt.word).toBeDefined();
        expect(caseStmt.items).toBeDefined();
      }
    });

    test('should parse function definition', () => {
      const ast = parseShellCommand('myfunction() { echo "hello"; }');
      expect(ast.type).toBe('FunctionDefinition');
      if (ast.type === 'FunctionDefinition') {
        const funcDef = ast as FunctionDefinition;
        expect(funcDef.name).toBe('myfunction');
        expect(funcDef.body).toBeDefined();
      }
    });
  });

  describe('Complex Commands', () => {
    test('should parse complex nested structure', () => {
      const ast = parseShellCommand('if test -f file; then (cat file | grep pattern) > output.txt; fi &');
      expect(ast.type).toBe('CommandList');
      if (ast.type === 'CommandList') {
        const list = ast as CommandList;
        expect(list.operator).toBe('&');
        expect(list.left.type).toBe('IfStatement');
      }
    });

    test('should parse pipeline with redirections', () => {
      const ast = parseShellCommand('cat < input.txt | grep pattern > output.txt');
      expect(ast.type).toBe('Pipeline');
    });

    test('should parse command substitution in arguments', () => {
      // Note: This tests that the parser doesn't crash on command substitution syntax
      // Actual command substitution expansion happens during execution
      const ast = parseShellCommand('echo $(date)');
      expect(ast.type).toBe('SimpleCommand');
    });
  });

  describe('Error Handling', () => {
    test('should throw on unmatched parenthesis', () => {
      expect(() => parseShellCommand('(echo test')).toThrow();
    });

    test('should throw on unmatched brace', () => {
      expect(() => parseShellCommand('{ echo test')).toThrow();
    });

    test('should throw on invalid pipeline', () => {
      expect(() => parseShellCommand('| grep test')).toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty command', () => {
      const ast = parseShellCommand('');
      expect(ast).toBeDefined();
    });

    test('should handle commands with only whitespace', () => {
      const ast = parseShellCommand('   ');
      expect(ast).toBeDefined();
    });

    test('should handle very long pipelines', () => {
      const longPipeline = Array(50).fill('cat').join(' | ');
      const ast = parseShellCommand(longPipeline);
      expect(ast.type).toBe('Pipeline');
    });
  });

  describe('POSIX Compliance', () => {
    test('should maintain backward compatibility with simple commands', () => {
      const simpleCommands = [
        'ls',
        'echo hello',
        'cd /tmp',
        'pwd',
        'cat file.txt'
      ];

      simpleCommands.forEach(cmd => {
        expect(() => parseShellCommand(cmd)).not.toThrow();
      });
    });

    test('should handle all POSIX operators', () => {
      const operators = [
        'cmd1 | cmd2',      // Pipe
        'cmd1 && cmd2',     // AND
        'cmd1 || cmd2',     // OR
        'cmd1; cmd2',       // Sequential
        'cmd1 &',           // Background
        'cmd > file',       // Redirect output
        'cmd < file',       // Redirect input
        'cmd >> file',      // Append
        'cmd << EOF\\nEOF',  // Heredoc
      ];

      operators.forEach(cmd => {
        expect(() => parseShellCommand(cmd)).not.toThrow();
      });
    });
  });
});
