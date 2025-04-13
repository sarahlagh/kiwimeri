const child_process = require('child_process');
const fs = require('fs');

let version = require('../package.json').version;
const executables = [`kiwimeri-app-${version}.AppImage`];

console.log('building electron version', version);
if (!process.env.RELEASE_PATH) {
  console.log('RELEASE_PATH must be defined');
  return 1;
}

if (fs.existsSync('.env.production.local')) {
  console.log('preparing .env');
  fs.renameSync('.env.production.local', '.env.production.local.bak');
}

console.log('building the app for production');
child_process.execSync(`npx ionic cap build electron --no-open --prod`);
child_process.execSync(`yarn --cwd=electron electron:make`);

if (!fs.existsSync(`${process.env.RELEASE_PATH}/${version}`)) {
  fs.mkdirSync(`${process.env.RELEASE_PATH}/${version}`);
}

executables.forEach(f => {
  const oldPath = `electron/dist/${f}`;
  const newPath = `${process.env.RELEASE_PATH}/${version}/${f}`;
  fs.copyFileSync(oldPath, newPath, fs.COPYFILE_EXCL);
  console.log(`successfully copied ${oldPath} to ${newPath}`);

  if (process.env.RELEASE_LINK) {
    fs.copyFileSync(oldPath, process.env.RELEASE_LINK);
    console.log(
      `successfully copied ${oldPath} to ${process.env.RELEASE_LINK}`
    );
  }
});

if (fs.existsSync('.env.production.local.bak')) {
  fs.renameSync('.env.production.local.bak', '.env.production.local');
}
