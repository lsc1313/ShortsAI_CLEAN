export async function selectImage({

    search,

    providers = []

}){

    let best = null;

    for(const provider of providers){

        try{

            const result = await provider(search);

            if(!result)
                continue;

            if(
                !best ||
                result.score > best.score
            ){

                best = result;

            }

            if(result.score >= 90){

                break;

            }

        }catch(e){

            console.log(
                "Provider 실패:",
                e.message
            );

        }

    }

    return best;

}
