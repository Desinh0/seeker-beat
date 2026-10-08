import 'react-native-gesture-handler';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image,
  ActivityIndicator, TextInput, Animated, Easing,
  Modal, Alert, ScrollView, Switch, BackHandler, useWindowDimensions, Dimensions,
  Platform, PermissionsAndroid, AppState, Linking, PanResponder
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets, SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Clipboard from 'expo-clipboard';
import * as Location from 'expo-location';
import {
  Station, GENRES, COUNTRIES, fetchRadioStations,
  fetchStationsByCountry, fetchCryptoPrices, fetchCustomCoinData,
  fetchAudiobooksByLang, AUDIOBOOK_LANGUAGES, searchGlobalStations
} from '../services/radioApi';
import { playRadioStation, pauseRadioStation } from '../services/playerService';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';

import TrackPlayer, { usePlaybackState, State, useActiveTrack, Event, Capability, AppKilledPlaybackBehavior, RepeatMode } from 'react-native-track-player';

import notifee, { TriggerType, TimestampTrigger, AndroidImportance, AndroidVisibility, EventType, AlarmType, AndroidNotificationSetting, AndroidCategory } from '@notifee/react-native';
import Reanimated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing as REasing, cancelAnimation } from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';

const FAVORITES_STORAGE_KEY = '@seeker_beat_favorites';
const CUSTOM_COINS_KEY = '@seeker_beat_custom_coins_array'; 
const LAST_GENRE_KEY = '@seeker_beat_last_genre';
const LAST_STATION_KEY = '@seeker_beat_last_station';
const WAKE_STATION_KEY = '@seeker_beat_wake_station';
const WAKE_LIST_KEY = '@seeker_beat_wake_list'; 
const AUTOSTART_KEY = '@seeker_beat_autostart'; 
const BG_PLAY_KEY = '@seeker_beat_bg_play'; 
const TICKER_MODE_KEY = '@seeker_beat_ticker_mode'; 
const DYNAMIC_COVER_KEY = '@seeker_beat_dynamic_cover';
const AUDIOBOOK_LANG_KEY = '@seeker_beat_audiobook_lang'; 
const SPEEDOMETER_KEY = '@seeker_beat_speedometer';
const EQ_LEVELS_KEY = '@seeker_beat_eq_levels';
const EQ_ENABLED_KEY = '@seeker_beat_eq_enabled';
const EQ_SKIN_KEY = '@seeker_beat_eq_skin';
const WINAMP_BANDS = ['PRE', '60', '170', '310', '600', '1K', '3K', '6K', '12K', '14K', '16K'];
const WINAMP_PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  Classical: [0, 0, 0, 0, 0, 0, -2, -4, -4, -6],
  Club: [0, 0, 2, 4, 4, 4, 2, 0, 0, 0],
  Dance: [6, 4, 1, 0, 0, -2, -4, -4, 0, 0],
  'Full Bass': [6, 6, 6, 3, 1, -2, -4, -6, -6, -6],
  Pop: [-1, 2, 4, 4, 2, 0, -1, -1, -1, -1],
  Rock: [5, 3, -2, -3, -1, 2, 4, 5, 5, 5],
  Techno: [5, 4, 0, -3, -2, 0, 4, 6, 6, 5],
  Reggae: [0, 0, 0, -2, 0, 2, 3, 0, 0, 0],
  Soft: [2, 1, 0, -1, 0, 1, 2, 2, 3, 4],
};
const TRACK_HISTORY_KEY = '@seeker_beat_history';
const WEATHER_ENABLED_KEY = '@seeker_beat_weather';
const WEATHER_MOVE_KEY = '@seeker_beat_weather_move';
const EQ_STYLE_KEY = '@seeker_beat_eq_style'; 
const THEME_KEY = '@seeker_beat_theme';
const THEME_CYCLE = ['default', 'cyberpunk', 'winamp', 'aimp', 'matrix', 'synthwave', 'dracula', 'blood', 'midnight', 'amber', 'ocean', 'minecraft', 'seeker', 'mario'] as const;
const THEME_LABEL: Record<string, string> = { default: 'NEON', cyberpunk: 'CYBER', winamp: 'WINAMP', aimp: 'AIMP', matrix: 'MATRIX', synthwave: 'MIAMI', dracula: 'DRACULA', blood: 'BLOOD', midnight: 'MIDNIGHT', amber: 'AMBER', ocean: 'OCEAN', minecraft: 'MINECRAFT', seeker: 'SEEKER', mario: 'MARIO' };
const MARIO_FX_KEY = '@seeker_beat_mario_fx';
const THEME_FX_KEY = '@seeker_beat_theme_fx';
const MATRIX_FX_KEY = '@seeker_beat_matrix_fx';
const NIGHT_AUTO_KEY = '@seeker_beat_night_auto';
const DAY_THEME_KEY = '@seeker_beat_day_theme';
const DRIVE_WEATHER_FX_KEY = '@seeker_beat_drive_weather_fx';
const STAR_COLORS = ['#FF3B3B', '#FF9F1C', '#FFE66D', '#7CFF6B', '#4CC9F0', '#7B61FF', '#FF4FD8']; 
const DRIVE_BG_KEY = '@seeker_beat_drive_bg'; 
const DRIVE_VINYL_KEY = '@seeker_beat_drive_vinyl';
const WEATHER_STYLE_KEY = '@seeker_beat_weather_style';
const SPEED_STYLE_KEY = '@seeker_beat_speed_style';

const PODCAST_STATIONS: Station[] = [
  { id: 'pod_solana_daily', name: 'Solana & Crypto Daily', url: 'https://stream.zeno.fm/f3wvbbqmdg8uv', favicon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png', tags: 'CRYPTO,SOLANA,PODCAST' },
  { id: 'pod_seeker_beat', name: 'Seeker Ecosystem Talk', url: 'https://ice1.somafm.com/groovesalad-128-mp3', favicon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263/logo.png', tags: 'SEEKER,TALK,PODCAST' },
  { id: 'pod_tech_news', name: 'Tech & Future Podcast', url: 'https://ice1.somafm.com/indiepop-128-mp3', favicon: 'https://somafm.com/img3/indiepop-400.jpg', tags: 'TECH,NEWS,PODCAST' },
];

const DJ_MIX_STATIONS: Station[] = [
  { id: 'dj_tml', name: 'Tomorrowland One World Radio', url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/TML_OWR_WORLD.mp3', favicon: 'https://www.tomorrowland.com/src/Frontend/Themes/tomorrowland/Core/Layout/images/logo.svg', tags: 'DJ,EDM,CLUB' },
  { id: 'dj_record_mix', name: 'Record DJ Mixes', url: 'https://radiorecord.hostingradio.ru/mix96.aacp', favicon: 'https://www.radiorecord.ru/images/record-logo-white.svg', tags: 'CLUB,MIX,EDM' },
];

const CURATED_AUDIOBOOKS: Station[] = [
  { id: 'mds_ru', name: 'МДС - Модель Для Сборки', url: 'https://mds.hostingradio.ru:8043/mds128.mp3', favicon: 'https://mds.ru/wp-content/uploads/2020/04/mds_logo.png', tags: 'AUDIOBOOK,SCIFI,RU' },
  { id: 'zvezda_ru', name: 'Радио Звезда', url: 'https://radiozvezda.hostingradio.ru:8027/zvezda128.mp3', favicon: 'https://radiozvezda.ru/images/logo.png', tags: 'AUDIOBOOK,RU' },
];

const ALL_GENRES = [
  ...GENRES, 
  { id: 'dj', name: 'DJ Mixes' }, 
  { id: 'podcasts', name: 'Podcasts' },
  { id: 'audiobooks', name: 'Audiobooks' }, 
];
const NUM_BARS = 16;
const SEGMENTS_PER_BAR = 11;
const CUBE_COLS = 11;
const CUBE_ROWS = 14;

const PULSE_EFFECTS = [
  { id: 'classic', kind: 'icon', icon: 'pulse', colors: null, duration: 2500 },
  { id: 'rapid', kind: 'icon', icon: 'heart', colors: ['#FF003C', '#FF8A8A'], duration: 900 },
  { id: 'ecg', kind: 'ecg', icon: 'pulse', colors: ['#39FF14', '#B8FF6A'], duration: 1500 },
  { id: 'dots', kind: 'dots', icon: 'ellipsis-horizontal', colors: ['#FFD700', '#FF6A00'], duration: 1800 },
  { id: 'bars', kind: 'bars', icon: 'stats-chart', colors: ['#14F195', '#9945FF'], duration: 1300 },
  { id: 'comet', kind: 'comet', icon: 'ellipse', colors: ['#FFFFFF', '#00E5FF'], duration: 1000 },
  { id: 'notes', kind: 'icon', icon: 'musical-notes', colors: ['#FF79C6', '#8BE9FD'], duration: 2000 },
  { id: 'radio', kind: 'icon', icon: 'radio', colors: ['#FCEE0A', '#FF003C'], duration: 2200 },
  { id: 'bolt', kind: 'icon', icon: 'flash', colors: ['#FFB000', '#FFFFFF'], duration: 650 },
  { id: 'orbit', kind: 'icon', icon: 'planet', colors: ['#7AA2FF', '#C4B5FD'], duration: 2800 },
];

const MatrixLine = ({ text, active, style, lines = 1 }: any) => {
  const [shown, setShown] = useState(text || '');
  useEffect(() => {
    const source = String(text || '');
    if (!active) { setShown(source); return; }
    const glyphs = '01アイウエオカキクケコサシスセソタチツテト';
    let step = 0;
    setShown(source.replace(/[^ ]/g, () => glyphs[Math.floor(Math.random() * glyphs.length)]));
    const id = setInterval(() => {
      step += 1;
      setShown(source.split('').map((ch, i) => {
        if (ch === ' ') return ' ';
        if (i < step) return source[i];
        return glyphs[Math.floor(Math.random() * glyphs.length)];
      }).join(''));
      if (step >= source.length) clearInterval(id);
    }, 42);
    return () => clearInterval(id);
  }, [text, active]);
  return <Text style={style} numberOfLines={lines}>{shown}</Text>;
};


const ThemeFx = ({ theme, burst, isPlaying, raining, drive, accent }: any) => {
  const sweep = useRef(new Animated.Value(0)).current;
  const dim = useRef(new Animated.Value(0)).current;
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    sweep.setValue(0);
    if (theme === 'default' || theme === 'seeker' || theme === 'ocean' || theme === 'dracula' || theme === 'matrix' || theme === 'amber') {
      loop = Animated.loop(Animated.timing(sweep, {
        toValue: 1,
        duration: theme === 'dracula' ? 4200 : theme === 'amber' ? 2800 : theme === 'matrix' ? 5200 : 3400,
        easing: Easing.linear,
        useNativeDriver: true,
      }));
      loop.start();
    }
    return () => { if (loop) loop.stop(); if (timer) clearInterval(timer); };
  }, [theme]);

  useEffect(() => {
    if (theme !== 'blood') { dim.setValue(0); return; }
    Animated.timing(dim, { toValue: isPlaying ? 0.05 : 0.42, duration: 800, useNativeDriver: true }).start();
  }, [theme, isPlaying]);

  useEffect(() => {
    if (!burst) return;
    if (theme !== 'cyberpunk' && theme !== 'synthwave' && theme !== 'minecraft') return;
    setGlitch(true);
    const t = setTimeout(() => setGlitch(false), 380);
    return () => clearTimeout(t);
  }, [burst, theme]);

  const travel = sweep.interpolate({ inputRange: [0, 1], outputRange: [-40, 380] });
  const fall = sweep.interpolate({ inputRange: [0, 1], outputRange: [-30, 240] });
  const rise = sweep.interpolate({ inputRange: [0, 1], outputRange: [150, -90] });
  const spin = sweep.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const glow = sweep.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.12, 0.5, 0.12] });

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 30, pointerEvents: 'none' }]}>
      {theme === 'default' && <Animated.View style={{ position: 'absolute', top: 0, height: 2, width: 90, backgroundColor: accent, transform: [{ translateX: travel }] }} />}
      {theme === 'cyberpunk' && glitch && (
        <>
          <View style={{ position: 'absolute', top: 92, left: 0, right: 0, height: 6, backgroundColor: '#FCEE0A' }} />
          <View style={{ position: 'absolute', top: 148, left: 8, right: 36, height: 3, backgroundColor: '#FF003C' }} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(252,238,10,0.07)' }]} />
        </>
      )}
      {theme === 'synthwave' && glitch && <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,45,149,0.28)' }]} />}
      {theme === 'minecraft' && glitch && (
        <View style={{ position: 'absolute', top: 110, alignSelf: 'center', width: 28, height: 28, backgroundColor: '#C84C0C', borderWidth: 2, borderColor: '#3A3A3A', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#F6D7A7', fontWeight: '900' }}>?</Text>
          <View style={{ position: 'absolute', width: 2, height: 28, backgroundColor: '#1A1A1A', transform: [{ rotate: '18deg' }] }} />
        </View>
      )}
      {theme === 'matrix' && !drive && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 168, overflow: 'hidden' }}>
          {['ア','0','1','セ','カ','7','メ','日','Z','5','キ','X'].map((ch, i) => (
            <Animated.Text key={`mx-${i}`} style={{ position: 'absolute', left: 6 + i * 31, top: (i % 4) * 16, color: i % 5 === 0 ? '#D4FFE0' : '#00FF41', opacity: 0.5, fontSize: 13, lineHeight: 16, transform: [{ translateY: i % 2 ? rise : fall }] }}>
              {`${ch}\n${i % 2 ? '0' : '1'}\n${ch}\n7`}
            </Animated.Text>
          ))}
        </View>
      )}
      {theme === 'matrix' && drive && ['ア','0','1','セ','カ','7'].map((ch, i) => (
        <Animated.Text key={ch + i} style={{ position: 'absolute', left: 12 + i * 56, color: '#00FF41', opacity: 0.4, fontSize: 14, transform: [{ translateY: fall }] }}>{ch}</Animated.Text>
      ))}
      {theme === 'dracula' && (
        <>
          <View style={{ position: 'absolute', top: 48, right: 22, width: 34, height: 34, borderRadius: 17, backgroundColor: '#E8E8F0' }} />
          <View style={{ position: 'absolute', top: 42, right: 34, width: 28, height: 28, borderRadius: 14, backgroundColor: '#120814' }} />
          <Animated.View style={{ position: 'absolute', top: 86, transform: [{ translateX: travel }] }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
              <View style={{ width: 16, height: 8, backgroundColor: '#1A1020', borderTopLeftRadius: 12, borderBottomLeftRadius: 2, transform: [{ rotate: '-18deg' }] }} />
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#1A1020', marginHorizontal: -1 }} />
              <View style={{ width: 16, height: 8, backgroundColor: '#1A1020', borderTopRightRadius: 12, borderBottomRightRadius: 2, transform: [{ rotate: '18deg' }] }} />
            </View>
          </Animated.View>
        </>
      )}
      {theme === 'blood' && <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#6B0010', opacity: dim }]} />}
      {theme === 'midnight' && Array.from({ length: 12 }).map((_, i) => (
        <View key={i} style={{ position: 'absolute', left: (i * 47) % 340, top: 28 + (i % 5) * 34, width: i % 3 === 0 ? 3 : 2, height: i % 3 === 0 ? 3 : 2, borderRadius: 2, backgroundColor: '#D6E2FF', opacity: 0.75 }} />
      ))}
      {theme === 'amber' && (
        <Animated.View style={{ position: 'absolute', top: -50, left: -40, width: 200, height: 200, borderRadius: 100, backgroundColor: '#FFB000', opacity: glow }} />
      )}
      {theme === 'ocean' && (
        <>
          <Animated.View style={{ position: 'absolute', bottom: 96, height: 3, width: 120, backgroundColor: 'rgba(0,190,255,0.7)', transform: [{ translateX: travel }] }} />
          {raining && Array.from({ length: 8 }).map((_, i) => (
            <Animated.View key={i} style={{ position: 'absolute', left: 8 + i * 46, width: 2, height: 12, backgroundColor: 'rgba(180,230,255,0.75)', transform: [{ translateY: fall }] }} />
          ))}
        </>
      )}
      {theme === 'seeker' && (
        <Animated.View style={{ position: 'absolute', left: 18, top: 74, width: 48, height: 48, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: spin }] }}>
          <View style={{ position: 'absolute', top: 0, width: 5, height: 5, borderRadius: 3, backgroundColor: '#14F195' }} />
          <View style={{ position: 'absolute', bottom: 2, width: 4, height: 4, borderRadius: 2, backgroundColor: '#9945FF' }} />
          <View style={{ position: 'absolute', right: 0, width: 3, height: 3, borderRadius: 2, backgroundColor: '#14F195' }} />
        </Animated.View>
      )}
    </View>
  );
};

const WinampBounce = ({ active, children }: any) => {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) { y.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(y, { toValue: -3, duration: 160, useNativeDriver: true }),
      Animated.timing(y, { toValue: 0, duration: 160, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [active]);
  if (!active) return <>{children}</>;
  return <Animated.View style={{ transform: [{ translateY: y }] }}>{children}</Animated.View>;
};

const AimpNeedle = () => {
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(x, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, []);
  const shift = x.interpolate({ inputRange: [0, 1], outputRange: [0, 150] });
  return (
    <View style={{ height: 5, marginTop: 5, borderRadius: 3, backgroundColor: '#3A2208', overflow: 'hidden' }}>
      <Animated.View style={{ position: 'absolute', left: 0, width: 42, height: 5, borderRadius: 3, backgroundColor: '#FF6600', transform: [{ translateX: shift }] }} />
    </View>
  );
};

const getWeatherIconCode = (code: number) => {
  const isRain = [51,53,55,61,63,65,66,67,80,81,82].includes(code);
  const isSnow = [71,73,75,77,85,86].includes(code);
  const isThunder = [95,96,99].includes(code);
  const isCloudy = [1,2,3,45,48].includes(code);
  if (isCloudy) return 'cloudy';
  if (isRain) return 'rainy';
  if (isSnow) return 'snow';
  if (isThunder) return 'thunderstorm';
  return 'sunny';
};

const getWindDirection = (deg: number) => {
  if (deg >= 337.5 || deg < 22.5) return 'N';
  if (deg >= 22.5 && deg < 67.5) return 'NE';
  if (deg >= 67.5 && deg < 112.5) return 'E';
  if (deg >= 112.5 && deg < 157.5) return 'SE';
  if (deg >= 157.5 && deg < 202.5) return 'S';
  if (deg >= 202.5 && deg < 247.5) return 'SW';
  if (deg >= 247.5 && deg < 292.5) return 'W';
  if (deg >= 292.5 && deg < 337.5) return 'NW';
  return 'N';
};

const formatSunTime = (isoString: string) => {
  if (!isoString) return '--:--';
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const WeatherAnim = ({ type, color, isActive }: any) => {
  const animY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let loopAnim: Animated.CompositeAnimation | null = null;
    if (isActive) {
      loopAnim = Animated.loop(Animated.timing(animY, {toValue: 1, duration: type === 'rain'? 600: 2500, easing: Easing.linear, useNativeDriver: true}));
      loopAnim.start();
    } else {
      animY.stopAnimation();
    }
    return () => { if(loopAnim) loopAnim.stop(); };
  }, [type, isActive]);
  
  const t1 = animY.interpolate({ inputRange: [0, 1], outputRange: [-20, 200] });
  const t2 = animY.interpolate({ inputRange: [0, 1], outputRange: [-40, 220] });
  const t3 = animY.interpolate({ inputRange: [0, 1], outputRange: [-10, 250] });
  return (
    <View style={[StyleSheet.absoluteFill, {overflow: 'hidden', opacity: 0.7, zIndex: 0}]} pointerEvents="none">
      <Animated.View style={{position: 'absolute', left: '20%', top: 0, width: type==='rain'?2:4, height: type==='rain'?16:4, borderRadius: 2, backgroundColor: color, transform:[{translateY: t1}]}} />
      <Animated.View style={{position: 'absolute', left: '50%', top: 10, width: type==='rain'?2:5, height: type==='rain'?20:5, borderRadius: 3, backgroundColor: color, transform:[{translateY: t2}]}} />
      <Animated.View style={{position: 'absolute', left: '80%', top: 0, width: type==='rain'?2:3, height: type==='rain'?12:3, borderRadius: 2, backgroundColor: color, transform:[{translateY: t3}]}} />
    </View>
  );
}

const WeatherWidgetAdvanced = ({ data, isActive, variant = 'card', accent = '#00F0FF', onExpandedChange, dragHandlers }: any) => {
  const [expanded, setExpanded] = useState(false);
  
  if (!data) return null;
  const { temp, code, city, humidity, windSpeed, windDir, todayMax, todayMin, sunrise, sunset, uv, daily } = data;
  
  const icon = getWeatherIconCode(code);
  const isRain = icon === 'rainy';
  const isSnow = icon === 'snow';
  const isThunder = icon === 'thunderstorm';
  const isCloudy = icon === 'cloudy';
  
  let label = 'Clear';
  if (isCloudy) label = 'Partly Cloudy';
  if (isRain) label = 'Rain';
  if (isSnow) label = 'Snow';
  if (isThunder) label = 'Storm';

  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const now = new Date();
  const dayName = days[now.getDay()];
  const monthName = months[now.getMonth()];
  const dateNum = now.getDate();
  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const windDirStr = getWindDirection(windDir);

  const shellColor = variant === 'hud' ? 'rgba(0, 0, 0, 0.55)' : 'rgba(15, 23, 42, 0.6)';
  const shellWidth = variant === 'compact' ? 168 : 250;

  return (
    <View style={[styles.weatherWidgetContainer, { backgroundColor: shellColor, width: shellWidth, borderRadius: variant === 'hud' ? 4 : 16, borderColor: accent, borderWidth: 1.5 }]}>
      {dragHandlers && (
        <View {...dragHandlers} style={{ height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' }}>
          <View style={{ width: 46, height: 5, borderRadius: 3, backgroundColor: accent }} />
        </View>
      )}
      {isRain && <WeatherAnim type="rain" color={accent} isActive={isActive} />}
      {isThunder && <WeatherAnim type="rain" color="#A855F7" isActive={isActive} />}
      {isSnow && <WeatherAnim type="snow" color="#FFFFFF" isActive={isActive} />}
      <TouchableOpacity activeOpacity={0.7} onPress={() => { Haptics.selectionAsync(); setExpanded((prev) => { const next = !prev; onExpandedChange?.(next); return next; }); }} style={styles.weatherCardPadding}>
        {variant === 'compact' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name={icon as any} size={28} color="#FFF" />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={{ color: '#FFF', fontSize: 26, fontWeight: '900' }}>{temp}°</Text>
              <Text numberOfLines={1} style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: '700' }}>{city} · {label}</Text>
            </View>
          </View>
        ) : variant === 'hud' ? (
          <View>
            <Text style={{ color: accent, fontSize: 11, fontWeight: '800', letterSpacing: 2 }}>{city.toUpperCase()}</Text>
            <Text style={{ color: '#FFF', fontSize: 54, fontWeight: '900', letterSpacing: -2, includeFontPadding: false }}>{temp}°</Text>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '700' }}>{label} · {windSpeed} km/h {windDirStr}</Text>
          </View>
        ) : (
          <>
            <View style={styles.weatherHeaderRow}>
              <Text style={styles.weatherDayText}>{dayName}</Text>
              <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color="rgba(255,255,255,0.8)" />
            </View>
            <View style={styles.weatherDateRow}>
              <Text style={styles.weatherDateText}>{monthName} {dateNum}</Text>
              <Text style={styles.weatherDateText}>{timeString}</Text>
            </View>
            <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 10 }} />
            <Text style={[styles.weatherCityText, { color: accent }]}>{city.toUpperCase()}</Text>
            <View style={styles.weatherMainRow}>
              <View>
                <Text style={styles.weatherTempText}>{temp}°C</Text>
                <Text style={styles.weatherCondText}>{label}</Text>
              </View>
              <Ionicons name={icon as any} size={56} color="#FFF" />
            </View>
          </>
        )}
      </TouchableOpacity>

      {expanded && (
        <ScrollView style={{ maxHeight: 180 }} contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
          <View style={styles.weatherCardPadding}>
            <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 12, marginTop: -15 }} />
            
            <View style={styles.weatherDetailsGrid}>
              <View style={styles.weatherDetailItem}>
                <Ionicons name="arrow-up" size={12} color="rgba(255,255,255,0.7)" />
                <Text style={styles.weatherDetailText}>{todayMax}°</Text>
              </View>
              <View style={styles.weatherDetailItem}>
                <Ionicons name="sunny" size={12} color="rgba(255,255,255,0.7)" />
                <Text style={styles.weatherDetailText}>{formatSunTime(sunrise)}</Text>
              </View>
              <View style={styles.weatherDetailItem}>
                <Ionicons name="water" size={12} color="rgba(255,255,255,0.7)" />
                <Text style={styles.weatherDetailText}>{humidity}%</Text>
              </View>
              
              <View style={styles.weatherDetailItem}>
                <Ionicons name="arrow-down" size={12} color="rgba(255,255,255,0.7)" />
                <Text style={styles.weatherDetailText}>{todayMin}°</Text>
              </View>
              <View style={styles.weatherDetailItem}>
                <Ionicons name="moon" size={12} color="rgba(255,255,255,0.7)" />
                <Text style={styles.weatherDetailText}>{formatSunTime(sunset)}</Text>
              </View>
              <View style={styles.weatherDetailItem}>
                <Ionicons name="radio" size={12} color="rgba(255,255,255,0.7)" />
                <Text style={styles.weatherDetailText}>{uv} UV</Text>
              </View>
            </View>
            
            <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 12 }} />
            
            <View style={styles.weatherWindRow}>
              <Ionicons name="compass-outline" size={24} color="rgba(255,255,255,0.8)" />
              <View style={{ marginLeft: 10 }}>
                <Text style={{ color: '#FFF', fontSize: 13, fontWeight: 'bold' }}>{windSpeed} km/h</Text>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 'bold' }}>FROM {windDirStr}</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.weatherDailyContainer}>
            {daily && daily.map((day: any, idx: number) => {
              const d = new Date(day.date);
              const dayStr = days[d.getDay()];
              return (
                <View key={idx} style={styles.weatherDailyRow}>
                  <Text style={styles.weatherDailyText}>{dayStr}</Text>
                  <Ionicons name={getWeatherIconCode(day.code) as any} size={20} color="#FFF" />
                  <Text style={styles.weatherDailyTemp}>{day.max}°</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const AmbientAurora = ({ isPlaying, primaryNeon, secondaryNeon, bgTheme }: any) => {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let loopAnim: Animated.CompositeAnimation | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (isPlaying) {
      timer = setTimeout(() => {
        spin.setValue(0);
        loopAnim = Animated.loop(
          Animated.timing(spin, { toValue: 1, duration: 25000, easing: Easing.linear, useNativeDriver: true })
        );
        loopAnim.start();
      }, 180);
    } else { spin.stopAnimation(); }
    return () => { if (timer) clearTimeout(timer); if (loopAnim) loopAnim.stop(); };
  }, [isPlaying]);

  const rotate1 = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const rotate2 = spin.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: bgTheme, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', zIndex: 0 }]} pointerEvents="none">
      <Animated.View style={{ position: 'absolute', width: 600, height: 600, borderRadius: 300, backgroundColor: primaryNeon, opacity: 0.12, transform: [{ rotate: rotate1 }, { translateX: 100 }] }} />
      <Animated.View style={{ position: 'absolute', width: 500, height: 500, borderRadius: 250, backgroundColor: secondaryNeon, opacity: 0.12, transform: [{ rotate: rotate2 }, { translateX: -100 }] }} />
    </View>
  );
};

const Bubble = ({ p, primaryNeon }: any) => {
  const progress = useSharedValue(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      progress.value = withRepeat(withTiming(1, { duration: p.duration, easing: REasing.linear }), -1, false);
    }, p.delay);
    return () => { clearTimeout(timer); cancelAnimation(progress); };
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: progress.value * -1000 + 800 }]
  }));
  return <Reanimated.View style={[{ position: 'absolute', left: p.x, width: p.size, height: p.size, borderRadius: p.size / 2, backgroundColor: primaryNeon, opacity: p.opacity, shadowColor: primaryNeon, shadowRadius: 5, shadowOpacity: 0.8 }, style]} />
};

