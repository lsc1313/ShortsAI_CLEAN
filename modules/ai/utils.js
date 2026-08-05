export function hasApiKey(name){

    const value = process.env[name];

    return !!(
        value &&
        String(value).trim() !== ""
    );

}

export function cleanResponse(text){

    if(!text){

        throw new Error("AI 응답 없음");

    }

    text = String(text)
        .replace(/```json/gi,"")
        .replace(/```/g,"")
        .trim();

    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");

    if(start !== -1 && end !== -1){

        text = text.substring(
            start,
            end + 1
        );

    }

    return text;

}

export function parseJSON(text){

    try{

        return JSON.parse(
            cleanResponse(text)
        );

    }

    catch(e){

        throw new Error(
            "JSON Parse 실패\n" +
            e.message
        );

    }

}

export async function safeCall(name, fn){

    try{

        console.log(`▶ ${name}`);

        const result = await fn();

        console.log(`✔ ${name}`);

        return result;

    }

    catch(e){

        console.log(`✖ ${name}`);

        console.log(e.message);

        throw e;

    }

}
