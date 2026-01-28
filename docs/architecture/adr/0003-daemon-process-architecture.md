# ADR-0003: Daemon Process Architecture

## Status

Accepted

## Date

2026-01-27

## Context

LSH requires a long-running daemon process for:
- Executing scheduled jobs (cron-style)
- Maintaining persistent state between CLI invocations
- Running background services (webhooks, API server)
- Managing job lifecycle (start, stop, restart)

Requirements:
- Single daemon instance per user
- Low resource footprint when idle
- Fast IPC with CLI commands
- Graceful shutdown and restart
- Systemd/launchd integration for auto-start

Challenges:
- Node.js is not traditionally used for daemons
- Process management complexity
- Communication between CLI and daemon
- State persistence across restarts

## Decision

We chose a **Unix domain socket-based IPC architecture** with a standalone daemon process.

Key characteristics:
- Daemon process: `lshd` (LSH Daemon)
- Communication: Unix domain socket at `/tmp/lsh-daemon-<user>.sock`
- Protocol: JSON-RPC over newline-delimited JSON
- State: In-memory with periodic database sync
- Process management: PID file at `/tmp/lsh-job-daemon-<user>.pid`

Architecture:
```
┌─────────────┐     Unix Socket      ┌─────────────┐
│   lsh CLI   │ ◄──────────────────► │   lshd      │
│   (short)   │     JSON-RPC         │   (daemon)  │
└─────────────┘                      └─────────────┘
                                            │
                                            ▼
                                     ┌─────────────┐
                                     │  Database   │
                                     │  (Supabase) │
                                     └─────────────┘
```

## Consequences

### Positive

- **Fast IPC**: Unix sockets are fast (same-host only)
- **Security**: Socket file permissions control access
- **Simplicity**: No TCP port management, firewall concerns
- **Resource efficient**: Single process for all scheduled work
- **Standard pattern**: Unix daemon conventions well-understood

### Negative

- **Platform-specific**: Unix sockets don't work on Windows (need named pipes)
- **Process management**: Must handle crashes, restarts, zombie processes
- **State sync**: Risk of data loss if daemon crashes before sync
- **Debugging difficulty**: Background process harder to debug than CLI

### Neutral

- Log file management required (`/tmp/lsh-job-daemon-<user>.log`)
- Signal handling needed (SIGTERM, SIGHUP, SIGINT)

## Alternatives Considered

### Option 1: HTTP API on localhost

- **Description**: REST API on localhost:port
- **Pros**: Standard HTTP tooling, browser-accessible
- **Cons**: Port conflicts, firewall complexity, slower
- **Why rejected**: Overkill for local-only CLI communication

### Option 2: Redis Pub/Sub

- **Description**: Redis as message broker between CLI and daemon
- **Pros**: Scalable, supports multiple daemons, persistence
- **Cons**: External dependency, operational complexity
- **Why rejected**: Too heavy for single-user CLI tool

### Option 3: gRPC

- **Description**: High-performance RPC framework
- **Pros**: Type-safe, efficient binary protocol, streaming
- **Cons**: Complex setup, protobuf compilation needed
- **Why rejected**: Unnecessary complexity for simple command protocol

### Option 4: DBus (Linux only)

- **Description**: Linux desktop IPC system
- **Pros**: System integration, standard on Linux
- **Cons**: Linux-only, complex API, overkill for CLI
- **Why rejected**: Platform lock-in, not needed for CLI tool

## Implementation Notes

### Daemon Startup

```typescript
// src/daemon/lshd.ts
export class LSHJobDaemon {
  private socket: net.Server;
  private socketPath: string;

  async start(): Promise<void> {
    // Check for existing daemon
    if (await this.isRunning()) {
      throw new Error('Daemon already running');
    }

    // Write PID file
    await this.writePidFile();

    // Create Unix socket
    this.socketPath = `/tmp/lsh-daemon-${process.env.USER}.sock`;
    this.socket = net.createServer(this.handleConnection.bind(this));

    // Remove stale socket file
    if (fs.existsSync(this.socketPath)) {
      fs.unlinkSync(this.socketPath);
    }

    await new Promise<void>((resolve) => {
      this.socket.listen(this.socketPath, resolve);
    });

    // Set socket permissions (owner only)
    fs.chmodSync(this.socketPath, 0o600);
  }
}
```

### CLI Client

```typescript
// src/lib/daemon-client.ts
export class DaemonClient {
  async sendCommand(command: string, args: any): Promise<any> {
    const socket = net.connect(this.socketPath);

    const request = JSON.stringify({ command, args }) + '\n';
    socket.write(request);

    const response = await this.readResponse(socket);
    socket.end();

    return JSON.parse(response);
  }
}
```

### Signal Handling

```typescript
// Graceful shutdown
process.on('SIGTERM', async () => {
  await daemon.stop();
  process.exit(0);
});

process.on('SIGHUP', async () => {
  // Reload configuration
  await daemon.reload();
});
```

### Process Management

```bash
# Start daemon
lsh daemon start

# Check status
lsh daemon status

# Stop daemon
lsh daemon stop

# View logs
lsh daemon logs --tail 100
```

## Related Decisions

- [ADR-0004](./0004-api-authentication-jwt.md) - API server runs inside daemon
- [ADR-0001](./0001-database-persistence-strategy.md) - Daemon syncs with database

## References

- [Unix domain sockets](https://en.wikipedia.org/wiki/Unix_domain_socket)
- [src/daemon/lshd.ts](../../../src/daemon/lshd.ts)
- [src/lib/daemon-client.ts](../../../src/lib/daemon-client.ts)
- [scripts/install-daemon.sh](../../../scripts/install-daemon.sh)
