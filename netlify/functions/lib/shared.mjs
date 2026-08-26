export const STATUSES = [
  { id: "new_idea", label: "New Idea" },
  { id: "analyze", label: "Analyze" },
  { id: "verify_management", label: "Verify with Management" },
  { id: "create_business_assignment", label: "Create Business assigment" },
  { id: "awaiting_pricing", label: "Awaiting for Pricing" },
  { id: "to_recommend", label: "To Recommend" },
  { id: "approved_by_owners", label: "Approved by Business Owners" },
  { id: "to_prioritize", label: "To Prioritize" },
  { id: "planned_todo", label: "Planned = ToDo" },
  { id: "in_progress", label: "In Progress" },
  { id: "pilot", label: "Pilot" },
  { id: "on_hold", label: "On Hold" },
  { id: "wont_do", label: "Won't Do" },
  { id: "complete", label: "Complete" },
  { id: "unknown", label: "?" },
];

// Statusy před vznikem tiketu nemají v Jiře obdobu, proto zůstávají bez
// mapování - sync do nich nikdy nezasáhne.
export const DEFAULT_JIRA_MAP = {
  new_idea: [],
  analyze: [],
  verify_management: [],
  create_business_assignment: [],
  awaiting_pricing: [],
  to_recommend: [],
  approved_by_owners: [],
  to_prioritize: [],
  planned_todo: ["To Do", "Open", "Selected for Development"],
  in_progress: ["In Progress"],
  pilot: ["Pilot"],
  on_hold: ["On Hold", "Blocked"],
  wont_do: ["Won't Do", "Cancelled", "Rejected"],
  complete: ["Done", "Closed", "Resolved"],
  unknown: [],
};

const APP_COLORS = ["#5b8cff", "#e8a33d", "#4caf7d", "#a78bfa", "#e2626b", "#4dd0c9", "#f472b6"];

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export function defaultState() {
  const apps = ["Firemní zóna", "EUC Sandbox", "Time Tracker", "AI Agenti"].map((name, i) => ({
    id: uid(),
    name,
    color: APP_COLORS[i],
  }));
  return {
    apps,
    items: [],
    jiraMap: DEFAULT_JIRA_MAP,
    jiraDomain: (process.env.JIRA_BASE_URL || "").replace(/^https?:\/\//, "") || "vase-domena.atlassian.net",
  };
}

export function mapJiraStatus(raw, mapping) {
  if (!raw) return null;
  const clean = raw.trim().toLowerCase();
  for (const s of STATUSES) {
    const names = mapping[s.id] || [];
    if (names.some((n) => n.trim().toLowerCase() === clean)) return s.id;
  }
  return null;
}

export function checkAuth(req) {
  const password = req.headers.get("x-app-password");
  return !!password && !!process.env.APP_PASSWORD && password === process.env.APP_PASSWORD;
}

export function unauthorized() {
  return new Response(JSON.stringify({ error: "Neplatné heslo" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

export function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
}
