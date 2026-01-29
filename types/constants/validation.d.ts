/**
 * Validation patterns and security rules
 *
 * All validation patterns, security rules, and dangerous command patterns.
 */
export interface DangerousPattern {
    pattern: RegExp;
    description: string;
    riskLevel: string;
}
export interface WarningPattern {
    pattern: RegExp;
    description: string;
}
export declare const DANGEROUS_PATTERNS: DangerousPattern[];
export declare const WARNING_PATTERNS: WarningPattern[];
export interface SuspiciousCheck {
    test: (command: string) => boolean;
    message: string;
    level: 'medium' | 'high';
}
export declare const SUSPICIOUS_CHECKS: SuspiciousCheck[];
