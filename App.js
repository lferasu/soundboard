import { useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, Text, Pressable, View, TextInput, useWindowDimensions } from 'react-native';
import { Audio } from 'expo-av';

const BUTTON_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#ec4899', '#a855f7', '#3b82f6', '#14b8a6', '#0ea5e9', '#f43f5e'];
const FREESOUND_API_BASE = 'https://freesound.org/apiv2/search/';
const MOOD_OPTIONS = ['funny', 'scary', 'random'];
const DESIRED_SOUND_COUNT = 9;

const MIN_BUTTON_SIZE = 72;
const MAX_BUTTON_SIZE = 132;
const GRID_GAP = 12;
const OUTER_PADDING = 12;
const CARD_PADDING = 12;
const HEADER_HEIGHT = 88;
const SWITCH_FADE_MS = 140;

function shuffleArray(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function toLabel(name, fallbackIndex) {
  const withoutExtension = (name || '').replace(/\.[a-z0-9]{2,5}$/i, '');
  const trimmed = withoutExtension.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!trimmed) {
    return `SOUND ${fallbackIndex + 1}`;
  }
  return trimmed.slice(0, 14).toUpperCase();
}

function calculateLayout(width, height, maxCount) {
  const gridWidth = Math.max(240, width - OUTER_PADDING * 2 - CARD_PADDING * 2);
  const gridHeight = Math.max(140, height - OUTER_PADDING * 2 - CARD_PADDING * 2 - HEADER_HEIGHT);

  const minimumCount = Math.min(4, maxCount);
  let best = {
    count: minimumCount,
    columns: Math.max(1, Math.min(2, minimumCount)),
    rows: Math.max(1, Math.ceil(minimumCount / 2)),
    size: MIN_BUTTON_SIZE
  };

  for (let count = maxCount; count >= minimumCount; count -= 1) {
    let bestForCount = null;

    for (let columns = 2; columns <= Math.min(6, count); columns += 1) {
      const rows = Math.ceil(count / columns);
      const sizeByWidth = (gridWidth - GRID_GAP * (columns - 1)) / columns;
      const sizeByHeight = (gridHeight - GRID_GAP * (rows - 1)) / rows;
      const candidateSize = Math.floor(Math.min(sizeByWidth, sizeByHeight));

      if (candidateSize < MIN_BUTTON_SIZE) {
        continue;
      }

      if (!bestForCount || candidateSize > bestForCount.size) {
        bestForCount = { count, columns, rows, size: Math.min(candidateSize, MAX_BUTTON_SIZE) };
      }
    }

    if (bestForCount) {
      return bestForCount;
    }
  }

  return best;
}

