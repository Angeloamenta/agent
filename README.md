# Payload Content Engine

Content pipeline su Payload CMS (scrape -> draft con LLM -> post). In locale servono 2 processi: web + worker.

## Prerequisiti

- Node >= 20.9
- Postgres (es. Neon)

## Quickstart locale

```bash
npm install
cp .env.example .env.local
```

Compila almeno in `.env.local`:

- `DATABASE_URL`
- `PAYLOAD_SECRET`
- `CRON_SECRET`
- LLM: `LLM_PROVIDER=gemini` + `GEMINI_API_KEY` (consigliato) e `GEMINI_MODEL=gemini-2.0-flash`

Avvio (2 terminali):

```bash
npm run dev
```

```bash
npm run worker
```

Poi trigger (terzo terminale):

```bash
npm run trigger:pipeline
```

Admin: `http://localhost:3000/admin`

## Cosa aspettarsi

- `sources`: record creati/aggiornati dallo scraper
- `drafts`: creati dal writer (status `ready`)
- `posts`: creati dal publisher (con `AUTO_PUBLISH=false` rimangono `status=draft`)
- `automationRuns`: audit di ogni run con `stats`

## Troubleshooting (solo il necessario)

- Vedi `sources.rejected` con errore LLM: controlla `GEMINI_API_KEY`/`GEMINI_MODEL` e riavvia worker
- `posts` vuoto ma `drafts` pieno: controlla `AUTO_PUBLISH` (in ogni caso i post sono creati come draft)
- `queued: 0` nello scrape: spesso e' dedup (URL gia' presenti) o insert fallito; guarda i log `article_failed`
