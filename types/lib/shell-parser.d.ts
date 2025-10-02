/**
 * POSIX Shell Grammar Parser
 * Implements lexical analysis and syntax parsing for POSIX shell commands
 */
export declare enum TokenType {
    WORD = "WORD",
    NUMBER = "NUMBER",
    PIPE = "PIPE",// |
    AND_IF = "AND_IF",// &&
    OR_IF = "OR_IF",// ||
    SEMICOLON = "SEMICOLON",// ;
    DSEMI = "DSEMI",// ;;
    AMPERSAND = "AMPERSAND",// &
    GREAT = "GREAT",// >
    DGREAT = "DGREAT",// >>
    LESS = "LESS",// <
    DLESS = "DLESS",// <<
    LESSGREAT = "LESSGREAT",// <>
    DLESSDASH = "DLESSDASH",// <<-
    PROC_SUB_IN = "PROC_SUB_IN",// <(command)
    PROC_SUB_OUT = "PROC_SUB_OUT",// >(command)
    LPAREN = "LPAREN",// (
    RPAREN = "RPAREN",// )
    LBRACE = "LBRACE",// {
    RBRACE = "RBRACE",// }
    NEWLINE = "NEWLINE",
    EOF = "EOF",
    SINGLE_QUOTE = "SINGLE_QUOTE",
    DOUBLE_QUOTE = "DOUBLE_QUOTE",
    ANSI_C_QUOTE = "ANSI_C_QUOTE",// $'string'
    LOCALE_QUOTE = "LOCALE_QUOTE",// $"string"
    BACKSLASH = "BACKSLASH",
    IF = "IF",
    THEN = "THEN",
    ELSE = "ELSE",
    ELIF = "ELIF",
    FI = "FI",
    FOR = "FOR",
    IN = "IN",
    DO = "DO",
    DONE = "DONE",
    WHILE = "WHILE",
    UNTIL = "UNTIL",
    CASE = "CASE",
    ESAC = "ESAC",
    FUNCTION = "FUNCTION"
}
export interface Token {
    type: TokenType;
    value: string;
    position: number;
    line: number;
    column: number;
}
export declare class ShellLexer {
    private input;
    private position;
    private line;
    private column;
    constructor(input: string);
    private peek;
    private advance;
    private skipWhitespace;
    private readWord;
    private readQuotedString;
    private processEscape;
    private readAnsiCQuotedString;
    private readLocaleQuotedString;
    private readProcessSubstitution;
    private processAnsiCEscape;
    private createToken;
    tokenize(): Token[];
    private getKeywordType;
}
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
    direction: 'input' | 'output';
    command: ASTNode;
    fifoPath?: string;
}
export declare class ShellParser {
    private tokens;
    private position;
    constructor(tokens: Token[]);
    private peek;
    private advance;
    private expect;
    private parseSimpleCommand;
    private parseBraceExpression;
    private isRedirection;
    private parseRedirection;
    private parsePipelineElement;
    private parsePipeline;
    private parseCommandList;
    private parseIfStatement;
    private parseForStatement;
    private parseWhileStatement;
    private parseCaseStatement;
    private parseCompoundList;
    private parseConditionalCommand;
    private parseFunctionDefinition;
    private parseSubshell;
    private parseCommandGroup;
    parse(): ASTNode;
}
export declare function parseShellCommand(input: string): ASTNode;
