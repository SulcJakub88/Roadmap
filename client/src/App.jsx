import { useState, useEffect, useRef } from "react";
import { Plus, X, ChevronRight, Trash2, Pencil, Check, Layers, RefreshCw, Settings, StickyNote } from "lucide-react";

const STATUSES = [
  { id: "new_idea", label: "New Idea", color: "#6b7280" },
  { id: "analyze", label: "Analyze", color: "#8b93a3" },
  { id: "verify_management", label: "Verify with Management", color: "#e8a33d" },
  { id: "create_business_assignment", label: "Create Business assigment", color: "#5b8cff" },
  { id: "awaiting_pricing", label: "Awaiting for Pricing", color: "#a78bfa" },
  { id: "to_recommend", label: "To Recommend", color: "#4dd0c9" },
  { id: "approved_by_owners", label: "Approved by Business Owners", color: "#4caf7d" },
  { id: "to_prioritize", label: "To Prioritize", color: "#f472b6" },
  { id: "planned_todo", label: "Planned = ToDo", color: "#5b8cff" },
  { id: "in_progress", label: "In Progress", color: "#e8a33d" },
  { id: "pilot", label: "Pilot", color: "#4dd0c9" },
  { id: "on_hold", label: "On Hold", color: "#e2626b" },
  { id: "wont_do", label: "Won't Do", color: "#6b7280" },
  { id: "complete", label: "Complete", color: "#4caf7d" },
  { id: "unknown", label: "?", color: "#3d4250" },
];

const APP_COLORS = ["#5b8cff", "#e8a33d", "#4caf7d", "#a78bfa", "#e2626b", "#4dd0c9", "#f472b6"];

const PRIORITIES = [
  { id: "1", color: "#e2626b" },
  { id: "2", color: "#e8a33d" },
  { id: "3", color: "#6b7280" },
];

function priorityColor(p) {
  return PRIORITIES.find((x) => x.id === p)?.color || "#6b7280";
}
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const fmtCzk = (n) => Number(n).toLocaleString("cs-CZ") + " Kč";

function statusOf(id) {
  return STATUSES.find((s) => s.id === id) || STATUSES[0];
}

function SegmentBar({ items, height = 6 }) {
  const total = items.length || 1;
  return (
    <div style={{ display: "flex", height, borderRadius: 999, overflow: "hidden", background: "#20242e", width: "100%" }}>
      {STATUSES.map((s) => {
        const count = items.filter((i) => i.status === s.id).length;
        if (!count) return null;
        return <div key={s.id} style={{ width: `${(count / total) * 100}%`, background: s.color }} title={`${s.label}: ${count}`} />;
      })}
    </div>
  );
}

function StatusBadge({ status, onChange }) {
  const s = statusOf(status);
  return (
    <select
      value={status}
      onChange={(e) => onChange(e.target.value)}
      className="mono"
      style={{
        fontSize: 11,
        letterSpacing: 0.3,
        color: s.color,
        background: `${s.color}1a`,
        border: `1px solid ${s.color}55`,
        borderRadius: 5,
        padding: "3px 6px",
        cursor: "pointer",
        maxWidth: 170,
      }}
    >
      {STATUSES.map((st) => (
        <option key={st.id} value={st.id} style={{ color: "#0f1115" }}>
          {st.label}
        </option>
      ))}
    </select>
  );
}

