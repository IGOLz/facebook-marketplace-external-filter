#!/bin/sh
# Builds dist/marketplace-native-only-<version>.zip for releases and the Chrome Web Store.
set -eu
cd "$(dirname "$0")/.."
version=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' manifest.json)
mkdir -p dist
out="dist/marketplace-native-only-$version.zip"
rm -f "$out"
zip -qr "$out" manifest.json src icons _locales -x '.*'
echo "$out"
