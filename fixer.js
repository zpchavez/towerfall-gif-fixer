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

const isBadFrame = function(framePath, width, height) {
  return new Promise((outerResolve, outerReject) => {
    const promises = [];
    for (let x = 0; x <= width; x += 100) {
      promises.push(
        new Promise((innerResolve, innerReject) => {
          im.convert(
            [
              framePath,
              '-crop',
              `1x1+${x}+${height-1}`,
              'txt:-'
            ],
            (err, stdout, stderr) => {
              if (err) {
                console.log(err);
                return outerReject(err);
              }
              innerResolve(stdout.indexOf('#000000') > -1);
            });
        }));
    }
    return Promise.all(promises).then(results => {
      outerResolve(results.indexOf(false) === -1);
    });
  });
}

const getBadFramesForFile = function(inputFile) {
  return new Promise(resolve => {
    im.identify([inputFile], (err, output) => {
      let width, height, frameCount;
      const outputLines = output.split("\n").filter(v => !!v);
      frameCount = outputLines.length;
      width = outputLines[0].match(/GIF (\d+)x/)[1];
      height = outputLines[0].match(/GIF \d+x(\d+)/)[1];
      const badFramePromises = [];
      for (let frame = 0; frame < frameCount; frame += 1) {
      // for (let frame = 15; frame < 16; frame +=1 ) {
        badFramePromises.push(isBadFrame(`${inputFile}[${frame}]`, width, height));
      }
      return Promise.all(badFramePromises).then(results => {
        const badFrames = [];
        results.forEach((bad, frame) => {
          if (bad) {
            badFrames.push(frame);
          }
        })
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


// im.convert(['./gifs/replay566.gif[0]', '-crop', '1x1+0+479', 'txt:-'], (err, stdout, stderr) => {
//   console.log(stdout);
// });
// im.convert(['./gifs/replay566.gif[0]', '-crop', '1x1+100+479', 'txt:-'], (err, stdout, stderr) => {
//   console.log(stdout);
// });
// im.convert(['./gifs/replay566.gif[0]', '-crop', '1x1+200+479', 'txt:-'], (err, stdout, stderr) => {
//   console.log(stdout);
// });
// im.convert(['./gifs/replay566.gif[0]', '-crop', '1x1+300+479', 'txt:-'], (err, stdout, stderr) => {
//   console.log(stdout);
// });


// im.convert(['./gifs/replay566-14.png', '-crop', '1x1+0+479', 'txt:-'], (err, stdout, stderr) => {
//   console.log(stdout);
// });
