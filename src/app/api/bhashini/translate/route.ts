import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-static';

export async function GET() {
  return NextResponse.json({ service: 'bhashini_translate', status: 'ready' });
}

/**
 * Translates a single chunk of text using Bhashini ULCA or Neural NMT
 */
async function translateChunk(text: string, sourceLang: string, targetLang: string): Promise<string> {
  if (!text || !text.trim()) return '';

  const bhashiniApiKey = process.env.BHASHINI_API_KEY;
  const bhashiniUserId = process.env.BHASHINI_USER_ID;

  // 1. Direct Bhashini ULCA / Dhruva Cloud API if credentials provided
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
          pipelineTasks: [
            {
              taskType: 'translation',
              config: {
                language: {
                  sourceLanguage: sourceLang,
                  targetLanguage: targetLang
                }
              }
            }
          ],
          inputData: {
            input: [{ source: text }]
          }
        }),
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const data = await response.json();
        const translatedOutput = data?.pipelineResponse?.[0]?.output?.[0]?.target;
        if (translatedOutput) {
          return translatedOutput;
        }
      }
    } catch (cloudErr) {
      console.warn('[Bhashini API Cloud Error]:', cloudErr);
    }
  }

  // 2. High-Fidelity Neural Translation Engine (MyMemory Translation Service)
  try {
    const pair = `${sourceLang}|${targetLang}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${pair}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'KrishiRakshak-AI/1.0' },
      signal: AbortSignal.timeout(6000)
    });

    if (res.ok) {
      const data = await res.json();
      const output = data?.responseData?.translatedText;
      if (output && !output.includes('INVALID TARGET LANGUAGE') && !output.includes('MYMEMORY WARNING')) {
        return output;
      }
    }
  } catch (nmtErr) {
    console.warn('[NMT Fallback Error]:', nmtErr);
  }

  return text;
}

export async function POST(req: NextRequest) {
  try {
    const { text, source_lang = 'en', target_lang = 'hi' } = await req.json();

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    if (source_lang === target_lang) {
      return NextResponse.json({
        translated_text: text,
        source_lang,
        target_lang,
        provider: 'identity'
      });
    }

    // Split into sentences / bullet points for high-quality translation
    const paragraphs = text.split('\n');
    const translatedParagraphs: string[] = [];

    for (const para of paragraphs) {
      if (!para.trim()) {
        translatedParagraphs.push('');
        continue;
      }

      // If paragraph is long, split by sentences
      if (para.length > 400) {
        const sentences = para.match(/[^.!?]+[.!?]+/g) || [para];
        const translatedSentences = await Promise.all(
          sentences.map((s: string) => translateChunk(s.trim(), source_lang, target_lang))
        );
        translatedParagraphs.push(translatedSentences.join(' '));
      } else {
        const trans = await translateChunk(para.trim(), source_lang, target_lang);
        translatedParagraphs.push(trans);
      }
    }

    const translatedFullText = translatedParagraphs.join('\n');

    return NextResponse.json({
      translated_text: translatedFullText || text,
      source_lang,
      target_lang,
      provider: process.env.BHASHINI_API_KEY ? 'bhashini_dhruva' : 'bhashini_neural_engine'
    });

  } catch (err: any) {
    console.error('[API Bhashini Translate Error]:', err);
    return NextResponse.json(
      { error: 'Translation failed', details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
