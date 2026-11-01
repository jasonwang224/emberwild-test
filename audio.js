import {CHIP_TRACKS, THEME_PLAYLISTS, scoreStep} from './chiptune-score.js?v=efee0e5a';
import {createInstrumentBank, INSTRUMENT_NAMES} from './instrument-bank.js?v=efee0e5a';

/** Original handheld-inspired compositions and synthesized effects. No recordings or audio downloads. */
export function createAudio() {
  let context = null;
  let master = null;
  let score = null;
  let scoreFilter = null;
  let effects = null;
  let noise = null;
  let chipNoise = null;
  let instruments = null;
  let room = null;
  let musicVolume = .8;
  let effectsVolume = .8;
  let timer = null;
  let active = false;
  let disposed = false;
  let theme = 'overworld';
  let selection = 'auto';
  let trackId = THEME_PLAYLISTS.overworld[0];
  const progress = Object.fromEntries(Object.keys(THEME_PLAYLISTS).map(key => [key, {index: 0, step: 0}]));
  const allTracks = Object.keys(CHIP_TRACKS);
  let nextBeat = 0;
  let step = 0;
  let requestedTheme = theme, pendingTheme = null, queuedTrack = null;
  let musicLayer = null, outgoingLayer = null, schedulingLayer = null;
  const CROSSFADE_SECONDS = 1.15;
  let seed = 0x3ea8f12;
  const voices = new Set();
  const pulseWaves = new Map();
  const lastEffect = new Map();
  // Reserve separate headroom so a busy battle never steals the accompaniment.
  const MUSIC_VOICES = 48; // Two overlapping ensembles, still a fixed budget.
  const EFFECT_VOICES = 40;
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

  function voiceRoom(route) {
    const group = [...voices].filter(voice => voice.route === route);
    if (group.length < (route === score ? MUSIC_VOICES : EFFECT_VOICES)) return;
    const first = group[0];
    if (first) {
      try { first.source.stop(); } catch (_) {}
      release(first);
    }
  }

  function tone(freq, time, duration, volume = 0.12, shape = 'sine', route = score, endFreq = null, attack = 0.012) {
    if (!context || !active || disposed || !route) return;
    voiceRoom(route);
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    if (shape.startsWith('pulse') || shape.startsWith('chip-')) {
      if (context.createPeriodicWave && oscillator.setPeriodicWave) {
        if (!pulseWaves.has(shape)) {
          const real = new Float32Array(33), imaginary = new Float32Array(33);
          if (shape.startsWith('pulse')) {
            const duty = shape === 'pulse12' ? .125 : shape === 'pulse25' ? .25 : .5;
            for (let n = 1; n < real.length; n++) {
              real[n] = 2 * Math.sin(2 * Math.PI * n * duty) / (Math.PI * n);
              imaginary[n] = 2 * (1 - Math.cos(2 * Math.PI * n * duty)) / (Math.PI * n);
            }
          } else {
            // Distinct small wavetable palettes, rather than the same pulse
            // patch on every melody. All tables are zero-DC and band-limited.
            const partials = {
              'chip-flute': [1, .11, .045, .015],
              'chip-reed': [1, 0, .38, 0, .17, 0, .07],
              'chip-bell': [1, .12, .5, .05, .18, 0, .08],
              'chip-pluck': [1, .48, .24, .11, .05]
            }[shape] || [1];
            partials.forEach((value, i) => { imaginary[i + 1] = value; });
          }
          pulseWaves.set(shape, context.createPeriodicWave(real, imaginary));
        }
        oscillator.setPeriodicWave(pulseWaves.get(shape));
      } else oscillator.type = shape.startsWith('pulse') || shape === 'chip-reed' ? 'square' : shape === 'chip-pluck' ? 'triangle' : 'sine';
    } else oscillator.type = shape;
    oscillator.frequency.setValueAtTime(Math.max(20, freq), time);
    if (endFreq !== null) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), time + duration);
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), time + Math.min(attack, duration / 3));
    if (route === score && endFreq === null && shape !== 'chip-bell' && shape !== 'chip-pluck') {
      envelope.gain.linearRampToValueAtTime(Math.max(.0002, volume * (shape === 'chip-flute' ? .85 : .65)), time + duration * .72);
    }
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(envelope).connect(route === score ? schedulingLayer?.dry || score : route);
    const voice = { source: oscillator, envelope, route, layer: route === score ? schedulingLayer : null, nodes: [oscillator, envelope] };
    voices.add(voice);
    oscillator.onended = () => release(voice);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.025);
  }

  function breath(time, duration, volume, center = 1400, type = 'bandpass', endCenter = null) {
    if (!context || !active || disposed || !noise) return;
    voiceRoom(effects);
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
    const voice = { source, envelope, route: effects, nodes: [source, filter, envelope] };
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

  function instrumentNote(note, time, duration) {
    const profile = instruments.get(note.voice);
    if (!profile) return;
    voiceRoom(score);
    const source = context.createBufferSource(), envelope = context.createGain();
    source.buffer = profile.buffer;
    source.playbackRate.setValueAtTime(NOTE(note.note) / profile.rootFrequency, time);
    source.loop = profile.loop;
    if (profile.loop) { source.loopStart = profile.loopStart; source.loopEnd = profile.loopEnd; }
    const peak = Math.max(.0002, note.volume * (profile.gain ?? 1));
    const attack = Math.min(profile.attack, duration * .25);
    const decay = Math.min(profile.decay ?? .09, duration * .3);
    const releaseTime = Math.min(profile.release, .32);
    envelope.gain.setValueAtTime(.0001, time);
    envelope.gain.linearRampToValueAtTime(peak, time + attack);
    envelope.gain.linearRampToValueAtTime(peak * (profile.sustain ?? .8), time + attack + decay);
    envelope.gain.setValueAtTime(peak * (profile.sustain ?? .8), time + duration);
    envelope.gain.exponentialRampToValueAtTime(.0001, time + duration + releaseTime);
    const nodes = [source, envelope];
    source.connect(envelope);
    let output = envelope;
    if (context.createStereoPanner) {
      const panner = context.createStereoPanner();
      panner.pan.value = Math.max(-.75, Math.min(.75, note.pan ?? profile.pan ?? 0));
      envelope.connect(panner); output = panner; nodes.push(panner);
    }
    output.connect(schedulingLayer?.dry || score);
    if (room) {
      const send = context.createGain();
      send.gain.value = note.send ?? profile.send ?? .12;
      output.connect(send).connect(schedulingLayer?.wet || room); nodes.push(send);
    }
    const voice = {source, envelope, route: score, layer: schedulingLayer, nodes};
    voices.add(voice); source.onended = () => release(voice);
    source.start(time); source.stop(time + duration + releaseTime + .025);
  }

  function chipDrum(kind, time, volume) {
    if (kind === 'kick' || kind === 'tom') {
      tone(kind === 'tom' ? 205 : 138, time, kind === 'tom' ? .18 : .105, volume, 'triangle', score, kind === 'tom' ? 92 : 46, .003);
      return;
    }
    if (!chipNoise) return;
    // A quiet pitched body makes the snare more than a burst of static.
    if (kind === 'snare') tone(182, time, .09, volume * .5, 'triangle', score, 135, .002);
    voiceRoom(score);
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), envelope = context.createGain();
    const duration = kind === 'crash' ? .62 : kind === 'ride' ? .25 : kind === 'snare' ? .13 : kind === 'shaker' ? .065 : .045;
    source.buffer = chipNoise;
    source.loop = true;
    filter.type = kind === 'shaker' ? 'bandpass' : 'highpass';filter.frequency.value = kind === 'snare' ? 1100 : kind === 'shaker' ? 2600 : kind === 'crash' ? 2800 : 4700;filter.Q.value = .5;
    envelope.gain.setValueAtTime(.0001, time);
    envelope.gain.linearRampToValueAtTime(volume, time + .002);
    envelope.gain.exponentialRampToValueAtTime(.0001, time + duration);
    source.connect(filter).connect(envelope).connect(schedulingLayer?.dry || score);
    const voice = {source, envelope, route: score, layer: schedulingLayer, nodes: [source, filter, envelope]};
    voices.add(voice);source.onended = () => release(voice);
    source.start(time);source.stop(time + duration + .015);
  }

  function fadeVoices(scoreOnly = true) {
    if (!context) return;
    const now = context.currentTime;
    for (const voice of voices) {
      if (scoreOnly && voice.route !== score) continue;
      if (voice.envelope.gain.cancelAndHoldAtTime) voice.envelope.gain.cancelAndHoldAtTime(now);
      else voice.envelope.gain.cancelScheduledValues(now);
      voice.envelope.gain.setTargetAtTime(.0001, now, .009);
      try { voice.source.stop(now + .045); } catch (_) {}
    }
  }

  function musicalBeat(time, position, id = trackId, layer = musicLayer) {
    schedulingLayer = layer;
    const track = CHIP_TRACKS[id], seconds = 60 / track.bpm / 4;
    const events = scoreStep(id, position);
    for (const note of events.notes) {
      instrumentNote(note, time, Math.max(.025, note.steps * seconds * .88 * (1 - (track.swing || 0))));
    }
    for (const drum of events.drums) chipDrum(drum.kind, time, drum.volume);
    schedulingLayer = null;
  }

  function tick() {
    if (!active || !context || context.state !== 'running' || disposed) return;
    const now = context.currentTime;
    if (outgoingLayer && now >= outgoingLayer.end) {
      retireLayer(outgoingLayer);outgoingLayer = null;
    }
    if (!outgoingLayer && queuedTrack) {
      const queued = queuedTrack;queuedTrack = null;
      if (selection === 'auto') commitTheme(requestedTheme);
      else changeTrack(queued.id, queued.step);
    }
    if (!outgoingLayer && pendingTheme && now >= pendingTheme.at) commitTheme(pendingTheme.theme);
    if (outgoingLayer) {
      // Keep the old accompaniment playing under the new melody throughout the
      // fade. Fading only its last short notes would leave a hole in the music.
      if (outgoingLayer.nextBeat < now) outgoingLayer.nextBeat = now + .04;
      let scheduled = 0;
      while (outgoingLayer.nextBeat < Math.min(now + .16, outgoingLayer.end) && scheduled++ < 3) {
        const track = CHIP_TRACKS[outgoingLayer.id], position = outgoingLayer.step;
        musicalBeat(outgoingLayer.nextBeat, position, outgoingLayer.id, outgoingLayer);
        outgoingLayer.nextBeat += 60 / track.bpm / 4 * (1 + (position % 2 ? -1 : 1) * (track.swing || 0));
        outgoingLayer.step = (position + 1) % (track.bars * track.stepsPerBar);
      }
    }
    // Skip hidden-tab backlog instead of queuing a burst when the tab returns.
    if (nextBeat < now) nextBeat = now + 0.04;
    let scheduled = 0;
    while (nextBeat < now + 0.16 && scheduled++ < 3) {
      const track = CHIP_TRACKS[trackId];
      musicalBeat(nextBeat, step);
      // Long/short swing pairs retain the exact bar length. Advance using the
      // outgoing track's tempo before selecting the next song at its cadence.
      nextBeat += 60 / track.bpm / 4 * (1 + (step % 2 ? -1 : 1) * (track.swing || 0));
      step++;
      if (step >= track.bars * track.stepsPerBar) {
        step = 0;
        if (selection === 'auto' && THEME_PLAYLISTS[theme][progress[theme].index] === trackId) {
          const cursor = progress[theme];
          cursor.index = (cursor.index + 1) % THEME_PLAYLISTS[theme].length;
          trackId = THEME_PLAYLISTS[theme][cursor.index];
          setTrackColor(nextBeat);
        }
      }
      // A queued Next/Auto choice owns its own cursor; the song still fading
      // must not overwrite that chosen song's starting position.
      if (selection === 'auto' && THEME_PLAYLISTS[theme][progress[theme].index] === trackId) progress[theme].step = step;
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
        score.gain.value = 2.8 * musicVolume;
        scoreFilter = context.createBiquadFilter();
        scoreFilter.type = 'lowpass';scoreFilter.frequency.value = CHIP_TRACKS[trackId].filter || 4600;scoreFilter.Q.value = .35;
        score.connect(scoreFilter).connect(master);
        instruments = createInstrumentBank(context);
        for (const voice of INSTRUMENT_NAMES) instruments.get(voice);
        // A small original stereo room gives the ensemble space. It is generated
        // once after a gesture, with no downloads or work on the loading screen.
        if (context.createConvolver) {
          room = context.createConvolver();
          const impulse = context.createBuffer(2, Math.ceil(context.sampleRate * .62), context.sampleRate);
          for (let channel = 0; channel < 2; channel++) {
            const samples = impulse.getChannelData(channel);
            let soft = 0;
            for (let i = 0; i < samples.length; i++) {
              soft = soft * .45 + (random() * 2 - 1) * .55;
              samples[i] = soft * Math.exp(-i / (context.sampleRate * .115));
            }
            samples[0] = 0;
          }
          room.buffer = impulse;
          room.connect(score);
        }
        effects = context.createGain();
        effects.gain.value = .725 * effectsVolume;
        effects.connect(master);
        noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
        const channel = noise.getChannelData(0);
        let smooth = 0;
        for (let i = 0; i < channel.length; i++) {
          smooth = (smooth + (random() * 2 - 1) * 0.12) / 1.12;
          channel[i] = smooth * 3;
        }
        // A tiny deterministic stepped-noise buffer supplies the handheld kit.
        chipNoise = context.createBuffer(1, Math.ceil(context.sampleRate * .12), context.sampleRate);
        const chipChannel = chipNoise.getChannelData(0);
        let lfsr = 0x4a35;
        for (let i = 0; i < chipChannel.length; i++) {
          if (i % 3 === 0) lfsr = (lfsr >>> 1) | (((lfsr ^ (lfsr >>> 1)) & 1) << 14);
          chipChannel[i] = (lfsr & 1) ? .8 : -.8;
        }
        musicLayer = createLayer();
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
    const next = Boolean(value);
    if (next === active) return;
    active = next;
    if (!context) return;
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setTargetAtTime(active ? 0.48 : 0, context.currentTime, 0.05);
    if (!active) {
      fadeVoices(false);
      if (outgoingLayer) { retireLayer(outgoingLayer);outgoingLayer = null; }
      const queued = queuedTrack;queuedTrack = null;pendingTheme = null;
      if (selection === 'auto') commitTheme(requestedTheme);
      else if (queued) changeTrack(queued.id, queued.step);
    }
    if (active) { nextBeat = context.currentTime + 0.06; tick(); }
  }

  function setMusicVolume(value) {
    if (disposed || typeof value !== 'number' || !Number.isFinite(value)) return;
    musicVolume = Math.max(0, Math.min(1, value));
    if (score) score.gain.setTargetAtTime(2.8 * musicVolume, context.currentTime, .035);
  }

  function setEffectsVolume(value) {
    if (disposed || typeof value !== 'number' || !Number.isFinite(value)) return;
    effectsVolume = Math.max(0, Math.min(1, value));
    if (effects) effects.gain.setTargetAtTime(.725 * effectsVolume, context.currentTime, .035);
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

  function setTrackColor(time) {
    if (scoreFilter) scoreFilter.frequency.setTargetAtTime(CHIP_TRACKS[trackId].filter || 4600, time, .08);
  }

  function createLayer() {
    const layer = {dry: context.createGain(), wet: room ? context.createGain() : null};
    layer.dry.connect(score);
    if (layer.wet) layer.wet.connect(room);
    layer.dry.gain.value = 1;if (layer.wet) layer.wet.gain.value = 1;
    return layer;
  }

  function fadeLayer(layer, incoming, now) {
    // Matching equal-power curves retain musical energy through the handover;
    // wet and dry sends follow the same envelope so old reverb cannot jump out.
    for (const node of [layer.dry, layer.wet]) {
      if (!node) continue;
      node.gain.cancelScheduledValues(now);
      node.gain.setValueAtTime(incoming ? 0 : 1, now);
      for (let i = 1; i <= 16; i++) {
        const angle = i / 16 * Math.PI / 2;
        node.gain.linearRampToValueAtTime(incoming ? Math.sin(angle) : Math.cos(angle), now + i / 16 * CROSSFADE_SECONDS);
      }
    }
  }

  function retireLayer(layer) {
    for (const voice of [...voices]) if (voice.layer === layer) {
      try { voice.source.stop(); } catch (_) {}
      release(voice);
    }
    layer.dry.disconnect();layer.wet?.disconnect();
  }

  function changeTrack(id, resumeStep = 0) {
    // Coalesce rapid song choices while a handover is in progress. At most two
    // ensembles can overlap, even if the player repeatedly changes their mind.
    if (outgoingLayer && active && context?.state === 'running') {
      queuedTrack = {id, step: resumeStep};return;
    }
    const crossfade = musicLayer && active && context?.state === 'running';
    if (crossfade) {
      outgoingLayer = Object.assign(musicLayer, {id: trackId, step, nextBeat, end: context.currentTime + CROSSFADE_SECONDS});
      fadeLayer(outgoingLayer, false, context.currentTime);
      musicLayer = createLayer();fadeLayer(musicLayer, true, context.currentTime);
    } else if (context) {
      if (outgoingLayer) { retireLayer(outgoingLayer);outgoingLayer = null; }
      if (musicLayer) retireLayer(musicLayer);
      musicLayer = createLayer();
    }
    trackId = id;step = resumeStep;
    if (context) {
      nextBeat = context.currentTime + .02;
      if (scoreFilter.frequency.cancelAndHoldAtTime) scoreFilter.frequency.cancelAndHoldAtTime(context.currentTime);
      else scoreFilter.frequency.cancelScheduledValues(context.currentTime);
      setTrackColor(context.currentTime);
    }
  }

  function commitTheme(target) {
    pendingTheme = null;
    const changed = target !== theme;
    theme = target;
    if (selection === 'auto') {
      const cursor = progress[theme], id = THEME_PLAYLISTS[theme][cursor.index];
      if (changed || trackId !== id) changeTrack(id, cursor.step);
    }
  }

  function selectMusic(value) {
    if (disposed || (value !== 'auto' && !Object.hasOwn(CHIP_TRACKS, value))) return false;
    if (value === selection) return true;
    selection = value;
    pendingTheme = null;
    if (value === 'auto') {
      theme = requestedTheme;
      const cursor = progress[theme];
      changeTrack(THEME_PLAYLISTS[theme][cursor.index], cursor.step);
    } else changeTrack(value);
    return true;
  }

  function nextMusic() {
    if (disposed) return;
    if (selection === 'auto') {
      const cursor = progress[theme], playlist = THEME_PLAYLISTS[theme];
      if (playlist.length < 2) return;
      cursor.index = (cursor.index + 1) % playlist.length;
      cursor.step = 0;
      changeTrack(playlist[cursor.index]);
    } else selectMusic(allTracks[(allTracks.indexOf(selection) + 1) % allTracks.length]);
  }

  function update(nextZone, inCombat) {
    if (disposed) return;
    const place = Object.hasOwn(THEME_PLAYLISTS, nextZone) ? nextZone : 'overworld';
    const target = inCombat && place !== 'title' ? 'combat' : place;
    requestedTheme = target;
    if (selection !== 'auto' || !active || context?.state !== 'running') {
      commitTheme(target);return;
    }
    if (target === theme) { pendingTheme = null;return; }
    if (pendingTheme?.theme === target) return;
    // Ignore quick boundary crossings. Enter combat promptly, but let the
    // battle settle before returning to peaceful music instead of fluttering.
    const delay = target === 'title' || theme === 'title' ? 0 : target === 'combat' ? .18 : theme === 'combat' ? 2 : .65;
    pendingTheme = {theme: target, at: context.currentTime + delay};
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
    pulseWaves.clear();
    instruments?.dispose();
    musicLayer?.dry.disconnect();musicLayer?.wet?.disconnect();
    outgoingLayer?.dry.disconnect();outgoingLayer?.wet?.disconnect();
    musicLayer = outgoingLayer = schedulingLayer = pendingTheme = queuedTrack = null;
    room?.disconnect();
    context = master = score = scoreFilter = effects = noise = chipNoise = instruments = room = null;
  }

  return { unlock, setEnabled, play, update, dispose, selectMusic, nextMusic, setMusicVolume, setEffectsVolume,
    get unlocked() { return context?.state === 'running'; },
    get musicVolume() { return musicVolume; },
    get effectsVolume() { return effectsVolume; },
    get musicSelection() { return selection; },
    get currentTrack() { return Object.freeze({id: trackId, ...CHIP_TRACKS[trackId]}); },
    get enabled() { return active; } };
}
