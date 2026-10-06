import TrackPlayer from 'react-native-track-player';
import { PlaybackService } from '../services/playerService';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';

// Регистрация фонового сервиса плеера для Android
TrackPlayer.registerPlaybackService(() => PlaybackService);

export default function RootLayout() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#0A0A0C" translucent={false} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0A0A0C' },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0C',
  },
});