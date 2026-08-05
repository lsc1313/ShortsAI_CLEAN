import {
    debug
} from "../logger.js";
import axios from "axios";

let AVAILABLE_MODELS = [];

export async function loadModels(apiKey) {

    try{

        const res = await axios.get(

            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,

            {

                timeout:30000

            }

        );

        AVAILABLE_MODELS = (res.data.models || [])

            .filter(model=>

                model.supportedGenerationMethods?.includes("generateContent")

            )

            .map(model=>

                model.name.replace("models/","")

            )

            .filter(model=>

                !model.includes("tts") &&
                !model.includes("embedding")

            );

debug(
    AVAILABLE_MODELS
);

        return AVAILABLE_MODELS;

    }

    catch(e){

        console.log(

            "모델 목록 로드 실패:",

            e.message

        );

        AVAILABLE_MODELS = [];

        return [];

    }

}

export function getAvailableModels(){

    return AVAILABLE_MODELS;

}

export function removeModel(model){

    AVAILABLE_MODELS = AVAILABLE_MODELS.filter(

        m => m !== model

    );

    return AVAILABLE_MODELS;

}
