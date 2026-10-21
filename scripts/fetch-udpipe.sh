#!/usr/bin/env bash
# Install the UDPipe 1.4.0 binary that Learnarr lemmatises subtitles with.
# Language models are not fetched here: the app downloads each one from LINDAT
# the first time someone learns that language.
#
#   scripts/fetch-udpipe.sh                  into ./data/udpipe (for npm run dev)
#   UDPIPE_DIR=/opt/udpipe scripts/fetch-udpipe.sh    what the Dockerfile runs
#
# Everything downloaded is checked against a sha256 taken from the real files.
set -euo pipefail

VERSION=1.4.0
DIR="${UDPIPE_DIR:-data/udpipe}"
BIN_ZIP="https://github.com/ufal/udpipe/releases/download/v$VERSION/udpipe-$VERSION-bin.zip"
BIN_ZIP_SHA256=457f541e204737d354c749b473060a28b2debf625f23075543d9eba78be016c1
SOURCE="https://github.com/ufal/udpipe/archive/refs/tags/v$VERSION.tar.gz"
SOURCE_SHA256=b6c4c0de45b7f50688a823dc9189f712e4c6a4bb81c61085be513e4da54e9fb9

fetch() { # url sha256 destination
  curl -fsSL -o "$3" "$1"
  local actual
  actual=$( (command -v sha256sum >/dev/null && sha256sum "$3" || shasum -a 256 "$3") | cut -d' ' -f1)
  if [ "$actual" != "$2" ]; then
    echo "Checksum mismatch for $1 (got $actual); not using it." >&2
    rm -f "$3"
    exit 1
  fi
}

mkdir -p "$DIR"
if "$DIR/udpipe" --version 2>/dev/null | grep -q "$VERSION"; then
  echo "UDPipe $VERSION is already in $DIR"
  exit 0
fi

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

case "$(uname -s)/$(uname -m)" in
  Linux/x86_64) PLATFORM=linux64 ;;
  Darwin/*) PLATFORM=macos ;;
  Linux/aarch64 | Linux/arm64) PLATFORM=source ;;
  *) echo "No UDPipe build for $(uname -s)/$(uname -m)." >&2; exit 1 ;;
esac

if [ "$PLATFORM" = source ]; then
  # The release has no Linux arm64 binary, so build the same version from
  # source. Its makefile knows arm64 only on macOS: add a Linux arm64 platform
  # and keep the x86-only compiler flags off it. Both edits check their target
  # first, so a changed makefile stops the build instead of building something else.
  fetch "$SOURCE" "$SOURCE_SHA256" "$TMP/src.tar.gz"
  tar -xzf "$TMP/src.tar.gz" -C "$TMP"
  MAKEFILE="$TMP/udpipe-$VERSION/src/Makefile.builtem"
  PLATFORMS="PLATFORMS = linux-gcc-64 linux-gcc-32 linux-clang-64 linux-clang-32"
  X86="-mtune=generic -msse -msse2 -mfpmath=sse "
  grep -qF -- "$PLATFORMS" "$MAKEFILE" && grep -qF -- "$X86" "$MAKEFILE" || {
    echo "UDPipe's makefile has changed; review the arm64 build before using it." >&2
    exit 1
  }
  sed -i.orig \
    -e "s|^$PLATFORMS\$|$PLATFORMS linux-gcc-arm64|" \
    -e "s|$X86|\$(if \$(filter %-arm64,\$(PLATFORM)),,$X86)|" \
    "$MAKEFILE"
  make -C "$TMP/udpipe-$VERSION/src" PLATFORM=linux-gcc-arm64 -j"$(nproc 2>/dev/null || echo 2)" exe
  cp "$TMP/udpipe-$VERSION/src/udpipe" "$DIR/udpipe"
else
  fetch "$BIN_ZIP" "$BIN_ZIP_SHA256" "$TMP/udpipe.zip"
  unzip -p "$TMP/udpipe.zip" "udpipe-$VERSION-bin/bin-$PLATFORM/udpipe" > "$DIR/udpipe"
fi
chmod +x "$DIR/udpipe"

# A binary for the wrong machine installs fine and fails on every subtitle; catch that here.
"$DIR/udpipe" --version >/dev/null 2>&1 || { echo "$DIR/udpipe doesn't run on this machine." >&2; exit 1; }
echo "Installed UDPipe $VERSION in $DIR"
