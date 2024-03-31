npm run start --prefix $C3_SERVER_ROOT/tools/bundler -- -e $URL -W /tmp/UI -a $C3_SERVER_ROOT/platform/repo -T $TOKEN -t studio:studio --logDir /tmp/UI/logs --bundler-max-mem 13000 --watcher --bundler --emit-to-server

URL=""
npm run start -- -e $URL -W /tmp/UI -a $C3_SERVER_ROOT/platform/repo -T $TOKEN -t studio:studio --logDir /tmp/UI/logs --bundler-max-mem 13000 --watcher --bundler --emit-to-server

TOKEN=REDACTED

npm run start -- -e https://gkev8dev.c3dev.cloud/lefv20231117/gurusearchui/ --setup --watcher --bundler -t prov:gurusearch --logDir /Users/lefv/c3/logs/gurusearchui/release3 -W /Users/lefv/c3/UI/gurusearchui/release3 --out-dir /Users/lefv/c3/output_dir/gurusearchui/release3 -a /Users/lefv/test/20231115/prov -auth-token $TOKEN


npm run start -- --setup --watcher --bundler -W /Users/lefv/c3/UI/gurusearchui/release3 -e https://gkev8dev.c3dev.cloud/lefv20231117/gurusearchui/ --auth-token $TOKEN -t prov:gurusearchui --out-dir /Users/lefv/c3/output_dir/gurusearchui/release3 -a /Users/lefv/test/20231115/prov --emit-to-server --logDir /Users/lefv/c3/logs/gurusearchui/release3 -v