# Security News

Hacking and security research Telegram bot. It combines Hacker News, security RSS, Anthropic security/safety research, GitHub security trends, and papers into compact Telegram messages.

## Message Shape

- L1-L10 level
- Short title
- Category
- Brief summary
- Practical insight
- Small lab idea
- Source link

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

## Main Sources

- Hacker News top stories
- PortSwigger Research, Google Project Zero, Trail of Bits
- GitHub Security Lab, Assetnote, watchTowr, arXiv cs.CR
- The Hacker News, Krebs, Dark Reading, BleepingComputer, SecurityWeek, CISA
- Anthropic security/safety research and GitHub security trend search
- GeekNews security topics

## Environment

```bash
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
CRON_SECRET=
```

## Run

```bash
npm install
npm run lint
npx tsc --noEmit
npm run build
```

Manual one-item test:

```bash
curl 'http://localhost:3000/api/cron?limit=1' \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Cron

`vercel.json` and GitHub Actions run once daily at 08:00 KST.
