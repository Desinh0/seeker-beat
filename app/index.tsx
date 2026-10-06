import 'react-native-gesture-handler';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image,
  ActivityIndicator, TextInput, Animated, Easing,
  Modal, Alert, ScrollView, Switch, BackHandler, useWindowDimensions, Dimensions,
  Platform, PermissionsAndroid, AppState, Linking
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

import TrackPlayer, { usePlaybackState, State, useActiveTrack, Event, Capability, AppKilledPlaybackBehavior, RepeatMode } from 'react-native-track-player';

import BackgroundTimer from 'react-native-background-timer';
import notifee, { TriggerType, TimestampTrigger, AndroidImportance, AndroidVisibility, EventType } from '@notifee/react-native';
import Reanimated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing as REasing, cancelAnimation } from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';

// ==========================================
// ГЛОБАЛЬНАЯ РЕГИСТРАЦИЯ ФОНОВОГО СЕРВИСА
// ==========================================
try {
  TrackPlayer.registerPlaybackService(() => async () => {
    TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
    TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
    TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());
  });
} catch (e) {}

const FAVORITES_STORAGE_KEY = '@seeker_beat_favorites';
const CUSTOM_COINS_KEY = '@seeker_beat_custom_coins_array'; 
const LAST_GENRE_KEY = '@seeker_beat_last_genre';
const LAST_STATION_KEY = '@seeker_beat_last_station'; 
const AUTOSTART_KEY = '@seeker_beat_autostart'; 
const BG_PLAY_KEY = '@seeker_beat_bg_play'; 
const TICKER_MODE_KEY = '@seeker_beat_ticker_mode'; 
const DYNAMIC_COVER_KEY = '@seeker_beat_dynamic_cover';
const AUDIOBOOK_LANG_KEY = '@seeker_beat_audiobook_lang'; 
const SPEEDOMETER_KEY = '@seeker_beat_speedometer';
const EQ_LEVELS_KEY = '@seeker_beat_eq_levels';
const TRACK_HISTORY_KEY = '@seeker_beat_history';
const WEATHER_ENABLED_KEY = '@seeker_beat_weather';
const EQ_STYLE_KEY = '@seeker_beat_eq_style'; 
const THEME_KEY = '@seeker_beat_theme'; 
const DRIVE_BG_KEY = '@seeker_beat_drive_bg'; 
const DRIVE_VINYL_KEY = '@seeker_beat_drive_vinyl';

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

const PULSE_EFFECTS = [
  { id: 'classic', icon: 'pulse', colors: ['#00F0FF', '#A855F7'], duration: 2500 }, 
  { id: 'rapid', icon: 'heart', colors: ['#FF003C', '#FF5555'], duration: 900 },   
];

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

const WeatherWidgetAdvanced = ({ data, isActive }: any) => {
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

  return (
    <View style={[styles.weatherWidgetContainer, { backgroundColor: 'rgba(15, 23, 42, 0.6)' }]}>
      {isRain && <WeatherAnim type="rain" color="#00F0FF" isActive={isActive} />}
      {isThunder && <WeatherAnim type="rain" color="#A855F7" isActive={isActive} />}
      {isSnow && <WeatherAnim type="snow" color="#FFFFFF" isActive={isActive} />}
      
      <TouchableOpacity activeOpacity={0.7} onPress={() => { Haptics.selectionAsync(); setExpanded(!expanded); }} style={styles.weatherCardPadding}>
        <View style={styles.weatherHeaderRow}>
          <Text style={styles.weatherDayText}>{dayName}</Text>
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color="rgba(255,255,255,0.8)" />
        </View>
        <View style={styles.weatherDateRow}>
          <Text style={styles.weatherDateText}>{monthName} {dateNum}</Text>
          <Text style={styles.weatherDateText}>{timeString}</Text>
        </View>
        
        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 10 }} />
        
        <Text style={styles.weatherCityText}>{city.toUpperCase()}</Text>
        
        <View style={styles.weatherMainRow}>
          <View>
            <Text style={styles.weatherTempText}>{temp}°C</Text>
            <Text style={styles.weatherCondText}>{label}</Text>
          </View>
          <Ionicons name={icon as any} size={56} color="#FFF" style={{ textShadowColor: 'rgba(0,0,0,0.3)', textShadowRadius: 10 }} />
        </View>
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
    if (isPlaying) {
      loopAnim = Animated.loop(
        Animated.timing(spin, { toValue: 1, duration: 25000, easing: Easing.linear, useNativeDriver: true })
      );
      loopAnim.start();
    } else { spin.stopAnimation(); }
    return () => { if(loopAnim) loopAnim.stop(); };
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
    if (isPlaying) {
      loopAnim = Animated.loop(Animated.timing(anim, { toValue: 1, duration: 4000, easing: Easing.out(Easing.ease), useNativeDriver: true }));
      loopAnim.start();
    } else { anim.stopAnimation(); }
    return () => { if(loopAnim) loopAnim.stop(); };
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
    if (isPlaying) {
      roadProgress.value = withRepeat(
        withTiming(1, { duration: 2500, easing: REasing.linear }),
        -1, false
      );
    } else { cancelAnimation(roadProgress); }
    return () => cancelAnimation(roadProgress);
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

const DraggableSpeedWidget = ({ currentSpeed, primaryNeon, windowWidth, windowHeight }: any) => {
  const WIDGET_WIDTH = 80;
  const WIDGET_HEIGHT = 100;
  const speedX = useSharedValue(20); 
  const speedY = useSharedValue(50);
  const contextX = useSharedValue(0);
  const contextY = useSharedValue(0);

  const speedGesture = Gesture.Pan()
    .onStart(() => {
      contextX.value = speedX.value;
      contextY.value = speedY.value;
    })
    .onUpdate((e) => {
      let newX = contextX.value + e.translationX;
      let newY = contextY.value + e.translationY;
      newX = Math.max(0, Math.min(newX, windowWidth - WIDGET_WIDTH));
      newY = Math.max(0, Math.min(newY, windowHeight - WIDGET_HEIGHT));
      if (newX > windowWidth - 100 && newY < 100) { newY = 100; }
      speedX.value = newX;
      speedY.value = newY;
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: speedX.value }, { translateY: speedY.value }],
    position: 'absolute', zIndex: 9999, elevation: 15,
  }));

  return (
    <GestureDetector gesture={speedGesture}>
      <Reanimated.View style={[animatedStyle, {width: WIDGET_WIDTH, height: WIDGET_HEIGHT, backgroundColor: 'rgba(10, 10, 20, 0.8)', borderRadius: 16, borderWidth: 1.5, borderColor: primaryNeon, alignItems: 'center', justifyContent: 'center'}]}>
        <Text style={{color: primaryNeon, fontSize: 32, fontWeight: 'bold'}}>{currentSpeed}</Text>
        <Text style={{color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 4, fontWeight: 'bold'}}>KM/H</Text>
      </Reanimated.View>
    </GestureDetector>
  );
};

