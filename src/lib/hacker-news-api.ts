import type { NewsItem } from '@/types/news';
import { isWithinYesterdayToToday } from './date-utils';

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
 * Hacker News Top Stories에서 뉴스 수집
 * @returns 날짜 필터링된 모든 뉴스 항목 배열
 */
export async function fetchHackerNews(): Promise<NewsItem[]> {
  console.log('📡 Hacker News Top Stories 수집 시작...');

  try {
    // 1. Top Stories ID 목록 조회
    const topStoryIds = await fetchWithTimeout<number[]>(TOP_STORIES_URL);
    console.log(`📊 Top Stories: ${topStoryIds.length}개`);

    // 2. 상위 100개만 처리 (너무 많으면 시간 소요)
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

    console.log(`📊 총 수집된 스토리: ${allStories.length}개`);

    // 4. 필터링 및 정렬
    const newsItems = filterAndSort(allStories);
    console.log(`📅 날짜 필터링 후: ${newsItems.length}개`);
    console.log(`✨ 최종 반환: ${newsItems.length}개`);

    return newsItems;
  } catch (error) {
    console.error('❌ Hacker News 조회 실패:', error);
    throw error;
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
 * 스토리 필터링 및 정렬
 */
function filterAndSort(stories: HNItem[]): NewsItem[] {
  return stories
    .filter(story => {
      // 기본 필수 필드 확인
      if (!story.title || !story.time) return false;

      // 날짜 필터링 (어제 00:00 ~ 현재)
      const pubDate = new Date(story.time * 1000);
      if (!isWithinYesterdayToToday(pubDate)) return false;

      return true;
    })
    .map(story => ({
      title: story.title!,
      link: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
      pubDate: new Date(story.time * 1000),
      contentSnippet: story.text
        ? stripHtml(story.text).substring(0, 300)
        : `${story.score || 0} points | ${story.descendants || 0} comments`,
      source: `Hacker News (${story.score || 0}pts)`,
    }))
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
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
