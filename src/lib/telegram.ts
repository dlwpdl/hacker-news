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
    `<b>인사이트</b>: ${escapeHTML(profile.insight)}`,
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
    insight: getSecurityInsight(item, text, category, level),
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

function getSecurityInsight(item: NewsItem, text: string, category: string, level: string): string {
  const topic = getTopicHint(item.title);
  const parts = [
    topic && `핵심 키워드: ${topic}.`,
    getSecuritySourceAngle(item.source, level),
    getSecuritySignalAngle(text, category),
    getSecurityExperiment(text, category, item.source),
  ].filter(Boolean);

  return parts.join(' ');
}

function getSecuritySourceAngle(source: string, level: string): string {
  if (/github/i.test(source)) return 'repo라서 README, PoC 범위, 최근 커밋, issue를 먼저 보면 연구 가치가 빨리 갈림.';
  if (level === 'L10' || /arxiv/i.test(source)) return '논문/연구라 threat model, artifact, 재현 조건을 먼저 확인해야 함.';
  if (/portswigger|project zero|trail of bits|assetnote|watchtowr/i.test(source)) return '리서치 출처라 root cause와 전제 조건을 페이로드보다 먼저 보는 게 좋음.';
  if (/cisa|advisories|securityweek|bleeping|hacker news/i.test(source)) return '권고/뉴스 성격이라 영향 버전, 패치, 탐지 룰 존재 여부를 빠르게 확인.';
  return '기술 세부가 충분하면 연구 노트로, 사건 요약뿐이면 모니터링만 해도 됨.';
}

function getSecuritySignalAngle(text: string, category: string): string {
  if (/prompt injection|jailbreak|llm security|model extraction|data poisoning|프롬프트 인젝션|탈옥/.test(text)) return 'AI 펜테스트 관점에서는 입력 경계, 도구 권한, 데이터 유출 경로를 테스트 케이스로 바꾸기 좋음.';
  if (/rce|ssrf|auth bypass|sandbox escape|zero-day|0day|인증 우회|제로데이/.test(text)) return '조건이 맞으면 영향이 큰 편이라 인증 필요 여부와 공격 전제조건을 먼저 분리해야 함.';
  if (/cve|poc|proof of concept|exploit|익스플로잇/.test(text)) return 'PoC가 있더라도 영향 버전과 패치 상태를 표로 정리한 뒤 랩에서만 확인.';
  if (/supply chain|dependency|package|npm|pypi|github|공급망/.test(text)) return '내 lockfile/SBOM/CI 권한에 같은 노출이 있는지 보는 게 빠른 적용 포인트.';
  if (/cloud|kubernetes|container|aws|azure|gcp|쿠버네티스/.test(text)) return 'IAM, 메타데이터 접근, 런타임 격리 로그를 같이 봐야 재현 가치가 있음.';
  if (category === '웹 취약점') return '입력 검증 위치와 sink를 찾으면 비슷한 서비스 헌팅에 바로 재사용 가능.';
  return 'CVE, PoC, 패치, 탐지 룰 중 하나가 없으면 우선순위를 낮춰도 됨.';
}

function getSecurityExperiment(text: string, category: string, source: string): string {
  if (/github/i.test(source)) return '실험: clone 전에 README와 release만 보고 안전한 랩 재현 가능 여부 확인.';
  if (/paper|arxiv|논문/.test(text)) return '실험: threat model과 artifact 링크만 확인하고 내 AI pentest 체크리스트에 들어갈지 판단.';
  if (category === 'AI/LLM 보안') return '실험: 허가된 테스트 앱에서 실패/성공 프롬프트 3개만 재현.';
  if (category === '공급망') return '실험: 내 프로젝트 lockfile에서 같은 패키지/권한 패턴만 검색.';
  if (category === '익스플로잇 연구') return '실험: 영향 버전, 인증 필요 여부, 패치 여부만 먼저 표로 정리.';
  return '실험: 원문에서 재현 조건이 명확하지 않으면 실행하지 말고 노트만 남기기.';
}

function getSummary(item: NewsItem): string {
  const raw = stripHTML(item.contentSnippet || item.title).replace(/\s+/g, ' ').trim();
  return truncate(raw || stripHTML(item.title), 240);
}

const TOPIC_STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'into', 'that', 'this', 'new', 'how',
  'what', 'why', 'using', 'towards', 'toward', 'about', 'news', 'blog',
  'analysis', 'report', 'research', 'security',
]);

function getTopicHint(title: string): string {
  const words = stripHTML(title)
    .split(/[^A-Za-z0-9가-힣._+-]+/)
    .map(word => word.trim())
    .filter(word => word.length > 2 && !TOPIC_STOP_WORDS.has(word.toLowerCase()));

  return words.slice(0, 3).join(', ');
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
