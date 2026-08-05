export function parseRSS(xml){

    const items=[];

    const regex=/<item>([\s\S]*?)<\/item>/g;

    let match;

    while((match=regex.exec(xml))){

        const block=match[1];

        const title=
            block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
            ??
            block.match(/<title>(.*?)<\/title>/)?.[1]
            ??
            "";

        if(title){

            items.push(title.trim());

        }

    }

    return items;

}
