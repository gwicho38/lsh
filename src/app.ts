import { Command } from 'commander';
import axios from 'axios';
import { test } from './services/zapier.js'; // js extension because https://stackoverflow.com/questions/44979976/how-to-resolve-node-js-es6-esm-modules-with-the-typescript-compiler-tsc-tsc/70682797#70682797
import { init_c3 } from './services/c3/c3.js'; // js extension because https://stackoverflow.com/questions/44979976/how-to-resolve-node-js-es6-esm-modules-with-the-typescript-compiler-tsc-tsc/70682797#70682797

const program = new Command();
init_c3(program);

program
  .version('1.0.0')
  .description('lsh | shell utility for personal cli mgmt.')
  .name('lsh');

program
  .command('ran_i')
  .description('return a random integer')
  .action(() => console.log(Math.floor(Math.random() * (9999999 - 0 + 1)) + 0))

program
  .command('zt')
  .description('tests zappier integration')
  .action(() =>
    test()
  );

// program
//   .command('c3')
//   .description('tests c3 integration')
//   .action(() =>
//     get_c3()
//   );

program
  .command('u <name>')
  .description('sets context directory')
  .action(async (name, pwd) => {
    try {
      const result = "hello";
      console.log("PWD set successfully!");
    } catch (error) {
      console.error('Failed to set the pwd:', error);
    } finally {
      // await prisma.$disconnect();
    }
  });

program
  .command('d <name>')
  .description('sets context directory')
  .action(async (name, pwd) => {
    try {
      // const result = await prisma.user.upsert({
      //   where:  { name: name},
      //   create: { name: name, pwd: pwd },
      //   update: { name: name, pwd: pwd },
      // });
      console.log(`PWD set successfully!}`);
    } catch (error) {
      console.error('Failed to set the pwd:', error);
    } finally {
      // await prisma.$disconnect();
    }
  });

program
  .command('g <name> <directory>')
  .description('Sets context pwd')
  .action(async (name, pwd) => {
    try {
      // const result = await prisma.user.upsert({
      //   where:  { name: name},
      //   create: { name: name, pwd: pwd },
      //   update: { name: name, pwd: pwd },
      // });
      console.log(`PWD set successfully!`);
    } catch (error) {
      console.error('Failed to set the pwd:', error);
    } finally {
      // await prisma.$disconnect();
    }
  });

program
  .command('gpwd <name>')
  .description('Get user pwd')
  .action(async (name) => {
    try {
      // const result = await prisma.user.findUnique({
      //   where: { name: name },
      // });
      // if (result) {
      //   console.log(`Current password: ${result.pwd}`);
      // } else {
      //   console.log('Password not found!');
      // }
    } catch (error) {
      console.error('Failed to get the password:', error);
    } finally {
      // await prisma.$disconnect();
    }
  });

program.parse(process.argv)
