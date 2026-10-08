const notifeeModule = require('@notifee/react-native');
const notifee = notifeeModule.onBackgroundEvent ? notifeeModule : notifeeModule.default;
const EventType = notifeeModule.EventType || (notifeeModule.default && notifeeModule.default.EventType);
const trackPlayerModule = require('react-native-track-player');
const TrackPlayer = trackPlayerModule.registerPlaybackService ? trackPlayerModule : trackPlayerModule.default;

try {
  TrackPlayer.registerPlaybackService(() => require('./service'));
} catch (e) {}

try {
  if (notifee && typeof notifee.onBackgroundEvent === 'function') {
    notifee.onBackgroundEvent(async ({ type, detail }) => {
      const data = detail && detail.notification && detail.notification.data;
      const action = data ? String(data.action || '') : '';
      if (action !== 'wake_radio' && action !== 'sleep_radio') return;
      if (EventType && type === EventType.TRIGGER_NOTIFICATION_CREATED) return;
      if (EventType && type === EventType.DISMISSED) return;

      const { playLastStation, stopRadio } = require('./alarmBackground');
      if (action === 'wake_radio') await playLastStation(data);
      if (action === 'sleep_radio') await stopRadio();
    });
  }
} catch (e) {}

require('expo-router/entry');