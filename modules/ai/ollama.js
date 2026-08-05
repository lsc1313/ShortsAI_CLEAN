import axios from "axios";

const MODELS = [

    process.env.OLLAMA_MODEL ||

    "llama3.1:8b",

    "qwen2.5:7b",

    "gemma3:12b",

    "mistral:7b"

];

export async function callOllama(prompt){

    const baseUrl =

        process.env.OLLAMA_URL ||

        "http://127.0.0.1:11434";

    let lastError;

    for(const model of MODELS){

        try{

            console.log(

                "[Ollama]",

                model

            );

            const res = await axios.post(

                `${baseUrl}/api/generate`,

                {

                    model,

                    prompt,

                    stream:false

                },

                {

                    headers:{

                        "Content-Type":"application/json"

                    },

                    timeout:120000

                }

            );

            const text =

                res.data

                ?.response

                ?.trim();

            if(text){

                return text;

            }

            throw new Error(

                "응답이 비어있습니다."

            );

        }

        catch(e){

            lastError = e;

            console.log(

                "[Ollama FAIL]",

                model,

                e.response?.status || "",

                e.response?.data?.error ||

                e.message

            );

        }

    }

    throw(

        lastError ||

        new Error(

            "Ollama 호출 실패"

        )

    );

}
