import dotenv from "dotenv";
dotenv.config();
import { callGemini } from "./gemini.js";
import { callOpenRouter } from "./openrouter.js";
import { callGroq } from "./groq.js";
import { callOpenAI } from "./openai.js";
import { callClaude } from "./claude.js";
import { callOllama } from "./ollama.js";

const PROVIDERS = [

    {

        name:"Gemini",

        enabled:()=>!!process.env.GEMINI_API_KEY,

        call:callGemini

    },

    {

        name:"OpenRouter",

        enabled:()=>!!process.env.OPENROUTER_API_KEY,

        call:callOpenRouter

    },

    {

        name:"Groq",

        enabled:()=>!!process.env.GROQ_API_KEY,

        call:callGroq

    },

    {

        name:"OpenAI",

        enabled:()=>!!process.env.OPENAI_API_KEY,

        call:callOpenAI

    },

    {

        name:"Claude",

        enabled:()=>!!process.env.CLAUDE_API_KEY,

        call:callClaude

    },

    {

        name:"Ollama",

        enabled:()=>!!process.env.OLLAMA_URL,

        call:callOllama

    }

];

export async function callAI(prompt){

    const errors=[];

    for(const provider of PROVIDERS){

        if(!provider.enabled()){

            console.log(

                `[SKIP] ${provider.name}`

            );

            continue;

        }

        try{

            console.log("");

            console.log(

                "=========================="

            );

            console.log(

                provider.name

            );

            console.log(

                "=========================="

            );

            const result=

                await provider.call(

                    prompt

                );

            console.log(

                `[SUCCESS] ${provider.name}`

            );

            return result;

        }

        catch(e){

            console.log(

                `[FAIL] ${provider.name}`

            );

            console.log(

                e.message

            );

            errors.push({

                provider:provider.name,

                error:e.message

            });

        }

    }

    throw new Error(

        "사용 가능한 AI 없음\n"+

        JSON.stringify(

            errors,

            null,

            2

        )

    );

}
