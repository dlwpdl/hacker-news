import Parser from 'rss-parser';
import type { NewsItem, RSSFeed } from '@/types/news';

const SECURITY_RSS_FEEDS: RSSFeed[] = [
  {
    url: 'https://feeds.feedburner.com/TheHackersNews',
    name: 'The Hacker News',
  },
  {
    url: 'https://krebsonsecurity.com/feed/',
    name: 'Krebs on Security',
  },
  {
    url: 'https://www.darkreading.com/rss.xml',
    name: 'Dark Reading',
  },
  {
    url: 'https://threatpost.com/feed/',
    name: 'Threatpost',
  },
  {
    url: 'https://www.bleepingcomputer.com/feed/',
    name: 'BleepingComputer',
  },
  {
    url: 'https://www.securityweek.com/feed/',
    name: 'SecurityWeek',
  },
  {
    url: 'https://www.cybersecurity-insiders.com/feed/',
    name: 'Cybersecurity Insiders',
  },
  {
    url: 'https://www.cisa.gov/cybersecurity-advisories/rss.xml',
    name: 'CISA Advisories',
  },
  {
    url: 'https://www.theregister.com/security/headlines.atom',
    name: 'The Register Security',
  },
  {
    url: 'https://securityaffairs.com/feed',
    name: 'Security Affairs',
  },
];

const FETCH_TIMEOUT = 10000; // 10초

// 사이버시큐리티 관련 키워드
const SECURITY_KEYWORDS = [
  'security', 'cybersecurity', 'vulnerability', 'exploit', 'hack', 'hacker',
  'breach', 'data breach', 'malware', 'ransomware', 'threat', 'attack',
  'cve', 'zero-day', '0day', 'phishing', 'ddos', 'botnet', 'trojan',
  'backdoor', 'rootkit', 'virus', 'worm', 'spyware', 'apt', 'penetration',
  'pentest', 'infosec', 'netsec', 'appsec', 'devsecops', 'soc', 'siem',
  'firewall', 'ids', 'ips', 'encryption', 'authentication', 'authorization',
  'password', 'credential', 'leak', 'exposure', 'patch', 'mitigation'
];

/**
 * 텍스트가 사이버시큐리티 관련 키워드를 포함하는지 확인
 */
export function containsSecurityKeywords(text: string): boolean {
  const lowerText = text.toLowerCase();
  return SECURITY_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

/**
 * 보안 RSS 피드에서 뉴스 수집
 * @returns 뉴스 항목 배열
 */
export async function fetchSecurityRSS(): Promise<NewsItem[]> {
  console.log(`📡 ${SECURITY_RSS_FEEDS.length}개의 보안 RSS 피드에서 뉴스 수집 시작...`);

  // 모든 RSS 피드를 병렬로 파싱
  const results = await Promise.allSettled(
    SECURITY_RSS_FEEDS.map(feed => fetchRSSFeed(feed))
  );

  // 성공한 결과만 추출
  const allNews: NewsItem[] = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      allNews.push(...result.value);
      console.log(`✅ ${SECURITY_RSS_FEEDS[index].name}: ${result.value.length}개`);
    } else {
      console.error(`❌ ${SECURITY_RSS_FEEDS[index].name}: ${result.reason}`);
    }
  });

  console.log(`📊 보안 RSS 총 수집: ${allNews.length}개`);

  return allNews;
}

/**
 * 단일 RSS 피드 파싱
 */
async function fetchRSSFeed(feed: RSSFeed): Promise<NewsItem[]> {
  const parser = new Parser({
    timeout: FETCH_TIMEOUT,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; SecurityBot/1.0)',
    },
  });

  try {
    const rssFeed = await parser.parseURL(feed.url);

    const items: NewsItem[] = (rssFeed.items || [])
      .filter(item => item.link && item.title && item.pubDate)
      .map(item => ({
        title: item.title!,
        link: item.link!,
        pubDate: new Date(item.pubDate!),
        contentSnippet: item.contentSnippet || item.content || undefined,
        source: feed.name,
      }));

    return items;
  } catch (error) {
    throw new Error(`Failed to parse ${feed.name}: ${error}`);
  }
}
