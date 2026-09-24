import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';

export const runtime = 'nodejs';
export const maxDuration = 60;

const GEMINI_MODEL = 'gemini-3.1-flash-lite';
const GROQ_MODEL = 'openai/gpt-oss-120b';

async function callGemini(prompt: string, attempt = 1): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured on the server.');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    // Gemini's free tier occasionally returns 503 (overloaded) or 429 (rate
    // limited) — these are transient, so retry a couple of times with a
    // short delay before giving up.
    if ((res.status === 503 || res.status === 429) && attempt < 3) {
      await new Promise((r) => setTimeout(r, attempt * 2000));
      return callGemini(prompt, attempt + 1);
    }
    throw new Error(`Gemini API error (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '';
}

async function callGroq(prompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not configured on the server.');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '';
}

// Tries each configured AI provider in order, falling back to the next one
// if the previous fails (e.g. temporary overload) — so a single provider
// having a bad day never blocks the whole feature.
async function callAI(prompt: string): Promise<{ text: string; provider: string }> {
  const errors: string[] = [];

  if (process.env.GEMINI_API_KEY) {
    try {
      return { text: await callGemini(prompt), provider: 'Gemini' };
    } catch (e: any) {
      errors.push(e.message);
    }
  }

  if (process.env.GROQ_API_KEY) {
    try {
      return { text: await callGroq(prompt), provider: 'Groq' };
    } catch (e: any) {
      errors.push(e.message);
    }
  }

  throw new Error(`All AI providers failed. ${errors.join(' | ')}`);
}
  return data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '';
}

function extractJsonObject(text: string): any {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in AI response.');
  return JSON.parse(cleaned.slice(start, end + 1));
}

function extractJsonArray(text: string): any[] {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1) throw new Error('No JSON array found in AI response.');
  return JSON.parse(cleaned.slice(start, end + 1));
}

export async function POST(req: Request) {
  try {
    const { dealId } = await req.json();
    if (!dealId) return NextResponse.json({ error: 'dealId is required' }, { status: 400 });

    const supabase = createAdminClient();

    const { data: deal, error: dealErr } = await supabase.from('deals').select('*').eq('id', dealId).single();
    if (dealErr || !deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 });

    // --- 1. Extract text from the pitch deck (PDF supported) ---
    let deckText = '';
    let deckNote = '';
    if (deal.pitch_deck_path) {
      if (/\.pdf$/i.test(deal.pitch_deck_path)) {
        const { data: file, error: dlErr } = await supabase.storage.from('pitch-decks').download(deal.pitch_deck_path);
        if (!dlErr && file) {
          try {
            const buf = Buffer.from(await file.arrayBuffer());
            // @ts-ignore - loaded dynamically at runtime to avoid a known
            // build-time issue with this package's top-level debug code.
            const { default: pdfParse } = await import('pdf-parse');
            const parsed = await pdfParse(buf);
            deckText = parsed.text.slice(0, 15000);
          } catch {
            deckNote = 'Pitch deck was attached but could not be read.';
          }
        }
      } else {
        deckNote = 'Pitch deck is attached but only PDF files can be read automatically right now (PowerPoint files are stored but not yet parsed).';
      }
    }

    // --- 2. Extract data from the financial model (xlsx/xls/csv supported) ---
    let financialText = '';
    if (deal.financial_model_path && /\.(xlsx|xls|csv)$/i.test(deal.financial_model_path)) {
      const { data: file, error: dlErr } = await supabase.storage.from('financial-models').download(deal.financial_model_path);
      if (!dlErr && file) {
        try {
          const buf = Buffer.from(await file.arrayBuffer());
          const wb = XLSX.read(buf, { type: 'buffer' });
          const parts: string[] = [];
          for (const sheetName of wb.SheetNames.slice(0, 3)) {
            const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sheetName]);
            parts.push(`--- Sheet: ${sheetName} ---\n${csv.slice(0, 4000)}`);
          }
          financialText = parts.join('\n\n').slice(0, 12000);
        } catch {
          // ignore — proceed without financial data
        }
      }
    }

    // --- 3. Ask Gemini to extract structured deal info ---
    const extractionPrompt = `You are helping a fundraising advisory firm analyze a startup's deal materials.

Company name: ${deal.company_name}
Typed one-liner: ${deal.one_liner || '(not provided)'}
Typed sector: ${deal.sector || '(not provided)'}
Typed stage: ${deal.stage || '(not provided)'}
Typed geography: ${deal.geography || '(not provided)'}
Typed funding ask: ${deal.funding_ask || '(not provided)'}
Notes from the advisor: ${deal.info_notes || '(none)'}
${deckNote ? `Note: ${deckNote}` : ''}

${deckText ? `--- Pitch deck text (extracted) ---\n${deckText}\n` : '(No pitch deck text available.)'}
${financialText ? `--- Financial model data (extracted) ---\n${financialText}\n` : '(No financial model data available.)'}

Based on everything above, respond with ONLY a raw JSON object (no markdown, no commentary) with these exact keys:
{
  "sector": "best guess at the company's sector/industry, short phrase",
  "stage": "best guess at funding stage (e.g. Pre-seed, Seed, Series A)",
  "geography": "best guess at the company's primary country/market",
  "funding_ask": <number, the funding amount being raised in USD, or null if unknown>,
  "one_liner": "a punchy one-sentence description of what the company does",
  "key_highlights": ["3-5 short bullet points of the most investor-relevant facts: traction, revenue, team, market size, etc."],
  "thesis_summary": "a 2-3 sentence summary of why an investor might find this compelling, written the way an investor's own thesis note would read"
}`;

    const { text: extractionRaw, provider: extractionProvider } = await callAI(extractionPrompt);
    const extracted = extractJsonObject(extractionRaw);

    const updates: Record<string, any> = { extracted_data: extracted };
    if (!deal.sector && extracted.sector) updates.sector = extracted.sector;
    if (!deal.stage && extracted.stage) updates.stage = extracted.stage;
    if (!deal.geography && extracted.geography) updates.geography = extracted.geography;
    if (!deal.funding_ask && extracted.funding_ask) updates.funding_ask = extracted.funding_ask;
    if (!deal.one_liner && extracted.one_liner) updates.one_liner = extracted.one_liner;

    await supabase.from('deals').update(updates).eq('id', dealId);
    const finalDeal = { ...deal, ...updates };

    // --- 4. Run the existing rule-based match to build a candidate pool ---
    await supabase.rpc('match_investors_for_deal', { p_deal_id: dealId });

    const { data: candidates } = await supabase
      .from('deal_matches')
      .select('id, investor_id, match_score, investors(investor_name, description, industry_focus, stages, geographic_focus)')
      .eq('deal_id', dealId)
      .order('match_score', { ascending: false })
      .limit(60);

    let aiReviewedCount = 0;

    if (candidates && candidates.length > 0) {
      const investorList = candidates
        .map((c: any) =>
          `[id:${c.investor_id}] ${c.investors.investor_name} — Focus: ${c.investors.industry_focus || 'n/a'}; Stages: ${c.investors.stages || 'n/a'}; Geography: ${c.investors.geographic_focus || 'n/a'}; Thesis: ${(c.investors.description || '').slice(0, 500)}`
        )
        .join('\n');

      const rankingPrompt = `You are a fundraising advisor matching a startup deal to the right investors based on genuine thesis fit, not just keyword overlap.

DEAL SUMMARY:
Company: ${finalDeal.company_name}
One-liner: ${finalDeal.one_liner || ''}
Sector: ${finalDeal.sector || ''}
Stage: ${finalDeal.stage || ''}
Geography: ${finalDeal.geography || ''}
Funding ask: ${finalDeal.funding_ask || ''}
Thesis summary: ${extracted.thesis_summary || ''}
Key highlights: ${(extracted.key_highlights || []).join('; ')}

CANDIDATE INVESTORS:
${investorList}

For EACH investor listed above, judge how genuinely well their stated thesis/focus fits this specific deal. Respond with ONLY a raw JSON array (no markdown), one object per investor, in this exact shape:
[{"id": "<the id shown in brackets, exactly as given>", "score": <0-100 integer>, "rationale": "<one sentence, specific to this deal, max 25 words>"}]`;

      const { text: rankingRaw } = await callAI(rankingPrompt);
      const rankings = extractJsonArray(rankingRaw) as { id: string; score: number; rationale: string }[];

      for (const r of rankings) {
        if (!r.id) continue;
        const scoreNormalized = Math.max(0, Math.min(4, r.score / 25));
        const category = r.score >= 75 ? 'Strong Match' : r.score >= 45 ? 'Good Match' : 'Possible Match';
        const { error: updErr } = await supabase
          .from('deal_matches')
          .update({ match_score: scoreNormalized, category, rationale: `AI: ${r.rationale}` })
          .eq('deal_id', dealId)
          .eq('investor_id', r.id);
        if (!updErr) aiReviewedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      extracted,
      aiReviewedCount,
      candidatePoolSize: candidates?.length || 0,
      provider: extractionProvider,
    });
  } catch (err: any) {
    console.error('analyze-deal error:', err);
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}