const ChampagneDust = ({ isPlaying, primaryNeon }: any) => {
  const bubbles = useMemo(() => Array.from({ length: 80 }).map(() => ({
    x: Math.random() * Dimensions.get('window').height * 2,
    size: Math.random() * 4 + 2,
    opacity: Math.random() * 0.5 + 0.2,
    duration: 3000 + Math.random() * 4000,
    delay: Math.random() * 3000
  })), []);
  if (!isPlaying) return <View style={[StyleSheet.absoluteFill, { zIndex: 0 }]} pointerEvents="none" />;
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', zIndex: 0 }]} pointerEvents="none">
      {bubbles.map((b, i) => <Bubble key={i} p={b} primaryNeon={primaryNeon} />)}
    </View>
  );
};

const SynthwaveSunset = ({ primaryNeon, secondaryNeon, bgTheme }: any) => {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: bgTheme, overflow: 'hidden', alignItems: 'center' }]} pointerEvents="none">
      <View style={{ position: 'absolute', bottom: '35%', width: 220, height: 220, borderRadius: 110, backgroundColor: secondaryNeon, shadowColor: secondaryNeon, shadowOpacity: 0.8, shadowRadius: 30, elevation: 10 }}>
        <LinearGradient colors={[primaryNeon, secondaryNeon]} style={{ flex: 1, borderRadius: 110 }} />
        <View style={{ position: 'absolute', bottom: 10, width: '100%', height: 4, backgroundColor: bgTheme }} />
        <View style={{ position: 'absolute', bottom: 25, width: '100%', height: 6, backgroundColor: bgTheme }} />
        <View style={{ position: 'absolute', bottom: 45, width: '100%', height: 8, backgroundColor: bgTheme }} />
        <View style={{ position: 'absolute', bottom: 70, width: '100%', height: 10, backgroundColor: bgTheme }} />
      </View>
      <LinearGradient colors={['transparent', bgTheme]} style={{ position: 'absolute', top: '60%', width: '100%', height: '20%' }} />
    </View>
  );
};

const PulseWaves = ({ isPlaying, primaryNeon, bgTheme }: any) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let loopAnim: Animated.CompositeAnimation | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (isPlaying) {
      timer = setTimeout(() => {
        anim.setValue(0);
        loopAnim = Animated.loop(Animated.timing(anim, { toValue: 1, duration: 4000, easing: Easing.out(Easing.ease), useNativeDriver: true }));
        loopAnim.start();
      }, 180);
    } else { anim.stopAnimation(); }
    return () => { if (timer) clearTimeout(timer); if (loopAnim) loopAnim.stop(); };
  }, [isPlaying]);

  const scale1 = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 2] });
  const opacity1 = anim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0.3, 0.05, 0] });
  const scale2 = anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 3] });
  const opacity2 = anim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0.2, 0.02, 0] });

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: bgTheme, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', zIndex: 0 }]} pointerEvents="none">
      <Animated.View style={{ position: 'absolute', width: 300, height: 300, borderRadius: 150, borderWidth: 2, borderColor: primaryNeon, opacity: opacity1, transform: [{ scale: scale1 }] }} />
      <Animated.View style={{ position: 'absolute', width: 300, height: 300, borderRadius: 150, borderWidth: 4, borderColor: primaryNeon, opacity: opacity2, transform: [{ scale: scale2 }] }} />
    </View>
  );
};

const SynthwaveGrid = ({ isPlaying, primaryNeon, secondaryNeon, bgTheme }: any) => {
  const roadProgress = useSharedValue(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (isPlaying) {
      timer = setTimeout(() => {
        roadProgress.value = 0;
        roadProgress.value = withRepeat(
          withTiming(1, { duration: 2500, easing: REasing.linear }),
          -1, false
        );
      }, 160);
    } else { cancelAnimation(roadProgress); }
    return () => { if (timer) clearTimeout(timer); cancelAnimation(roadProgress); };
  }, [isPlaying]);

  const roadStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { perspective: 350 },
        { rotateX: '78deg' },
        { translateY: roadProgress.value * 50 }
      ],
    };
  });

  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', justifyContent: 'flex-end', alignItems: 'center', zIndex: 0, backgroundColor: bgTheme }]} pointerEvents="none">
      <LinearGradient colors={[bgTheme, bgTheme, 'transparent']} locations={[0, 0.45, 1]} style={{ position: 'absolute', top: 0, width: '100%', height: '100%', zIndex: 2 }} pointerEvents="none" />
      <Reanimated.View style={[roadStyle, { width: '200%', height: 800, position: 'absolute', bottom: -150, zIndex: 1 }]}>
        {Array.from({ length: 40 }).map((_, i) => (
          <View key={`h-${i}`} style={{ position: 'absolute', width: '100%', height: 1, top: (i - 10) * 50, backgroundColor: primaryNeon, opacity: 0.15 }} />
        ))}
        {Array.from({ length: 40 }).map((_, i) => (
          <View key={`v-${i}`} style={{ position: 'absolute', height: '100%', width: 1, left: i * 80 - 1600, backgroundColor: secondaryNeon, opacity: 0.15 }} />
        ))}
      </Reanimated.View>
    </View>
  );
};

const MatrixRainBg = ({ isPlaying, primaryNeon, bgTheme }: any) => {
  const drop = useSharedValue(0);
  const SPAN = 360;
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    timer = setTimeout(() => {
      drop.value = 0;
      drop.value = withRepeat(withTiming(SPAN, { duration: isPlaying ? 2600 : 5200, easing: REasing.linear }), -1, false);
    }, 180);
    return () => { if (timer) clearTimeout(timer); cancelAnimation(drop); };
  }, [isPlaying]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: drop.value }] }));
  const cols = useMemo(() => Array.from({ length: 16 }).map((_, i) => ({ x: i * 28, h: 70 + (i % 5) * 28, top: (i % 4) * 70 })), []);
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: bgTheme, overflow: 'hidden' }]} pointerEvents="none">
      <Reanimated.View style={[{ position: 'absolute', top: -SPAN, left: 0, right: 0, height: SPAN * 3 }, style]}>
        {[0, 1, 2].map((copy) => cols.map((c, i) => (
          <View key={`${copy}-${i}`} style={{ position: 'absolute', left: c.x, top: copy * SPAN + c.top, width: 2, height: c.h, backgroundColor: primaryNeon, opacity: 0.45 }} />
        )))}
      </Reanimated.View>
    </View>
  );
};

const StarfieldBg = ({ isPlaying, primaryNeon, secondaryNeon, bgTheme }: any) => {
  const stars = useMemo(() => Array.from({ length: 70 }).map(() => ({
    x: Math.random() * 900, y: Math.random() * 500, s: Math.random() * 2 + 1, o: Math.random() * 0.7 + 0.2,
  })), []);
  const tw = useSharedValue(0.4);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (isPlaying) timer = setTimeout(() => { tw.value = withRepeat(withTiming(1, { duration: 1600 }), -1, true); }, 180);
    else cancelAnimation(tw);
    return () => { if (timer) clearTimeout(timer); cancelAnimation(tw); };
  }, [isPlaying]);
  const style = useAnimatedStyle(() => ({ opacity: tw.value }));
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: bgTheme }]} pointerEvents="none">
      <Reanimated.View style={[StyleSheet.absoluteFill, style]}>
        {stars.map((s, i) => (
          <View key={i} style={{ position: 'absolute', left: s.x, top: s.y, width: s.s, height: s.s, borderRadius: s.s, backgroundColor: i % 4 === 0 ? secondaryNeon : primaryNeon, opacity: s.o }} />
        ))}
      </Reanimated.View>
    </View>
  );
};

const MiamiStripes = ({ isPlaying, primaryNeon, secondaryNeon, bgTheme }: any) => {
  const shift = useSharedValue(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (isPlaying) {
      timer = setTimeout(() => {
        shift.value = 0;
        shift.value = withRepeat(withTiming(1, { duration: 6000, easing: REasing.linear }), -1, false);
      }, 180);
    } else cancelAnimation(shift);
    return () => { if (timer) clearTimeout(timer); cancelAnimation(shift); };
  }, [isPlaying]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: shift.value * -80 }] }));
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: bgTheme, overflow: 'hidden', justifyContent: 'center' }]} pointerEvents="none">
      <Reanimated.View style={[{ width: '140%' }, style]}>
        {Array.from({ length: 8 }).map((_, i) => (
          <View key={i} style={{ height: 10, marginVertical: 14, backgroundColor: i % 2 ? secondaryNeon : primaryNeon, opacity: 0.55, transform: [{ rotate: '-8deg' }] }} />
        ))}
      </Reanimated.View>
    </View>
  );
};

const EmberField = ({ isPlaying, primaryNeon }: any) => {
  const bits = useMemo(() => Array.from({ length: 36 }).map(() => ({
    x: Math.random() * 900, size: Math.random() * 3 + 1, opacity: Math.random() * 0.5 + 0.3, duration: 4000 + Math.random() * 4000, delay: Math.random() * 2000,
  })), []);
  if (!isPlaying) return <View style={[StyleSheet.absoluteFill, { zIndex: 0 }]} pointerEvents="none" />;
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', zIndex: 0 }]} pointerEvents="none">
      {bits.map((b, i) => <Bubble key={i} p={{ ...b, size: b.size }} primaryNeon={primaryNeon} />)}
    </View>
  );
};


const useSpin = (ms: number) => {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [ms]);
  return v;
};

const RingFx = ({ barValues, color, size = 160 }: any) => {
  const spin = useSpin(2200);
  const rot = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const scale = barValues[0].interpolate({ inputRange: [0, SEGMENTS_PER_BAR], outputRange: [0.84, 1.12], extrapolate: 'clamp' });
  return (
    <Animated.View pointerEvents="none" style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', transform: [{ scale }] }}>
      <Animated.View style={{ position: 'absolute', width: size * 0.82, height: size * 0.82, borderRadius: size, borderWidth: Math.max(3, size * 0.045), borderColor: 'transparent', borderTopColor: color, borderRightColor: color, transform: [{ rotate: rot }] }} />
    </Animated.View>
  );
};

const PulseFx = ({ barValues, color, size = 160 }: any) => {
  const spin = useSpin(1300);
  return (
    <View pointerEvents="none" style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {[0, 1, 2].map((i) => {
        const scale = spin.interpolate({ inputRange: [0, 1], outputRange: [0.4 + i * 0.08, 1.05 + i * 0.16] });
        const opacity = (barValues[i] || barValues[0]).interpolate({ inputRange: [0, SEGMENTS_PER_BAR], outputRange: [0.12, 0.72 - i * 0.16], extrapolate: 'clamp' });
        const box = size * (0.42 + i * 0.2);
        return <Animated.View key={i} style={{ position: 'absolute', width: box, height: box, borderRadius: box, borderWidth: 2, borderColor: color, opacity, transform: [{ scale }] }} />;
      })}
    </View>
  );
};

const RoadFx = ({ barValues, color, alt, size = 210 }: any) => {
  const spin = useSpin(900);
  const y = spin.interpolate({ inputRange: [0, 1], outputRange: [-8, 22] });
  const boost = barValues[0].interpolate({ inputRange: [0, SEGMENTS_PER_BAR], outputRange: [0.35, 1], extrapolate: 'clamp' });
  return (
    <View pointerEvents="none" style={{ width: size, height: size * 0.62, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' }}>
      <Animated.View style={{ alignItems: 'center', opacity: boost, transform: [{ translateY: y }] }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <View key={i} style={{ width: size * (0.12 + i * 0.12), height: Math.max(2, size * 0.018), marginTop: size * 0.03, backgroundColor: i % 2 ? alt : color }} />
        ))}
      </Animated.View>
    </View>
  );
};

const SpiralFx = ({ barValues, color, size = 160 }: any) => {
  const spin = useSpin(2800);
  const rot = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const scale = (barValues[1] || barValues[0]).interpolate({ inputRange: [0, SEGMENTS_PER_BAR], outputRange: [0.75, 1.12], extrapolate: 'clamp' });
  return (
    <Animated.View pointerEvents="none" style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: rot }, { scale }] }}>
      {[0.34, 0.55, 0.76].map((k, i) => (
        <View key={i} style={{ position: 'absolute', width: size * k, height: size * k, borderRadius: size, borderWidth: 2, borderColor: 'transparent', borderTopColor: color, borderLeftColor: i === 1 ? color : 'transparent' }} />
      ))}
    </Animated.View>
  );
};

const SparksFx = ({ barValues, color, alt, size = 160 }: any) => {
  const spin = useSpin(1700);
  const rot = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View pointerEvents="none" style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: rot }] }}>
      {Array.from({ length: 8 }).map((_, i) => {
        const dist = (barValues[i % barValues.length] || barValues[0]).interpolate({ inputRange: [0, SEGMENTS_PER_BAR], outputRange: [size * 0.1, size * 0.4], extrapolate: 'clamp' });
        return <Animated.View key={i} style={{ position: 'absolute', width: Math.max(4, size * 0.045), height: Math.max(4, size * 0.045), borderRadius: 6, backgroundColor: i % 2 ? alt : color, transform: [{ rotate: `${i * 45}deg` }, { translateY: dist }] }} />;
      })}
    </Animated.View>
  );
};

const RadarFx = ({ barValues, color, size = 160 }: any) => {
  const spin = useSpin(1900);
  const rot = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const opacity = barValues[0].interpolate({ inputRange: [0, SEGMENTS_PER_BAR], outputRange: [0.3, 1], extrapolate: 'clamp' });
  return (
    <View pointerEvents="none" style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: size * 0.88, height: size * 0.88, borderRadius: size, borderWidth: 1, borderColor: color, opacity: 0.35 }} />
      <Animated.View style={{ width: size, height: size, alignItems: 'center', transform: [{ rotate: rot }] }}>
        <Animated.View style={{ width: Math.max(2, size * 0.02), height: size * 0.44, backgroundColor: color, opacity }} />
      </Animated.View>
    </View>
  );
};

const SynthFx = ({ barValues, size = 220 }: any) => {
  const spin = useSpin(1100);
  const y = spin.interpolate({ inputRange: [0, 1], outputRange: [0, size * 0.08] });
  const sunScale = (barValues[2] || barValues[0]).interpolate({ inputRange: [0, SEGMENTS_PER_BAR], outputRange: [0.92, 1.16], extrapolate: 'clamp' });
  const sun = size * 0.4;
  return (
    <View pointerEvents="none" style={{ width: size, height: size * 0.72, alignItems: 'center', overflow: 'hidden' }}>
      <Animated.View style={{ width: sun, height: sun, borderRadius: sun, backgroundColor: '#FF2D95', overflow: 'hidden', transform: [{ scale: sunScale }] }}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ position: 'absolute', left: 0, right: 0, bottom: sun * (0.08 + i * 0.12), height: 2 + i * 1.5, backgroundColor: '#14010F' }} />
        ))}
      </Animated.View>
      <Animated.View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', transform: [{ translateY: y }] }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} style={{ width: size * (0.18 + i * 0.14), height: Math.max(2, size * 0.012), marginTop: size * 0.035, backgroundColor: i % 2 ? '#00E5FF' : '#FF6AD5' }} />
        ))}
      </Animated.View>
    </View>
  );
};

const DRIVE_FX = ['ring', 'pulse', 'road', 'spiral', 'sparks', 'radar', 'synth', 'vinyl'];

const DriveFx = ({ styleName, barValues, primaryNeon, secondaryNeon }: any) => {
  if (!styleName || styleName === 'off' || styleName === 'halo' || styleName === 'orb' || DRIVE_FX.includes(styleName)) return null;
  const bars = barValues.slice(0, 10);
  if (styleName === 'wave') {
    return (
      <View pointerEvents="none" style={{ height: 72, width: 230, marginBottom: 8, alignItems: 'center', justifyContent: 'center' }}>
        {[0, 1, 2].map((i) => {
          const src = barValues[i * 4] || barValues[0];
          const scale = src.interpolate({ inputRange: [0, SEGMENTS_PER_BAR], outputRange: [0.45 + i * 0.12, 1.25 + i * 0.18], extrapolate: 'clamp' });
          const opacity = src.interpolate({ inputRange: [0, SEGMENTS_PER_BAR], outputRange: [0.18, 0.75 - i * 0.16], extrapolate: 'clamp' });
          return <Animated.View key={`ripple-${i}`} style={{ position: 'absolute', width: 64 + i * 52, height: 26 + i * 12, borderRadius: 40, borderWidth: 3, borderColor: i === 1 ? secondaryNeon : primaryNeon, opacity, transform: [{ scaleX: scale }] }} />;
        })}
      </View>
    );
  }
  if (styleName === 'dots') {
    return (
      <View pointerEvents="none" style={{ height: 86, width: 250, marginBottom: 8 }}>
        {bars.map((b: any, i: number) => {
          const y = b.interpolate({ inputRange: [0, SEGMENTS_PER_BAR], outputRange: [48, 2], extrapolate: 'clamp' });
          const opacity = b.interpolate({ inputRange: [0, SEGMENTS_PER_BAR], outputRange: [0.2, 1], extrapolate: 'clamp' });
          return <Animated.View key={`spark-${i}`} style={{ position: 'absolute', left: 10 + i * 24, top: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: i % 2 ? secondaryNeon : primaryNeon, opacity, transform: [{ translateY: y }] }} />;
        })}
      </View>
    );
  }
  if (styleName === 'cubes') {
    return (
      <View pointerEvents="none" style={{ height: 88, width: 260, marginBottom: 8 }}>
        {bars.slice(0, 8).map((b: any, i: number) => {
          const y = b.interpolate({ inputRange: [0, SEGMENTS_PER_BAR], outputRange: [22, -8], extrapolate: 'clamp' });
          const rot = b.interpolate({ inputRange: [0, SEGMENTS_PER_BAR], outputRange: ['-20deg', '24deg'], extrapolate: 'clamp' });
          const scale = b.interpolate({ inputRange: [0, SEGMENTS_PER_BAR], outputRange: [0.55, 1.15], extrapolate: 'clamp' });
          return <Animated.View key={`spin-${i}`} style={{ position: 'absolute', left: 10 + i * 30, top: 28, width: 18, height: 18, backgroundColor: i % 2 ? secondaryNeon : primaryNeon, borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)', transform: [{ translateY: y }, { rotate: rot }, { scale }] }} />;
        })}
      </View>
    );
  }
  if (styleName === 'minecraft') {
    return (
      <View pointerEvents="none" style={{ height: 86, width: 250, marginBottom: 8 }}>
        {bars.map((b: any, i: number) => {
          const y = b.interpolate({ inputRange: [0, SEGMENTS_PER_BAR], outputRange: [-8, 46], extrapolate: 'clamp' });
          const opacity = b.interpolate({ inputRange: [0, SEGMENTS_PER_BAR], outputRange: [0.25, 1], extrapolate: 'clamp' });
          return <Animated.View key={`dust-${i}`} style={{ position: 'absolute', left: 12 + (i % 8) * 28, top: 0, width: 8, height: 8, backgroundColor: i % 3 === 0 ? '#73C24A' : i % 3 === 1 ? '#C84C0C' : primaryNeon, opacity, transform: [{ translateY: y }] }} />;
        })}
      </View>
    );
  }
  return (
    <View pointerEvents="none" style={{ height: 84, width: 260, marginBottom: 8 }}>
      {bars.map((b: any, i: number) => {
        const shift = b.interpolate({ inputRange: [0, SEGMENTS_PER_BAR], outputRange: [58, 0], extrapolate: 'clamp' });
        const opacity = b.interpolate({ inputRange: [0, SEGMENTS_PER_BAR], outputRange: [0.25, 1], extrapolate: 'clamp' });
        return (
          <View key={`beam-${i}`} style={{ position: 'absolute', left: 16 + i * 24, bottom: 6, width: 3, height: 70, overflow: 'hidden' }}>
            <Animated.View style={{ width: 3, height: 70, borderRadius: 2, backgroundColor: i % 2 ? secondaryNeon : primaryNeon, opacity, transform: [{ translateY: shift }] }} />
          </View>
        );
      })}
    </View>
  );
};

const CubeEqualizer = ({ barValues, primaryNeon, secondaryNeon, height = 56, large = false }: any) => {
  const cols = [...barValues.slice(CUBE_COLS, CUBE_COLS + 3), ...barValues.slice(0, CUBE_COLS)];
  const sideW = large ? 4 : 1;
  const topH = large ? 3 : 1;
  const gap = large ? 3 : 1;
  const slot = Math.floor((height - (CUBE_ROWS - 1) * gap) / CUBE_ROWS);
  const faceH = Math.max(2, slot - topH);
  const faceW = large ? 14 : 6;
  const colW = faceW + sideW;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height, gap: large ? 4 : 2, justifyContent: 'center' }}>
      {cols.map((barAnim: any, barIdx: number) => {
        const drop = barAnim.interpolate({ inputRange: [0, SEGMENTS_PER_BAR], outputRange: [height - slot, 0], extrapolate: 'clamp' });
        return (
          <View key={`cube-col-${barIdx}`} style={{ width: colW, height, overflow: 'hidden' }}>
            <Animated.View style={{ position: 'absolute', left: 0, bottom: 0, height, width: colW, transform: [{ translateY: drop }] }}>
              <View style={{ height, width: colW, justifyContent: 'space-between' }}>
                {Array.from({ length: CUBE_ROWS }).map((_, segIdx) => {
                  const fromTop = CUBE_ROWS - 1 - segIdx;
                  const lit = fromTop > 10 ? secondaryNeon : primaryNeon;
                  return (
                    <View key={`cube-${barIdx}-${segIdx}`} style={{ width: colW, height: slot }}>
                      <View style={{ position: 'absolute', top: 0, left: sideW, width: faceW, height: topH, backgroundColor: lit, opacity: 0.55 }} />
                      <View style={{ position: 'absolute', top: topH, left: 0, width: faceW, height: faceH, backgroundColor: lit }} />
                      <View style={{ position: 'absolute', top: topH, right: 0, width: sideW, height: faceH, backgroundColor: '#05050A' }} />
                    </View>
                  );
                })}
              </View>
            </Animated.View>
          </View>
        );
      })}
    </View>
  );
};

const MinecraftEqualizer = ({ barValues, height = 56, large = false }: any) => {
  const cols = [...barValues.slice(CUBE_COLS, CUBE_COLS + 3), ...barValues.slice(0, CUBE_COLS)];
  const gap = large ? 2 : 1;
  const blockH = large ? 11 : Math.max(3, Math.floor((height - (CUBE_ROWS - 1) * gap) / CUBE_ROWS));
  const topH = large ? 4 : 1;
  const sideW = large ? 4 : 1;
  const frontH = Math.max(2, blockH - topH);
  const colW = (large ? 14 : 6) + sideW;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height, gap: large ? 4 : 2, justifyContent: 'center' }}>
      {cols.map((barAnim: any, barIdx: number) => {
        const drop = barAnim.interpolate({ inputRange: [0, SEGMENTS_PER_BAR], outputRange: [height - blockH, 0], extrapolate: 'clamp' });
        return (
          <View key={`mc-col-${barIdx}`} style={{ width: colW, height, overflow: 'hidden' }}>
            <Animated.View style={{ position: 'absolute', left: 0, bottom: 0, height, width: colW, transform: [{ translateY: drop }] }}>
              <View style={{ height, width: colW, justifyContent: 'space-between' }}>
                {Array.from({ length: CUBE_ROWS }).map((_, segIdx) => {
                  const fromTop = CUBE_ROWS - 1 - segIdx;
                  const grass = fromTop >= CUBE_ROWS - 2;
                  const ore = barIdx % 6 === 0;
                  const topColor = grass ? '#73C24A' : ore ? '#8E8E8E' : '#A56B3C';
                  const frontColor = grass ? '#8D5A2B' : ore ? '#7A7A7A' : '#7A4E28';
                  const sideColor = grass ? '#6B4120' : ore ? '#5C5C5C' : '#5C3A1E';
                  return (
                    <View key={`mc-${barIdx}-${segIdx}`} style={{ width: colW, height: blockH }}>
                      <View style={{ position: 'absolute', top: 0, left: sideW, width: colW - sideW, height: topH, backgroundColor: topColor }} />
                      <View style={{ position: 'absolute', top: topH, left: 0, width: colW - sideW, height: frontH, backgroundColor: frontColor }}>
                        {large && <View style={{ position: 'absolute', left: 2, top: 2, width: 3, height: 3, backgroundColor: grass ? '#6E4422' : '#666' }} />}
                        {large && ore && <View style={{ position: 'absolute', right: 3, bottom: 2, width: 3, height: 3, backgroundColor: '#3EC6FF' }} />}
                      </View>
                      <View style={{ position: 'absolute', top: topH, right: 0, width: sideW, height: frontH, backgroundColor: sideColor }} />
                    </View>
                  );
                })}
              </View>
            </Animated.View>
          </View>
        );
      })}
    </View>
  );
};

const HeaderViz = ({ styleName, barValues, primaryNeon, secondaryNeon }: any) => {
  const cols = barValues.slice(0, 12);
  if (!styleName || styleName === 'off') return null;
  if (styleName === 'cubes') return <CubeEqualizer barValues={barValues} primaryNeon={primaryNeon} secondaryNeon={secondaryNeon} height={56} />;
  if (styleName === 'minecraft') return <MinecraftEqualizer barValues={barValues} height={56} />;
  if (styleName === 'halo') {
    return (
      <View style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }}>
        {[0, 1, 2].map((i) => {
          const scale = barValues[i * 3].interpolate({ inputRange: [0, SEGMENTS_PER_BAR], outputRange: [0.35, 1.2], extrapolate: 'clamp' });
          const opacity = barValues[i * 3].interpolate({ inputRange: [0, SEGMENTS_PER_BAR], outputRange: [0.2, 0.95], extrapolate: 'clamp' });
          const size = 16 + i * 14;
          return <Animated.View key={i} style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: i === 1 ? secondaryNeon : primaryNeon, opacity, transform: [{ scale }] }} />;
        })}
      </View>
    );
  }
  if (DRIVE_FX.includes(styleName) && styleName !== 'vinyl') {
    const common = { barValues, color: primaryNeon, alt: secondaryNeon, size: styleName === 'synth' || styleName === 'road' ? 92 : 64 };
    return (
      <View style={{ height: 64, alignItems: 'center', justifyContent: 'center' }}>
        {styleName === 'ring' && <RingFx {...common} />}
        {styleName === 'pulse' && <PulseFx {...common} />}
        {styleName === 'road' && <RoadFx {...common} />}
        {styleName === 'spiral' && <SpiralFx {...common} />}
        {styleName === 'sparks' && <SparksFx {...common} />}
        {styleName === 'radar' && <RadarFx {...common} />}
        {styleName === 'synth' && <SynthFx barValues={barValues} size={96} />}
      </View>
    );
  }
  if (styleName === 'vinyl') {
    return <View style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: primaryNeon, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: secondaryNeon }} /></View>;
  }
  if (styleName === 'orb') {
    const scale = barValues[2].interpolate({ inputRange: [0, SEGMENTS_PER_BAR], outputRange: [0.55, 1.35], extrapolate: 'clamp' });
    return <Animated.View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: primaryNeon, opacity: 0.9, transform: [{ scale }] }} />;
  }
  if (styleName === 'dots') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 52, gap: 4 }}>
        {cols.slice(0, 10).map((barAnim: any, i: number) => {
          const shift = barAnim.interpolate({ inputRange: [0, SEGMENTS_PER_BAR], outputRange: [46, 0], extrapolate: 'clamp' });
          return (
            <View key={i} style={{ width: 6, height: 52, overflow: 'hidden' }}>
              <Animated.View style={{ height: 52, justifyContent: 'space-between', transform: [{ translateY: shift }] }}>
                {Array.from({ length: 6 }).map((_, d) => (
                  <View key={d} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: i % 2 ? secondaryNeon : primaryNeon }} />
                ))}
              </Animated.View>
            </View>
          );
        })}
      </View>
    );
  }
  if (styleName === 'wave') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 52, gap: 3 }}>
        {cols.map((barAnim: any, i: number) => {
          const shift = barAnim.interpolate({ inputRange: [0, SEGMENTS_PER_BAR], outputRange: [48, 0], extrapolate: 'clamp' });
          return (
            <View key={i} style={{ width: 7, height: 52, overflow: 'hidden' }}>
              <Animated.View style={{ width: 7, height: 52, borderRadius: 8, backgroundColor: i % 2 ? secondaryNeon : primaryNeon, transform: [{ translateY: shift }] }} />
            </View>
          );
        })}
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 52, gap: 3 }}>
      {cols.map((barAnim: any, i: number) => {
        const shift = barAnim.interpolate({ inputRange: [0, SEGMENTS_PER_BAR], outputRange: [49, 0], extrapolate: 'clamp' });
        return (
          <View key={i} style={{ width: 4, height: 52, overflow: 'hidden' }}>
            <Animated.View style={{ width: 4, height: 52, borderRadius: 2, backgroundColor: i > 8 ? secondaryNeon : primaryNeon, transform: [{ translateY: shift }] }} />
          </View>
        );
      })}
    </View>
  );
};

