#!/usr/bin/env node
const exec = require('child_process').exec;
const gifsicle = require('gifsicle');
const im = require('imagemagick');
const argv = process.argv;

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

const getBadFramesForFile = function(inputFile) {
  return new Promise((resolve, reject) => {
    im.identify([inputFile], (err, output) => {
      let width, height, frameCount;
      const outputLines = output.split("\n").filter(v => !!v);
      frameCount = outputLines.length;
      width = outputLines[0].match(/GIF (\d+)x/)[1];
      height = outputLines[0].match(/GIF \d+x(\d+)/)[1];
      const xPositions = [];
      for (let i = 0; i < width; i += 100) {
        xPositions.push(i);
      }
      Promise.all(xPositions.map(x => {
        return new Promise((resolve) =>
          im.convert([inputFile, '-crop', `1x1+${x}+${height-40}`, 'txt:-'], (err, stdout, stderr) => {
            if (err) {
              reject(err);
            }

            resolve(
              stdout.split("\n")
                .filter(v => v && v.indexOf('#') !== 0)
                .map(v => v.indexOf('#000000') > -1)
            );
          }))
      })).then(positionData => {
        const goodFrames = [];
        const badFrames = [];
        for (let frame = 0; frame < positionData[0].length; frame += 1) {
          let isGood = false;
          positionData.forEach(positionDatum => {
            if (isGood) {
              return;
            }
            if (!positionDatum[frame]) {
              isGood = true;
              goodFrames.push(frame);
            }
          });
          if (!isGood) {
            badFrames.push(frame);
          }
        }
        resolve(badFrames);
      })
    });
  });
}

const fix = function(inputFile, outputFile) {
  return getBadFramesForFile(inputFile).then(badFrames => {
    let args = [inputFile, '--delete'];
    args = args.concat(
      badFrames.map(frame => `"#${frame}"`)
    );
    args.push('--done');
    args.push('>');
    args.push(outputFile);
    exec(`${gifsicle} ${args.join(' ')}`, { maxBuffer: Infinity }, (err, stdout) => {
      if (err) {
        console.log(err);
        process.exit(1);
      } else {
        console.log(`Fixed ${inputFile}`);
      }
    })
  });
}

// Run it on one file at a time, otherwise memory could run out
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
