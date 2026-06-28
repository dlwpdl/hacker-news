import { filterNewUrls, markAsSent } from '../src/lib/dedup-store';
import { fetchHackerNews } from '../src/lib/hacker-news-api';
import { sendToTelegram } from '../src/lib/telegram';

async function main() {
  const limit = parseLimit(process.env.NEWS_LIMIT);
  const newsItems = await fetchHackerNews();
  const newUrls = await filterNewUrls(newsItems.map(item => item.link));
  const uniqueItems = newsItems.filter(item => newUrls.has(item.link)).slice(0, limit);

  if (uniqueItems.length === 0) {
    console.log('Sent 0 security news items');
    return;
  }

  await sendToTelegram(uniqueItems);
  await markAsSent(uniqueItems.map(item => item.link));

  console.log(`Sent ${uniqueItems.length}/${newsItems.length} security news items`);
}

function parseLimit(value: string | undefined): number | undefined {
  if (!value) return undefined;

  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 0) {
    throw new Error(`NEWS_LIMIT must be a non-negative integer: ${value}`);
  }
  return limit;
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
