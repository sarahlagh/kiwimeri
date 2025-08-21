#!/bin/sh

version=$1
if [ -z "$version" ]; then
    version=$(cat package.json | jq -r .version)
fi

echo "fetching version $version"

if [ -z "$RELEASE_PATH" ]; then
    echo "RELEASE_PATH needs to be defined"
    exit
fi

appimage="https://github.com/sarahlagh/kiwimeri/releases/download/v${version}/kiwimeri-linux-${version}.AppImage"
apk="https://github.com/sarahlagh/kiwimeri/releases/download/v${version}/kiwimeri-android-${version}.apk"

if [ ! -d "$RELEASE_PATH/$version" ]; then
    mkdir $RELEASE_PATH/$version
fi

echo "downloading apk..."
wget -O kiwimeri.apk $apk
newPath="$RELEASE_PATH/${version}/kiwimeri-android-${version}.apk"
mv kiwimeri.apk $newPath
echo "successfully copied apk to ${newPath}"

echo "downloading appimage..."
wget -O kiwimeri.AppImage $appimage
newPath="$RELEASE_PATH/${version}/kiwimeri-linux-${version}.AppImage"
cp kiwimeri.AppImage $newPath
echo "successfully copied appimage to ${newPath}"

if [ ! -z "$RELEASE_LINK" ]; then
    echo "creating additional link for the appimage @ $RELEASE_LINK"
    cp kiwimeri.AppImage $RELEASE_LINK
fi

rm -f kiwimeri.AppImage
