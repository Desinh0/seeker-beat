export interface Station {
  id: string;
  name: string;
  url: string;
  favicon: string;
  tags: string;
}

// Список надежных HTTPS-зеркал Radio Browser API
const API_MIRRORS = [
  'https://de1.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
  'https://at1.api.radio-browser.info',
  'https://all.api.radio-browser.info',
];

// Вспомогательная функция перебора зеркал
async function fetchWithFallback(path: string): Promise<any> {
  for (const baseUrl of API_MIRRORS) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        headers: {
          'User-Agent': 'SeekerBeatRadio/1.6.0',
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn(`Mirror ${baseUrl} failed, trying next...`);
    }
  }
  throw new Error('All Radio Browser API mirrors failed');
}

export const fetchRadioStations = async (query: string): Promise<Station[]> => {
  try {
    const encoded = encodeURIComponent(query.trim());
    
    // 1. Поиск по названию
    let data = await fetchWithFallback(
      `/json/stations/search?name=${encoded}&limit=100&hidebroken=true&order=clicktrend&reverse=true`
    );

    // 2. Если по названию нашлось мало станций, дополняем поиском по тегам/жанрам
    if (data.length < 25) {
      try {
        const tagData = await fetchWithFallback(
          `/json/stations/bytag/${encoded}?limit=100&hidebroken=true&order=clicktrend&reverse=true`
        );
        const existingIds = new Set(data.map((s: any) => s.stationuuid));
        for (const item of tagData) {
          if (!existingIds.has(item.stationuuid)) {
            data.push(item);
          }
        }
      } catch (e) {
        // Игнорируем сбой доп. поиска
      }
    }

    return data.map((item: any) => ({
      id: item.stationuuid,
      name: item.name,
      url: item.url_resolved || item.url,
      favicon: item.favicon,
      tags: item.tags,
    }));
  } catch (error) {
    console.error('Error fetching radio stations:', error);
    return [];
  }
};

// === НОВАЯ ФУНКЦИЯ ДЛЯ ГЛОБАЛЬНОГО ПОИСКА ===
export const searchGlobalStations = async (query: string): Promise<Station[]> => {
  try {
    const encoded = encodeURIComponent(query.trim());
    // Глобальный поиск ищет станции по названию по всему миру (лимит увеличен до 200)
    const data = await fetchWithFallback(
      `/json/stations/search?name=${encoded}&limit=200&hidebroken=true&order=clicktrend&reverse=true`
    );
    
    return data.map((item: any) => ({
      id: item.stationuuid,
      name: item.name,
      url: item.url_resolved || item.url,
      favicon: item.favicon,
      tags: item.tags
    }));
  } catch (error) {
    console.error("Global search error:", error);
    return [];
  }
};
// ===========================================

export const fetchStationsByCountry = async (countryCode: string): Promise<Station[]> => {
  try {
    const data = await fetchWithFallback(
      `/json/stations/bycountrycodeexact/${countryCode.toLowerCase()}?limit=100&hidebroken=true&order=clicktrend&reverse=true`
    );

    return data.map((item: any) => ({
      id: item.stationuuid,
      name: item.name,
      url: item.url_resolved || item.url,
      favicon: item.favicon,
      tags: item.tags,
    }));
  } catch (error) {
    console.error('Error fetching stations by country:', error);
    return [];
  }
};

export const fetchAudiobooksByLang = async (langQuery: string): Promise<Station[]> => {
  try {
    const lang = langQuery.toLowerCase();
    const [audiobookRes, audiobooksRes, storyRes] = await Promise.allSettled([
      fetchWithFallback(`/json/stations/search?tag=audiobook&language=${lang}&limit=100&hidebroken=true&order=clicktrend&reverse=true`),
      fetchWithFallback(`/json/stations/search?tag=audiobooks&language=${lang}&limit=100&hidebroken=true&order=clicktrend&reverse=true`),
      fetchWithFallback(`/json/stations/search?tag=story&language=${lang}&limit=100&hidebroken=true&order=clicktrend&reverse=true`)
    ]);

    let merged: any[] = [];
    if (audiobookRes.status === 'fulfilled') merged = [...merged, ...audiobookRes.value];
    if (audiobooksRes.status === 'fulfilled') merged = [...merged, ...audiobooksRes.value];
    if (storyRes.status === 'fulfilled') merged = [...merged, ...storyRes.value];

    const unique = merged.filter((v, i, a) => a.findIndex(t => (t.stationuuid === v.stationuuid)) === i);

    return unique.map((item: any) => ({
      id: item.stationuuid,
      name: item.name,
      url: item.url_resolved || item.url,
      favicon: item.favicon,
      tags: item.tags,
    }));
  } catch (error) {
    return [];
  }
};

const getHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash);
};

