#!/bin/sh
# Packages extension/ into the zip you upload to the Chrome Web Store.
set -e
cd "$(dirname "$0")/.."
version=$(node -p "require('./extension/manifest.json').version")
mkdir -p release
out="release/thread-color-finder-v$version.zip"
rm -f "$out"
(cd extension && zip -qr -X "../$out" . -x ".*")
echo "Built $out"
