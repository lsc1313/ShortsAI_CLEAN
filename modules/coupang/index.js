import { login } from "./login.js";

export async function startPartners() {

  const page = await login();

  return page;

}
