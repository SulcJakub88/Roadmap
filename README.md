# Roadmap appka - Netlify verze

Stejná appka, ale hostovaná na Netlify: React frontend jako statický web,
API jako Netlify Functions, data v Netlify Blobs (jejich vestavěné úložiště -
žádný soubor na disku, protože Netlify Functions nemají trvalý souborový
systém). Jira token je uložený jako proměnná prostředí na Netlify, nikdy
neputuje do prohlížeče.

Appka je chráněná heslem - bez něj se nikdo (ani ty) nedostane k datům ani
ke spuštění Jira syncu.

## 1. Nahrání na Netlify

Nejjednodušší cestou je propojit tuhle složku s Git repozitářem (GitHub/GitLab)
a ten pak v Netlify přidat jako "Add new site → Import an existing project".
Build nastavení (`netlify.toml`) je už připravené, Netlify ho najde samo.

Alternativně jde nahrát ručně přes `netlify deploy` (Netlify CLI), ale git
propojení je spolehlivější pro pozdější úpravy.

## 2. Proměnné prostředí (Site settings → Environment variables)

Nastav v Netlify tyhle čtyři proměnné:

- `APP_PASSWORD` - heslo, kterým se appka chrání (vymysli si vlastní)
- `JIRA_BASE_URL` - např. `https://eucdigitalis.atlassian.net`
- `JIRA_EMAIL` - tvůj e-mail k Jiře
- `JIRA_API_TOKEN` - token z https://id.atlassian.com/manage-profile/security/api-tokens

Po změně proměnných je potřeba udělat nový deploy (Netlify → Deploys → Trigger deploy),
aby se funkce restartovaly s novými hodnotami.

## 3. Použití

Otevři přidělenou Netlify adresu (nebo si nastav vlastní doménu), zadej heslo
z `APP_PASSWORD` a appka je stejná jako lokální verze - jen dostupná odkudkoliv.

Heslo se ukládá jen v `sessionStorage` prohlížeče (zmizí při zavření karty/prohlížeče),
posílá se v hlavičce `x-app-password` ke každému požadavku.

## 4. Rychlé přidání nápadu (macOS Shortcuts)

Stejné jako u lokální verze, jen místo `http://localhost:3001/api/quick-idea`
použij `https://tvoje-adresa.netlify.app/api/quick-idea` a přidej hlavičku
`x-app-password: tvoje_heslo` do akce "Get Contents of URL" (Headers).

## 5. Lokální vývoj/test

```bash
npm install
cd client && npm install && cd ..
netlify dev
```

Netlify CLI si sám vytvoří `.env`/proměnné z Netlify UI (`netlify link` napřed),
nebo si je nastav lokálně přes `netlify env:set NÁZEV hodnota`.

## Rozdíly oproti lokální (Express) verzi

- Žádný `server/data.json` na disku - data jsou v Netlify Blobs
- Žádný `server/.env` - proměnné jsou v Netlify UI
- Přístup je chráněný heslem (lokální verze heslo nemá, běží jen u tebe na počítači)
- Endpointy jsou "ploché" (`/api/jira-refresh`, `/api/export-xlsx` místo
  `/api/jira/refresh`, `/api/export/xlsx`) - Netlify Functions nepodporují
  vnořené cesty stejným způsobem jako Express router
