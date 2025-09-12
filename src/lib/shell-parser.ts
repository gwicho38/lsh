/**
 * POSIX Shell Grammar Parser
 * Implements lexical analysis and syntax parsing for POSIX shell commands
 */

export enum TokenType {
  // Literals and identifiers
  WORD = 'WORD',
  NUMBER = 'NUMBER',
  
  // Operators
  PIPE = 'PIPE',           // |
  AND_IF = 'AND_IF',       // &&
  OR_IF = 'OR_IF',         // ||
  SEMICOLON = 'SEMICOLON', // ;
  AMPERSAND = 'AMPERSAND', // &
  
  // Redirection
  GREAT = 'GREAT',         // >
  DGREAT = 'DGREAT',       // >>
  LESS = 'LESS',           // <
  DLESS = 'DLESS',         // <<
  LESSGREAT = 'LESSGREAT', // <>
  DLESSDASH = 'DLESSDASH', // <<-
  
  // Grouping
  LPAREN = 'LPAREN',       // (
  RPAREN = 'RPAREN',       // )
  LBRACE = 'LBRACE',       // {
  RBRACE = 'RBRACE',       // }
  
  // Special
  NEWLINE = 'NEWLINE',
  EOF = 'EOF',
  
  // Quotes
  SINGLE_QUOTE = 'SINGLE_QUOTE',
  DOUBLE_QUOTE = 'DOUBLE_QUOTE',
  BACKSLASH = 'BACKSLASH',
}

export interface Token {
  type: TokenType;
  value: string;
  position: number;
  line: number;
  column: number;
}

export class ShellLexer {
  private input: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;
  
  constructor(input: string) {
    this.input = input;
  }
  
  private peek(offset: number = 0): string {
    const pos = this.position + offset;
    return pos >= this.input.length ? '\0' : this.input[pos];
  }
  