const DraggableSpeedWidget = ({ currentSpeed, primaryNeon, windowWidth, windowHeight, speedStyle = 'gauge', docked = false, posX, posY, posScale }: any) => {
  const size = speedStyle === 'digits' || speedStyle === 'bar' ? { w: 156, h: 78 }
    : speedStyle === 'dial' || speedStyle === 'arc' || speedStyle === 'ticks' ? { w: 128, h: 128 }
    : { w: 80, h: 100 };
  const ownX = useSharedValue(12);
  const ownY = useSharedValue(62);
  const ownScale = useSharedValue(1);
  const speedX = posX || ownX;
  const speedY = posY || ownY;
  const speedScale = posScale || ownScale;
  const clamped = Math.min(currentSpeed, 180);

  const speedTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(420)
    .onEnd(() => {
      speedScale.value = withTiming(speedScale.value > 1.08 ? 1 : 1.32, { duration: 180 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: speedX.value }, { translateY: speedY.value }, { scale: speedScale.value }],
    position: docked ? 'relative' : 'absolute',
    zIndex: 80,
    marginTop: docked ? 8 : 0,
    alignSelf: docked ? 'center' : undefined,
  }));

  const round = speedStyle === 'dial' || speedStyle === 'arc' || speedStyle === 'ticks';

  return (
    <GestureDetector gesture={speedTap}>
      <Reanimated.View style={[animatedStyle, {
        width: size.w,
        height: size.h,
        backgroundColor: speedStyle === 'digits' ? 'rgba(0,0,0,0.35)' : 'rgba(10, 10, 20, 0.8)',
        borderRadius: round ? 64 : speedStyle === 'digits' || speedStyle === 'bar' ? 8 : 16,
        borderWidth: 1.5,
        borderColor: primaryNeon,
        alignItems: 'center',
        justifyContent: 'center',
      }]}>
        {speedStyle === 'dial' && (
          <View style={{ width: 112, height: 112, alignItems: 'center', justifyContent: 'center' }}>
            {Array.from({ length: 17 }).map((_, i) => {
              const angle = -180 + (i / 16) * 180;
              const active = (i / 16) * 180 <= clamped;
              return <View key={i} style={{ position: 'absolute', width: 10, height: 3, borderRadius: 1, backgroundColor: active ? primaryNeon : 'rgba(255,255,255,0.22)', transform: [{ rotate: `${angle}deg` }, { translateY: -50 }] }} />;
            })}
            <Text style={{ color: '#FFF', fontSize: 26, fontWeight: '900' }}>{currentSpeed}</Text>
            <Text style={{ position: 'absolute', bottom: 22, color: 'rgba(255,255,255,0.55)', fontSize: 9, fontWeight: 'bold' }}>KM/H</Text>
          </View>
        )}
        {speedStyle === 'arc' && (
          <View style={{ width: 112, height: 112, alignItems: 'center', justifyContent: 'center' }}>
            {Array.from({ length: 20 }).map((_, i) => {
              const angle = -210 + (i / 19) * 240;
              const active = (i / 19) * 180 <= clamped;
              return <View key={i} style={{ position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: active ? primaryNeon : 'rgba(255,255,255,0.18)', transform: [{ rotate: `${angle}deg` }, { translateY: -46 }] }} />;
            })}
            <Text style={{ color: '#FFF', fontSize: 28, fontWeight: '900' }}>{currentSpeed}</Text>
          </View>
        )}
        {speedStyle === 'ticks' && (
          <View style={{ width: 112, height: 112, alignItems: 'center', justifyContent: 'center' }}>
            {Array.from({ length: 24 }).map((_, i) => {
              const angle = (i / 24) * 360;
              const active = (i / 24) * 180 <= clamped;
              return <View key={i} style={{ position: 'absolute', width: i % 6 === 0 ? 12 : 7, height: 2, borderRadius: 1, backgroundColor: active ? primaryNeon : 'rgba(255,255,255,0.2)', transform: [{ rotate: `${angle}deg` }, { translateY: -48 }] }} />;
            })}
            <Text style={{ color: primaryNeon, fontSize: 26, fontWeight: '900' }}>{currentSpeed}</Text>
          </View>
        )}
        {(speedStyle === 'gauge' || speedStyle === 'digits' || speedStyle === 'bar') && (
          <>
            <Text style={{ color: primaryNeon, fontSize: speedStyle === 'gauge' ? 32 : 36, fontWeight: '900', letterSpacing: speedStyle === 'digits' ? 2 : 0 }}>{currentSpeed}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 2, fontWeight: 'bold', letterSpacing: speedStyle === 'digits' ? 3 : 0 }}>KM/H</Text>
            {speedStyle === 'bar' && (
              <View style={{ width: 120, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.12)', marginTop: 6, overflow: 'hidden' }}>
                <View style={{ width: `${(clamped / 180) * 100}%`, height: 7, borderRadius: 4, backgroundColor: primaryNeon }} />
              </View>
            )}
          </>
        )}
      </Reanimated.View>
    </GestureDetector>
  );
};

const VinylRecord = ({ isPlaying, artwork, primaryNeon, vinylStyle }: any) => {
  const spinAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let alive = true;
    const spinOnce = () => {
      if (!alive) return;
      spinAnim.setValue(0);
      Animated.timing(spinAnim, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: true }).start(({ finished }) => {
        if (finished && alive) spinOnce();
      });
    };
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (isPlaying) timer = setTimeout(spinOnce, 180);
    else spinAnim.stopAnimation();
    return () => { alive = false; if (timer) clearTimeout(timer); spinAnim.stopAnimation(); };
  }, [isPlaying]);

  const rotate = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const isGold = vinylStyle === 'gold';
  const isNeon = vinylStyle === 'neon';

  return (
    <View style={styles.vinylContainer}>
      <Animated.View style={[styles.vinylDisc, { 
        transform: [{ rotate }],
        backgroundColor: isNeon ? 'rgba(0,0,0,0.2)' : (isGold ? '#1a1800' : '#050505'),
        borderColor: isNeon ? primaryNeon : (isGold ? '#FFD700' : '#1A1A1A'),
        borderWidth: isNeon ? 3 : 2
      }]}>
        <View style={[styles.vinylGrooves, { borderColor: isNeon ? 'rgba(255,255,255,0.1)' : (isGold ? '#333000' : '#1A1A1A') }]} />
        <View style={[styles.vinylGroovesInner, { borderColor: isNeon ? 'rgba(255,255,255,0.1)' : (isGold ? '#333000' : '#1A1A1A') }]} />
        {artwork && <Image source={artwork} style={[styles.vinylLabel, isGold && {borderWidth: 2, borderColor: '#FFD700'}]} />}
        <View style={[styles.vinylHole, {backgroundColor: isNeon ? 'transparent' : '#000', borderWidth: isNeon ? 2 : 0, borderColor: primaryNeon}]} />
        <View style={[styles.vinylHighlight, {backgroundColor: isNeon ? primaryNeon : (isGold ? '#FFD700' : primaryNeon)}]} />
      </Animated.View>
    </View>
  );
};

