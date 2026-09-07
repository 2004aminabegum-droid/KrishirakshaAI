import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-static';

export async function POST(req: NextRequest) {
  return handleTTS(req);
}

export async function GET(req: NextRequest) {
  return handleTTS(req);
}

async function handleTTS(req: NextRequest) {
  try {
    let text = '';
    let lang = 'hi';

    if (req.method === 'GET') {
      const url = new URL(req.url);
      text = url.searchParams.get('text') || '';
      lang = url.searchParams.get('lang') || 'hi';
    } else {
      const body = await req.json();
      text = body.text || '';
      lang = body.lang || 'hi';
    }

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Clean markdown, symbols, and limit length
    const cleanText = text
      .replace(/[#*_`~[\]()]/g, ' ')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/•/g, ', ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 250);

    const bhashiniApiKey = process.env.BHASHINI_API_KEY;
    const bhashiniUserId = process.env.BHASHINI_USER_ID;

    // 1. Bhashini ULCA / Dhruva TTS (if configured)
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
                taskType: 'tts',
                config: { language: { sourceLanguage: lang }, gender: 'female' }
              }
            ],
            inputData: { input: [{ source: cleanText }] }
          }),
          signal: AbortSignal.timeout(5000)
        });

        if (response.ok) {
          const data = await response.json();
          const audioBase64 = data?.pipelineResponse?.[0]?.audio?.[0]?.audioContent;
          if (audioBase64) {
            const audioBuffer = Buffer.from(audioBase64, 'base64');
            return new NextResponse(audioBuffer, {
              status: 200,
              headers: {
                'Content-Type': 'audio/wav',
                'Content-Length': String(audioBuffer.length),
                'Cache-Control': 'no-store',
                'Access-Control-Allow-Origin': '*'
              }
            });
          }
        }
      } catch (err) {
        console.warn('[Bhashini TTS Cloud Error]:', err);
      }
    }

    // 2. Native Human Audio Stream for all Indian Languages
    try {
      const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(cleanText)}`;
      const ttsRes = await fetch(googleTtsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal: AbortSignal.timeout(7000)
      });

      if (ttsRes.ok) {
        const audioBuffer = Buffer.from(await ttsRes.arrayBuffer());
        // Return raw audio stream — no base64, no data URLs, no JSON
        return new NextResponse(audioBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Length': String(audioBuffer.length),
            'Cache-Control': 'no-store',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    } catch (ttsErr) {
      console.warn('[TTS Stream Error]:', ttsErr);
    }

    // 3. Fallback: instruct client to use browser Web Speech API
    return NextResponse.json({
      fallback_to_web_speech: true,
      lang
    });

  } catch (err: any) {
    console.error('[API TTS Error]:', err);
    return NextResponse.json(
      { error: 'TTS synthesis failed', details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
