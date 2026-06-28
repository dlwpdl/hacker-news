import Parser from 'rss-parser';
import type { NewsItem, RSSFeed } from '@/types/news';

const SECURITY_RSS_FEEDS: RSSFeed[] = [
  {
    url: 'https://feeds.feedburner.com/geeknews-feed',
    name: 'GeekNews',
  },
  {
    url: 'https://portswigger.net/research/rss',
    name: 'PortSwigger Research',
  },
  {
    url: 'https://genai.owasp.org/feed/',
    name: 'OWASP GenAI Security',
  },
  {
    url: 'https://www.promptfoo.dev/blog/rss.xml',
    name: 'Promptfoo AI Pentest Blog',
  },
  {
    url: 'https://protectai.com/blog/rss.xml',
    name: 'Protect AI Blog',
  },
  {
    url: 'https://googleprojectzero.blogspot.com/feeds/posts/default',
    name: 'Google Project Zero',
  },
  {
    url: 'https://blog.trailofbits.com/feed/',
    name: 'Trail of Bits',
  },
  {
    url: 'https://github.blog/security/vulnerability-research/feed/',
    name: 'GitHub Security Lab',
  },
  {
    url: 'https://www.assetnote.io/resources/research/rss.xml',
    name: 'Assetnote Research',
  },
  {
    url: 'https://labs.watchtowr.com/rss/',
    name: 'watchTowr Labs',
  },
  {
    url: 'https://lobste.rs/t/security.rss',
    name: 'Lobsters Security',
  },
  {
    url: 'https://github.com/usestrix/strix/releases.atom',
    name: 'Strix AI Pentest Releases',
  },
  {
    url: 'https://github.com/vxcontrol/pentagi/releases.atom',
    name: 'PentAGI AI Pentest Releases',
  },
  {
    url: 'https://github.com/NVIDIA/garak/releases.atom',
    name: 'Garak LLM Security Releases',
  },
  {
    url: 'https://github.com/microsoft/PyRIT/releases.atom',
    name: 'PyRIT AI Red Team Releases',
  },
  {
    url: 'https://github.com/promptfoo/promptfoo/releases.atom',
    name: 'Promptfoo AI Pentest Releases',
  },
  {
    url: 'https://github.com/Giskard-AI/giskard-oss/releases.atom',
    name: 'Giskard AI Security Releases',
  },
  {
    url: 'https://github.com/splx-ai/agentic-radar/releases.atom',
    name: 'Agentic Radar AI Security Releases',
  },
  {
    url: 'https://export.arxiv.org/rss/cs.CR',
    name: 'arXiv cs.CR',
  },
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
    url: 'https://www.cisa.gov/cybersecurity-advisories/all.xml',
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
const GITHUB_SECURITY_TOPICS = [
  'llm-security',
  'ai-security',
  'ai-pentesting',
  'prompt-injection',
  'red-teaming',
];
const THREADS_QUERIES = ['llm security', 'prompt injection', 'ai pentesting', 'red teaming'];

// 사이버시큐리티 관련 키워드
const SECURITY_KEYWORDS = [
  'security', 'cybersecurity', 'vulnerability', 'exploit', 'hack', 'hacker',
  'breach', 'data breach', 'malware', 'ransomware', 'threat', 'attack',
  'cve', 'zero-day', '0day', 'phishing', 'ddos', 'botnet', 'trojan',
  'backdoor', 'rootkit', 'virus', 'worm', 'spyware', 'apt', 'penetration',
  'pentest', 'infosec', 'netsec', 'appsec', 'devsecops', 'soc', 'siem',
  'firewall', 'ids', 'ips', 'encryption', 'authentication', 'authorization',
  'password', 'credential', 'leak', 'exposure', 'patch', 'mitigation',
  'rce', 'ssrf', 'xss', 'csrf', 'idor', 'sqli', 'sandbox escape',
  'supply chain', 'prompt injection', 'jailbreak', 'llm security',
  'ai security', 'red team', 'model extraction', 'data poisoning',
  'ai safety', 'alignment', 'interpretability', 'mcp', 'adversarial',
  'ai pentesting', 'ai penetration testing', 'ai red team', 'red teaming',
  'agent security', 'agentic workflow', 'llm agent', 'tool call', 'toolcall',
  'garak', 'pyrit', 'pentagi', 'promptfoo', 'giskard', 'agentic radar',
  'purplellama', 'purple llama', 'guardrail', 'pii leakage', 'prompt leakage',
  '보안', '취약점', '해킹', '공격', '침해', '악성코드',
  '랜섬웨어', '패치', '제로데이', '펜테스트', '레드팀', '프롬프트 인젝션',
  '탈옥', '공급망', '인증 우회'
];

interface AnthropicLink {
  path: string;
  pubDate: Date;
}

/**
 * 텍스트가 사이버시큐리티 관련 키워드를 포함하는지 확인
 */
export function containsSecurityKeywords(text: string): boolean {
  const lowerText = text.toLowerCase();
  return SECURITY_KEYWORDS.some(keyword => matchesKeyword(lowerText, keyword));
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
 * 보안 RSS 피드에서 뉴스 수집
 * @returns 뉴스 항목 배열
 */
export async function fetchSecurityRSS(): Promise<NewsItem[]> {
  console.log(`📡 ${SECURITY_RSS_FEEDS.length}개의 보안 RSS 피드에서 뉴스 수집 시작...`);

  const [rssResults, extraResults] = await Promise.all([
    Promise.allSettled(
      SECURITY_RSS_FEEDS.map(feed => fetchRSSFeed(feed))
    ),
    Promise.allSettled([
      fetchAnthropicPages(),
      fetchGitHubSecurityTrends(),
      fetchThreadsSearch(),
    ]),
  ]);

  // 성공한 결과만 추출
  const allNews: NewsItem[] = [];
  rssResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      allNews.push(...result.value);
      console.log(`✅ ${SECURITY_RSS_FEEDS[index].name}: ${result.value.length}개`);
    } else {
      console.error(`❌ ${SECURITY_RSS_FEEDS[index].name}: ${result.reason}`);
    }
  });
  extraResults.forEach(result => {
    if (result.status === 'fulfilled') {
      allNews.push(...result.value);
      console.log(`✅ 추가 소스: ${result.value.length}개`);
    } else {
      console.error(`❌ 추가 소스: ${result.reason}`);
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
        title: formatRSSItemTitle(feed.name, item.title!),
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

function formatRSSItemTitle(source: string, title: string): string {
  if (/releases$/i.test(source) && /^(v?\d|[a-z0-9_-]+==)/i.test(title)) {
    return `${source.replace(/\s+Releases$/i, '')} ${title}`;
  }
  return title;
}

async function fetchAnthropicPages(): Promise<NewsItem[]> {
  const links = await Promise.all([
    fetchAnthropicLinks('https://www.anthropic.com/news', '/news/'),
    fetchAnthropicLinks('https://www.anthropic.com/research', '/research/'),
  ]);

  const uniqueLinks = [...new Map(
    links.flat()
      .filter(link => !link.path.startsWith('/research/team/'))
      .map(link => [link.path, link])
  ).values()]
    .slice(0, 10)
    .map(link => ({
      url: `https://www.anthropic.com${link.path}`,
      pubDate: link.pubDate,
    }));

  const pages = await Promise.allSettled(
    uniqueLinks.map(link => fetchAnthropicPage(link.url, link.pubDate))
  );
  return pages
    .flatMap(page => page.status === 'fulfilled' && page.value ? [page.value] : [])
    .filter(item => containsSecurityKeywords(`${item.title} ${item.contentSnippet || ''}`));
}

async function fetchAnthropicLinks(url: string, prefix: string): Promise<AnthropicLink[]> {
  const html = await fetchText(url, 'SecurityBot/1.0');
  const links: AnthropicLink[] = [];
  const pattern = new RegExp(`href="(${prefix}[^"]+)"[\\s\\S]{0,500}?<time[^>]*>\\s*([A-Z][a-z]{2} \\d{1,2}, 20\\d{2})`, 'g');

  for (const match of html.matchAll(pattern)) {
    links.push({ path: match[1], pubDate: new Date(match[2]) });
  }

  return links;
}

async function fetchAnthropicPage(url: string, pubDate: Date): Promise<NewsItem | null> {
  const html = await fetchText(url, 'SecurityBot/1.0');
  const title = decodeHTML(html.match(/<title>(.*?)<\/title>/)?.[1] || '')
    .replace(/\s*\\\s*Anthropic$/, '')
    .trim();

  if (!title) return null;

  return {
    title,
    link: url,
    pubDate,
    contentSnippet: decodeHTML(html.match(/<meta name="description" content="([^"]*)"/)?.[1] || ''),
    source: 'Anthropic',
  };
}

async function fetchGitHubSecurityTrends(): Promise<NewsItem[]> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const results = await Promise.allSettled(
    GITHUB_SECURITY_TOPICS.map(topic => fetchGitHubRepos(`topic:${topic}+stars:%3E50+pushed:%3E${since}`, topic))
  );

  return results.flatMap(result => result.status === 'fulfilled' ? result.value : []).slice(0, 8);
}

interface ThreadsPost {
  id: string;
  text?: string;
  permalink?: string;
  timestamp?: string;
  username?: string;
}

async function fetchThreadsSearch(): Promise<NewsItem[]> {
  const token = process.env.THREADS_ACCESS_TOKEN;
  if (!token) return [];

  const results = await Promise.allSettled(
    THREADS_QUERIES.map(query => fetchThreadsPosts(query, token))
  );

  return results.flatMap(result => result.status === 'fulfilled' ? result.value : []).slice(0, 6);
}

async function fetchThreadsPosts(query: string, token: string): Promise<NewsItem[]> {
  const params = new URLSearchParams({
    q: query,
    search_type: 'RECENT',
    search_mode: 'KEYWORD',
    fields: 'id,text,permalink,timestamp,username',
    access_token: token,
  });
  const json = await fetchJSON<{ data?: ThreadsPost[] }>(`https://graph.threads.net/v1.0/keyword_search?${params}`, 'SecurityBot/1.0');

  return (json.data || [])
    .filter(post => post.text && post.permalink && post.timestamp)
    .map(post => ({
      title: truncateText(post.text!, 90),
      link: post.permalink!,
      pubDate: new Date(post.timestamp!),
      contentSnippet: post.username ? `@${post.username}: ${post.text}` : post.text,
      source: `Threads:${query}`,
    }));
}

interface GitHubRepo {
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  pushed_at: string;
}

async function fetchGitHubRepos(query: string, topic: string): Promise<NewsItem[]> {
  const url = `https://api.github.com/search/repositories?q=${query}&sort=updated&order=desc&per_page=3`;
  const json = await fetchJSON<{ items?: GitHubRepo[] }>(url, 'SecurityBot/1.0');

  return (json.items || []).map(repo => ({
    title: repo.full_name,
    link: repo.html_url,
    pubDate: new Date(repo.pushed_at),
    contentSnippet: `${repo.description || 'No description'} · ${repo.stargazers_count.toLocaleString()} stars`,
    source: `GitHub AI Security Repos:${topic} (${repo.stargazers_count.toLocaleString()}★)`,
  }));
}

async function fetchText(url: string, userAgent: string): Promise<string> {
  const response = await fetchWithTimeout(url, userAgent);
  return response.text();
}

async function fetchJSON<T>(url: string, userAgent: string): Promise<T> {
  const response = await fetchWithTimeout(url, userAgent);
  return response.json() as Promise<T>;
}

async function fetchWithTimeout(url: string, userAgent: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json, text/html',
    'User-Agent': userAgent,
  };

  if (url.startsWith('https://api.github.com/') && process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  } finally {
    clearTimeout(timeout);
  }
}

function decodeHTML(text: string): string {
  return text
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function truncateText(text: string, maxLength: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= maxLength ? clean : `${clean.slice(0, maxLength - 1)}…`;
}
