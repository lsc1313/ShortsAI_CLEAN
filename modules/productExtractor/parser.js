import axios from "axios";

function find(html,re){

    const m=html.match(re);

    return m ? m[1] : "";

}

export async function parseProduct(url){

    const {data:html}=await axios.get(url,{
        headers:{
            "User-Agent":
            "Mozilla/5.0"
        }
    });

    const product={

        url,

        title:"",
        brand:"",
        price:0,

        thumbnail:"",

        images:[],
        detailImages:[]

    };

    product.title=
        find(html,/"productName":"(.*?)"/);

    product.brand=
        find(html,/"brand":"(.*?)"/);

    product.price=
        Number(
            find(html,/"salePrice":([0-9]+)/)
        );

    product.thumbnail=
        find(
            html,
            /"representImage":"(.*?)"/
        );

    const imgs=[

        ...html.matchAll(
            /"cdnUrl":"(.*?)"/g
        )

    ];

    for(const img of imgs){

        let url=img[1]
        .replace(/\\u002F/g,"/")
        .replace(/\\\\/g,"\\");

        if(!product.images.includes(url))
            product.images.push(url);

    }

    return product;

}
