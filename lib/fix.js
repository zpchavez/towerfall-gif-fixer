const exec = require('child_process').exec;
const gifsicle = require('gifsicle');
const im = require('imagemagick');

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
    if (badFrames.length === 0) {
      return inputFile;
    }
    let args = [`"${inputFile}"`, '--delete'];
    args = args.concat(
      badFrames.map(frame => `"#${frame}"`)
    );
    args.push('--done');
    args.push('>');
    args.push(`"${outputFile}"`);
    return new Promise((resolve, reject) => {
      exec(`${gifsicle} ${args.join(' ')}`, { maxBuffer: Infinity }, (err, stdout) => {
        if (err) {
          reject(err);
        } else {
          resolve(outputFile);
        }
      })
    })
  });
}

module.exports = fix;
