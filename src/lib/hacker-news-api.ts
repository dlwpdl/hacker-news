import type { NewsItem } from '@/types/news';
import { isWithinRecentHours } from './date-utils';
import { fetchSecurityRSS, containsSecurityKeywords } from './security-rss-parser';

const HN_API_BASE = 'https://hacker-news.firebaseio.com/v0';
const TOP_STORIES_URL = `${HN_API_BASE}/topstories.json`;
const ITEM_URL = (id: number) => `${HN_API_BASE}/item/${id}.json`;

const FETCH_TIMEOUT = 10000; // 10초
const BATCH_SIZE = 20; // 병렬 조회 배치 크기
const MAX_NEWS_ITEMS = 12;

const RESEARCH_KEYWORDS = [
  'research', 'paper', 'arxiv', 'write-up', 'writeup', 'analysis', 'poc',
  'proof of concept', 'exploit', 'rce', 'ssrf', 'xss', 'sqli', 'idor',
  'sandbox escape', 'auth bypass', 'oauth', 'saml', 'supply chain',
  'prompt injection', 'jailbreak', 'llm', 'agent', 'mcp', 'model extraction',
  'data poisoning', 'red team', 'bug bounty', 'web security', 'cloud security',
  'ai safety', 'alignment', 'interpretability', 'kubernetes', 'container',
  'cve', 'zero-day', '0day', '취약점', '분석',
  '연구', '논문', '익스플로잇', '인증 우회', '프롬프트 인젝션', '탈옥',
  '레드팀', '펜테스트', '공급망', '클라우드', '쿠버네티스'
];

const LOW_SIGNAL_KEYWORDS = [
  'funding', 'raised', 'valuation', 'acquisition', 'lawsuit', 'arrest',
  'sentenced', 'policy', 'regulation', 'survey', 'report says', '투자',
  '인수', '소송', '체포', '징역', '정책', '규제', '설문'
];

interface HNItem {
  id: number;
  type: string;
  by?: string;
  time: number;
  title?: string;
  url?: string;
  text?: string;
  score?: number;
  descendants?: number;
}

/**
 * Hacker News + 보안 RSS에서 사이버시큐리티 뉴스 수집
 * @returns 사이버시큐리티 관련 키워드로 필터링된 뉴스 항목 배열
 */
export async function fetchHackerNews(): Promise<NewsItem[]> {
  // 1. Hacker News와 RSS를 병렬로 수집
  const [hnNews, rssNews] = await Promise.all([
    fetchHackerNewsAPI(),
    fetchSecurityRSS()
  ]);

  // 2. 통합
  const allNews = [...hnNews, ...rssNews];
  console.log(`📊 총 수집된 뉴스: ${allNews.length}개 (HN: ${hnNews.length}, RSS: ${rssNews.length})`);

  // 3. 중복 제거 (URL 기준)
  const uniqueNews = removeDuplicates(allNews);
  console.log(`🔍 중복 제거 후: ${uniqueNews.length}개`);

  // 4. 사이버시큐리티 키워드 필터링
  const securityNews = uniqueNews.filter(item => {
    const textToCheck = `${item.title} ${item.contentSnippet || ''}`;
    return containsSecurityKeywords(textToCheck);
  });
  console.log(`🔐 보안 키워드 필터링 후: ${securityNews.length}개`);

  // 5. 날짜 필터링 (하루 1회 실행 + 지연 여유)
  const filteredNews = securityNews.filter(item =>
    isWithinRecentHours(item.pubDate)
  );
  console.log(`📅 날짜 필터링 후: ${filteredNews.length}개`);

  // 6. 연구/실험 가능성 우선, 같은 점수면 최신순
  filteredNews.sort((a, b) =>
    scoreSecurityResearch(b) - scoreSecurityResearch(a) ||
    b.pubDate.getTime() - a.pubDate.getTime()
  );

  const finalNews = filteredNews.slice(0, MAX_NEWS_ITEMS);
  console.log(`✨ 최종 반환: ${finalNews.length}개`);

  return finalNews;
}