// ==========================================
// ГЛАВНЫЙ ИНТЕРФЕЙС (ЗАГРУЖАЕТСЯ ТОЛЬКО ПОСЛЕ ПЛЕЕРА)
// ==========================================
function SeekerBeatMain() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  
  const safeTopMargin = Math.max(25, (insets.top || 0) + 10);
  const retryCountRef = useRef(0);
  
  const [appState, setAppState] = useState(AppState.currentState);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      setAppState(nextAppState);
      if (nextAppState === 'active') {
        try {
          const state = await TrackPlayer.getPlaybackState();
          const currentState = typeof state === 'object' && state !== null && 'state' in state ? state.state : state;
          setIsPlaying(currentState === State.Playing);
        } catch (e) {}
      }
    });
    return () => { subscription.remove(); };
  }, []);

  const [stations, setStations] = useState<Station[]>([]);
  const [favorites, setFavorites] = useState<Station[]>([]);
  const [selectedGenre, setSelectedGenre] = useState('rock');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  
  const [audiobookLang, setAudiobookLang] = useState('russian');
  const [isLangModalVisible, setLangModalVisible] = useState(false);

  const [loading, setLoading] = useState(true);
  const [currentStation, setCurrentStation] = useState<Station | null>(null);
  const [lastPlayedStation, setLastPlayedStation] = useState<Station | null>(null);
  const [wakeStation, setWakeStation] = useState<Station | null>(null);
  const [wakeChoices, setWakeChoices] = useState<Station[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  
  const [isAboutModalVisible, setAboutModalVisible] = useState(false);
  const [isAlarmModalVisible, setAlarmModalVisible] = useState(false);
  const [isCountryModalVisible, setCountryModalVisible] = useState(false); 
  const [isTrackInfoVisible, setTrackInfoVisible] = useState(false); 
  
  const [isEqualizerVisible, setEqualizerVisible] = useState(false);
  const [eqBands, setEqBands] = useState<number[]>(Array(11).fill(0));
  const [eqOn, setEqOn] = useState(true);
  const [eqSkin, setEqSkin] = useState<'winamp' | 'classic'>('winamp');
  const [eqPreset, setEqPreset] = useState('Flat');

  const [isDriveMode, setIsDriveMode] = useState(false); 
  const [isDriveStationsOpen, setIsDriveStationsOpen] = useState(false); 
  
  const [appTheme, setAppTheme] = useState<'default' | 'cyberpunk' | 'winamp' | 'aimp' | 'matrix' | 'synthwave' | 'dracula' | 'blood' | 'midnight' | 'amber' | 'ocean' | 'minecraft' | 'seeker' | 'mario'>('default');
  const [marioFx, setMarioFx] = useState(true);
  const [matrixFx, setMatrixFx] = useState(true);
  const [nightAuto, setNightAuto] = useState(true);
  const [brickFlash, setBrickFlash] = useState(false);
  const [marioPop, setMarioPop] = useState(false);
  const [themeBurst, setThemeBurst] = useState(0);
  const [themeFx, setThemeFx] = useState(true);
  const [starMode, setStarMode] = useState(false);
  const [starTick, setStarTick] = useState(0);
  const [driveWeatherFx, setDriveWeatherFx] = useState(true);
  const [driveBg, setDriveBg] = useState<'aurora'|'dust'|'sunset'|'pulse'|'grid'|'rain'|'stars'|'miami'|'embers'|'none'>('aurora'); 

  const [eqStyle, setEqStyle] = useState<'bars' | 'cubes' | 'minecraft' | 'halo' | 'wave' | 'orb' | 'dots' | 'ring' | 'pulse' | 'road' | 'spiral' | 'sparks' | 'radar' | 'synth' | 'vinyl' | 'off'>('bars');
  const [vinylStyle, setVinylStyle] = useState<'classic' | 'gold' | 'neon' | 'off'>('classic');

  const [weatherData, setWeatherData] = useState<any>(null);
  const [trackHistory, setTrackHistory] = useState<any[]>([]); 
  
  const [liveMetadata, setLiveMetadata] = useState<{title: string, artist: string} | null>(null);

  const [isDiscoModalVisible, setDiscoModalVisible] = useState(false);
  const [discoSearchQuery, setDiscoSearchQuery] = useState('');
  const [discoResults, setDiscoResults] = useState<any[]>([]);
  const [isSearchingDisco, setIsSearchingDisco] = useState(false);
  
  const [artistBio, setArtistBio] = useState<any>(null);
  const [ytClip, setYtClip] = useState<{ id: string; title: string } | null>(null);
  const [ytBusy, setYtBusy] = useState(false);
  
  const [isAutoStart, setIsAutoStart] = useState(false); 
  const [isBgPlayEnabled, setIsBgPlayEnabled] = useState(true); 
  const [isTickerMoving, setIsTickerMoving] = useState(true); 
  const [isDynamicCover, setIsDynamicCover] = useState(true); 
  const [isSpeedometerEnabled, setIsSpeedometerEnabled] = useState(true);
  const [isWeatherEnabled, setIsWeatherEnabled] = useState(true);
  const [weatherMoveEnabled, setWeatherMoveEnabled] = useState(false);
  const [weatherExpanded, setWeatherExpanded] = useState(false);
  const [speedStyle, setSpeedStyle] = useState<'gauge' | 'digits' | 'dial' | 'arc' | 'ticks' | 'bar'>('gauge');
  const [weatherStyle, setWeatherStyle] = useState<'card' | 'compact' | 'hud'>('card');
  const weatherLeft = useSharedValue(Math.max(8, windowWidth - 250 - 78));
  const weatherTop = useSharedValue(20);
  const weatherGrantX = useRef(40);
  const weatherGrantY = useRef(420);
  const weatherMoveRef = useRef(false);
  const weatherExpandedRef = useRef(false);
  weatherMoveRef.current = weatherMoveEnabled;
  weatherExpandedRef.current = weatherExpanded;
  const weatherSizeRef = useRef({ w: 250, h: 160 });
  const speedX = useSharedValue(12);
  const speedY = useSharedValue(62);
  const speedScale = useSharedValue(1);
  const speedSizeRef = useRef({ w: 80, h: 100 });
  const screenRef = useRef({ w: windowWidth, h: windowHeight });
  screenRef.current = { w: windowWidth, h: windowHeight };
  weatherSizeRef.current = { w: weatherStyle === 'compact' ? 168 : 250, h: weatherStyle === 'hud' ? 110 : 168 };
  speedSizeRef.current = speedStyle === 'digits' || speedStyle === 'bar' ? { w: 156, h: 78 }
    : speedStyle === 'dial' || speedStyle === 'arc' || speedStyle === 'ticks' ? { w: 128, h: 128 }
    : { w: 80, h: 100 };
  const weatherDrag = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => weatherMoveRef.current && !weatherExpandedRef.current,
    onMoveShouldSetPanResponder: () => weatherMoveRef.current && !weatherExpandedRef.current,
    onPanResponderGrant: () => {
      weatherGrantX.current = weatherLeft.value;
      weatherGrantY.current = weatherTop.value;
    },
    onPanResponderMove: (_, gesture) => {
      if (!weatherMoveRef.current || weatherExpandedRef.current) return;
      const w = weatherSizeRef.current.w;
      const h = weatherSizeRef.current.h;
      const maxL = Math.max(0, screenRef.current.w - w - 4);
      const maxT = Math.max(36, screenRef.current.h - h - 4);
      weatherLeft.value = Math.max(0, Math.min(maxL, weatherGrantX.current + gesture.dx));
      weatherTop.value = Math.max(36, Math.min(maxT, weatherGrantY.current + gesture.dy));
    },
    onPanResponderRelease: () => {
      const ww = weatherSizeRef.current.w;
      const wh = weatherSizeRef.current.h;
      const wx = weatherLeft.value;
      const wy = weatherTop.value;
      const sw = speedSizeRef.current.w * speedScale.value;
      const sh = speedSizeRef.current.h * speedScale.value;
      const sx = speedX.value;
      const sy = speedY.value;
      const hit = wx < sx + sw && wx + ww > sx && wy < sy + sh && wy + wh > sy;
      if (!hit) return;
      const weatherOnRight = wx + ww / 2 >= screenRef.current.w / 2;
      let nx = weatherOnRight ? 8 : Math.max(8, screenRef.current.w - sw - 8);
      nx = Math.max(0, Math.min(nx, Math.max(0, screenRef.current.w - sw)));
      let ny = sy;
      if (nx < wx + ww && nx + sw > wx && ny < wy + wh && ny + sh > wy) {
        ny = wy + wh + 10;
        if (ny + sh > screenRef.current.h - 4) ny = Math.max(36, wy - sh - 10);
      }
      ny = Math.max(0, Math.min(ny, Math.max(0, screenRef.current.h - sh)));
      speedX.value = nx;
      speedY.value = ny;
    },
    onPanResponderTerminationRequest: () => false,
  })).current;
  const weatherPinned = useSharedValue(0);
  const screenW = useSharedValue(windowWidth);
  const screenH = useSharedValue(windowHeight);
  const weatherCardW = useSharedValue(250);
  const weatherOpenH = useSharedValue(180);
  screenW.value = windowWidth;
  screenH.value = windowHeight;
  weatherCardW.value = weatherStyle === 'compact' ? 168 : 250;
  weatherOpenH.value = weatherExpanded ? (weatherStyle === 'compact' ? 300 : 460) : (weatherStyle === 'hud' ? 130 : weatherStyle === 'compact' ? 96 : 180);
  useEffect(() => { weatherPinned.value = weatherExpanded ? 1 : 0; }, [weatherExpanded]);
  useEffect(() => {
    if (!isDriveMode || windowWidth < 120) return;
    const cardW = weatherSizeRef.current.w;
    const xPad = Math.max(20, insets.right || 0) + 64;
    weatherLeft.value = Math.max(8, windowWidth - cardW - xPad);
    weatherTop.value = Math.max(8, safeTopMargin - 8);
  }, [isDriveMode, windowWidth, weatherStyle]);
  const weatherDragStyle = useAnimatedStyle(() => {
    const w = weatherCardW.value;
    const h = weatherOpenH.value;
    const maxL = Math.max(0, screenW.value - w - 6);
    const maxT = Math.max(8, screenH.value - h - 8);
    return {
      position: 'absolute',
      zIndex: 120,
      left: Math.max(0, Math.min(weatherLeft.value, maxL)),
      top: Math.max(8, Math.min(weatherTop.value, maxT)),
    };
  });

  const [currentSpeed, setCurrentSpeed] = useState(0);

  const [listeningSeconds, setListeningSeconds] = useState(0); 

  const dayThemeRef = useRef('default');
  const nightPickRef = useRef(false);
  const coinY = useRef(new Animated.Value(0)).current;
  const starTapWait = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMushroomTap = useRef(0);
  const tapCountRef = useRef(0);
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [pulseEffectIndex, setPulseEffectIndex] = useState(0);
  const [titleWidth, setTitleWidth] = useState(168);
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  
  const tickerLoopRef = useRef<Animated.CompositeAnimation | null>(null); 
  const tickerAnim = useRef(new Animated.Value(0)).current; 
  const [tickerWidth, setTickerWidth] = useState(0); 

  const [alarmTime, setAlarmTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [customTimerVal, setCustomTimerVal] = useState('');
  const [alarmClockVal, setAlarmClockVal] = useState('');
  const [timerActionMode, setTimerActionMode] = useState<'sleep' | 'wake'>('sleep'); 

  const spinAnim = useRef(new Animated.Value(0)).current;
  const heartbeatAnim = useRef(new Animated.Value(0)).current;
  const drivePlayPulseAnim = useRef(new Animated.Value(1)).current;

  const [cryptoData, setCryptoData] = useState({ sol: { price: 0, change: 0 }, skr: { price: 0, change: 0 } });
  const [customCoins, setCustomCoins] = useState<Array<{symbol: string, price: number, change: number}>>([]);
  const [activeTimeframe, setActiveTimeframe] = useState('1D');

  const [isCoinModalVisible, setCoinModalVisible] = useState(false);
  const [coinSearchQuery, setCoinSearchQuery] = useState('');
  const [isSearchingCoin, setIsSearchingCoin] = useState(false);

  const barValues = useRef(Array.from({ length: NUM_BARS }, () => new Animated.Value(0.1))).current;
  
  const activeTrack = useActiveTrack(); 

  const displayedStations = useMemo(() => {
    if (!searchQuery.trim()) return stations;
    const q = searchQuery.toLowerCase();
    return stations.filter(s => 
      (s.name ? s.name.toLowerCase().includes(q) : false) || 
      (s.tags ? s.tags.toLowerCase().includes(q) : false)
    );
  }, [stations, searchQuery]);

  useEffect(() => {
    const requestPermissions = async () => {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        try {
          await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
        } catch (err) {}
      }
    };
    requestPermissions();
  }, []);

  const fetchWeather = async (lat: number, lon: number) => {
    try {
      let city = '';
      try {
        const geocode = await Location.reverseGeocodeAsync({latitude: lat, longitude: lon});
        if (geocode && geocode.length > 0) {
          city = geocode[0].city || geocode[0].region || '';
        }
      } catch (e) {}

      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max&timezone=auto`);
      const data = await res.json();
      
      if (data.current && data.daily) {
        let dailyData = [];
        for(let i=1; i<=6; i++) { 
           if (!data.daily.time[i]) continue;
           dailyData.push({
              date: data.daily.time[i],
              code: data.daily.weather_code[i],
              max: Math.round(data.daily.temperature_2m_max[i]),
              min: Math.round(data.daily.temperature_2m_min[i])
           });
        }
        
        setWeatherData({ 
          temp: Math.round(data.current.temperature_2m), 
          feelsLike: Math.round(data.current.apparent_temperature),
          humidity: Math.round(data.current.relative_humidity_2m),
          windSpeed: Math.round(data.current.wind_speed_10m),
          windDir: data.current.wind_direction_10m,
          code: data.current.weather_code,
          isDay: data.current.is_day,
          city: city,
          todayMax: Math.round(data.daily.temperature_2m_max[0]),
          todayMin: Math.round(data.daily.temperature_2m_min[0]),
          sunrise: data.daily.sunrise[0],
          sunset: data.daily.sunset[0],
          uv: Math.round(data.daily.uv_index_max[0] || 0),
          daily: dailyData
        });
      }
    } catch(e) {}
  };

  const handleEnterDriveMode = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isSpeedometerEnabled || isWeatherEnabled) {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') {
          await Location.requestForegroundPermissionsAsync();
        }
      } catch (e) {}
    }
    setIsDriveMode(true);
  };

  useEffect(() => {
    if (isDriveMode) { ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE); } 
    else { ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP); }
  }, [isDriveMode]);

  useEffect(() => {
    let locationSub: Location.LocationSubscription | null = null;
    let lastWeatherFetch = 0; 

    const startLocation = async () => {
      if (isDriveMode && (isSpeedometerEnabled || isWeatherEnabled)) {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          locationSub = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 1 },
            (loc) => {
              if (isSpeedometerEnabled) {
                let speed = loc.coords.speed || 0;
                setCurrentSpeed(Math.max(0, Math.round(speed * 3.6)));
              }
              if (isWeatherEnabled) {
                const now = Date.now();
                if (now - lastWeatherFetch > 300000) {
                  lastWeatherFetch = now;
                  fetchWeather(loc.coords.latitude, loc.coords.longitude);
                }
              }
            }
          );
        }
      }
    };
    startLocation();
    return () => { if (locationSub) locationSub.remove(); };
  }, [isDriveMode, isSpeedometerEnabled, isWeatherEnabled]);

  useEffect(() => {
    const metadataListener = TrackPlayer.addEventListener(Event.PlaybackMetadataReceived, (event) => {
      if (event.title) {
        const trackTitle = event.title;
        const trackArtist = event.artist || '';

        setLiveMetadata({ title: trackTitle, artist: trackArtist });

        setTrackHistory(prev => {
          if (prev[0]?.title === trackTitle) return prev; 
          
          const newHistory = [{
            title: trackTitle,
            artist: trackArtist ? trackArtist : 'Live Stream',
            time: Date.now()
          }, ...prev].slice(0, 30); 
          
          AsyncStorage.setItem(TRACK_HISTORY_KEY, JSON.stringify(newHistory)).catch(()=>{});
          return newHistory;
        });
      }
    });

    return () => { metadataListener.remove(); };
  }, []);

  useEffect(() => {
    if (!currentStation) return;
    
    const historyTimer = setTimeout(() => {
      setTrackHistory(prev => {
        if (prev[0]?.title === currentStation.name) return prev;
        const newHistory = [{ title: currentStation.name, artist: 'Radio Station', time: Date.now() }, ...prev].slice(0, 30);
        AsyncStorage.setItem(TRACK_HISTORY_KEY, JSON.stringify(newHistory)).catch(()=>{});
        return newHistory;
      });
    }, 20000);

    return () => clearTimeout(historyTimer);
  }, [currentStation]);

  const fetchDiscography = async (query: string) => {
    if (!query.trim()) return;
    setIsSearchingDisco(true);
    setArtistBio(null);
    Haptics.selectionAsync();
    
    try {
      const host = 'https://discoveryprovider.audius.co';
      const res = await fetch(`${host}/v1/tracks/search?query=${encodeURIComponent(query)}&app_name=SeekerBeat`);
      const data = await res.json();

      if (data && data.data && data.data.length > 0) {
        const formattedResults = data.data.map((track: any) => ({
           trackId: track.id,
           trackName: track.title,
           artistName: track.user.name,
           collectionName: 'Audius Web3',
           artworkUrl100: track.artwork?.['150x150'] || 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
           previewUrl: `${host}/v1/tracks/${track.id}/stream?app_name=SeekerBeat`
        }));
        setDiscoResults(formattedResults);

        const exactArtist = formattedResults[0].artistName;
        try {
          const wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(exactArtist)}`);
          if (wikiRes.ok) {
            const wikiData = await wikiRes.json();
            if (wikiData.extract) {
              setArtistBio({ 
                name: exactArtist, 
                summary: wikiData.extract, 
                image: wikiData.thumbnail?.source 
              });
            }
          }
        } catch (e) {} 
      } else {
         setDiscoResults([]);
      }
    } catch (e) {} finally { setIsSearchingDisco(false); }
  };

  const handlePlayPreview = async (track: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const previewStation: Station = {
      id: String(track.trackId), name: track.trackName, url: track.previewUrl, 
      favicon: track.artworkUrl100, tags: `${track.artistName},AUDIUS`,
    };
    handleTogglePlay(previewStation);
    setDiscoModalVisible(false); 
  };

  const openExternalApp = async (type: 'spotify' | 'youtube', artist: string, track: string) => {
    Haptics.selectionAsync();
    const query = encodeURIComponent(`${artist} ${track}`);
    const url = type === 'spotify' 
      ? `https://open.spotify.com/search/${query}` 
      : `https://www.youtube.com/results?search_query=${query}`;
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Error', `Could not open ${type}`);
    }
  };

  const openYoutubeInline = async (artist: string, track: string) => {
    Haptics.selectionAsync();
    setYtBusy(true);
    const query = `${artist} ${track}`.trim();
    const urls = [
      `https://pipedapi.kavin.rocks/search?q=${encodeURIComponent(query)}&filter=videos`,
      `https://pipedapi.adminforge.de/search?q=${encodeURIComponent(query)}&filter=videos`,
      `https://invidious.privacyredirect.com/api/v1/search?q=${encodeURIComponent(query)}&type=video`,
    ];
    let videoId = '';
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.items || data.data || []);
        const hit = list.find((row: any) => row && (row.videoId || row.url || row.id));
        if (!hit) continue;
        videoId = String(hit.videoId || hit.id || '');
        if (!videoId && hit.url) {
          const matched = String(hit.url).match(/([A-Za-z0-9_-]{11})/);
          videoId = matched ? matched[1] : '';
        }
        if (videoId.length >= 11) break;
        videoId = '';
      } catch (e) {}
    }
    setYtBusy(false);
    if (!videoId) {
      Alert.alert('YouTube', 'Не удалось найти ролик. Попробуй ещё раз.');
      return;
    }
    setYtClip({ id: videoId, title: `${track} — ${artist}` });
    if (isPlaying) {
      setIsPlaying(false);
      pauseRadioStation().catch(() => {});
    }
  };

  const handleTipDev = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const walletAddress = 'A7xUS1Ai8ic6f8HfSUWq6tadvPsWpEXhd1NvDyJsJZi';
    await Clipboard.setStringAsync(walletAddress);
    Alert.alert('Address Copied! 🚀', 'You can send any amount of SOL or SKR to this address. Thank you!');
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying) interval = setInterval(() => setListeningSeconds((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => { setListeningSeconds(0); }, [currentStation]);

  const formatListeningTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  const handleLogoTap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPulseEffectIndex((prev) => (prev + 1) % PULSE_EFFECTS.length);
    tapCountRef.current += 1;
    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    if (tapCountRef.current >= 5) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const themeOrder = ['default', 'cyberpunk', 'winamp', 'aimp', 'matrix', 'synthwave', 'dracula', 'blood', 'midnight', 'amber', 'ocean', 'minecraft', 'seeker', 'mario'];
      const currentIdx = themeOrder.indexOf(appTheme);
      const nextTheme = themeOrder[(currentIdx + 1) % themeOrder.length] as any;
      setAppTheme(nextTheme);
      AsyncStorage.setItem(THEME_KEY, nextTheme);
      tapCountRef.current = 0;
      Alert.alert("SYSTEM OVERRIDE", `Theme switched to: ${nextTheme.toUpperCase()}`);
    } else {
      tapTimeoutRef.current = setTimeout(() => { tapCountRef.current = 0; }, 1000);
    }
  };

  const toggleAutoStart = async (val: boolean) => {
    Haptics.selectionAsync(); setIsAutoStart(val);
    try { await AsyncStorage.setItem(AUTOSTART_KEY, JSON.stringify(val)); } catch (e) {}
  };

  const handleEqChange = async (style: string) => {
    Haptics.selectionAsync();
    setEqStyle(style as any);
    AsyncStorage.setItem(EQ_STYLE_KEY, style);

    if ((style === 'halo' || style === 'orb') && vinylStyle !== 'off') {
      Alert.alert('Style Conflict', 'Center visualizers conflict with Vinyl. Vinyl has been turned off.');
      setVinylStyle('off');
      AsyncStorage.setItem(DRIVE_VINYL_KEY, 'off');
    }
  };

  const handleVinylChange = async (style: string) => {
    Haptics.selectionAsync();
    setVinylStyle(style as any);
    AsyncStorage.setItem(DRIVE_VINYL_KEY, style);

    if (style !== 'off' && (eqStyle === 'halo' || eqStyle === 'orb')) {
      Alert.alert('Style Conflict', 'Vinyl conflicts with center visualizers. Visualizer changed to Bars.');
      setEqStyle('bars');
      AsyncStorage.setItem(EQ_STYLE_KEY, 'bars');
    }
  };

  const handleThemeChange = async (themeName: 'default' | 'cyberpunk' | 'winamp' | 'aimp' | 'matrix' | 'synthwave' | 'dracula' | 'blood' | 'midnight' | 'amber' | 'ocean' | 'minecraft' | 'seeker' | 'mario') => {
    Haptics.selectionAsync();
    nightPickRef.current = true;
    if (themeName !== 'midnight') dayThemeRef.current = themeName;
    setAppTheme(themeName);
    try { await AsyncStorage.setItem(THEME_KEY, themeName); } catch (e) {}
  };

  const updatePlayerOptions = async (playInBackground: boolean) => {
    try {
      await TrackPlayer.updateOptions({
          android: {
            appKilledPlaybackBehavior: playInBackground 
              ? AppKilledPlaybackBehavior.ContinuePlayback 
              : AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification
          },
          // @ts-ignore
          stopWithApp: !playInBackground,
          capabilities: [Capability.Play, Capability.Pause, Capability.Stop],
          compactCapabilities: [Capability.Play, Capability.Pause],
          notificationCapabilities: [Capability.Play, Capability.Pause, Capability.Stop],
          alwaysPauseOnInterruption: false,
      });
    } catch (error) {}
  };

  const toggleBgPlay = async (val: boolean) => {
    Haptics.selectionAsync(); setIsBgPlayEnabled(val);
    try { await AsyncStorage.setItem(BG_PLAY_KEY, JSON.stringify(val)); await updatePlayerOptions(val); } catch (e) {}
  };

  const toggleTickerMode = async (val: boolean) => {
    Haptics.selectionAsync(); setIsTickerMoving(val);
    try { await AsyncStorage.setItem(TICKER_MODE_KEY, JSON.stringify(val)); } catch (e) {}
  };

  const toggleDynamicCover = async (val: boolean) => {
    Haptics.selectionAsync(); setIsDynamicCover(val);
    try { await AsyncStorage.setItem(DYNAMIC_COVER_KEY, JSON.stringify(val)); } catch (e) {}
  };

  const toggleSpeedometer = async (val: boolean) => {
    Haptics.selectionAsync(); setIsSpeedometerEnabled(val);
    try { await AsyncStorage.setItem(SPEEDOMETER_KEY, JSON.stringify(val)); } catch (e) {}
  };
  
  const toggleWeather = async (val: boolean) => {
    Haptics.selectionAsync(); setIsWeatherEnabled(val);
    try { await AsyncStorage.setItem(WEATHER_ENABLED_KEY, JSON.stringify(val)); } catch (e) {}
  };

  const handleForceExit = async () => {
    Alert.alert("Power Off", "Are you sure you want to close the app and stop playback?", [
        { text: "Cancel", style: "cancel" },
        { text: "Exit", style: "destructive", onPress: async () => { await TrackPlayer.reset(); BackHandler.exitApp(); } }
    ]);
  };

  const ensureAlarmPermission = async () => {
    if (Platform.OS === 'android') {
      const settings = await notifee.getNotificationSettings();
      if (settings.authorizationStatus !== 1) {
        await notifee.requestPermission();
      }
      if (settings.android?.alarm !== AndroidNotificationSetting.ENABLED) {
        await notifee.openAlarmPermissionSettings();
      }
    }
  };

  const scheduleWakeAlarm = async (targetTimeMs: number) => {
    await notifee.cancelAllNotifications();
    await ensureAlarmPermission();

    const channelId = await notifee.createChannel({
      id: timerActionMode === 'wake' ? 'seeker_alarm' : 'seeker_sleep',
      name: timerActionMode === 'wake' ? 'Seeker Beat Alarm' : 'Seeker Beat Sleep',
      importance: timerActionMode === 'wake' ? AndroidImportance.HIGH : AndroidImportance.LOW,
      visibility: AndroidVisibility.PUBLIC,
      sound: timerActionMode === 'wake' ? 'default' : undefined,
    });

    const isWake = timerActionMode === 'wake';
    const station = wakeStation || lastPlayedStation;
    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: targetTimeMs,
      alarmManager: {
        type: isWake ? AlarmType.SET_ALARM_CLOCK : AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE,
      },
    };

    await notifee.createTriggerNotification(
      {
        id: isWake ? 'wake_up_alarm' : 'sleep_stop',
        title: isWake ? 'Wake Up!' : 'Seeker Beat',
        body: isWake ? `Seeker Beat включает: ${station?.name || 'радио'}` : 'Радио выключено',
        android: {
          channelId,
          category: isWake ? AndroidCategory.ALARM : undefined,
          importance: isWake ? AndroidImportance.HIGH : AndroidImportance.LOW,
          visibility: AndroidVisibility.PUBLIC,
          lightUpScreen: isWake,
          pressAction: { id: 'default', launchActivity: 'default' },
          fullScreenAction: isWake ? { id: 'default', launchActivity: 'default' } : undefined,
        },
        data: {
          action: isWake ? 'wake_radio' : 'sleep_radio',
          stationId: String(station?.id || ''),
          stationName: String(station?.name || ''),
          stationUrl: String(station?.url || ''),
          stationIcon: String(station?.favicon || ''),
        },
      },
      trigger,
    );
  };

  const formatAlarmLabel = (target: number, mode: 'sleep' | 'wake') => {
    const d = new Date(target);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    if (mode === 'wake') return `${hh}:${mm}`;
    const diff = Math.max(0, target - Date.now());
    const hours = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${hours > 0 ? hours + 'h ' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSetTimer = async (minutes: number) => {
    const target = Date.now() + minutes * 60000;
    setAlarmTime(target);
    setTimeLeft(formatAlarmLabel(target, timerActionMode));
    setAlarmModalVisible(false);
    await scheduleWakeAlarm(target);
  };

  const handleSetCustomTimer = async () => {
    const mins = parseInt(customTimerVal, 10);
    if (isNaN(mins) || mins <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid number of minutes (e.g. 45).');
      return;
    }
    const target = Date.now() + mins * 60000;
    setAlarmTime(target);
    setTimeLeft(formatAlarmLabel(target, timerActionMode));
    setCustomTimerVal('');
    setAlarmModalVisible(false);
    await scheduleWakeAlarm(target);
  };

  const handleSetAlarmClock = async () => {
    const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
    if (!timeRegex.test(alarmClockVal.trim())) {
      Alert.alert('Invalid Format', 'Please enter time in HH:MM format (e.g., 07:30).');
      return;
    }
    const [hours, minutes] = alarmClockVal.trim().split(':').map(Number);
    const now = new Date();
    const targetTime = new Date(now);
    targetTime.setHours(hours, minutes, 0, 0);
    if (targetTime.getTime() <= now.getTime()) {
      targetTime.setDate(targetTime.getDate() + 1);
    }
    const target = targetTime.getTime();
    setAlarmTime(target);
    setTimeLeft(formatAlarmLabel(target, 'wake'));
    setAlarmClockVal('');
    setAlarmModalVisible(false);
    await scheduleWakeAlarm(target);
  };

  const CLASSIC_BANDS = [
    { index: 1, label: '60Hz' },
    { index: 3, label: '310Hz' },
    { index: 5, label: '1kHz' },
    { index: 7, label: '6kHz' },
    { index: 9, label: '14kHz' },
  ];

  const updateEqBand = async (index: number, value: number) => {
    const next = Math.max(-12, Math.min(12, Math.round(value)));
    setEqBands((prev) => {
      const bands = prev.length === 11 ? [...prev] : Array(11).fill(0);
      bands[index] = next;
      AsyncStorage.setItem(EQ_LEVELS_KEY, JSON.stringify(bands)).catch(() => {});
      return bands;
    });
    setEqPreset('Custom');
  };

  const applyEqPreset = async (name: string) => {
    Haptics.selectionAsync();
    const gains = WINAMP_PRESETS[name];
    if (!gains) return;
    const bands = [eqBands[0] || 0, ...gains];
    setEqBands(bands);
    setEqPreset(name);
    try { await AsyncStorage.setItem(EQ_LEVELS_KEY, JSON.stringify(bands)); } catch (e) {}
  };

  const toggleEqPower = async () => {
    Haptics.selectionAsync();
    const next = !eqOn;
    setEqOn(next);
    try { await AsyncStorage.setItem(EQ_ENABLED_KEY, JSON.stringify(next)); } catch (e) {}
  };

  useEffect(() => {
    const stationFrom = (data?: Record<string, string | number | object> | null) => {
      const url = String(data?.stationUrl || '');
      if (!url) return wakeStation || lastPlayedStation;
      return {
        id: String(data?.stationId || 'wake'),
        name: String(data?.stationName || 'Seeker Beat'),
        url,
        favicon: String(data?.stationIcon || ''),
        tags: 'ALARM',
      } as Station;
    };
    const wakeRadio = (data?: Record<string, string | number | object> | null) =>
      String(data?.action ?? '') === 'wake_radio';
    const sleepRadio = (data?: Record<string, string | number | object> | null) =>
      String(data?.action ?? '') === 'sleep_radio';

    const startWake = async (data?: Record<string, string | number | object> | null) => {
      const station = stationFrom(data);
      if (!station?.url) return;
      setAlarmTime(null);
      setCurrentStation(station);
      setIsPlaying(true);
      await playRadioStation(station);
    };

    notifee.getInitialNotification().then(async (initial) => {
      if (wakeRadio(initial?.notification?.data)) await startWake(initial?.notification?.data);
      if (sleepRadio(initial?.notification?.data)) {
        setAlarmTime(null);
        setTimeLeft('');
        await pauseRadioStation();
        setIsPlaying(false);
        try { await TrackPlayer.setVolume(1); } catch (e) {}
      }
    });

    const unsubscribe = notifee.onForegroundEvent(async ({ type, detail }) => {
      if (type !== EventType.DELIVERED && type !== EventType.PRESS) return;
      if (wakeRadio(detail.notification?.data)) await startWake(detail.notification?.data);
      if (sleepRadio(detail.notification?.data)) {
        setAlarmTime(null);
        setTimeLeft('');
        await pauseRadioStation();
        setIsPlaying(false);
        try { await TrackPlayer.setVolume(1); } catch (e) {}
      }
    });

    const appStateSub = AppState.addEventListener('change', async (next) => {
      if (next !== 'active') return;
      try {
        const shown = await notifee.getDisplayedNotifications();
        const wake = shown.find((item) => String(item.notification?.data?.action || '') === 'wake_radio');
        if (wake?.notification?.data) await startWake(wake.notification.data);
      } catch (e) {}
    });

    return () => {
      unsubscribe();
      appStateSub.remove();
    };
  }, [lastPlayedStation, wakeStation]);

  useEffect(() => {
    if (!alarmTime) return;
    const id = setInterval(async () => {
      const diff = alarmTime - Date.now();
      if (diff <= 0) {
        setAlarmTime(null);
        setTimeLeft('');
        setAlarmModalVisible(false);
        if (timerActionMode === 'sleep') {
          await pauseRadioStation();
          setIsPlaying(false);
          try { await TrackPlayer.setVolume(1); } catch (e) {}
          try { await notifee.cancelNotification('sleep_stop'); } catch (e) {}
        }
        return;
      }
      setTimeLeft(formatAlarmLabel(alarmTime, timerActionMode));
      if (timerActionMode === 'sleep' && diff <= 300000) {
        try { await TrackPlayer.setVolume(Math.max(0, diff / 300000)); } catch (e) {}
      }
    }, 1000);
    return () => clearInterval(id);
  }, [alarmTime, timerActionMode]);

  const clearTimerManually = async () => {
    setAlarmTime(null);
    setTimeLeft('');
    setAlarmModalVisible(false);
    await notifee.cancelAllNotifications();
    try { await TrackPlayer.setVolume(1); } catch (e) {} 
  };

  const handleTogglePlay = async (station: Station) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    retryCountRef.current = 0; 
    setLastPlayedStation(station); 
    AsyncStorage.setItem(LAST_STATION_KEY, JSON.stringify(station)).catch(()=>{});
    
    try { await TrackPlayer.setRepeatMode(RepeatMode.Off); } catch(e){}

    if (currentStation?.id === station.id && isPlaying) { 
      setIsPlaying(false);
      await pauseRadioStation(); 
    } else { 
      setCurrentStation(station); 
      setLiveMetadata(null); 
      setIsPlaying(true);
      setThemeBurst((n) => n + 1);
      if (appTheme === 'mario' && marioFx) {
        setBrickFlash(true);
        setMarioPop(true);
        coinY.setValue(0);
        Animated.timing(coinY, { toValue: -110, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
        setTimeout(() => { setBrickFlash(false); setMarioPop(false); }, 1100);
      }
      await playRadioStation(station); 
    }
  };

  useEffect(() => {
    const errorListener = TrackPlayer.addEventListener(Event.PlaybackError, async () => {
      const attempt = retryCountRef.current + 1;
      retryCountRef.current = attempt;
      const delay = Math.min(30000, 2000 * attempt);
      setTimeout(async () => {
        try { await TrackPlayer.play(); }
        catch (e) {
          try { await TrackPlayer.stop(); await TrackPlayer.play(); } catch (e2) {}
        }
      }, delay);
    });

    const stateListener = TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
      if (event.state === State.Playing) { 
        retryCountRef.current = 0; 
        setPlaybackError(null); 
        setIsPlaying(true); 
      } else if (event.state === State.Paused || event.state === State.Stopped) { 
        setIsPlaying(false); 
      }
    });

    return () => { errorListener.remove(); stateListener.remove(); };
  }, []);

  useEffect(() => {
    let bgInterval: any;
    if (isBgPlayEnabled) {
      bgInterval = setInterval(async () => {
        try {
          const state = await TrackPlayer.getPlaybackState();
          const curState = typeof state === 'object' && state !== null && 'state' in state ? state.state : state;
          if (curState === State.Playing && !isPlaying) setIsPlaying(true);
        } catch (error) {}
      }, 2000); 
    }
    return () => clearInterval(bgInterval);
  }, [isPlaying, isBgPlayEnabled]);

  useEffect(() => {
    if (activeTrack) {
      const station = { id: activeTrack.id, name: activeTrack.title || 'Радиостанция', url: activeTrack.url || '', favicon: activeTrack.artwork?.toString() || '', tags: activeTrack.artist || 'MUSIC' };
      setCurrentStation(station); setLastPlayedStation(station);
      AsyncStorage.setItem(LAST_STATION_KEY, JSON.stringify(station)).catch(()=>{});
    }
  }, [activeTrack]);

  useEffect(() => {
    let timerId: ReturnType<typeof setInterval> | null = null;
    if (isPlaying) {
      const tick = () => {
        if (AppState.currentState !== 'active' || eqStyle === 'off') return;
        const now = Date.now();
        const dt = Math.min(0.2, (now - (tick as any).last) / 1000 || 0.08);
        (tick as any).last = now;
        const tempo = 108 / 60;
        const phase = ((tick as any).phase || 0) + tempo * dt;
        (tick as any).phase = phase;
        const beatPos = phase % 1;
        const kick = Math.exp(-beatPos * 9);
        const snare = (Math.floor(phase) % 2 === 1) ? Math.exp(-beatPos * 7) : 0;
        const hat = Math.pow(Math.max(0, Math.sin(phase * Math.PI * 4)), 8);
        const levels: number[] = (tick as any).levels || Array(NUM_BARS).fill(0.12);
        (tick as any).levels = levels;
        for (let i = 0; i < NUM_BARS; i++) {
          const t = i / (NUM_BARS - 1);
          const bass = kick * Math.exp(-t * 3.4);
          const mid = snare * Math.exp(-Math.pow((t - 0.46) * 4.2, 2));
          const high = hat * Math.pow(t, 1.6) * 0.7;
          const air = 0.05 + (i % 5 === 0 ? kick * 0.08 : 0);
          const target = Math.max(0.04, Math.min(1, bass * 0.95 + mid * 0.72 + high * 0.5 + air));
          const follow = target > levels[i] ? 0.72 : 0.16;
          levels[i] = levels[i] + (target - levels[i]) * follow;
          const next = Math.max(0.15, levels[i] * SEGMENTS_PER_BAR);
          const shown = (tick as any).shown || ((tick as any).shown = Array(NUM_BARS).fill(0));
          if (Math.abs(next - shown[i]) > 0.25) {
            shown[i] = next;
            barValues[i].setValue(next);
          }
        }
      };
      tick();
      timerId = setInterval(tick, 120);
    } else {
      barValues.forEach((anim) => {
        anim.stopAnimation();
        Animated.timing(anim, { toValue: 0.15, duration: 280, useNativeDriver: true }).start();
      });
    }
    return () => { if (timerId) clearInterval(timerId); };
  }, [isPlaying, eqStyle, isDriveMode]);

  useEffect(() => {
    let spinAlive = false;
    let pulseLoop: Animated.CompositeAnimation | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    if (isPlaying) {
      timer = setTimeout(() => {
        spinAlive = true;
        const spinOnce = () => {
          if (!spinAlive) return;
          spinAnim.setValue(0);
          Animated.timing(spinAnim, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: true }).start(({ finished }) => {
            if (finished && spinAlive) spinOnce();
          });
        };
        spinOnce();

        pulseLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(drivePlayPulseAnim, { toValue: 1.25, duration: 800, useNativeDriver: true }),
            Animated.timing(drivePlayPulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
          ])
        );
        pulseLoop.start();
      }, isDriveMode ? 180 : 0);
    } else {
      spinAnim.stopAnimation();
      drivePlayPulseAnim.stopAnimation();
      drivePlayPulseAnim.setValue(1);
    }
    return () => {
      spinAlive = false;
      if (timer) clearTimeout(timer);
      spinAnim.stopAnimation();
      if (pulseLoop) pulseLoop.stop();
    };
  }, [isPlaying, isDriveMode]);

  useEffect(() => {
    const currentEffect = PULSE_EFFECTS[pulseEffectIndex];
    if (pulseLoopRef.current) pulseLoopRef.current.stop();
    heartbeatAnim.setValue(0);
    
    pulseLoopRef.current = Animated.loop(Animated.timing(heartbeatAnim, { toValue: 1, duration: currentEffect.duration, easing: Easing.linear, useNativeDriver: true }));
    pulseLoopRef.current.start();

    return () => { if (pulseLoopRef.current) pulseLoopRef.current.stop(); };
  }, [pulseEffectIndex]);

  useEffect(() => {
    if (isTickerMoving && tickerWidth > 0) {
      tickerAnim.setValue(0);
      tickerLoopRef.current = Animated.loop(
        Animated.timing(tickerAnim, {
          toValue: -tickerWidth,
          duration: tickerWidth * 30, 
          easing: Easing.linear,
          useNativeDriver: true
        })
      );
      tickerLoopRef.current.start();
    } else {
      if (tickerLoopRef.current) tickerLoopRef.current.stop();
      tickerAnim.setValue(0); 
    }
    return () => { if (tickerLoopRef.current) tickerLoopRef.current.stop(); };
  }, [isTickerMoving, tickerWidth, customCoins.length]);

  const spinRotation = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const pulseW = Math.max(48, titleWidth - 10);
  const heartbeatTranslateX = heartbeatAnim.interpolate({ inputRange: [0, 1], outputRange: [-pulseW, pulseW * 0.2] });

  useEffect(() => {
    if (!nightAuto) return;
    const tick = () => {
      let night = false;
      const rise = weatherData?.sunrise ? new Date(weatherData.sunrise).getTime() : 0;
      const setAt = weatherData?.sunset ? new Date(weatherData.sunset).getTime() : 0;
      const now = Date.now();
      if (rise && setAt) night = now >= setAt || now < rise;
      else {
        const h = new Date().getHours();
        night = h >= 21 || h < 7;
      }
      if (night) {
        if (!nightPickRef.current && appTheme !== 'midnight') {
          dayThemeRef.current = appTheme;
          AsyncStorage.setItem(DAY_THEME_KEY, appTheme).catch(() => {});
          setAppTheme('midnight');
        }
      } else {
        nightPickRef.current = false;
        if (appTheme === 'midnight' && dayThemeRef.current && dayThemeRef.current !== 'midnight') {
          const back = dayThemeRef.current;
          setAppTheme(back as any);
          AsyncStorage.setItem(THEME_KEY, back).catch(() => {});
        }
      }
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [nightAuto, appTheme, weatherData?.sunrise, weatherData?.sunset]);

  useEffect(() => {
    if (!starMode) return;
    const spin = setInterval(() => setStarTick((t) => (t + 1) % STAR_COLORS.length), 120);
    const stop = setTimeout(() => setStarMode(false), 10000);
    return () => { clearInterval(spin); clearTimeout(stop); };
  }, [starMode]);

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    setLoading(true);
    let savedFavorites: Station[] = [];
    let initialGenre = 'rock'; 
    let loadedAutoStart = false;
    let loadedLang = 'russian';
    let loadedCoins: Array<{symbol: string, price: number, change: number}> = [];

    try {
      const jsonValue = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
      if (jsonValue != null) { setFavorites(JSON.parse(jsonValue)); savedFavorites = JSON.parse(jsonValue); }
      
      const savedCoinsJson = await AsyncStorage.getItem(CUSTOM_COINS_KEY);
      if (savedCoinsJson) { 
        loadedCoins = JSON.parse(savedCoinsJson);
        setCustomCoins(loadedCoins); 
      }

      const savedEq = await AsyncStorage.getItem(EQ_LEVELS_KEY);
      if (savedEq) {
        const parsed = JSON.parse(savedEq);
        if (Array.isArray(parsed) && parsed.length === 11) setEqBands(parsed);
      }
      const savedEqOn = await AsyncStorage.getItem(EQ_ENABLED_KEY);
      if (savedEqOn !== null) setEqOn(JSON.parse(savedEqOn));
      const savedEqSkin = await AsyncStorage.getItem(EQ_SKIN_KEY);
      if (savedEqSkin === 'classic' || savedEqSkin === 'winamp') setEqSkin(savedEqSkin);

      const storedEqStyle = await AsyncStorage.getItem(EQ_STYLE_KEY);
      const migratedEq = storedEqStyle === 'ring' ? 'halo' : storedEqStyle === 'lines' ? 'dots' : storedEqStyle;
      if (migratedEq) { setEqStyle(migratedEq as any); }

      const storedTheme = await AsyncStorage.getItem(THEME_KEY);
      if (storedTheme) { setAppTheme(storedTheme as any); dayThemeRef.current = storedTheme; }
      const storedDayTheme = await AsyncStorage.getItem(DAY_THEME_KEY);
      if (storedDayTheme) dayThemeRef.current = storedDayTheme;
      const storedMarioFx = await AsyncStorage.getItem(MARIO_FX_KEY);
      if (storedMarioFx !== null) setMarioFx(JSON.parse(storedMarioFx));
      const storedThemeFx = await AsyncStorage.getItem(THEME_FX_KEY);
      if (storedThemeFx !== null) setThemeFx(JSON.parse(storedThemeFx));
      const storedMatrixFx = await AsyncStorage.getItem(MATRIX_FX_KEY);
      if (storedMatrixFx !== null) setMatrixFx(JSON.parse(storedMatrixFx));
      const storedNightAuto = await AsyncStorage.getItem(NIGHT_AUTO_KEY);
      if (storedNightAuto !== null) setNightAuto(JSON.parse(storedNightAuto));
      const storedWeatherFx = await AsyncStorage.getItem(DRIVE_WEATHER_FX_KEY);
      if (storedWeatherFx !== null) setDriveWeatherFx(JSON.parse(storedWeatherFx));

      const storedGenre = await AsyncStorage.getItem(LAST_GENRE_KEY);
      if (storedGenre) initialGenre = storedGenre;

      const storedLang = await AsyncStorage.getItem(AUDIOBOOK_LANG_KEY);
      if (storedLang) { setAudiobookLang(storedLang); loadedLang = storedLang; }

      const storedAutoStart = await AsyncStorage.getItem(AUTOSTART_KEY);
      if (storedAutoStart) { loadedAutoStart = JSON.parse(storedAutoStart); setIsAutoStart(loadedAutoStart); }

      const storedTickerMode = await AsyncStorage.getItem(TICKER_MODE_KEY);
      if (storedTickerMode !== null) setIsTickerMoving(JSON.parse(storedTickerMode));

      const storedDynamicCover = await AsyncStorage.getItem(DYNAMIC_COVER_KEY);
      if (storedDynamicCover !== null) setIsDynamicCover(JSON.parse(storedDynamicCover));

      const storedSpeed = await AsyncStorage.getItem(SPEEDOMETER_KEY);
      if (storedSpeed !== null) setIsSpeedometerEnabled(JSON.parse(storedSpeed));
      const storedSpeedStyle = await AsyncStorage.getItem(SPEED_STYLE_KEY);
      if (storedSpeedStyle) setSpeedStyle(storedSpeedStyle as any);
      const storedWeatherStyle = await AsyncStorage.getItem(WEATHER_STYLE_KEY);
      if (storedWeatherStyle) setWeatherStyle(storedWeatherStyle as any);
      const storedWeatherMove = await AsyncStorage.getItem(WEATHER_MOVE_KEY);
      if (storedWeatherMove !== null) setWeatherMoveEnabled(JSON.parse(storedWeatherMove));

      const storedDriveBg = await AsyncStorage.getItem(DRIVE_BG_KEY);
      if (storedDriveBg) setDriveBg(storedDriveBg as any);

      const storedVinyl = await AsyncStorage.getItem(DRIVE_VINYL_KEY);
      if (storedVinyl !== null) setVinylStyle(storedVinyl as any);
      
      const storedHistory = await AsyncStorage.getItem(TRACK_HISTORY_KEY);
      if (storedHistory) { setTrackHistory(JSON.parse(storedHistory)); }

      const storedBgPlay = await AsyncStorage.getItem(BG_PLAY_KEY);
      if (storedBgPlay !== null) {
        const bgPlayVal = JSON.parse(storedBgPlay);
        setIsBgPlayEnabled(bgPlayVal); await updatePlayerOptions(bgPlayVal);
      } else {
        setIsBgPlayEnabled(true); await updatePlayerOptions(true);
      }

      const storedLastStation = await AsyncStorage.getItem(LAST_STATION_KEY);
      if (storedLastStation) {
        const lastSt = JSON.parse(storedLastStation);
        setLastPlayedStation(lastSt);
        if (loadedAutoStart) { setCurrentStation(lastSt); setIsPlaying(true); await playRadioStation(lastSt); }
      }
      const storedWakeStation = await AsyncStorage.getItem(WAKE_STATION_KEY);
      if (storedWakeStation) setWakeStation(JSON.parse(storedWakeStation));
      const storedWakeList = await AsyncStorage.getItem(WAKE_LIST_KEY);
      if (storedWakeList) setWakeChoices(JSON.parse(storedWakeList));
    } catch (e) {}

    handleRefreshMainCoins('1D', loadedCoins);

    setSelectedGenre(initialGenre);
    if (initialGenre === 'favorites') setStations(savedFavorites);
    else if (initialGenre === 'podcasts') setStations(PODCAST_STATIONS);
    else if (initialGenre === 'audiobooks') {
      const data = await fetchAudiobooksByLang(loadedLang);
      if (loadedLang === 'russian') setStations([...CURATED_AUDIOBOOKS, ...data]); else setStations(data);
    }
    else { const genreStations = await fetchRadioStations(initialGenre); setStations(genreStations); }
    
    setLoading(false);
  };

  const handleRefreshMainCoins = async (timeframe: string = activeTimeframe, currentList = customCoins) => {
    Haptics.selectionAsync();
    setActiveTimeframe(timeframe);
    
    const prices = await fetchCryptoPrices(timeframe);
    setCryptoData(prices);
    
    const updatedCustom = await Promise.all(
      currentList.map(async (c) => {
        const freshData = await fetchCustomCoinData(c.symbol, timeframe);
        return { ...c, price: freshData.price, change: freshData.change };
      })
    );
    setCustomCoins(updatedCustom);
  };

  const addCustomCoin = async (query: string) => {
    if (!query.trim()) return;
    if (customCoins.length >= 8) { Alert.alert('Limit Reached', 'You can track up to 8 coins max.'); return; }
    
    const formattedQuery = query.trim().toUpperCase();
    if (customCoins.some(c => c.symbol === formattedQuery)) { Alert.alert('Already added', `${formattedQuery} is already in list.`); return; }

    setIsSearchingCoin(true);
    let newCoinObj = null;

    try {
      try {
        const binanceRes = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${formattedQuery}USDT`);
        if (binanceRes.ok) {
          const data = await binanceRes.json();
          newCoinObj = { symbol: formattedQuery, price: parseFloat(data.lastPrice), change: parseFloat(data.priceChangePercent) };
        }
      } catch (err) {}

      if (!newCoinObj) {
        const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${formattedQuery}`);
        const dexData = await dexRes.json();
        if (dexData.pairs && dexData.pairs.length > 0) {
          const sortedPairs = dexData.pairs.sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
          const bestPair = sortedPairs[0];
          newCoinObj = { symbol: formattedQuery, price: parseFloat(bestPair.priceUsd || '0'), change: bestPair.priceChange?.h24 || 0 };
        }
      }

      if (newCoinObj) {
        const updatedCoins = [...customCoins, newCoinObj];
        setCustomCoins(updatedCoins);
        await AsyncStorage.setItem(CUSTOM_COINS_KEY, JSON.stringify(updatedCoins));
        setCoinSearchQuery('');
      } else { Alert.alert('Not Found', `Coin ${formattedQuery} not found!`); }
    } catch (error) {} finally { setIsSearchingCoin(false); }
  };

  const removeCustomCoin = async (symbol: string) => {
    const updated = customCoins.filter(c => c.symbol !== symbol);
    setCustomCoins(updated); await AsyncStorage.setItem(CUSTOM_COINS_KEY, JSON.stringify(updated));
  };

  const handleGenreSelect = async (genreId: string) => {
    Haptics.selectionAsync(); setSelectedGenre(genreId); setSelectedCountry(null); setSearchQuery(''); setLoading(true);
    try { await AsyncStorage.setItem(LAST_GENRE_KEY, genreId); } catch (e) {}
    
    if (genreId === 'favorites') setStations(favorites);
    else if (genreId === 'podcasts') setStations(PODCAST_STATIONS);
    else if (genreId === 'audiobooks') {
      const data = await fetchAudiobooksByLang(audiobookLang);
      if (audiobookLang === 'russian') setStations([...CURATED_AUDIOBOOKS, ...data]); else setStations(data);
    }
    else { const data = await fetchRadioStations(genreId); setStations(data); }
    setLoading(false);
  };

  const handleLanguageSelect = async (langQuery: string) => {
    setLangModalVisible(false); if (audiobookLang === langQuery) return;
    setAudiobookLang(langQuery); try { await AsyncStorage.setItem(AUDIOBOOK_LANG_KEY, langQuery); } catch (e) {}
    setLoading(true);
    const data = await fetchAudiobooksByLang(langQuery);
    if (langQuery === 'russian') setStations([...CURATED_AUDIOBOOKS, ...data]); else setStations(data);
    setLoading(false);
  };

  const handleCountrySelect = async (countryCode: string) => {
    setCountryModalVisible(false);
    const code = countryCode.toUpperCase(); setSearchQuery('');
    if (selectedCountry?.toUpperCase() === code) { setSelectedCountry(null); handleGenreSelect(selectedGenre); return; }
    setSelectedCountry(code); setLoading(true);
    const data = await fetchStationsByCountry(code); setStations(data); setLoading(false);
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) { if (selectedCountry) handleCountrySelect(selectedCountry); else handleGenreSelect(selectedGenre); }
  };

  const executeGlobalSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setSelectedGenre(''); 
    setSelectedCountry(null);
    
    try {
      const results = await searchGlobalStations(searchQuery);
      setStations(results); 
    } catch (e) {
      Alert.alert('Search Error', 'Could not fetch stations.');
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (station: Station) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    let updatedFavs: Station[] = [];
    const exists = favorites.some((fav) => fav.id === station.id);
    if (exists) updatedFavs = favorites.filter((fav) => fav.id !== station.id); else updatedFavs = [...favorites, station];
    setFavorites(updatedFavs);
    try { await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updatedFavs)); } catch (e) {}
    if (selectedGenre === 'favorites' && !selectedCountry) setStations(updatedFavs);
  };

  let primaryNeon = '#00F0FF';
  let secondaryNeon = '#A855F7';
  let bgTheme = '#0A0A0C';
  let isCyber = false;

  if (appTheme === 'cyberpunk') {
    primaryNeon = '#FCEE0A';
    secondaryNeon = '#FF003C';
    bgTheme = '#050205';
    isCyber = true;
  } else if (appTheme === 'winamp') {
    primaryNeon = '#00FF00'; 
    secondaryNeon = '#FFA500'; 
    bgTheme = '#181818'; 
  } else if (appTheme === 'aimp') {
    primaryNeon = '#FF6600'; 
    secondaryNeon = '#FF9900';
    bgTheme = '#121212';
  } else if (appTheme === 'matrix') {
    primaryNeon = '#00FF41'; 
    secondaryNeon = '#008F11';
    bgTheme = '#0D0208';
  } else if (appTheme === 'synthwave') {
    primaryNeon = '#FF00FF'; 
    secondaryNeon = '#00FFFF';
    bgTheme = '#1A0033';
  } else if (appTheme === 'dracula') {
    primaryNeon = '#FF79C6'; 
    secondaryNeon = '#8BE9FD';
    bgTheme = '#282A36';
  } else if (appTheme === 'blood') {
    primaryNeon = '#FF2A2A';
    secondaryNeon = '#7A0000';
    bgTheme = '#140000';
  } else if (appTheme === 'midnight') {
    primaryNeon = '#7AA2FF';
    secondaryNeon = '#C4B5FD';
    bgTheme = '#070B16';
  } else if (appTheme === 'amber') {
    primaryNeon = '#FFB000';
    secondaryNeon = '#FF6A00';
    bgTheme = '#140E00';
  } else if (appTheme === 'ocean') {
    primaryNeon = '#00E5FF';
    secondaryNeon = '#0066FF';
    bgTheme = '#001018';
  } else if (appTheme === 'minecraft') {
    primaryNeon = '#73C24A';
    secondaryNeon = '#C4A574';
    bgTheme = '#12160E';
  } else if (appTheme === 'seeker') {
    primaryNeon = '#14F195';
    secondaryNeon = '#9945FF';
    bgTheme = '#07070C';
  } else if (appTheme === 'mario') {
    primaryNeon = '#E52521';
    secondaryNeon = '#FBD000';
    bgTheme = '#5C94FC';
  }
  const isMario = appTheme === 'mario';

  const renderChangeText = (change: number) => {
    const isPositive = change >= 0;
    return <Text style={[styles.cryptoChange, isPositive ? styles.positive : styles.negative]}>{isPositive ? '+' : ''}{change.toFixed(1)}%</Text>;
  };

  const activePulse = PULSE_EFFECTS[pulseEffectIndex];
  const pulseColor1 = activePulse.colors ? activePulse.colors[0] : primaryNeon;
  const pulseColor2 = activePulse.colors ? activePulse.colors[1] : secondaryNeon;
  
  let defaultLogo = require('../assets/images/icon.png');
  if (appTheme === 'cyberpunk') defaultLogo = require('../assets/images/2561.jpg');
  else if (appTheme === 'winamp') defaultLogo = require('../assets/images/winamp.png');
  else if (appTheme === 'aimp') defaultLogo = require('../assets/images/aimp.png');
  else if (appTheme === 'mario') defaultLogo = require('../assets/images/mario.png');
  else if (appTheme === 'matrix') defaultLogo = require('../assets/images/matrix.png');
  else if (appTheme === 'amber') defaultLogo = require('../assets/images/amber.png');
  else if (appTheme === 'dracula') defaultLogo = require('../assets/images/dracula.png');
  else if (appTheme === 'blood') defaultLogo = require('../assets/images/blood.png');
  else if (appTheme === 'synthwave') defaultLogo = require('../assets/images/miami.png');
  else if (appTheme === 'minecraft') defaultLogo = require('../assets/images/minecraft.png');
  else if (appTheme === 'ocean') defaultLogo = require('../assets/images/ocean.png');
  else if (appTheme === 'midnight') defaultLogo = require('../assets/images/midnight.png');
  else if (appTheme === 'seeker') defaultLogo = require('../assets/images/seeker.png');
  const marioLevel = require('../assets/images/mario-bg.png');

  const activeCryptoItems = useMemo(() => {
    const items = [];
    if (cryptoData?.sol) items.push({ symbol: 'SOL', price: cryptoData.sol.price, change: cryptoData.sol.change || 0 });
    if (cryptoData?.skr) items.push({ symbol: 'SKR', price: cryptoData.skr.price, change: cryptoData.skr.change || 0 });
    customCoins.forEach(c => items.push({ symbol: c.symbol, price: c.price, change: c.change || 0 }));
    return items;
  }, [cryptoData, customCoins]);

  const trackTitle = liveMetadata?.title || activeTrack?.title;
  const starColor = (i: number) => STAR_COLORS[(i + starTick) % STAR_COLORS.length];
  const weatherMood = (() => {
    if (!driveWeatherFx || !weatherData) return 'clear';
    const code = Number(weatherData.code);
    if ([51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code)) return 'rain';
    if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
    if ((weatherData.windSpeed || 0) >= 28) return 'wind';
    return 'clear';
  })();

  const askQuestionBlock = () => {
    const pool = displayedStations.filter((st) => st.id !== currentStation?.id);
    if (!pool.length) return;
    const next = pool[Math.floor(Math.random() * pool.length)];
    setMarioPop(true);
    coinY.setValue(-140);
    Animated.timing(coinY, { toValue: 40, duration: 650, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start();
    setTimeout(() => setMarioPop(false), 720);
    handleTogglePlay(next);
  };

  const onDrivePlay = () => {
    if (!isMario) { if (currentStation) handleTogglePlay(currentStation); return; }
    const now = Date.now();
    const gap = now - lastMushroomTap.current;
    lastMushroomTap.current = now;
    if (gap > 0 && gap < 500) {
      lastMushroomTap.current = 0;
      setStarMode(false);
      setTimeout(() => setStarMode(true), 30);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      return;
    }
    if (currentStation) handleTogglePlay(currentStation);
  };

  const stepTheme = (dir: number) => {
    const i = Math.max(0, THEME_CYCLE.indexOf(appTheme as any));
    handleThemeChange(THEME_CYCLE[(i + dir + THEME_CYCLE.length) % THEME_CYCLE.length]);
  };

  return (
    <GestureHandlerRootView style={{flex: 1, backgroundColor: bgTheme}}>
      {themeFx && <ThemeFx theme={appTheme} burst={themeBurst} isPlaying={isPlaying} raining={weatherMood === 'rain'} drive={isDriveMode} accent={primaryNeon} />}
      {marioPop && (
        <View pointerEvents="none" style={{ position: 'absolute', left: windowWidth / 2 - 18, bottom: 130, zIndex: 80, alignItems: 'center' }}>
          <Animated.View style={{ transform: [{ translateY: coinY }] }}>
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#FBD000', borderWidth: 3, borderColor: '#C48A00' }} />
          </Animated.View>
          <View style={{ width: 34, height: 42, backgroundColor: '#2E9B32', borderTopLeftRadius: 6, borderTopRightRadius: 6, borderWidth: 3, borderColor: '#16661A', marginTop: 2 }} />
        </View>
      )}
      
      {isDynamicCover && !isMario && currentStation && currentStation.favicon && currentStation.favicon.startsWith('http') && (
        <Image source={{ uri: currentStation.favicon }} style={[StyleSheet.absoluteFillObject, { opacity: isCyber ? 0.15 : 0.35 }]} blurRadius={90} />
      )}
      {isMario && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 0, pointerEvents: 'none' }]}>
          <Image source={marioLevel} resizeMode="cover" style={StyleSheet.absoluteFill} />
        </View>
      )}
      
      <SafeAreaView style={styles.container}>
        
        <View style={[styles.header, isCyber && { borderBottomColor: '#250010' }]}>
          <View style={styles.headerTopRow}>
            <View style={styles.leftHeaderSection}>
              <TouchableOpacity activeOpacity={0.9} onPress={handleLogoTap} style={styles.logoContainer}>
                <Image source={defaultLogo} style={styles.logoIcon} />
                <View style={styles.titleWrapper}>
                  <View style={[styles.pulseContainer, { width: pulseW, overflow: 'hidden' }]}>
                    <MaskedView style={{ flex: 1, width: pulseW }} maskElement={
                        <View style={[styles.pulseMask, { width: pulseW, overflow: 'hidden' }]}>
                          {activePulse.kind === 'dots' && Array.from({ length: 9 }).map((_, i) => (
                            <View key={i} style={{ flex: 1, height: i % 3 === 0 ? 7 : 4, borderRadius: 4, backgroundColor: '#FFF', marginHorizontal: 2 }} />
                          ))}
                          {activePulse.kind === 'ecg' && (
                            <>
                              <View style={{ flex: 1, height: 2, backgroundColor: '#FFF' }} />
                              <View style={{ width: 2, height: 8, backgroundColor: '#FFF' }} />
                              <View style={{ width: 6, height: 2, backgroundColor: '#FFF' }} />
                              <View style={{ width: 2, height: 18, backgroundColor: '#FFF' }} />
                              <View style={{ width: 2, height: 9, backgroundColor: '#FFF', marginLeft: 3 }} />
                              <View style={{ flex: 1, height: 2, backgroundColor: '#FFF', marginLeft: 2 }} />
                            </>
                          )}
                          {activePulse.kind === 'bars' && [6, 12, 18, 9, 22, 13, 8, 16, 10].map((h, i) => (
                            <View key={i} style={{ width: 3, height: h, borderRadius: 1, backgroundColor: '#FFF', marginHorizontal: 1 }} />
                          ))}
                          {activePulse.kind === 'comet' && (
                            <>
                              <View style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: '#FFF' }} />
                              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFF' }} />
                            </>
                          )}
                          {activePulse.kind === 'icon' && (
                            <>
                              <View style={[styles.pulseLine, { flex: 1, width: undefined }]} />
                              <Ionicons name={activePulse.icon as any} size={26} color="#FFF" style={styles.pulseIcon} />
                              <View style={[styles.pulseLine, { flex: 1, width: undefined }]} />
                            </>
                          )}
                        </View>
                      }>
                      <Animated.View style={[styles.pulseGradientWrapper, { transform: [{ translateX: heartbeatTranslateX }] }]}>
                        <LinearGradient colors={['rgba(255,255,255,0)', pulseColor1, '#FFFFFF', pulseColor2, 'rgba(255,255,255,0)']} locations={[0, 0.4, 0.5, 0.6, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
                      </Animated.View>
                    </MaskedView>
                  </View>
                  <MaskedView onLayout={(e) => { const w = Math.floor(e.nativeEvent.layout.width); if (w > 40 && Math.abs(w - titleWidth) > 1) setTitleWidth(w); }} maskElement={<Text style={styles.headerTitle}>SEEKER BEAT</Text>}>
                    <LinearGradient colors={[primaryNeon, secondaryNeon, '#D946EF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                      <Text style={[styles.headerTitle, { opacity: 0 }]}>SEEKER BEAT</Text>
                    </LinearGradient>
                  </MaskedView>
                  <Text style={[styles.headerSubtitle, {color: primaryNeon}]}>{appTheme.toUpperCase()} EDITION</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={[styles.rightHeaderSection, isMario && { justifyContent: 'flex-start' }]}>
               {isMario ? (
                 <View style={{ transform: [{ translateY: -8 }] }}>
                   <CubeEqualizer barValues={barValues} primaryNeon="#E52521" secondaryNeon="#FBD000" height={56} />
                 </View>
               ) : brickFlash ? (
                 <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 52, gap: 2 }}>
                   {Array.from({ length: 15 }).map((_, i) => (
                     <View key={`brick-${i}`} style={{ width: 9, height: 12 + (i % 4) * 8, backgroundColor: i % 3 === 0 ? '#FBD000' : '#C84C0C', borderWidth: 1, borderColor: '#6B2A00' }} />
                   ))}
                 </View>
               ) : (
                 <View style={(eqStyle === 'cubes' || eqStyle === 'minecraft' || eqStyle === 'wave') ? { transform: [{ translateY: -8 }] } : eqStyle === 'dots' ? { transform: [{ translateX: -14 }, { translateY: -8 }] } : { transform: [{ translateX: -2 }] }}>
                   <HeaderViz styleName={eqStyle} barValues={barValues} primaryNeon={primaryNeon} secondaryNeon={secondaryNeon} />
                 </View>
               )}
            </View>
          </View>

          <View style={styles.tickerWrapper}>
            {isTickerMoving ? (
              <Animated.View style={[styles.cryptoContainer, { transform: [{ translateX: tickerAnim }] }]}>
                {Array.from({ length: 4 }).map((_, idx) => (
                  <View 
                    key={idx} 
                    style={{ flexDirection: 'row', gap: 10, marginRight: 10 }}
                    onLayout={(e) => {
                      if (idx === 0) setTickerWidth(e.nativeEvent.layout.width);
                    }}
                  >
                    <TouchableOpacity style={[styles.cryptoBadge, {borderColor: primaryNeon}, themeFx && appTheme === 'seeker' && (cryptoData.sol.change || 0) > 0 && { backgroundColor: 'rgba(20,241,149,0.28)' }]} onPress={() => handleRefreshMainCoins(activeTimeframe)} activeOpacity={0.5}>
                      <Text style={[styles.cryptoSymbol, {color: primaryNeon}]}>SOL</Text>
                      <Text style={styles.cryptoPrice}>${cryptoData.sol.price ? cryptoData.sol.price.toFixed(2) : '---'}</Text>
                      {renderChangeText(cryptoData.sol.change)}
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.cryptoBadge, {borderColor: secondaryNeon}]} onPress={() => handleRefreshMainCoins(activeTimeframe)} activeOpacity={0.5}>
                      <Text style={[styles.cryptoSymbol, {color: secondaryNeon}]}>SKR</Text>
                      <Text style={styles.cryptoPrice}>${cryptoData.skr.price ? cryptoData.skr.price.toFixed(3) : '---'}</Text>
                      {renderChangeText(cryptoData.skr.change)}
                    </TouchableOpacity>
                    {customCoins.map((c) => (
                      <TouchableOpacity key={c.symbol} style={[styles.cryptoBadge, styles.customCoinBadge]} onPress={() => setCoinModalVisible(true)} activeOpacity={0.7}>
                        <Text style={styles.cryptoSymbolCustom}>{c.symbol}</Text>
                        <Text style={styles.cryptoPrice}>${c.price ? c.price.toFixed(c.price < 0.01 ? 4 : 2) : '---'}</Text>
                        {renderChangeText(c.change)}
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity style={[styles.cryptoBadge, {borderStyle: 'dotted', borderColor: '#4A4A62'}]} onPress={() => setCoinModalVisible(true)}>
                       <Ionicons name="add" size={14} color="#8A8A9E" />
                    </TouchableOpacity>
                  </View>
                ))}
              </Animated.View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity style={[styles.cryptoBadge, {borderColor: primaryNeon}]} onPress={() => handleRefreshMainCoins(activeTimeframe)} activeOpacity={0.5}>
                    <Text style={[styles.cryptoSymbol, {color: primaryNeon}]}>SOL</Text>
                    <Text style={styles.cryptoPrice}>${cryptoData.sol.price ? cryptoData.sol.price.toFixed(2) : '---'}</Text>
                    {renderChangeText(cryptoData.sol.change)}
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.cryptoBadge, {borderColor: secondaryNeon}]} onPress={() => handleRefreshMainCoins(activeTimeframe)} activeOpacity={0.5}>
                    <Text style={[styles.cryptoSymbol, {color: secondaryNeon}]}>SKR</Text>
                    <Text style={styles.cryptoPrice}>${cryptoData.skr.price ? cryptoData.skr.price.toFixed(3) : '---'}</Text>
                    {renderChangeText(cryptoData.skr.change)}
                  </TouchableOpacity>
                  {customCoins.map((c) => (
                    <TouchableOpacity key={c.symbol} style={[styles.cryptoBadge, styles.customCoinBadge]} onPress={() => setCoinModalVisible(true)} activeOpacity={0.7}>
                      <Text style={styles.cryptoSymbolCustom}>{c.symbol}</Text>
                      <Text style={styles.cryptoPrice}>${c.price ? c.price.toFixed(c.price < 0.01 ? 4 : 2) : '---'}</Text>
                      {renderChangeText(c.change)}
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={[styles.cryptoBadge, {borderStyle: 'dotted', borderColor: '#4A4A62'}]} onPress={() => setCoinModalVisible(true)}>
                      <Ionicons name="add" size={14} color="#8A8A9E" />
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>

        <View style={styles.searchWrapper}>
          <View style={[styles.searchContainer, isMario && { backgroundColor: 'rgba(200,76,12,0.92)', borderColor: '#6B2A00', borderRadius: 4 }]}>
            <TouchableOpacity onPress={executeGlobalSearch}>
              <Ionicons name="search" size={18} color={searchQuery.length > 0 ? primaryNeon : "#8A8A9E"} style={styles.searchIcon} />
            </TouchableOpacity>
            
            <TextInput 
              style={styles.searchInput} 
              placeholder="Search global database (Press Enter)..." 
              placeholderTextColor="#4A4A62" 
              value={searchQuery} 
              onChangeText={handleSearchChange} 
              onSubmitEditing={executeGlobalSearch}
              returnKeyType="search"
              autoCorrect={false} 
            />
            
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearchChange('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={18} color="#8A8A9E" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.genresWrapper}>
          <FlatList horizontal showsHorizontalScrollIndicator={false} data={ALL_GENRES} keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const active = selectedGenre === item.id && !selectedCountry && !searchQuery;
              const isFavCategory = item.id === 'favorites';
              const isPodcastCategory = item.id.includes('podcasts');
              const isDjCategory = item.id === 'dj'; 
              const isAudiobook = item.id === 'audiobooks';

              return (
                <TouchableOpacity style={[
                  styles.genreChip, 
                  active && [styles.activeGenreChip, isCyber && {backgroundColor: secondaryNeon, borderColor: primaryNeon}], 
                  isFavCategory && styles.favGenreChip, 
                  isPodcastCategory && { borderColor: `${primaryNeon}33` },
                  isDjCategory && { borderColor: '#F59E0B33' },
                  isAudiobook && { borderColor: '#A855F733' }
                ]} onPress={() => handleGenreSelect(item.id)}>
                  {isFavCategory && <Ionicons name="star" size={12} color={active ? '#FFD700' : '#8A8A9E'} style={{ marginRight: 4 }} />}
                  {isPodcastCategory && <Ionicons name="mic" size={12} color={active ? primaryNeon : '#8A8A9E'} style={{ marginRight: 4 }} />}
                  {isDjCategory && <Ionicons name="headset" size={12} color={active ? '#F59E0B' : '#8A8A9E'} style={{ marginRight: 4 }} />}
                  {isAudiobook && <Ionicons name="book" size={12} color={active ? '#A855F7' : '#8A8A9E'} style={{ marginRight: 4 }} />}
                  <Text style={[styles.genreText, active && styles.activeGenreText]}>{item.name}</Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        <View style={styles.countriesWrapper}>
          {selectedGenre === 'audiobooks' ? (
            <TouchableOpacity style={[styles.countryTriggerBtn, styles.countryTriggerBtnActive, {borderColor: '#A855F7', backgroundColor: 'rgba(168, 85, 247, 0.1)'}]} onPress={() => { Haptics.selectionAsync(); setLangModalVisible(true); }} activeOpacity={0.7}>
              <Ionicons name="language" size={16} color="#A855F7" style={{ marginRight: 8 }} />
              <Text style={[styles.countryTriggerText, {color: '#A855F7'}]}>Language: {AUDIOBOOK_LANGUAGES.find(l => l.query === audiobookLang)?.name || 'Select'}</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={[styles.countryTriggerBtn, selectedCountry && [styles.countryTriggerBtnActive, isCyber && {borderColor: primaryNeon, backgroundColor: `${primaryNeon}11`}]]} onPress={() => { Haptics.selectionAsync(); setCountryModalVisible(true); }} activeOpacity={0.7}>
                <Ionicons name="earth" size={16} color={selectedCountry ? primaryNeon : '#8A8A9E'} style={{ marginRight: 8 }} />
                <Text style={[styles.countryTriggerText, selectedCountry && [styles.countryTriggerTextActive, {color: primaryNeon}]]}>{selectedCountry ? `Country: ${COUNTRIES.find(c => c.code.toUpperCase() === selectedCountry)?.name || selectedCountry}` : 'Browse by Country'}</Text>
              </TouchableOpacity>
              {selectedCountry && (
                <TouchableOpacity onPress={() => { setSelectedCountry(null); handleGenreSelect(selectedGenre); }} style={styles.clearCountryBtn}>
                  <Ionicons name="close-circle" size={22} color={secondaryNeon} />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {loading ? (
          <View style={styles.loaderCenter}><ActivityIndicator size="large" color={primaryNeon} /></View>
        ) : displayedStations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name={searchQuery ? 'search-outline' : 'star-outline'} size={64} color="#2A2A3C" />
            <Text style={styles.emptyText}>{searchQuery ? 'NO STATIONS FOUND' : 'NO STATIONS AVAILABLE'}</Text>
          </View>
        ) : (
          <FlatList data={displayedStations} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isThisPlaying = currentStation?.id === item.id && isPlaying;
              const isFav = favorites.some((fav) => fav.id === item.id);
              return (
                <TouchableOpacity style={[styles.stationCard, isMario && { backgroundColor: '#C84C0C', borderColor: '#6B2A00', borderRadius: 4, borderBottomWidth: 4 }, isThisPlaying && [styles.activeCard, isMario && { borderColor: '#FBD000', backgroundColor: '#E07030' }, isCyber && {borderColor: secondaryNeon}]]} onPress={() => handleTogglePlay(item)}>
                  <Image source={item.favicon && item.favicon.startsWith('http') ? { uri: item.favicon } : defaultLogo} style={[styles.stationImage, isMario && { borderRadius: 4, borderWidth: 2, borderColor: '#6B2A00' }]} />
                  <View style={styles.stationInfo}>
                    <Text style={[styles.stationName, isMario && { color: '#FFF8E7' }]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.stationTag, {color: isMario ? '#FBD000' : primaryNeon}]} numberOfLines={1}>{item.tags ? item.tags.split(',').slice(0, 2).join(' • ').toUpperCase() : 'MUSIC'}</Text>
                  </View>
                  <TouchableOpacity style={styles.favButton} onPress={() => toggleFavorite(item)}>
                    <Ionicons name={isFav ? 'star' : 'star-outline'} size={24} color={isFav ? '#FFD700' : (isMario ? '#F6D7A7' : '#4A4A62')} />
                  </TouchableOpacity>
                  {isMario ? (
                    <View style={{ width: 36, alignItems: 'center' }}>
                      <View style={{ width: 30, height: 16, backgroundColor: isThisPlaying ? '#43B047' : '#E52521', borderTopLeftRadius: 14, borderTopRightRadius: 14 }}>
                        <View style={{ position: 'absolute', left: 6, top: 4, width: 5, height: 5, borderRadius: 3, backgroundColor: '#FFF' }} />
                        <View style={{ position: 'absolute', right: 5, top: 5, width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFF' }} />
                      </View>
                      <View style={{ width: 12, height: 10, backgroundColor: '#F6D7A7', borderBottomLeftRadius: 3, borderBottomRightRadius: 3 }} />
                    </View>
                  ) : (
                    <Ionicons name={isThisPlaying ? 'pause-circle' : 'play-circle'} size={38} color={isThisPlaying ? primaryNeon : '#7000FF'} />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        )}

        {playbackError && ( <View style={styles.errorToast}><Text style={styles.errorToastText}>{playbackError}</Text></View> )}

        {currentStation && (
          <View style={[styles.bottomPlayerContainer, isCyber && {borderColor: secondaryNeon}, isMario && { backgroundColor: '#2E9B32', borderColor: '#16661A', borderRadius: 22, borderWidth: 3, height: 84 }]}>
            {!isMario && <Image source={isDynamicCover && currentStation.favicon && currentStation.favicon.startsWith('http') ? { uri: currentStation.favicon } : defaultLogo} style={StyleSheet.absoluteFillObject} blurRadius={10} />}
            <View style={[styles.bottomPlayerOverlay, isMario && { backgroundColor: 'rgba(22,102,26,0.35)' }]}>
              <Image source={isDynamicCover && currentStation.favicon && currentStation.favicon.startsWith('http') ? { uri: currentStation.favicon } : defaultLogo} style={styles.bottomCoverThumb} />
              <View style={styles.bottomInfoSection}>
                {themeFx && appTheme === 'winamp' ? (
                  <WinampBounce active>
                    <MatrixLine lines={2} active={false} text={liveMetadata?.title || activeTrack?.title || currentStation.name} style={styles.bottomStationTitle} />
                  </WinampBounce>
                ) : themeFx && appTheme === 'aimp' ? (
                  <MatrixLine lines={2} active={false} text={liveMetadata?.title || activeTrack?.title || currentStation.name} style={styles.bottomStationTitle} />
                ) : (
                  <MatrixLine lines={2} active={appTheme === 'matrix' && matrixFx} text={liveMetadata?.title || activeTrack?.title || currentStation.name} style={styles.bottomStationTitle} />
                )}
                <Text style={[styles.bottomStationStatus, {color: primaryNeon}]}>{isPlaying ? '● LIVE' : 'PAUSED'}</Text>
                {themeFx && appTheme === 'aimp' && <AimpNeedle />}
              </View>

              {isCyber ? (
                 <Animated.View style={[styles.spinWrapper, { transform: [{ rotateX: spinRotation as any }, { rotateZ: spinRotation as any }] }]}>
                   <Ionicons name="hardware-chip" size={34} color={secondaryNeon} />
                 </Animated.View>
              ) : isMario ? (
                 <Animated.View style={[styles.spinWrapper, { transform: [{ rotate: spinRotation as any }] }]}>
                   <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FBD000', borderWidth: 3, borderColor: '#C48A00', alignItems: 'center', justifyContent: 'center' }}>
                     <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#C48A00' }} />
                   </View>
                 </Animated.View>
              ) : (
                 <Animated.View style={[styles.spinWrapper, { transform: [{ rotate: spinRotation as any }] }]}>
                   <Ionicons name="disc" size={38} color="#161626" />
                   <Ionicons name="radio-button-on" size={14} color={primaryNeon} style={styles.vinylCenter} />
                   <View style={[styles.vinylGlare, {backgroundColor: primaryNeon}]} />
                 </Animated.View>
              )}

              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                 <TouchableOpacity style={[styles.bottomPlayButton, {marginRight: 8, borderColor: 'transparent', backgroundColor: 'transparent'}]} onPress={() => { Haptics.selectionAsync(); setTrackInfoVisible(true); }}>
                   <Ionicons name="information-circle-outline" size={26} color={primaryNeon} />
                 </TouchableOpacity>
                 <TouchableOpacity style={[styles.bottomPlayButton, isCyber && {borderColor: '#000', backgroundColor: primaryNeon, borderWidth: 2}, isMario && { backgroundColor: '#E52521', borderColor: '#FFF' }]} onPress={() => handleTogglePlay(currentStation)}>
                   {isMario ? (
                     <View style={{ alignItems: 'center' }}>
                       <View style={{ width: 22, height: 12, backgroundColor: '#E52521', borderTopLeftRadius: 10, borderTopRightRadius: 10, borderWidth: 1, borderColor: '#FFF' }} />
                       <View style={{ width: 8, height: 8, backgroundColor: '#F6D7A7' }} />
                     </View>
                   ) : (
                     <Ionicons name={isPlaying ? 'pause' : 'play'} size={26} color={primaryNeon} />
                   )}
                 </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <View style={[styles.footerContainer, { paddingBottom: insets.bottom > 0 ? insets.bottom + 10 : 24 }, isCyber && {backgroundColor: '#050205'}, isMario && { backgroundColor: '#C84C0C', borderTopColor: '#6B2A00' }]}>
          <TouchableOpacity style={styles.footerBtnQuarter} onPress={() => { Haptics.selectionAsync(); setAlarmModalVisible(true); }} activeOpacity={0.7}>
            <Ionicons name="timer-outline" size={20} color={alarmTime ? (isMario ? '#FBD000' : primaryNeon) : (isMario ? '#FFF8E7' : '#4A4A62')} />
            <Text style={[styles.footerAboutText, (alarmTime || isMario) ? { color: isMario ? '#FFF8E7' : primaryNeon } : null]} numberOfLines={1}>
              {alarmTime ? (timeLeft || 'Set') : 'Timer'}
            </Text>
          </TouchableOpacity>
          <View style={[styles.footerDivider, isMario && { backgroundColor: '#6B2A00' }]} />
          
          <TouchableOpacity style={styles.footerBtnQuarter} onPress={handleEnterDriveMode} activeOpacity={0.7}>
            <Ionicons name="car-sport" size={24} color={isMario ? '#FFF8E7' : '#4A4A62'} />
            <Text style={[styles.footerAboutText, isMario && { color: '#FFF8E7' }]}>Drive</Text>
          </TouchableOpacity>
          <View style={[styles.footerDivider, isMario && { backgroundColor: '#6B2A00' }]} />
          
          <TouchableOpacity style={styles.footerBtnQuarter} onPress={() => { Haptics.selectionAsync(); setDiscoModalVisible(true); }} activeOpacity={0.7}>
            <Ionicons name="albums-outline" size={20} color={isMario ? '#FFF8E7' : '#4A4A62'} />
            <Text style={[styles.footerAboutText, isMario && { color: '#FFF8E7' }]}>Artists</Text>
          </TouchableOpacity>
          <View style={[styles.footerDivider, isMario && { backgroundColor: '#6B2A00' }]} />

          <TouchableOpacity style={styles.footerBtnQuarter} onPress={() => { Haptics.selectionAsync(); setAboutModalVisible(true); }} activeOpacity={0.7}>
            <Ionicons name="settings-outline" size={20} color={isMario ? '#FFF8E7' : '#4A4A62'} />
            <Text style={[styles.footerAboutText, isMario && { color: '#FFF8E7' }]}>Settings</Text>
          </TouchableOpacity>
        </View>

        <Modal visible={isDriveMode} animationType="fade" transparent={true}>
          <SafeAreaView style={[styles.driveModeContainer, {backgroundColor: isMario ? '#5C94FC' : '#000'}]}>
            
            {!isMario && currentStation && currentStation.favicon && currentStation.favicon.startsWith('http') && (
              <Image source={{ uri: currentStation.favicon }} style={StyleSheet.absoluteFillObject} blurRadius={15} />
            )}
            {!isMario && <LinearGradient colors={['rgba(10,15,25,0.85)', 'rgba(5,5,15,0.95)']} style={StyleSheet.absoluteFillObject} />}

            {!isMario && driveBg === 'aurora' && <AmbientAurora isPlaying={isPlaying} primaryNeon={primaryNeon} secondaryNeon={secondaryNeon} bgTheme={bgTheme} />}
            {!isMario && driveBg === 'dust' && <ChampagneDust isPlaying={isPlaying} primaryNeon={primaryNeon} />}
            {!isMario && driveBg === 'sunset' && <SynthwaveSunset primaryNeon={primaryNeon} secondaryNeon={secondaryNeon} bgTheme={bgTheme} />}
            {!isMario && driveBg === 'pulse' && <PulseWaves isPlaying={isPlaying} primaryNeon={primaryNeon} bgTheme={bgTheme} />}
            {!isMario && driveBg === 'grid' && <SynthwaveGrid isPlaying={isPlaying} primaryNeon={primaryNeon} secondaryNeon={secondaryNeon} bgTheme={bgTheme} />}
            {!isMario && driveBg === 'rain' && <MatrixRainBg isPlaying={isPlaying} primaryNeon={primaryNeon} bgTheme={bgTheme} />}
            {!isMario && driveBg === 'stars' && <StarfieldBg isPlaying={isPlaying} primaryNeon={primaryNeon} secondaryNeon={secondaryNeon} bgTheme={bgTheme} />}
            {!isMario && driveBg === 'miami' && <MiamiStripes isPlaying={isPlaying} primaryNeon={primaryNeon} secondaryNeon={secondaryNeon} bgTheme={bgTheme} />}
            {!isMario && driveBg === 'embers' && <EmberField isPlaying={isPlaying} primaryNeon={primaryNeon} />}
            {isMario && (
              <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
                <Image source={marioLevel} resizeMode="cover" style={StyleSheet.absoluteFill} />
              </View>
            )}
            {weatherMood !== 'clear' && (
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                {weatherMood === 'rain' && <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(20, 70, 140, 0.28)' }]} />}
                {Array.from({ length: 14 }).map((_, i) => (
                  <View key={`wx-${i}`} style={{
                    position: 'absolute',
                    left: (i * 67) % 360,
                    top: 40 + ((i * 53) % 520),
                    width: weatherMood === 'wind' ? 28 : (weatherMood === 'snow' ? 6 : 8),
                    height: weatherMood === 'wind' ? 2 : (weatherMood === 'snow' ? 6 : 8),
                    borderRadius: weatherMood === 'wind' ? 1 : 6,
                    backgroundColor: weatherMood === 'rain' ? 'rgba(180,230,255,0.75)' : 'rgba(255,255,255,0.85)',
                    transform: weatherMood === 'wind' ? [{ rotate: '-18deg' }] : [],
                  }} />
                ))}
              </View>
            )}

            <View style={StyleSheet.absoluteFill} pointerEvents="box-none">

              {isSpeedometerEnabled && (
                <DraggableSpeedWidget currentSpeed={currentSpeed} primaryNeon={primaryNeon} windowWidth={windowWidth} windowHeight={windowHeight} speedStyle={speedStyle} posX={speedX} posY={speedY} posScale={speedScale} />
              )}

              <View style={{position: 'absolute', top: Math.max(10, safeTopMargin - 5), right: Math.max(20, insets.right || 0), zIndex: 200, flexDirection: 'row', alignItems: 'center'}}>
                <TouchableOpacity style={{padding: 10}} onPress={() => { Haptics.selectionAsync(); setIsDriveMode(false); }} activeOpacity={0.5}>
                  <Ionicons name="close-circle" size={42} color="#8A8A9E" />
                </TouchableOpacity>
              </View>

              {isWeatherEnabled && weatherData && (
                <Reanimated.View style={weatherDragStyle}>
                  <WeatherWidgetAdvanced
                    data={weatherData}
                    variant={weatherStyle}
                    accent={primaryNeon}
                    isActive={isPlaying}
                    onExpandedChange={setWeatherExpanded}
                    dragHandlers={weatherMoveEnabled && !weatherExpanded ? weatherDrag.panHandlers : null}
                  />
                </Reanimated.View>
              )}

              <View style={{ position: 'absolute', bottom: 8, width: '100%', alignItems: 'center', zIndex: 50 }} pointerEvents="box-none">

                <View style={(eqStyle === 'cubes' || eqStyle === 'minecraft' || eqStyle === 'wave') ? { marginTop: -8 } : eqStyle === 'dots' ? { marginTop: -8, marginLeft: -14 } : { marginLeft: -2 }}>
                  <DriveFx styleName={eqStyle} barValues={barValues} primaryNeon={starMode ? starColor(0) : primaryNeon} secondaryNeon={starMode ? starColor(3) : secondaryNeon} />
                </View>

                <TouchableOpacity onPress={() => { Haptics.selectionAsync(); setIsDriveStationsOpen(true); }} activeOpacity={0.7} style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: isMario ? '#C84C0C' : 'rgba(20,20,30,0.72)', borderWidth: isMario ? 2 : 0, borderColor: '#6B2A00', paddingHorizontal: 15, paddingVertical: 8, borderRadius: isMario ? 4 : 20, marginBottom: 4, maxWidth: '86%', zIndex: 80}}>
                  <MatrixLine active={appTheme === 'matrix' && matrixFx} text={currentStation ? currentStation.name : 'NO STATION'} style={{color: isMario ? '#FFF8E7' : primaryNeon, fontSize: 14, fontWeight: 'bold', letterSpacing: 1, flexShrink: 1, textAlign: 'center'}} />
                  <Ionicons name="chevron-down" size={16} color={isMario ? '#FBD000' : primaryNeon} style={{marginLeft: 8}} />
                </TouchableOpacity>
                
                {trackTitle ? (
                  <Text numberOfLines={2} ellipsizeMode="tail" style={{color: '#FFF', fontSize: 18, fontWeight: '900', textAlign: 'center', marginTop: 8, marginBottom: 10, maxWidth: '80%', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: {width: 0, height: 2}, textShadowRadius: 10}}>
                    {trackTitle}
                  </Text>
                ) : null}

                <View style={{ justifyContent: 'center', alignItems: 'center', width: 200, height: 200, alignSelf: 'center' }} pointerEvents="box-none">
                  
                  {DRIVE_FX.includes(eqStyle) && eqStyle !== 'vinyl' && (
                    <View pointerEvents="none" style={{ position: 'absolute', zIndex: 1, alignItems: 'center', justifyContent: 'center', transform: [{ translateX: -2 }] }}>
                      {eqStyle === 'ring' && <RingFx barValues={barValues} color={primaryNeon} size={176} />}
                      {eqStyle === 'pulse' && <PulseFx barValues={barValues} color={primaryNeon} size={180} />}
                      {eqStyle === 'road' && <RoadFx barValues={barValues} color={primaryNeon} alt={secondaryNeon} size={240} />}
                      {eqStyle === 'spiral' && <SpiralFx barValues={barValues} color={primaryNeon} size={176} />}
                      {eqStyle === 'sparks' && <SparksFx barValues={barValues} color={primaryNeon} alt={secondaryNeon} size={180} />}
                      {eqStyle === 'radar' && <RadarFx barValues={barValues} color={primaryNeon} size={176} />}
                      {eqStyle === 'synth' && <SynthFx barValues={barValues} size={230} />}
                    </View>
                  )}

                  {eqStyle === 'halo' && [0, 1, 2].map((i) => {
                    const srcBar = barValues[i * 4] || barValues[0];
                    const scale = srcBar.interpolate({ inputRange: [0, SEGMENTS_PER_BAR], outputRange: [0.85 + i * 0.18, 1.15 + i * 0.35], extrapolate: 'clamp' });
                    const opacity = srcBar.interpolate({ inputRange: [0, SEGMENTS_PER_BAR], outputRange: [0.15, 0.85 - i * 0.2], extrapolate: 'clamp' });
                    const size = 110 + i * 28;
                    return (
                      <Animated.View key={`halo-${i}`} pointerEvents="none" style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: i === 1 ? secondaryNeon : primaryNeon, opacity, zIndex: 1, transform: [{ scale }] }} />
                    );
                  })}

                  {eqStyle === 'orb' && (
                    <Animated.View style={{
                       position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: primaryNeon, zIndex: 1,
                       shadowColor: primaryNeon, shadowOpacity: 1, shadowRadius: 30, elevation: 20,
                       transform: [{ scale: barValues[0].interpolate({ inputRange: [0, SEGMENTS_PER_BAR], outputRange: [0.8, 1.3], extrapolate: 'clamp'}) }],
                       opacity: barValues[0].interpolate({ inputRange: [0, SEGMENTS_PER_BAR], outputRange: [0.3, 0.8], extrapolate: 'clamp'})
                    }} pointerEvents="none" />
                  )}

                  {!isMario && vinylStyle !== 'off' && <VinylRecord isPlaying={isPlaying} artwork={currentStation?.favicon && currentStation.favicon.startsWith('http') ? {uri: currentStation.favicon} : defaultLogo} primaryNeon={primaryNeon} vinylStyle={vinylStyle} />}
                  {!isMario && <Animated.View style={{ position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: primaryNeon, opacity: 0.2, transform: [{ scale: drivePlayPulseAnim }], zIndex: 8 }} pointerEvents="none" />}

                  {isMario ? (
                    <TouchableOpacity onPress={onDrivePlay} activeOpacity={0.85} delayPressIn={0} style={{ width: 150, height: 150, alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                      {barValues.slice(0, 6).map((b, i) => {
                        const rise = b.interpolate({ inputRange: [0, SEGMENTS_PER_BAR], outputRange: [8, -18 - (i % 3) * 8], extrapolate: 'clamp' });
                        const opacity = b.interpolate({ inputRange: [0, SEGMENTS_PER_BAR], outputRange: [0.25, 1], extrapolate: 'clamp' });
                        const angle = i * 60;
                        return <Animated.View key={`mfx-${i}`} pointerEvents="none" style={{ position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: starMode ? starColor(i) : (i % 2 ? '#FBD000' : '#FFF'), opacity, transform: [{ rotate: `${angle}deg` }, { translateY: rise }] }} />;
                      })}
                      <View style={{ alignItems: 'center' }}>
                        <View style={{ width: 108, height: 58, backgroundColor: starMode ? starColor(starTick) : '#E52521', borderTopLeftRadius: 54, borderTopRightRadius: 54, borderWidth: 4, borderColor: '#FFF', overflow: 'hidden' }}>
                          <View style={{ position: 'absolute', left: 18, top: 16, width: 16, height: 16, borderRadius: 8, backgroundColor: '#FFF' }} />
                          <View style={{ position: 'absolute', right: 22, top: 20, width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFF' }} />
                          <View style={{ position: 'absolute', left: 46, top: 8, width: 14, height: 14, borderRadius: 7, backgroundColor: '#FFF' }} />
                        </View>
                        <View style={{ width: 40, height: 36, marginTop: -4, backgroundColor: '#F6D7A7', borderBottomLeftRadius: 10, borderBottomRightRadius: 10, borderWidth: 3, borderColor: '#E7C48A' }} />
                        {starMode && <Text style={{ marginTop: 4, color: '#FFF', fontWeight: '900', letterSpacing: 2 }}>STAR</Text>}
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={[styles.driveModePlayBtn, {position: 'absolute', zIndex: 10, borderColor: primaryNeon, backgroundColor: 'rgba(10,10,15,0.9)'}]} onPress={onDrivePlay} activeOpacity={0.7}>
                      <Ionicons name={isPlaying ? 'pause' : 'play'} size={34} color={primaryNeon} style={{marginLeft: isPlaying ? 0 : 4}} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

            </View>

            {isDriveStationsOpen && (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(5,2,5,0.95)', zIndex: 200, padding: 20 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingTop: safeTopMargin }}>
                  <Text style={{ color: primaryNeon, fontSize: 20, fontWeight: 'bold' }}>SELECT STATION</Text>
                  <TouchableOpacity onPress={() => setIsDriveStationsOpen(false)} style={{ padding: 10 }}>
                    <Ionicons name="close" size={32} color="#FFF" />
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={displayedStations}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => {
                    const isThisPlaying = currentStation?.id === item.id && isPlaying;
                    return (
                      <TouchableOpacity style={[styles.stationCard, {backgroundColor: '#12121A'}, isThisPlaying && {borderColor: '#000', backgroundColor: primaryNeon, borderWidth: 2}]} onPress={() => {
                        handleTogglePlay(item);
                        setIsDriveStationsOpen(false);
                      }}>
                        <Image source={item.favicon && item.favicon.startsWith('http') ? { uri: item.favicon } : defaultLogo} style={styles.stationImage} />
                        <View style={styles.stationInfo}>
                          <Text style={styles.stationName} numberOfLines={1}>{item.name}</Text>
                          <Text style={{color: '#8A8A9E', fontSize: 10}} numberOfLines={1}>{item.tags}</Text>
                        </View>
                        {isThisPlaying && <Ionicons name="stats-chart" size={24} color={primaryNeon} />}
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            )}

          </SafeAreaView>
        </Modal>

        <Modal visible={isEqualizerVisible} animationType="fade" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { width: '96%', maxWidth: 560, backgroundColor: eqSkin === 'winamp' ? '#1B1B1B' : '#12121A', borderColor: eqSkin === 'winamp' ? '#3CFF4A' : primaryNeon, borderWidth: 1, paddingHorizontal: 10 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
                {(['classic', 'winamp'] as const).map((skin) => (
                  <TouchableOpacity key={skin} onPress={() => { setEqSkin(skin); AsyncStorage.setItem(EQ_SKIN_KEY, skin); }} style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6, backgroundColor: eqSkin === skin ? (skin === 'winamp' ? '#3CFF4A' : primaryNeon) : '#252538' }}>
                    <Text style={{ color: eqSkin === skin ? '#111' : '#8A8A9E', fontSize: 11, fontWeight: '800' }}>{skin.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {eqSkin === 'classic' ? (
                <>
                  <Text style={[styles.modalTitle, { color: primaryNeon }]}>EQUALIZER</Text>
                  <View style={styles.eqBandsContainer}>
                    {CLASSIC_BANDS.map(({ index, label }) => {
                      const level = eqBands[index] ?? 0;
                      const h = Math.abs(level) * 4 + 8;
                      const isPos = level >= 0;
                      return (
                        <View key={label} style={styles.eqBandCol}>
                          <Text style={styles.eqFreqText}>{label}</Text>
                          <TouchableOpacity onPress={() => updateEqBand(index, level + 1)} style={styles.eqControlBtn}>
                            <Ionicons name="add" size={22} color="#FFF" />
                          </TouchableOpacity>
                          <View style={styles.eqLevelVisualArea}>
                            <View style={[styles.eqLevelFill, isPos ? { height: h, bottom: '50%', backgroundColor: primaryNeon } : { height: h, top: '50%', backgroundColor: secondaryNeon }]} />
                            <View style={styles.eqZeroLine} />
                          </View>
                          <TouchableOpacity onPress={() => updateEqBand(index, level - 1)} style={styles.eqControlBtn}>
                            <Ionicons name="remove" size={22} color="#FFF" />
                          </TouchableOpacity>
                          <Text style={[styles.eqValText, { color: level === 0 ? '#8A8A9E' : '#FFF' }]}>{level > 0 ? `+${level}` : level}</Text>
                        </View>
                      );
                    })}
                  </View>
                </>
              ) : (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ color: '#3CFF4A', fontWeight: '900', letterSpacing: 1, fontSize: 14 }}>WINAMP EQUALIZER</Text>
                    <TouchableOpacity onPress={toggleEqPower} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 3, backgroundColor: eqOn ? '#3CFF4A' : '#333' }}>
                      <Text style={{ color: eqOn ? '#111' : '#888', fontWeight: '900', fontSize: 11 }}>{eqOn ? 'ON' : 'OFF'}</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={{ color: '#6A6A6A', fontSize: 10, marginBottom: 8 }}>{eqPreset} · -12…+12 dB</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 10 }}>
                    {Object.keys(WINAMP_PRESETS).map((name) => (
                      <TouchableOpacity key={name} onPress={() => applyEqPreset(name)} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 3, backgroundColor: eqPreset === name ? '#3CFF4A' : '#2A2A2A' }}>
                        <Text style={{ color: eqPreset === name ? '#111' : '#3CFF4A', fontSize: 10, fontWeight: '700' }}>{name.toUpperCase()}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', opacity: eqOn ? 1 : 0.35 }}>
                    {WINAMP_BANDS.map((label, idx) => {
                      const level = eqBands[idx] ?? 0;
                      const thumbTop = ((12 - level) / 24) * 96;
                      return (
                        <View key={label} style={{ alignItems: 'center', width: 28 }}>
                          <Text style={{ color: level > 0 ? '#3CFF4A' : '#8A8A8A', fontSize: 9, fontWeight: '700', marginBottom: 4 }}>{level > 0 ? `+${level}` : level}</Text>
                          <View
                            style={{ width: 16, height: 110, backgroundColor: '#0C0C0C', borderRadius: 2, borderWidth: 1, borderColor: '#333' }}
                            onStartShouldSetResponder={() => eqOn}
                            onMoveShouldSetResponder={() => eqOn}
                            onResponderGrant={(e) => updateEqBand(idx, 12 - (e.nativeEvent.locationY / 110) * 24)}
                            onResponderMove={(e) => updateEqBand(idx, 12 - (e.nativeEvent.locationY / 110) * 24)}
                          >
                            <View style={{ position: 'absolute', top: 54, left: 0, right: 0, height: 1, backgroundColor: '#3CFF4A' }} />
                            <View style={{ position: 'absolute', top: thumbTop, left: 1, right: 1, height: 12, backgroundColor: '#D0D0D0', borderRadius: 1, borderWidth: 1, borderColor: '#3CFF4A' }} />
                          </View>
                          <Text style={{ color: '#3CFF4A', fontSize: 8, marginTop: 4, fontWeight: '700' }}>{label}</Text>
                        </View>
                      );
                    })}
                  </View>
                </>
              )}

              <TouchableOpacity style={{ width: '100%', marginTop: 14, padding: 10, borderRadius: 4, backgroundColor: '#2A2A2A', alignItems: 'center' }} onPress={() => setEqualizerVisible(false)}>
                <Text style={{ color: eqSkin === 'winamp' ? '#3CFF4A' : '#FFF', fontWeight: '800' }}>CLOSE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={isDiscoModalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { height: '85%', paddingHorizontal: 15, width: '92%' }]}>
              <Text style={[styles.modalTitle, {color: primaryNeon}]}>ARTIST HUB</Text>
              <View style={[styles.searchContainer, { marginBottom: 15, backgroundColor: '#0A0A0C' }]}>
                <Ionicons name="search" size={18} color="#8A8A9E" style={styles.searchIcon} />
                <TextInput style={styles.searchInput} placeholder="Search artist (e.g. The Weeknd)..." placeholderTextColor="#4A4A62" value={discoSearchQuery} onChangeText={setDiscoSearchQuery} onSubmitEditing={() => fetchDiscography(discoSearchQuery)} />
                <TouchableOpacity onPress={() => fetchDiscography(discoSearchQuery)}>
                  {isSearchingDisco ? <ActivityIndicator size="small" color={primaryNeon} /> : <Ionicons name="arrow-forward-circle" size={24} color={primaryNeon} />}
                </TouchableOpacity>
              </View>
              
              <FlatList 
                data={discoResults} 
                keyExtractor={(item) => String(item.trackId)} 
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={() => artistBio ? (
                  <View style={styles.bioCard}>
                    {artistBio.image && <Image source={{uri: artistBio.image}} style={styles.bioImage} />}
                    <View style={{flex: 1}}>
                      <Text style={styles.bioName}>{artistBio.name}</Text>
                      <Text style={styles.bioText} numberOfLines={4}>{artistBio.summary}</Text>
                    </View>
                  </View>
                ) : null}
                renderItem={({ item }) => (
                  <View style={styles.discoCardHub}>
                    <View style={styles.discoTopRow}>
                      <Image source={{ uri: item.artworkUrl100 }} style={styles.discoImage} />
                      <View style={styles.discoInfo}>
                        <Text style={styles.discoTrackName} numberOfLines={1}>{item.trackName}</Text>
                        <Text style={styles.discoArtistName} numberOfLines={1}>{item.artistName} • {item.collectionName}</Text>
                      </View>
                    </View>
                    <View style={styles.discoActionsRow}>
                       <TouchableOpacity style={styles.discoActionBtn} onPress={() => handlePlayPreview(item)}>
                          <Ionicons name="play" size={18} color={primaryNeon} />
                          <Text style={{color: primaryNeon, fontSize: 10, marginTop: 2, fontWeight: 'bold'}}>Play Full</Text>
                       </TouchableOpacity>
                       <TouchableOpacity style={styles.discoActionBtn} onPress={() => openYoutubeInline(item.artistName, item.trackName)}>
                          <Ionicons name="logo-youtube" size={18} color="#FF0000" />
                          <Text style={{color: '#FF0000', fontSize: 10, marginTop: 2, fontWeight: 'bold'}}>YouTube</Text>
                       </TouchableOpacity>
                       <TouchableOpacity style={styles.discoActionBtn} onPress={() => openExternalApp('spotify', item.artistName, item.trackName)}>
                          <FontAwesome name="spotify" size={18} color="#1DB954" />
                          <Text style={{color: '#1DB954', fontSize: 10, marginTop: 2, fontWeight: 'bold'}}>Spotify</Text>
                       </TouchableOpacity>
                    </View>
                  </View>
                )}
                ListEmptyComponent={ !isSearchingDisco && discoResults.length === 0 ? ( <Text style={{color: '#8A8A9E', textAlign: 'center', marginTop: 40}}>Enter an artist name to view bio and top tracks.</Text> ) : null }
              />
              {ytClip && (
                <View style={{ alignSelf: 'center', width: '92%', height: 196, marginTop: 8, borderRadius: 12, overflow: 'hidden', backgroundColor: '#000' }}>
                  <WebView
                    source={{ uri: `https://www.youtube-nocookie.com/embed/${ytClip.id}?autoplay=1&playsinline=1&rel=0&modestbranding=1&fs=0` }}
                    style={{ flex: 1, backgroundColor: '#000' }}
                    userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
                    allowsInlineMediaPlayback
                    mediaPlaybackRequiresUserAction={false}
                    javaScriptEnabled
                    domStorageEnabled
                    setSupportMultipleWindows={false}
                    allowsFullscreenVideo={false}
                    originWhitelist={['*']}
                    injectedJavaScript={`window.open=function(){return null};true;`}
                    onShouldStartLoadWithRequest={(req: { url?: string }): boolean => {
                      const u = (req.url || '').toLowerCase();
                      if (!u || u.startsWith('about:') || u.startsWith('blob:') || u.startsWith('data:')) return true;
                      if (u.startsWith('intent:') || u.startsWith('vnd.') || u.startsWith('youtube:') || u.startsWith('market:') || u.startsWith('https://m.youtube') || u.startsWith('http://m.youtube')) return false;
                      if (u.includes('youtube.com/watch') || u.includes('youtu.be/') || u.includes('/redirect') || u.includes('accounts.google')) return false;
                      return u.startsWith('https://');
                    }}
                  />
                  <TouchableOpacity onPress={() => setYtClip(null)} style={{ position: 'absolute', top: 6, right: 6, zIndex: 5 }}>
                    <Ionicons name="close-circle" size={26} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              )}
              {ytBusy && <ActivityIndicator style={{ marginTop: 8 }} color="#FF0000" />}
              <TouchableOpacity style={[styles.modalBtnCancel, { marginTop: 15 }]} onPress={() => { setYtClip(null); setDiscoModalVisible(false); }}><Text style={styles.modalBtnText}>Close</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={isLangModalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { height: '65%', paddingHorizontal: 15 }]}>
              <Text style={styles.modalTitle}>Select Audiobook Language</Text>
              <FlatList data={AUDIOBOOK_LANGUAGES} keyExtractor={(item) => item.code} numColumns={2} columnWrapperStyle={{ justifyContent: 'space-between' }} showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const active = audiobookLang === item.query;
                  return (
                    <TouchableOpacity style={[styles.modalCountryChip, active && [styles.activeModalCountryChip, {borderColor: primaryNeon, backgroundColor: 'rgba(255,255,255,0.05)'}]]} onPress={() => handleLanguageSelect(item.query)}>
                      <Text style={[styles.modalCountryText, active && [styles.activeModalCountryText, {color: primaryNeon}]]}>{item.name}</Text>
                    </TouchableOpacity>
                  );
                }}
              />
              <TouchableOpacity style={[styles.modalBtnCancel, { marginTop: 15 }]} onPress={() => setLangModalVisible(false)}><Text style={styles.modalBtnText}>Close</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={isCountryModalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { height: '75%', paddingHorizontal: 15 }]}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <FlatList data={COUNTRIES} keyExtractor={(item) => item.code} numColumns={2} columnWrapperStyle={{ justifyContent: 'space-between' }} showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const active = selectedCountry?.toUpperCase() === item.code.toUpperCase();
                  return (
                    <TouchableOpacity style={[styles.modalCountryChip, active && [styles.activeModalCountryChip, {borderColor: primaryNeon, backgroundColor: 'rgba(255,255,255,0.05)'}]]} onPress={() => handleCountrySelect(item.code)}>
                      <Text style={[styles.modalCountryText, active && [styles.activeModalCountryText, {color: primaryNeon}]]}>{item.name}</Text>
                    </TouchableOpacity>
                  );
                }}
              />
              <TouchableOpacity style={[styles.modalBtnCancel, { marginTop: 15 }]} onPress={() => setCountryModalVisible(false)}><Text style={styles.modalBtnText}>Close</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={isCoinModalVisible} animationType="fade" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '80%' }]}>
              <Text style={styles.modalTitle}>Your Custom Coins</Text>
              <View style={{maxHeight: 200, marginBottom: 15}}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {customCoins.map(coin => (
                    <View key={coin.symbol} style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#252538', padding: 12, borderRadius: 8, marginBottom: 8}}>
                      <Text style={{color: '#F59E0B', fontWeight: 'bold'}}>{coin.symbol}</Text>
                      <Text style={{color: '#FFF'}}>${coin.price.toFixed(coin.price < 0.01 ? 4 : 2)}</Text>
                      <TouchableOpacity onPress={() => removeCustomCoin(coin.symbol)}><Ionicons name="trash-outline" size={20} color="#EF4444" /></TouchableOpacity>
                    </View>
                  ))}
                  {customCoins.length === 0 && ( <Text style={{color: '#8A8A9E', textAlign: 'center', padding: 10}}>No custom coins added yet.</Text> )}
                </ScrollView>
              </View>
              <Text style={{color: '#8A8A9E', fontSize: 12, marginBottom: 5}}>Add New Coin (Ticker):</Text>
              <TextInput style={styles.modalInput} placeholder="e.g. JUP, PYTH..." placeholderTextColor="#8A8A9E" value={coinSearchQuery} onChangeText={setCoinSearchQuery} autoCapitalize="characters" />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#252538', alignItems: 'center' }} onPress={() => setCoinModalVisible(false)}><Text style={styles.modalBtnText}>Close</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtnSearch, {backgroundColor: '#F59E0B'}]} onPress={() => addCustomCoin(coinSearchQuery)} disabled={isSearchingCoin}>
                  {isSearchingCoin ? <ActivityIndicator size="small" color="#000" /> : <Text style={styles.modalBtnTextSearch}>Add</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={isTrackInfoVisible} animationType="fade" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Ionicons name="musical-notes" size={48} color={primaryNeon} style={{ alignSelf: 'center', marginBottom: 15 }} />
              <Text style={[styles.modalTitle, {color: primaryNeon, marginBottom: 5}]}>NOW PLAYING</Text>
              <Text style={{color: '#FFF', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 5}}>{liveMetadata?.title || activeTrack?.title || currentStation?.name || 'Unknown Track'}</Text>
              <Text style={{color: '#8A8A9E', fontSize: 14, textAlign: 'center', marginBottom: 20}}>{liveMetadata?.artist || activeTrack?.artist || 'Music Stream'}</Text>
              
              <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10, backgroundColor: '#252538', padding: 8, borderRadius: 8}}>
                <Ionicons name="time-outline" size={16} color="#8A8A9E" style={{marginRight: 6}} />
                <Text style={{color: '#8A8A9E', fontSize: 12, fontWeight: 'bold'}}>Listening time: {formatListeningTime(listeningSeconds)}</Text>
              </View>

              <Text style={{color: primaryNeon, fontSize: 12, fontWeight: 'bold', alignSelf: 'flex-start', marginTop: 10, marginBottom: 8}}>RECENT TRACKS</Text>
              <ScrollView style={{width: '100%', maxHeight: 180, marginBottom: 15}} showsVerticalScrollIndicator={false}>
                {trackHistory.map((item, index) => (
                  <View key={index} style={{flexDirection: 'row', alignItems: 'center', backgroundColor: '#0A0A0C', padding: 10, borderRadius: 8, marginBottom: 6, borderWidth: 1, borderColor: '#1E1E2C'}}>
                    <Ionicons name="musical-note" size={14} color={secondaryNeon} style={{marginRight: 10}} />
                    <View style={{flex: 1}}>
                      <Text style={{color: '#FFF', fontSize: 12, fontWeight: 'bold'}} numberOfLines={1}>{item.title}</Text>
                      <Text style={{color: '#8A8A9E', fontSize: 10}} numberOfLines={1}>{item.artist}</Text>
                    </View>
                    <Text style={{color: '#4A4A62', fontSize: 10, marginLeft: 5}}>{new Date(item.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                  </View>
                ))}
                {trackHistory.length === 0 && <Text style={{color: '#4A4A62', fontSize: 11, textAlign: 'center', marginTop: 10}}>No tracks saved yet. Keep listening!</Text>}
              </ScrollView>
              <TouchableOpacity style={{ width: '100%', padding: 12, borderRadius: 8, backgroundColor: '#252538', alignItems: 'center' }} onPress={() => setTrackInfoVisible(false)}><Text style={styles.modalBtnText}>Close</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={isAlarmModalVisible} animationType="fade" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '88%', width: '92%' }]}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 8 }}>
              <Ionicons name={timerActionMode === 'wake' ? "sunny" : "moon"} size={48} color={primaryNeon} style={{ alignSelf: 'center', marginBottom: 10 }} />
              <Text style={styles.modalTitle}>SMART TIMER</Text>
              
              <View style={styles.timerToggleRow}>
                <TouchableOpacity style={[styles.timerModeBtn, timerActionMode === 'sleep' && {backgroundColor: primaryNeon}]} onPress={() => { Haptics.selectionAsync(); setTimerActionMode('sleep'); }}>
                  <Text style={[styles.timerModeText, timerActionMode === 'sleep' && {color: '#000'}]}>Sleep (Turn OFF)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.timerModeBtn, timerActionMode === 'wake' && {backgroundColor: primaryNeon}]} onPress={() => { Haptics.selectionAsync(); setTimerActionMode('wake'); }}>
                  <Text style={[styles.timerModeText, timerActionMode === 'wake' && {color: '#000'}]}>Wake (Turn ON)</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.aboutSubText}>
                {timerActionMode === 'wake'
                  ? (wakeStation ? `Starts: ${wakeStation.name}` : 'Choose the alarm station in Settings.')
                  : 'Radio will slowly fade out in the last 5 minutes.'}
              </Text>

              {(timerActionMode === 'wake' ? wakeStation : lastPlayedStation) ? (
                <Text style={[styles.timerTargetStation, {color: primaryNeon}]}>
                  Target: {(timerActionMode === 'wake' ? wakeStation : lastPlayedStation)?.name}
                </Text>
              ) : (
                <Text style={[styles.timerTargetStation, {color: secondaryNeon}]}>
                  {timerActionMode === 'wake' ? 'No alarm station selected' : 'Please play a station first!'}
                </Text>
              )}
              
              <View style={styles.timerPresetsContainer}>
                {[1, 5, 15, 30].map((min) => (
                  <TouchableOpacity key={min} style={styles.timerPresetBtn} onPress={() => handleSetTimer(min)} disabled={timerActionMode === 'wake' ? !wakeStation : !lastPlayedStation}><Text style={styles.timerPresetText}>+{min}m</Text></TouchableOpacity>
                ))}
              </View>
              
              <View style={styles.customInputRow}>
                <Text style={styles.customInputLabel}>Custom (mins):</Text>
                <TextInput style={styles.customTextInput} placeholder="e.g. 45" placeholderTextColor="#8A8A9E" keyboardType="numeric" value={customTimerVal} onChangeText={setCustomTimerVal} />
                <TouchableOpacity style={[styles.customInputOkBtn, {backgroundColor: primaryNeon}]} onPress={() => handleSetCustomTimer()} disabled={timerActionMode === 'wake' ? !wakeStation : !lastPlayedStation}><Text style={styles.customInputOkText}>OK</Text></TouchableOpacity>
              </View>
              <View style={styles.customInputRow}>
                <Text style={styles.customInputLabel}>Alarm (HH:MM):</Text>
                <TextInput style={styles.customTextInput} placeholder="07:30" placeholderTextColor="#8A8A9E" maxLength={5} value={alarmClockVal} onChangeText={setAlarmClockVal} />
                <TouchableOpacity style={[styles.customInputOkBtn, {backgroundColor: primaryNeon}]} onPress={() => handleSetAlarmClock()} disabled={timerActionMode === 'wake' ? !wakeStation : !lastPlayedStation}><Text style={styles.customInputOkText}>OK</Text></TouchableOpacity>
              </View>
              
              {alarmTime && (
                <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '900', textAlign: 'center', marginTop: 14 }}>
                  {timerActionMode === 'wake' ? `Alarm ${timeLeft}` : `Stops in ${timeLeft}`}
                </Text>
              )}
              {alarmTime && (
                <TouchableOpacity style={[styles.cancelTimerBtn, {borderColor: secondaryNeon}]} onPress={clearTimerManually}>
                  <Text style={[styles.cancelTimerText, {color: secondaryNeon}]}>Cancel Active Timer</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={{ width: '100%', marginTop: 15, padding: 12, borderRadius: 8, backgroundColor: '#252538', alignItems: 'center' }} onPress={() => setAlarmModalVisible(false)}><Text style={styles.modalBtnText}>Close</Text></TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal visible={isAboutModalVisible} animationType="fade" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Image source={defaultLogo} style={styles.aboutLogo} />
              <Text style={styles.modalTitle}>SEEKER BEAT</Text>
              <Text style={styles.aboutSubText}>Version: v1.7.0 rel.</Text>
              <Text style={styles.aboutSubText}>Developer: dev-desinho.skr</Text>

              <ScrollView style={{ maxHeight: 380, marginTop: 10 }} showsVerticalScrollIndicator={false}>
                <View style={{flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 10}}>
                  
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#252538', borderRadius: 8, marginBottom: 10 }}>
                    <TouchableOpacity onPress={() => stepTheme(-1)} style={{ padding: 8 }}>
                      <Ionicons name="chevron-back" size={22} color={primaryNeon} />
                    </TouchableOpacity>
                    <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 13 }}>{THEME_LABEL[appTheme]}</Text>
                    <TouchableOpacity onPress={() => stepTheme(1)} style={{ padding: 8 }}>
                      <Ionicons name="chevron-forward" size={22} color={primaryNeon} />
                    </TouchableOpacity>
                </View>
                <View style={{backgroundColor: '#12121C', padding: 12, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: primaryNeon}}>
                  <Text style={{color: primaryNeon, fontWeight: '900', fontSize: 12, letterSpacing: 1, marginBottom: 6}}>NOW ON</Text>
                  <Text style={{color: '#FFF', fontSize: 12, lineHeight: 18}}>Theme: {appTheme.toUpperCase()}</Text>
                  <Text style={{color: '#FFF', fontSize: 12, lineHeight: 18}}>Drive background: {driveBg === 'rain' ? 'CODE' : driveBg === 'dust' ? 'BUBBLES' : driveBg === 'miami' ? 'NEON' : driveBg.toUpperCase()}</Text>
                  <Text style={{color: '#FFF', fontSize: 12, lineHeight: 18}}>Visualizer: {eqStyle.toUpperCase()}</Text>
                  <Text style={{color: '#FFF', fontSize: 12, lineHeight: 18}}>Vinyl: {vinylStyle.toUpperCase()}</Text>
                  <Text style={{color: '#FFF', fontSize: 12, lineHeight: 18}}>Speedometer: {speedStyle.toUpperCase()}</Text>
                  <Text style={{color: '#FFF', fontSize: 12, lineHeight: 18}}>Weather: {weatherStyle.toUpperCase()}</Text>
                </View>
                
                <View style={{backgroundColor: '#252538', padding: 12, borderRadius: 8, marginBottom: 10}}>
                  <Text style={{color: '#FFF', fontWeight: 'bold', fontSize: 13, marginBottom: 8}}>App Theme</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8}}>
                     <TouchableOpacity style={[{paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center', borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, appTheme === 'default' && {borderWidth: 2, backgroundColor: '#000', borderColor: '#00F0FF'}]} onPress={() => handleThemeChange('default')}>
                        <Text style={{color: '#00F0FF', fontSize: 10, fontWeight: 'bold'}}>NEON</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[{paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center', borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, appTheme === 'cyberpunk' && {borderWidth: 2, backgroundColor: '#000', borderColor: '#FCEE0A'}]} onPress={() => handleThemeChange('cyberpunk')}>
                        <Text style={{color: '#FCEE0A', fontSize: 10, fontWeight: 'bold'}}>CYBER</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[{paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center', borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, appTheme === 'winamp' && {borderWidth: 2, backgroundColor: '#000', borderColor: '#00FF00'}]} onPress={() => handleThemeChange('winamp')}>
                        <Text style={{color: '#00FF00', fontSize: 10, fontWeight: 'bold'}}>WINAMP</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[{paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center', borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, appTheme === 'aimp' && {borderWidth: 2, backgroundColor: '#000', borderColor: '#FF6600'}]} onPress={() => handleThemeChange('aimp')}>
                        <Text style={{color: '#FF6600', fontSize: 10, fontWeight: 'bold'}}>AIMP</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[{paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center', borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, appTheme === 'matrix' && {borderWidth: 2, backgroundColor: '#000', borderColor: '#00FF41'}]} onPress={() => handleThemeChange('matrix')}>
                        <Text style={{color: '#00FF41', fontSize: 10, fontWeight: 'bold'}}>MATRIX</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[{paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center', borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, appTheme === 'synthwave' && {borderWidth: 2, backgroundColor: '#000', borderColor: '#FF00FF'}]} onPress={() => handleThemeChange('synthwave')}>
                        <Text style={{color: '#FF00FF', fontSize: 10, fontWeight: 'bold'}}>MIAMI</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[{paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center', borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, appTheme === 'dracula' && {borderWidth: 2, backgroundColor: '#000', borderColor: '#FF79C6'}]} onPress={() => handleThemeChange('dracula')}>
                        <Text style={{color: '#FF79C6', fontSize: 10, fontWeight: 'bold'}}>DRACULA</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[{paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center', borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, appTheme === 'blood' && {borderWidth: 2, backgroundColor: '#000', borderColor: '#FF2A2A'}]} onPress={() => handleThemeChange('blood')}>
                        <Text style={{color: '#FF2A2A', fontSize: 10, fontWeight: 'bold'}}>BLOOD</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[{paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center', borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, appTheme === 'midnight' && {borderWidth: 2, backgroundColor: '#000', borderColor: '#7AA2FF'}]} onPress={() => handleThemeChange('midnight')}>
                        <Text style={{color: '#7AA2FF', fontSize: 10, fontWeight: 'bold'}}>MIDNIGHT</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[{paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center', borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, appTheme === 'amber' && {borderWidth: 2, backgroundColor: '#000', borderColor: '#FFB000'}]} onPress={() => handleThemeChange('amber')}>
                        <Text style={{color: '#FFB000', fontSize: 10, fontWeight: 'bold'}}>AMBER</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[{paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center', borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, appTheme === 'ocean' && {borderWidth: 2, backgroundColor: '#000', borderColor: '#00E5FF'}]} onPress={() => handleThemeChange('ocean')}>
                        <Text style={{color: '#00E5FF', fontSize: 10, fontWeight: 'bold'}}>OCEAN</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[{paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center', borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, appTheme === 'minecraft' && {borderWidth: 2, backgroundColor: '#000', borderColor: '#73C24A'}]} onPress={() => handleThemeChange('minecraft')}>
                        <Text style={{color: '#73C24A', fontSize: 10, fontWeight: 'bold'}}>MINECRAFT</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[{paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center', borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, appTheme === 'seeker' && {borderWidth: 2, backgroundColor: '#000', borderColor: '#14F195'}]} onPress={() => handleThemeChange('seeker')}>
                        <Text style={{color: '#14F195', fontSize: 10, fontWeight: 'bold'}}>SEEKER</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[{paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center', borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, appTheme === 'mario' && {borderWidth: 2, backgroundColor: '#000', borderColor: '#E52521'}]} onPress={() => handleThemeChange('mario')}>
                        <Text style={{color: '#FBD000', fontSize: 10, fontWeight: 'bold'}}>MARIO</Text>
                     </TouchableOpacity>
                  </ScrollView>
                </View>

                <View style={{backgroundColor: '#252538', padding: 12, borderRadius: 8, marginBottom: 10, gap: 12}}>
                  <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                    <View style={{flex: 1, paddingRight: 10}}>
                      <Text style={{color: primaryNeon, fontWeight: 'bold', fontSize: 13}}>Theme effects</Text>
                      <Text style={{color: '#8A8A9E', fontSize: 10, marginTop: 2}}>Only the selected theme plays its effect</Text>
                    </View>
                    <Switch value={themeFx} onValueChange={(val) => { setThemeFx(val); AsyncStorage.setItem(THEME_FX_KEY, JSON.stringify(val)); }} trackColor={{ false: '#161626', true: primaryNeon }} thumbColor="#FFF" />
                  </View>
                  <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                    <View style={{flex: 1, paddingRight: 10}}>
                      <Text style={{color: '#FBD000', fontWeight: 'bold', fontSize: 13}}>Mario coin</Text>
                      <Text style={{color: '#8A8A9E', fontSize: 10, marginTop: 2}}>Coins and bricks when changing stations</Text>
                    </View>
                    <Switch value={marioFx} onValueChange={(val) => { setMarioFx(val); AsyncStorage.setItem(MARIO_FX_KEY, JSON.stringify(val)); }} trackColor={{ false: '#161626', true: '#E52521' }} thumbColor="#FFF" />
                  </View>
                  <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                    <View style={{flex: 1, paddingRight: 10}}>
                      <Text style={{color: '#00FF41', fontWeight: 'bold', fontSize: 13}}>Matrix type</Text>
                      <Text style={{color: '#8A8A9E', fontSize: 10, marginTop: 2}}>Station name types in like a terminal</Text>
                    </View>
                    <Switch value={matrixFx} onValueChange={(val) => { setMatrixFx(val); AsyncStorage.setItem(MATRIX_FX_KEY, JSON.stringify(val)); }} trackColor={{ false: '#161626', true: '#00FF41' }} thumbColor="#FFF" />
                  </View>
                  <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                    <View style={{flex: 1, paddingRight: 10}}>
                      <Text style={{color: '#7AA2FF', fontWeight: 'bold', fontSize: 13}}>Night theme</Text>
                      <Text style={{color: '#8A8A9E', fontSize: 10, marginTop: 2}}>After sunset, Midnight theme, back in the morning</Text>
                    </View>
                    <Switch value={nightAuto} onValueChange={(val) => { setNightAuto(val); nightPickRef.current = false; AsyncStorage.setItem(NIGHT_AUTO_KEY, JSON.stringify(val)); }} trackColor={{ false: '#161626', true: '#7AA2FF' }} thumbColor="#FFF" />
                  </View>
                  <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                    <View style={{flex: 1, paddingRight: 10}}>
                      <Text style={{color: '#7DD3FC', fontWeight: 'bold', fontSize: 13}}>Weather world</Text>
                      <Text style={{color: '#8A8A9E', fontSize: 10, marginTop: 2}}>Rain, snow and wind in Drive</Text>
                    </View>
                    <Switch value={driveWeatherFx} onValueChange={(val) => { setDriveWeatherFx(val); AsyncStorage.setItem(DRIVE_WEATHER_FX_KEY, JSON.stringify(val)); }} trackColor={{ false: '#161626', true: '#38BDF8' }} thumbColor="#FFF" />
                  </View>
                </View>

                <View style={{backgroundColor: '#252538', padding: 12, borderRadius: 8, marginBottom: 10}}>
                  <Text style={{color: '#FFF', fontWeight: 'bold', fontSize: 13, marginBottom: 8}}>Drive Background</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8}}>
                     <TouchableOpacity style={[{paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, driveBg === 'aurora' && {borderColor: '#000', backgroundColor: primaryNeon, borderWidth: 2}]} onPress={() => {setDriveBg('aurora'); AsyncStorage.setItem(DRIVE_BG_KEY, 'aurora')}}>
                        <Text style={{color: driveBg === 'aurora' ? '#000' : '#8A8A9E', fontSize: 10, fontWeight: 'bold'}}>AURORA</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[{paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, driveBg === 'dust' && {borderColor: '#000', backgroundColor: primaryNeon, borderWidth: 2}]} onPress={() => {setDriveBg('dust'); AsyncStorage.setItem(DRIVE_BG_KEY, 'dust')}}>
                        <Text style={{color: driveBg === 'dust' ? '#000' : '#8A8A9E', fontSize: 10, fontWeight: 'bold'}}>BUBBLES</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[{paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, driveBg === 'sunset' && {borderColor: '#000', backgroundColor: primaryNeon, borderWidth: 2}]} onPress={() => {setDriveBg('sunset'); AsyncStorage.setItem(DRIVE_BG_KEY, 'sunset')}}>
                        <Text style={{color: driveBg === 'sunset' ? '#000' : '#8A8A9E', fontSize: 10, fontWeight: 'bold'}}>SUNSET</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[{paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, driveBg === 'pulse' && {borderColor: '#000', backgroundColor: primaryNeon, borderWidth: 2}]} onPress={() => {setDriveBg('pulse'); AsyncStorage.setItem(DRIVE_BG_KEY, 'pulse')}}>
                        <Text style={{color: driveBg === 'pulse' ? '#000' : '#8A8A9E', fontSize: 10, fontWeight: 'bold'}}>PULSE</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[{paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, driveBg === 'grid' && {borderColor: '#000', backgroundColor: primaryNeon, borderWidth: 2}]} onPress={() => {setDriveBg('grid'); AsyncStorage.setItem(DRIVE_BG_KEY, 'grid')}}>
                        <Text style={{color: driveBg === 'grid' ? '#000' : '#8A8A9E', fontSize: 10, fontWeight: 'bold'}}>GRID</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[{paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, driveBg === 'rain' && {borderColor: '#000', backgroundColor: primaryNeon, borderWidth: 2}]} onPress={() => {setDriveBg('rain'); AsyncStorage.setItem(DRIVE_BG_KEY, 'rain')}}>
                        <Text style={{color: driveBg === 'rain' ? '#000' : '#8A8A9E', fontSize: 10, fontWeight: 'bold'}}>CODE</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[{paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, driveBg === 'stars' && {borderColor: '#000', backgroundColor: primaryNeon, borderWidth: 2}]} onPress={() => {setDriveBg('stars'); AsyncStorage.setItem(DRIVE_BG_KEY, 'stars')}}>
                        <Text style={{color: driveBg === 'stars' ? '#000' : '#8A8A9E', fontSize: 10, fontWeight: 'bold'}}>STARS</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[{paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, driveBg === 'miami' && {borderColor: '#000', backgroundColor: primaryNeon, borderWidth: 2}]} onPress={() => {setDriveBg('miami'); AsyncStorage.setItem(DRIVE_BG_KEY, 'miami')}}>
                        <Text style={{color: driveBg === 'miami' ? '#000' : '#8A8A9E', fontSize: 10, fontWeight: 'bold'}}>NEON</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[{paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, driveBg === 'embers' && {borderColor: '#000', backgroundColor: primaryNeon, borderWidth: 2}]} onPress={() => {setDriveBg('embers'); AsyncStorage.setItem(DRIVE_BG_KEY, 'embers')}}>
                        <Text style={{color: driveBg === 'embers' ? '#000' : '#8A8A9E', fontSize: 10, fontWeight: 'bold'}}>EMBERS</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[{paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, driveBg === 'none' && {borderColor: '#000', backgroundColor: primaryNeon, borderWidth: 2}]} onPress={() => {setDriveBg('none'); AsyncStorage.setItem(DRIVE_BG_KEY, 'none')}}>
                        <Text style={{color: driveBg === 'none' ? '#000' : '#8A8A9E', fontSize: 10, fontWeight: 'bold'}}>NONE</Text>
                     </TouchableOpacity>
                  </ScrollView>
                </View>

                <View style={{backgroundColor: '#252538', padding: 12, borderRadius: 8, marginBottom: 10}}>
                  <Text style={{color: '#FFF', fontWeight: 'bold', fontSize: 13, marginBottom: 8}}>Visualizer (main + drive)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8}}>
                    {['cubes', 'minecraft', 'bars', 'wave', 'halo', 'orb', 'dots', 'ring', 'pulse', 'road', 'spiral', 'sparks', 'radar', 'synth', 'vinyl', 'off'].map(s => (
                      <TouchableOpacity key={s} style={[{paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, eqStyle === s && {borderColor: '#000', backgroundColor: primaryNeon, borderWidth: 2}]} onPress={() => handleEqChange(s)}>
                        <Text style={{color: eqStyle === s ? '#000' : '#8A8A9E', fontSize: 10, fontWeight: 'bold'}}>{s.toUpperCase()}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={{backgroundColor: '#252538', padding: 12, borderRadius: 8, marginBottom: 10}}>
                  <Text style={{color: '#FFF', fontWeight: 'bold', fontSize: 13, marginBottom: 8}}>Interactive Vinyl Style</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8}}>
                    {['classic', 'gold', 'neon', 'off'].map(s => (
                      <TouchableOpacity key={s} style={[{paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, vinylStyle === s && {borderColor: '#000', backgroundColor: primaryNeon, borderWidth: 2}]} onPress={() => handleVinylChange(s)}>
                        <Text style={{color: vinylStyle === s ? '#000' : '#8A8A9E', fontSize: 10, fontWeight: 'bold'}}>{s.toUpperCase()}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#252538', padding: 12, borderRadius: 8, marginBottom: 10}}>
                  <View style={{flex: 1, paddingRight: 10}}><Text style={{color: '#FFF', fontWeight: 'bold', fontSize: 13}}>Auto-play last station</Text></View>
                  <Switch value={isAutoStart} onValueChange={toggleAutoStart} trackColor={{ false: '#161626', true: primaryNeon }} thumbColor="#FFF" />
                </View>

                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#252538', padding: 12, borderRadius: 8, marginBottom: 10}}>
                  <View style={{flex: 1, paddingRight: 10}}>
                    <Text style={{color: '#FFF', fontWeight: 'bold', fontSize: 13}}>Play in Background</Text>
                    <Text style={{color: '#8A8A9E', fontSize: 10, marginTop: 2}}>Keep playing when app is minimized</Text>
                  </View>
                  <Switch value={isBgPlayEnabled} onValueChange={toggleBgPlay} trackColor={{ false: '#161626', true: primaryNeon }} thumbColor="#FFF" />
                </View>

                <View style={{backgroundColor: '#252538', padding: 12, borderRadius: 8, marginBottom: 10}}>
                  <Text style={{color: '#FFF', fontWeight: 'bold', fontSize: 13}}>Alarm station</Text>
                  <Text style={{color: wakeStation ? primaryNeon : '#8A8A9E', fontSize: 11, marginTop: 4}} numberOfLines={1}>
                    {wakeStation ? wakeStation.name : 'Not selected. Wake will do nothing.'}
                  </Text>
                  <TouchableOpacity
                    style={{marginTop: 8, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: primaryNeon}}
                    onPress={() => {
                      if (!currentStation) return;
                      const station = currentStation;
                      setWakeStation(station);
                      AsyncStorage.setItem(WAKE_STATION_KEY, JSON.stringify(station));
                      setWakeChoices((prev) => {
                        const next = [station, ...prev.filter((s) => s.id !== station.id)].slice(0, 12);
                        AsyncStorage.setItem(WAKE_LIST_KEY, JSON.stringify(next));
                        return next;
                      });
                    }}
                  >
                    <Text style={{color: primaryNeon, fontSize: 10, fontWeight: 'bold'}}>USE CURRENT</Text>
                  </TouchableOpacity>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8, marginTop: 8}}>
                    {wakeChoices.map((station) => (
                      <TouchableOpacity
                        key={station.id}
                        style={{paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: wakeStation?.id === station.id ? primaryNeon : 'transparent'}}
                        onPress={() => {
                          setWakeStation(station);
                          AsyncStorage.setItem(WAKE_STATION_KEY, JSON.stringify(station));
                        }}
                      >
                        <Text style={{color: wakeStation?.id === station.id ? primaryNeon : '#8A8A9E', fontSize: 10, fontWeight: 'bold'}} numberOfLines={1}>{station.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#252538', padding: 12, borderRadius: 8, marginBottom: 10}}>
                  <View style={{flex: 1, paddingRight: 10}}>
                    <Text style={{color: '#FFF', fontWeight: 'bold', fontSize: 13}}>Animated Crypto Ticker</Text>
                    <Text style={{color: '#8A8A9E', fontSize: 10, marginTop: 2}}>Scrolling prices vs fixed swipe view</Text>
                  </View>
                  <Switch value={isTickerMoving} onValueChange={toggleTickerMode} trackColor={{ false: '#161626', true: primaryNeon }} thumbColor="#FFF" />
                </View>

                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#252538', padding: 12, borderRadius: 8, marginBottom: 10}}>
                  <View style={{flex: 1, paddingRight: 10}}>
                    <Text style={{color: '#FFF', fontWeight: 'bold', fontSize: 13}}>Dynamic Station Covers</Text>
                    <Text style={{color: '#8A8A9E', fontSize: 10, marginTop: 2}}>Enable station logos & blurred background</Text>
                  </View>
                  <Switch value={isDynamicCover} onValueChange={toggleDynamicCover} trackColor={{ false: '#161626', true: primaryNeon }} thumbColor="#FFF" />
                </View>

                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#252538', padding: 12, borderRadius: 8, marginBottom: 10}}>
                  <View style={{flex: 1, paddingRight: 10}}>
                    <Text style={{color: '#FFF', fontWeight: 'bold', fontSize: 13}}>GPS Speedometer</Text>
                    <Text style={{color: '#8A8A9E', fontSize: 10, marginTop: 2}}>Show speed in Drive Mode</Text>
                  </View>
                  <Switch value={isSpeedometerEnabled} onValueChange={toggleSpeedometer} trackColor={{ false: '#161626', true: primaryNeon }} thumbColor="#FFF" />
                </View>
                <View style={{backgroundColor: '#252538', padding: 12, borderRadius: 8, marginBottom: 10}}>
                  <Text style={{color: '#FFF', fontWeight: 'bold', fontSize: 13, marginBottom: 8}}>Speedometer style</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8}}>
                    {(['gauge', 'digits', 'dial', 'arc', 'ticks', 'bar'] as const).map(s => (
                      <TouchableOpacity key={s} style={[{paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, speedStyle === s && {borderColor: '#000', backgroundColor: primaryNeon, borderWidth: 2}]} onPress={() => { setSpeedStyle(s); AsyncStorage.setItem(SPEED_STYLE_KEY, s); }}>
                        <Text style={{color: speedStyle === s ? '#000' : '#8A8A9E', fontSize: 10, fontWeight: 'bold'}}>{s.toUpperCase()}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#252538', padding: 12, borderRadius: 8, marginBottom: 10}}>
                  <View style={{flex: 1, paddingRight: 10}}>
                    <Text style={{color: '#FFF', fontWeight: 'bold', fontSize: 13}}>Live Weather Widget</Text>
                    <Text style={{color: '#8A8A9E', fontSize: 10, marginTop: 2}}>Show weather in Drive Mode</Text>
                  </View>
                  <Switch value={isWeatherEnabled} onValueChange={toggleWeather} trackColor={{ false: '#161626', true: primaryNeon }} thumbColor="#FFF" />
                </View>
                <View style={{backgroundColor: '#252538', padding: 12, borderRadius: 8, marginBottom: 10}}>
                  <Text style={{color: '#FFF', fontWeight: 'bold', fontSize: 13, marginBottom: 8}}>Weather style</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8}}>
                    {(['card', 'compact', 'hud'] as const).map(s => (
                      <TouchableOpacity key={s} style={[{paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, weatherStyle === s && {borderColor: '#000', backgroundColor: primaryNeon, borderWidth: 2}]} onPress={() => { setWeatherStyle(s); AsyncStorage.setItem(WEATHER_STYLE_KEY, s); }}>
                        <Text style={{color: weatherStyle === s ? '#000' : '#8A8A9E', fontSize: 10, fontWeight: 'bold'}}>{s.toUpperCase()}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#252538', padding: 12, borderRadius: 8, marginBottom: 10}}>
                  <View style={{flex: 1, paddingRight: 10}}>
                    <Text style={{color: '#FFF', fontWeight: 'bold', fontSize: 13}}>Move weather</Text>
                    <Text style={{color: '#8A8A9E', fontSize: 10, marginTop: 2}}>Drag the card left and right, inside the screen. Pinch the speedometer with two fingers.</Text>
                  </View>
                  <Switch value={weatherMoveEnabled} onValueChange={(val) => { setWeatherMoveEnabled(val); AsyncStorage.setItem(WEATHER_MOVE_KEY, JSON.stringify(val)); }} trackColor={{ false: '#161626', true: primaryNeon }} thumbColor="#FFF" />
                </View>

                <View style={[styles.donateBox, {borderColor: secondaryNeon}]}>
                  <Text style={styles.donateLabel}>Support the Developer</Text>
                  <TouchableOpacity style={[styles.donateBtn, {backgroundColor: primaryNeon}]} onPress={handleTipDev} activeOpacity={0.8}>
                    <Ionicons name="copy-outline" size={18} color="#000" style={{ marginRight: 6 }} />
                    <Text style={styles.donateBtnText}>Copy Wallet Address</Text>
                  </TouchableOpacity>
                  <Text style={styles.donateAddress} numberOfLines={1} ellipsizeMode="middle">A7xUS1Ai8ic6f8HfSUWq6tadvPsWpEXhd1NvDyJsJZi</Text>
                </View>
                
                <TouchableOpacity style={styles.powerOffBtn} onPress={handleForceExit}>
                  <Ionicons name="power" size={20} color="#FFF" style={{marginRight: 8}} />
                  <Text style={{color: '#FFF', fontWeight: 'bold', fontSize: 16}}>POWER OFF & EXIT</Text>
                </TouchableOpacity>

              </ScrollView>

              <TouchableOpacity style={{ width: '100%', marginTop: 15, padding: 12, borderRadius: 8, backgroundColor: '#252538', alignItems: 'center' }} onPress={() => setAboutModalVisible(false)}>
                <Text style={styles.modalBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </GestureHandlerRootView> 
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' }, 
  header: { paddingHorizontal: 16, paddingTop: 40, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(26, 26, 34, 0.6)' },
  
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', minHeight: 75 },
  leftHeaderSection: { flex: 1, alignItems: 'flex-start', paddingLeft: 0, paddingRight: 10 },
  rightHeaderSection: { alignItems: 'flex-end', justifyContent: 'center' },
  
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  logoIcon: { width: 68, height: 68, borderRadius: 16, marginRight: 14 },
  titleWrapper: { flexDirection: 'column', justifyContent: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  headerSubtitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  
  pulseContainer: { height: 26, width: 140, marginBottom: 2 },
  pulseMask: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'transparent' },
  pulseLine: { height: 2, width: 28, backgroundColor: '#FFF', borderRadius: 1 },
  pulseIcon: { marginHorizontal: 0, marginTop: 2 },
  pulseGradientWrapper: { position: 'absolute', top: 0, left: 0, height: '100%', width: '130%' }, 

  neonEqualizer: { flexDirection: 'row', alignItems: 'flex-end', height: 52, gap: 3 },
  eqColumn: { width: 5, height: 52, overflow: 'hidden', justifyContent: 'flex-end' },
  eqBarFill: { position: 'absolute', left: 0, top: 0, height: 52 },
  eqSegment: { width: 5, height: 3, borderRadius: 1, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 3, elevation: 4 },
  
  tickerWrapper: { height: 30, overflow: 'hidden', marginTop: 16 },
  cryptoContainer: { flexDirection: 'row', gap: 10, alignSelf: 'flex-start', minWidth: Dimensions.get('window').width * 2 },
  
  cryptoBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(20,20,30,0.85)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, gap: 4 },
  customCoinBadge: { borderColor: '#F59E0B', borderStyle: 'solid' },
  cryptoSymbol: { fontSize: 9, fontWeight: '900' },
  cryptoSymbolCustom: { color: '#F59E0B', fontSize: 9, fontWeight: '900' },
  cryptoPrice: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  cryptoChange: { fontSize: 9, fontWeight: 'bold' },
  positive: { color: '#10B981' },
  negative: { color: '#EF4444' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#161626', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#333' },
  modalTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  modalInput: { backgroundColor: '#0A0A0C', color: '#FFF', borderRadius: 8, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#252538', marginBottom: 20 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  modalBtnCancel: { width: '100%', marginTop: 15, padding: 12, borderRadius: 8, backgroundColor: '#252538', alignItems: 'center' },
  modalBtnText: { color: '#FFF', fontWeight: 'bold' },
  modalBtnSearch: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#00F0FF', alignItems: 'center' },
  modalBtnTextSearch: { color: '#000', fontWeight: 'bold' },
  
  searchWrapper: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(18,18,26,0.8)', borderRadius: 10, paddingHorizontal: 10, height: 38, borderWidth: 1, borderColor: '#1E1E2C' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 13, paddingVertical: 0 },
  clearButton: { padding: 2 },
  
  genresWrapper: { paddingTop: 8, paddingBottom: 4, paddingLeft: 16 },
  genreChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(18,18,26,0.8)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#222230' },
  favGenreChip: { borderColor: '#FFD70033' },
  activeGenreChip: { backgroundColor: '#7000FF', borderColor: '#00F0FF' },
  genreText: { color: '#8A8A9E', fontSize: 12, fontWeight: '700' },
  activeGenreText: { color: '#FFFFFF' },
  
  countriesWrapper: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(26,26,34,0.6)' },
  countryTriggerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(18,18,26,0.8)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#222230' },
  countryTriggerBtnActive: { borderColor: '#00F0FF', backgroundColor: 'rgba(0, 240, 255, 0.1)' },
  countryTriggerText: { color: '#8A8A9E', fontSize: 13, fontWeight: '700' },
  countryTriggerTextActive: { color: '#00F0FF' },
  clearCountryBtn: { padding: 4, marginLeft: 12, justifyContent: 'center' },
  
  modalCountryChip: { flex: 1, backgroundColor: '#101018', paddingVertical: 12, borderRadius: 10, marginHorizontal: 5, marginBottom: 10, borderWidth: 1, borderColor: '#1E1E2A', alignItems: 'center' },
  activeModalCountryChip: { backgroundColor: 'rgba(0, 240, 255, 0.1)', borderColor: '#00F0FF' },
  modalCountryText: { color: '#70708A', fontSize: 13, fontWeight: '600' },
  activeModalCountryText: { color: '#00F0FF', fontWeight: 'bold' },
  
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 110 },
  loaderCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyText: { color: '#8A8A9E', fontSize: 16, fontWeight: 'bold', marginTop: 16 },
  
  stationCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(18,18,26,0.8)', padding: 12, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: '#1E1E2C' },
  activeCard: { borderColor: '#00F0FF', backgroundColor: 'rgba(22,22,38,0.9)' },
  stationImage: { width: 48, height: 48, borderRadius: 10, backgroundColor: '#0A0A0C' },
  stationInfo: { flex: 1, marginLeft: 12, marginRight: 8 },
  stationName: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
  stationTag: { fontSize: 10, fontWeight: '600', marginTop: 4 },
  favButton: { padding: 6, marginRight: 6 },
  
  bottomPlayerContainer: { height: 76, marginHorizontal: 6, marginBottom: 16, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0, 240, 255, 0.3)' },
  bottomPlayerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10, 10, 12, 0.85)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  bottomCoverThumb: { width: 44, height: 44, borderRadius: 8 },
  bottomInfoSection: { flex: 1, marginLeft: 12 },
  bottomStationTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  bottomStationStatus: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  bottomPlayButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(20, 20, 30, 0.8)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#00F0FF' },
  
  errorToast: { position: 'absolute', bottom: 100, alignSelf: 'center', backgroundColor: 'rgba(239, 68, 68, 0.95)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, zIndex: 100 },
  errorToastText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  
  footerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.05)', backgroundColor: 'rgba(10,10,12,0.9)', zIndex: 100, elevation: 10 },
  footerBtnQuarter: { flex: 1, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', paddingVertical: 4 },
  footerDivider: { width: 1, height: 25, backgroundColor: '#1E1E2C' },
  footerAboutText: { color: '#4A4A62', fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5, marginTop: 4 },
  
  driveModeContainer: { flex: 1, justifyContent: 'space-between', alignItems: 'center' },
  driveModePlayBtn: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 3, elevation: 10, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20, zIndex: 10 },

  weatherWidgetContainer: { width: 250, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 15, elevation: 15, borderRadius: 16 },
  weatherCardPadding: { padding: 16 },
  weatherHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  weatherDayText: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  weatherDateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  weatherDateText: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600' },
  weatherCityText: { color: '#FFF', fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 5 },
  weatherMainRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  weatherTempText: { color: '#FFF', fontSize: 52, fontWeight: '900', letterSpacing: -2, includeFontPadding: false },
  weatherCondText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600', marginTop: -5 },
  
  weatherDetailsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  weatherDetailItem: { width: '32%', flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  weatherDetailText: { color: '#FFF', fontSize: 11, fontWeight: '700', marginLeft: 6 },
  weatherWindRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  
  weatherDailyContainer: { borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  weatherDailyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.02)' },
  weatherDailyText: { color: '#FFF', fontSize: 13, fontWeight: '800', width: 90 },
  weatherDailyTemp: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },

  timeframeSlideContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(20,20,30,0.85)', borderTopRightRadius: 20, borderBottomRightRadius: 20, borderWidth: 1, borderLeftWidth: 0, borderColor: '#252538', elevation: 10 },
  timeframeBox: { padding: 6, width: 85 },
  timeframeHandle: { paddingHorizontal: 4, paddingVertical: 20, justifyContent: 'center', alignItems: 'center' },
  timeframeBtn: { paddingHorizontal: 8, paddingVertical: 10, borderRadius: 12, marginBottom: 2 },
  timeframeText: { color: '#8A8A9E', fontSize: 11, fontWeight: '700', textAlign: 'center' },

  discoCardHub: { backgroundColor: '#12121A', padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#1E1E2C' },
  discoTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  discoImage: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#0A0A0C' },
  discoInfo: { flex: 1, marginLeft: 12, marginRight: 8 },
  discoTrackName: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
  discoArtistName: { color: '#8A8A9E', fontSize: 12, fontWeight: '600', marginTop: 4 },
  discoActionsRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#1E1E2C', paddingTop: 12 },
  discoActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.03)', marginHorizontal: 4 },
  
  bioCard: { flexDirection: 'row', backgroundColor: 'rgba(0, 240, 255, 0.05)', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(0, 240, 255, 0.2)' },
  bioImage: { width: 70, height: 70, borderRadius: 35, marginRight: 15 },
  bioName: { color: '#00F0FF', fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  bioText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, lineHeight: 18 },

  aboutLogo: { width: 64, height: 64, borderRadius: 16, alignSelf: 'center', marginBottom: 12 },
  aboutSubText: { color: '#8A8A9E', fontSize: 12, textAlign: 'center', marginBottom: 4 },
  donateBox: { padding: 16, borderRadius: 12, borderWidth: 1, marginTop: 5, alignItems: 'center' },
  donateLabel: { color: '#8A8A9E', fontSize: 10, fontWeight: 'bold', marginBottom: 12, textTransform: 'uppercase' },
  donateBtn: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  donateBtnText: { color: '#000', fontWeight: '900', fontSize: 13 },
  donateAddress: { color: '#4A4A62', fontSize: 10, fontFamily: 'monospace' },
  
  powerOffBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EF4444', padding: 16, borderRadius: 12, marginTop: 25, marginBottom: 10, elevation: 5 },

  timerTargetStation: { fontSize: 12, fontWeight: 'bold', textAlign: 'center', marginVertical: 15, paddingHorizontal: 10 },
  timerToggleRow: { flexDirection: 'row', backgroundColor: '#12121A', borderRadius: 8, padding: 4, marginBottom: 15 },
  timerModeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  timerModeText: { color: '#8A8A9E', fontWeight: 'bold', fontSize: 11 },
  timerPresetsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5, gap: 8 },
  timerPresetBtn: { flex: 1, backgroundColor: '#252538', paddingVertical: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#4A4A62' },
  timerPresetText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  customInputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, backgroundColor: '#12121A', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#252538' },
  customInputLabel: { color: '#8A8A9E', fontSize: 12, flex: 1, fontWeight: 'bold' },
  customTextInput: { backgroundColor: '#0A0A0C', color: '#FFF', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, width: 80, textAlign: 'center', borderWidth: 1, borderColor: '#333', marginRight: 10 },
  customInputOkBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6 },
  customInputOkText: { color: '#000', fontWeight: 'bold', fontSize: 12 },
  cancelTimerBtn: { marginTop: 20, paddingVertical: 12, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, alignItems: 'center', borderWidth: 1 },
  cancelTimerText: { fontWeight: 'bold' },
  
  spinWrapper: { marginRight: 14, justifyContent: 'center', alignItems: 'center', width: 40, height: 40 },
  vinylCenter: { position: 'absolute' },
  vinylGlare: { position: 'absolute', top: 5, right: 8, width: 5, height: 5, borderRadius: 2.5, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 4, elevation: 3 },
  
  vinylContainer: { position: 'absolute', justifyContent: 'center', alignItems: 'center', width: 200, height: 200, zIndex: 10 },
  vinylDisc: { width: 180, height: 180, borderRadius: 90, backgroundColor: '#050505', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#1A1A1A', shadowColor: '#000', shadowOpacity: 0.8, shadowRadius: 15, elevation: 10 },
  vinylGrooves: { position: 'absolute', width: 160, height: 160, borderRadius: 80, borderWidth: 1, borderColor: '#1A1A1A' },
  vinylGroovesInner: { position: 'absolute', width: 130, height: 130, borderRadius: 65, borderWidth: 1, borderColor: '#1A1A1A' },
  vinylLabel: { width: 60, height: 60, borderRadius: 30 },
  vinylHole: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: '#000' },
  vinylHighlight: { position: 'absolute', width: 180, height: 180, borderRadius: 90, opacity: 0.1, borderLeftWidth: 2, transform: [{rotate: '45deg'}] },

  eqBandsContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', width: '100%', marginTop: 20 },
  eqBandCol: { alignItems: 'center', width: 45 },
  eqFreqText: { color: '#8A8A9E', fontSize: 10, fontWeight: 'bold', marginBottom: 15 },
  eqControlBtn: { padding: 5, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8 },
  eqLevelVisualArea: { height: 120, width: 10, backgroundColor: '#0A0A0C', borderRadius: 5, marginVertical: 10, justifyContent: 'center', overflow: 'hidden' },
  eqZeroLine: { position: 'absolute', width: '100%', height: 2, backgroundColor: '#4A4A62', top: '50%' },
  eqLevelFill: { position: 'absolute', width: '100%', borderRadius: 5, shadowOffset: {width:0, height:0}, shadowRadius: 5, elevation: 3 },
  eqValText: { fontSize: 12, fontWeight: 'bold', marginTop: 15 },
  
  gridContainer: { position: 'absolute', bottom: 0, width: '100%', height: '50%', overflow: 'hidden', zIndex: 1 },
  gridPlane: { width: '200%', height: '200%', left: '-50%', top: '-50%', flexDirection: 'column' },
  gridLineH: { position: 'absolute', width: '100%', height: 2, shadowOffset: {width: 0, height: 0}, shadowOpacity: 0.8, shadowRadius: 5 },
  gridLineV: { position: 'absolute', height: '100%', width: 2, shadowOffset: {width: 0, height: 0}, shadowOpacity: 0.8, shadowRadius: 5 },
});

// ==========================================
// БЕЗОПАСНАЯ ИНИЦИАЛИЗАЦИЯ И ТОЧКА ВХОДА
// ==========================================
export default function AppRoot() {
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    async function init() {
      try {
        // Проверяем, инициализирован ли уже плеер (чтобы не было двойного вызова)
        await TrackPlayer.getActiveTrack();
      } catch (e) {
        // Если ловим ошибку, значит плеер еще не готов - инициализируем
        await TrackPlayer.setupPlayer();
      }
      if (isMounted) setIsPlayerReady(true);
    }
    
    init();
    return () => { isMounted = false; };
  }, []);

  // Блокируем загрузку всего интерфейса (и хуков!), пока C++ часть плеера не будет готова
  if (!isPlayerReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0A0C', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#00F0FF" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SeekerBeatMain />
    </SafeAreaProvider>
  );
}