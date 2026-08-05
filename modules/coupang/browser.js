import puppeteer from "puppeteer";

let browser;
let page;

export async function getBrowser() {

  if (browser) {
    return { browser, page };
  }

  browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox"
    ]
  });

  page = await browser.newPage();

  page.setDefaultTimeout(30000);

  return { browser, page };

}
