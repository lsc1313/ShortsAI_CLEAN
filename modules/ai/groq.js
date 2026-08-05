import axios from "axios";

import {

    getModels,

    removeModel

} from "./modelLoader.js";

export async function callGroq(prompt){

    const apiKey = process.env.GROQ_API_KEY;

    if(!apiKey){

        throw new Error(

            "GROQ_API_KEY 없음"

        );

    }

    const models = await getModels(

        "groq"

    );

    let lastError;

    for(const model of models){

        try{

            console.log(

                "[Groq]",

                model

            );

            const res = await axios.post(

                "https://api.groq.com/openai/v1/chat/completions",

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

        }

        catch(e){

            lastError=e;

            console.log(

                "[Groq Fail]",

                model

            );

            removeModel(

                "groq",

                model

            );

        }

    }

    throw(

        lastError ||

        new Error(

            "Groq 모델 없음"

        )

    );

}
