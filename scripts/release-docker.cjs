const child_process = require('child_process');

let version = require('../package.json').version;
if (process.argv.length >= 3) {
  version = process.argv[2];
}

console.log('building docker image version', version);
child_process.execSync(
  `docker build -t kiwimeri:${version} -f docker/Dockerfile .`
);
