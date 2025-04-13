#!/bin/sh

for i in $(env | grep "^VITE_"); do
    key=$(echo "$i" | cut -d '=' -f 1)
    value=$(echo "$i" | cut -d '=' -f 2-)

    find "/usr/share/nginx/html/" -type f -exec sed -i "s|${key}:\"__dyn__\"|${key}:\"${value}\"|g" {} \;  
done
