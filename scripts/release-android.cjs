const child_process = require('child_process');
const fs = require('fs');

let version = require('../package.json').version;
const executable = `android/app/build/outputs/apk/release/app-release.apk`;

console.log('building android version', version);

console.log('preparing gradle .env');
child_process.execSync(`cp -R android/environments/prod/* android`);

if (fs.existsSync('.env.production.local')) {
  console.log('preparing .env');
  fs.renameSync('.env.production.local', '.env.production.local.bak');
}

console.log('building the app for production');
child_process.execSync(`npx ionic cap build android --no-open --prod`);
child_process.execSync(`cd android; ./gradlew :app:assembleRelease`);

if (process.env.RELEASE_PATH) {
  if (!fs.existsSync(`${process.env.RELEASE_PATH}/${version}`)) {
    fs.mkdirSync(`${process.env.RELEASE_PATH}/${version}`);
  }
  const oldPath = executable;
  const newPath = `${process.env.RELEASE_PATH}/${version}/kiwimeri-app-${version}.apk`;
  fs.copyFileSync(oldPath, newPath, fs.COPYFILE_EXCL);
  console.log(`successfully copied ${oldPath} to ${newPath}`);
}

if (fs.existsSync('.env.production.local.bak')) {
  fs.renameSync('.env.production.local.bak', '.env.production.local');
}

child_process.execSync(`cp -R android/environments/local/* android`);
