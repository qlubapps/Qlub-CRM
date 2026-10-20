# Qlub · Adoption Command

One place to see restaurant payment-adoption across the Kingdom — and turn it into action.

## Problem

Growth teams track restaurant **adoption rate** (the share of a restaurant's sales
processed through Qlub) across hundreds of accounts. Today that lives in cluttered
dashboards and manual spreadsheets, rebuilt by hand — so drops get caught late, and
there's no single clear view across cities, accounts, or account managers.

## Solution

A single-screen command center for adoption. It scores every restaurant, surfaces the
accounts pulling adoption up and down, plans field visits, forecasts where the month
lands, and measures each account manager's impact — all in one place, with a clean,
fast interface.

## Features

- **Command Center** — portfolio adoption, top opportunities, and revenue at risk in 30 seconds
- **Daily Tracker** — adoption per restaurant, day by day
- **City Performance** — the accounts driving each city up and down
- **Performance & Forecast** — day/week/month trends and where the month will land vs. target
- **Breakdowns** — adoption across any dimension (city, area, brand, account manager)
- **Restaurants & Restaurant 360** — full portfolio, plus a deep view per account (health, history, next best action)
- **Account Manager Performance** — portfolio adoption and ranking per AM
- **Visit Planner & Zones** — assign field visits and track the team
- **Alerts, Action Center, Offboarding, Zero-Activity** — automatic detection of drops, silent terminals, and accounts to review
- **Data Hub** — upload a data file; the dashboard recalculates live

## Architecture

This hackathon submission is a **self-contained, static front-end demo** — a single
`index.html` with all UI, logic, and a generated mock dataset embedded. It runs entirely
in the browser with **no backend, no database, and no external API calls** (only Google
Fonts and a charting/Excel library load from a CDN).

```
browser → index.html (UI + logic + mock data, all client-side)
          state persists in localStorage ("Demo mode")
```

Internally, the production version of this tool runs on the team's live data via a
separate deployment. For the hackathon we built this compliant, data-free demo so the
full product experience can be reviewed safely.

## Data

**All data in this build is mock / invented.** ~186 fabricated restaurants from ~90
made-up brands across Riyadh, Jeddah, Dammam, Mecca, and Medina, with generated daily
figures (1 Jan – 17 Oct 2026). Account managers, visits, and zones are fictional. No real
restaurant, customer, transaction, or account-manager data is present. The dataset is
produced by a seeded script (`scripts/generate-mock-data.js`), so it's reproducible.

## Run locally

No build step. Just open the file:

```
open index.html        # macOS
start index.html       # Windows
```

Everything works offline except web-font styling and Excel import/export (which load a
library from a CDN).

## Deploy (Railway, Qlub workspace)

Served as a static site. Railway builds from this repo; a small static-server config
serves `index.html`: `npm start` runs `serve -s . -l $PORT` on the port Railway provides.

## Scope & guardrails

Internal Qlub demo. This build contains **no customer data, transaction info, PII, or
payment details** — all figures are invented. It is a front-end demo, not a production
system: it has no server-side authentication and no live data connection. A production
build would add a backend with proper user auth and server-side data/AI.
