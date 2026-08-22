#!/usr/bin/env bash
set -euo pipefail

mkdir -p qa/target/out app/src/main/assets

cat \
  qa/target/chunks/part-{00..08}.b64 \
  qa/target/chunks/block-09-12.b64 \
  qa/target/chunks/block-13-16.b64 \
  qa/target/chunks/block-17-20.b64 \
  qa/target/chunks/block-21-23.b64 \
  | base64 --decode > qa/target/out/classes.dex.xz

echo "337f9bda4bd430de592aab26e6d8bc8cf5eca6e436c13a597686feba283af01e  qa/target/out/classes.dex.xz" | sha256sum -c -

xz -dc qa/target/out/classes.dex.xz > qa/target/out/classes.dex
echo "a994baf7932903c6eeb9b0e556f11db5cef23988ed26eaa3388f73b0eb7e0966  qa/target/out/classes.dex" | sha256sum -c -

(
  cd qa/target/out
  rm -f target.jar
  zip -q -0 target.jar classes.dex
)

cp qa/target/out/target.jar app/src/main/assets/target.jar
