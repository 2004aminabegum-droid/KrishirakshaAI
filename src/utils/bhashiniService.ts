/**
 * KrishiRakshak AI — Bhashini Multilingual Service
 * ===================================================
 * Integrates Government of India's Bhashini (ULCA / Dhruva) API for:
 *   1. NMT (Neural Machine Translation) across 22+ Indian languages
 *   2. ASR (Automated Speech Recognition / Voice-to-Text)
 *   3. TTS (Text-to-Speech) using Blob URL audio (bypasses browser autoplay block)
 */

export interface SupportedBhashiniLanguage {
  code: string;
  name: string;
  nativeName: string;
  bhashiniCode: string;
  speechLocale: string;
}

export const BHASHINI_LANGUAGES: SupportedBhashiniLanguage[] = [
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', bhashiniCode: 'hi', speechLocale: 'hi-IN' },
  { code: 'en', name: 'English', nativeName: 'English', bhashiniCode: 'en', speechLocale: 'en-IN' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', bhashiniCode: 'bn', speechLocale: 'bn-IN' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', bhashiniCode: 'te', speechLocale: 'te-IN' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', bhashiniCode: 'ta', speechLocale: 'ta-IN' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', bhashiniCode: 'mr', speechLocale: 'mr-IN' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', bhashiniCode: 'gu', speechLocale: 'gu-IN' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', bhashiniCode: 'kn', speechLocale: 'kn-IN' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', bhashiniCode: 'ml', speechLocale: 'ml-IN' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', bhashiniCode: 'pa', speechLocale: 'pa-IN' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', bhashiniCode: 'or', speechLocale: 'or-IN' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', bhashiniCode: 'as', speechLocale: 'as-IN' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', bhashiniCode: 'ur', speechLocale: 'ur-IN' }
];

export function getLanguageConfig(code: string): SupportedBhashiniLanguage {
  return BHASHINI_LANGUAGES.find(l => l.code === code) || BHASHINI_LANGUAGES[0];
}

// ─── Translation ─────────────────────────────────────────────────────────────

async function translateSegmentDirect(text: string, sourceLang: string, targetLang: string): Promise<string> {
  if (!text || !text.trim() || sourceLang === targetLang) return text;

  const bhashiniApiKey = typeof process !== 'undefined' ? process.env?.BHASHINI_API_KEY : undefined;
  const bhashiniUserId = typeof process !== 'undefined' ? process.env?.BHASHINI_USER_ID : undefined;

  // 1. Bhashini ULCA if configured
  if (bhashiniApiKey && bhashiniUserId) {
    try {
      const response = await fetch('https://dhruva-api.bhashini.gov.in/services/inference/pipeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': bhashiniApiKey,
          'userID': bhashiniUserId,
          'ulcaApiKey': bhashiniApiKey
        },
        body: JSON.stringify({
          pipelineTasks: [{ taskType: 'translation', config: { language: { sourceLanguage: sourceLang, targetLanguage: targetLang } } }],
          inputData: { input: [{ source: text }] }
        }),
        signal: AbortSignal.timeout(4000)
      });
      if (response.ok) {
        const data = await response.json();
        const out = data?.pipelineResponse?.[0]?.output?.[0]?.target;
        if (out) return out;
      }
    } catch {}
  }

  // 2. MyMemory Neural NMT fallback
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'KrishiRakshak-AI/1.0' }, signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      const out = data?.responseData?.translatedText;
      if (out && !out.includes('INVALID TARGET LANGUAGE') && !out.includes('MYMEMORY WARNING')) return out;
    }
  } catch {}

  return text;
}

export async function translateTextBhashini(text: string, targetLang: string, sourceLang: string = 'en'): Promise<string> {
  if (!text || !text.trim() || targetLang === sourceLang) return text;

  const lines = text.split('\n');
  const translatedLines: string[] = [];

  for (const line of lines) {
    if (!line.trim()) { translatedLines.push(''); continue; }

    if (line.length > 350) {
      const sentences = line.match(/[^.!?।]+[.!?।]+/g) || [line];
      const parts: string[] = [];
      for (const sent of sentences) {
        parts.push(await translateSegmentDirect(sent.trim(), sourceLang, targetLang));
      }
      translatedLines.push(parts.join(' '));
    } else {
      translatedLines.push(await translateSegmentDirect(line.trim(), sourceLang, targetLang));
    }
  }

  return translatedLines.join('\n');
}

// ─── TTS Audio Engine ────────────────────────────────────────────────────────

