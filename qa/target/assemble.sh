#!/usr/bin/env bash
set -euo pipefail

mkdir -p qa/target/out app/src/main/assets

cat > qa/target/chunks.sha256 <<'EOF'
61db326e389bce0cf50cbe06bcc148560cd567d8f06f7c4500b23e3556d12f1c  qa/target/chunks/part-00.b64
5a8435e2290aedc9b731b0742f658015145187addb8c0b74385f14a1f9f13324  qa/target/chunks/part-01.b64
a339725306c7550a7ba91b5e6b92f79eab62df527bd004d8d2351e8c221f58cd  qa/target/chunks/part-02.b64
acc0efd82d80a87878682cb8feca629281ebe384e4da0a1cc0f06276d2985d48  qa/target/chunks/part-03.b64
3428679428218e4302b882876873b92e2250ba950a75321903c50300ab7bdc8f  qa/target/chunks/part-04.b64
001ea85a538604715b22c3ee83472afedae735d58ebb327603918afc22ea4a9b  qa/target/chunks/part-05.b64
cc8a96ae77544c039693466a1217c66d96286045d4a6da22863d84716a2670be  qa/target/chunks/part-06.b64
5f8405641a2f23fcdc9fbae3f72ac0a94f165ebd20a42676a436be260363a2f2  qa/target/chunks/part-07.b64
262db124cafd577ea6f6a86b9dad9daf54632d28d34ea5c8bcaf0a733b7b68fb  qa/target/chunks/part-08.b64
b79c772d16b83983600cb416a55ab936c42d1c1313d746c4aa790176afe78cd7  qa/target/chunks/block-09-12.b64
2b77741e056077ff49e357b0e5c9a148139e81513af8d469cbd5690cfbcf7a4f  qa/target/chunks/block-13-16.b64
8750aab4df502ee585ae318eb4c3535a193d943ada46f764be071596a3acf1e1  qa/target/chunks/block-17-20.b64
d4906ba3e30dc79457c5e00b605d91c65efd19b6b9253ea6ce1317f1aee01f13  qa/target/chunks/block-21-23.b64
EOF
sha256sum -c qa/target/chunks.sha256

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
