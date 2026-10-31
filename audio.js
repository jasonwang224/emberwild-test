/** Emberwild's original, entirely synthesized score and effects. No audio downloads. */
export function createAudio() {
  let context = null;
  let master = null;
  let score = null;
  let effects = null;
  let noise = null;
  let timer = null;
  let active = false;
  let disposed = false;
  let zone = 'overworld';
  let combat = false;
  let nextBeat = 0;
  let step = 0;
  let seed = 0x3ea8f12;
  const voices = new Set();
  const lastEffect = new Map();
  const MAX_VOICES = 40;
  // Legacy combat calls share the same sound and throttle as their named releases.
  const effectAliases = { swing: 'sword-swing', shoot: 'bow-release', fire: 'wand-release' };
  const effectCooldowns = {
    'sword-charge': .08, 'sword-swing': .055,
    'wand-charge': .08, 'wand-release': .055,
    'bow-draw': .08, 'bow-release': .055,
    'shield-block': .09, 'boss-warning': .45, 'enemy-pop': .06,
    'whirlwind-charge': .25, whirlwind: .3,
    'dawnfall-charge': .4, dawnfall: .65,
    'frost-bloom-charge': .25, 'frost-bloom': .3,
    'starfall-charge': .4, starfall: .65,
    'triple-volley-charge': .25, 'triple-volley': .3,
    'arrow-rain-charge': .4, 'arrow-rain': .65
  };
  const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
  const random = () => {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };

  function release(voice) {
    if (!voices.delete(voice)) return;
    for (const node of voice.nodes) { try { node.disconnect(); } catch (_) {} }
  }

  function voiceRoom() {
    if (voices.size < MAX_VOICES) return;
    const first = voices.values().next().value;
    if (first) {
      try { first.source.stop(); } catch (_) {}
      release(first);
    }
  }

  function tone(freq, time, duration, volume = 0.12, shape = 'sine', route = score, endFreq = null, attack = 0.012) {
    if (!context || !active || disposed || !route) return;
    voiceRoom();
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = shape;
    oscillator.frequency.setValueAtTime(Math.max(20, freq), time);
    if (endFreq !== null) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), time + duration);
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), time + Math.min(attack, duration / 3));
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(envelope).connect(route);
    const voice = { source: oscillator, nodes: [oscillator, envelope] };
    voices.add(voice);
    oscillator.onended = () => release(voice);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.025);
  }

  function breath(time, duration, volume, center = 1400, type = 'bandpass', endCenter = null) {
    if (!context || !active || disposed || !noise) return;
    voiceRoom();
    const source = context.createBufferSource();
    source.buffer = noise;
    source.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(center, time);
    if (endCenter !== null) filter.frequency.exponentialRampToValueAtTime(endCenter, time + duration);
    filter.Q.value = 0.65;
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.linearRampToValueAtTime(volume, time + Math.min(0.025, duration / 4));
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter).connect(envelope).connect(effects);
    const voice = { source, nodes: [source, filter, envelope] };
    voices.add(voice);
    source.onended = () => release(voice);
    source.start(time);
    source.stop(time + duration + 0.025);
  }

  function bell(note, time, volume = 0.11, duration = 1.3, route = score) {
    const frequency = NOTE(note);
    tone(frequency, time, duration, volume, 'sine', route);
    tone(frequency * 2.003, time, duration * 0.45, volume * 0.13, 'sine', route);
  }

  function chord(notes, time, spacing = 0.11, volume = 0.16, duration = 0.7) {
    notes.forEach((note, index) => bell(note, time + index * spacing, volume, duration, effects));
  }

  function musicalBeat(time, position) {
    const bar = Math.floor(position / 16);
    const beat = position % 16;
    if (zone === 'overworld') {
      // D / G / B minor / A: a calm original wandering theme in D pentatonic.
      const roots = [50, 55, 47, 57];
      const root = roots[bar % roots.length];
      if (beat === 0) {
        tone(NOTE(root - 12), time, 5.5, 0.09, 'sine', score, null, 0.7);
        tone(NOTE(root + 7), time, 4.8, 0.035, 'sine', score, null, 1.1);
      }
      const melodies = [
        [74, null, 78, null, 81, null, 78, 76, 74, null, 69, null, 71, null, null, null],
        [71, null, 74, null, 78, null, null, 76, 74, null, 71, null, 69, null, null, null],
        [69, null, 71, 74, 78, null, 76, null, 74, null, 71, null, null, null, 69, null],
        [76, null, 78, null, 81, null, 78, null, 76, null, 74, 71, 69, null, null, null]
      ];
      const melody = melodies[bar % 4][beat];
      if (melody !== null) bell(melody + (bar % 8 > 3 ? -12 : 0), time, 0.08 + random() * 0.025, 1.55);
      if ([2, 6, 10, 14].includes(beat)) {
        tone(NOTE(root + (beat % 8 === 2 ? 12 : 19)), time, 1.2, 0.055, 'triangle');
      }
    } else {
      // Sparse open fifths leave space for dungeon ambience and combat cues.
      const root = [38, 36, 41, 38][bar % 4];
      if (beat === 0) {
        tone(NOTE(root), time, 5.9, 0.1, 'sine', score, null, 0.9);
        tone(NOTE(root + 7), time, 4.8, 0.045, 'triangle', score, null, 1.2);
      }
      if ([3, 9, 14].includes(beat)) {
        const note = [62, 65, 69, 72, 69, 65][(bar + beat) % 6];
        bell(note, time, 0.07, 2.2);
      }
    }
    if (combat && beat % 4 === 0) {
      tone(82, time, 0.25, 0.15, 'sine', score, 43);
      tone(NOTE(zone === 'dungeon' ? 38 : 50), time + 0.19, 0.15, 0.06, 'triangle');
    }
  }

  function tick() {
    if (!active || !context || context.state !== 'running' || disposed) return;
    const now = context.currentTime;
    // Skip hidden-tab backlog instead of queuing a burst when the tab returns.
    if (nextBeat < now - 0.2) nextBeat = now + 0.04;
    let scheduled = 0;
    while (nextBeat < now + 0.16 && scheduled++ < 3) {
      musicalBeat(nextBeat, step++);
      nextBeat += 0.375;
    }
  }

  async function unlock() {
    if (disposed) return false;
    try {
      if (!context) {
        const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!AudioContextClass) return false;
        context = new AudioContextClass();
        master = context.createGain();
        master.gain.value = active ? 0.48 : 0;
        const limiter = context.createDynamicsCompressor();
        limiter.threshold.value = -15;
        limiter.knee.value = 15;
        limiter.ratio.value = 5;
        limiter.attack.value = 0.004;
        limiter.release.value = 0.2;
        master.connect(limiter).connect(context.destination);
        score = context.createGain();
        score.gain.value = 0.38;
        score.connect(master);
        effects = context.createGain();
        effects.gain.value = 0.58;
        effects.connect(master);
        noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
        const channel = noise.getChannelData(0);
        let smooth = 0;
        for (let i = 0; i < channel.length; i++) {
          smooth = (smooth + (random() * 2 - 1) * 0.12) / 1.12;
          channel[i] = smooth * 3;
        }
        nextBeat = context.currentTime + 0.06;
        timer = globalThis.setInterval(tick, 80);
      }
      if (context.state === 'suspended') await context.resume();
      tick();
      return context.state === 'running';
    } catch (_) { return false; }
  }

  function setEnabled(value) {
    if (disposed) return;
    active = Boolean(value);
    if (!context) return;
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setTargetAtTime(active ? 0.48 : 0, context.currentTime, 0.05);
    if (active) { nextBeat = context.currentTime + 0.06; tick(); }
  }

  function play(name) {
    if (!active || !context || context.state !== 'running' || disposed) return;
    name = effectAliases[name] || name;
    const now = context.currentTime;
    const cooldown = effectCooldowns[name] ?? (['hit', 'coin', 'click'].includes(name) ? .055 : .13);
    if (now - (lastEffect.get(name) ?? -99) < cooldown) return;
    lastEffect.set(name, now);
    const t = now + 0.005;
    switch (name) {
      // Anticipation and release are separate cues so animation can place the
      // audible strike exactly at its release frame, about .1-.16s after charge.
      case 'sword-charge':
        tone(520, t, .12, .065, 'sine', effects, 740, .025);
        tone(1040, t + .018, .11, .026, 'sine', effects, 1280, .02);
        breath(t, .1, .045, 1100, 'bandpass', 1700);
        break;
      case 'sword-swing':
        breath(t, .18, .21, 1900, 'bandpass', 650);
        tone(170, t, .15, .15, 'triangle', effects, 72);
        tone(880, t + .022, .2, .045, 'sine', effects, 820);
        break;
      case 'wand-charge':
        tone(392, t, .15, .055, 'sine', effects, 784, .04);
        tone(1174, t + .035, .16, .028, 'sine', effects, 1568, .035);
        break;
      case 'wand-release':
        bell(74, t, .11, .44, effects);
        bell(81, t + .045, .065, .38, effects);
        tone(294, t, .24, .1, 'sine', effects, 196);
        breath(t + .01, .13, .055, 2200, 'bandpass', 1200);
        break;
      case 'bow-draw':
        tone(112, t, .16, .06, 'triangle', effects, 168, .04);
        tone(330, t + .015, .13, .025, 'sine', effects, 440, .035);
        breath(t, .11, .045, 460, 'bandpass', 820);
        break;
      case 'bow-release':
        tone(196, t, .2, .15, 'triangle', effects, 130);
        tone(392, t, .11, .045, 'sine', effects, 300);
        breath(t + .008, .12, .09, 1400, 'bandpass', 2300);
        break;
      // Ability cues have their own musical gestures. Charges leave space for
      // the animation's release callback; ultimates add duration, not loudness.
      case 'whirlwind-charge':
        breath(t, .24, .065, 520, 'bandpass', 1800);
        tone(220, t, .23, .055, 'triangle', effects, 440, .06);
        break;
      case 'whirlwind':
        [0, .105, .21].forEach((delay, i) => {
          breath(t + delay, .19, .12 - i * .018, 1900 - i * 220, 'bandpass', 430);
          tone(200 + i * 45, t + delay, .14, .075, 'triangle', effects, 90);
        });
        break;
      case 'dawnfall-charge':
        tone(NOTE(50), t, .42, .075, 'sine', effects, NOTE(62), .1);
        chord([62, 69, 74], t + .025, .085, .047, .36);
        breath(t, .35, .05, 500, 'lowpass', 1350);
        break;
      case 'dawnfall':
        tone(110, t, .5, .18, 'sine', effects, 42, .018);
        breath(t, .32, .12, 720, 'lowpass', 230);
        chord([62, 69, 74, 78], t + .04, .065, .065, .86);
        break;
      case 'frost-bloom-charge':
        tone(620, t, .27, .04, 'sine', effects, 1240, .055);
        bell(86, t + .055, .032, .28, effects);
        breath(t, .24, .035, 1700, 'bandpass', 2900);
        break;
      case 'frost-bloom':
        chord([86, 81, 90, 93], t, .04, .048, .48);
        breath(t, .3, .075, 2600, 'lowpass', 850);
        tone(330, t, .3, .045, 'sine', effects, 220);
        break;
      case 'starfall-charge':
        chord([62, 69, 78, 86], t, .075, .04, .44);
        tone(220, t, .4, .045, 'sine', effects, 880, .1);
        break;
      case 'starfall':
        [86, 81, 78, 74, 69].forEach((note, i) => {
          const time = t + i * .115;
          tone(NOTE(note + 7), time, .2, .035, 'sine', effects, NOTE(note));
          bell(note, time + .12, .055, .72, effects);
        });
        tone(98, t + .16, .65, .1, 'sine', effects, 49, .03);
        breath(t + .16, .4, .065, 950, 'lowpass', 260);
        break;
      case 'triple-volley-charge':
        tone(147, t, .24, .055, 'triangle', effects, 247, .065);
        tone(494, t + .04, .2, .022, 'sine', effects, 588, .05);
        breath(t, .2, .035, 380, 'bandpass', 950);
        break;
      case 'triple-volley':
        [196, 247, 294].forEach((frequency, i) => {
          tone(frequency, t + i * .065, .19, .1, 'triangle', effects, frequency * .68);
          breath(t + i * .065, .13, .065, 1300 + i * 250, 'bandpass', 2500);
        });
        break;
      case 'arrow-rain-charge':
        tone(98, t, .4, .06, 'triangle', effects, 294, .1);
        chord([69, 74, 81], t + .035, .09, .035, .34);
        breath(t, .32, .05, 500, 'bandpass', 1800);
        break;
      case 'arrow-rain':
        [294, 247, 220, 196, 247, 220, 147].forEach((frequency, i) => {
          const time = t + i * .085;
          tone(frequency, time, .22, .068, 'triangle', effects, frequency * .72);
          breath(time + .018, .2, .043, 2200 - i * 170, 'bandpass', 650);
        });
        bell(74, t, .045, .8, effects);
        break;
      case 'shield-block':
        tone(120, t, .15, .19, 'sine', effects, 70);
        tone(760, t, .22, .055, 'sine', effects, 710);
        tone(1190, t + .008, .13, .03, 'sine', effects);
        breath(t, .075, .1, 640);
        break;
      case 'boss-warning':
        [38, 40, 45].forEach((note, i) => {
          tone(NOTE(note), t + [0, .19, .36][i], .15, .07 + i * .018,
            'sine', effects, NOTE(note + 2), .025);
        });
        breath(t + .36, .16, .045, 650, 'lowpass', 1100);
        break;
      case 'enemy-pop':
        tone(230, t, .1, .11, 'sine', effects, 680);
        bell(81, t + .055, .075, .35, effects);
        bell(88, t + .1, .035, .27, effects);
        breath(t, .1, .075, 650, 'lowpass');
        break;
      case 'ice': chord([86, 93, 88], t, 0.035, 0.09, 0.5); breath(t, 0.26, 0.1, 3200); break;
      case 'hit': tone(145, t, 0.13, 0.24, 'triangle', effects, 48); breath(t, 0.09, 0.19, 700); break;
      case 'hurt': tone(170, t, 0.27, 0.23, 'triangle', effects, 62); breath(t, 0.13, 0.16, 400); break;
      case 'dash': breath(t, 0.24, 0.24, 1700); tone(310, t, 0.18, 0.09, 'sine', effects, 680); break;
      case 'coin': chord([83, 90], t, 0.045, 0.11, 0.36); break;
      case 'loot': chord([74, 78, 81], t, 0.08, 0.12, 0.7); break;
      case 'level': chord([62, 66, 69, 74, 78, 81], t, 0.105, 0.17, 1.2); break;
      case 'quest': chord([67, 71, 74, 79], t, 0.15, 0.16, 1.05); break;
      case 'heal': chord([69, 74, 78], t, 0.13, 0.12, 1.15); tone(280, t, 0.7, 0.06, 'sine', effects, 560, 0.25); break;
      case 'potion-open':
        tone(620, t, .07, .075, 'sine', effects, 1120);
        breath(t, .055, .045, 1500, 'bandpass');
        break;
      case 'potion-gulp':
        [0, .16].forEach((delay, i) => {
          tone(340-i*35, t+delay, .12, .07, 'sine', effects, 150+i*25);
          tone(170+i*20, t+delay+.055, .08, .045, 'sine', effects, 360);
        });
        break;
      case 'portal': chord([62, 69, 74, 81, 86], t, 0.09, 0.1, 1.6); breath(t, 0.8, 0.14, 1000); break;
      case 'boss': tone(NOTE(26), t, 1.8, 0.3, 'sine', effects, null, 0.12); tone(NOTE(33), t + 0.15, 1.4, 0.17, 'triangle', effects, null, 0.2); break;
      case 'win': chord([62, 66, 69, 74, 78, 81, 86], t, 0.16, 0.18, 1.6); break;
      case 'death': chord([62, 57, 53, 50], t, 0.28, 0.13, 1.3); break;
      case 'click': tone(680, t, 0.06, 0.075, 'sine', effects, 520); break;
      case 'fish': tone(260, t, 0.17, 0.13, 'sine', effects, 690); breath(t, 0.22, 0.15, 1800); break;
      default: break;
    }
  }

  function update(nextZone, inCombat) {
    const target = nextZone === 'dungeon' ? 'dungeon' : 'overworld';
    if (target !== zone) {
      zone = target;
      step = 0;
      if (context) nextBeat = context.currentTime + 0.08;
    }
    combat = Boolean(inCombat);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    active = false;
    if (timer !== null) globalThis.clearInterval(timer);
    for (const voice of [...voices]) {
      try { voice.source.stop(); } catch (_) {}
      release(voice);
    }
    if (context) { const closing = context.close(); if (closing && closing.catch) closing.catch(() => {}); }
    lastEffect.clear();
    context = master = score = effects = noise = null;
  }

  return { unlock, setEnabled, play, update, dispose, get enabled() { return active; } };
}
