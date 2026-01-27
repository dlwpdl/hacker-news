# 🗞️ Hacker News Telegram Bot

Hacker News Top Stories를 자동으로 수집하여 텔레그램으로 전송하는 봇입니다.

## 📋 기능

- Hacker News Top Stories API에서 뉴스 수집
- 어제 00:00 ~ 현재 시간(KST) 범위의 스토리만 필터링
- 점수(score) 기준 정렬
- 텔레그램으로 자동 전송
- Vercel Cron으로 하루 3회 자동 실행 (KST 08:00, 13:00, 19:00)

## 🔍 수집 방식

- Hacker News API (`https://hacker-news.firebaseio.com/v0/topstories.json`) 사용
- Top 100개 스토리 조회
- 배치 단위(20개씩) 병렬 조회로 성능 최적화
- 최소 10개 ~ 최대 20개 스토리 전송

## 🚀 시작하기

### 1. 텔레그램 봇 생성

#### 1-1. BotFather로 봇 생성
1. 텔레그램에서 `@BotFather` 검색
2. `/newbot` 명령 입력
3. 봇 이름 입력 (예: "Hacker News Bot")
4. 봇 유저네임 입력 (예: "hacker_news_rss_bot")
5. 받은 토큰 저장 (예: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

#### 1-2. Chat ID 확인
1. `@userinfobot`에게 메시지 전송
2. 받은 숫자를 저장 (예: `123456789`)

> **참고**: AI News 봇과 동일한 봇을 사용하되 다른 Chat ID를 설정하거나, 각각 별도의 봇을 생성할 수 있습니다.

#### 1-3. 봇과 대화 시작
1. 생성한 봇을 검색하여 찾기
2. `/start` 명령 전송

### 2. 프로젝트 설정

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env.local
```

`.env.local` 파일을 열어서 다음 값들을 입력:

```bash
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=123456789
CRON_SECRET=your_local_test_secret
```

### 3. 로컬 테스트

```bash
# 개발 서버 실행
npm run dev

# 새 터미널에서 cron 엔드포인트 테스트
curl http://localhost:3000/api/cron \
  -H "Authorization: Bearer your_local_test_secret"
```

텔레그램에서 메시지를 확인하세요!

## 📦 배포 (Vercel)

### 1. GitHub에 푸시

```bash
git add .
git commit -m "Initial commit: Hacker News Bot"
git push -u origin main
```

### 2. Vercel 배포

1. https://vercel.com 접속
2. "Import Project" 클릭
3. GitHub 레포지토리 선택: `dlwpdl/hacker-news`
4. 환경 변수 입력:
   - `TELEGRAM_BOT_TOKEN`: 봇 토큰
   - `TELEGRAM_CHAT_ID`: 채팅 ID
5. "Deploy" 클릭

### 3. Vercel Cron 확인

- Vercel 대시보드에서 자동으로 `vercel.json`의 cron 설정 인식
- `CRON_SECRET` 환경 변수 자동 생성됨
- "Cron Jobs" 탭에서 스케줄 확인 가능

## ⏰ 크론 스케줄

| 시간 (KST) | 시간 (UTC) | Cron 표현식 |
|-----------|-----------|------------|
| 08:00     | 23:00 (전날) | `0 23 * * *` |
| 13:00     | 04:00     | `0 4 * * *` |
| 19:00     | 10:00     | `0 10 * * *` |

## 🔧 프로젝트 구조

```
hacker-news/
├── src/
│   ├── app/
│   │   └── api/
│   │       └── cron/
│   │           └── route.ts           # Cron 핸들러
│   ├── lib/
│   │   ├── hacker-news-api.ts         # HN API 클라이언트
│   │   ├── telegram.ts                # 텔레그램 클라이언트
│   │   └── date-utils.ts              # 날짜 필터링
│   └── types/
│       └── news.ts                    # 타입 정의
├── vercel.json                        # Cron 스케줄 설정
├── .env.example                       # 환경 변수 템플릿
└── README.md
```

## 🛠️ 기술 스택

- **Next.js 15**: App Router
- **TypeScript**: 타입 안전성
- **Hacker News API**: Firebase Realtime Database
- **Telegraf**: 텔레그램 봇 API
- **Vercel**: 호스팅 및 Cron Jobs

## 📝 참고사항

### 뉴스가 없는 경우
- 뉴스가 0개인 경우에도 "새 뉴스 없음" 메시지가 전송됩니다

### 메시지 포맷
- 마크다운 형식으로 전송
- 메시지 길이 제한(4096자)을 고려하여 자동 분할
- 각 뉴스에는 제목, 링크, 점수, 댓글 수가 포함됩니다
- URL이 없는 스토리는 HN 링크(`news.ycombinator.com/item?id=...`)로 대체

### AI News vs Hacker News
- 각 프로젝트는 독립적인 텔레그램 채팅으로 메시지를 전송할 수 있습니다
- 동일한 봇을 사용하되, 다른 `TELEGRAM_CHAT_ID`를 설정하면 됩니다
- 또는 각각 다른 봇을 생성할 수도 있습니다

### Hacker News API
- 공식 API 문서: https://github.com/HackerNews/API
- Rate Limit: 없음
- 데이터 형식: JSON

## 📄 라이선스

MIT
