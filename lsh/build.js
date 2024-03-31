import { compile } from 'nexe';

compile({
  input: './dist/app.js', // Entry JavaScript file, adjust as necessary
  resources: './build/bin/dist/**',
  name: 'lsh',
  output: 'lsh', // Desired output name for your executable
  build: true
//   target: 'windows-x64-14.15.4', // Specify target (this is for Windows, adjust as needed)
  // For other configurations like bundling additional files, refer to Nexe documentation
}).then(() => {
  console.log('Executable has been created!');
}).catch((error) => {
  console.error('Error building executable:', error);
});
