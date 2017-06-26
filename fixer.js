#!/usr/bin/env node
const im = require('imagemagick');
const glob = require('glob');
// const argv = require('minimist')(process.argv.slice(2));

const inputGlob = process.argv[2];
const targetDir = process.argv[3];

if (!inputGlob) {
  console.log('Missing input file');
  process.exit(1);
}

if (!targetDir) {
  console.log('Missing target dir');
  process.exit(1);
}

// Get pixel all along the bottom. If they are all black, remove the frame.

glob(inputGlob, (err, files) => {
  if (err) {
    throw err;
  }

  files.forEach(
    file => fix(
      file,
      `${targetDir}/${file.substr(file.lastIndexOf('/'))}`
    )
  )
});

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
          im.convert([inputFile, '-crop', `1x1+${x}+${height-1}`, 'txt:-'], (err, stdout, stderr) => {
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
  getBadFramesForFile(inputFile).then(badFrames => {
    console.log('bad frames', badFrames);
  });
}
