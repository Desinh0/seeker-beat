const trackPlayerModule = require('react-native-track-player');
const TrackPlayer = trackPlayerModule.setupPlayer ? trackPlayerModule : trackPlayerModule.default;
const Capability = trackPlayerModule.Capability || (TrackPlayer && TrackPlayer.Capability);
const AppKilledPlaybackBehavior = trackPlayerModule.AppKilledPlaybackBehavior || (TrackPlayer && TrackPlayer.AppKilledPlaybackBehavior);
const AsyncStorage = require('@react-native-async-storage/async-storage').default;

const LAST_STATION_KEY = '@seeker_beat_last_station';
const WAKE_STATION_KEY = '@seeker_beat_wake_station';

async function ensurePlayer() {
  try {
    await TrackPlayer.getPlaybackState();
  } catch (e) {
    await TrackPlayer.setupPlayer({ autoHandleInterruptions: true });
  }
  try {
    await TrackPlayer.updateOptions({
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior
          ? AppKilledPlaybackBehavior.ContinuePlayback
          : undefined,
        alwaysPauseOnInterruption: false,
      },
      capabilities: Capability ? [Capability.Play, Capability.Pause, Capability.Stop] : undefined,
      compactCapabilities: Capability ? [Capability.Play, Capability.Pause] : undefined,
    });
  } catch (e) {}
}

async function playLastStation(data) {
  let station = null;
  if (data && data.stationUrl) {
    station = {
      id: String(data.stationId || 'wake'),
      name: String(data.stationName || 'Seeker Beat'),
      url: String(data.stationUrl),
      favicon: String(data.stationIcon || ''),
    };
  } else {
    const raw = (await AsyncStorage.getItem(WAKE_STATION_KEY)) || (await AsyncStorage.getItem(LAST_STATION_KEY));
    if (raw) station = JSON.parse(raw);
  }
  if (!station || !station.url) return;
  await ensurePlayer();
  await TrackPlayer.reset();
  await TrackPlayer.add({
    id: String(station.id || 'wake'),
    url: station.url,
    title: station.name || 'Seeker Beat',
    artist: 'Live',
    artwork: station.favicon || undefined,
    isLiveStream: true,
  });
  await TrackPlayer.setVolume(1);
  await TrackPlayer.play();
}

async function stopRadio() {
  try {
    await ensurePlayer();
    await TrackPlayer.setVolume(1);
    await TrackPlayer.pause();
  } catch (e) {}
}

module.exports = { playLastStation, stopRadio };