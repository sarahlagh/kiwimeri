#!/bin/sh

target=$1
if [ "$target" != "prod" ] && [ "$target" != "beta" ]; then echo 1; fi

echo "preparing gradle .env for target $target"
cp -R android/environments/$target/* android

if [ -f ".env.production.local" ]; then
    mv .env.production.local .env.production.local.bak
fi

if [ "$target" = "prod" ]; then
    sed -i -r "s/VITE_APP_DIR_NAME='(.*)'/VITE_APP_DIR_NAME='Kiwimeri'/" .env.production 
elif [ "$target" = "beta" ]; then
    sed -i -r "s/VITE_APP_DIR_NAME='(.*)'/VITE_APP_DIR_NAME='KiwimeriBeta'/" .env.production 
fi

echo "building the app for production"

npx ionic cap build android --no-open --prod
cd android
./gradlew :app:assembleRelease
cd ..

if [ -f ".env.production.local.bak" ]; then
    mv .env.production.local.bak .env.production.local
fi

cp -R android/environments/local/* android
sed -i -r "s/VITE_APP_DIR_NAME='(.*)'/VITE_APP_DIR_NAME='Kiwimeri'/" .env.production 
