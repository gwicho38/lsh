import * as readline from 'readline';

const rl = readline.createInterface(process.stdin, process.stdout);

const stdio = {

  // convenience wrapper over ''console.log'
  print(message?: any, ...opts: any[]) {
    console.log(message, opts);
  },

  // define repl for interactive mode
  repl() {
    rl.question("lsh interactive (type 'q' to exit): ",
      (command: string) => {
        if (command === 'q') {
          rl.close();
          return;
        }

        this.print("Command: ", command);

        this.repl();
      }
    )
  },

};

export default stdio;
