const child_process = require('child_process');

const currentVersion = require('../electron/package.json').version;

const versionRegexp = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;

let options = '--no-git-tag-version';
let version = 'patch';
let increment = '--' + version;
if (process.argv.length >= 3) {
  version = process.argv[2];
  if (['patch', 'minor', 'major'].find(v => v === version)) {
    increment = '--' + version;
  } else {
    const versionMatch = version.match(versionRegexp);
    if (!versionMatch) {
      console.log('Invalid version: ', version);
      return 1;
    }
    increment = '--new-version ' + version;
  }
}
console.log(`set version ${currentVersion} -> ${version}`);

child_process.execSync(`git stash -u`);
// update package.json
child_process.execSync(`yarn version ${increment} ${options}`);
// update electron/package.json
child_process.execSync(`yarn --cwd=electron version ${increment} ${options}`);

// whatever happened, fetch the new version
const finalVersion = require('../package.json').version;
const versionMatch = finalVersion.match(versionRegexp);
const major = parseInt(versionMatch[1]);
const minor = parseInt(versionMatch[2]);
const fix = parseInt(versionMatch[3]);
const versionCode = fix + minor * 100 + major * 10000;

console.log(`final version -> ${finalVersion} (${versionCode})`);

// update .env.production
child_process.execSync(
  `sed -i -r "s|VITE_KIWIMERI_VERSION=(.*)|VITE_KIWIMERI_VERSION=${finalVersion}|" .env.production`
);

// finally update gradle version
child_process.execSync(
  `sed -i -r "s|versionName = '(.*)'|versionName = '${finalVersion}'|" android/version.gradle`
);
child_process.execSync(
  `sed -i -r "s|versionCode = (.*)|versionCode = ${versionCode}|" android/version.gradle`
);

// git commit & tag
child_process.execSync(`git add package.json; \
    git add electron/package.json; \
    git add .env.production ; \
    git add android/version.gradle ; \
    git commit -m "v${finalVersion}"; \
    git tag v${finalVersion} -m "v${finalVersion}"
    `);
