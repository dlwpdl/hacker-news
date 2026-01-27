import type { NewsItem } from '@/types/news';
import { isWithinYesterdayToToday } from './date-utils';
import { fetchSecurityRSS, containsSecurityKeywords } from './security-rss-parser';

const HN_API_BASE = 'https://hacker-news.firebaseio.com/v0';
const TOP_STORIES_URL = `${HN_API_BASE}/topstories.json`;
const ITEM_URL = (id: number) => `${HN_API_BASE}/item/${id}.json`;

const FETCH_TIMEOUT = 10000; // 10초
const BATCH_SIZE = 20; // 병렬 조회 배치 크기

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

  // 5. 날짜 필터링 (어제 00:00 ~ 현재)
  const filteredNews = securityNews.filter(item =>
    isWithinYesterdayToToday(item.pubDate)
  );
  console.log(`📅 날짜 필터링 후: ${filteredNews.length}개`);

  // 6. 발행일 기준 정렬 (최신순)
  filteredNews.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  console.log(`✨ 최종 반환: ${filteredNews.length}개`);

  return filteredNews;
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
