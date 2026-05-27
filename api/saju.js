// api/saju.js — Gemini 1.5 Flash 사주풀이
export const config = { runtime: 'edge' };

const SYSTEM_PROMPT = `# 역할: 최고위급 명리 전략 컨설턴트 (Executive Bazi Consultant)

당신은 자평명리학과 현대 통계학을 결합하여 프리미엄 인생 전략 리포트를 제공하는 수석 컨설턴트입니다. 백엔드 엔진이 연산해 준 명식 데이터를 바탕으로 내담자의 '운명의 3중 육각형'과 '현실적 전략 시나리오'를 도출하고, 웹 프론트엔드 연동을 위한 JSON 데이터까지 함께 산출합니다.

## 0. 대화 흐름
[Init Mode]: 사주 데이터 입력 시 OUTPUT 구조 [0]~[13] 전체 출력.

## 1. 절대 준수 규칙
- 오직 현재 입력된 사주 데이터만 기반으로 분석
- AI 어투 배제, 명사형 종결 또는 단호한 경어체 사용
- 명리학 전문용어는 현대 비즈니스 용어로 치환
- 3단 논법: [결론] → [명리적 근거] → [현실 예시]

## 2. 현실주의 자산 Tier
- S급: 상위 1~5% (Base 50억~100억)
- A급: 상위 6~20% (Base 15억~50억)
- B급: 평균 60% (Base 5억~15억)
- C급: 하위 15% (현상 유지)
- 확률 배분: Base 55~70%, Worst/Best 각 15~25%

## 3. 운명의 3중 육각형
6개 축(재물, 직업, 관계, 건강, 리스크 관리, 잠재력) × 3시나리오(Worst/Base/Best)

## 4. OUTPUT 구조

### [0] 프론트엔드 연동용 JSON (화면 노출 X)
\`\`\`json
{
  "hexagon_scores": {
    "worst": [재물,직업,관계,건강,리스크,잠재력],
    "base": [재물,직업,관계,건강,리스크,잠재력],
    "best": [재물,직업,관계,건강,리스크,잠재력]
  },
  "wealth_trend": {
    "labels": ["20대","30대","40대","50대","60대"],
    "scores": [0~100 정수 5개]
  },
  "monthly_cashflow": {
    "labels": ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"],
    "scores": [0~100 정수 12개]
  },
  "persona": {
    "title": "영문/한글 페르소나 타이틀",
    "mbti": "MBTI 4자리",
    "image_prompt": "tarot card description",
    "receipt_hashtags": ["#해시태그1","#해시태그2","#해시태그3"]
  }
}
\`\`\`

### [1] 명식 데이터 검증 요약
### [2] 운명의 3중 육각형 능력치 (Worst/Base/Best)
### [3] 가족 통합 대시보드 (2인 이상 입력 시만)
### [4] 본질과 현실 페르소나
### [5] 네이밍 시너지 (성명학)
### [6] 운명의 도플갱어 (역사적 평행이론)
### [7] 인생 시뮬레이션 및 재산 수준 (현실주의 기반)
### [8] 학업 포텐셜 및 진로 (미성년자 전용)
### [9] 부모운의 현실 및 관계 리스크
### [10] 10년 대운 심층 서사
### [11] 단기 자산 흐름도 (월간 Cash Flow & 리스크 캘린더)
### [12] Executive Summary (최종 처방)
### [13] 운명 요약 영수증 (Instagram 공유용)`;

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
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: '요청 파싱 오류' }), { status: 400, headers }); }

  const { name, pillars, ilgan, ilgan_element, ohaeng, geokguk, gender, birthYear } = body;
  if (!name || !pillars) return new Response(JSON.stringify({ error: '사주 데이터 없음. 스탯 카드를 먼저 발급하세요.' }), { status: 400, headers });

  const apiKey = process.env.GOOGLE_AI_KEY;
  if (!apiKey) return new Response(JSON.stringify({ 
    error: 'Gemini API 키 미설정',
    detail: 'Vercel 환경변수에 GOOGLE_AI_KEY를 추가하세요'
  }), { status: 500, headers });

  const ohaengStr = ohaeng ? `목${ohaeng.목||0} 화${ohaeng.화||0} 토${ohaeng.토||0} 금${ohaeng.금||0} 수${ohaeng.수||0}` : '미제공';

  const userMsg = `다음 명식 데이터를 분석하여 전체 리포트를 출력하십시오.

이름: ${name}
성별: ${gender || '미상'}
사주 4주:
  년주: ${pillars.year}
  월주: ${pillars.month}
  일주: ${pillars.day} (일간: ${ilgan || ''} / ${ilgan_element || ''})
  시주: ${pillars.hour}
오행 분포: ${ohaengStr}
격국: ${geokguk || '미상'}

위 데이터를 기반으로 [0]~[13] 전체 리포트를 출력하십시오.`;

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: SYSTEM_PROMPT + '\n\n---\n\n' + userMsg }] }
          ],
          generationConfig: { maxOutputTokens: 8192, temperature: 0.7 }
        })
      }
    );

    const respText2 = await resp.text();
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: 'Gemini API 오류', detail: respText2.slice(0, 400), status: resp.status }), { status: 500, headers });
    }
    const data = JSON.parse(respText2);

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // JSON 추출
    const jsonMatch = raw.match(/```json\n([\s\S]*?)\n```/);
    let chartData = null;
    if (jsonMatch) {
      try { chartData = JSON.parse(jsonMatch[1]); } catch {}
    }

    // 섹션 분리 ([0]~[13])
    const sections = {};
    const sectionPattern = /### \[(\d+)\](.*?)(?=### \[|\s*$)/gs;
    let match;
    while ((match = sectionPattern.exec(raw)) !== null) {
      sections[match[1]] = match[2].trim();
    }

    return new Response(JSON.stringify({
      success: true,
      chartData,
      sections,
      raw
    }), { headers });

  } catch (e) {
    return new Response(JSON.stringify({ 
      error: '서버 오류', 
      detail: e.message,
      stack: e.stack?.slice(0,200)
    }), { status: 500, headers });
  }
}
