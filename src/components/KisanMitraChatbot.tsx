'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bot,
  Mic,
  Send,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  Globe,
  ExternalLink,
  BookOpen,
  Loader2,
  ChevronDown,
  Wheat,
  Bug,
  Wind,
  Leaf,
  CloudRain
} from 'lucide-react';
import { BHASHINI_LANGUAGES, getLanguageConfig, speakText, unlockAudio } from '../utils/bhashiniService';
import { matchVoiceCommand } from '../utils/voiceCommandService';
import { queryKisanVaaniRAG, RagResponse } from '../utils/ragEngine';
import { useLanguage } from '../context/LanguageContext';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  topic?: string;
  sources?: Array<{ id: string; question: string; category: string }>;
  suggestedActions?: Array<{ label: string; action: string; path?: string }>;
  isVoiceCommand?: boolean;
}

export const KisanMitraChatbot: React.FC = () => {
  const router = useRouter();
  const { language: currentAppLang } = useLanguage();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState<string>(currentAppLang || 'hi');
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [activeSpeechStop, setActiveSpeechStop] = useState<(() => void) | null>(null);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Track online/offline status
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  const currentLangConfig = getLanguageConfig(selectedLang);

  // Sync initial language with app context
  useEffect(() => {
    if (currentAppLang && BHASHINI_LANGUAGES.some(l => l.code === currentAppLang)) {
      setSelectedLang(currentAppLang);
    }
  }, [currentAppLang]);

  // Set up listeners for native Android speech bridge
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).handleNativeSpeechResult = (text: string) => {
        setIsListening(false);
        if (text && text.trim()) {
          handleUserQuery(text.trim(), true);
        }
      };
      (window as any).handleNativeSpeechError = (errMsg: string) => {
        setIsListening(false);
        console.warn('[Native Speech Error]:', errMsg);
      };
      (window as any).handleNativeSpeechEnd = () => {
        setIsListening(false);
      };
      (window as any).handleNativeSpeechStart = () => {
        setIsSpeaking(true);
      };
    }
  }, []);

  // Initial welcome greeting
  useEffect(() => {
    const welcomeMessages: Record<string, string> = {
      hi: 'नमस्ते किसान मित्र! 🌾 मैं आपका कृषि रक्षक AI सहायक हूँ। फसल, कीट, बीमारी या खाद के बारे में पूछें, या बोलकर ऐप चलाएं।',
      en: 'Hello Farmer! 🌾 I am your Kisan Mitra AI. Ask me about crop diseases, pests, fertilizers, or use voice commands to navigate!',
      bn: 'নমস্কার কৃষক বন্ধু! 🌾 আমি আপনার কৃষি রক্ষক AI। ফসলের রোগ, কীট বা সার সম্পর্কে প্রশ্ন করুন।',
      te: 'నమస్కారం రైతు మిత్రమా! 🌾 నేను మీ కృషి రక్షక్ AI. పంట వ్యాధులు, తెగుళ్లు గురించి అడగండి.',
      ta: 'வணக்கம் விவசாய தோழரே! 🌾 நான் உங்கள் கிருஷி ரக்ஷக் AI. பயிர் நோய்கள் பற்றி கேளுங்கள்.',
      mr: 'नमस्कार शेतकरी मित्र! 🌾 मी तुमचा कृषी रक्षक AI. पिकांचे रोग, कीड यांबद्दल विचारा.',
    };
    const initialText = welcomeMessages[selectedLang] || welcomeMessages.hi;
    setMessages([{
      id: 'msg_welcome',
      sender: 'bot',
      text: initialText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedActions: [
        { label: '📸 Crop Scanner', action: 'NAVIGATE', path: '/detect' },
        { label: '🐛 Pest Guide', action: 'NAVIGATE', path: '/detect' },
        { label: '🌦️ Weather Risk', action: 'NAVIGATE', path: '/forecasting' }
      ]
    }]);
  }, [selectedLang]);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const toggleVoiceInput = () => {
    unlockAudio();

    if (isSpeaking && activeSpeechStop) {
      activeSpeechStop();
      setIsSpeaking(false);
      setSpeakingMsgId(null);
    }

    // 1. Android Native APK speech recognition
    if (typeof window !== 'undefined' && (window as any).AndroidNativeSpeech?.isNativeSpeechAvailable?.()) {
      if (isListening) {
        setIsListening(false);
      } else {
        setIsListening(true);
        try {
          (window as any).AndroidNativeSpeech.startRecognition(currentLangConfig.speechLocale);
        } catch (err) {
          console.warn('[Native Speech Recognition start failed]:', err);
          setIsListening(false);
        }
      }
      return;
    }

    // 2. Web Speech API (Browser)
    const SpeechRec = typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (!SpeechRec) {
      alert('Speech Recognition is not supported in this browser. Please use Google Chrome, Edge, or our Android App.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      setIsListening(false);
    } else {
      try {
        const rec = new SpeechRec();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = currentLangConfig.speechLocale;

        rec.onstart = () => setIsListening(true);
        rec.onresult = (event: any) => {
          setIsListening(false);
          const transcript = event.results?.[0]?.[0]?.transcript;
          if (transcript?.trim()) {
            handleUserQuery(transcript.trim(), true);
          }
        };
        rec.onerror = (e: any) => {
          console.warn('[Web Speech Recognition error]:', e);
          setIsListening(false);
        };
        rec.onend = () => setIsListening(false);

        recognitionRef.current = rec;
        rec.start();
      } catch (err) {
        console.warn('Could not start web speech recognition:', err);
        setIsListening(false);
      }
    }
  };

  const handleUserQuery = async (queryText: string, fromVoice: boolean = false) => {
    if (!queryText.trim()) return;
    unlockAudio();

    const userMsg: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    // Voice navigation commands
    const voiceCmd = matchVoiceCommand(queryText, selectedLang);
    if (voiceCmd?.isCommand && voiceCmd.targetPath) {
      const botCmdMsg: ChatMessage = {
        id: `msg_bot_${Date.now()}`,
        sender: 'bot',
        text: `⚡ ${voiceCmd.feedbackText}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isVoiceCommand: true
      };
      setMessages(prev => [...prev, botCmdMsg]);
      setLoading(false);
      const speech = speakText(voiceCmd.feedbackText, selectedLang, () => setIsSpeaking(true), () => setIsSpeaking(false));
      setActiveSpeechStop(() => speech.stop);
      setTimeout(() => router.push(voiceCmd.targetPath!), 900);
      return;
    }

    // RAG Chatbot Query
    try {
      const ragRes: RagResponse = await queryKisanVaaniRAG(queryText, selectedLang);
      const botMsg: ChatMessage = {
        id: `msg_bot_${Date.now()}`,
        sender: 'bot',
        text: ragRes.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        topic: ragRes.detectedTopic,
        sources: ragRes.sources,
        suggestedActions: ragRes.suggestedActions
      };
      setMessages(prev => [...prev, botMsg]);

      if (fromVoice) {
        const speech = speakText(
          ragRes.answer,
          selectedLang,
          () => { setIsSpeaking(true); setSpeakingMsgId(botMsg.id); },
          () => { setIsSpeaking(false); setSpeakingMsgId(null); }
        );
        setActiveSpeechStop(() => speech.stop);
      }
    } catch (err) {
      console.warn('[Chatbot Query Fallback]:', err);
      // Resilient offline fallback response
      const fallbackMsg: ChatMessage = {
        id: `msg_bot_${Date.now()}`,
        sender: 'bot',
        text: `🌾 [Offline Mode] Advice for "${queryText}": Practice regular field scouting, balanced NPK application, and proper drainage. For insect pests, apply 5% Neem Seed Kernel Extract (NSKE). For fungal blights, apply copper oxychloride or bio-fungicide. You can also scan your crop leaves directly in the Crop Scanner.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        topic: 'General Agronomy',
        suggestedActions: [
          { label: '📸 Open Crop Scanner', action: 'NAVIGATE', path: '/detect' },
          { label: '🌿 View IPM Remedies', action: 'NAVIGATE', path: '/ipm' }
        ]
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleReadAloud = (text: string, msgId?: string) => {
    unlockAudio();
    if (isSpeaking && activeSpeechStop) {
      activeSpeechStop();
      setIsSpeaking(false);
      const wasSame = speakingMsgId === msgId;
      setSpeakingMsgId(null);
      if (wasSame) return;
    }
    if (msgId) setSpeakingMsgId(msgId);
    const speech = speakText(
      text,
      selectedLang,
      () => {
        setIsSpeaking(true);
        if (msgId) setSpeakingMsgId(msgId);
      },
      () => {
        setIsSpeaking(false);
        setSpeakingMsgId(null);
      }
    );
    setActiveSpeechStop(() => speech.stop);
  };

  const handleActionClick = (action: { label: string; action: string; path?: string }) => {
    if (action.path) router.push(action.path);
  };

  const quickQuestions = [
    { icon: <Wheat className="h-3 w-3" />, label: 'Yellow Rust', q: 'How to treat yellow rust in wheat crop?' },
    { icon: <Bug className="h-3 w-3" />, label: 'Rice BPH', q: 'How to manage Brown Planthopper in rice?' },
    { icon: <Leaf className="h-3 w-3" />, label: 'Neem Oil', q: 'How to prepare neem oil spray for crop pests?' },
    { icon: <CloudRain className="h-3 w-3" />, label: 'Post-Rain Care', q: 'Protect crops from fungal diseases after heavy rainfall?' },
    { icon: <Wind className="h-3 w-3" />, label: 'Late Blight', q: 'What is the remedy for potato late blight?' },
  ];

  return (
    <>
      <style>{`
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes msgFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseRing {
          0%   { transform: scale(1);   opacity: 0.7; }
          70%  { transform: scale(1.8); opacity: 0; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); }
          40%            { transform: translateY(-6px); }
        }
        .chat-slide-up   { animation: chatSlideUp 0.25s cubic-bezier(.16,1,.3,1) both; }
        .msg-fade-in     { animation: msgFadeIn 0.22s ease both; }
        .dot-bounce-1    { animation: dotBounce 1.2s infinite; }
        .dot-bounce-2    { animation: dotBounce 1.2s 0.2s infinite; }
        .dot-bounce-3    { animation: dotBounce 1.2s 0.4s infinite; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .chat-scroll::-webkit-scrollbar { width: 3px; }
        .chat-scroll::-webkit-scrollbar-track { background: transparent; }
        .chat-scroll::-webkit-scrollbar-thumb { background: #1f2937; border-radius: 10px; }
      `}</style>

      {/* ── Floating Launcher ───────────────────────────────────────────────── */}
      {!isOpen && (
        <button
          onClick={() => { setIsOpen(true); setTimeout(() => inputRef.current?.focus(), 300); }}
          className="fixed bottom-20 md:bottom-6 right-6 z-50 group cursor-pointer"
          aria-label="Open Kisan Mitra AI"
        >
          <div style={{
            background: '#235334',
            borderRadius: '999px',
            padding: '14px 22px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 8px 28px rgba(35, 83, 52, 0.35), 0 2px 8px rgba(0,0,0,0.1)',
            border: '1.5px solid rgba(228, 239, 230, 0.6)',
            transition: 'transform 0.2s, box-shadow 0.2s, background 0.2s',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.04)'; (e.currentTarget as HTMLElement).style.background = '#1B4229'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 36px rgba(35, 83, 52, 0.45), 0 2px 8px rgba(0,0,0,0.15)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLElement).style.background = '#235334'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 28px rgba(35, 83, 52, 0.35), 0 2px 8px rgba(0,0,0,0.1)'; }}
          >
            {/* Pulse ring */}
            <div className="relative">
              <span style={{
                position: 'absolute', inset: '-6px', borderRadius: '50%',
                border: '2px solid rgba(228, 239, 230, 0.7)',
                animation: 'pulseRing 2s ease-out infinite'
              }} />
              <Bot style={{ width: 22, height: 22, color: '#fff' }} />
            </div>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 13, letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>
              Kisan Mitra AI 🌾
            </span>
          </div>
        </button>
      )}

      {/* ── Chatbot Panel ────────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="chat-slide-up fixed bottom-4 right-4 z-50 flex flex-col overflow-hidden"
          style={{
            width: 'min(440px, 96vw)',
            height: 'min(680px, 90vh)',
            background: '#FFFFFF',
            border: '1px solid #E6DFD1',
            borderRadius: '24px',
            boxShadow: '0 24px 60px rgba(35, 83, 52, 0.18), 0 4px 16px rgba(0,0,0,0.06)',
          }}
        >
          {/* Top accent line */}
          <div style={{
            height: 3,
            background: '#235334',
            borderRadius: '24px 24px 0 0',
            flexShrink: 0,
          }} />

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div style={{
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#F5F2E9',
            borderBottom: '1px solid #E6DFD1',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Avatar */}
              <div style={{
                width: 38, height: 38, borderRadius: 12,
                background: '#235334',
                border: '1.5px solid rgba(255,255,255,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(35,83,52,0.25)',
                flexShrink: 0,
              }}>
                <Sparkles style={{ width: 18, height: 18, color: '#F6E8CB' }} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#1A221C', fontWeight: 800, fontSize: 14 }}>Kisan Mitra AI</span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 6,
                    background: '#E4EFE6', border: '1px solid #CFE0D3',
                    color: '#235334', letterSpacing: '0.04em'
                  }}>BHASHINI</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: isOnline ? '#235334' : '#d97706',
                    boxShadow: isOnline ? '0 0 6px #235334' : '0 0 6px #d97706',
                    animation: 'pulseRing 2s ease-out infinite',
                    display: 'inline-block',
                  }} />
                  <span style={{ color: isOnline ? '#566459' : '#b45309', fontSize: 10, fontWeight: isOnline ? 500 : 600 }}>
                    {isOnline ? 'KisanVaani · 22.6k Q&A RAG' : '⚡ Offline Vector RAG Active'}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Language Picker */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setLangMenuOpen(v => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: '#FFFFFF', border: '1px solid #D8D0C0',
                    borderRadius: 10, padding: '5px 10px',
                    color: '#235334', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <Globe style={{ width: 12, height: 12, color: '#235334' }} />
                  {currentLangConfig.nativeName}
                  <ChevronDown style={{ width: 10, height: 10, opacity: 0.6 }} />
                </button>

                {langMenuOpen && (
                  <div style={{
                    position: 'absolute', top: 34, right: 0, zIndex: 10,
                    background: '#FFFFFF', border: '1px solid #E6DFD1',
                    borderRadius: 14, overflow: 'hidden',
                    boxShadow: '0 16px 40px rgba(35,83,52,0.15)',
                    minWidth: 170,
                    animation: 'msgFadeIn 0.15s ease both',
                  }}>
                    {BHASHINI_LANGUAGES.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => { setSelectedLang(lang.code); setLangMenuOpen(false); }}
                        style={{
                          width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '8px 14px', fontSize: 12, fontWeight: lang.code === selectedLang ? 700 : 500,
                          color: lang.code === selectedLang ? '#235334' : '#566459',
                          background: lang.code === selectedLang ? '#E4EFE6' : 'transparent',
                          cursor: 'pointer', border: 'none',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#E4EFE6'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = lang.code === selectedLang ? '#E4EFE6' : 'transparent'; }}
                      >
                        <span>{lang.nativeName}</span>
                        <span style={{ fontSize: 10, color: '#8C998E' }}>{lang.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Close */}
              <button
                onClick={() => { setIsOpen(false); if (isSpeaking && activeSpeechStop) activeSpeechStop(); setLangMenuOpen(false); }}
                style={{
                  width: 30, height: 30, borderRadius: 8, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#FFFFFF', border: '1px solid #D8D0C0',
                  color: '#566459', transition: 'all 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FEE2E2'; (e.currentTarget as HTMLElement).style.color = '#DC2626'; (e.currentTarget as HTMLElement).style.borderColor = '#FCA5A5'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#FFFFFF'; (e.currentTarget as HTMLElement).style.color = '#566459'; (e.currentTarget as HTMLElement).style.borderColor = '#D8D0C0'; }}
              >
                <X style={{ width: 15, height: 15 }} />
              </button>
            </div>
          </div>

          {/* ── Message List ────────────────────────────────────────────────── */}
          <div className="chat-scroll" style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 8px', display: 'flex', flexDirection: 'column', gap: 12, background: '#FAF8F4' }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className="msg-fade-in"
                style={{ display: 'flex', gap: 8, justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-end' }}
              >
                {/* Bot Avatar */}
                {msg.sender === 'bot' && (
                  <div style={{
                    width: 28, height: 28, borderRadius: 9, flexShrink: 0,
                    background: msg.isVoiceCommand
                      ? '#7c3aed'
                      : '#235334',
                    border: '1px solid rgba(35,83,52,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 2,
                  }}>
                    <Sparkles style={{ width: 13, height: 13, color: '#F6E8CB' }} />
                  </div>
                )}

                {/* Bubble */}
                <div style={{
                  maxWidth: '82%',
                  borderRadius: msg.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  padding: '10px 14px',
                  fontSize: 12.5,
                  lineHeight: 1.6,
                  ...(msg.sender === 'user'
                    ? {
                      background: '#235334',
                      color: '#FFFFFF',
                      boxShadow: '0 4px 16px rgba(35,83,52,0.25)',
                    }
                    : {
                      background: '#FFFFFF',
                      border: '1px solid #E6DFD1',
                      color: '#1A221C',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    })
                }}>
                  {/* Topic badge */}
                  {msg.topic && msg.sender === 'bot' && (
                    <span style={{
                      display: 'inline-block', marginBottom: 6,
                      fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
                      background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(52,211,153,0.2)',
                      color: '#6ee7b7', letterSpacing: '0.06em', textTransform: 'uppercase'
                    }}>
                      {msg.topic}
                    </span>
                  )}

                  <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.text}</p>

                  {/* Sources */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, color: '#34d399', fontSize: 10, fontWeight: 700 }}>
                        <BookOpen style={{ width: 10, height: 10 }} />
                        KisanVaani Source
                      </div>
                      {msg.sources.slice(0, 2).map((s, i) => (
                        <div key={i} style={{ fontSize: 9.5, color: '#475569', marginBottom: 2 }}>
                          <span style={{ color: '#6b7280', fontFamily: 'monospace' }}>[{s.id}]</span>{' '}
                          <span style={{ color: '#64748b' }}>{s.question}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action chips */}
                  {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {msg.suggestedActions.map((act, i) => (
                        <button
                          key={i}
                          onClick={() => handleActionClick(act)}
                          style={{
                            padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                            fontSize: 10, fontWeight: 700,
                            background: 'rgba(16,185,129,0.10)',
                            border: '1px solid rgba(52,211,153,0.25)',
                            color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: 3,
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.2)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(52,211,153,0.5)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.10)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(52,211,153,0.25)'; }}
                        >
                          {act.label} <ExternalLink style={{ width: 8, height: 8, opacity: 0.6 }} />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Footer: time + read aloud */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, opacity: 0.55 }}>
                    <span style={{ fontSize: 9.5 }}>{msg.timestamp}</span>
                    {msg.sender === 'bot' && (
                      <button
                        onClick={() => handleReadAloud(msg.text, msg.id)}
                        style={{
                          cursor: 'pointer', background: 'none', border: 'none',
                          color: isSpeaking && speakingMsgId === msg.id ? '#fbbf24' : 'inherit',
                          padding: 2, display: 'flex', alignItems: 'center',
                          transition: 'color 0.2s',
                        }}
                        title={isSpeaking && speakingMsgId === msg.id ? "Stop speaking" : "Read aloud"}
                      >
                        {isSpeaking && speakingMsgId === msg.id
                          ? <VolumeX style={{ width: 14, height: 14, color: '#fbbf24' }} />
                          : <Volume2 style={{ width: 14, height: 14 }} />
                        }
                      </button>
                    )}
                  </div>
                </div>

                {/* User Avatar */}
                {msg.sender === 'user' && (
                  <div style={{
                    width: 28, height: 28, borderRadius: 9, flexShrink: 0,
                    background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
                    border: '1px solid rgba(96,165,250,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 2, fontSize: 12, color: '#93c5fd', fontWeight: 800,
                  }}>
                    👤
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {loading && (
              <div className="msg-fade-in" style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 9, flexShrink: 0,
                  background: 'linear-gradient(135deg, #065f46, #059669)',
                  border: '1px solid rgba(52,211,153,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Loader2 style={{ width: 13, height: 13, color: '#a7f3d0', animation: 'spin 1s linear infinite' }} />
                </div>
                <div style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '18px 18px 18px 4px', padding: '12px 16px',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <span className="dot-bounce-1" style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
                  <span className="dot-bounce-2" style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
                  <span className="dot-bounce-3" style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ── Quick Topic Chips ───────────────────────────────────────────── */}
          <div className="no-scrollbar" style={{
            overflowX: 'auto', display: 'flex', gap: 6, padding: '10px 14px',
            borderTop: '1px solid #E6DFD1',
            background: '#F5F2E9', flexShrink: 0,
          }}>
            {quickQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => handleUserQuery(q.q)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', borderRadius: 999, whiteSpace: 'nowrap', cursor: 'pointer',
                  background: '#FFFFFF', border: '1px solid #D8D0C0',
                  color: '#3E4B41', fontSize: 11, fontWeight: 600,
                  transition: 'all 0.2s', flexShrink: 0,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#E4EFE6'; (e.currentTarget as HTMLElement).style.color = '#235334'; (e.currentTarget as HTMLElement).style.borderColor = '#CFE0D3'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#FFFFFF'; (e.currentTarget as HTMLElement).style.color = '#3E4B41'; (e.currentTarget as HTMLElement).style.borderColor = '#D8D0C0'; }}
              >
                {q.icon}
                {q.label}
              </button>
            ))}
          </div>

          {/* ── Listening Banner ────────────────────────────────────────────── */}
          {isListening && (
            <div style={{
              padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#FBF4E6', borderTop: '1px solid #F5E8CB',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Audio wave bars */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {[0, 0.1, 0.2, 0.1, 0].map((delay, i) => (
                    <div key={i} style={{
                      width: 3, height: 14, borderRadius: 2, background: '#DDA326',
                      animation: `dotBounce 0.8s ${delay}s ease-in-out infinite`,
                    }} />
                  ))}
                </div>
                <span style={{ color: '#7A4B13', fontSize: 11, fontWeight: 700 }}>
                  Listening in {currentLangConfig.name}...
                </span>
              </div>
              <button
                onClick={toggleVoiceInput}
                style={{ color: '#7A4B13', fontSize: 11, fontWeight: 700, cursor: 'pointer', background: 'none', border: 'none', textDecoration: 'underline' }}
              >
                Stop
              </button>
            </div>
          )}

          {/* ── Input Bar ───────────────────────────────────────────────────── */}
          <form
            onSubmit={e => { e.preventDefault(); handleUserQuery(inputText); }}
            style={{
              padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8,
              background: '#FFFFFF', borderTop: '1px solid #E6DFD1',
              flexShrink: 0,
            }}
          >
            {/* Mic */}
            <button
              type="button"
              onClick={toggleVoiceInput}
              style={{
                width: 38, height: 38, borderRadius: 11, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                transition: 'all 0.2s',
                ...(isListening
                  ? { background: '#DDA326', boxShadow: '0 0 16px rgba(221,163,38,0.5)', animation: 'pulseRing 1.5s ease-out infinite' }
                  : { background: '#F5F2E9', color: '#566459', border: '1px solid #D8D0C0' }
                )
              }}
              title="Voice input"
            >
              <Mic style={{ width: 16, height: 16, color: isListening ? '#fff' : '#566459' }} />
            </button>

            {/* Input */}
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder={
                selectedLang === 'hi' ? 'प्रश्न पूछें या आवाज़ में बोलें...' :
                selectedLang === 'bn' ? 'প্রশ্ন জিজ্ঞেস করুন বা বলুন...' :
                selectedLang === 'te' ? 'ప్రశ్న అడగండి లేదా మాట్లాడండి...' :
                selectedLang === 'ta' ? 'கேள்வி கேளுங்கள் அல்லது பேசுங்கள்...' :
                selectedLang === 'mr' ? 'प्रश्न विचारा किंवा बोला...' :
                `Ask in ${currentLangConfig.nativeName}...`
              }
              style={{
                flex: 1, borderRadius: 11, background: '#F5F2E9',
                border: '1px solid #D8D0C0',
                padding: '9px 14px', fontSize: 12.5, color: '#1A221C',
                outline: 'none', transition: 'border 0.2s',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#235334'; e.currentTarget.style.background = '#FFFFFF'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#D8D0C0'; e.currentTarget.style.background = '#F5F2E9'; }}
            />

            {/* Send */}
            <button
              type="submit"
              disabled={!inputText.trim() || loading}
              style={{
                width: 38, height: 38, borderRadius: 11, border: 'none', cursor: inputText.trim() && !loading ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                transition: 'all 0.2s',
                background: inputText.trim() && !loading
                  ? '#235334'
                  : '#E6DFD1',
                boxShadow: inputText.trim() && !loading ? '0 4px 14px rgba(35,83,52,0.3)' : 'none',
              }}
            >
              <Send style={{ width: 15, height: 15, color: inputText.trim() && !loading ? '#fff' : '#8C998E' }} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
