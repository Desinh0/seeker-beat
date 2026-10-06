import TrackPlayer, { Event } from 'react-native-track-player';

module.exports = async function() {
  // Обработка событий с кнопок в шторке и гарнитуры
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.destroy());
};