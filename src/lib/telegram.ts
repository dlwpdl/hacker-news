import type { NewsItem } from '@/types/news';

const MAX_MESSAGE_LENGTH = 4096;

/**
 * 뉴스 항목들을 텔레그램으로 전송
 */
export async function sendToTelegram(newsItems: NewsItem[]): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    throw new Error('텔레그램 환경 변수가 설정되지 않았습니다.');
  }

  try {
    if (newsItems.length === 0) {
      await sendMessage(botToken, chatId, [
        `📭 <b>보안 뉴스</b> · 새로운 뉴스가 없습니다.`,
        `<i>${formatDateCompact()}</i>`,
      ].join('\n'));
      console.log('✅ "새 뉴스 없음" 메시지를 전송했습니다.');
      return;
    }

    const header = [
      `🛡 <b>보안 뉴스</b> · ${newsItems.length}건`,
      `<i>${formatDateCompact()}</i>`,
      '',
    ].join('\n');

    const messageGroups = splitNewsIntoGroups(newsItems);

    for (let i = 0; i < messageGroups.length; i++) {
      const message = i === 0
        ? header + messageGroups[i]
        : messageGroups[i];

      await sendMessage(botToken, chatId, message);

      if (i < messageGroups.length - 1) {
        await sleep(1000);
      }
    }

    console.log(`✅ ${newsItems.length}개의 뉴스를 텔레그램으로 전송했습니다.`);
  } catch (error) {
    console.error('텔레그램 전송 오류:', error);
    throw error;
  }
}

async function sendMessage(botToken: string, chatId: string, text: string): Promise<void> {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    }),
  });

  if (!response.ok) {
    throw new Error(`Telegram API error ${response.status}: ${await response.text()}`);
  }
}

function formatNewsItem(item: NewsItem, index: number): string {
  const profile = getSecurityProfile(item);
  const source = escapeHTML(item.source);
  const link = escapeHTML(item.link);

  return [
    `<b>${index + 1}. [${profile.level}][${escapeHTML(profile.category)}][${escapeHTML(profile.shortTitle)}]</b>`,
    `<b>내용</b>: ${escapeHTML(profile.summary)}`,
    `<b>출처</b>: ${source} · <a href="${link}">원문 직접</a>`,
    '',
  ].join('\n');
}

function getSecurityProfile(item: NewsItem) {
  const text = `${item.title} ${item.contentSnippet || ''} ${item.source}`.toLowerCase();
  const level = getSecurityLevel(text);
  const category = getSecurityCategory(text);

  return {
    level,
    shortTitle: truncate(stripHTML(item.title), 58),
    category,
    summary: getSummary(item),
  };
}

function getSecurityLevel(text: string): string {
  if (/arxiv|paper|formal method|논문/.test(text)) return 'L10';
  if (/project zero|portswigger|trail of bits|assetnote|watchtowr|root cause|research|write-up|연구|분석/.test(text)) return 'L9';
  if (/rce|ssrf|sandbox escape|auth bypass|supply chain|zero-day|0day|익스플로잇|인증 우회|공급망|제로데이/.test(text)) return 'L8';
  if (/prompt injection|jailbreak|llm security|ai security|model extraction|data poisoning|red team|프롬프트 인젝션|탈옥|레드팀/.test(text)) return 'L7';
  if (/cve|poc|proof of concept|bug bounty|tool|scanner|탐지|도구/.test(text)) return 'L6';
  if (/breach|malware|ransomware|incident|침해|악성코드|랜섬웨어/.test(text)) return 'L5';
  if (/patch|mitigation|advisory|권고|패치|완화/.test(text)) return 'L4';
  if (/checklist|rule|detection|체크리스트|탐지 룰/.test(text)) return 'L3';
  if (/report|survey|trend|리포트|동향/.test(text)) return 'L2';
  return 'L1';
}

function getSecurityCategory(text: string): string {
  if (/arxiv|paper|논문/.test(text)) return '논문/연구';
  if (/prompt injection|jailbreak|llm|ai security|model extraction|data poisoning|프롬프트 인젝션|탈옥/.test(text)) return 'AI/LLM 보안';
  if (/rce|ssrf|xss|sqli|idor|csrf|auth bypass|oauth|saml|인증 우회/.test(text)) return '웹 취약점';
  if (/cloud|kubernetes|container|aws|azure|gcp|클라우드|쿠버네티스/.test(text)) return '클라우드/컨테이너';
  if (/supply chain|dependency|package|npm|pypi|github|공급망/.test(text)) return '공급망';
  if (/malware|ransomware|apt|threat|악성코드|랜섬웨어/.test(text)) return '위협 인텔';
  if (/cve|poc|proof of concept|exploit|zero-day|0day|익스플로잇|제로데이/.test(text)) return '익스플로잇 연구';
  return '보안 리서치';
}

function getSummary(item: NewsItem): string {
  const raw = stripHTML(item.contentSnippet || item.title).replace(/\s+/g, ' ').trim();
  return truncate(raw || stripHTML(item.title), 480);
}

function stripHTML(text: string): string {
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

function truncate(text: string, maxLength: number): string {
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}…`;
}

/**
 * 날짜를 간결한 형식으로 포맷
 */
function formatDateCompact(): string {
  const now = new Date();
  const kst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const y = kst.getFullYear();
  const m = String(kst.getMonth() + 1).padStart(2, '0');
  const d = String(kst.getDate()).padStart(2, '0');
  const day = days[kst.getDay()];
  const h = String(kst.getHours()).padStart(2, '0');
  const min = String(kst.getMinutes()).padStart(2, '0');
  return `${y}.${m}.${d} (${day}) ${h}:${min}`;
}

/**
 * 뉴스 항목들을 메시지 길이 제한에 맞게 그룹으로 나누기
 */
function splitNewsIntoGroups(newsItems: NewsItem[]): string[] {
  const groups: string[] = [];
  let currentGroup = '';
  let itemIndex = 0;

  for (const item of newsItems) {
    const formattedItem = formatNewsItem(item, itemIndex);

    if (currentGroup.length + formattedItem.length > MAX_MESSAGE_LENGTH - 200) {
      if (currentGroup) {
        groups.push(currentGroup);
        currentGroup = '';
      }
    }

    currentGroup += formattedItem;
    itemIndex++;
  }

  if (currentGroup) {
    groups.push(currentGroup);
  }

  return groups;
}

/**
 * HTML 특수문자 이스케이프
 */
function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
