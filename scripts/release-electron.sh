#!/bin/sh

version=$1

if [ -z "$version" ]; then
    version=$(cat package.json | jq -r .version)
fi

echo "building version $version"

executable="kiwimeri-app-${version}.AppImage"

if [ -f ".env.production.local" ]; then
    mv .env.production.local .env.production.local.bak
fi

echo "building the app for production"

# ugly hack to get electron release to work
# quick win before I upgrade to cap 8 AND stop using @capacitor-community/electron
mv capacitor.config.ts capacitor.config.ts.bak
cp electron/capacitor.config.ts .

yarn --cwd=electron install --frozen-lockfile
npx ionic cap build electron --no-open --prod
yarn --cwd=electron electron:make

mv capacitor.config.ts.bak capacitor.config.ts

if [ -f ".env.production.local.bak" ]; then
    mv .env.production.local.bak .env.production.local
fi
