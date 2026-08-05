import axios from "axios";

import {

    getModels,

    removeModel

} from "./modelLoader.js";

export async function callOpenRouter(prompt){

    const apiKey = process.env.OPENROUTER_API_KEY;

    if(!apiKey){

        throw new Error(

            "OPENROUTER_API_KEY 없음"

        );

    }

    const models = await getModels(

        "openrouter"

    );

    let lastError;

    for(const model of models){

        try{

            console.log(

                "[OpenRouter]",

                model

            );

            const res = await axios.post(

                "https://openrouter.ai/api/v1/chat/completions",

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

                        "Content-Type":"application/json",

                        "HTTP-Referer":"https://github.com",

                        "X-Title":"ShortsAI"

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

        }

        catch(e){

            lastError=e;

            console.log(

                "[OpenRouter Fail]",

                model

            );

            removeModel(

                "openrouter",

                model

            );

        }

    }

    throw(

        lastError ||

        new Error(

            "OpenRouter 모델 없음"

        )

    );

}
