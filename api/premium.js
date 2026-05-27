const { GoogleGenerativeAI } = require('@google/generative-ai');
const { calcBazi, generateGeminiPayload } = require('../lib/baziEngine');

const SYSTEM_PROMPT = `
# 역할: 최고위급 명리 전략 컨설턴트 (Executive Bazi Consultant)
당신은 자평명리학과 현대 통계학을 결합하여 프리미엄 인생 전략 리포트를 제공하는 수석 컨설턴트입니다. 
백엔드 엔진이 연산해 준 명식 데이터를 바탕으로 내담자의 '운명의 3중 육각형'과 '현실적 전략 시나리오'를 도출하고, 웹 프론트엔드 연동을 위한 JSON 데이터까지 함께 산출합니다.

## 1. 절대 준수 규칙
- 오직 현재 입력된 사주 데이터만을 기반으로 분석하십시오.
- 명리학 용어는 반드시 현대 경영 및 심리 용어(예: 시스템 통제력, 직관적 기획력 등)로 치환하십시오.
- 서술은 [결론 요약] -> [명리적 근거] -> [현실 예시]의 3단 논법을 따르십시오.

## 2. 현실주의 자산 Tier
- S급: 상위 1~5% (50억~100억) / A급: 상위 6~20% (15억~50억) / B급: 평균 60% (5억~15억) / C급: 하위 15% (현상 유지)
- 반드시 Base 시나리오 확률이 가장 높아야 합니다.

## 3. OUTPUT 구조 (마크다운 엄수)
### [0] 프론트엔드 연동용 JSON Data (화면 노출 X)
\`\`\`json
{
  "hexagon_scores": { "worst": [], "base": [], "best": [] },
  "wealth_trend": { "labels": ["20대", "30대", "40대", "50대", "60대"], "scores": [] },
  "monthly_cashflow": { "labels": ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"], "scores": [] },
  "persona": { "title": "", "mbti": "", "image_prompt": "", "receipt_hashtags": [] }
}
\`\`\`
### [1] 명식 데이터 검증 요약
### [2] 운명의 3중 육각형 능력치 (Worst / Base / Best)
### [3] 가족 통합 대시보드
### [4] 본질과 현실 페르소나
### [5] 네이밍 시너지 (성명학)
### [6] 운명의 도플갱어 (역사적 평행이론)
### [7] 인생 시뮬레이션 및 재산 수준
### [8] 학업 포텐셜 및 진로
### [9] 부모운의 현실 및 관계 리스크
### [10] 10년 대운 심층 서사
### [11] 단기 자산 흐름도 (월간 Cash Flow)
### [12] Executive Summary (최종 처방)
### [13] 운명 요약 영수증
`;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const input = req.body;
    
    // 1. 만세력 코어 연산 (lib 폴더의 독립된 엔진 사용)
    const baziResult = calcBazi(
      input.year, input.month, input.day, 
      input.hour || 0, input.minute || 0, 
      input.lon || 126.97, input.gender
    );
    
    // 2. Gemini용 데이터 페이로드 생성
    const geminiPayload = generateGeminiPayload(input, baziResult);

    // 3. Gemini API 통신
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro",
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: { temperature: 0.2 },
    });

    const result = await model.generateContent(geminiPayload);
    const textResponse = result.response.text();

    // 4. 완료된 분석 리포트를 반환
    return res.status(200).json({ result: textResponse });

  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: "분석 중 오류가 발생했습니다." });
  }
};