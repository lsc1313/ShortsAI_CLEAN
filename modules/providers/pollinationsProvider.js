export async function searchPollinations(keyword){

    try{

        const prompt = encodeURIComponent(

`${keyword},
professional wildlife photography,
realistic,
DSLR,
85mm lens,
high detail,
natural light,
vertical composition,
9:16`

        );

return [

    {

        provider:"Pollinations",

        url:`https://image.pollinations.ai/prompt/${prompt}`,

        width:1080,

        height:1920,

        tags:keyword,

        score:50

    }

];

    }

    catch{

        return null;

    }

}
