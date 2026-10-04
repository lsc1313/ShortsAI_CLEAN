#!/data/data/com.termux/files/usr/bin/bash

cd ~/ShortsAI_CLEAN || exit 1

echo "===== 1. CURRENT DIR ====="
pwd

echo
echo "===== 2. .ENV EXISTS ====="
ls -la .env

echo
echo "===== 3. .ENV CONTENT ====="
grep "^OPENROUTER_API_KEY" .env | sed 's/=.*/=********/'

echo
echo "===== 4. NODE TEST ====="

cat > envTest.js <<'EON'
import "dotenv/config";

console.log("dotenv =", process.env.OPENROUTER_API_KEY ? "OK" : "FAIL");

if(process.env.OPENROUTER_API_KEY){
    console.log(
        process.env.OPENROUTER_API_KEY.substring(0,12)
    );
}
EON

node envTest.js

echo
echo "===== COMPLETE ====="
