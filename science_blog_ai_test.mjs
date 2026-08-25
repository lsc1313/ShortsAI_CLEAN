import "dotenv/config";
import { createScienceBlogContent } from "./modules/blog/scienceBlogAI.js";

const topic = "비행기 창문에 작은 구멍이 있는 이유";

console.log("");
console.log("========================================");
console.log(" SCIENCE BLOG AI TEST");
console.log("========================================");
console.log("");
console.log("TOPIC :", topic);
console.log("");

try {
    const result = await createScienceBlogContent(topic);

    console.log("===== SCIENCE BLOG RESULT =====");
    console.log(JSON.stringify(result, null, 2));
    console.log("================================");
    console.log("");
    console.log("TITLE :", result.title);
    console.log("SECTIONS :", result.sections.length);
    console.log("FAQ :", result.faq.length);
    console.log("IMAGE QUERIES :", result.imageQueries.length);
    console.log("");
    console.log("===== IMAGE QUERIES =====");

    for (const query of result.imageQueries) {
        console.log("-", query);
    }

    console.log("");
    console.log("[SUCCESS] Science Blog AI");
} catch (error) {
    console.error("");
    console.error("[FAIL] Science Blog AI");
    console.error(error?.message || error);
    process.exitCode = 1;
}

