import { getStore } from "@netlify/blobs";
import { checkAuth, unauthorized, json, defaultState } from "./lib/shared.mjs";

export default async (req) => {
  if (!checkAuth(req)) return unauthorized();

  const store = getStore("roadmap");

  if (req.method === "GET") {
    let data = await store.get("data", { type: "json" });
    if (!data) {
      data = defaultState();
      await store.setJSON("data", data);
    }
    return json(data);
  }

  if (req.method === "PUT") {
    const body = await req.json();
    await store.setJSON("data", body);
    return json(body);
  }

  return new Response("Method not allowed", { status: 405 });
};
