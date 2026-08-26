import Anthropic from "@anthropic-ai/sdk";
import { checkAuth, unauthorized, json } from "./lib/shared.mjs";

export default async (req) => {
  if (!checkAuth(req)) return unauthorized();
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { title, desc } = await req.json();
  const text = (desc || "").trim();
  if (!text) return json({ error: "Popis je prázdný, není co shrnout" }, { status: 400 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return json({ error: "ANTHROPIC_API_KEY není nastavený na serveru" }, { status: 500 });
  }

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system:
        "Jsi asistent pro produktový roadmap tým. Z dlouhého technického zadání uděláš krátké shrnutí " +
        "srozumitelné pro management (2 krátké řádky, žádné nadpisy typu 'Popis problému' apod.). " +
        "Piš česky, věcně, bez zbytečných slov. Formát: první řádek stručně CO se dělá (jako název), " +
        "druhý řádek začínající '* ' s jednou větou navíc, pokud je potřeba (jinak druhý řádek vynech).",
      messages: [
        {
          role: "user",
          content: `Název položky: ${title || "-"}\n\nZadání:\n${text}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const summary = (textBlock?.text || "").trim();
    if (!summary) return json({ error: "Model nevrátil žádný text" }, { status: 502 });

    return json({ summary });
  } catch (e) {
    return json({ error: e.message || "Shrnutí selhalo" }, { status: 500 });
  }
};
