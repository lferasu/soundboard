const audioContext = new (window.AudioContext || window.webkitAudioContext)();

const soundButtons = Array.from(document.querySelectorAll('.sound-btn'));
const keyToSound = {
  '1': 'laser',
  '2': 'robot',
  '3': 'boing',
  '4': 'bubble',
  '5': 'drum',
  '6': 'chime',
  '7': 'space',
  '8': 'clap'
};

function envelope(gainNode, startTime, attack = 0.01, release = 0.25, peak = 0.45) {
  gainNode.gain.cancelScheduledValues(startTime);
  gainNode.gain.setValueAtTime(0.0001, startTime);
  gainNode.gain.linearRampToValueAtTime(peak, startTime + attack);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + release);
}

function makeOsc(type, frequency, start, stop, destination, detune = 0) {
  const oscillator = audioContext.createOscillator();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.detune.setValueAtTime(detune, start);
  oscillator.connect(destination);
  oscillator.start(start);
  oscillator.stop(stop);
}

function noiseBuffer(duration = 0.15) {
  const frameCount = Math.floor(audioContext.sampleRate * duration);
  const buffer = audioContext.createBuffer(1, frameCount, audioContext.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i += 1) {
    channel[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function playSound(name) {
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  const now = audioContext.currentTime;
  const gainNode = audioContext.createGain();
  gainNode.connect(audioContext.destination);

  switch (name) {
    case 'laser': {
      envelope(gainNode, now, 0.01, 0.24, 0.35);
      const osc = audioContext.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.24);
      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.24);
      break;
    }
    case 'robot': {
      envelope(gainNode, now, 0.02, 0.36, 0.32);
      makeOsc('square', 180, now, now + 0.36, gainNode);
      makeOsc('square', 220, now, now + 0.36, gainNode, -20);
      break;
    }
    case 'boing': {
      envelope(gainNode, now, 0.01, 0.35, 0.4);
      const osc = audioContext.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(480, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.35);
      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.35);
      break;
    }
    case 'bubble': {
      envelope(gainNode, now, 0.01, 0.22, 0.25);
      makeOsc('sine', 350, now, now + 0.08, gainNode);
      makeOsc('sine', 620, now + 0.08, now + 0.16, gainNode);
      makeOsc('sine', 860, now + 0.16, now + 0.22, gainNode);
      break;
    }
    case 'drum': {
      envelope(gainNode, now, 0.001, 0.18, 0.65);
      const osc = audioContext.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.18);
      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.18);
      break;
    }
    case 'chime': {
      envelope(gainNode, now, 0.01, 0.6, 0.28);
      makeOsc('triangle', 880, now, now + 0.6, gainNode);
      makeOsc('sine', 1320, now, now + 0.5, gainNode);
      break;
    }
    case 'space': {
      envelope(gainNode, now, 0.02, 0.5, 0.3);
      const osc = audioContext.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(210, now);
      osc.frequency.linearRampToValueAtTime(460, now + 0.5);
      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.5);
      break;
    }
    case 'clap': {
      const bufferSource = audioContext.createBufferSource();
      const filter = audioContext.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(900, now);

      bufferSource.buffer = noiseBuffer(0.2);
      bufferSource.connect(filter);
      filter.connect(gainNode);

      envelope(gainNode, now, 0.001, 0.2, 0.45);
      gainNode.gain.setValueAtTime(0.45, now);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
      gainNode.gain.setValueAtTime(0.3, now + 0.055);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
      gainNode.gain.setValueAtTime(0.2, now + 0.11);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      bufferSource.start(now);
      bufferSource.stop(now + 0.2);
      break;
    }
    default:
      break;
  }
}

function animateButton(button) {
  button.classList.add('playing');
  window.setTimeout(() => button.classList.remove('playing'), 160);
}

soundButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const soundName = button.dataset.sound;
    playSound(soundName);
    animateButton(button);
  });
});

document.addEventListener('keydown', (event) => {
  const soundName = keyToSound[event.key];
  if (!soundName) return;

  const button = soundButtons.find((item) => item.dataset.sound === soundName);
  if (!button) return;

  playSound(soundName);
  animateButton(button);
});
