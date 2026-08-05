import { getBrowser } from "./browser.js";

export async function login() {

  const { page } = await getBrowser();

  await page.goto(
    "https://partners.coupang.com/",
    {
      waitUntil: "networkidle2"
    }
  );

  console.log("쿠팡 파트너스 접속 완료");

  return page;

}
