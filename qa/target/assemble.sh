#!/usr/bin/env bash
set -euo pipefail
cat qa/target/chunks/part-*.b64 | base64 --decode > qa/target/BicheonAdvisor-V58.apk
echo "b5936bedf91bd87f9ddaa22966379d76f2fb3befeba794de1baf0092864054d4  qa/target/BicheonAdvisor-V58.apk" | sha256sum -c -
