import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from 'react-native';
import { Audio } from 'expo-av';
import {
  Station,
  GENRES,
  COUNTRIES,
  fetchRadioStations,
  fetchStationsByCountry,
} from '../services/radioApi';

const DEFAULT_STATION_ICON = 'https://cdn-icons-png.flaticon.com/512/3208/3208726.png';

// Совместимость и адаптеры данных
export const getPopularCountries = () => COUNTRIES;
export const getCategories = () => GENRES;

export const getStations = async (params: { country?: string; tag?: string; name?: string; limit?: number }) => {
  const { country, tag, name } = params || {};

  if (country) {
    return await fetchStationsByCountry(country);
  }

  const query = name?.trim() || tag || 'rock';
  return await fetchRadioStations(query);
};

export default function RadioScreen() {
  const [countries] = useState(getPopularCountries());
  const [categories, setCategories] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const [currentStation, setCurrentStation] = useState<any>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function initAudio() {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
        });
      } catch (e) {
        console.error('Audio init error:', e);
      }
    }

    initAudio();
    loadFilters();
    loadRadioStations('', '', '');

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  const loadFilters = async () => {
    const categoryList = await getCategories();
    setCategories(categoryList);
  };

  const loadRadioStations = async (country = selectedCountry, tag = selectedCategory, name = searchQuery) => {
    setLoading(true);
    const data = await getStations({ country, tag, name, limit: 100 });
    setStations(data);
    setLoading(false);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    loadRadioStations(selectedCountry, selectedCategory, text);
  };

  const handleSelectCountry = (code: string) => {
    const newCountry = selectedCountry === code ? '' : code;
    setSelectedCountry(newCountry);
    loadRadioStations(newCountry, selectedCategory, searchQuery);
  };

  const handleSelectCategory = (name: string) => {
    const newTag = selectedCategory === name ? '' : name;
    setSelectedCategory(newTag);
    loadRadioStations(selectedCountry, newTag, searchQuery);
  };

  const playStation = async (station: any) => {
    try {
      setIsBuffering(true);

      // 1. Сбрасываем предыдущий звук
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

      setCurrentStation(station);

      // 2. Явно активируем режим воспроизведения аудио на Android
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // 3. Загружаем и запускаем поток
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: station.url },
        {
          shouldPlay: true,
          progressUpdateIntervalMillis: 1000,
        },
        (status) => {
          if (status.isLoaded) {
            setIsPlaying(status.isPlaying);
            setIsBuffering(status.isBuffering);
          } else if (status.error) {
            console.error(`Status error for ${station.name}:`, status.error);
          }
        }
      );

      setSound(newSound);
      await newSound.playAsync();
      setIsPlaying(true);
      setIsBuffering(false);
    } catch (error) {
      console.error('Playback failed:', error);
      setIsBuffering(false);
      setIsPlaying(false);
    }
  };

  const togglePlayPause = async () => {
    if (!sound) return;
    if (isPlaying) {
      await sound.pauseAsync();
      setIsPlaying(false);
    } else {
      await sound.playAsync();
      setIsPlaying(true);
    }
  };

  const getStationImage = (item: any) => {
    const uri = item.icon || item.favicon;
    return uri && typeof uri === 'string' && uri.startsWith('http') ? uri : DEFAULT_STATION_ICON;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Seeker Beat Radio</Text>

      {/* Строка поиска */}
      <TextInput
        style={styles.searchInput}
        placeholder="Поиск радио или города..."
        placeholderTextColor="#777"
        value={searchQuery}
        onChangeText={handleSearch}
      />

      {/* Выбор страны */}
      <Text style={styles.sectionTitle}>Страна</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {Array.isArray(countries) &&
          countries.map((c: any) => (
            <TouchableOpacity
              key={c.code || 'all'}
              style={[styles.chip, selectedCountry === c.code && styles.chipActive]}
              onPress={() => handleSelectCountry(c.code)}
            >
              <Text style={selectedCountry === c.code ? styles.chipTextActive : styles.chipText}>
                {c.label || c.name}
              </Text>
            </TouchableOpacity>
          ))}
      </ScrollView>

      {/* Выбор жанра */}
      <Text style={styles.sectionTitle}>Жанр</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id || cat.name}
            style={[styles.chip, selectedCategory === cat.name && styles.chipActive]}
            onPress={() => handleSelectCategory(cat.name)}
          >
            <Text style={selectedCategory === cat.name ? styles.chipTextActive : styles.chipText}>
              #{cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Список станций */}
      {loading ? (
        <ActivityIndicator size="large" color="#6200ee" style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={stations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 110 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.stationItem} onPress={() => playStation(item)}>
              <Image source={{ uri: getStationImage(item) }} style={styles.stationLogo} />
              <View style={styles.stationInfo}>
                <Text style={styles.stationName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.stationTags} numberOfLines={1}>
                  {item.bitrate ? `${item.bitrate} kbps • ` : ''}
                  {item.tags || 'MUSIC'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Mini Player */}
      {currentStation && (
        <View style={styles.miniPlayer}>
          <Image source={{ uri: getStationImage(currentStation) }} style={styles.miniLogo} />
          <View style={styles.miniInfo}>
            <Text style={styles.miniTitle} numberOfLines={1}>
              {currentStation.name}
            </Text>
            <Text style={styles.miniStatus}>
              {isBuffering ? 'Подключение...' : isPlaying ? '● В эфире' : 'Пауза'}
            </Text>
          </View>
          <TouchableOpacity style={styles.playButton} onPress={togglePlayPause}>
            {isBuffering ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.playButtonText}>{isPlaying ? '⏸' : '▶'}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', paddingTop: 50, paddingHorizontal: 16 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  searchInput: {
    backgroundColor: '#1e1e1e',
    color: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 42,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  sectionTitle: { fontSize: 13, color: '#888', marginTop: 6, marginBottom: 6, fontWeight: '600' },
  filterRow: { maxHeight: 38, marginBottom: 6 },
  chip: {
    backgroundColor: '#222',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    height: 32,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: '#6200ee' },
  chipText: { color: '#ccc', fontSize: 12 },
  chipTextActive: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  stationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  stationLogo: { width: 46, height: 46, borderRadius: 8, backgroundColor: '#252525' },
  stationInfo: { marginLeft: 12, flex: 1 },
  stationName: { color: '#fff', fontSize: 15, fontWeight: '500' },
  stationTags: { color: '#777', fontSize: 12, marginTop: 2 },
  miniPlayer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    height: 64,
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  miniLogo: { width: 40, height: 40, borderRadius: 6, backgroundColor: '#333' },
  miniInfo: { flex: 1, marginLeft: 12 },
  miniTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  miniStatus: { color: '#00e676', fontSize: 11, marginTop: 2 },
  playButton: { padding: 10 },
  playButtonText: { color: '#fff', fontSize: 22 },
});