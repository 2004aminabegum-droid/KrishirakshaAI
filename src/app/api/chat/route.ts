import { NextRequest, NextResponse } from 'next/server';
import { queryKisanVaaniRAG } from '../../../utils/ragEngine';

export const dynamic = 'force-static';

export async function GET() {
  return NextResponse.json({ service: 'kisanvaani_chat_rag', status: 'ready' });
}

export async function POST(req: NextRequest) {
  try {
    const { query, language = 'en', role = 'farmer' } = await req.json();

    if (!query || !query.trim()) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const ragResponse = await queryKisanVaaniRAG(query, language);

    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      query,
      language,
      role,
      answer: ragResponse.answer,
      topic: ragResponse.detectedTopic,
      confidence: ragResponse.confidence,
      sources: ragResponse.sources.map(s => ({
        id: s.id,
        question: s.question,
        category: s.category,
        source: s.source
      })),
      suggested_actions: ragResponse.suggestedActions
    });

  } catch (err: any) {
    console.error('[API Chat RAG Error]:', err);
    return NextResponse.json(
      { error: 'RAG Chatbot failed', details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