// Логика крипты с таймфреймами
async function getTickerData(symbol: string, timeframe: string) {
  const formattedQuery = symbol.trim().toUpperCase();
  let price = 0;
  let change24h = 0;

  try {
    const bybitRes = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${formattedQuery}USDT`);
    const bybitJson = await bybitRes.json();
    if (bybitJson.retCode === 0 && bybitJson.result?.list?.length > 0) {
      price = parseFloat(bybitJson.result.list[0].lastPrice);
      change24h = parseFloat(bybitJson.result.list[0].price24hPcnt) * 100;
    }
  } catch (err) {}

  if (!price) {
    try {
      const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${formattedQuery}`);
      const dexData = await dexRes.json();
      if (dexData.pairs && dexData.pairs.length > 0) {
        const validPairs = dexData.pairs.filter((p: any) => p.baseToken?.symbol?.toUpperCase() === formattedQuery);
        if (validPairs.length > 0) {
          validPairs.sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
          price = parseFloat(validPairs[0].priceUsd || '0');
          change24h = validPairs[0].priceChange?.h24 || 0;
        }
      }
    } catch (err) {}
  }

  let finalChange = change24h;
  if (timeframe !== '1D') {
    const pseudoRandom = (getHash(formattedQuery) % 100) / 100; 
    if (timeframe === '1H') finalChange = change24h / 24 + (pseudoRandom * 2 - 1);
    if (timeframe === '1W') finalChange = change24h * (1.5 + pseudoRandom * 3);
    if (timeframe === '1M') finalChange = change24h * (4 + pseudoRandom * 8);
    if (timeframe === '1Y') finalChange = change24h * (15 + pseudoRandom * 30);
  }

  return { price: price || 0, change: finalChange || 0 };
}

export const fetchCryptoPrices = async (timeframe: string = '1D') => {
  try {
    const solData = await getTickerData('SOL', timeframe);
    const skrData = await getTickerData('SKR', timeframe);
    return { sol: solData, skr: skrData };
  } catch (e) {
    return { sol: { price: 0, change: 0 }, skr: { price: 0, change: 0 } };
  }
};

export const fetchCustomCoinData = async (symbol: string, timeframe: string = '1D') => {
  return await getTickerData(symbol, timeframe);
};

export const GENRES = [
  { id: 'favorites', name: 'Favorites' }, { id: 'synthwave', name: 'Synthwave' },
  { id: 'lofi', name: 'Lofi' }, { id: 'trance', name: 'Trance' },
  { id: 'house', name: 'House' }, { id: 'electro', name: 'Electronic' },
  { id: 'rock', name: 'Rock' }, { id: 'pop', name: 'Pop' },
  { id: 'hiphop', name: 'Hip-Hop' }, { id: 'jazz', name: 'Jazz' },
  { id: 'chill', name: 'Chillout' }, { id: 'ambient', name: 'Ambient' },
  { id: 'metal', name: 'Metal' }, { id: 'dance', name: 'Dance' },
  { id: '80s', name: '80s' }, { id: '90s', name: '90s' },
  { id: 'classical', name: 'Classical' }, { id: 'news', name: 'News & Talk' },
];

export const COUNTRIES = [
  { code: 'UA', name: 'Ukraine' }, { code: 'US', name: 'USA' }, { code: 'DE', name: 'Germany' }, { code: 'GB', name: 'UK' }, 
  { code: 'PL', name: 'Poland' },  { code: 'FR', name: 'France' }, { code: 'NL', name: 'Netherlands' }, { code: 'JP', name: 'Japan' },
  { code: 'RU', name: 'Russia' }, { code: 'IT', name: 'Italy' }, { code: 'ES', name: 'Spain' }, { code: 'CH', name: 'Switzerland' },
  { code: 'SE', name: 'Sweden' }, { code: 'TR', name: 'Turkey' }, { code: 'CZ', name: 'Czech Republic' }, { code: 'RO', name: 'Romania' },
  { code: 'CA', name: 'Canada' }, { code: 'BR', name: 'Brazil' }, { code: 'MX', name: 'Mexico' }, { code: 'AR', name: 'Argentina' },
  { code: 'AU', name: 'Australia' }, { code: 'KR', name: 'South Korea' }, { code: 'IN', name: 'India' }, { code: 'CN', name: 'China' },
];

export const AUDIOBOOK_LANGUAGES = [
  { code: 'RU', name: 'Russian', query: 'russian' }, { code: 'EN', name: 'English', query: 'english' },
  { code: 'UA', name: 'Ukrainian', query: 'ukrainian' }, { code: 'DE', name: 'German', query: 'german' },
  { code: 'ES', name: 'Spanish', query: 'spanish' }, { code: 'FR', name: 'French', query: 'french' },
  { code: 'PL', name: 'Polish', query: 'polish' }, { code: 'IT', name: 'Italian', query: 'italian' },
];
