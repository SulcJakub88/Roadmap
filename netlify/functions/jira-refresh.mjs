import { getStore } from "@netlify/blobs";
import { checkAuth, unauthorized, json, mapJiraStatus, DEFAULT_JIRA_MAP } from "./lib/shared.mjs";

async function fetchJiraStatuses(keys) {
  const base = (process.env.JIRA_BASE_URL || "").replace(/\/+$/, "");
  const email = process.env.JIRA_EMAIL || "";
  const token = process.env.JIRA_API_TOKEN || "";
  if (!base || !email || !token) {
    throw new Error("Jira přihlašovací údaje nejsou nastavené v Netlify proměnných prostředí");
  }
  const auth = Buffer.from(`${email}:${token}`).toString("base64");
  const jql = `key in (${keys.join(",")})`;
  const url = `${base}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&fields=status&maxResults=100`;
  const res = await fetch(url, {
    headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Jira API chyba ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  const map = {};
  for (const issue of data.issues || []) map[issue.key] = issue.fields?.status?.name || null;
  return map;
}

export default async (req) => {
  if (!checkAuth(req)) return unauthorized();
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const store = getStore("roadmap");
    const data = await store.get("data", { type: "json" });
    if (!data) return json({ error: "Žádná data" }, { status: 400 });

    const keys = [...new Set(data.items.filter((i) => i.jiraKey).map((i) => i.jiraKey.trim().toUpperCase()))];
    if (!keys.length) {
      return json({ data, summary: { updated: 0, unmapped: 0, notFound: 0, checked: 0 } });
    }

    const statusMap = await fetchJiraStatuses(keys);
    let updated = 0;
    let unmapped = 0;
    let notFound = 0;
    for (const item of data.items) {
      if (!item.jiraKey) continue;
      const key = item.jiraKey.trim().toUpperCase();
      const raw = statusMap[key];
      if (raw === undefined) {
        notFound++;
        continue;
      }
      item.jiraStatusRaw = raw;
      const mapped = mapJiraStatus(raw, data.jiraMap || DEFAULT_JIRA_MAP);
      if (mapped) {
        item.status = mapped;
        updated++;
      } else {
        unmapped++;
      }
    }
    await store.setJSON("data", data);
    return json({ data, summary: { updated, unmapped, notFound, checked: keys.length } });
  } catch (e) {
    return json({ error: e.message || "Sync selhal" }, { status: 500 });
  }
};
