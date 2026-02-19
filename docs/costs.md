# Project Costs

Vitamind is a static Single Page App hosted on GitHub Pages. Infrastructure costs come from two sources: **GitHub** and **Mapbox**.

---

## GitHub

| Service | Cost |
|---------|------|
| GitHub Pages (public repo) | **Free** |
| GitHub Actions (public repo) | **Free** — unlimited minutes on GitHub-hosted runners |

GitHub costs are **$0/month** at any traffic level for a public repository.

---

## Mapbox

Mapbox charges are usage-based. Vitamind uses two billable Mapbox products:

### Map Loads (Mapbox GL JS)

One map load is counted each time the app initializes — i.e. once per user session.

| Monthly map loads | Cost |
|-------------------|------|
| 0 – 50,000 | Free |
| 50,001+ | $5.00 per 1,000 |

### Geocoding API (Temporary / Reverse)

One reverse geocoding request is made each time a user selects a location (map click or GPS). Typical session: **1–3 requests**.

| Monthly requests | Cost |
|-----------------|------|
| 0 – 100,000 | Free |
| 100,001 – 500,000 | $0.75 per 1,000 |
| 500,001 – 1,000,000 | $0.60 per 1,000 |
| 1,000,001 – 5,000,000 | $0.45 per 1,000 |

### Estimated Monthly Cost by Traffic

Assumes **2 geocoding requests per session** (average).

| Monthly active users | Map load cost | Geocoding cost | **Total** |
|---------------------|--------------|----------------|-----------|
| 0 – 25,000 | $0 | $0 | **$0** |
| 50,000 | $0 | $0 | **$0** |
| 100,000 | $250 | $75 | **$325** |
| 250,000 | $1,250 | $300 | **$1,550** |
| 500,000 | $2,750 | $675 | **$3,425** |

### Free Tier Break-even

- **Map loads**: costs begin after **50,000 sessions/month**
- **Geocoding**: costs begin after **~50,000 sessions/month** (at 2 requests/session)

Both free tiers effectively align at ~50,000 monthly active users before any Mapbox bill is incurred.

---

## Notes

- Mapbox pricing is subject to change. Verify current rates at [mapbox.com/pricing](https://www.mapbox.com/pricing).
- The Mapbox access token is restricted to `tommyroar.github.io/*` via domain whitelisting, limiting abuse exposure.
- GitHub Actions pricing for public repos is confirmed free through at least 2026 per [GitHub's announcement](https://resources.github.com/actions/2026-pricing-changes-for-github-actions/).
