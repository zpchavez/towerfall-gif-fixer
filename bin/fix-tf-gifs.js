#!/usr/bin/env node
const argv = process.argv;
const fix = require('../lib/fix');

const files = [];
for (let i = 2; i < argv.length - 1; i += 1) {
  files.push(argv[i]);
}

const inputGlob = argv[2];
const targetDir = argv[argv.length - 1];

if (files.length === 0) {
  console.log('No input files specified');
  process.exit(1);
}

if (!targetDir) {
  console.log('Missing target dir');
  process.exit(1);
}

// Run it on one file at a time, otherwise memory could run out
if (files.length === 1) {
  const file = files[0];
  console.log('file', file);
  fix(
    file,
    `${targetDir}/fixed-${file.substr(file.lastIndexOf('/') + 1)}`
  );
} else {
  files.reduce(
    (promise, file) => {
      return promise.then(
        () => fix(
          file,
          `${targetDir}/fixed-${file.substr(file.lastIndexOf('/') + 1)}`
        )
      );
    },
    Promise.resolve()
  );
}
