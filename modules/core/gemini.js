import axios from "axios";

export async function callGemini(apiKey, model, prompt){

    const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    let res;

    try{

        res = await axios.post(

            url,

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

    }
    catch(e){

        console.log("");
        console.log("===== GEMINI ERROR =====");
        console.log("MODEL :", model);

        if(e.response){
            console.log("STATUS :", e.response.status);
            console.log(e.response.data);
        }
        else{
            console.log(e.message);
        }

        throw e;

    }

    const text = res.data
        ?.candidates?.[0]
        ?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        ?.trim();

    if(!text){

        throw new Error(
            "Gemini 응답이 비어있습니다."
        );

    }

    return text;

}
