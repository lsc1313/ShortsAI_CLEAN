import axios from "axios";

const CACHE = {

    gemini: [],

    openrouter: [],

    groq: []

};

export async function getModels(provider){

    switch(provider){

        case "gemini":

            if(!CACHE.gemini.length){

                await getGeminiModel();

            }

            return CACHE.gemini;

        case "openrouter":

            if(!CACHE.openrouter.length){

                await getOpenRouterModel();

            }

            return CACHE.openrouter;

        case "groq":

            if(!CACHE.groq.length){

                await getGroqModel();

            }

            return CACHE.groq;

        default:

            throw new Error(

                "지원하지 않는 Provider"

            );

    }

}

export async function getVisualSearchModels(){

    const apiKey =
        process.env.OPENROUTER_API_KEY;

    if(!apiKey){

        throw new Error(
            "OPENROUTER_API_KEY 없음"
        );

    }

    const res =
        await axios.get(
            "https://openrouter.ai/api/v1/models",
            {
                headers:{
                    Authorization:
                        `Bearer ${apiKey}`
                }
            }
        );

    const now =
        new Date();

    return (res.data.data || [])
        .filter(
            model =>
                model?.id?.includes(":free")
        )
        .filter(
            model =>
                Array.isArray(
                    model?.architecture?.input_modalities
                ) &&
                model.architecture.input_modalities
                    .includes("image")
        )
        .filter(
            model =>
                Array.isArray(
                    model?.supported_parameters
                ) &&
                model.supported_parameters
                    .includes("tools")
        )
        .filter(
            model =>
                Array.isArray(
                    model?.supported_parameters
                ) &&
                model.supported_parameters
                    .includes("tool_choice")
        )
        .filter(
            model => {

                if(
                    !model.expiration_date
                ){

                    return true;

                }

                return new Date(
                    model.expiration_date
                ) > now;

            }
        )
        .map(
            model =>
                model.id
        );

}

async function getGeminiModel(){

    if(CACHE.gemini.length){

return CACHE.gemini;

    }

    const apiKey=

        process.env.GEMINI_API_KEY;

    if(!apiKey){

        throw new Error(

            "GEMINI_API_KEY 없음"

        );

    }

    const res=await axios.get(

        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`

    );

    CACHE.gemini=(

        res.data.models || []

    )

    .filter(

        m=>m.supportedGenerationMethods

        ?.includes(

            "generateContent"

        )

    )

    .map(

        m=>m.name.replace(

            "models/",

            ""

        )

    );

return CACHE.gemini;

}

async function getOpenRouterModel(){

    if(CACHE.openrouter.length){

return CACHE.openrouter;

    }

    const apiKey=

        process.env.OPENROUTER_API_KEY;

    if(!apiKey){

        throw new Error(

            "OPENROUTER_API_KEY 없음"

        );

    }

    const res=await axios.get(

        "https://openrouter.ai/api/v1/models",

        {

            headers:{

                Authorization:

                    `Bearer ${apiKey}`

            }

        }

    );

    CACHE.openrouter=(

        res.data.data || []

    )

    .map(

        m=>m.id

    )

    .filter(

        id=>id.includes(

            ":free"

        )

    );

return CACHE.openrouter;

}

async function getGroqModel(){

    if(CACHE.groq.length){

return CACHE.groq;

    }

    CACHE.groq=[

        "llama-3.3-70b-versatile",

        "llama-3.1-8b-instant"

    ];

return CACHE.groq;

}

export function removeModel(

    provider,

    model

){

    if(

        !CACHE[provider]

    ){

        return;

    }

    CACHE[provider]=

        CACHE[provider]

        .filter(

            m=>m!==model

        );

}

export function clearCache(){

    CACHE.gemini=[];

    CACHE.openrouter=[];

    CACHE.groq=[];

}
