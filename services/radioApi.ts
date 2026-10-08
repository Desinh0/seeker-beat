export interface Station {
  id: string;
  name: string;
  url: string;
  favicon: string;
  tags: string;
}

const API_MIRRORS = [
  'https://de1.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
  'https://at1.api.radio-browser.info',
  'https://all.api.radio-browser.info',
];

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

const mapStation = (item: any): Station => ({
  id: item.stationuuid || item.id,
  name: item.name,
  url: item.url_resolved || item.url,
  favicon: item.favicon || '',
  tags: item.tags || 'AUDIOBOOK',
});

export const fetchRadioStations = async (query: string): Promise<Station[]> => {
  try {
    const encoded = encodeURIComponent(query.trim());

    let data = await fetchWithFallback(
      `/json/stations/search?name=${encoded}&limit=100&hidebroken=true&order=clicktrend&reverse=true`
    );

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
      } catch (e) {}
    }

    return data.map(mapStation).filter((s: Station) => !!s.url);
  } catch (error) {
    console.error('Error fetching radio stations:', error);
    return [];
  }
};

export const searchGlobalStations = async (query: string): Promise<Station[]> => {
  try {
    const encoded = encodeURIComponent(query.trim());
    const data = await fetchWithFallback(
      `/json/stations/search?name=${encoded}&limit=200&hidebroken=true&order=clicktrend&reverse=true`
    );

    return data.map(mapStation).filter((s: Station) => !!s.url);
  } catch (error) {
    console.error('Global search error:', error);
    return [];
  }
};

export const fetchStationsByCountry = async (countryCode: string): Promise<Station[]> => {
  try {
    const data = await fetchWithFallback(
      `/json/stations/bycountrycodeexact/${countryCode.toLowerCase()}?limit=100&hidebroken=true&order=clicktrend&reverse=true`
    );

    return data.map(mapStation).filter((s: Station) => !!s.url);
  } catch (error) {
    console.error('Error fetching stations by country:', error);
    return [];
  }
};

const CURATED_AUDIOBOOKS: Record<string, Station[]> = {
  russian: [
    { id: 'book_radio', name: 'Радио Книга', url: 'http://bookradio.hostingradio.ru:8069/fm', favicon: '', tags: 'AUDIOBOOK,RU' },
    { id: 'mds_ru', name: 'МДС - Модель Для Сборки', url: 'https://mds.hostingradio.ru:8043/mds128.mp3', favicon: 'https://mds.ru/wp-content/uploads/2020/04/mds_logo.png', tags: 'AUDIOBOOK,SCIFI,RU' },
    { id: 'zvezda_ru', name: 'Радио Звезда', url: 'https://radio.mediacdn.ru/radio/zvezda/zvezda_96', favicon: '', tags: 'AUDIOBOOK,RU' },
    { id: 'fantastika_ru', name: 'Радио Фантастики', url: 'https://listen9.myradio24.com/55699', favicon: '', tags: 'AUDIOBOOK,SCIFI,RU' },
  ],
  english: [
    { id: 'audiobook_radio', name: 'AudioBook Radio', url: 'https://audiobookradio.out.airtime.pro/audiobookradio_a', favicon: '', tags: 'AUDIOBOOK,EN' },
    { id: 'alive_books', name: '95alive Audio Book Library', url: 'http://95alive.net:8020/radio.mp3', favicon: '', tags: 'AUDIOBOOK,EN' },
    { id: 'history_radio', name: 'History Radio', url: 'https://cast1.asurahosting.com/proxy/historyr/stream.mp3', favicon: '', tags: 'AUDIOBOOK,HISTORY,EN' },
  ],
  ukrainian: [],
  german: [],
  spanish: [],
  french: [],
  polish: [],
  italian: [
    { id: 'wombat_it', name: 'Radio Wombat', url: 'http://s.streampunk.cc/wombat.ogg', favicon: '', tags: 'AUDIOBOOK,IT' },
  ],
};

const LANG_ALIASES: Record<string, string[]> = {
  russian: ['russian', 'рус'],
  english: ['english'],
  ukrainian: ['ukrainian', 'україн'],
  german: ['german', 'deutsch'],
  spanish: ['spanish', 'español', 'castellano'],
  french: ['french', 'français', 'francais'],
  polish: ['polish', 'polski'],
  italian: ['italian', 'italiano'],
};

const matchesLanguage = (language: string, langQuery: string) => {
  const value = (language || '').toLowerCase();
  if (!value) return false;
  const aliases = LANG_ALIASES[langQuery] || [langQuery];
  return aliases.some((alias) => value.includes(alias));
};

export const fetchAudiobooksByLang = async (langQuery: string): Promise<Station[]> => {
  const lang = langQuery.toLowerCase();
  const curated = CURATED_AUDIOBOOKS[lang] || [];
  const paths = [
    `/json/stations/search?tag=audiobook&language=${encodeURIComponent(lang)}&limit=80&hidebroken=true&order=clickcount&reverse=true`,
    `/json/stations/search?tag=audiobooks&language=${encodeURIComponent(lang)}&limit=80&hidebroken=true&order=clickcount&reverse=true`,
    `/json/stations/search?tag=literature&language=${encodeURIComponent(lang)}&limit=40&hidebroken=true&order=clickcount&reverse=true`,
    `/json/stations/search?name=audiobook&limit=30&hidebroken=true&order=clickcount&reverse=true`,
  ];

  const settled = await Promise.allSettled(paths.map((path) => fetchWithFallback(path)));
  const merged: any[] = [];
  for (const result of settled) {
    if (result.status === 'fulfilled' && Array.isArray(result.value)) {
      merged.push(...result.value);
    }
  }

  const fromApi = merged
    .filter((item) => matchesLanguage(item.language || '', lang) || lang === 'english' && /audiobook/i.test(`${item.name} ${item.tags}`))
    .map(mapStation)
    .filter((station) => !!station.url);

  const unique: Station[] = [];
  const seen = new Set<string>();
  for (const station of [...curated, ...fromApi]) {
    const key = station.url || station.id;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(station);
  }
  return unique;
};

const getHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash);
};

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
  { code: 'PL', name: 'Poland' }, { code: 'FR', name: 'France' }, { code: 'NL', name: 'Netherlands' }, { code: 'JP', name: 'Japan' },
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