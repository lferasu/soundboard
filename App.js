import { SafeAreaView, StatusBar, StyleSheet, Text, Pressable, View } from 'react-native';
import * as Speech from 'expo-speech';

const SOUNDS = [
  { id: 'laser', label: '⚡ Laser', phrase: 'Pew pew laser!', pitch: 1.8, rate: 1.2 },
  { id: 'robot', label: '🤖 Robot', phrase: 'Beep boop robot mode', pitch: 0.7, rate: 0.85 },
  { id: 'boing', label: '🌀 Boing', phrase: 'Boing!', pitch: 1.5, rate: 1.25 },
  { id: 'bubble', label: '🫧 Bubbles', phrase: 'Pop pop bubbles', pitch: 1.3, rate: 1.05 },
  { id: 'drum', label: '🥁 Drum', phrase: 'Ba dum boom', pitch: 0.9, rate: 0.95 },
  { id: 'chime', label: '✨ Chime', phrase: 'Shimmer chime', pitch: 1.6, rate: 0.9 },
  { id: 'space', label: '🚀 Space', phrase: 'Zooming through space', pitch: 1.1, rate: 0.8 },
  { id: 'clap', label: '👏 Clap', phrase: 'Clap clap clap', pitch: 1.0, rate: 1.1 }
];

function playSound({ phrase, pitch, rate }) {
  Speech.stop();
  Speech.speak(phrase, {
    language: 'en-US',
    pitch,
    rate
  });
}

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.card}>
        <Text style={styles.title}>🎵 Super Soundboard 🎵</Text>
        <Text style={styles.subtitle}>Tap a button to play a voice sound effect!</Text>

        <View style={styles.grid}>
          {SOUNDS.map((sound) => (
            <Pressable
              key={sound.id}
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              onPress={() => playSound(sound)}
              accessibilityRole="button"
              accessibilityLabel={`Play ${sound.id} sound`}
            >
              <Text style={styles.buttonText}>{sound.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.footer}>Built as a React Native app with Expo.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#9cdaf7',
    justifyContent: 'center',
    padding: 16
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#ffffff',
    padding: 20
  },
  title: {
    fontSize: 32,
    textAlign: 'center',
    fontWeight: '800',
    color: '#1f2937'
  },
  subtitle: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 16,
    color: '#1f2937'
  },
  grid: {
    marginTop: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12
  },
  button: {
    width: '48%',
    backgroundColor: '#fde68a',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4
  },
  buttonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.92
  },
  buttonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827'
  },
  footer: {
    marginTop: 18,
    textAlign: 'center',
    color: '#374151'
  }
});
