export interface RadioStation {
  stationuuid: string;
  name: string;
  url_resolved: string;
  favicon: string;
  tags: string;
  country: string;
}

const STATIONS: Record<string, RadioStation[]> = {
  Top: [
    {
      stationuuid: '1',
      name: 'Lo-Fi Chill Beats',
      url_resolved: 'https://stream.zeno.fm/f3wvbbqmdg8uv',
      favicon: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=200',
      tags: 'lofi, chill, beats',
      country: 'Global',
    },
    {
      stationuuid: '2',
      name: 'Cyberpunk Radio 2077',
      url_resolved: 'https://stream.zeno.fm/0r0xa792kwzuv',
      favicon: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=200',
      tags: 'synthwave, electronic',
      country: 'USA',
    },
    {
      stationuuid: '3',
      name: 'Ibiza Global Radio',
      url_resolved: 'https://ibizaglobalradio.connectedstream.eu/ibizaglobalradio.mp3',
      favicon: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200',
      tags: 'house, dance, ibiza',
      country: 'Spain',
    },
  ],
  Pop: [
    {
      stationuuid: '4',
      name: 'Hit Pop FM',
      url_resolved: 'https://stream.zeno.fm/f3wvbbqmdg8uv',
      favicon: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200',
      tags: 'pop, hits',
      country: 'USA',
    },
  ],
  Rock: [
    {
      stationuuid: '5',
      name: 'Classic Rock Station',
      url_resolved: 'https://stream.zeno.fm/0r0xa792kwzuv',
      favicon: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=200',
      tags: 'rock, classic',
      country: 'USA',
    },
  ],
  Jazz: [
    {
      stationuuid: '6',
      name: 'Smooth Jazz Radio',
      url_resolved: 'https://stream.zeno.fm/f3wvbbqmdg8uv',
      favicon: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=200',
      tags: 'jazz, smooth',
      country: 'USA',
    },
  ],
  Dance: [
    {
      stationuuid: '7',
      name: 'EDM Club Nation',
      url_resolved: 'https://ibizaglobalradio.connectedstream.eu/ibizaglobalradio.mp3',
      favicon: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=200',
      tags: 'edm, dance',
      country: 'Germany',
    },
  ],
  Chillout: [
    {
      stationuuid: '8',
      name: 'Chillout Lounge',
      url_resolved: 'https://stream.zeno.fm/f3wvbbqmdg8uv',
      favicon: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=200',
      tags: 'ambient, chill',
      country: 'Global',
    },
  ],
  News: [
    {
      stationuuid: '9',
      name: 'World News 24/7',
      url_resolved: 'https://stream.live.vc.bbcmedia.co.uk/bbc_radio_one',
      favicon: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=200',
      tags: 'news, talk',
      country: 'UK',
    },
  ],
};

export const getTopStations = async (): Promise<RadioStation[]> => {
  return STATIONS['Top'];
};

export const getStationsByTag = async (tag: string): Promise<RadioStation[]> => {
  const key = Object.keys(STATIONS).find((k) => k.toLowerCase() === tag.toLowerCase());
  return STATIONS[key || 'Top'] || STATIONS['Top'];
};