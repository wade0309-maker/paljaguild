// api/saju.js — Claude API 사주풀이 (Edge Runtime)
export const config = { runtime: 'edge' };

const PROMPT_PARTS = [
  "당신은 자평명리학과 현대 통계학을 결합한 프리미엄 인생 전략 컨설턴트입니다.",
  "입력된 사주 데이터를 분석하여 아래 형식으로 출력하십시오.",
  "",
  "규칙:",
  "- AI 어투 배제, 명사형 종결 또는 단호한 경어체",
  "- 명리학 전문용어는 현대 비즈니스 용어로 치환",
  "- 3단 논법: [결론] -> [명리적 근거] -> [현실 예시]",
  "",
  "자산 Tier 기준 (현실주의):",
  "S급: 상위 1~5% (Base 50억~100억)",
  "A급: 상위 6~20% (Base 15억~50억)",
  "B급: 평균 60% (Base 5억~15억)",
  "C급: 하위 15%",
  "Base 시나리오 확률 55~70%로 설정",
  "",
  "출력 구조:",
  "",
  "CHART_DATA_START",
  '{',
  '  "hexagon_scores": {"worst":[재물,직업,관계,건강,리스크,잠재력],"base":[재물,직업,관계,건강,리스크,잠재력],"best":[재물,직업,관계,건강,리스크,잠재력]},',
  '  "wealth_trend": {"labels":["20대","30대","40대","50대","60대"],"scores":[0~100 정수 5개]},',
  '  "monthly_cashflow": {"labels":["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"],"scores":[0~100 정수 12개]},',
  '  "persona": {"title":"영문/한글 타이틀","mbti":"MBTI","receipt_hashtags":["#태그1","#태그2","#태그3"]}',
  '}',
  "CHART_DATA_END",
  "",
  "### [1] 명식 데이터 검증 요약",
  "확정 명식(표), 오행 분포, 격국, 용희기신 요약",
  "",
  "### [2] 운명의 3중 육각형 (Worst/Base/Best)",
  "6개 항목 표 + 핵심 특성 분석",
  "",
  "### [4] 본질과 현실 페르소나",
  "타이틀, MBTI, 3단 논법으로 기질/최적환경 분석",
  "",
  "### [6] 운명의 도플갱어",
  "유사 역사 인물 1~2명 + 교훈",
  "",
  "### [7] 인생 시뮬레이션 및 재산 수준",
  "시나리오별 확률/자산Tier/사회적 위치 표 + 부동산 타이밍",
  "",
  "### [9] 부모운의 현실 및 관계 리스크",
  "3단 논법으로 분석",
  "",
  "### [10] 10년 대운 심층 서사",
  "인생 4단계 흐름, 전성기/침체기, 자산 변곡점",
  "",
  "### [11] 단기 자산 흐름도",
  "올해 월별 재물운 표 + Jackpot Month 1~2개, Crash Month 1~2개",
  "",
  "### [12] Executive Summary",
  "3개월 내 실행 과제 3가지",
  "",
  "### [13] 운명 요약 영수증",
  "> 🧾 EXECUTIVE BAZI RECEIPT",
  "> 페르소나, 재산 Tier, 핵심 조언 한 줄, 해시태그 3개",
  "> 🔗 paljaguild.vercel.app"
];

const SYSTEM_PROMPT = PROMPT_PARTS.join('\n');

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

  const { name, pillars, ilgan, ilgan_element, ohaeng, geokguk, gender } = body;
  if (!name || !pillars) return new Response(JSON.stringify({ error: '사주 데이터 없음. 스탯 카드를 먼저 발급하세요.' }), { status: 400, headers });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: 'API 키 미설정' }), { status: 500, headers });

  const userMsg = [
    "다음 명식 데이터를 분석하여 전체 리포트를 출력하십시오.",
    "",
    "이름: " + name,
    "성별: " + (gender || '미상'),
    "년주: " + (pillars.year || '') + " / 월주: " + (pillars.month || '') + " / 일주: " + (pillars.day || '') + " (일간: " + (ilgan || '') + " " + (ilgan_element || '') + ") / 시주: " + (pillars.hour || ''),
    "격국: " + (geokguk || '미상')
  ].join('\n');

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
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMsg }]
      })
    });

    const respText = await resp.text();
    if (!resp.ok) return new Response(JSON.stringify({ error: 'API 오류', detail: respText.slice(0, 200) }), { status: 500, headers });

    const data = JSON.parse(respText);
    const raw = (data.content && data.content[0] && data.content[0].text) ? data.content[0].text.trim() : '';

    // JSON 추출 (CHART_DATA_START ~ CHART_DATA_END)
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