  private advance(): string {
    if (this.position >= this.input.length) return '\0';
    
    const char = this.input[this.position];
    this.position++;
    
    if (char === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    
    return char;
  }
  
  private skipWhitespace(): void {
    while (this.position < this.input.length) {
      const char = this.peek();
      if (char === ' ' || char === '\t' || char === '\r') {
        this.advance();
      } else {
        break;
      }
    }
  }
  
  private readWord(): string {
    let word = '';
    while (this.position < this.input.length) {
      const char = this.peek();
      
      // Word characters (not operators or whitespace)
      if (char.match(/[a-zA-Z0-9_\-\.\/~]/)) {
        word += this.advance();
      } else {
        break;
      }
    }
    return word;
  }
  
  private readQuotedString(quote: string): string {
    let result = '';
    this.advance(); // consume opening quote
    
    while (this.position < this.input.length) {
      const char = this.peek();
      
      if (char === quote) {
        this.advance(); // consume closing quote
        break;
      } else if (char === '\\' && quote === '"') {
        // Handle escape sequences in double quotes
        this.advance(); // consume backslash
        const escaped = this.advance();
        result += this.processEscape(escaped);
      } else {
        result += this.advance();
      }
    }
    
    return result;
  }
  
  private processEscape(char: string): string {
    switch (char) {
      case 'n': return '\n';
      case 't': return '\t';
      case 'r': return '\r';
      case 'b': return '\b';
      case 'f': return '\f';
      case 'v': return '\v';
      case '\\': return '\\';
      case '"': return '"';
      case "'": return "'";
      default: return char;
    }
  }
  
  private createToken(type: TokenType, value: string): Token {
    return {
      type,
      value,
      position: this.position,
      line: this.line,
      column: this.column,
    };
  }
  
  public tokenize(): Token[] {
    const tokens: Token[] = [];
    
    while (this.position < this.input.length) {
      this.skipWhitespace();
      
      if (this.position >= this.input.length) break;
      
      const char = this.peek();
      const nextChar = this.peek(1);
      
      // Two-character operators
      if (char === '&' && nextChar === '&') {
        this.advance();
        this.advance();
        tokens.push(this.createToken(TokenType.AND_IF, '&&'));
      } else if (char === '|' && nextChar === '|') {
        this.advance();
        this.advance();
        tokens.push(this.createToken(TokenType.OR_IF, '||'));
      } else if (char === '>' && nextChar === '>') {
        this.advance();
        this.advance();
        tokens.push(this.createToken(TokenType.DGREAT, '>>'));
      } else if (char === '<' && nextChar === '<') {
        this.advance();
        if (this.peek() === '-') {
          this.advance();
          tokens.push(this.createToken(TokenType.DLESSDASH, '<<-'));
        } else {
          tokens.push(this.createToken(TokenType.DLESS, '<<'));
        }
      } else if (char === '<' && nextChar === '>') {
        this.advance();
        this.advance();
        tokens.push(this.createToken(TokenType.LESSGREAT, '<>'));
      }
      // Single-character operators
      else if (char === '|') {
        this.advance();
        tokens.push(this.createToken(TokenType.PIPE, '|'));
      } else if (char === '&') {
        this.advance();
        tokens.push(this.createToken(TokenType.AMPERSAND, '&'));
      } else if (char === ';') {
        this.advance();
        tokens.push(this.createToken(TokenType.SEMICOLON, ';'));
      } else if (char === '>') {
        this.advance();
        tokens.push(this.createToken(TokenType.GREAT, '>'));
      } else if (char === '<') {
        this.advance();
        tokens.push(this.createToken(TokenType.LESS, '<'));
      } else if (char === '(') {
        this.advance();
        tokens.push(this.createToken(TokenType.LPAREN, '('));
      } else if (char === ')') {
        this.advance();
        tokens.push(this.createToken(TokenType.RPAREN, ')'));
      } else if (char === '{') {
        this.advance();
        tokens.push(this.createToken(TokenType.LBRACE, '{'));
      } else if (char === '}') {
        this.advance();
        tokens.push(this.createToken(TokenType.RBRACE, '}'));
      } else if (char === '\n') {
        this.advance();
        tokens.push(this.createToken(TokenType.NEWLINE, '\n'));
      }
      // Quoted strings
      else if (char === '"') {
        const value = this.readQuotedString('"');
        tokens.push(this.createToken(TokenType.DOUBLE_QUOTE, value));
      } else if (char === "'") {
        const value = this.readQuotedString("'");
        tokens.push(this.createToken(TokenType.SINGLE_QUOTE, value));
      }
      // Words and numbers
      else if (char.match(/[a-zA-Z_]/)) {
        const word = this.readWord();
        tokens.push(this.createToken(TokenType.WORD, word));
      } else if (char.match(/[0-9]/)) {
        const number = this.readWord(); // Numbers can contain dots, etc.
        tokens.push(this.createToken(TokenType.NUMBER, number));
      } else {
        // Unknown character, treat as word
        const word = this.readWord() || this.advance();
        tokens.push(this.createToken(TokenType.WORD, word));
      }
    }
    
    tokens.push(this.createToken(TokenType.EOF, ''));
    return tokens;
  }
}

// AST Node Types
export interface ASTNode {
  type: string;
}

export interface SimpleCommand extends ASTNode {
  type: 'SimpleCommand';
  name: string;
  args: string[];
  redirections: Redirection[];
}

export interface Pipeline extends ASTNode {
  type: 'Pipeline';
  commands: ASTNode[];
}

export interface CommandList extends ASTNode {
  type: 'CommandList';
  left: ASTNode;
  operator: '&&' | '||' | ';' | '&';
  right?: ASTNode;
}

export interface Subshell extends ASTNode {
  type: 'Subshell';
  command: ASTNode;
}

export interface Redirection {
  type: 'input' | 'output' | 'append' | 'heredoc';
  fd?: number;
  target: string;
}

export class ShellParser {
  private tokens: Token[];
  private position: number = 0;
  
  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }
  
