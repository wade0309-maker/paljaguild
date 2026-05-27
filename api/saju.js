// api/saju.js — Claude API 사주풀이 (핵심 섹션 축약)
export const config = { runtime: 'edge' };

const SYSTEM = [
  "당신은 자평명리학 기반 프리미엄 인생 전략 컨설턴트입니다.",
  "입력된 사주를 분석하여 아래 형식으로 간결하게 출력하십시오.",
  "AI 어투 배제. 명리 전문용어는 비즈니스 용어로 치환.",
  "",
  "자산 Tier: S급(50억+) A급(15~50억) B급(5~15억) C급(현상유지)",
  "Base 시나리오 확률 60%, Worst/Best 각 20%",
  "",
  "출력 순서 (반드시 이 순서로):",
  "",
  "CHART_DATA_START",
  "{",
  "  \"hexagon_scores\": {\"worst\":[재물,직업,관계,건강,리스크,잠재력],\"base\":[재물,직업,관계,건강,리스크,잠재력],\"best\":[재물,직업,관계,건강,리스크,잠재력]},",
  "  \"wealth_trend\": {\"labels\":[\"20대\",\"30대\",\"40대\",\"50대\",\"60대\"],\"scores\":[정수5개]},",
  "  \"monthly_cashflow\": {\"labels\":[\"1월\",\"2월\",\"3월\",\"4월\",\"5월\",\"6월\",\"7월\",\"8월\",\"9월\",\"10월\",\"11월\",\"12월\"],\"scores\":[정수12개]},",
  "  \"persona\": {\"title\":\"타이틀\",\"mbti\":\"MBTI\",\"receipt_hashtags\":[\"#태그1\",\"#태그2\",\"#태그3\"]}",
  "}",
  "CHART_DATA_END",
  "",
  "### [4] 본질과 현실 페르소나",
  "[결론] 1문장. [명리적 근거] 1문장. [현실 예시] 1문장. (총 150자 이내)",
  "",
  "### [7] 재산 시뮬레이션",
  "| 시나리오 | 확률 | Tier | 자산 | 사회적 위치 |",
  "3행 표로만 출력",
  "",
  "### [11] 올해 재물 흐름",
  "Jackpot Month: 월+이유 / Crash Month: 월+이유 (각 1~2개)",
  "",
  "### [12] 3개월 실행 과제",
  "1. 2. 3. (각 30자 이내)",
  "",
  "### [13] 운명 요약 영수증",
  "> 🧾 EXECUTIVE BAZI RECEIPT",
  "> 👤 Name: 이름",
  "> 👑 Persona: 타이틀",
  "> 💰 Wealth Tier: 등급",
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

  const userMsg = '이름: ' + name + '\n성별: ' + (gender||'미상') +
    '\n년주: ' + (pillars.year||'') + ' 월주: ' + (pillars.month||'') +
    ' 일주: ' + (pillars.day||'') + ' 시주: ' + (pillars.hour||'') +
    '\n일간: ' + (ilgan||'') + '(' + (ilgan_element||'') + ')' +
    '\n격국: ' + (geokguk||'미상') +
    '\n\n위 사주를 분석하여 정해진 형식으로 출력하라.';

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
        max_tokens: 1800,
        system: SYSTEM,
        messages: [{ role: 'user', content: userMsg }]
      })
    });

    const respText = await resp.text();
    if (!resp.ok) return new Response(JSON.stringify({ error: 'API 오류', detail: respText.slice(0,200) }), { status: 500, headers });

    const data = JSON.parse(respText);
    const raw = (data.content && data.content[0] && data.content[0].text) ? data.content[0].text.trim() : '';

    // JSON 추출
    let chartData = null;
    const chartMatch = raw.match(/CHART_DATA_START\s*([\s\S]*?)\s*CHART_DATA_END/);
    if (chartMatch) {
      try { chartData = JSON.parse(chartMatch[1].trim()); } catch(e) {}
    }

    // 섹션 분리
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
