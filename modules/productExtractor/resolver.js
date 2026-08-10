import axios from "axios";

export async function resolvePartnerLink(url){

    if(!url) throw new Error("Partner Link 없음");

    const res = await axios.get(url,{
        maxRedirects:0,
        validateStatus:(s)=>s>=200 && s<400,
        headers:{
            "User-Agent":
            "Mozilla/5.0"
        }
    });

    if(res.status===301 || res.status===302){

        const real =
        res.headers.location;

        return {
            partnerLink:url,
            realUrl:real
        };

    }

    return {
        partnerLink:url,
        realUrl:url
    };

}
