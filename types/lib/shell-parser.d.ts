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
    AMPERSAND = "AMPERSAND",// &
    GREAT = "GREAT",// >
    DGREAT = "DGREAT",// >>
    LESS = "LESS",// <
    DLESS = "DLESS",// <<
    LESSGREAT = "LESSGREAT",// <>
    DLESSDASH = "DLESSDASH",// <<-
    LPAREN = "LPAREN",// (
    RPAREN = "RPAREN",// )
    LBRACE = "LBRACE",// {
    RBRACE = "RBRACE",// }
    NEWLINE = "NEWLINE",
    EOF = "EOF",
    SINGLE_QUOTE = "SINGLE_QUOTE",
    DOUBLE_QUOTE = "DOUBLE_QUOTE",
    BACKSLASH = "BACKSLASH"
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
    private createToken;
    tokenize(): Token[];
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
}
export interface Redirection {
    type: 'input' | 'output' | 'append' | 'heredoc';
    fd?: number;
    target: string;
}
export declare class ShellParser {
    private tokens;
    private position;
    constructor(tokens: Token[]);
    private peek;
    private advance;
    private expect;
    private parseSimpleCommand;
    private isRedirection;
    private parseRedirection;
    private parsePipeline;
    private parseCommandList;
    parse(): ASTNode;
}
export declare function parseShellCommand(input: string): ASTNode;
