import axios from "axios";

const API_KEY = process.env.OPENROUTER_API_KEY;

const MODEL = "qwen/qwen3-32b:free";

export async function callOpenRouter(prompt){

    if(!API_KEY){

        throw new Error("OPENROUTER_API_KEY 없음");

    }

    const res = await axios.post(

        "https://openrouter.ai/api/v1/chat/completions",

        {

            model: MODEL,

            messages: [

                {

                    role: "user",

                    content: prompt

                }

            ],

            temperature: 0.7

        },

        {

            headers: {

                Authorization: `Bearer ${API_KEY}`,

                "Content-Type": "application/json",

                "HTTP-Referer": "https://github.com",

                "X-Title": "ShortsAI"

            },

            timeout: 60000

        }

    );

    const text = res.data
        ?.choices?.[0]
        ?.message
        ?.content
        ?.trim();

    if(!text){

        throw new Error("OpenRouter 응답이 비었습니다.");

    }

    return text;

}
