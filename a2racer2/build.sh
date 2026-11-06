#!/bin/sh
# Rebuild the WebAssembly bundle that the add-on ships in web/.
# The game data is never part of this build.
set -eu
HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ROOT=$(CDPATH= cd -- "$HERE/.." && pwd)

"$ROOT/port/web/build.sh"
rm -rf "$HERE/web"
mkdir -p "$HERE/web"
cp -R "$ROOT/port/web/out/." "$HERE/web/"
# Always ship the add-on's server loader, even if out/ came from an older build.
cp "$ROOT/port/web/server-load.js" "$HERE/web/server-load.js"
echo "copied the web build to $HERE/web"