function scoreSecurityResearch(item: NewsItem): number {
  const text = `${item.title} ${item.contentSnippet || ''} ${item.source}`.toLowerCase();
  const sourceBoost = /portswigger|project zero|trail of bits|github security|github security trends|assetnote|watchtowr|arxiv|geeknews/i.test(item.source) ? 5 : 0;
  return sourceBoost + countMatches(text, RESEARCH_KEYWORDS) * 2 - countMatches(text, LOW_SIGNAL_KEYWORDS) * 3;
}

function countMatches(text: string, keywords: string[]): number {
  return keywords.filter(keyword => matchesKeyword(text, keyword)).length;
}

function matchesKeyword(text: string, keyword: string): boolean {
  if (/[^\x00-\x7F]/.test(keyword) || keyword.includes(' ')) {
    return text.includes(keyword);
  }
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(keyword)}([^a-z0-9]|$)`, 'i').test(text);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Hacker News API에서 Top Stories 수집
 */
async function fetchHackerNewsAPI(): Promise<NewsItem[]> {
  console.log('📡 Hacker News Top Stories 수집 시작...');

  try {
    // 1. Top Stories ID 목록 조회
    const topStoryIds = await fetchWithTimeout<number[]>(TOP_STORIES_URL);
    console.log(`📊 HN Top Stories: ${topStoryIds.length}개`);

    // 2. 상위 100개만 처리
    const targetIds = topStoryIds.slice(0, 100);

    // 3. 배치로 나눠서 병렬 조회
    const allStories: HNItem[] = [];
    for (let i = 0; i < targetIds.length; i += BATCH_SIZE) {
      const batchIds = targetIds.slice(i, i + BATCH_SIZE);
      const batchStories = await Promise.allSettled(
        batchIds.map(id => fetchStory(id))
      );

      batchStories.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          allStories.push(result.value);
        } else {
          console.error(`❌ Story ${batchIds[index]} 조회 실패`);
        }
      });
    }

    console.log(`📊 HN 총 수집: ${allStories.length}개`);

    // 4. NewsItem으로 변환
    return convertHNItems(allStories);
  } catch (error) {
    console.error('❌ Hacker News 조회 실패:', error);
    return [];
  }
}

/**
 * 단일 스토리 조회
 */
async function fetchStory(id: number): Promise<HNItem | null> {
  try {
    const item = await fetchWithTimeout<HNItem>(ITEM_URL(id));

    // story 타입이고 제목이 있는 것만 반환
    if (item && item.type === 'story' && item.title) {
      return item;
    }

    return null;
  } catch (error) {
    throw new Error(`Failed to fetch story ${id}: ${error}`);
  }
}

/**
 * HNItem을 NewsItem으로 변환
 */
function convertHNItems(stories: HNItem[]): NewsItem[] {
  return stories
    .filter(story => story.title && story.time)
    .map(story => ({
      title: story.title!,
      link: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
      pubDate: new Date(story.time * 1000),
      contentSnippet: story.text
        ? stripHtml(story.text).substring(0, 300)
        : `${story.score || 0} points | ${story.descendants || 0} comments`,
      source: `Hacker News (${story.score || 0}pts)`,
    }));
}

/**
 * URL 기준으로 중복 제거
 */
function removeDuplicates(news: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  return news.filter(item => {
    const normalized = normalizeURL(item.link);
    if (seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
}

/**
 * URL 정규화 (쿼리 파라미터 제거, 소문자 변환)
 */
function normalizeURL(url: string): string {
  try {
    const parsed = new URL(url);
    return (parsed.origin + parsed.pathname).toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/**
 * HTML 태그 제거
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * 타임아웃이 있는 fetch
 */
async function fetchWithTimeout<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HNBot/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data as T;
  } finally {
    clearTimeout(timeout);
  }
}
