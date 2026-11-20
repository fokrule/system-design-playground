# System Design, Visually

**Live:** https://fokrule.github.io/system-design-playground/

An interactive way to learn system design **in the right order**: not just what each component is, but *which one to reach for, when, and why*.

## The core rule

> Never add a component unless a problem forces you to.

The course follows one system as it grows. Each level starts from a situation, shows what breaks, and introduces the fix.

| Level | Situation | What breaks | What you learn |
|---|---|---|---|
| 0. Going live | From your laptop to a real website | Nobody else can reach it | Static vs dynamic, ports, hosting choices, DNS records, Nginx, HTTPS, process manager, database, CI/CD, monitoring |
| 1. Request journey | What happens when someone visits | — | DNS lookup, TCP/TLS, HTTP, latency numbers, latency vs throughput |
| 2. One server | App + DB on one machine, 100 users | Nothing yet | Requirements, estimating QPS & storage |
| 3. Growing traffic | 10k users | Server CPU maxed out | Vertical vs horizontal scaling, load balancer, stateless servers |
| 4. Read-heavy | 100k users | DB slow on reads | Indexing → cache → read replicas (and why in that order) |
| 5. Data growth | Millions of rows, heavy writes | Single DB can't keep up | Partitioning, sharding, SQL vs NoSQL |
| 6. Slow tasks | Emails, uploads, video processing | Requests time out | Queues, background workers, pub/sub |
| 7. Things fail | A server dies at 3am | Downtime, data loss | Redundancy, failover, replication lag, CAP, rate limiting |
| 8. Global & distributed | Users worldwide, many services | Latency, consistency | CDN, multi-region, microservices, consistent hashing, idempotency |
| 9. Case studies | Real problems | — | URL shortener, chat, news feed, video platform |

Lesson format: **Situation → Symptom → Options → Choose & watch the result → Rule of thumb.** Each option is marked *our pick*, *also works* or *problem*, and wrong choices play out visibly.

Process: each level is discussed first, then built as an interactive lesson.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # scenario, model and render tests
npm run build    # typecheck + production build
```

## Structure

- `src/curriculum.ts`: the level list (drives the sidebar). Levels have stable slugs; numbers come from list position. Use `levelRef('read-heavy')`, never a hardcoded "Level 4".
- `src/App.tsx`: layout + lesson registry (slug → component)
- `src/lib/usePlayback.ts`: shared animation clock for simulations
- `src/lessons/going-live/scenario.ts`: step data + pure `viewFor(step, option)`; the page renders from it
- `src/lessons/going-live/`: `GoingLive.tsx` (stepper + questions), `Diagram.tsx`, `BrowserMock.tsx`
- `src/lessons/request-journey/model.ts`: pure latency model
- `src/lessons/request-journey/`: `Simulator.tsx` (animated journey, waterfall), `RequestJourney.tsx` (lesson page)

## Deploy

Every push to `main` runs the tests, builds, and publishes to GitHub Pages (`.github/workflows/deploy.yml`). The production base path in `vite.config.ts` must match the repo name.
