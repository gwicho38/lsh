import { compile } from 'nexe';

compile({
  input: './dist/app.js', // This should point to your bundled JavaScript entry file
  resources: [
    './build/bin/dist/**/*.css', // Include all CSS files in the dist directory
    './build/bin/dist/**/*.*'    // Include all other files, adjust as needed
  ],
  name: 'lsh',
  output: 'lsh', // The desired output name for your executable
  build: true, // Set to true to force a rebuild of the Node.js binary
  // Optional: specify target platform and architecture, e.g., 'windows-x64-14.15.4'
}).then(() => {
  console.log('Executable has been created!');
}).catch((error) => {
  console.error('Error building executable:', error);
});

