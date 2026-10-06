import TrackPlayer, { 
  Capability, 
  AppKilledPlaybackBehavior,
  Event 
} from 'react-native-track-player';
import { Station } from './radioApi';

let isPlayerInitialized = false;

export const setupPlayerIfNeeded = async () => {
  if (isPlayerInitialized) return;

  try {
    await TrackPlayer.setupPlayer({
      autoHandleInterruptions: true, // Система сама будет приглушать звук при уведомлениях
    });
    
    await TrackPlayer.updateOptions({
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
      },
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.Stop,
      ],
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
      ],
    } as any);
    
    isPlayerInitialized = true;
  } catch (error) {
    isPlayerInitialized = true;
  }
};

export const playRadioStation = async (station: Station) => {
  try {
    await setupPlayerIfNeeded();
    await TrackPlayer.reset();
    
    // Формируем трек безопасно для фонового режима Android
    const track = {
      id: station.id,
      url: station.url,
      title: station.name,
      artist: station.tags ? station.tags.split(',')[0].toUpperCase() : 'SEEKER BEAT',
      // ВАЖНО: Передаем только сетевые картинки. require() вызывает сбой шторки на Android!
      ...(station.favicon && station.favicon.startsWith('http') ? { artwork: station.favicon } : {})
    };

    await TrackPlayer.add(track);
    await TrackPlayer.play();
  } catch (error) {
    console.log('Error playing station:', error);
  }
};

export const pauseRadioStation = async () => {
  await TrackPlayer.pause();
};

export const PlaybackService = async function() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());
  // Убрали ручной Event.RemoteDuck, так как autoHandleInterruptions работает надежнее
};