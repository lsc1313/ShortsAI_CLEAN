import puppeteer from "puppeteer";

export async function getProductHTML(url){

    const browser=
    await puppeteer.launch({

        headless:true,

        args:[
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-blink-features=AutomationControlled"
        ]

    });

    try{

        const page=
        await browser.newPage();

        await page.setUserAgent(
            "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/139.0.0.0 Mobile Safari/537.36"
        );

        await page.setViewport({
            width:412,
            height:915,
            isMobile:true
        });

        await page.goto(url,{
            waitUntil:"networkidle2",
            timeout:60000
        });

        const html=
        await page.content();

        return html;

    }finally{

        await browser.close();

    }

}
