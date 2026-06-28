import { fetchHackerNews } from '../src/lib/hacker-news-api';
import { sendToTelegram } from '../src/lib/telegram';

async function main() {
  const limit = process.env.NEWS_LIMIT ? Number(process.env.NEWS_LIMIT) : undefined;
  const newsItems = (await fetchHackerNews()).slice(0, limit);

  if (newsItems.length === 0) {
    console.log('Sent 0 security news items');
    return;
  }

  await sendToTelegram(newsItems);
  console.log(`Sent ${newsItems.length} security news items`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
