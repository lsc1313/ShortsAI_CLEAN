import dotenv from "dotenv";

import { callGemini } from "../core/gemini.js";

import {
    loadModels,
    getAvailableModels,
    removeModel
} from "../core/modelManager.js";

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

export async function runPrompt(prompt){

    if(!API_KEY){
        throw new Error("GEMINI_API_KEY 없음");
    }

    if(getAvailableModels().length===0){
        await loadModels(API_KEY);
    }

    const priority = [
        "gemini-2.5-flash",
        "gemini-2.5-pro",
        "gemini-2.0-flash",
        "gemini-2.0-flash-001",
        "gemini-2.0-flash-lite-001",
        "gemini-flash-latest",
        "gemini-flash-lite-latest"
    ];

    while(priority.length){

        const model = priority.find(
            m => getAvailableModels().includes(m)
        );

        if(!model){
            break;
        }

        try{

            return await callGemini(
                API_KEY,
                model,
                prompt
            );

        }catch(e){

            removeModel(model);

        }

    }

    throw new Error("사용 가능한 Gemini 모델 없음");

}

export function parseJSON(text){

    text = String(text)
        .replace(/```json/gi,"")
        .replace(/```/g,"")
        .trim();

    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");

    if(start !== -1 && end !== -1){
        text = text.substring(start,end+1);
    }

    return JSON.parse(text);

}