export default function App() {
  const [apps, setApps] = useState([]);
  const [items, setItems] = useState([]);
  const [jiraMap, setJiraMap] = useState({});
  const [jiraDomain, setJiraDomain] = useState("");
  const [selectedApp, setSelectedApp] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [newAppName, setNewAppName] = useState("");
  const [showAddApp, setShowAddApp] = useState(false);
  const [addingItemFor, setAddingItemFor] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [todoDraft, setTodoDraft] = useState({});
  const [showMapping, setShowMapping] = useState(false);
  const [quickIdea, setQuickIdea] = useState("");
  const [quickIdeaApp, setQuickIdeaApp] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [jiraSyncing, setJiraSyncing] = useState(false);
  const [jiraSyncResult, setJiraSyncResult] = useState(null);
  const [jiraLastSync, setJiraLastSync] = useState(null);
  const [activeFilter, setActiveFilter] = useState(null);
  const [activeDiscuss, setActiveDiscuss] = useState(null);
  const [filterTimeframe, setFilterTimeframe] = useState("");
  const [filterRequester, setFilterRequester] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterJiraStatus, setFilterJiraStatus] = useState("");
  const [jiraDraftItem, setJiraDraftItem] = useState(null);
  const [noteDraftId, setNoteDraftId] = useState(null);
  const [noteDraftText, setNoteDraftText] = useState("");
  const [noteDraftDate, setNoteDraftDate] = useState("");
  const [view, setView] = useState("list");
  const [selectedIds, setSelectedIds] = useState({});
  const [importJsonText, setImportJsonText] = useState("");
  const [importResult, setImportResult] = useState(null);
  const [pw, setPw] = useState(() => (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("roadmap_pw") || "" : ""));
  const [pwInput, setPwInput] = useState("");
  const [authError, setAuthError] = useState(null);
  const autoSyncTried = useRef(false);
  const skipSave = useRef(true);

  function apiFetch(path, opts = {}) {
    return fetch(path, { ...opts, headers: { ...(opts.headers || {}), "x-app-password": pw } });
  }

  useEffect(() => {
    if (!pw) return;
    (async () => {
      try {
        const res = await apiFetch("/api/state");
        if (res.status === 401) {
          setAuthError("Špatné heslo.");
          sessionStorage.removeItem("roadmap_pw");
          setPw("");
          return;
        }
        const data = await res.json();
        setApps(data.apps || []);
        setItems(data.items || []);
        setJiraMap(data.jiraMap || {});
        setJiraDomain(data.jiraDomain || "");
        setJiraLastSync(data.jiraLastSync || null);
        setAuthError(null);
      } catch (e) {
        console.error("Nepodařilo se načíst data ze serveru", e);
      } finally {
        skipSave.current = false;
        setLoaded(true);
      }
    })();
  }, [pw]);

  useEffect(() => {
    if (skipSave.current || !pw) return;
    apiFetch("/api/state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apps, items, jiraMap, jiraDomain, jiraLastSync }),
    }).catch((e) => console.error("Uložení se nezdařilo", e));
  }, [apps, items, jiraMap, jiraDomain, jiraLastSync]);

  const scopedItems =
    selectedApp === "__unsorted__" ? items.filter((i) => !i.appId) : selectedApp ? items.filter((i) => i.appId === selectedApp) : items;

  const STATUS_ORDER = STATUSES.map((s) => s.id);
  const FILTERS = [
    { id: "no_ticket", label: "Bez Jira tiketu", test: (i) => !i.jiraKey && STATUS_ORDER.indexOf(i.status) >= STATUS_ORDER.indexOf("planned_todo") },
    { id: "mgmt", label: "Verify with Management", test: (i) => i.status === "verify_management" },
    { id: "pricing_wait", label: "Awaiting for Pricing", test: (i) => i.status === "awaiting_pricing" },
    { id: "has_note", label: "S poznámkou", test: (i) => (i.noteLog || []).length > 0 },
  ];

  const discussContexts = [...new Set(items.map((i) => (i.discussWith || "").trim()).filter(Boolean))];
  const timeframeOptions = [...new Set(items.map((i) => (i.timeframeV2 || i.timeframeOriginal || "").trim()).filter(Boolean))];
  const requesterOptions = [...new Set(items.map((i) => (i.requester || "").trim()).filter(Boolean))];
  const jiraStatusOptions = [...new Set(items.map((i) => (i.jiraStatusRaw || "").trim()).filter(Boolean))];

  const visibleItems = (
    activeFilter === "__discuss__"
      ? scopedItems.filter((i) => (i.discussWith || "").trim() === activeDiscuss)
      : activeFilter
      ? scopedItems.filter(FILTERS.find((f) => f.id === activeFilter)?.test || (() => true))
      : scopedItems
  ).filter(
    (i) =>
      (!filterTimeframe || (i.timeframeV2 || i.timeframeOriginal || "").trim() === filterTimeframe) &&
      (!filterRequester || (i.requester || "").trim() === filterRequester) &&
      (!filterStatus || i.status === filterStatus) &&
      (!filterJiraStatus || (i.jiraStatusRaw || "").trim() === filterJiraStatus)
  );
  const unsortedCount = items.filter((i) => !i.appId).length;
  const jiraLinkedCount = items.filter((i) => i.jiraKey).length;

  function detectApp(line) {
    const low = line.toLowerCase();
    return apps.find((a) => low.includes(a.name.toLowerCase()))?.id || null;
  }

  function importPaste() {
    const lines = pasteText.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return;
    const newItems = lines.map((line) => ({
      id: uid(),
      appId: detectApp(line),
      title: line,
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
    }));
    setItems([...items, ...newItems]);
    setPasteText("");
    setShowPaste(false);
  }

  function addApp() {
    const name = newAppName.trim();
    if (!name) return;
    const color = APP_COLORS[apps.length % APP_COLORS.length];
    setApps([...apps, { id: uid(), name, color }]);
    setNewAppName("");
    setShowAddApp(false);
  }

  function deleteApp(id) {
    setApps(apps.filter((a) => a.id !== id));
    setItems(items.filter((i) => i.appId !== id));
    if (selectedApp === id) setSelectedApp(null);
  }

  function addItem(appId, data) {
    setItems([
      ...items,
      {
        id: uid(),
        appId,
        title: data.title,
        status: data.status,
        desc: data.desc,
        jiraKey: data.jiraKey,
        requester: data.requester || "",
        priority: data.priority || "2",
        timeframeOriginal: data.timeframeOriginal || data.timeframeV2 || "",
        timeframeV2: data.timeframeV2 || "",
        md: data.md || "",
        priceCzk: data.priceCzk || "",
        specLink: data.specLink || "",
        discussWith: data.discussWith || "",
        pricingHandoff: { prepared: false, sent: false, received: false },
        noteLog: [],
        todos: [],
      },
    ]);
    setAddingItemFor(null);
  }

  function quickAddIdea() {
    const title = quickIdea.trim();
    const appId = quickIdeaApp || apps[0]?.id;
    if (!title || !appId) return;
    setItems([
      ...items,
      {
        id: uid(),
        appId,
        title,
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
      },
    ]);
    setQuickIdea("");
  }

  function updateItem(id, patch) {
    setItems((cur) => cur.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  function startAddNote(item) {
    setNoteDraftId(item.id);
    setNoteDraftText("");
    setNoteDraftDate(new Date().toISOString().slice(0, 10));
  }

  function saveNoteEntry() {
    const text = noteDraftText.trim();
    if (text && noteDraftId) {
      const entry = { id: uid(), date: noteDraftDate || new Date().toISOString().slice(0, 10), text };
      setItems(items.map((i) => (i.id === noteDraftId ? { ...i, noteLog: [...(i.noteLog || []), entry] } : i)));
    }
    setNoteDraftId(null);
    setNoteDraftText("");
    setNoteDraftDate("");
  }

  function deleteNoteEntry(itemId, entryId) {
    setItems(items.map((i) => (i.id === itemId ? { ...i, noteLog: (i.noteLog || []).filter((e) => e.id !== entryId) } : i)));
  }

  function exportItemsJson() {
    const data = items.map((i) => ({ ...i, appName: apps.find((a) => a.id === i.appId)?.name || "" }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `roadmap-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importItemsJson() {
    try {
      const parsed = JSON.parse(importJsonText);
      if (!Array.isArray(parsed)) throw new Error("JSON musí být pole položek");
      let workingApps = [...apps];
      function resolveAppId(name) {
        if (!name) return null;
        let found = workingApps.find((a) => a.name.toLowerCase() === name.toLowerCase());
        if (!found) {
          found = { id: uid(), name, color: APP_COLORS[workingApps.length % APP_COLORS.length] };
          workingApps = [...workingApps, found];
        }
        return found.id;
      }
      const newItems = parsed.map((raw) => ({
        id: uid(),
        appId: raw.appId && apps.some((a) => a.id === raw.appId) ? raw.appId : resolveAppId(raw.appName || raw.app),
        title: raw.title || "Bez názvu",
        status: STATUSES.some((s) => s.id === raw.status) ? raw.status : "new_idea",
        desc: raw.desc || "",
        jiraKey: raw.jiraKey || "",
        requester: raw.requester || "",
        priority: raw.priority ? String(raw.priority) : "2",
        timeframeOriginal: raw.timeframeOriginal || "",
        timeframeV2: raw.timeframeV2 || "",
        md: raw.md || "",
        priceCzk: raw.priceCzk || "",
        specLink: raw.specLink || "",
        discussWith: raw.discussWith || "",
        pricingHandoff: raw.pricingHandoff || { prepared: false, sent: false, received: false },
        noteLog: raw.noteLog || [],
        todos: raw.todos || [],
      }));
      setApps(workingApps);
      setItems([...items, ...newItems]);
      setImportJsonText("");
      setImportResult({ ok: true, count: newItems.length });
    } catch (e) {
      setImportResult({ ok: false, error: e.message });
    }
  }

  function toggleSelect(id) {
    setSelectedIds((cur) => {
      const next = { ...cur };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
  }

  async function exportSelectedXlsx(ids) {
    try {
      const res = await apiFetch("/api/export-xlsx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error("Export selhal");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rozpocet-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message);
    }
  }

  function deleteItem(id) {
    setItems(items.filter((i) => i.id !== id));
  }

  function addTodo(itemId) {
    const text = (todoDraft[itemId] || "").trim();
    if (!text) return;
    setItems(items.map((i) => (i.id === itemId ? { ...i, todos: [...i.todos, { id: uid(), text, done: false }] } : i)));
    setTodoDraft({ ...todoDraft, [itemId]: "" });
  }

  function toggleTodo(itemId, todoId) {
    setItems(items.map((i) => (i.id === itemId ? { ...i, todos: i.todos.map((t) => (t.id === todoId ? { ...t, done: !t.done } : t)) } : i)));
  }

  function deleteTodo(itemId, todoId) {
    setItems(items.map((i) => (i.id === itemId ? { ...i, todos: i.todos.filter((t) => t.id !== todoId) } : i)));
  }

  async function refreshFromJira() {
    setJiraSyncing(true);
    setJiraSyncResult(null);
    try {
      const res = await apiFetch("/api/jira-refresh", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Sync selhal");
      setApps(body.data.apps || []);
      setItems(body.data.items || []);
      setJiraMap(body.data.jiraMap || {});
      setJiraSyncResult({ ok: true, ...body.summary });
      setJiraLastSync(new Date().toISOString());
    } catch (e) {
      setJiraSyncResult({ ok: false, error: e.message });
    } finally {
      setJiraSyncing(false);
    }
  }

  const DAY_MS = 24 * 60 * 60 * 1000;
  useEffect(() => {
    if (!loaded || autoSyncTried.current) return;
    const jiraLinked = items.filter((i) => i.jiraKey).length;
    if (!jiraLinked) return;
    const stale = !jiraLastSync || Date.now() - new Date(jiraLastSync).getTime() > DAY_MS;
    if (stale) {
      autoSyncTried.current = true;
      refreshFromJira();
    } else {
      autoSyncTried.current = true;
    }
  }, [loaded, items, jiraLastSync]);

  const counts = STATUSES.map((s) => ({ ...s, count: items.filter((i) => i.status === s.id).length }));

  if (!pw) {
    return (
      <div
        style={{
          background: "#0f1115",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!pwInput.trim()) return;
            sessionStorage.setItem("roadmap_pw", pwInput.trim());
            setAuthError(null);
            setPw(pwInput.trim());
          }}
          style={{ background: "#12151b", border: "1px solid #2c313d", borderRadius: 10, padding: 24, width: 280 }}
        >
          <div style={{ color: "#e6e8ec", fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Roadmap</div>
          <input
            type="password"
            autoFocus
            placeholder="Heslo"
            value={pwInput}
            onChange={(e) => setPwInput(e.target.value)}
            style={{
              width: "100%",
              background: "#171a21",
              border: "1px solid #2c313d",
              color: "#e6e8ec",
              borderRadius: 6,
              padding: "8px 10px",
              fontSize: 13,
              marginBottom: 10,
              boxSizing: "border-box",
            }}
          />
          {authError && <div style={{ color: "#e2626b", fontSize: 12, marginBottom: 10 }}>{authError}</div>}
          <button
            type="submit"
            style={{ width: "100%", background: "#5b8cff", border: "none", color: "#0f1115", borderRadius: 6, padding: "8px 10px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            Vstoupit
          </button>
        </form>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div style={{ background: "#0f1115", color: "#8b93a3", padding: 40, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, minHeight: "100vh" }}>
        načítám...
      </div>
    );
  }

  return (
    <div style={{ background: "#0f1115", minHeight: "100vh", color: "#e6e8ec", fontFamily: "Inter, system-ui, sans-serif", display: "flex" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Inter:wght@400;500;600;700&display=swap');
        .mono { font-family: 'JetBrains Mono', monospace; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-thumb { background: #262b36; border-radius: 8px; }
        .rm-input {
          background: #171a21; border: 1px solid #2c313d; color: #e6e8ec;
          border-radius: 6px; padding: 6px 10px; font-size: 13px; outline: none;
          font-family: Inter, system-ui, sans-serif;
        }
        .rm-input:focus { border-color: #5b8cff; }
        .rm-btn {
          display: inline-flex; align-items: center; gap: 6px;
          background: #1b1f28; border: 1px solid #2c313d; color: #c7cbd4;
          border-radius: 6px; padding: 6px 10px; font-size: 12.5px; cursor: pointer;
        }
        .rm-btn:hover { border-color: #5b8cff; color: #e6e8ec; }
        .rm-btn:disabled { opacity: 0.5; cursor: default; }
        .rm-app-row:hover .rm-app-del { opacity: 1; }
        .spin { animation: rmspin 0.8s linear infinite; }
        @keyframes rmspin { to { transform: rotate(360deg); } }
        body { margin: 0; }
      `}</style>

      {/* Sidebar */}
      <div style={{ width: 230, borderRight: "1px solid #1e222b", padding: 16, display: "flex", flexDirection: "column", gap: 4, flexShrink: 0, minHeight: "100vh" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Layers size={16} color="#5b8cff" />
            <span className="mono" style={{ fontSize: 13, fontWeight: 600, letterSpacing: 0.3 }}>
              ROADMAP
            </span>
          </div>
          <Settings size={14} style={{ color: showMapping ? "#5b8cff" : "#5b6272", cursor: "pointer" }} onClick={() => setShowMapping(!showMapping)} />
        </div>

        {showMapping ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10, overflowY: "auto" }}>
            <div style={{ fontSize: 11, color: "#5b6272" }}>Doména Jiry (pro proklik):</div>
            <input className="rm-input mono" style={{ width: "100%", fontSize: 11.5, padding: "4px 8px" }} value={jiraDomain} onChange={(e) => setJiraDomain(e.target.value)} />

            <div style={{ fontSize: 11, color: "#5b6272", marginTop: 6 }}>Mapování Jira stavů (čárkou oddělené názvy z Jiry):</div>
            {STATUSES.map((s) => (
              <div key={s.id}>
                <div className="mono" style={{ fontSize: 10.5, color: s.color, marginBottom: 2 }}>
                  {s.label}
                </div>
                <input
                  className="rm-input"
                  style={{ width: "100%", fontSize: 11.5, padding: "4px 8px" }}
                  value={(jiraMap[s.id] || []).join(", ")}
                  onChange={(e) => setJiraMap({ ...jiraMap, [s.id]: e.target.value.split(",").map((v) => v.trim()).filter(Boolean) })}
                />
              </div>
            ))}

            <div style={{ fontSize: 11, color: "#5b6272", marginTop: 8, marginBottom: 4 }}>Import / export položek (JSON)</div>
            <textarea
              className="rm-input mono"
              style={{ width: "100%", minHeight: 70, fontSize: 11, resize: "vertical" }}
              placeholder='Vlož pole položek, např. [{"appName":"Firemní zóna","title":"...","priceCzk":400000,"timeframeOriginal":"Q1/2027"}]'
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
            />
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <button className="rm-btn" style={{ flex: 1, justifyContent: "center" }} onClick={importItemsJson}>
                Importovat
              </button>
              <button className="rm-btn" style={{ flex: 1, justifyContent: "center" }} onClick={exportItemsJson}>
                Exportovat vše
              </button>
            </div>
            {importResult && (
              <div className="mono" style={{ fontSize: 10.5, color: importResult.ok ? "#4caf7d" : "#e2626b", marginTop: 4 }}>
                {importResult.ok ? `Naimportováno ${importResult.count} položek` : importResult.error}
              </div>
            )}

            <div style={{ fontSize: 10.5, color: "#3d4250", marginTop: 8 }}>Jira přihlašovací údaje se nastavují v server/.env, ne tady.</div>
          </div>
        ) : (
          <>
            <button
              onClick={() => setSelectedApp(null)}
              style={{
                textAlign: "left",
                background: selectedApp === null ? "#1b1f28" : "transparent",
                border: "none",
                color: selectedApp === null ? "#e6e8ec" : "#8b93a3",
                padding: "7px 8px",
                borderRadius: 6,
                fontSize: 13,
                cursor: "pointer",
                marginBottom: 6,
              }}
            >
              Vše &middot; {items.length}
            </button>

            {unsortedCount > 0 && (
              <button
                onClick={() => setSelectedApp("__unsorted__")}
                style={{
                  textAlign: "left",
                  background: selectedApp === "__unsorted__" ? "#1b1f28" : "transparent",
                  border: "none",
                  color: selectedApp === "__unsorted__" ? "#e8a33d" : "#e8a33d99",
                  padding: "7px 8px",
                  borderRadius: 6,
                  fontSize: 13,
                  cursor: "pointer",
                  marginBottom: 6,
                }}
              >
                Nezařazené &middot; {unsortedCount}
              </button>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
              {apps.map((app) => {
                const appItems = items.filter((i) => i.appId === app.id);
                const active = selectedApp === app.id;
                return (
                  <div
                    key={app.id}
                    className="rm-app-row"
                    onClick={() => setSelectedApp(app.id)}
                    style={{ cursor: "pointer", background: active ? "#1b1f28" : "transparent", borderRadius: 6, padding: "7px 8px", display: "flex", flexDirection: "column", gap: 5 }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                        <span style={{ width: 7, height: 7, borderRadius: 99, background: app.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: active ? "#e6e8ec" : "#c7cbd4", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{app.name}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <span className="mono" style={{ fontSize: 11, color: "#5b6272" }}>
                          {appItems.length}
                        </span>
                        <Trash2
                          size={12}
                          className="rm-app-del"
                          style={{ opacity: 0, color: "#e2626b" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Smazat aplikaci „${app.name}“ včetně položek?`)) deleteApp(app.id);
                          }}
                        />
                      </div>
                    </div>
                    {appItems.length > 0 && <SegmentBar items={appItems} height={4} />}
                  </div>
                );
              })}
            </div>

            {showAddApp ? (
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <input
                  autoFocus
                  className="rm-input"
                  style={{ flex: 1, minWidth: 0 }}
                  placeholder="Název aplikace"
                  value={newAppName}
                  onChange={(e) => setNewAppName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addApp();
                    if (e.key === "Escape") setShowAddApp(false);
                  }}
                />
                <button className="rm-btn" onClick={addApp}>
                  <Check size={13} />
                </button>
              </div>
            ) : (
              <button className="rm-btn" style={{ marginTop: 8, justifyContent: "center" }} onClick={() => setShowAddApp(true)}>
                <Plus size={13} /> Aplikace
              </button>
            )}

            <div style={{ marginTop: "auto", paddingTop: 16, display: "flex", flexDirection: "column", gap: 5 }}>
              {counts
                .filter((c) => c.count > 0)
                .map((c) => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11.5 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#8b93a3" }}>
                      <span style={{ width: 6, height: 6, borderRadius: 99, background: c.color }} />
                      {c.label}
                    </span>
                    <span className="mono" style={{ color: "#c7cbd4" }}>
                      {c.count}
                    </span>
                  </div>
                ))}
            </div>
          </>
        )}
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: "18px 22px", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{selectedApp === "__unsorted__" ? "Nezařazené" : selectedApp ? apps.find((a) => a.id === selectedApp)?.name : "Vše"}</div>
            <div style={{ fontSize: 12, color: "#5b6272" }}>
              {visibleItems.length} položek
              {(() => {
                const mdSum = visibleItems.reduce((a, i) => a + (Number(i.md) || 0), 0);
                const priceSum = visibleItems.reduce((a, i) => a + (Number(i.priceCzk) || 0), 0);
                if (!mdSum && !priceSum) return null;
                return (
                  <span className="mono">
                    {" "}
                    &middot; {mdSum > 0 ? `${mdSum} MD` : ""}
                    {mdSum > 0 && priceSum > 0 ? " / " : ""}
                    {priceSum > 0 ? fmtCzk(priceSum) : ""}
                  </span>
                );
              })()}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ display: "flex", border: "1px solid #2c313d", borderRadius: 6, overflow: "hidden" }}>
              <button
                onClick={() => setView("list")}
                style={{
                  border: "none",
                  padding: "6px 10px",
                  fontSize: 12,
                  cursor: "pointer",
                  background: view === "list" ? "#5b8cff22" : "#1b1f28",
                  color: view === "list" ? "#5b8cff" : "#8b93a3",
                }}
              >
                Seznam
              </button>
              <button
                onClick={() => setView("board")}
                style={{
                  border: "none",
                  padding: "6px 10px",
                  fontSize: 12,
                  cursor: "pointer",
                  background: view === "board" ? "#5b8cff22" : "#1b1f28",
                  color: view === "board" ? "#5b8cff" : "#8b93a3",
                }}
              >
                Nástěnka
              </button>
            </div>
            {jiraSyncResult && (
              <span className="mono" style={{ fontSize: 11, color: jiraSyncResult.ok ? "#5b6272" : "#e2626b" }}>
                {jiraSyncResult.ok
                  ? `aktualizováno ${jiraSyncResult.updated}${jiraSyncResult.unmapped ? `, nezmapováno ${jiraSyncResult.unmapped}` : ""}${
                      jiraSyncResult.notFound ? `, nenalezeno ${jiraSyncResult.notFound}` : ""
                    }`
                  : jiraSyncResult.error}
              </span>
            )}
            {jiraLinkedCount > 0 && jiraLastSync && (
              <span className="mono" style={{ fontSize: 10.5, color: "#3d4250" }}>
                sync {new Date(jiraLastSync).toLocaleString("cs-CZ", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            {jiraLinkedCount > 0 && (
              <button className="rm-btn" disabled={jiraSyncing} onClick={refreshFromJira}>
                <RefreshCw size={13} className={jiraSyncing ? "spin" : ""} /> Aktualizovat z Jiry
              </button>
            )}
            {selectedApp && selectedApp !== "__unsorted__" && (
              <button className="rm-btn" onClick={() => setAddingItemFor(selectedApp)}>
                <Plus size={13} /> Položka
              </button>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <select
            className="rm-input"
            style={{ width: 150, flexShrink: 0 }}
            value={quickIdeaApp || (selectedApp && selectedApp !== "__unsorted__" ? selectedApp : apps[0]?.id) || ""}
            onChange={(e) => setQuickIdeaApp(e.target.value)}
          >
            {apps.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <input
            className="rm-input"
            style={{ flex: 1 }}
            placeholder="Rychlý nápad... (Enter přidá jako Nápad)"
            value={quickIdea}
            onChange={(e) => setQuickIdea(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && quickAddIdea()}
          />
          <button className="rm-btn" onClick={quickAddIdea}>
            <Plus size={13} />
          </button>
          <button className="rm-btn" onClick={() => setShowPaste(!showPaste)}>
            Vlepit poznámky
          </button>
        </div>

        {showPaste && (
          <div style={{ marginBottom: 14 }}>
            <textarea
              autoFocus
              className="rm-input"
              style={{ width: "100%", minHeight: 90, resize: "vertical", fontSize: 13 }}
              placeholder={"Vlep si sem řádky z Outlooku/Obsidianu, přesně jak jsou napsané, např.:\nFZ CM responsibilita udělat X\nTime Tracker - export do XLSX padá na velkých datech"}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 6, justifyContent: "flex-end" }}>
              <button className="rm-btn" onClick={() => setShowPaste(false)}>
                Zrušit
              </button>
              <button className="rm-btn" style={{ borderColor: "#5b8cff", color: "#5b8cff" }} onClick={importPaste}>
                Naimportovat řádky
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {FILTERS.map((f) => {
            const count = scopedItems.filter(f.test).length;
            if (!count) return null;
            const active = activeFilter === f.id;
            return (
              <button
                key={f.id}
                className="rm-btn"
                style={active ? { borderColor: "#5b8cff", color: "#5b8cff", background: "#5b8cff1a" } : {}}
                onClick={() => {
                  setActiveDiscuss(null);
                  setActiveFilter(active ? null : f.id);
                }}
              >
                {f.label} <span className="mono">({count})</span>
              </button>
            );
          })}
          {discussContexts.map((name) => {
            const count = scopedItems.filter((i) => (i.discussWith || "").trim() === name).length;
            if (!count) return null;
            const active = activeFilter === "__discuss__" && activeDiscuss === name;
            return (
              <button
                key={name}
                className="rm-btn"
                style={active ? { borderColor: "#4dd0c9", color: "#4dd0c9", background: "#4dd0c91a" } : {}}
                onClick={() => {
                  if (active) {
                    setActiveFilter(null);
                    setActiveDiscuss(null);
                  } else {
                    setActiveFilter("__discuss__");
                    setActiveDiscuss(name);
                  }
                }}
              >
                💬 {name} <span className="mono">({count})</span>
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          <select className="rm-input mono" style={{ fontSize: 11.5, padding: "4px 8px" }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Stav: vše</option>
            {STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <select className="rm-input mono" style={{ fontSize: 11.5, padding: "4px 8px" }} value={filterTimeframe} onChange={(e) => setFilterTimeframe(e.target.value)}>
            <option value="">Timeframe: vše</option>
            {timeframeOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select className="rm-input mono" style={{ fontSize: 11.5, padding: "4px 8px" }} value={filterRequester} onChange={(e) => setFilterRequester(e.target.value)}>
            <option value="">Zadavatel: vše</option>
            {requesterOptions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select className="rm-input mono" style={{ fontSize: 11.5, padding: "4px 8px" }} value={filterJiraStatus} onChange={(e) => setFilterJiraStatus(e.target.value)}>
            <option value="">Jira stav: vše</option>
            {jiraStatusOptions.map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </select>
          {(filterStatus || filterTimeframe || filterRequester || filterJiraStatus) && (
            <button
              className="rm-btn"
              onClick={() => {
                setFilterStatus("");
                setFilterTimeframe("");
                setFilterRequester("");
                setFilterJiraStatus("");
              }}
            >
              Zrušit filtry
            </button>
          )}
        </div>

        {Object.keys(selectedIds).length > 0 &&
          (() => {
            const selItems = items.filter((i) => selectedIds[i.id]);
            const mdSum = selItems.reduce((a, i) => a + (Number(i.md) || 0), 0);
            const priceSum = selItems.reduce((a, i) => a + (Number(i.priceCzk) || 0), 0);
            return (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  background: "#12151b",
                  border: "1px solid #5b8cff55",
                  borderRadius: 8,
                  padding: "9px 14px",
                  marginBottom: 14,
                }}
              >
                <span className="mono" style={{ fontSize: 12.5, color: "#5b8cff", fontWeight: 700 }}>
                  Vybráno: {selItems.length}
                </span>
                <span className="mono" style={{ fontSize: 12.5, color: "#c7cbd4" }}>
                  {mdSum > 0 ? `${mdSum} MD` : ""}
                  {mdSum > 0 && priceSum > 0 ? " · " : ""}
                  {priceSum > 0 ? fmtCzk(priceSum) : ""}
                </span>
                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <button className="rm-btn" onClick={() => setSelectedIds({})}>
                    Zrušit výběr
                  </button>
                  <button
                    className="rm-btn"
                    style={{ borderColor: "#5b8cff", color: "#5b8cff" }}
                    onClick={() => exportSelectedXlsx(selItems.map((i) => i.id))}
                  >
                    Exportovat do XLSX
                  </button>
                </div>
              </div>
            );
          })()}

        {addingItemFor && <ItemForm onSave={(d) => addItem(addingItemFor, d)} onCancel={() => setAddingItemFor(null)} />}

        {visibleItems.length === 0 && !addingItemFor && (
          <div style={{ color: "#5b6272", fontSize: 13, padding: "30px 0", textAlign: "center" }}>
            {selectedApp ? "Zatím žádné položky. Přidej první přes „+ Položka“." : "Vyber aplikaci vlevo nebo nějakou nejdřív přidej."}
          </div>
        )}

        {view === "list" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {visibleItems
            .slice()
            .reverse()
            .map((item) => {
              const app = apps.find((a) => a.id === item.appId);
              const isOpen = !!expanded[item.id];
              const doneTodos = item.todos.filter((t) => t.done).length;
              return (
                <div key={item.id} style={{ border: "1px solid #1e222b", borderRadius: 8, background: "#12151b" }}>
                  {editingItem === item.id ? (
                    <div style={{ padding: 12 }}>
                      <ItemForm
                        initial={item}
                        onSave={(d) => {
                          updateItem(item.id, d);
                          setEditingItem(null);
                        }}
                        onCancel={() => setEditingItem(null)}
                      />
                    </div>
                  ) : (
                    <>
                      <div
                        style={{ padding: "11px 13px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, cursor: "pointer" }}
                        onClick={() => setExpanded({ ...expanded, [item.id]: !isOpen })}
                      >
                        <div style={{ display: "flex", gap: 9, minWidth: 0 }}>
                          <input
                            type="checkbox"
                            checked={!!selectedIds[item.id]}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => toggleSelect(item.id)}
                            style={{ marginTop: 4, flexShrink: 0 }}
                          />
                          <ChevronRight
                            size={15}
                            style={{ marginTop: 3, flexShrink: 0, color: "#5b6272", transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.12s" }}
                          />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 14, fontWeight: 600 }}>{item.title}</span>
                              {!app && (
                                <select
                                  className="rm-input"
                                  style={{ fontSize: 11, padding: "2px 6px" }}
                                  value=""
                                  onChange={(e) => updateItem(item.id, { appId: e.target.value })}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <option value="" disabled>
                                    přiřadit appku
                                  </option>
                                  {apps.map((a) => (
                                    <option key={a.id} value={a.id}>
                                      {a.name}
                                    </option>
                                  ))}
                                </select>
                              )}
                              {!selectedApp && app && (
                                <span className="mono" style={{ fontSize: 10.5, color: app.color }}>
                                  {app.name}
                                </span>
                              )}
                              {item.jiraKey && (
                                <a
                                  href={`https://${jiraDomain}/browse/${item.jiraKey}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="mono"
                                  style={{ fontSize: 10.5, color: "#5b8cff", border: "1px solid #262b36", borderRadius: 4, padding: "1px 5px", textDecoration: "none" }}
                                >
                                  {item.jiraKey} ↗
                                </a>
                              )}
                              {item.priority && (
                                <span
                                  className="mono"
                                  style={{
                                    fontSize: 10.5,
                                    fontWeight: 600,
                                    color: priorityColor(item.priority),
                                    border: `1px solid ${priorityColor(item.priority)}55`,
                                    borderRadius: 4,
                                    padding: "1px 5px",
                                  }}
                                >
                                  P{item.priority}
                                </span>
                              )}
                              {item.requester && (
                                <span className="mono" style={{ fontSize: 10.5, color: "#8b93a3" }}>
                                  od: {item.requester}
                                </span>
                              )}
                              {item.discussWith && (
                                <span className="mono" style={{ fontSize: 10.5, color: "#4dd0c9" }}>
                                  💬 {item.discussWith}
                                </span>
                              )}
                              {item.timeframeOriginal && (
                                <span className="mono" style={{ fontSize: 10.5, color: item.timeframeV2 && item.timeframeV2 !== item.timeframeOriginal ? "#e8a33d" : "#8b93a3" }}>
                                  {item.timeframeV2 && item.timeframeV2 !== item.timeframeOriginal
                                    ? `${item.timeframeOriginal} → ${item.timeframeV2}`
                                    : item.timeframeOriginal}
                                </span>
                              )}
                              {item.md && (
                                <span className="mono" style={{ fontSize: 10.5, color: "#8b93a3" }}>
                                  {item.md} MD
                                </span>
                              )}
                              {item.priceCzk && (
                                <span className="mono" style={{ fontSize: 10.5, color: "#8b93a3" }}>
                                  {fmtCzk(item.priceCzk)}
                                </span>
                              )}
                              {item.specLink && (
                                <span className="mono" title={item.specLink} style={{ fontSize: 10.5, color: "#5b6272" }}>
                                  📄 zadání
                                </span>
                              )}
                              {item.pricingHandoff?.sent && !item.pricingHandoff?.received && (
                                <span className="mono" style={{ fontSize: 10.5, color: "#a78bfa" }}>
                                  na nacenění (ZIS/Radka)
                                </span>
                              )}
                            </div>
                            {item.desc && <div style={{ fontSize: 12.5, color: "#8b93a3", marginTop: 3, maxWidth: 520 }}>{item.desc}</div>}
                            {(item.noteLog || []).length > 0 && (
                              <div style={{ marginTop: 5, maxWidth: 480 }}>
                                {item.noteLog
                                  .slice()
                                  .reverse()
                                  .slice(0, isOpen ? undefined : 1)
                                  .map((entry) => (
                                    <div key={entry.id} style={{ display: "flex", alignItems: "flex-start", gap: 5, marginBottom: 2 }} onClick={(e) => e.stopPropagation()}>
                                      <StickyNote size={11} style={{ color: "#e8a33d", marginTop: 2, flexShrink: 0 }} />
                                      <span style={{ fontSize: 12, color: "#e8a33d", fontStyle: "italic" }}>
                                        <span className="mono" style={{ color: "#8b6a2e" }}>
                                          {entry.date}:
                                        </span>{" "}
                                        {entry.text}
                                      </span>
                                      {isOpen && (
                                        <X size={10} style={{ color: "#3d4250", cursor: "pointer", marginTop: 3 }} onClick={() => deleteNoteEntry(item.id, entry.id)} />
                                      )}
                                    </div>
                                  ))}
                              </div>
                            )}
                            {noteDraftId === item.id ? (
                              <div style={{ display: "flex", gap: 6, marginTop: 5, maxWidth: 480, alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="date"
                                  className="rm-input mono"
                                  style={{ width: 130, fontSize: 11.5, padding: "4px 6px" }}
                                  value={noteDraftDate}
                                  onChange={(e) => setNoteDraftDate(e.target.value)}
                                />
                                <input
                                  autoFocus
                                  className="rm-input"
                                  style={{ flex: 1, fontSize: 12.5, padding: "4px 8px" }}
                                  placeholder="Poznámka, ať nezapomenu..."
                                  value={noteDraftText}
                                  onChange={(e) => setNoteDraftText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveNoteEntry();
                                    if (e.key === "Escape") {
                                      setNoteDraftId(null);
                                      setNoteDraftText("");
                                    }
                                  }}
                                  onBlur={saveNoteEntry}
                                />
                              </div>
                            ) : (
                              <div
                                className="rm-note-prompt"
                                style={{ fontSize: 11.5, color: "#3d4250", marginTop: 5, cursor: "pointer" }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startAddNote(item);
                                }}
                              >
                                + poznámka
                              </div>
                            )}
                            {item.todos.length > 0 && (
                              <div className="mono" style={{ fontSize: 11, color: "#5b6272", marginTop: 4 }}>
                                {doneTodos}/{item.todos.length} úkolů hotovo
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                          {item.jiraStatusRaw && (
                            <span
                              className="mono"
                              title="Poslední zjištěný stav v Jiře"
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: "#f4f6fb",
                                background: "#5b8cff33",
                                border: "1px solid #5b8cff",
                                borderRadius: 6,
                                padding: "4px 9px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              Jira: {item.jiraStatusRaw}
                            </span>
                          )}
                          {!item.jiraKey && (
                            <button className="rm-btn" style={{ fontSize: 11, padding: "4px 8px" }} onClick={() => setJiraDraftItem(item)}>
                              Připravit Jira tiket
                            </button>
                          )}
                          <StatusBadge status={item.status} onChange={(newStatus) => updateItem(item.id, { status: newStatus })} />
                          <Pencil size={13} style={{ color: "#5b6272", cursor: "pointer" }} onClick={() => setEditingItem(item.id)} />
                          <Trash2
                            size={13}
                            style={{ color: "#5b6272", cursor: "pointer" }}
                            onClick={() => {
                              if (confirm(`Smazat položku „${item.title}“?`)) deleteItem(item.id);
                            }}
                          />
                        </div>
                      </div>

                      {isOpen && (
                        <div style={{ borderTop: "1px solid #1e222b", padding: "10px 13px 12px 37px" }}>
                          {item.todos.map((t) => (
                            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0" }}>
                              <input type="checkbox" checked={t.done} onChange={() => toggleTodo(item.id, t.id)} style={{ accentColor: "#4caf7d" }} />
                              <span style={{ fontSize: 13, color: t.done ? "#5b6272" : "#c7cbd4", textDecoration: t.done ? "line-through" : "none", flex: 1 }}>{t.text}</span>
                              <X size={12} style={{ color: "#3d4250", cursor: "pointer" }} onClick={() => deleteTodo(item.id, t.id)} />
                            </div>
                          ))}
                          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                            <input
                              className="rm-input"
                              style={{ flex: 1, fontSize: 12.5 }}
                              placeholder="Co zbývá udělat..."
                              value={todoDraft[item.id] || ""}
                              onChange={(e) => setTodoDraft({ ...todoDraft, [item.id]: e.target.value })}
                              onKeyDown={(e) => e.key === "Enter" && addTodo(item.id)}
                            />
                            <button className="rm-btn" onClick={() => addTodo(item.id)}>
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
        </div>
        ) : (
          <BoardView items={visibleItems} apps={apps} selectedApp={selectedApp} onOpen={(item) => setEditingItem(item.id)} />
        )}
      </div>
      {jiraDraftItem && <JiraDraftModal item={jiraDraftItem} jiraDomain={jiraDomain} onClose={() => setJiraDraftItem(null)} />}
      {view === "board" && editingItem && (() => {
        const item = items.find((i) => i.id === editingItem);
        if (!item) return null;
        return (
          <div
            style={{ position: "fixed", inset: 0, background: "#00000099", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}
            onClick={() => setEditingItem(null)}
          >
            <div
              style={{ background: "#12151b", border: "1px solid #2c313d", borderRadius: 10, padding: 18, width: 560, maxWidth: "90vw", maxHeight: "85vh", overflowY: "auto" }}
              onClick={(e) => e.stopPropagation()}
            >
              <ItemForm
                initial={item}
                onSave={(d) => {
                  updateItem(item.id, d);
                  setEditingItem(null);
                }}
                onCancel={() => setEditingItem(null)}
              />
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function BoardView({ items, apps, selectedApp, onOpen }) {
  return (
    <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8 }}>
      {STATUSES.map((s) => {
        const colItems = items.filter((i) => i.status === s.id);
        if (!colItems.length) return null;
        return (
          <div key={s.id} style={{ minWidth: 220, maxWidth: 220, flexShrink: 0 }}>
            <div className="mono" style={{ fontSize: 11, fontWeight: 700, color: s.color, marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
              <span>{s.label}</span>
              <span>{colItems.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {colItems.map((item) => {
                const app = apps.find((a) => a.id === item.appId);
                return (
                  <div
                    key={item.id}
                    onClick={() => onOpen(item)}
                    style={{
                      border: "1px solid #1e222b",
                      borderLeft: `3px solid ${s.color}`,
                      borderRadius: 6,
                      background: "#12151b",
                      padding: "8px 10px",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>{item.title}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      {!selectedApp && app && (
                        <span className="mono" style={{ fontSize: 10, color: app.color }}>
                          {app.name}
                        </span>
                      )}
                      {item.priority && (
                        <span className="mono" style={{ fontSize: 10, color: priorityColor(item.priority) }}>
                          P{item.priority}
                        </span>
                      )}
                      {item.timeframeOriginal && (
                        <span className="mono" style={{ fontSize: 10, color: "#5b6272" }}>
                          {item.timeframeOriginal}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ItemForm({ initial, onSave, onCancel }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [status, setStatus] = useState(initial?.status || "new_idea");
  const [desc, setDesc] = useState(initial?.desc || "");
  const [jiraKey, setJiraKey] = useState(initial?.jiraKey || "");
  const [requester, setRequester] = useState(initial?.requester || "");
  const [priority, setPriority] = useState(initial?.priority || "2");
  const [timeframeOriginal, setTimeframeOriginal] = useState(initial?.timeframeOriginal || "");
  const [timeframeV2, setTimeframeV2] = useState(initial?.timeframeV2 || "");
  const [md, setMd] = useState(initial?.md || "");
  const [priceCzk, setPriceCzk] = useState(initial?.priceCzk || "");
  const [specLink, setSpecLink] = useState(initial?.specLink || "");
  const [discussWith, setDiscussWith] = useState(initial?.discussWith || "");
  const [pricingHandoff, setPricingHandoff] = useState(initial?.pricingHandoff || { prepared: false, sent: false, received: false });

  return (
    <div style={{ border: "1px solid #2c313d", borderRadius: 8, padding: 12, marginBottom: 12, background: "#12151b" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input autoFocus className="rm-input" style={{ flex: 1, fontSize: 14, fontWeight: 600 }} placeholder="Název položky" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="rm-input mono" style={{ width: 100, fontSize: 12.5 }} placeholder="WEB-108" value={jiraKey} onChange={(e) => setJiraKey(e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input className="rm-input" style={{ flex: 1, fontSize: 12.5 }} placeholder="Zadavatel" value={requester} onChange={(e) => setRequester(e.target.value)} />
        <select className="rm-input" style={{ width: 90, fontSize: 12.5 }} value={priority} onChange={(e) => setPriority(e.target.value)}>
          {PRIORITIES.map((p) => (
            <option key={p.id} value={p.id}>
              P{p.id}
            </option>
          ))}
        </select>
        <input className="rm-input" style={{ flex: 1, fontSize: 12.5 }} placeholder="S kým probrat (Vítek 1:1...)" value={discussWith} onChange={(e) => setDiscussWith(e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10.5, color: "#5b6272", marginBottom: 3 }}>Timeframe - original</div>
          <input className="rm-input mono" style={{ width: "100%", fontSize: 12.5 }} placeholder="Q1/2026" value={timeframeOriginal} onChange={(e) => setTimeframeOriginal(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10.5, color: "#5b6272", marginBottom: 3 }}>Timeframe - v2</div>
          <input className="rm-input mono" style={{ width: "100%", fontSize: 12.5 }} placeholder="Q2/2027" value={timeframeV2} onChange={(e) => setTimeframeV2(e.target.value)} />
        </div>
        <div style={{ width: 90 }}>
          <div style={{ fontSize: 10.5, color: "#5b6272", marginBottom: 3 }}>MD</div>
          <input className="rm-input" style={{ width: "100%", fontSize: 12.5 }} type="number" value={md} onChange={(e) => setMd(e.target.value)} />
        </div>
        <div style={{ width: 140 }}>
          <div style={{ fontSize: 10.5, color: "#5b6272", marginBottom: 3 }}>Kč</div>
          <input className="rm-input" style={{ width: "100%", fontSize: 12.5 }} type="number" value={priceCzk} onChange={(e) => setPriceCzk(e.target.value)} />
        </div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 10.5, color: "#5b6272", marginBottom: 3 }}>Odkaz na zadání (kde leží detailní popis)</div>
        <input
          className="rm-input"
          style={{ width: "100%", fontSize: 12.5 }}
          placeholder="např. /Users/jakub/Dokumenty/Zadani/WEB-108.docx"
          value={specLink}
          onChange={(e) => setSpecLink(e.target.value)}
        />
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 10.5, color: "#5b6272", marginBottom: 3 }}>Předání k nacenění (ZIS/Radka)</div>
        <div style={{ display: "flex", gap: 14 }}>
          {[
            ["prepared", "Zadání připraveno"],
            ["sent", "Předáno k nacenění"],
            ["received", "Nacenění obdrženo"],
          ].map(([key, label]) => (
            <label key={key} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#c7cbd4" }}>
              <input
                type="checkbox"
                checked={!!pricingHandoff[key]}
                onChange={(e) => setPricingHandoff({ ...pricingHandoff, [key]: e.target.checked })}
              />
              {label}
            </label>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 10.5, color: "#5b6272", marginBottom: 3 }}>Stav</div>
        <select
          className="mono"
          style={{
            width: "100%",
            fontSize: 12.5,
            color: statusOf(status).color,
            background: "#171a21",
            border: "1px solid #2c313d",
            borderRadius: 6,
            padding: "6px 10px",
          }}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUSES.map((s) => (
            <option key={s.id} value={s.id} style={{ color: "#0f1115" }}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <textarea className="rm-input" style={{ width: "100%", marginBottom: 8, resize: "vertical", minHeight: 50 }} placeholder="Stručný popis..." value={desc} onChange={(e) => setDesc(e.target.value)} />
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button className="rm-btn" onClick={onCancel}>
          Zrušit
        </button>
        <button
          className="rm-btn"
          style={{ borderColor: "#5b8cff", color: "#5b8cff" }}
          onClick={() =>
            title.trim() &&
            onSave({
              title: title.trim(),
              status,
              desc: desc.trim(),
              jiraKey: jiraKey.trim(),
              requester: requester.trim(),
              priority,
              timeframeOriginal,
              timeframeV2,
              md,
              priceCzk,
              specLink: specLink.trim(),
              discussWith: discussWith.trim(),
              pricingHandoff,
            })
          }
        >
          Uložit
        </button>
      </div>
    </div>
  );
}

function JiraDraftModal({ item, jiraDomain, onClose }) {
  const [copied, setCopied] = useState(false);

  const summary = item.title;
  const lines = [
    `Zadavatel: ${item.requester || "-"}`,
    `Priorita: ${item.priority || "-"}`,
    `Termín: ${item.timeframeV2 || item.timeframeOriginal || "-"}`,
    item.md ? `Odhad: ${item.md} MD` : null,
    item.priceCzk ? `Cena: ${fmtCzk(item.priceCzk)}` : null,
    "",
    "Popis:",
    item.desc || "-",
  ].filter((l) => l !== null);
  const body = lines.join("\n");
  const fullText = `Shrnutí: ${summary}\n\n${body}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Kopírování selhalo", e);
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "#00000099", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}
      onClick={onClose}
    >
      <div
        style={{ background: "#12151b", border: "1px solid #2c313d", borderRadius: 10, padding: 18, width: 480, maxWidth: "90vw" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Připravené zadání pro Jira tiket</div>
          <X size={16} style={{ cursor: "pointer", color: "#5b6272" }} onClick={onClose} />
        </div>
        <textarea
          readOnly
          className="rm-input mono"
          style={{ width: "100%", minHeight: 220, fontSize: 12, resize: "vertical" }}
          value={fullText}
          onFocus={(e) => e.target.select()}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "flex-end" }}>
          <a
            className="rm-btn"
            href={`https://${jiraDomain}/secure/CreateIssue!default.jspa`}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: "none" }}
          >
            Otevřít Jiru - založit tiket
          </a>
          <button className="rm-btn" style={{ borderColor: "#5b8cff", color: "#5b8cff" }} onClick={copy}>
            {copied ? "Zkopírováno ✓" : "Kopírovat do schránky"}
          </button>
        </div>
      </div>
    </div>
  );
}
