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

yarn --cwd=electron install --frozen-lockfile
npx ionic cap build electron --no-open --prod
yarn --cwd=electron electron:make

if [ -f ".env.production.local.bak" ]; then
    mv .env.production.local.bak .env.production.local
fi
