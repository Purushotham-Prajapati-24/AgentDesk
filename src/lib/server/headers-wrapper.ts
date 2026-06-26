import { headers, cookies } from "next/headers.js";

export async function getHeaders() {
  return headers();
}

export async function getCookies() {
  return cookies();
}
