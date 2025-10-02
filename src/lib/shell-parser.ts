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
  DSEMI = 'DSEMI',         // ;;
  AMPERSAND = 'AMPERSAND', // &
  
  // Redirection
  GREAT = 'GREAT',         // >
  DGREAT = 'DGREAT',       // >>
  LESS = 'LESS',           // <
  DLESS = 'DLESS',         // <<
  LESSGREAT = 'LESSGREAT', // <>
  DLESSDASH = 'DLESSDASH', // <<-

  // Process substitution
  PROC_SUB_IN = 'PROC_SUB_IN',   // <(command)
  PROC_SUB_OUT = 'PROC_SUB_OUT', // >(command)
  
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
  ANSI_C_QUOTE = 'ANSI_C_QUOTE',     // $'string'
  LOCALE_QUOTE = 'LOCALE_QUOTE',     // $"string"
  BACKSLASH = 'BACKSLASH',
  
  // Control structure keywords
  IF = 'IF',
  THEN = 'THEN', 
  ELSE = 'ELSE',
  ELIF = 'ELIF',
  FI = 'FI',
  FOR = 'FOR',
  IN = 'IN',
  DO = 'DO',
  DONE = 'DONE',
  WHILE = 'WHILE',
  UNTIL = 'UNTIL',
  CASE = 'CASE',
  ESAC = 'ESAC',
  FUNCTION = 'FUNCTION',
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
    let inBraces = false;
    
    while (this.position < this.input.length) {
      const char = this.peek();
      
      if (char === '{') {
        inBraces = true;
        word += this.advance();
      } else if (char === '}' && inBraces) {
        inBraces = false;
        word += this.advance();
      } else if (inBraces) {
        // Inside braces, allow more characters for parameter expansion
        if (char.match(/[a-zA-Z0-9_\-./~:+=?#%*@!$]/)) {
          word += this.advance();
        } else {
          break;
        }
      } else {
        // Word characters (including $ for variables, = for assignments, and glob characters)
        if (char.match(/[a-zA-Z0-9_\-./~$=*?[\]]/)) {
          word += this.advance();
        } else {
          break;
        }
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

  private readAnsiCQuotedString(): string {
    let result = '';
    this.advance(); // consume opening quote '

    while (this.position < this.input.length) {
      const char = this.peek();

      if (char === "'") {
        this.advance(); // consume closing quote
        break;
      } else if (char === '\\') {
        // Handle ANSI-C escape sequences
        this.advance(); // consume backslash
        const escaped = this.advance();
        result += this.processAnsiCEscape(escaped);
      } else {
        result += this.advance();
      }
    }

    return result;
  }

  private readLocaleQuotedString(): string {
    let result = '';
    this.advance(); // consume opening quote "

    while (this.position < this.input.length) {
      const char = this.peek();

      if (char === '"') {
        this.advance(); // consume closing quote
        break;
      } else if (char === '\\') {
        // Handle escape sequences like double quotes
        this.advance(); // consume backslash
        const escaped = this.advance();
        result += this.processEscape(escaped);
      } else {
        result += this.advance();
      }
    }

    return result;
  }

  private readProcessSubstitution(): string {
    let result = '';
    let parenCount = 1; // We already consumed the opening (

    while (this.position < this.input.length && parenCount > 0) {
      const char = this.peek();

      if (char === '(') {
        parenCount++;
      } else if (char === ')') {
        parenCount--;
      }

      if (parenCount > 0) { // Don't include the closing )
        result += this.advance();
      } else {
        this.advance(); // consume closing )
      }
    }

    return result;
  }

  private processAnsiCEscape(char: string): string {
    switch (char) {
      case 'a': return '\u0007'; // Alert (bell)
      case 'b': return '\b';     // Backspace
      case 'e': return '\u001B'; // Escape character
      case 'f': return '\f';     // Form feed
      case 'n': return '\n';     // Newline
      case 'r': return '\r';     // Carriage return
      case 't': return '\t';     // Horizontal tab
      case 'v': return '\v';     // Vertical tab
      case '\\': return '\\';    // Backslash
      case "'": return "'";      // Single quote
      case '"': return '"';      // Double quote
      case '?': return '?';      // Question mark
      case '0': return '\0';     // Null character
      // Octal sequences \nnn
      case '1': case '2': case '3': case '4': case '5': case '6': case '7':
        // For simplicity, just return the character for now
        // Full implementation would parse \nnn octal sequences
        return char;
      // Hex sequences \xhh
      case 'x':
        // For simplicity, just return 'x' for now
        // Full implementation would parse \xhh hex sequences
        return 'x';
      default:
        return char;
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
      // Process substitution
      else if (char === '<' && nextChar === '(') {
        this.advance(); // consume <
        this.advance(); // consume (
        const command = this.readProcessSubstitution();
        tokens.push(this.createToken(TokenType.PROC_SUB_IN, '<(' + command + ')'));
      } else if (char === '>' && nextChar === '(') {
        this.advance(); // consume >
        this.advance(); // consume (
        const command = this.readProcessSubstitution();
        tokens.push(this.createToken(TokenType.PROC_SUB_OUT, '>(' + command + ')'));
      }
      // Single-character operators
      else if (char === '|') {
        this.advance();
        tokens.push(this.createToken(TokenType.PIPE, '|'));
      } else if (char === '&') {
        this.advance();
        tokens.push(this.createToken(TokenType.AMPERSAND, '&'));
      } else if (char === ';') {
        const nextChar = this.peek(1);
        if (nextChar === ';') {
          this.advance();
          this.advance();
          tokens.push(this.createToken(TokenType.DSEMI, ';;'));
        } else {
          this.advance();
          tokens.push(this.createToken(TokenType.SEMICOLON, ';'));
        }
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
      else if (char === '$' && (this.peek(1) === "'" || this.peek(1) === '"')) {
        // Handle ANSI-C quoting $'...' and locale quoting $"..."
        this.advance(); // consume $
        const quoteChar = this.peek();

        if (quoteChar === "'") {
          const value = this.readAnsiCQuotedString();
          tokens.push(this.createToken(TokenType.ANSI_C_QUOTE, value));
        } else if (quoteChar === '"') {
          const value = this.readLocaleQuotedString();
          tokens.push(this.createToken(TokenType.LOCALE_QUOTE, value));
        }
      } else if (char === '"') {
        const value = this.readQuotedString('"');
        tokens.push(this.createToken(TokenType.DOUBLE_QUOTE, value));
      } else if (char === "'") {
        const value = this.readQuotedString("'");
        tokens.push(this.createToken(TokenType.SINGLE_QUOTE, value));
      }
      // Words and numbers
      else if (char.match(/[a-zA-Z_$*?[\].]/)) {
        const word = this.readWord();
        const tokenType = this.getKeywordType(word);
        tokens.push(this.createToken(tokenType, word));
      } else if (char.match(/[0-9]/)) {
        const number = this.readWord(); // Numbers can contain dots, etc.
        tokens.push(this.createToken(TokenType.NUMBER, number));
      } else {
        // Unknown character, treat as word
        const word = this.readWord() || this.advance();
        const tokenType = this.getKeywordType(word);
        tokens.push(this.createToken(tokenType, word));
      }
    }
    
    tokens.push(this.createToken(TokenType.EOF, ''));
    return tokens;
  }
  
  private getKeywordType(word: string): TokenType {
    const keywords: Record<string, TokenType> = {
      'if': TokenType.IF,
      'then': TokenType.THEN,
      'else': TokenType.ELSE,
      'elif': TokenType.ELIF,
      'fi': TokenType.FI,
      'for': TokenType.FOR,
      'in': TokenType.IN,
      'do': TokenType.DO,
      'done': TokenType.DONE,
      'while': TokenType.WHILE,
      'until': TokenType.UNTIL,
      'case': TokenType.CASE,
      'esac': TokenType.ESAC,
      'function': TokenType.FUNCTION,
    };
    
    return keywords[word] || TokenType.WORD;
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
  redirections: Redirection[];
}

export interface CommandGroup extends ASTNode {
  type: 'CommandGroup';
  command: ASTNode;
  redirections: Redirection[];
}

export interface Redirection {
  type: 'input' | 'output' | 'append' | 'heredoc';
  fd?: number;
  target: string;
}

// Control Structure AST Nodes
export interface IfStatement extends ASTNode {
  type: 'IfStatement';
  condition: ASTNode;
  thenClause: ASTNode;
  elseClause?: ASTNode;
}

export interface ForStatement extends ASTNode {
  type: 'ForStatement';
  variable: string;
  words: string[];
  body: ASTNode;
}

export interface WhileStatement extends ASTNode {
  type: 'WhileStatement';
  condition: ASTNode;
  body: ASTNode;
}

export interface CaseStatement extends ASTNode {
  type: 'CaseStatement';
  word: string;
  items: CaseItem[];
}

export interface CaseItem {
  patterns: string[];
  command?: ASTNode;
}

export interface FunctionDefinition extends ASTNode {
  type: 'FunctionDefinition';
  name: string;
  body: ASTNode;
}

export interface ProcessSubstitution extends ASTNode {
  type: 'ProcessSubstitution';
  direction: 'input' | 'output';  // < or > direction
  command: ASTNode;               // The command to execute
  fifoPath?: string;              // Path to the named pipe (set during execution)
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
           this.peek().type === TokenType.NUMBER ||
           this.peek().type === TokenType.SINGLE_QUOTE ||
           this.peek().type === TokenType.DOUBLE_QUOTE ||
           this.peek().type === TokenType.ANSI_C_QUOTE ||
           this.peek().type === TokenType.LOCALE_QUOTE ||
           this.peek().type === TokenType.LBRACE ||
           this.peek().type === TokenType.PROC_SUB_IN ||
           this.peek().type === TokenType.PROC_SUB_OUT ||
           this.isRedirection(this.peek().type)) {

      const token = this.peek();

      if (this.isRedirection(token.type)) {
        redirections.push(this.parseRedirection());
      } else if (token.type === TokenType.LBRACE) {
        // Parse brace expression as a single argument
        args.push(this.parseBraceExpression());
      } else if (token.type === TokenType.PROC_SUB_IN || token.type === TokenType.PROC_SUB_OUT) {
        // Process substitution will be handled during execution - just store token
        args.push(this.advance().value);
      } else {
        args.push(this.advance().value);
      }
    }
    
    return { type: 'SimpleCommand', name, args, redirections } as SimpleCommand;
  }

  private parseBraceExpression(): string {
    let braceExpression = '';

    // Consume opening brace
    braceExpression += this.expect(TokenType.LBRACE).value;

    // Parse content until closing brace
    while (this.peek().type !== TokenType.RBRACE && this.peek().type !== TokenType.EOF) {
      braceExpression += this.advance().value;
    }

    // Consume closing brace
    if (this.peek().type === TokenType.RBRACE) {
      braceExpression += this.advance().value;
    }

    return braceExpression;
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
  
  private parsePipelineElement(): ASTNode {
    const token = this.peek();

    switch (token.type) {
      case TokenType.LPAREN:
        return this.parseSubshell();
      case TokenType.LBRACE:
        return this.parseCommandGroup();
      case TokenType.IF:
        return this.parseIfStatement();
      case TokenType.FOR:
        return this.parseForStatement();
      case TokenType.WHILE:
        return this.parseWhileStatement();
      case TokenType.CASE:
        return this.parseCaseStatement();
      case TokenType.FUNCTION:
        return this.parseFunctionDefinition();
      default:
        // Check if this might be a function definition (name followed by ())
        if (token.type === TokenType.WORD) {
          const nextToken = this.peek(1);
          if (nextToken.type === TokenType.LPAREN) {
            const afterParen = this.peek(2);
            if (afterParen.type === TokenType.RPAREN) {
              return this.parseFunctionDefinition();
            }
          }
        }
        return this.parseSimpleCommand();
    }
  }

  private parsePipeline(): Pipeline | ASTNode {
    const left = this.parsePipelineElement();

    if (this.peek().type === TokenType.PIPE) {
      const commands = [left];

      while (this.peek().type === TokenType.PIPE) {
        this.advance(); // consume pipe
        commands.push(this.parsePipelineElement());
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

      let op: '&&' | '||' | ';' | '&';
      switch (operator.type) {
        case TokenType.AND_IF: op = '&&'; break;
        case TokenType.OR_IF: op = '||'; break;
        case TokenType.SEMICOLON: op = ';'; break;
        case TokenType.AMPERSAND: op = '&'; break;
        default: throw new Error(`Unknown operator: ${operator.type}`);
      }

      // For background (&), right side is optional (can be at end of line)
      let right: ASTNode | undefined;
      if (op === '&' && (this.peek().type === TokenType.EOF || this.peek().type === TokenType.NEWLINE)) {
        right = undefined;
      } else {
        right = this.parsePipeline();
      }

      left = { type: 'CommandList', left, operator: op, right } as CommandList;
    }
    
    return left;
  }
  
  private parseIfStatement(): IfStatement {
    this.expect(TokenType.IF);
    
    // Skip newlines
    while (this.peek().type === TokenType.NEWLINE) {
      this.advance();
    }
    
    const condition = this.parseConditionalCommand();
    
    // Skip newlines
    while (this.peek().type === TokenType.NEWLINE) {
      this.advance();
    }
    
    this.expect(TokenType.THEN);
    
    // Skip newlines
    while (this.peek().type === TokenType.NEWLINE) {
      this.advance();
    }
    
    const thenClause = this.parseCompoundList();
    let elseClause: ASTNode | undefined;
    
    // Skip newlines
    while (this.peek().type === TokenType.NEWLINE) {
      this.advance();
    }
    
    if (this.peek().type === TokenType.ELSE) {
      this.advance();
      
      // Skip newlines
      while (this.peek().type === TokenType.NEWLINE) {
        this.advance();
      }
      
      elseClause = this.parseCompoundList();
      
      // Skip newlines
      while (this.peek().type === TokenType.NEWLINE) {
        this.advance();
      }
    }
    
    this.expect(TokenType.FI);
    
    return {
      type: 'IfStatement',
      condition,
      thenClause,
      elseClause,
    } as IfStatement;
  }
  
  private parseForStatement(): ForStatement {
    this.expect(TokenType.FOR);
    const variable = this.expect(TokenType.WORD).value;
    
    // Skip newlines
    while (this.peek().type === TokenType.NEWLINE) {
      this.advance();
    }
    
    const words: string[] = [];
    
    if (this.peek().type === TokenType.IN) {
      this.advance();
      
      // Read word list (including numbers which are treated as words in for loops)
      while (this.peek().type === TokenType.WORD || this.peek().type === TokenType.NUMBER || this.peek().type === TokenType.SINGLE_QUOTE || this.peek().type === TokenType.DOUBLE_QUOTE || this.peek().type === TokenType.ANSI_C_QUOTE || this.peek().type === TokenType.LOCALE_QUOTE) {
        words.push(this.advance().value);
      }
    }

    // Skip newlines and optional semicolon
    while (this.peek().type === TokenType.NEWLINE) {
      this.advance();
    }

    // Optional semicolon before DO
    if (this.peek().type === TokenType.SEMICOLON) {
      this.advance();
    }

    // Skip newlines after semicolon
    while (this.peek().type === TokenType.NEWLINE) {
      this.advance();
    }

    this.expect(TokenType.DO);
    
    // Skip newlines
    while (this.peek().type === TokenType.NEWLINE) {
      this.advance();
    }
    
    const body = this.parseCompoundList();
    
    // Skip newlines
    while (this.peek().type === TokenType.NEWLINE) {
      this.advance();
    }
    
    this.expect(TokenType.DONE);
    
    return {
      type: 'ForStatement',
      variable,
      words,
      body,
    } as ForStatement;
  }
  
  private parseWhileStatement(): WhileStatement {
    this.expect(TokenType.WHILE);
    
    // Skip newlines
    while (this.peek().type === TokenType.NEWLINE) {
      this.advance();
    }
    
    const condition = this.parseConditionalCommand();
    
    // Skip newlines
    while (this.peek().type === TokenType.NEWLINE) {
      this.advance();
    }
    
    this.expect(TokenType.DO);
    
    // Skip newlines
    while (this.peek().type === TokenType.NEWLINE) {
      this.advance();
    }
    
    const body = this.parseCompoundList();
    
    // Skip newlines
    while (this.peek().type === TokenType.NEWLINE) {
      this.advance();
    }
    
    this.expect(TokenType.DONE);
    
    return {
      type: 'WhileStatement',
      condition,
      body,
    } as WhileStatement;
  }
  
  private parseCaseStatement(): CaseStatement {
    this.expect(TokenType.CASE);
    const word = this.expect(TokenType.WORD).value;
    
    // Skip newlines
    while (this.peek().type === TokenType.NEWLINE) {
      this.advance();
    }
    
    this.expect(TokenType.IN);
    
    // Skip newlines
    while (this.peek().type === TokenType.NEWLINE) {
      this.advance();
    }
    
    const items: CaseItem[] = [];
    
    while (this.peek().type !== TokenType.ESAC && this.peek().type !== TokenType.EOF) {
      const patterns: string[] = [];
      
      // Parse patterns separated by |
      patterns.push(this.expect(TokenType.WORD).value);
      
      while (this.peek().type === TokenType.PIPE) {
        this.advance(); // consume |
        patterns.push(this.expect(TokenType.WORD).value);
      }
      
      this.advance(); // expect ')' - would need to add to lexer
      
      // Skip newlines
      while (this.peek().type === TokenType.NEWLINE) {
        this.advance();
      }
      
      let command: ASTNode | undefined;
      if (this.peek().type !== TokenType.ESAC) {
        command = this.parseCommandList();
      }
      
      items.push({ patterns, command });

      // Skip newlines
      while (this.peek().type === TokenType.NEWLINE) {
        this.advance();
      }

      // Skip ;; if present
      if (this.peek().type === TokenType.DSEMI) {
        this.advance();
      }

      // Skip newlines after ;;
      while (this.peek().type === TokenType.NEWLINE) {
        this.advance();
      }
    }
    
    this.expect(TokenType.ESAC);
    
    return {
      type: 'CaseStatement',
      word,
      items,
    } as CaseStatement;
  }
  
  private parseCompoundList(): ASTNode {
    // Parse a sequence of commands until we hit a closing keyword
    const commands: ASTNode[] = [];

    while (this.peek().type !== TokenType.FI &&
           this.peek().type !== TokenType.DONE &&
           this.peek().type !== TokenType.ESAC &&
           this.peek().type !== TokenType.ELSE &&
           this.peek().type !== TokenType.RBRACE &&
           this.peek().type !== TokenType.EOF) {

      // Skip newlines
      while (this.peek().type === TokenType.NEWLINE) {
        this.advance();
      }

      if (this.peek().type === TokenType.FI ||
          this.peek().type === TokenType.DONE ||
          this.peek().type === TokenType.ESAC ||
          this.peek().type === TokenType.ELSE ||
          this.peek().type === TokenType.RBRACE ||
          this.peek().type === TokenType.EOF) {
        break;
      }

      // Parse individual commands or pipelines
      commands.push(this.parsePipeline());

      // Skip optional semicolon or newline
      if (this.peek().type === TokenType.SEMICOLON) {
        this.advance();
      }
    }

    if (commands.length === 0) {
      return { type: 'SimpleCommand', name: '', args: [], redirections: [] } as SimpleCommand;
    } else if (commands.length === 1) {
      return commands[0];
    } else {
      // Create a command list
      let result = commands[0];
      for (let i = 1; i < commands.length; i++) {
        result = {
          type: 'CommandList',
          left: result,
          operator: ';',
          right: commands[i],
        } as CommandList;
      }
      return result;
    }
  }
  
  private parseConditionalCommand(): ASTNode {
    // Parse a command list until we hit a control structure keyword
    const commands: ASTNode[] = [];
    
    while (this.peek().type !== TokenType.THEN && 
           this.peek().type !== TokenType.DO &&
           this.peek().type !== TokenType.NEWLINE &&
           this.peek().type !== TokenType.EOF) {
      
      commands.push(this.parsePipeline());
      
      // Check for command separators
      if (this.peek().type === TokenType.SEMICOLON) {
        this.advance();
      } else if (this.peek().type === TokenType.AND_IF || this.peek().type === TokenType.OR_IF) {
        const operator = this.advance();
        const right = this.parsePipeline();

        const op: '&&' | '||' = operator.type === TokenType.AND_IF ? '&&' : '||';
        
        const lastCmd = commands.pop()!;
        commands.push({ type: 'CommandList', left: lastCmd, operator: op, right } as CommandList);
      } else {
        break;
      }
    }
    
    if (commands.length === 0) {
      throw new Error('Expected command in conditional');
    } else if (commands.length === 1) {
      return commands[0];
    } else {
      // Create a command list
      let result = commands[0];
      for (let i = 1; i < commands.length; i++) {
        result = {
          type: 'CommandList',
          left: result,
          operator: ';',
          right: commands[i],
        } as CommandList;
      }
      return result;
    }
  }

  private parseFunctionDefinition(): FunctionDefinition {
    let name: string;

    // Handle both syntaxes: "function name { ... }" and "name() { ... }"
    if (this.peek().type === TokenType.FUNCTION) {
      this.advance(); // consume 'function'
      name = this.expect(TokenType.WORD).value;
    } else {
      // name() syntax
      name = this.expect(TokenType.WORD).value;
      this.expect(TokenType.LPAREN);
      this.expect(TokenType.RPAREN);
    }

    // Skip newlines before body
    while (this.peek().type === TokenType.NEWLINE) {
      this.advance();
    }

    // Parse function body - expect { ... }
    this.expect(TokenType.LBRACE);

    // Skip newlines after opening brace
    while (this.peek().type === TokenType.NEWLINE) {
      this.advance();
    }

    // Parse the body as a compound list
    const body = this.parseCompoundList();

    // Skip newlines before closing brace
    while (this.peek().type === TokenType.NEWLINE) {
      this.advance();
    }

    this.expect(TokenType.RBRACE);

    return {
      type: 'FunctionDefinition',
      name,
      body,
    } as FunctionDefinition;
  }

  private parseSubshell(): Subshell {
    this.expect(TokenType.LPAREN);

    // Skip newlines after opening paren
    while (this.peek().type === TokenType.NEWLINE) {
      this.advance();
    }

    const command = this.parseCommandList();

    // Skip newlines before closing paren
    while (this.peek().type === TokenType.NEWLINE) {
      this.advance();
    }

    this.expect(TokenType.RPAREN);

    // Parse redirections after subshell
    const redirections: Redirection[] = [];
    while (this.isRedirection(this.peek().type)) {
      redirections.push(this.parseRedirection());
    }

    return {
      type: 'Subshell',
      command,
      redirections,
    } as Subshell;
  }

  private parseCommandGroup(): CommandGroup {
    this.expect(TokenType.LBRACE);

    // Skip newlines after opening brace
    while (this.peek().type === TokenType.NEWLINE) {
      this.advance();
    }

    const command = this.parseCompoundList();

    // Skip newlines before closing brace
    while (this.peek().type === TokenType.NEWLINE) {
      this.advance();
    }

    this.expect(TokenType.RBRACE);

    // Parse redirections after command group
    const redirections: Redirection[] = [];
    while (this.isRedirection(this.peek().type)) {
      redirections.push(this.parseRedirection());
    }

    return {
      type: 'CommandGroup',
      command,
      redirections,
    } as CommandGroup;
  }

  public parse(): ASTNode {
    // Skip leading newlines
    while (this.peek().type === TokenType.NEWLINE) {
      this.advance();
    }

    if (this.peek().type === TokenType.EOF) {
      return { type: 'SimpleCommand', name: '', args: [], redirections: [] } as SimpleCommand;
    }

    // Always use parseCommandList to handle all commands and operators
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