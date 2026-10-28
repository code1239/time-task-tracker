/**
 * Tarayıcıda dosya gerektirmeyen çan sesi (Web Audio API).
 * Alarm, kullanıcı "Sesi durdur" diyene kadar tekrar eder.
 */

const VOLUME = 0.22;
const REPEAT_MS = 1900;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let repeatTimer: ReturnType<typeof setTimeout> | null = null;
let live: OscillatorNode[] = [];
let ringing = false;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;

  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;

  try {
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = VOLUME;
    master.connect(ctx.destination);
  } catch {
    ctx = null;
    master = null;
  }
  return ctx;
}

/** İlk kullanıcı etkileşiminde çağrılır; tarayıcı ses kilidini açar. */
export function unlockAudio() {
  const c = audioContext();
  if (!c) return;
  if (c.state === "suspended") {
    void c.resume().catch(() => {});
  }
}

function chime() {
  const c = ctx;
  const out = master;
  if (!c || !out || c.state !== "running") return;

  const start = c.currentTime + 0.02;
  const tones: Array<{ freq: number; delay: number; decay: number; gain: number }> = [
    { freq: 987.77, delay: 0, decay: 0.55, gain: 1 },
    { freq: 783.99, delay: 0.28, decay: 0.7, gain: 0.85 },
  ];

  for (const tone of tones) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.value = tone.freq;

    const at = start + tone.delay;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(tone.gain, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + tone.decay);

    osc.connect(gain).connect(out);
    osc.start(at);
    osc.stop(at + tone.decay + 0.05);

    const node = osc;
    live.push(node);
    node.onended = () => {
      live = live.filter((item) => item !== node);
    };
  }
}

export function startAlarm() {
  const c = audioContext();
  if (!c || ringing) return;

  ringing = true;
  const play = () => {
    if (!ringing) return;
    chime();
    repeatTimer = setTimeout(play, REPEAT_MS);
  };

  if (c.state === "running") {
    play();
  } else {
    // Kilit açılamazsa sessiz kalır; ekrandaki "Süre doldu" bildirimi görünür.
    void c.resume().then(play).catch(() => {});
  }
}

export function stopAlarm() {
  ringing = false;
  if (repeatTimer) {
    clearTimeout(repeatTimer);
    repeatTimer = null;
  }
  for (const osc of live) {
    try {
      osc.stop();
    } catch {
      // Oscillator zaten durmuş olabilir.
    }
  }
  live = [];
}

export function isAlarmRinging() {
  return ringing;
}