  private peek(offset: number = 0): Token {
    const pos = this.position + offset;
    return pos >= this.tokens.length 
      ? { type: TokenType.EOF, value: '', position: 0, line: 0, column: 0 }
      : this.tokens[pos];
  }
  
  private advance(): Token {
    return this.position < this.tokens.length ? this.tokens[this.position++] : this.peek();
  }
  
  private expect(type: TokenType): Token {
    const token = this.advance();
    if (token.type !== type) {
      throw new Error(`Expected ${type}, got ${token.type} at line ${token.line}`);
    }
    return token;
  }
  
  private parseSimpleCommand(): SimpleCommand {
    const name = this.expect(TokenType.WORD).value;
    const args: string[] = [];
    const redirections: Redirection[] = [];
    
    while (this.peek().type === TokenType.WORD || 
           this.peek().type === TokenType.SINGLE_QUOTE ||
           this.peek().type === TokenType.DOUBLE_QUOTE ||
           this.isRedirection(this.peek().type)) {
      
      const token = this.peek();
      
      if (this.isRedirection(token.type)) {
        redirections.push(this.parseRedirection());
      } else {
        args.push(this.advance().value);
      }
    }
    
    return { type: 'SimpleCommand', name, args, redirections } as SimpleCommand;
  }
  
  private isRedirection(type: TokenType): boolean {
    return type === TokenType.GREAT || type === TokenType.DGREAT ||
           type === TokenType.LESS || type === TokenType.DLESS ||
           type === TokenType.LESSGREAT || type === TokenType.DLESSDASH;
  }
  
  private parseRedirection(): Redirection {
    const token = this.advance();
    const target = this.expect(TokenType.WORD).value;
    
    switch (token.type) {
      case TokenType.GREAT:
        return { type: 'output', target };
      case TokenType.DGREAT:
        return { type: 'append', target };
      case TokenType.LESS:
        return { type: 'input', target };
      case TokenType.DLESS:
      case TokenType.DLESSDASH:
        return { type: 'heredoc', target };
      default:
        throw new Error(`Unknown redirection type: ${token.type}`);
    }
  }
  
  private parsePipeline(): Pipeline | ASTNode {
    let left = this.parseSimpleCommand();
    
    if (this.peek().type === TokenType.PIPE) {
      const commands = [left];
      
      while (this.peek().type === TokenType.PIPE) {
        this.advance(); // consume pipe
        commands.push(this.parseSimpleCommand());
      }
      
      return { type: 'Pipeline', commands };
    }
    
    return left;
  }
  
  private parseCommandList(): ASTNode {
    let left = this.parsePipeline();
    
    while (this.peek().type === TokenType.AND_IF ||
           this.peek().type === TokenType.OR_IF ||
           this.peek().type === TokenType.SEMICOLON ||
           this.peek().type === TokenType.AMPERSAND) {
      
      const operator = this.advance();
      const right = this.parsePipeline();
      
      let op: '&&' | '||' | ';' | '&';
      switch (operator.type) {
        case TokenType.AND_IF: op = '&&'; break;
        case TokenType.OR_IF: op = '||'; break;
        case TokenType.SEMICOLON: op = ';'; break;
        case TokenType.AMPERSAND: op = '&'; break;
        default: throw new Error(`Unknown operator: ${operator.type}`);
      }
      
      left = { type: 'CommandList', left, operator: op, right } as CommandList;
    }
    
    return left;
  }
  
  public parse(): ASTNode {
    // Skip leading newlines
    while (this.peek().type === TokenType.NEWLINE) {
      this.advance();
    }
    
    if (this.peek().type === TokenType.EOF) {
      return { type: 'SimpleCommand', name: '', args: [], redirections: [] } as SimpleCommand;
    }
    
    return this.parseCommandList();
  }
}

// Convenience function for parsing shell commands
export function parseShellCommand(input: string): ASTNode {
  const lexer = new ShellLexer(input);
  const tokens = lexer.tokenize();
  const parser = new ShellParser(tokens);
  return parser.parse();
}