const VinylRecord = ({ isPlaying, artwork, primaryNeon, vinylStyle }: any) => {
  const spinAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let loop: Animated.CompositeAnimation;
    if (isPlaying) {
      loop = Animated.loop(Animated.timing(spinAnim, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: true }));
      loop.start();
    } else { spinAnim.stopAnimation(); }
    return () => { if(loop) loop.stop(); };
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  
  const [isAboutModalVisible, setAboutModalVisible] = useState(false);
  const [isAlarmModalVisible, setAlarmModalVisible] = useState(false);
  const [isCountryModalVisible, setCountryModalVisible] = useState(false); 
  const [isTrackInfoVisible, setTrackInfoVisible] = useState(false); 
  
  const [isEqualizerVisible, setEqualizerVisible] = useState(false);
  const [eqBands, setEqBands] = useState([0, 0, 0, 0, 0]); 
  const EQ_FREQUENCIES = ['60Hz', '230Hz', '910Hz', '3.6kHz', '14kHz'];

  const [isDriveMode, setIsDriveMode] = useState(false); 
  const [isDriveStationsOpen, setIsDriveStationsOpen] = useState(false); 
  
  const [appTheme, setAppTheme] = useState<'default' | 'cyberpunk' | 'winamp' | 'aimp' | 'matrix' | 'synthwave' | 'dracula'>('default');
  const [driveBg, setDriveBg] = useState<'aurora'|'dust'|'sunset'|'pulse'|'grid'|'none'>('aurora'); 

  const [eqStyle, setEqStyle] = useState<'bars' | 'ring' | 'wave' | 'orb' | 'lines' | 'off'>('bars');
  const [vinylStyle, setVinylStyle] = useState<'classic' | 'gold' | 'neon' | 'off'>('classic');

  const [weatherData, setWeatherData] = useState<any>(null);
  const [trackHistory, setTrackHistory] = useState<any[]>([]); 
  
  const [liveMetadata, setLiveMetadata] = useState<{title: string, artist: string} | null>(null);

  const [isDiscoModalVisible, setDiscoModalVisible] = useState(false);
  const [discoSearchQuery, setDiscoSearchQuery] = useState('');
  const [discoResults, setDiscoResults] = useState<any[]>([]);
  const [isSearchingDisco, setIsSearchingDisco] = useState(false);
  
  const [artistBio, setArtistBio] = useState<any>(null);
  
  const [isAutoStart, setIsAutoStart] = useState(false); 
  const [isBgPlayEnabled, setIsBgPlayEnabled] = useState(true); 
  const [isTickerMoving, setIsTickerMoving] = useState(true); 
  const [isDynamicCover, setIsDynamicCover] = useState(true); 
  const [isSpeedometerEnabled, setIsSpeedometerEnabled] = useState(true);
  const [isWeatherEnabled, setIsWeatherEnabled] = useState(true); 
  const [currentSpeed, setCurrentSpeed] = useState(0);

  const [listeningSeconds, setListeningSeconds] = useState(0); 

  const tapCountRef = useRef(0);
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [pulseEffectIndex, setPulseEffectIndex] = useState(0);
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
      const themeOrder = ['default', 'cyberpunk', 'winamp', 'aimp', 'matrix', 'synthwave', 'dracula'];
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

    if ((style === 'ring' || style === 'orb') && vinylStyle !== 'off') {
      Alert.alert('Style Conflict', 'Center visualizers conflict with Vinyl. Vinyl has been turned off.');
      setVinylStyle('off');
      AsyncStorage.setItem(DRIVE_VINYL_KEY, 'off');
    }
  };

  const handleVinylChange = async (style: string) => {
    Haptics.selectionAsync();
    setVinylStyle(style as any);
    AsyncStorage.setItem(DRIVE_VINYL_KEY, style);

    if (style !== 'off' && (eqStyle === 'ring' || eqStyle === 'orb')) {
      Alert.alert('Style Conflict', 'Vinyl conflicts with center visualizers. Visualizer changed to Bars.');
      setEqStyle('bars');
      AsyncStorage.setItem(EQ_STYLE_KEY, 'bars');
    }
  };

  const handleThemeChange = async (themeName: 'default' | 'cyberpunk' | 'winamp' | 'aimp' | 'matrix' | 'synthwave' | 'dracula') => {
    Haptics.selectionAsync();
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

  const scheduleWakeAlarm = async (targetTimeMs: number) => {
    if (timerActionMode === 'wake') {
      await notifee.cancelAllNotifications();
      
      if (Platform.OS === 'android') {
        const settings = await notifee.getNotificationSettings();
        if (settings.authorizationStatus !== 1) {
          await notifee.requestPermission();
        }
      }

      const channelId = await notifee.createChannel({
        id: 'seeker_alarm',
        name: 'Seeker Beat Alarm',
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        sound: 'default',
      });

      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: targetTimeMs,
        alarmManager: true, 
      };

      await notifee.createTriggerNotification(
        {
          id: 'wake_up_alarm',
          title: '⏰ Wake Up!',
          body: `Seeker Beat включает: ${lastPlayedStation?.name}`,
          android: {
            channelId,
            importance: AndroidImportance.HIGH,
            fullScreenAction: {
              id: 'default',
            },
          },
          data: { 
            action: 'wake_radio',
          },
        },
        trigger,
      );
    }
  };

  const handleSetTimer = async (minutes: number) => {
    const target = Date.now() + minutes * 60000;
    setAlarmTime(target);
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
    setAlarmClockVal('');
    setAlarmModalVisible(false);
    await scheduleWakeAlarm(target);
  };

  const updateEqBand = async (index: number, value: number) => {
    Haptics.selectionAsync();
    const newBands = [...eqBands];
    newBands[index] = Math.max(-10, Math.min(10, value));
    setEqBands(newBands);
    try { await AsyncStorage.setItem(EQ_LEVELS_KEY, JSON.stringify(newBands)); } catch (e) {}
  };

  useEffect(() => {
    notifee.getInitialNotification().then(async (initialNotification) => {
      if (initialNotification?.notification.data?.action === 'wake_radio' && lastPlayedStation) {
        setAlarmTime(null);
        setCurrentStation(lastPlayedStation);
        setIsPlaying(true);
        await playRadioStation(lastPlayedStation);
      }
    });

    const unsubscribe = notifee.onForegroundEvent(async ({ type, detail }) => {
      if (type === EventType.DELIVERED && detail.notification?.data?.action === 'wake_radio') {
        if (lastPlayedStation) {
          setAlarmTime(null);
          setCurrentStation(lastPlayedStation);
          setIsPlaying(true);
          await playRadioStation(lastPlayedStation);
        }
        if (detail.notification?.id) await notifee.cancelNotification(detail.notification.id);
      }
    });

    return () => unsubscribe();
  }, [lastPlayedStation]);

  useEffect(() => {
    if (alarmTime && timerActionMode === 'sleep') {
      BackgroundTimer.stopBackgroundTimer();
      BackgroundTimer.runBackgroundTimer(async () => {
        const now = Date.now();
        const diff = alarmTime - now;

        if (diff <= 0) {
          setAlarmTime(null); setTimeLeft(''); setAlarmModalVisible(false);
          BackgroundTimer.stopBackgroundTimer();
          await pauseRadioStation(); setIsPlaying(false);
        } else {
          if (AppState.currentState === 'active') {
             const hours = Math.floor(diff / (1000 * 60 * 60));
             const m = Math.floor((diff % (1000 * 60 * 60)) / 60000);
             const s = Math.floor((diff % 60000) / 1000);
             setTimeLeft(`${hours > 0 ? hours + 'h ' : ''}${m}:${s < 10 ? '0' : ''}${s}`);
          }
          if (diff <= 300000) {
            const vol = Math.max(0, diff / 300000); 
            try { await TrackPlayer.setVolume(vol); } catch (e) {}
          }
        }
      }, 1000);
    } else {
      BackgroundTimer.stopBackgroundTimer();
    }
    return () => BackgroundTimer.stopBackgroundTimer();
  }, [alarmTime, timerActionMode]);

  const clearTimerManually = async () => {
    setAlarmTime(null); 
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
      await playRadioStation(station); 
    }
  };

  useEffect(() => {
    const errorListener = TrackPlayer.addEventListener(Event.PlaybackError, async (error) => {
      if (retryCountRef.current < 3) {
        retryCountRef.current += 1;
        setTimeout(async () => { try { await TrackPlayer.stop(); await TrackPlayer.play(); } catch (e) {} }, 3000);
      } else {
        retryCountRef.current = 0;
        await TrackPlayer.reset();
        setCurrentStation(null);
        setIsPlaying(false);
        setPlaybackError('Station temporarily unavailable');
        setTimeout(() => setPlaybackError(null), 4000);
      }
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
    let loops: Animated.CompositeAnimation[] = [];
    let modeInterval: ReturnType<typeof setInterval>;

    if (isPlaying) {
      let currentMode = 0; 
      
      const animateBars = () => {
        loops.forEach(l => l.stop());
        loops = [];
        
        barValues.forEach((anim, i) => {
          let getRand, getDur, ease;
          if (currentMode === 0) {
            getRand = () => Math.random() * SEGMENTS_PER_BAR;
            getDur = () => 200 + Math.random() * 150;
            ease = Easing.inOut(Easing.ease);
          } else if (currentMode === 1) {
            getRand = () => (Math.sin(i + Date.now()/1000) * 0.5 + 0.5) * SEGMENTS_PER_BAR;
            getDur = () => 400;
            ease = Easing.inOut(Easing.sin);
          } else {
            getRand = () => Math.random() > 0.5 ? SEGMENTS_PER_BAR : 2;
            getDur = () => 150 + Math.random() * 100;
            ease = Easing.bounce;
          }

          const loop = Animated.loop(
            Animated.sequence([
              Animated.timing(anim, { toValue: getRand(), duration: getDur(), easing: ease, useNativeDriver: true }),
              Animated.timing(anim, { toValue: getRand(), duration: getDur(), easing: ease, useNativeDriver: true }),
            ])
          );
          loop.start();
          loops.push(loop);
        });
      };

      animateBars();
      modeInterval = setInterval(() => {
        currentMode = (currentMode + 1) % 3;
        animateBars();
      }, 4000);

    } else {
      barValues.forEach((anim) => {
        anim.stopAnimation();
        Animated.timing(anim, { toValue: 0.1, duration: 300, useNativeDriver: true }).start();
      });
    }
    
    return () => {
      loops.forEach(l => l.stop());
      clearInterval(modeInterval);
    };
  }, [isPlaying]);

  useEffect(() => {
    let spinLoop: Animated.CompositeAnimation | null = null;
    let pulseLoop: Animated.CompositeAnimation | null = null;
    
    if (isPlaying) {
      spinLoop = Animated.loop(Animated.timing(spinAnim, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: true }));
      spinLoop.start();
      
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(drivePlayPulseAnim, { toValue: 1.25, duration: 800, useNativeDriver: true }),
          Animated.timing(drivePlayPulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
        ])
      );
      pulseLoop.start();
    } else {
      spinAnim.stopAnimation();
      drivePlayPulseAnim.stopAnimation();
      drivePlayPulseAnim.setValue(1);
    }
    return () => {
      if(spinLoop) spinLoop.stop();
      if(pulseLoop) pulseLoop.stop();
    };
  }, [isPlaying]);

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
  const heartbeatTranslateX = heartbeatAnim.interpolate({ inputRange: [0, 1], outputRange: [-250, 200] });

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
      if (savedEq) { setEqBands(JSON.parse(savedEq)); }

      const storedEqStyle = await AsyncStorage.getItem(EQ_STYLE_KEY);
      if (storedEqStyle) { setEqStyle(storedEqStyle as any); }

      const storedTheme = await AsyncStorage.getItem(THEME_KEY);
      if (storedTheme) { setAppTheme(storedTheme as any); }

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
  }

  const renderChangeText = (change: number) => {
    const isPositive = change >= 0;
    return <Text style={[styles.cryptoChange, isPositive ? styles.positive : styles.negative]}>{isPositive ? '+' : ''}{change.toFixed(1)}%</Text>;
  };

  const activePulse = PULSE_EFFECTS[pulseEffectIndex];
  const pulseColor1 = activePulse.id === 'classic' ? primaryNeon : activePulse.colors[0];
  const pulseColor2 = activePulse.id === 'classic' ? secondaryNeon : activePulse.colors[1];
  
  let defaultLogo = require('../assets/images/icon.png');
  if (appTheme === 'cyberpunk') defaultLogo = require('../assets/images/2561.jpg');
  else if (appTheme === 'winamp') defaultLogo = require('../assets/images/winamp.png');
  else if (appTheme === 'aimp') defaultLogo = require('../assets/images/aimp.png');

  const activeCryptoItems = useMemo(() => {
    const items = [];
    if (cryptoData?.sol) items.push({ symbol: 'SOL', price: cryptoData.sol.price, change: cryptoData.sol.change || 0 });
    if (cryptoData?.skr) items.push({ symbol: 'SKR', price: cryptoData.skr.price, change: cryptoData.skr.change || 0 });
    customCoins.forEach(c => items.push({ symbol: c.symbol, price: c.price, change: c.change || 0 }));
    return items;
  }, [cryptoData, customCoins]);

  const trackTitle = liveMetadata?.title || activeTrack?.title;

  return (
    <GestureHandlerRootView style={{flex: 1, backgroundColor: bgTheme}}>
      
      {isDynamicCover && currentStation && currentStation.favicon && currentStation.favicon.startsWith('http') && (
        <Image source={{ uri: currentStation.favicon }} style={[StyleSheet.absoluteFillObject, { opacity: isCyber ? 0.15 : 0.35 }]} blurRadius={90} />
      )}
      
      <SafeAreaView style={styles.container}>
        
        <View style={[styles.header, isCyber && { borderBottomColor: '#250010' }]}>
          <View style={styles.headerTopRow}>
            <View style={styles.leftHeaderSection}>
              <TouchableOpacity activeOpacity={0.9} onPress={handleLogoTap} style={styles.logoContainer}>
                <Image source={defaultLogo} style={styles.logoIcon} />
                <View style={styles.titleWrapper}>
                  <View style={styles.pulseContainer}>
                    <MaskedView style={{ flex: 1 }} maskElement={
                        <View style={styles.pulseMask}>
                          <View style={styles.pulseLine} />
                          <Ionicons name={activePulse.icon as any} size={28} color="#FFF" style={styles.pulseIcon} />
                          <View style={[styles.pulseLine, { flex: 1 }]} />
                        </View>
                      }>
                      <Animated.View style={[styles.pulseGradientWrapper, { transform: [{ translateX: heartbeatTranslateX }] }]}>
                        <LinearGradient colors={['rgba(255,255,255,0)', pulseColor1, '#FFFFFF', pulseColor2, 'rgba(255,255,255,0)']} locations={[0, 0.4, 0.5, 0.6, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
                      </Animated.View>
                    </MaskedView>
                  </View>
                  <MaskedView maskElement={<Text style={styles.headerTitle}>SEEKER BEAT</Text>}>
                    <LinearGradient colors={[primaryNeon, secondaryNeon, '#D946EF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                      <Text style={[styles.headerTitle, { opacity: 0 }]}>SEEKER BEAT</Text>
                    </LinearGradient>
                  </MaskedView>
                  <Text style={[styles.headerSubtitle, {color: primaryNeon}]}>{appTheme.toUpperCase()} EDITION</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.rightHeaderSection}>
               <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                 <View style={styles.neonEqualizer}>
                  {barValues.map((barAnim, barIdx) => (
                    <View key={`eq-col-${barIdx}`} style={styles.eqColumn}>
                      {Array.from({ length: SEGMENTS_PER_BAR }).map((_, segIdx) => {
                        const realIndex = SEGMENTS_PER_BAR - 1 - segIdx;
                        const opacity = barAnim.interpolate({ inputRange: [realIndex, realIndex + 0.9], outputRange: [0.1, 1], extrapolate: 'clamp' });
                        const segmentColor = realIndex > 6 ? secondaryNeon : primaryNeon;
                        return <Animated.View key={`seg-${barIdx}-${segIdx}`} style={[styles.eqSegment, { backgroundColor: segmentColor, opacity: opacity, shadowColor: segmentColor }]} />;
                      })}
                    </View>
                  ))}
                 </View>
               </View>
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
          <View style={styles.searchContainer}>
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
                <TouchableOpacity style={[styles.stationCard, isThisPlaying && [styles.activeCard, isCyber && {borderColor: secondaryNeon}]]} onPress={() => handleTogglePlay(item)}>
                  <Image source={item.favicon && item.favicon.startsWith('http') ? { uri: item.favicon } : defaultLogo} style={styles.stationImage} />
                  <View style={styles.stationInfo}>
                    <Text style={styles.stationName} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.stationTag, {color: primaryNeon}]} numberOfLines={1}>{item.tags ? item.tags.split(',').slice(0, 2).join(' • ').toUpperCase() : 'MUSIC'}</Text>
                  </View>
                  <TouchableOpacity style={styles.favButton} onPress={() => toggleFavorite(item)}>
                    <Ionicons name={isFav ? 'star' : 'star-outline'} size={24} color={isFav ? '#FFD700' : '#4A4A62'} />
                  </TouchableOpacity>
                  <Ionicons name={isThisPlaying ? 'pause-circle' : 'play-circle'} size={38} color={isThisPlaying ? primaryNeon : '#7000FF'} />
                </TouchableOpacity>
              );
            }}
          />
        )}

        {playbackError && ( <View style={styles.errorToast}><Text style={styles.errorToastText}>{playbackError}</Text></View> )}

        {currentStation && (
          <View style={[styles.bottomPlayerContainer, isCyber && {borderColor: secondaryNeon}]}>
            <Image source={isDynamicCover && currentStation.favicon && currentStation.favicon.startsWith('http') ? { uri: currentStation.favicon } : defaultLogo} style={StyleSheet.absoluteFillObject} blurRadius={10} />
            <View style={styles.bottomPlayerOverlay}>
              <Image source={isDynamicCover && currentStation.favicon && currentStation.favicon.startsWith('http') ? { uri: currentStation.favicon } : defaultLogo} style={styles.bottomCoverThumb} />
              <View style={styles.bottomInfoSection}>
                <Text style={styles.bottomStationTitle} numberOfLines={1}>{liveMetadata?.title || activeTrack?.title || currentStation.name}</Text>
                <Text style={[styles.bottomStationStatus, {color: primaryNeon}]}>{isPlaying ? '● LIVE' : 'PAUSED'}</Text>
              </View>

              {isCyber ? (
                 <Animated.View style={[styles.spinWrapper, { transform: [{ rotateX: spinRotation as any }, { rotateZ: spinRotation as any }] }]}>
                   <Ionicons name="hardware-chip" size={34} color={secondaryNeon} />
                 </Animated.View>
              ) : (
                 <Animated.View style={[styles.spinWrapper, { transform: [{ rotate: spinRotation as any }] }]}>
                   <Ionicons name="disc" size={38} color="#161626" />
                   <Ionicons name="radio-button-on" size={14} color={primaryNeon} style={styles.vinylCenter} />
                   <View style={[styles.vinylGlare, {backgroundColor: primaryNeon}]} />
                 </Animated.View>
              )}

              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                 <View style={[styles.bottomPlayButton, {marginRight: 6, borderColor: 'transparent', backgroundColor: 'transparent', opacity: 0.3}]}>
                   <Ionicons name="options-outline" size={26} color={primaryNeon} />
                 </View>
                 <TouchableOpacity style={[styles.bottomPlayButton, {marginRight: 8, borderColor: 'transparent', backgroundColor: 'transparent'}]} onPress={() => { Haptics.selectionAsync(); setTrackInfoVisible(true); }}>
                   <Ionicons name="information-circle-outline" size={26} color={primaryNeon} />
                 </TouchableOpacity>
                 <TouchableOpacity style={[styles.bottomPlayButton, isCyber && {borderColor: primaryNeon}]} onPress={() => handleTogglePlay(currentStation)}>
                   <Ionicons name={isPlaying ? 'pause' : 'play'} size={26} color={primaryNeon} />
                 </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <View style={[styles.footerContainer, { paddingBottom: insets.bottom > 0 ? insets.bottom + 10 : 24 }, isCyber && {backgroundColor: '#050205'}]}>
          <TouchableOpacity style={styles.footerBtnQuarter} onPress={() => { Haptics.selectionAsync(); setAlarmModalVisible(true); }} activeOpacity={0.7}>
            <Ionicons name="timer-outline" size={20} color={alarmTime ? primaryNeon : "#4A4A62"} />
            <Text style={[styles.footerAboutText, alarmTime ? { color: primaryNeon } : null]}>{alarmTime ? timeLeft : 'Timer'}</Text>
          </TouchableOpacity>
          <View style={styles.footerDivider} />
          
          <TouchableOpacity style={styles.footerBtnQuarter} onPress={handleEnterDriveMode} activeOpacity={0.7}>
            <Ionicons name="car-sport" size={24} color="#4A4A62" />
            <Text style={styles.footerAboutText}>Drive</Text>
          </TouchableOpacity>
          <View style={styles.footerDivider} />
          
          <TouchableOpacity style={styles.footerBtnQuarter} onPress={() => { Haptics.selectionAsync(); setDiscoModalVisible(true); }} activeOpacity={0.7}>
            <Ionicons name="albums-outline" size={20} color="#4A4A62" />
            <Text style={styles.footerAboutText}>Artists</Text>
          </TouchableOpacity>
          <View style={styles.footerDivider} />

          <TouchableOpacity style={styles.footerBtnQuarter} onPress={() => { Haptics.selectionAsync(); setAboutModalVisible(true); }} activeOpacity={0.7}>
            <Ionicons name="settings-outline" size={20} color="#4A4A62" />
            <Text style={styles.footerAboutText}>Settings</Text>
          </TouchableOpacity>
        </View>

        <Modal visible={isDriveMode} animationType="fade" transparent={true}>
          <SafeAreaView style={[styles.driveModeContainer, {backgroundColor: '#000'}]}>
            
            {currentStation && currentStation.favicon && currentStation.favicon.startsWith('http') && (
              <Image source={{ uri: currentStation.favicon }} style={StyleSheet.absoluteFillObject} blurRadius={15} />
            )}
            <LinearGradient colors={['rgba(10,15,25,0.85)', 'rgba(5,5,15,0.95)']} style={StyleSheet.absoluteFillObject} />

            {driveBg === 'aurora' && <AmbientAurora isPlaying={isPlaying} primaryNeon={primaryNeon} secondaryNeon={secondaryNeon} bgTheme={bgTheme} />}
            {driveBg === 'dust' && <ChampagneDust isPlaying={isPlaying} primaryNeon={primaryNeon} />}
            {driveBg === 'sunset' && <SynthwaveSunset primaryNeon={primaryNeon} secondaryNeon={secondaryNeon} bgTheme={bgTheme} />}
            {driveBg === 'pulse' && <PulseWaves isPlaying={isPlaying} primaryNeon={primaryNeon} bgTheme={bgTheme} />}
            {driveBg === 'grid' && <SynthwaveGrid isPlaying={isPlaying} primaryNeon={primaryNeon} secondaryNeon={secondaryNeon} bgTheme={bgTheme} />}

            <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
              
              {isSpeedometerEnabled && (
                <DraggableSpeedWidget currentSpeed={currentSpeed} primaryNeon={primaryNeon} windowWidth={windowWidth} windowHeight={windowHeight} />
              )}

              <View style={{position: 'absolute', top: Math.max(10, safeTopMargin - 5), right: Math.max(20, insets.right || 0), zIndex: 200, flexDirection: 'row', alignItems: 'center'}}>
                <TouchableOpacity style={{padding: 10}} onPress={() => { Haptics.selectionAsync(); setIsDriveMode(false); }} activeOpacity={0.5}>
                  <Ionicons name="close-circle" size={42} color="#8A8A9E" />
                </TouchableOpacity>
              </View>

              {isWeatherEnabled && weatherData && (
                <View style={{position: 'absolute', top: Math.max(10, safeTopMargin - 5), right: Math.max(80, (insets.right || 0) + 70), zIndex: 90}}>
                  <WeatherWidgetAdvanced data={weatherData} />
                </View>
              )}

              <View style={{ position: 'absolute', bottom: 40, width: '100%', alignItems: 'center', zIndex: 50 }} pointerEvents="box-none">
                
                {eqStyle === 'wave' && (
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 80, width: '90%', justifyContent: 'space-between', marginBottom: 15 }}>
                    {barValues.map((barAnim, barIdx) => {
                      const scaleY = barAnim.interpolate({ inputRange: [0, SEGMENTS_PER_BAR], outputRange: [0.1, 1], extrapolate: 'clamp' });
                      return <Animated.View key={`w-${barIdx}`} style={{ width: 7, height: 80, backgroundColor: primaryNeon, borderRadius: 14, opacity: 0.6, transform: [{ scaleY }] }} />;
                    })}
                  </View>
                )}

                {eqStyle === 'bars' && (
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 45, gap: 6, marginBottom: 5 }}>
                    {barValues.slice(0, 10).map((barAnim, barIdx) => (
                      <View key={`d-eq-col-${barIdx}`} style={{ width: 8, height: 45, justifyContent: 'space-between' }}>
                        {Array.from({ length: SEGMENTS_PER_BAR }).map((_, segIdx) => {
                          const realIndex = SEGMENTS_PER_BAR - 1 - segIdx;
                          const opacity = barAnim.interpolate({ inputRange: [realIndex, realIndex + 0.9], outputRange: [0.1, 1], extrapolate: 'clamp' });
                          return <Animated.View key={`d-seg-${barIdx}-${segIdx}`} style={{ width: '100%', height: 3, backgroundColor: primaryNeon, borderRadius: 1, opacity }} />;
                        })}
                      </View>
                    ))}
                  </View>
                )}

                {eqStyle === 'lines' && (
                  <View style={{ width: '100%', alignItems: 'center', marginBottom: 15, gap: 4 }}>
                    {barValues.slice(0, 5).map((barAnim, barIdx) => {
                       const w = barAnim.interpolate({ inputRange: [0, SEGMENTS_PER_BAR], outputRange: ['10%', '100%'], extrapolate: 'clamp' });
                       const o = barAnim.interpolate({ inputRange: [0, SEGMENTS_PER_BAR], outputRange: [0.2, 1], extrapolate: 'clamp' });
                       return <Animated.View key={`l-${barIdx}`} style={{ height: 2, backgroundColor: primaryNeon, width: w, opacity: o, shadowColor: primaryNeon, shadowOpacity: 1, shadowRadius: 5 }} />;
                    })}
                  </View>
                )}

                <TouchableOpacity onPress={() => { Haptics.selectionAsync(); setIsDriveStationsOpen(true); }} activeOpacity={0.7} style={{flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(20,20,30,0.5)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginBottom: trackTitle ? 8 : 20}}>
                  <Text numberOfLines={1} ellipsizeMode="tail" style={{color: primaryNeon, fontSize: 14, fontWeight: 'bold', letterSpacing: 1}}>
                    {currentStation ? currentStation.name : 'NO STATION'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={primaryNeon} style={{marginLeft: 8}} />
                </TouchableOpacity>
                
                {trackTitle ? (
                  <Text numberOfLines={2} ellipsizeMode="tail" style={{color: '#FFF', fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 15, flexShrink: 1, maxWidth: '80%', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: {width: 0, height: 2}, textShadowRadius: 10}}>
                    {trackTitle}
                  </Text>
                ) : null}

                <View style={{ justifyContent: 'center', alignItems: 'center', width: 200, height: 200 }} pointerEvents="box-none">
                  
                  {eqStyle === 'ring' && barValues.map((barAnim, barIdx) => {
                    const angle = (barIdx * (360 / NUM_BARS)) + 'deg';
                    const barHeight = barAnim.interpolate({ inputRange: [0, SEGMENTS_PER_BAR], outputRange: [5, 40], extrapolate: 'clamp' });
                    return (
                      <View key={`ring-eq-${barIdx}`} style={{ position: 'absolute', width: 200, height: 200, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: angle }], zIndex: 1 }} pointerEvents="none">
                        <Animated.View style={{ position: 'absolute', bottom: 100 + 92, width: 8, height: barHeight, backgroundColor: primaryNeon, borderRadius: 4, shadowColor: primaryNeon, shadowOpacity: 0.8, shadowRadius: 6 }} />
                      </View>
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

                  {vinylStyle !== 'off' && <VinylRecord isPlaying={isPlaying} artwork={currentStation?.favicon && currentStation.favicon.startsWith('http') ? {uri: currentStation.favicon} : defaultLogo} primaryNeon={primaryNeon} vinylStyle={vinylStyle} />}

                  <Animated.View style={{ position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: primaryNeon, opacity: 0.2, transform: [{ scale: drivePlayPulseAnim }], zIndex: 8 }} pointerEvents="none" />
                  
                  <TouchableOpacity style={[styles.driveModePlayBtn, {position: 'absolute', borderColor: primaryNeon, backgroundColor: 'rgba(10,10,15,0.9)', zIndex: 10}]} onPress={() => currentStation && handleTogglePlay(currentStation)} activeOpacity={0.7}>
                    <Ionicons name={isPlaying ? 'pause' : 'play'} size={34} color={primaryNeon} style={{marginLeft: isPlaying ? 0 : 4}} />
                  </TouchableOpacity>
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
                      <TouchableOpacity style={[styles.stationCard, {backgroundColor: '#12121A'}, isThisPlaying && {borderColor: primaryNeon}]} onPress={() => {
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
            <View style={styles.modalContent}>
              <Ionicons name="options" size={48} color={primaryNeon} style={{ alignSelf: 'center', marginBottom: 10 }} />
              <Text style={styles.modalTitle}>AUDIO EQUALIZER</Text>
              <Text style={styles.aboutSubText}>*Native Sound Processing Patch Pending</Text>
              
              <View style={styles.eqBandsContainer}>
                {eqBands.map((level, idx) => {
                  const h = Math.abs(level) * 5 + 10;
                  const isPos = level >= 0;
                  return (
                    <View key={`eq-${idx}`} style={styles.eqBandCol}>
                      <Text style={styles.eqFreqText}>{EQ_FREQUENCIES[idx]}</Text>
                      <TouchableOpacity onPress={() => updateEqBand(idx, level + 1)} style={styles.eqControlBtn}>
                        <Ionicons name="add" size={24} color="#FFF" />
                      </TouchableOpacity>
                      
                      <View style={styles.eqLevelVisualArea}>
                         {isPos ? (
                           <View style={[styles.eqLevelFill, { height: h, bottom: '50%', backgroundColor: primaryNeon, shadowColor: primaryNeon }]} />
                         ) : (
                           <View style={[styles.eqLevelFill, { height: h, top: '50%', backgroundColor: secondaryNeon, shadowColor: secondaryNeon }]} />
                         )}
                         <View style={styles.eqZeroLine} />
                      </View>

                      <TouchableOpacity onPress={() => updateEqBand(idx, level - 1)} style={styles.eqControlBtn}>
                        <Ionicons name="remove" size={24} color="#FFF" />
                      </TouchableOpacity>
                      <Text style={[styles.eqValText, {color: level === 0 ? '#8A8A9E' : '#FFF'}]}>{level > 0 ? `+${level}` : level}</Text>
                    </View>
                  );
                })}
              </View>

              <TouchableOpacity style={{ width: '100%', marginTop: 25, padding: 12, borderRadius: 8, backgroundColor: '#252538', alignItems: 'center' }} onPress={() => setEqualizerVisible(false)}>
                <Text style={styles.modalBtnText}>Close</Text>
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
                       <TouchableOpacity style={styles.discoActionBtn} onPress={() => openExternalApp('youtube', item.artistName, item.trackName)}>
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
              <TouchableOpacity style={[styles.modalBtnCancel, { marginTop: 15 }]} onPress={() => setDiscoModalVisible(false)}><Text style={styles.modalBtnText}>Close</Text></TouchableOpacity>
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
            <View style={styles.modalContent}>
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
                {timerActionMode === 'wake' ? 'Radio will start playing automatically.' : 'Radio will slowly fade out in the last 5 minutes.'}
              </Text>

              {lastPlayedStation ? ( <Text style={[styles.timerTargetStation, {color: primaryNeon}]}>Target: {lastPlayedStation.name}</Text> ) : ( <Text style={[styles.timerTargetStation, {color: secondaryNeon}]}>Please play a station first!</Text> )}
              
              <View style={styles.timerPresetsContainer}>
                {[1, 5, 15, 30].map((min) => (
                  <TouchableOpacity key={min} style={styles.timerPresetBtn} onPress={() => handleSetTimer(min)} disabled={!lastPlayedStation}><Text style={styles.timerPresetText}>+{min}m</Text></TouchableOpacity>
                ))}
              </View>
              
              <View style={styles.customInputRow}>
                <Text style={styles.customInputLabel}>Custom (mins):</Text>
                <TextInput style={styles.customTextInput} placeholder="e.g. 45" placeholderTextColor="#8A8A9E" keyboardType="numeric" value={customTimerVal} onChangeText={setCustomTimerVal} />
                <TouchableOpacity style={[styles.customInputOkBtn, {backgroundColor: primaryNeon}]} onPress={() => handleSetCustomTimer()} disabled={!lastPlayedStation}><Text style={styles.customInputOkText}>OK</Text></TouchableOpacity>
              </View>
              <View style={styles.customInputRow}>
                <Text style={styles.customInputLabel}>Alarm (HH:MM):</Text>
                <TextInput style={styles.customTextInput} placeholder="07:30" placeholderTextColor="#8A8A9E" maxLength={5} value={alarmClockVal} onChangeText={setAlarmClockVal} />
                <TouchableOpacity style={[styles.customInputOkBtn, {backgroundColor: primaryNeon}]} onPress={() => handleSetAlarmClock()} disabled={!lastPlayedStation}><Text style={styles.customInputOkText}>OK</Text></TouchableOpacity>
              </View>
              
              {alarmTime && (
                <TouchableOpacity style={[styles.cancelTimerBtn, {borderColor: secondaryNeon}]} onPress={clearTimerManually}>
                  <Text style={[styles.cancelTimerText, {color: secondaryNeon}]}>Cancel Active Timer</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={{ width: '100%', marginTop: 15, padding: 12, borderRadius: 8, backgroundColor: '#252538', alignItems: 'center' }} onPress={() => setAlarmModalVisible(false)}><Text style={styles.modalBtnText}>Close</Text></TouchableOpacity>
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
                
                <View style={{backgroundColor: '#252538', padding: 12, borderRadius: 8, marginBottom: 10}}>
                  <Text style={{color: '#FFF', fontWeight: 'bold', fontSize: 13, marginBottom: 8}}>App Theme</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8}}>
                     <TouchableOpacity style={[{paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center', borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, appTheme === 'default' && {borderColor: '#00F0FF'}]} onPress={() => handleThemeChange('default')}>
                        <Text style={{color: '#00F0FF', fontSize: 10, fontWeight: 'bold'}}>NEON</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[{paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center', borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, appTheme === 'cyberpunk' && {borderColor: '#FCEE0A'}]} onPress={() => handleThemeChange('cyberpunk')}>
                        <Text style={{color: '#FCEE0A', fontSize: 10, fontWeight: 'bold'}}>CYBER</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[{paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center', borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, appTheme === 'winamp' && {borderColor: '#00FF00'}]} onPress={() => handleThemeChange('winamp')}>
                        <Text style={{color: '#00FF00', fontSize: 10, fontWeight: 'bold'}}>WINAMP</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[{paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center', borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, appTheme === 'aimp' && {borderColor: '#FF6600'}]} onPress={() => handleThemeChange('aimp')}>
                        <Text style={{color: '#FF6600', fontSize: 10, fontWeight: 'bold'}}>AIMP</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[{paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center', borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, appTheme === 'matrix' && {borderColor: '#00FF41'}]} onPress={() => handleThemeChange('matrix')}>
                        <Text style={{color: '#00FF41', fontSize: 10, fontWeight: 'bold'}}>MATRIX</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[{paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center', borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, appTheme === 'synthwave' && {borderColor: '#FF00FF'}]} onPress={() => handleThemeChange('synthwave')}>
                        <Text style={{color: '#FF00FF', fontSize: 10, fontWeight: 'bold'}}>MIAMI</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[{paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center', borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, appTheme === 'dracula' && {borderColor: '#FF79C6'}]} onPress={() => handleThemeChange('dracula')}>
                        <Text style={{color: '#FF79C6', fontSize: 10, fontWeight: 'bold'}}>DRACULA</Text>
                     </TouchableOpacity>
                  </ScrollView>
                </View>

                <View style={{backgroundColor: '#252538', padding: 12, borderRadius: 8, marginBottom: 10}}>
                  <Text style={{color: '#FFF', fontWeight: 'bold', fontSize: 13, marginBottom: 8}}>Drive Background</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8}}>
                     <TouchableOpacity style={[{paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, driveBg === 'aurora' && {borderColor: primaryNeon}]} onPress={() => {setDriveBg('aurora'); AsyncStorage.setItem(DRIVE_BG_KEY, 'aurora')}}>
                        <Text style={{color: driveBg === 'aurora' ? primaryNeon : '#8A8A9E', fontSize: 10, fontWeight: 'bold'}}>AURORA</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[{paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, driveBg === 'dust' && {borderColor: primaryNeon}]} onPress={() => {setDriveBg('dust'); AsyncStorage.setItem(DRIVE_BG_KEY, 'dust')}}>
                        <Text style={{color: driveBg === 'dust' ? primaryNeon : '#8A8A9E', fontSize: 10, fontWeight: 'bold'}}>BUBBLES</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[{paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, driveBg === 'sunset' && {borderColor: primaryNeon}]} onPress={() => {setDriveBg('sunset'); AsyncStorage.setItem(DRIVE_BG_KEY, 'sunset')}}>
                        <Text style={{color: driveBg === 'sunset' ? primaryNeon : '#8A8A9E', fontSize: 10, fontWeight: 'bold'}}>SUNSET</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[{paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, driveBg === 'pulse' && {borderColor: primaryNeon}]} onPress={() => {setDriveBg('pulse'); AsyncStorage.setItem(DRIVE_BG_KEY, 'pulse')}}>
                        <Text style={{color: driveBg === 'pulse' ? primaryNeon : '#8A8A9E', fontSize: 10, fontWeight: 'bold'}}>PULSE</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[{paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, driveBg === 'grid' && {borderColor: primaryNeon}]} onPress={() => {setDriveBg('grid'); AsyncStorage.setItem(DRIVE_BG_KEY, 'grid')}}>
                        <Text style={{color: driveBg === 'grid' ? primaryNeon : '#8A8A9E', fontSize: 10, fontWeight: 'bold'}}>GRID</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[{paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, driveBg === 'none' && {borderColor: primaryNeon}]} onPress={() => {setDriveBg('none'); AsyncStorage.setItem(DRIVE_BG_KEY, 'none')}}>
                        <Text style={{color: driveBg === 'none' ? primaryNeon : '#8A8A9E', fontSize: 10, fontWeight: 'bold'}}>NONE</Text>
                     </TouchableOpacity>
                  </ScrollView>
                </View>

                <View style={{backgroundColor: '#252538', padding: 12, borderRadius: 8, marginBottom: 10}}>
                  <Text style={{color: '#FFF', fontWeight: 'bold', fontSize: 13, marginBottom: 8}}>Visualizer Style (Drive)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8}}>
                    {['bars', 'wave', 'ring', 'orb', 'lines', 'off'].map(s => (
                      <TouchableOpacity key={s} style={[{paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, eqStyle === s && {borderColor: primaryNeon}]} onPress={() => handleEqChange(s)}>
                        <Text style={{color: eqStyle === s ? primaryNeon : '#8A8A9E', fontSize: 10, fontWeight: 'bold'}}>{s.toUpperCase()}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={{backgroundColor: '#252538', padding: 12, borderRadius: 8, marginBottom: 10}}>
                  <Text style={{color: '#FFF', fontWeight: 'bold', fontSize: 13, marginBottom: 8}}>Interactive Vinyl Style</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8}}>
                    {['classic', 'gold', 'neon', 'off'].map(s => (
                      <TouchableOpacity key={s} style={[{paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'transparent'}, vinylStyle === s && {borderColor: primaryNeon}]} onPress={() => handleVinylChange(s)}>
                        <Text style={{color: vinylStyle === s ? primaryNeon : '#8A8A9E', fontSize: 10, fontWeight: 'bold'}}>{s.toUpperCase()}</Text>
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

                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#252538', padding: 12, borderRadius: 8, marginBottom: 10}}>
                  <View style={{flex: 1, paddingRight: 10}}>
                    <Text style={{color: '#FFF', fontWeight: 'bold', fontSize: 13}}>Live Weather Widget</Text>
                    <Text style={{color: '#8A8A9E', fontSize: 10, marginTop: 2}}>Show weather in Drive Mode</Text>
                  </View>
                  <Switch value={isWeatherEnabled} onValueChange={toggleWeather} trackColor={{ false: '#161626', true: primaryNeon }} thumbColor="#FFF" />
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
  pulseMask: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent' },
  pulseLine: { height: 2, width: 28, backgroundColor: '#FFF', borderRadius: 1 },
  pulseIcon: { marginHorizontal: -5, marginTop: 2 },
  pulseGradientWrapper: { position: 'absolute', top: 0, left: 0, height: '100%', width: 400 }, 

  neonEqualizer: { flexDirection: 'row', alignItems: 'flex-end', height: 55, gap: 3 },
  eqColumn: { width: 5, height: '100%', justifyContent: 'space-between' },
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
  
  bottomPlayerContainer: { height: 64, marginHorizontal: 12, marginBottom: 24, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0, 240, 255, 0.3)' },
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
  timerModeText: { color: '#8A8A9E', fontWeight: 'bold', fontSize: 12, marginTop: 4 },
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