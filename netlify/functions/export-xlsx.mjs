import { getStore } from "@netlify/blobs";
import ExcelJS from "exceljs";
import { checkAuth, unauthorized, json, STATUSES } from "./lib/shared.mjs";

export default async (req) => {
  if (!checkAuth(req)) return unauthorized();
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const { ids } = await req.json();
    const store = getStore("roadmap");
    const data = (await store.get("data", { type: "json" })) || { apps: [], items: [] };
    const selected = Array.isArray(ids) && ids.length ? data.items.filter((i) => ids.includes(i.id)) : data.items;

    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet("Rozpočet");
    sheet.columns = [
      { header: "Aplikace", key: "app", width: 20 },
      { header: "Položka", key: "title", width: 42 },
      { header: "Zadavatel", key: "requester", width: 18 },
      { header: "Priorita", key: "priority", width: 10 },
      { header: "Stav", key: "status", width: 26 },
      { header: "Timeframe (original)", key: "tfOrig", width: 18 },
      { header: "Timeframe (v2)", key: "tfV2", width: 18 },
      { header: "MD", key: "md", width: 8 },
      { header: "Kč", key: "priceCzk", width: 14 },
      { header: "Popis", key: "desc", width: 50 },
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE6E8EC" } };

    let mdSum = 0;
    let priceSum = 0;
    for (const item of selected) {
      const appName = data.apps.find((a) => a.id === item.appId)?.name || "";
      const md = Number(item.md) || 0;
      const price = Number(item.priceCzk) || 0;
      mdSum += md;
      priceSum += price;
      sheet.addRow({
        app: appName,
        title: item.title,
        requester: item.requester || "",
        priority: item.priority ? `P${item.priority}` : "",
        status: STATUSES.find((s) => s.id === item.status)?.label || item.status,
        tfOrig: item.timeframeOriginal || "",
        tfV2: item.timeframeV2 || "",
        md: md || "",
        priceCzk: price || "",
        desc: item.summary || item.desc || "",
      });
    }
    sheet.addRow({});
    const totalRow = sheet.addRow({ title: "CELKEM", md: mdSum, priceCzk: priceSum });
    totalRow.font = { bold: true };
    sheet.getColumn("priceCzk").numFmt = "#,##0 Kč";

    const buffer = await wb.xlsx.writeBuffer();
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="rozpocet-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (e) {
    return json({ error: e.message || "Export selhal" }, { status: 500 });
  }
};
