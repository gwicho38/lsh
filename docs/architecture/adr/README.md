# Architectural Decision Records (ADRs)

This directory contains Architectural Decision Records (ADRs) for the LSH project. ADRs are documents that capture important architectural decisions made during the development of the software, along with their context and consequences.

## What is an ADR?

An Architectural Decision Record is a short document that captures an important architectural decision made along with its context and consequences. ADRs provide:

- **Historical context** for future developers
- **Reasoning** behind architectural choices
- **Trade-offs** considered during decision-making
- **Consistency** in architectural direction

## When to Write an ADR

Write an ADR when making a decision that:

1. **Affects structure**: Changes how the system is organized
2. **Has broad impact**: Affects multiple components or modules
3. **Is difficult to reverse**: Hard to change later without significant effort
4. **Sets precedent**: Establishes patterns for future development
5. **Involves trade-offs**: Multiple valid approaches exist

Examples of decisions that warrant an ADR:
- Choosing a database or ORM strategy
- Selecting authentication mechanisms
- Defining error handling patterns
- Establishing testing strategies
- Choosing encryption algorithms
- Defining API versioning strategy

## ADR Statuses

| Status | Meaning |
|--------|---------|
| **Proposed** | Under discussion, not yet approved |
| **Accepted** | Approved and implemented |
| **Deprecated** | No longer valid, but not replaced |
| **Superseded** | Replaced by a newer ADR |

## Creating a New ADR

### Using the Script

```bash
./scripts/create-adr.sh "Your Decision Title"
```

### Manually

1. Copy `adr-template.md` to a new file
2. Name it `NNNN-brief-title.md` where NNNN is the next number
3. Fill in all sections
4. Submit a PR for review

### Naming Convention

- **Format**: `NNNN-brief-description.md`
- **Numbers**: 4 digits, zero-padded (0001, 0002, etc.)
- **Description**: kebab-case, brief but descriptive

Examples:
- `0001-use-supabase-for-persistence.md`
- `0002-aes-256-for-encryption.md`
- `0003-unix-socket-ipc.md`

## ADR Index

| Number | Title | Status | Date |
|--------|-------|--------|------|
| [0001](./0001-database-persistence-strategy.md) | Database Persistence Strategy | Accepted | 2026-01-27 |
| [0002](./0002-secret-encryption-standards.md) | Secret Encryption Standards | Accepted | 2026-01-27 |
| [0003](./0003-daemon-process-architecture.md) | Daemon Process Architecture | Accepted | 2026-01-27 |
| [0004](./0004-api-authentication-jwt.md) | API Authentication with JWT | Accepted | 2026-01-27 |
| [0005](./0005-error-handling-pattern.md) | Error Handling Pattern | Accepted | 2026-01-27 |
| [0006](./0006-testing-strategy.md) | Testing Strategy | Accepted | 2026-01-27 |

## Review Process

1. **Draft**: Author creates ADR with "Proposed" status
2. **Discussion**: Team reviews and discusses (via PR comments)
3. **Revision**: Author incorporates feedback
4. **Approval**: Technical lead approves
5. **Implementation**: ADR status changed to "Accepted"

## Modifying Existing ADRs

- **Minor updates**: Edit in place, note change in commit message
- **Significant changes**: Create new ADR that supersedes the old one
- **Never delete**: Keep for historical record, mark as Superseded

## Best Practices

### Writing Good ADRs

1. **Be concise**: Focus on the decision, not the process
2. **Be specific**: Include concrete details and examples
3. **Be honest**: Document real trade-offs and risks
4. **Be timely**: Write ADRs when decisions are fresh
5. **Reference related**: Link to relevant issues, PRs, and other ADRs

### Common Mistakes to Avoid

- Writing ADRs after the fact (losing context)
- Making ADRs too long or too short
- Not including alternatives considered
- Forgetting to update status when decision is implemented
- Not linking ADRs from code that implements them

## References

- [Michael Nygard's original ADR article](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [ADR GitHub organization](https://adr.github.io/)
- [Documenting Architecture Decisions](https://www.thoughtworks.com/radar/techniques/lightweight-architecture-decision-records)
