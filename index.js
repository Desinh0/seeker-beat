import TrackPlayer from 'react-native-track-player';

// Регистрируем фоновый сервис для Android до старта UI
TrackPlayer.registerPlaybackService(() => require('./service'));

// Подключаем стандартную точку входа Expo Router
import 'expo-router/entry';