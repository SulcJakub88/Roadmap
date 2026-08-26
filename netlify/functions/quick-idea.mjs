import { getStore } from "@netlify/blobs";
import { checkAuth, unauthorized, json, defaultState, uid } from "./lib/shared.mjs";

export default async (req) => {
  if (!checkAuth(req)) return unauthorized();
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { title, appName } = await req.json();
  if (!title || !title.trim()) return json({ error: "title je povinný" }, { status: 400 });

  const store = getStore("roadmap");
  let data = (await store.get("data", { type: "json" })) || defaultState();

  let appId = null;
  if (appName) {
    const found = data.apps.find((a) => a.name.toLowerCase() === appName.toLowerCase());
    if (found) appId = found.id;
  }

  const item = {
    id: uid(),
    appId,
    title: title.trim(),
    status: "new_idea",
    desc: "",
    jiraKey: "",
    requester: "",
    priority: "2",
    timeframeOriginal: "",
    timeframeV2: "",
    md: "",
    priceCzk: "",
    specLink: "",
    discussWith: "",
    pricingHandoff: { prepared: false, sent: false, received: false },
    noteLog: [],
    todos: [],
  };
  data.items.push(item);
  await store.setJSON("data", data);
  return json({ ok: true, item });
};
