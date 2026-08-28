/**
 * KrishiRakshak AI — Voice Command & App Navigation Assistant
 * =============================================================
 * Interprets spoken voice transcripts in all Indian languages & English
 * to navigate and execute commands across the KrishiRakshak AI suite.
 */

export interface VoiceCommandMatch {
  isCommand: boolean;
  intent: 'NAVIGATE' | 'ACTION' | 'QUERY';
  targetPath?: string;
  commandName: string;
  feedbackText: string;
  feedbackTextHi: string;
}

const COMMAND_RULES: Array<{
  id: string;
  path: string;
  keywords: string[];
  feedback: { en: string; hi: string; bn: string; te: string };
}> = [
  {
    id: 'NAV_DETECT',
    path: '/detect',
    keywords: [
      'scan', 'camera', 'photo', 'detect', 'leaf', 'disease', 'photo scan',
      'स्कैन', 'कैमरा', 'पत्ता', 'बीमारी', 'रोग', 'फसल जांच', 'फोटो',
      'স্ক্যান', 'ক্যামেরা', 'পাতা', 'রোগ',
      'స్కానర్', 'కెమెరా', 'వ్యాధి'
    ],
    feedback: {
      en: 'Opening Crop Health Scanner...',
      hi: 'फसल स्वास्थ्य स्कैनर खोल रहे हैं...',
      bn: 'ফসলের স্বাস্থ্য স্ক্যানার খোলা হচ্ছে...',
      te: 'పంట ఆరోగ్య స్కానర్ తెరవబడుతోంది...'
    }
  },
  {
    id: 'NAV_PEST',
    path: '/detect',
    keywords: [
      'pest', 'insect', 'bug', 'trap', 'armyworm', 'aphid', 'bollworm', 'iot trap',
      'कीट', 'कीड़ा', 'कीट पहचान', 'ट्रैप', 'सुंडी',
      'পোকা', 'কীটপতঙ্গ', 'ফাঁদ',
      'తెగులు', 'పురుగు'
    ],
    feedback: {
      en: 'Opening DLCPD-25 Pest Detection...',
      hi: 'कीट पहचान और जाल स्कैनर खोल रहे हैं...',
      bn: 'কীটপতঙ্গ শনাক্তকরণ খোলা হচ্ছে...',
      te: 'తెగుళ్ల గుర్తింపు తెరవబడుతోంది...'
    }
  },
  {
    id: 'NAV_FORECAST',
    path: '/forecasting',
    keywords: [
      'weather', 'forecast', 'rain', 'humidity', 'climate', 'temperature',
      'मौसम', 'बारिश', 'तापमान', 'वर्षा', 'पूर्वानुमान',
      'আবহাওয়া', 'বৃষ্টি', 'তাপমাত্রা',
      'వాతావరణం', 'వర్షం'
    ],
    feedback: {
      en: 'Opening Weather & Disease Forecasting...',
      hi: 'मौसम और रोग पूर्वानुमान खोल रहे हैं...',
      bn: 'আবহাওয়া এবং রোগ পূর্বাভাস খোলা হচ্ছে...',
      te: 'వాతావరణ సూచన తెరవబడుతోంది...'
    }
  },
  {
    id: 'NAV_MAP',
    path: '/map',
    keywords: [
      'map', 'gis', 'outbreak map', 'hotspot', 'district', 'village',
      'नक्शा', 'मानचित्र', 'हॉटस्पॉट', 'जिला',
      'মানচিত্র', 'ম্যাপ',
      'మ్యాప్', 'పటం'
    ],
    feedback: {
      en: 'Opening Regional Outbreak GIS Map...',
      hi: 'रोग प्रसार का नक्शा खोल रहे हैं...',
      bn: 'রোগের মানচিত্র খোলা হচ্ছে...',
      te: 'వ్యాధి వ్యాప్తి పటం తెరవబడుతోంది...'
    }
  },
  {
    id: 'NAV_IPM',
    path: '/ipm',
    keywords: [
      'ipm', 'remedy', 'organic', 'treatment', 'spray', 'chemical', 'neem',
      'उपचार', 'दवा', 'कीटनाशक', 'जैविक', 'नीम', 'छिड़काव',
      'প্রতিকার', 'ঔষধ', 'জৈব', 'কীটনাশক',
      'నివారణ', 'సేంద్రీయ', 'మందులు'
    ],
    feedback: {
      en: 'Opening Integrated Pest Management (IPM) Guide...',
      hi: 'एकीकृत कीट प्रबंधन (IPM) गाइड खोल रहे हैं...',
      bn: 'আইপিএম প্রতিকার নির্দেশিকা খোলা হচ্ছে...',
      te: 'సమగ్ర సస్యరక్షణ మార్గదర్శిని తెరవబడుతోంది...'
    }
  },
  {
    id: 'NAV_ENV_RISK',
    path: '/environmental-risk',
    keywords: [
      'soil', 'sensor', 'npk', 'moisture', 'humidity risk', 'environment',
      'मिट्टी', 'सेंसर', 'एनपीके', 'नमी', 'जोखिम',
      'মাটি', 'সেন্সর', 'আর্দ্রতা',
      'నేల', 'తేమ'
    ],
    feedback: {
      en: 'Opening Soil & Climate Risk Analyzer...',
      hi: 'मिट्टी और जलवायु जोखिम विश्लेषक खोल रहे हैं...',
      bn: 'মাটি ও জলবায়ু ঝুঁকি বিশ্লেষক খোলা হচ্ছে...',
      te: 'నేల & వాతావరణ ప్రమాద విశ్లేషణ తెరవబడుతోంది...'
    }
  },
  {
    id: 'NAV_DASHBOARD',
    path: '/dashboard/farmer',
    keywords: [
      'home', 'dashboard', 'overview', 'main page',
      'होम', 'डैशबोर्ड', 'मुख्य पृष्ठ',
      'হোম', 'ড্যাশবোর্ড',
      'హోమ్', 'డాష్‌బోర్డ్'
    ],
    feedback: {
      en: 'Navigating to Farmer Dashboard...',
      hi: 'किसान डैशबोर्ड पर जा रहे हैं...',
      bn: 'কৃষক ড্যাশবোর্ডে যাওয়া হচ্ছে...',
      te: 'రైతు డాష్‌బోర్డ్‌కు వెళ్తున్నారు...'
    }
  },
  {
    id: 'NAV_SURVEILLANCE',
    path: '/surveillance',
    keywords: [
      'surveillance', 'monitoring', 'field report', 'iot trap counts',
      'निगरानी', 'सर्वेक्षण', 'खेत रिपोर्ट',
      'নজরদারি', 'মাঠ রিপোর্ট',
      'నిఘా'
    ],
    feedback: {
      en: 'Opening Field Surveillance & IoT Tracker...',
      hi: 'फील्ड निगरानी और ट्रैकर खोल रहे हैं...',
      bn: 'মাঠের নজরদারি খোলা হচ্ছে...',
      te: 'క్షేత్ర నిఘా తెరవబడుతోంది...'
    }
  }
];

/**
 * Checks if the voice transcript corresponds to a direct navigation command
 */
export function matchVoiceCommand(transcript: string, lang: string = 'en'): VoiceCommandMatch | null {
  if (!transcript || !transcript.trim()) return null;
  const text = transcript.toLowerCase().trim();

  // Check against registered app commands
  for (const cmd of COMMAND_RULES) {
    const isMatched = cmd.keywords.some(keyword => text.includes(keyword.toLowerCase()));
    if (isMatched) {
      const feedback = (cmd.feedback as any)[lang] || cmd.feedback.en;
      return {
        isCommand: true,
        intent: 'NAVIGATE',
        targetPath: cmd.path,
        commandName: cmd.id,
        feedbackText: feedback,
        feedbackTextHi: cmd.feedback.hi
      };
    }
  }

  return null;
}
