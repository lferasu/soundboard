import { useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, Text, Pressable, View, TextInput, Image, useWindowDimensions } from 'react-native';
import { Audio } from 'expo-av';
import { Asset } from 'expo-asset';
import { GRID_GAP, shuffleArray, toLabel, calculateAdaptiveGrid } from './utils/soundboardUtils';

const BUTTON_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#ec4899', '#a855f7', '#3b82f6', '#14b8a6', '#0ea5e9', '#f43f5e'];
const FREESOUND_API_BASE = 'https://freesound.org/apiv2/search/';
const PRESET_MOODS = ['funny', 'scary', 'random'];
const DESIRED_SOUND_COUNT = 20;
const TINGLE_IMAGE = require('./assets/images/tinkle.png');
const TINKLE_LOAD_GIF = require('./assets/images/tinkle_load.gif');

const OUTER_PADDING = 12;
const CARD_PADDING = 12;
const HEADER_HEIGHT = 82;
const CONTENT_GAP = 10;
const SWITCH_FADE_MS = 140;
const MIN_BUTTONS_PANEL_WIDTH = 180;
const MIN_CONTROLS_PANEL_WIDTH = 150;
const MIN_BUTTON_LIMIT = 1;
const MAX_BUTTON_LIMIT = 20;

export default function App() {
  const { width, height } = useWindowDimensions();
  const soundsRef = useRef({});
  const currentSoundIdRef = useRef(null);
  const playRequestRef = useRef(0);
  const hasAutoLoadedRef = useRef(false);

  const [freesoundItems, setFreesoundItems] = useState([]);
  const [statusText, setStatusText] = useState('Choose a mood and tap Load');
  const [activeMood, setActiveMood] = useState('');
  const [customMood, setCustomMood] = useState('');
  const [buttonsPanelSize, setButtonsPanelSize] = useState({ width: 0, height: 0 });
  const [isFetchingMood, setIsFetchingMood] = useState(false);
  const [isLoaderReady, setIsLoaderReady] = useState(false);
  const [buttonLimit, setButtonLimit] = useState(9);

  const contentWidth = Math.max(300, width - OUTER_PADDING * 2 - CARD_PADDING * 2);
  const contentHeight = Math.max(180, height - OUTER_PADDING * 2 - CARD_PADDING * 2 - HEADER_HEIGHT);
  const desiredControlWidth = Math.min(320, Math.max(180, Math.floor(contentWidth * 0.3)));
  const maxControlWidth = Math.max(MIN_CONTROLS_PANEL_WIDTH, contentWidth - MIN_BUTTONS_PANEL_WIDTH - CONTENT_GAP);
  const controlPanelBasis = Math.min(desiredControlWidth, maxControlWidth);
  const estimatedButtonsPanelWidth = Math.max(MIN_BUTTONS_PANEL_WIDTH, contentWidth - controlPanelBasis - CONTENT_GAP);
  const effectiveButtonsPanelWidth = buttonsPanelSize.width || estimatedButtonsPanelWidth;
  const effectiveButtonsPanelHeight = buttonsPanelSize.height || contentHeight;

  const layout = useMemo(
    () => calculateAdaptiveGrid(effectiveButtonsPanelWidth, effectiveButtonsPanelHeight, Math.min(freesoundItems.length, buttonLimit)),
    [effectiveButtonsPanelWidth, effectiveButtonsPanelHeight, freesoundItems.length, buttonLimit]
  );

  const visibleSounds = useMemo(() => freesoundItems.slice(0, layout.count), [freesoundItems, layout.count]);

  useEffect(() => {
    let isMounted = true;
    Asset.loadAsync([TINKLE_LOAD_GIF])
      .catch(() => {})
      .finally(() => {
        if (isMounted) {
          setIsLoaderReady(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      Object.values(soundsRef.current).forEach((sound) => {
        sound.unloadAsync().catch(() => {});
      });
      soundsRef.current = {};
    };
  }, []);

  useEffect(() => {
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
          const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: false }, null, false);
          if (isMounted) {
            soundsRef.current[id] = sound;
          } else {
            await sound.unloadAsync();
          }
        })
      );

      if (isMounted) {
        setStatusText('Tap a button to play');
      }
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
      currentSoundIdRef.current = null;
    };
  }, [freesoundItems]);

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

  const loadMood = async (rawMood) => {
    const mood = (rawMood || '').trim().toLowerCase();
    if (!mood) {
      setStatusText('Enter a mood or pick a preset');
      return;
    }

    const apiKey = process.env.EXPO_PUBLIC_FREESOUND_API_KEY;
    if (!apiKey) {
      setStatusText('Set EXPO_PUBLIC_FREESOUND_API_KEY to load sounds');
      return;
    }

    setIsFetchingMood(true);
    playRequestRef.current += 1;
    currentSoundIdRef.current = null;

    Object.values(soundsRef.current).forEach((sound) => {
      sound.stopAsync().catch(() => {});
      sound.unloadAsync().catch(() => {});
    });
    soundsRef.current = {};

    setActiveMood(mood);
    setStatusText(`Loading ${mood} sounds...`);
    

    try {
      const params = new URLSearchParams({
        fields: 'id,name,previews',
        page_size: '100',
        filter: 'duration:[0 TO 10]',
        query: mood,
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

      setFreesoundItems(mapped);
      setCustomMood(mood);
    } catch (error) {
      console.error('Failed to fetch Freesound sounds', error);
      setStatusText('Could not load Freesound sounds');
    } finally {
      setIsFetchingMood(false);
    }
  };

  useEffect(() => {
    if (hasAutoLoadedRef.current) {
      return;
    }
    hasAutoLoadedRef.current = true;

    const autoMood = PRESET_MOODS[Math.floor(Math.random() * PRESET_MOODS.length)];
    setCustomMood(autoMood);
    loadMood(autoMood);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerSideSpacer} />
            <View style={styles.titleRow}>
              <Text style={styles.title}>The Dinkleberry Soundboard</Text>
              <Image source={TINGLE_IMAGE} style={styles.inlineTitleImage} resizeMode="contain" />
            </View>
            <View style={styles.buttonLimitWidget}>
              <Text style={styles.buttonLimitLabel}>Buttons</Text>
              <View style={styles.buttonLimitControls}>
                <Pressable
                  onPress={() => setButtonLimit((current) => Math.max(MIN_BUTTON_LIMIT, current - 1))}
                  style={({ pressed }) => [styles.buttonLimitControl, pressed && styles.buttonLimitControlPressed]}
                >
                  <Text style={styles.buttonLimitControlText}>−</Text>
                </Pressable>
                <Text style={styles.buttonLimitValue}>{buttonLimit}</Text>
                <Pressable
                  onPress={() => setButtonLimit((current) => Math.min(MAX_BUTTON_LIMIT, current + 1))}
                  style={({ pressed }) => [styles.buttonLimitControl, pressed && styles.buttonLimitControlPressed]}
                >
                  <Text style={styles.buttonLimitControlText}>+</Text>
                </Pressable>
              </View>
            </View>
          </View>
          <Text style={styles.subtitle}>{activeMood ? `${activeMood.toUpperCase()} • ${layout.count} loaded` : statusText}</Text>
        </View>

        <View style={styles.contentRow}>
          <View
            style={styles.buttonsPanel}
            onLayout={(event) => {
              const { width: panelWidth, height: panelHeight } = event.nativeEvent.layout;
              if (
                Math.abs(panelWidth - buttonsPanelSize.width) > 1 ||
                Math.abs(panelHeight - buttonsPanelSize.height) > 1
              ) {
                setButtonsPanelSize({ width: panelWidth, height: panelHeight });
              }
            }}
          >
            {isFetchingMood ? (
              <View style={styles.loadingWrap}>
                {isLoaderReady ? (
                  <Image source={TINKLE_LOAD_GIF} style={styles.loadingGif} resizeMode="contain" />
                ) : (
                  <Text style={styles.loadingText}>Loading...</Text>
                )}
              </View>
            ) : (
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
                      <Text style={styles.buttonText} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.62}>
                        {sound.label}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={[styles.controlsPanel, { flexBasis: controlPanelBasis }]}>
            <Text style={styles.panelTitle}>Mood</Text>

            <View style={styles.presetColumn}>
              {PRESET_MOODS.map((mood) => (
                <Pressable
                  key={mood}
                  onPress={() => loadMood(mood)}
                  style={({ pressed }) => [
                    styles.moodButton,
                    activeMood === mood && styles.moodButtonSelected,
                    pressed && styles.moodButtonPressed
                  ]}
                >
                  <Text style={styles.moodButtonText}>{mood.toUpperCase()}</Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              style={styles.moodInput}
              value={customMood}
              onChangeText={setCustomMood}
              placeholder="Enter mood"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
            />

            <Pressable onPress={() => loadMood(customMood)} style={({ pressed }) => [styles.loadButton, pressed && styles.loadButtonPressed]}>
              <Text style={styles.loadButtonText}>LOAD</Text>
            </Pressable>
          </View>
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
  header: {
    minHeight: HEADER_HEIGHT,
    justifyContent: 'flex-start',
    paddingTop: 2,
    paddingBottom: 6
  },
  headerTopRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: 10
  },
  headerSideSpacer: {
    width: 98
  },
  buttonLimitWidget: {
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#334155',
    backgroundColor: '#0b1220',
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: 'center'
  },
  buttonLimitLabel: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase'
  },
  buttonLimitControls: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
    marginTop: 2
  },
  buttonLimitControl: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#475569',
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonLimitControlPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }]
  },
  buttonLimitControlText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 18
  },
  buttonLimitValue: {
    minWidth: 18,
    textAlign: 'center',
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '900'
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8
  },
  inlineTitleImage: {
    width: 34,
    height: 34
  },
  title: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#f8fafc',
    textAlign: 'center',
    flexShrink: 1
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    color: '#cbd5e1',
    textAlign: 'center'
  },
  contentRow: {
    flex: 1,
    flexDirection: 'row',
    columnGap: CONTENT_GAP,
    width: '100%'
  },
  buttonsPanel: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#334155',
    backgroundColor: '#0b1220',
    paddingHorizontal: 8,
    paddingVertical: 10
  },
  controlsPanel: {
    flexShrink: 1,
    minWidth: MIN_CONTROLS_PANEL_WIDTH,
    maxWidth: '42%',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#334155',
    backgroundColor: '#0b1220',
    padding: 10
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#f8fafc',
    marginBottom: 8
  },
  presetColumn: {
    rowGap: 8,
    marginBottom: 10
  },
  moodButton: {
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#475569',
    backgroundColor: '#1f2937',
    paddingVertical: 8,
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
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  moodInput: {
    borderWidth: 2,
    borderColor: '#475569',
    backgroundColor: '#111827',
    color: '#f8fafc',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  loadButton: {
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: '#f97316',
    paddingVertical: 10,
    alignItems: 'center'
  },
  loadButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }]
  },
  loadButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.6
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
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingGif: {
    width: 160,
    height: 160
  },
  loadingText: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '700'
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
    fontSize: 16,
    lineHeight: 18,
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
