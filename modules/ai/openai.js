import axios from "axios";

const MODELS = [

    "gpt-4.1-mini",

    "gpt-4o-mini",

    "gpt-4.1",

    "gpt-4o"

];

export async function callOpenAI(prompt){

    const apiKey = process.env.OPENAI_API_KEY;

    if(!apiKey){

        throw new Error("OPENAI_API_KEY 없음");

    }

    let lastError;

    for(const model of MODELS){

        try{

            console.log("[OpenAI]", model);

            const res = await axios.post(

                "https://api.openai.com/v1/chat/completions",

                {

                    model,

                    messages:[

                        {

                            role:"user",

                            content:prompt

                        }

                    ],

                    temperature:0.7

                },

                {

                    headers:{

                        Authorization:`Bearer ${apiKey}`,

                        "Content-Type":"application/json"

                    },

                    timeout:60000

                }

            );

            const text =

                res.data
                ?.choices?.[0]
                ?.message
                ?.content
                ?.trim();

            if(text){

                return text;

            }

            throw new Error("응답이 비어있습니다.");

        }

        catch(e){

            lastError = e;

            console.log(

                "[OpenAI FAIL]",

                model,

                e.response?.status || "",

                e.response?.data?.error?.message || e.message

            );

        }

    }

    throw(

        lastError ||

        new Error("OpenAI 호출 실패")

    );

}
