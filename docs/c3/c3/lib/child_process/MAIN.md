Running shell commands from a Node.js REPL (Read-Eval-Print Loop) can be achieved using the `child_process` module provided by Node.js. This module offers various ways to spawn child processes, but the most straightforward for running shell commands are `exec` and `spawn`.

Here's a detailed explanation of how these methods work and how they're tied together with the Node.js event-driven architecture:

### `child_process.exec`

The `exec` function is used to execute a shell command and collect its output. It buffers the output and passes it to a callback function.

```javascript
const { exec } = require('child_process');

exec('ls -lh', (error, stdout, stderr) => {
  if (error) {
    console.error(`exec error: ${error}`);
    return;
  }
  console.log(`stdout: ${stdout}`);
  console.error(`stderr: ${stderr}`);
});
```

- **How it works**: When you invoke `exec`, Node.js spawns a shell and executes the command within that shell, buffering any produced output. The output is then passed to the callback function.
- **Use Case**: Ideal for running commands that produce a limited amount of output.
- **Limitation**: Since it buffers the output, it's not recommended for commands that generate large amounts of data that might exceed the buffer limit.

### `child_process.spawn`

The `spawn` function launches a new process with a given command. It provides a streaming interface for handling data, which makes it suitable for long-running processes with a significant amount of data.

```javascript
const { spawn } = require('child_process');

const ls = spawn('ls', ['-lh']);

ls.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
});

ls.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`);
});

ls.on('close', (code) => {
  console.log(`child process exited with code ${code}`);
});
```

- **How it works**: `spawn` starts the command in a new process, and you can use the `stdout` and `stderr` streams to read data from it. This method is preferable for processes that either run for a long time or produce a lot of data.
- **Use Case**: Ideal for commands that require streaming large amounts of data, like a continuous log file reading.
- **Limitation**: It doesn't create a shell to execute the command, so shell-specific features (like globbing, pipes, etc.) are not available.

### Event-Driven Architecture

Node.js is built around an event-driven architecture. This is particularly evident with the `spawn` method:

- **Streams**: The `stdout` and `stderr` properties of the spawned process are readable streams. You can listen for data events on these streams, which makes it easy to handle output asynchronously as it is produced.
- **Events**: The `close` event allows you to determine when the process has finished and what the exit code was.

### Choosing Between `exec` and `spawn`

- Use `exec` for simple commands that return short outputs.
- Use `spawn` for long-running processes, commands that generate a lot of output, or when you need to handle the process's input/output streams in a more granular way.

### Security Considerations

- Be cautious with user input: If any part of the command comes from user input, there's a risk of command injection. Always sanitize and validate user input.
- Environment: Be aware that the command will run with the same privileges as your Node.js process.

In summary, Node.js provides powerful tools to interact with the system shell, and understanding the differences between `exec` and `spawn`, along with the event-driven paradigm, is crucial for effective and efficient use of these capabilities in various scenarios.