export async function getRSS(url){

    try{

        const res = await fetch(url);

        if(!res.ok){

            return [];

        }

        const xml = await res.text();

        return xml;

    }catch(e){

        console.error(e);

        return [];

    }

}
