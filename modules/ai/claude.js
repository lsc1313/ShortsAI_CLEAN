import axios from "axios";

const MODELS = [

    "claude-sonnet-4",

    "claude-3-7-sonnet-latest",

    "claude-3-5-sonnet-latest",

    "claude-3-5-haiku-latest"

];

export async function callClaude(prompt){

    const apiKey = process.env.CLAUDE_API_KEY;

    if(!apiKey){

        throw new Error("CLAUDE_API_KEY 없음");

    }

    let lastError;

    for(const model of MODELS){

        try{

            console.log("[Claude]", model);

            const res = await axios.post(

                "https://api.anthropic.com/v1/messages",

                {

                    model,

                    max_tokens:4096,

                    messages:[

                        {

                            role:"user",

                            content:prompt

                        }

                    ]

                },

                {

                    headers:{

                        "x-api-key":apiKey,

                        "anthropic-version":"2023-06-01",

                        "Content-Type":"application/json"

                    },

                    timeout:60000

                }

            );

            const text =

                res.data

                ?.content?.[0]

                ?.text

                ?.trim();

            if(text){

                return text;

            }

            throw new Error(

                "응답이 비어있습니다."

            );

        }

        catch(e){

            lastError=e;

            console.log(

                "[Claude FAIL]",

                model,

                e.response?.status || "",

                e.response?.data?.error?.message ||

                e.message

            );

        }

    }

    throw(

        lastError ||

        new Error(

            "Claude 호출 실패"

        )

    );

}
