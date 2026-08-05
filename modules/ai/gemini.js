import axios from "axios";

import {

    getModels,

    removeModel

} from "./modelLoader.js";

export async function callGemini(prompt){

    const apiKey = process.env.GEMINI_API_KEY;

    if(!apiKey){

        throw new Error(

            "GEMINI_API_KEY 없음"

        );

    }

    const models = await getModels(

        "gemini"

    );

    let lastError;

for(const model of models){

    if(model.startsWith("gemma")){
        console.log("[SKIP GEMMA]", model);
        continue;
    }

        try{

            console.log(

                "[Gemini]",

                model

            );

            const res = await axios.post(

                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,

                {

                    contents:[

                        {

                            parts:[

                                {

                                    text:prompt

                                }

                            ]

                        }

                    ]

                },

                {

                    headers:{

                        "Content-Type":"application/json"

                    },

                    timeout:60000

                }

            );

            const text =

                res.data

                ?.candidates?.[0]

                ?.content?.parts

                ?.map(

                    part=>part.text || ""

                )

                .join("")

                ?.trim();

            if(

                text

            ){

                return text;

            }

        }

        catch(e){

            lastError = e;

            console.log(

                "[Gemini Fail]",

                model

            );

            removeModel(

                "gemini",

                model

            );

        }

    }

    throw(

        lastError ||

        new Error(

            "Gemini 모델 없음"

        )

    );

}
