import { createAI } from "../ai.js";

export async function judgeTopics(topics = []) {

    if (!Array.isArray(topics) || topics.length === 0) {
        return [];
    }

    if (topics.length === 1) {
        return topics;
    }

    const prompt = `
아래 후보 중
유튜브 쇼츠 조회수가 가장 높을 가능성이 있는
주제를 하나만 선택해.

${topics.map((t,i)=>
`${i+1}. ${t.title}`
).join("\n")}

숫자만 답변.
`;

    try{

        const result = await createAI(prompt);

        const number = parseInt(
            String(result).match(/\d+/)?.[0] || "1"
        );

        return [
            topics[Math.max(0,Math.min(number-1,topics.length-1))]
        ];

    }catch(e){

        console.log("AI Judge 실패");

        return [
            topics[0]
        ];

    }

}
