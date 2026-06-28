# Security News

Practical security research Telegram sender focused on exploitable research, vulnerability write-ups, AI/LLM security, and AI pentesting signals.

The goal is not to forward every security headline. The bot favors items that can become a lab note, threat model update, detection check, authorized pentest idea, AI red-team case, or tool evaluation.

## What It Sends

Each item is formatted for quick triage:

```text
1. [L8][익스플로잇 연구][Short title]
내용: What changed and enough context to understand it
인사이트: Why it matters, what to verify, and a safe lab idea
출처: Source · 원문 직접
```

The Telegram labels are intentionally Korean because the message is consumed in Korean, while this README documents the project in English.

## Level System

| Level | Meaning |
| --- | --- |
| L1 | General security news with low immediate actionability |
| L2 | Threat trend, report, or broad industry signal |
| L3 | Detection rule, checklist, or defensive note |
| L4 | Patch, mitigation, advisory, or version-impact item |
| L5 | Incident, malware, ransomware, or phishing analysis |
| L6 | CVE, PoC, scanner, tool, or bug bounty signal |
| L7 | AI/LLM security, prompt injection, jailbreak, model extraction, or red-team experiment |
| L8 | High-risk vulnerability, attack chain, RCE, SSRF, auth bypass, supply chain issue, or zero-day |
| L9 | Root-cause research from a strong technical source |
| L10 | Paper, arXiv item, or frontier security research |

## Source Strategy

Sources are split into technical depth, AI pentesting coverage, and community experimentation:

- Primary vulnerability research: PortSwigger Research, Google Project Zero, Trail of Bits, GitHub Security Lab, Assetnote Research, watchTowr Labs.
- AI/LLM security and AI pentesting: OWASP GenAI Security, Promptfoo Blog, Protect AI Blog, Anthropic security/safety pages.
- AI pentesting and red-team tooling releases: Strix, PentAGI, NVIDIA garak, Microsoft PyRIT, Promptfoo, Giskard, Agentic Radar.
- Research and papers: arXiv `cs.CR`.
- Operational advisories and incident context: CISA Advisories, BleepingComputer, SecurityWeek, Security Affairs, The Hacker News, Dark Reading, The Register Security, Krebs on Security.
- Community signals: Hacker News top stories, GeekNews RSS, Lobsters Security, and optional Threads keyword search.
- Open-source signals: targeted GitHub searches for `llm-security`, `ai-security`, `ai-pentesting`, `prompt-injection`, and `red-teaming`.

This is not Strix-specific. Strix is one example of the type of source the bot should catch: active tools and research around AI-assisted pentesting, LLM agent security, prompt injection, autonomous security agents, red-team workflows, and scanner/eval tooling.

## Noise Controls

The collector deliberately avoids broad GitHub security searches because they flood the feed with unrelated repos. It now keeps GitHub searches focused on AI security and AI pentesting topics, caps candidates, and labels the source with the matched topic.

The bot also avoids treating generic source names as security evidence. For example, a Hacker News item is not considered relevant just because the source says "Hacker News"; the title/snippet must contain a real security signal unless it comes from a trusted technical security feed.

## Filtering Rules

The collector:

- keeps only recent items from the last 26 hours,
- removes duplicate URLs,
- filters for security, vulnerability, exploit, AI security, LLM security, red-team, and pentesting signals,
- boosts primary research and AI pentesting sources,
- ranks research and reproducible technical detail above incident-only news,
- keeps community sources as discovery signals but does not let them replace primary research feeds.

## Runtime

This is a small Node/TypeScript script, not a web app.

- `scripts/send.ts` fetches, filters, deduplicates, formats, and sends.
- `src/lib/hacker-news-api.ts` combines Hacker News and RSS results, filters, ranks, and limits final items.
- `src/lib/security-rss-parser.ts` owns security source collection.
- `src/lib/telegram.ts` owns Telegram formatting.
- `src/lib/dedup-store.ts` stores recently sent URLs.

## Environment

```bash
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
SENT_URLS_FILE=.cache/security-news-sent.json
GITHUB_TOKEN=optional_for_local_github_api_rate_limits
THREADS_ACCESS_TOKEN=optional_for_threads_keyword_search
```

GitHub Actions provides `GITHUB_TOKEN` automatically. For local runs, it is optional but useful when testing GitHub repo searches repeatedly.
Threads search is disabled unless `THREADS_ACCESS_TOKEN` is set. Public Threads keyword search also requires Meta's `threads_keyword_search` permission; without approval it is limited to posts owned by the authenticated user.

## Run Locally

```bash
npm ci
npm run lint
NEWS_LIMIT=1 npm run send
```

Use `NEWS_LIMIT=0` to test collection and filtering without sending Telegram messages:

```bash
NEWS_LIMIT=0 npm run send
```

## Schedule

GitHub Actions runs once daily at 08:00 KST:

```text
0 23 * * *  # UTC, previous day
```

Manual workflow runs support an optional `limit` input for message format tests.

Sent URL deduplication is stored in the GitHub Actions cache for 72 hours, so the same item is not repeatedly sent across daily runs.
