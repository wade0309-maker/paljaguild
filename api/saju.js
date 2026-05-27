// api/saju.js — Claude API 사주풀이 풀버전
export const config = { runtime: 'edge' };

const SYSTEM = [
  "당신은 자평명리학 기반 프리미엄 인생 전략 컨설턴트입니다. 아래 형식을 반드시 준수하여 출력하십시오.",
  "규칙: AI 어투 배제. 명사형 종결. 명리 전문용어 → 비즈니스 용어 치환.",
  "3단 논법: [결론] → [명리적 근거] → [현실 예시]",
  "",
  "자산 Tier: S급(50억+) A급(15~50억) B급(5~15억) C급(현상유지). Base 확률 60~70%.",
  "",
  "CHART_DATA_START",
  "{\"hexagon_scores\":{\"worst\":[재물,직업,관계,건강,리스크,잠재력],\"base\":[재물,직업,관계,건강,리스크,잠재력],\"best\":[재물,직업,관계,건강,리스크,잠재력]},\"wealth_trend\":{\"labels\":[\"20대\",\"30대\",\"40대\",\"50대\",\"60대\"],\"scores\":[정수5개]},\"monthly_cashflow\":{\"labels\":[\"1월\",\"2월\",\"3월\",\"4월\",\"5월\",\"6월\",\"7월\",\"8월\",\"9월\",\"10월\",\"11월\",\"12월\"],\"scores\":[정수12개]},\"persona\":{\"title\":\"영문/한글 타이틀\",\"mbti\":\"MBTI\",\"receipt_hashtags\":[\"#태그1\",\"#태그2\",\"#태그3\"]}}",
  "CHART_DATA_END",
  "",
  "### [1] 명식 검증 (표 형식, 천간/지지/십성 4주)",
  "",
  "### [4] 본질 페르소나 ([결론] [명리적근거] [현실예시] 각 1문장)",
  "",
  "### [6] 운명의 도플갱어 (역사/근현대 인물 1명, 2문장)",
  "",
  "### [7] 재산 시뮬레이션 (| 시나리오 | 확률 | Tier | 자산 | 위치 | 표 3행)",
  "",
  "### [9] 부모운 및 관계 리스크 ([결론] [명리적근거] [현실예시] 각 1문장)",
  "",
  "### [10] 대운 서사 ([결론] [명리적근거] [현실예시] 각 1문장)",
  "",
  "### [11] 단기 자산 흐름 (| 구분 | 시기 | 액션 | 표: Jackpot 1~2행, Crash 1~2행)",
  "",
  "### [12] Executive Summary (실행 과제 1. 2. 3.)",
  "",
  "### [13] 운명 요약 영수증",
  "> 🧾 EXECUTIVE BAZI RECEIPT",
  "> 👤 Name: 이름",
  "> 👑 Persona: 타이틀",
  "> 💰 Wealth Tier: 등급 - 한줄요약",
  "> 💡 Quote: 조언 한 줄",
  "> 해시태그 3개",
  "> 🔗 paljaguild.vercel.app"
].join('\n');

export default async function handler(req) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') return new Response('', { headers });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });

  let body;
  try { body = await req.json(); }
  catch(e) { return new Response(JSON.stringify({ error: '요청 파싱 오류' }), { status: 400, headers }); }

  const { name, pillars, ilgan, ilgan_element, geokguk, gender } = body;
  if (!name || !pillars) return new Response(JSON.stringify({ error: '사주 데이터 없음. 스탯 카드를 먼저 발급하세요.' }), { status: 400, headers });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: 'API 키 미설정' }), { status: 500, headers });

  const userMsg = '이름: ' + name + ' / 성별: ' + (gender||'미상') +
    '\n년주: ' + (pillars.year||'') + ' / 월주: ' + (pillars.month||'') +
    ' / 일주: ' + (pillars.day||'') + ' / 시주: ' + (pillars.hour||'') +
    '\n일간: ' + (ilgan||'') + '(' + (ilgan_element||'') + ') / 격국: ' + (geokguk||'미상') +
    '\n\n위 사주를 분석하여 CHART_DATA와 [1][4][6][7][9][10][11][12][13] 섹션을 순서대로 출력하라.';

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2500,
        system: SYSTEM,
        messages: [{ role: 'user', content: userMsg }]
      })
    });

    const respText = await resp.text();
    if (!resp.ok) return new Response(JSON.stringify({ error: 'API 오류', detail: respText.slice(0,200) }), { status: 500, headers });

    const data = JSON.parse(respText);
    const raw = (data.content && data.content[0] && data.content[0].text) ? data.content[0].text.trim() : '';

    let chartData = null;
    const chartMatch = raw.match(/CHART_DATA_START\s*([\s\S]*?)\s*CHART_DATA_END/);
    if (chartMatch) {
      try { chartData = JSON.parse(chartMatch[1].trim()); } catch(e) {}
    }

    const sections = {};
    const sectionRe = /### \[(\d+)\]([\s\S]*?)(?=### \[|\s*$)/g;
    let m;
    while ((m = sectionRe.exec(raw)) !== null) {
      sections[m[1]] = m[2].trim();
    }

    return new Response(JSON.stringify({ success: true, chartData, sections, raw }), { headers });

  } catch(e) {
    return new Response(JSON.stringify({ error: '서버 오류', detail: e.message }), { status: 500, headers });
  }
}
