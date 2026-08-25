import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createHotdealDirector } from "./director.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PRODUCTS_PATH = path.join(
  __dirname,
  "../../coupang-hotdeal/data/today-products.json"
);

const OUTPUT_PATH = path.join(
  __dirname,
  "../../coupang-hotdeal/data/hotdeal-director-test.json"
);

async function run() {
  console.log("========================================");
  console.log("HOTDEAL DIRECTOR 단독 테스트");
  console.log("========================================");

  if (!fs.existsSync(PRODUCTS_PATH)) {
    throw new Error(
      `상품 데이터가 없습니다: ${PRODUCTS_PATH}`
    );
  }

  const source = JSON.parse(
    fs.readFileSync(PRODUCTS_PATH, "utf-8")
  );

  const products = source.products || [];

  console.log(`상품 수: ${products.length}`);

  if (products.length === 0) {
    throw new Error("전달할 상품이 없습니다.");
  }

  const result = await createHotdealDirector(products);

  fs.writeFileSync(
    OUTPUT_PATH,
    JSON.stringify(result, null, 2),
    "utf-8"
  );

  console.log("");
  console.log("===== TEST RESULT =====");
  console.log(`제목: ${result.title}`);
  console.log(
    `비율: ${result.format?.aspectRatio}`
  );
  console.log(
    `목표 길이: ${result.video?.targetDuration}초`
  );
  console.log(
    `상품 수: ${result.products?.length || 0}`
  );

  for (const product of result.products || []) {
    console.log(
      `${product.order}. ${product.productGroup} | ` +
      `${product.unitPrice}원/${product.unitLabel} | ` +
      `7일: ${product.sevenDayStatus} | ` +
      `30일: ${product.thirtyDayStatus} | ` +
      `HOT DEAL: ${product.showHotdeal}`
    );
  }

  console.log("");
  console.log(`결과 파일: ${OUTPUT_PATH}`);
  console.log("========================================");
}

run().catch(error => {
  console.error("");
  console.error("[HOTDEAL DIRECTOR TEST ERROR]");
  console.error(error.message);
  process.exit(1);
});