export default function App() {
  const { width, height } = useWindowDimensions();
  const soundsRef = useRef({});
  const currentSoundIdRef = useRef(null);
  const playRequestRef = useRef(0);

  const [freesoundItems, setFreesoundItems] = useState([]);
  const [statusText, setStatusText] = useState('Press Start to load sounds');
  const [playerName, setPlayerName] = useState('');
  const [selectedMood, setSelectedMood] = useState('funny');
  const [activeMood, setActiveMood] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [hasStarted, setHasStarted] = useState(false);

  const resolvedName = playerName.trim() || 'Player';

  useEffect(() => {
    if (!hasStarted || !activeMood) {
      return undefined;
    }

    let isMounted = true;

    const loadFreesoundItems = async () => {
      const apiKey = process.env.EXPO_PUBLIC_FREESOUND_API_KEY;
      if (!apiKey) {
        if (isMounted) {
          setStatusText('Set EXPO_PUBLIC_FREESOUND_API_KEY to load sounds');
        }
        return;
      }

      try {
        const params = new URLSearchParams({
          fields: 'id,name,previews',
          page_size: '100',
          filter: 'duration:[0 TO 10]',
          query: activeQuery,
          token: apiKey
        });

        const response = await fetch(`${FREESOUND_API_BASE}?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const results = Array.isArray(data.results) ? data.results : [];

        const usable = results
          .map((item) => {
            const previews = item.previews || {};
            const uri = previews['preview-hq-mp3'] || previews['preview-lq-mp3'] || null;
            return {
              id: String(item.id),
              name: item.name,
              uri
            };
          })
          .filter((item) => item.uri);

        if (!usable.length) {
          throw new Error('No previewable sounds found');
        }

        const picked = shuffleArray(usable).slice(0, DESIRED_SOUND_COUNT);
        const shuffledColors = shuffleArray(BUTTON_COLORS);

        const mapped = picked.map((item, index) => ({
          id: item.id,
          label: toLabel(item.name, index),
          uri: item.uri,
          color: shuffledColors[index % shuffledColors.length]
        }));

        if (isMounted) {
          setFreesoundItems(mapped);
          setStatusText('Tap a button to play');
        }
      } catch (error) {
        console.error('Failed to fetch Freesound sounds', error);
        if (isMounted) {
          setStatusText('Could not load Freesound sounds');
        }
      }
    };

    loadFreesoundItems();

    return () => {
      isMounted = false;
    };
  }, [hasStarted, activeMood, activeQuery]);

  useEffect(() => {
    if (!hasStarted) {
      return undefined;
    }

    let isMounted = true;

    const loadSounds = async () => {
      if (!freesoundItems.length) {
        return;
      }

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false
      });

      await Promise.all(
        freesoundItems.map(async ({ id, uri }) => {
          const { sound } = await Audio.Sound.createAsync(
            { uri },
            { shouldPlay: false },
            null,
            false
          );

          if (isMounted) {
            soundsRef.current[id] = sound;
          } else {
            await sound.unloadAsync();
          }
        })
      );
    };

    loadSounds().catch((error) => {
      console.error('Failed to preload sounds', error);
      if (isMounted) {
        setStatusText('Could not preload sounds');
      }
    });

    return () => {
      isMounted = false;
      Object.values(soundsRef.current).forEach((sound) => {
        sound.unloadAsync().catch(() => {});
      });
      soundsRef.current = {};
    };
  }, [freesoundItems, hasStarted]);

  const layout = useMemo(() => calculateLayout(width, height, freesoundItems.length), [width, height, freesoundItems.length]);
  const visibleSounds = useMemo(() => freesoundItems.slice(0, layout.count), [freesoundItems, layout.count]);

  const fadeOutAndStop = async (sound, durationMs = SWITCH_FADE_MS) => {
    const steps = 7;
    const stepDelay = Math.max(8, Math.floor(durationMs / steps));

    for (let step = 1; step <= steps; step += 1) {
      const volume = 1 - step / steps;
      await sound.setVolumeAsync(volume);
      await new Promise((resolve) => setTimeout(resolve, stepDelay));
    }

    await sound.stopAsync();
    await sound.setPositionAsync(0);
    await sound.setVolumeAsync(1);
  };

  const playSound = async (id) => {
    const requestId = playRequestRef.current + 1;
    playRequestRef.current = requestId;

    try {
      const sound = soundsRef.current[id];
      if (!sound) {
        return;
      }

      const currentId = currentSoundIdRef.current;
      if (currentId && currentId !== id) {
        const currentSound = soundsRef.current[currentId];
        if (currentSound) {
          await fadeOutAndStop(currentSound);
        }
      }

      if (requestId !== playRequestRef.current) {
        return;
      }

      currentSoundIdRef.current = id;
      await sound.replayAsync();
    } catch (error) {
      console.error('Failed to play sound', error);
    }
  };

  const handleBackToStarter = () => {
    playRequestRef.current += 1;
    currentSoundIdRef.current = null;
    Object.values(soundsRef.current).forEach((sound) => {
      sound.stopAsync().catch(() => {});
      sound.unloadAsync().catch(() => {});
    });
    soundsRef.current = {};

    setFreesoundItems([]);
    setHasStarted(false);
    setActiveMood('');
    setActiveQuery('');
    setStatusText('Press Start to load sounds');
  };

  const handleStart = () => {
    const query = selectedMood === 'random' ? 'random' : selectedMood;

    setHasStarted(true);
    setActiveMood(selectedMood);
    setActiveQuery(query);
    setFreesoundItems([]);
    setStatusText(`Loading ${selectedMood} sounds...`);
    currentSoundIdRef.current = null;
  };

  if (!hasStarted) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.starterCard}>
          <Text style={styles.starterTitle}>INSTANT SOUNDBOARD</Text>
          <Text style={styles.starterSubtitle}>Enter your name and choose a mood</Text>

          <TextInput
            style={styles.nameInput}
            value={playerName}
            onChangeText={setPlayerName}
            placeholder="Your name"
            placeholderTextColor="#94a3b8"
            autoCapitalize="words"
            maxLength={24}
          />

          <View style={styles.moodRow}>
            {MOOD_OPTIONS.map((mood) => (
              <Pressable
                key={mood}
                onPress={() => setSelectedMood(mood)}
                style={({ pressed }) => [
                  styles.moodButton,
                  selectedMood === mood && styles.moodButtonSelected,
                  pressed && styles.moodButtonPressed
                ]}
              >
                <Text style={styles.moodButtonText}>{mood.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable onPress={handleStart} style={({ pressed }) => [styles.startButton, pressed && styles.startButtonPressed]}>
            <Text style={styles.startButtonText}>START</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerMetaRow}>
            <View style={styles.headerMetaLeftGroup}>
              <Text style={styles.headerMetaLeft}>{`Name: ${resolvedName}`}</Text>
              <Text style={styles.headerMetaLeft}>{`Mood: ${activeMood}`}</Text>
            </View>
            <Pressable onPress={handleBackToStarter} style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}>
              <Text style={styles.backButtonText}>BACK</Text>
            </Pressable>
          </View>
          <Text style={styles.title}>INSTANT SOUNDBOARD</Text>
          <Text style={styles.subtitle}>{freesoundItems.length ? `${layout.count} of ${freesoundItems.length} loaded` : statusText}</Text>
        </View>

        <View style={styles.grid}>
          {visibleSounds.map((sound) => (
            <Pressable
              key={sound.id}
              style={({ pressed }) => [
                styles.button,
                {
                  width: layout.size,
                  height: layout.size,
                  borderRadius: layout.size / 2,
                  backgroundColor: sound.color
                },
                pressed && styles.buttonPressed
              ]}
              onPress={() => playSound(sound.id)}
              accessibilityRole="button"
              accessibilityLabel={`Play ${sound.label} sound`}
            >
              <View style={styles.innerRing} />
              <View style={styles.gloss} />
              <View style={styles.buttonTextWrap}>
                <Text
                  style={styles.buttonText}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.62}
                >
                  {sound.label}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: OUTER_PADDING
  },
  card: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: '#111827',
    borderWidth: 3,
    borderColor: '#374151',
    padding: CARD_PADDING
  },
  starterCard: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: '#111827',
    borderWidth: 3,
    borderColor: '#374151',
    padding: 18,
    justifyContent: 'center'
  },
  starterTitle: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#f8fafc',
    textAlign: 'center'
  },
  starterSubtitle: {
    marginTop: 6,
    marginBottom: 20,
    fontSize: 15,
    fontWeight: '600',
    color: '#cbd5e1',
    textAlign: 'center'
  },
  nameInput: {
    borderWidth: 2,
    borderColor: '#475569',
    backgroundColor: '#0b1220',
    color: '#f8fafc',
    borderRadius: 12,
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  moodRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    columnGap: 10
  },
  moodButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#475569',
    backgroundColor: '#1f2937',
    paddingVertical: 10,
    alignItems: 'center'
  },
  moodButtonSelected: {
    borderColor: '#f59e0b',
    backgroundColor: '#374151'
  },
  moodButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }]
  },
  moodButtonText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  startButton: {
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: '#f97316',
    paddingVertical: 13,
    alignItems: 'center'
  },
  startButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }]
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.7
  },
  header: {
    minHeight: HEADER_HEIGHT,
    justifyContent: 'center',
    paddingTop: 4,
    paddingBottom: 8
  },
  headerMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  headerMetaLeftGroup: {
    flexDirection: 'column',
    justifyContent: 'center'
  },
  headerMetaLeft: {
    fontSize: 13,
    fontWeight: '800',
    color: '#f8fafc'
  },
  title: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#f8fafc',
    textAlign: 'center'
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
    color: '#cbd5e1',
    textAlign: 'center'
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#64748b',
    backgroundColor: '#1e293b'
  },
  backButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }]
  },
  backButtonText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4
  },
  grid: {
    flex: 1,
    justifyContent: 'center',
    alignContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: GRID_GAP,
    rowGap: GRID_GAP,
    paddingVertical: 6
  },
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#7f1d1d',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
    overflow: 'hidden'
  },
  innerRing: {
    position: 'absolute',
    top: '8%',
    left: '8%',
    right: '8%',
    bottom: '8%',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)'
  },
  gloss: {
    position: 'absolute',
    top: '13%',
    left: '18%',
    width: '64%',
    height: '24%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.32)'
  },
  buttonPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.95
  },
  buttonTextWrap: {
    width: '72%',
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonText: {
    fontSize: 17,
    lineHeight: 20,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.2,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3
  }
});
