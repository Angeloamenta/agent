# Payload Content Engine (Node + TS + Payload + Postgres)

Mini “content engine” con 3 agenti AI orchestrati (scraper → writer → publisher) su Payload CMS, con worker separato per Jobs Queue e deploy-ready su Render.

## Requisiti

- Node 20.9+
- Postgres disponibile (locale o hosted)

## Setup locale

1) Installa dipendenze

```bash
npm install
```

Se npm segnala conflitti peer deps (capita con alcuni setup), usa:

```bash
npm install --legacy-peer-deps
```

2) Configura env

```bash
cp .env.example .env
```

Compila almeno:

- `DATABASE_URL` (se usi Neon/Supabase/etc, assicurati che includa SSL se richiesto)
- `PAYLOAD_SECRET`
- `CRON_SECRET`

Per LLM (scegline uno):

- Gemini (default): `LLM_PROVIDER=gemini` + `GEMINI_API_KEY`
- OpenAI (opzionale): `LLM_PROVIDER=openai` + `OPENAI_API_KEY`

3) Avvia Payload (web)

```bash
npm run dev
```

Apri `http://localhost:3000/admin` e crea il primo utente.

4) Avvia il worker (processa la queue)

In un altro terminale:

```bash
npm run worker
```

5) Trigger manuale pipeline

```bash
npm run trigger:pipeline
```

Oppure via curl:

```bash
curl -X POST "http://localhost:3000/api/internal/run-pipeline" \
  -H "x-cron-secret: $CRON_SECRET"
```

La route **enqueue** un job `runPipeline` nella queue `pipeline`. Il lavoro pesante gira nel worker.

## API per il frontend

I post pubblicati sono leggibili pubblicamente (gli altri contenuti sono admin-only).

Esempio REST:

```text
/api/posts?where[status][equals]=published&sort=-publishedAt&limit=10&page=1
```

Payload gestisce pagination/sort/filter nativamente.

## Pipeline (Jobs Queue)

Workflow: `runPipeline` (queue: `pipeline`, concurrency key fissa: una pipeline alla volta)

Task:

- `gatePipeline` (gating 48–72h via `PIPELINE_MIN_HOURS` / `PIPELINE_MAX_HOURS`)
- `scrapeSources` (RSS/sitemap preferiti, HTML parsing come default; rate limit per dominio)
- `generateDraft` (Gemini/OpenAI; salva su `drafts` in `ready`)
- `publishPost` (crea `posts` in `draft` o `published` se `AUTO_PUBLISH=true`)

Stato governance:

- `sources.status`: `queued | processed | rejected`
- `drafts.status`: `draft | ready | rejected`

Audit run:

- Collection `automationRuns` con `runId`, `status`, `startedAt`, `finishedAt`, `stats`.

## Sicurezza trigger

Endpoint: `POST /api/internal/run-pipeline`

- Richiede header `x-cron-secret` uguale a `CRON_SECRET`.
- Risponde JSON `{ runId, jobId }`.

## Render deploy

Questo repo include `render.yaml` (Blueprint) con:

- Web Service: `npm run start`
- Background Worker: `npm run worker`
- Cron Job: giornaliero (esegue `npm run trigger:pipeline`)

Env vars richieste su Render:

- `DATABASE_URL`
- `PAYLOAD_SECRET`
- `LLM_PROVIDER` (es. `gemini`)
- `GEMINI_API_KEY` (se `LLM_PROVIDER=gemini`)
- `OPENAI_API_KEY` (se `LLM_PROVIDER=openai`)
- `CRON_SECRET`
- `PIPELINE_MIN_HOURS` (default 48)
- `PIPELINE_MAX_HOURS` (default 72)
- `AUTO_PUBLISH` (default false)
- `PIPELINE_TRIGGER_URL` (URL pubblico del Web Service, es. `https://<name>.onrender.com`)

Note:

- Il cron in `render.yaml` usa `PIPELINE_TRIGGER_URL` per chiamare il tuo Web Service.
- Il worker deve essere attivo per processare i job.

## Verifica end-to-end

1) `npm run dev`
2) `npm run worker`
3) `npm run trigger:pipeline`
4) Controlla in Admin:

- `sources`: nuovi record in `queued/processed`
- `drafts`: nuovi record `ready`
- `posts`: creati in `draft` o `published` (in base a `AUTO_PUBLISH`)

5) Verifica API pubblica:

```bash
curl "http://localhost:3000/api/posts?where[status][equals]=published&sort=-publishedAt&limit=10&page=1"
```
