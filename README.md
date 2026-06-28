# Security News

Security research Telegram sender. It combines Hacker News, security RSS, Anthropic security/safety research, GitHub security activity, and papers into practical messages for AI pentesting research.

## Message Format

```text
1. [L8][익스플로잇 연구][Short title]
내용: Brief context
인사이트: Why it matters and a small lab idea
출처: Source · 원문 직접
```

## Levels

| Level | Meaning |
| --- | --- |
| L1 | Security general news |
| L2 | Threat or trend report |
| L3 | Detection rule or checklist |
| L4 | Patch, mitigation, or advisory |
| L5 | Incident or malware analysis |
| L6 | CVE, PoC, or tool |
| L7 | AI/LLM security experiment |
| L8 | Attack chain or high-risk vulnerability |
| L9 | Root cause research |
| L10 | Paper or frontier research |

## Sources

- Hacker News top stories
- PortSwigger Research, Google Project Zero, Trail of Bits
- GitHub Security Lab, Assetnote, watchTowr, arXiv cs.CR
- The Hacker News, Krebs, Dark Reading, BleepingComputer, SecurityWeek, CISA
- Anthropic security/safety research and GitHub security repo search
- GeekNews security topics

## Environment

```bash
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
SENT_URLS_FILE=.cache/security-news-sent.json
```

## Run

```bash
npm ci
npm run lint
NEWS_LIMIT=1 npm run send
```

## Cron

GitHub Actions runs once daily at 08:00 KST. Manual workflow runs accept an optional `limit` input for format tests.

Sent URL deduplication is stored in the GitHub Actions cache for 72 hours.