let activeAudio: HTMLAudioElement | null = null;
let activeBlobUrl: string | null = null;

/** Call once on any user gesture to unlock AudioContext */
export function unlockAudio() {
  if (typeof window === 'undefined') return;
  try {
    const ACtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (ACtx) {
      const ctx = new ACtx();
      if (ctx.state === 'suspended') ctx.resume();
      ctx.close();
    }
  } catch (_) {}
}

function stopActive() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
  }
  if (activeBlobUrl) {
    URL.revokeObjectURL(activeBlobUrl);
    activeBlobUrl = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Speak text in the chosen Indian language.
 * Seamlessly uses Native Android TTS when in APK, and Web Speech API in browser.
 */
export function speakText(
  text: string,
  langCode: string = 'hi',
  onStart?: () => void,
  onEnd?: () => void
): { stop: () => void } {
  if (typeof window === 'undefined') return { stop: () => {} };

  stopActive();

  let cancelled = false;

  const stop = () => {
    cancelled = true;
    stopActive();
    if (onEnd) onEnd();
  };

  const cleanText = text
    .replace(/[#*_`~[\]()]/g, ' ')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/•/g, ', ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 300);

  if (!cleanText) {
    if (onEnd) onEnd();
    return { stop };
  }

  // 1. Android Native APK TTS (Instant, offline, crystal clear)
  if ((window as any).AndroidNativeSpeech?.isNativeSpeechAvailable?.()) {
    try {
      (window as any).handleNativeSpeechStart = () => {
        if (!cancelled && onStart) onStart();
      };
      (window as any).handleNativeSpeechEnd = () => {
        if (onEnd) onEnd();
      };
      (window as any).AndroidNativeSpeech.speak(cleanText, langCode);
      if (onStart) onStart();
      return {
        stop: () => {
          cancelled = true;
          try {
            (window as any).AndroidNativeSpeech.stopSpeaking();
          } catch {}
          if (onEnd) onEnd();
        }
      };
    } catch (e) {
      console.warn('[Chatbot TTS] Native Android TTS failed, falling back to Web Speech:', e);
    }
  }

  // 2. Web Speech API (Browser)
  webSpeechFallback(cleanText, langCode, onStart, onEnd);
  return { stop };
}

function webSpeechFallback(
  text: string,
  langCode: string,
  onStart?: () => void,
  onEnd?: () => void
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    // 3. Direct Google TTS audio stream fallback
    playGoogleTtsAudio(text, langCode, onStart, onEnd);
    return;
  }

  try {
    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    const config = getLanguageConfig(langCode);
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = config.speechLocale;
    utt.rate = 0.95;
    utt.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const match = voices.find(v =>
        v.lang === config.speechLocale ||
        v.lang.replace('_', '-').toLowerCase().startsWith(config.speechLocale.toLowerCase()) ||
        v.lang.toLowerCase().startsWith(config.code.toLowerCase())
      );
      if (match) {
        utt.voice = match;
      }
    }

    let started = false;
    utt.onstart = () => {
      started = true;
      if (onStart) onStart();
    };

    utt.onend = () => {
      if (onEnd) onEnd();
    };

    utt.onerror = (e) => {
      console.warn('[WebSpeech error]:', e);
      if (!started) {
        playGoogleTtsAudio(text, langCode, onStart, onEnd);
      } else {
        if (onEnd) onEnd();
      }
    };

    window.speechSynthesis.speak(utt);

    // Chrome bug workaround: speech sometimes doesn't fire onstart if queue was idle
    setTimeout(() => {
      if (window.speechSynthesis.speaking && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }, 100);
  } catch (err) {
    console.warn('[WebSpeech exception]:', err);
    playGoogleTtsAudio(text, langCode, onStart, onEnd);
  }
}

function playGoogleTtsAudio(
  text: string,
  langCode: string,
  onStart?: () => void,
  onEnd?: () => void
) {
  try {
    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(langCode)}&client=tw-ob&q=${encodeURIComponent(text.substring(0, 160))}`;
    const audio = new Audio(googleTtsUrl);
    activeAudio = audio;

    audio.onplay = () => {
      if (onStart) onStart();
    };
    audio.onended = () => {
      activeAudio = null;
      if (onEnd) onEnd();
    };
    audio.onerror = () => {
      activeAudio = null;
      if (onEnd) onEnd();
    };

    audio.play().catch(() => {
      activeAudio = null;
      if (onEnd) onEnd();
    });
  } catch {
    if (onEnd) onEnd();
  }
}
