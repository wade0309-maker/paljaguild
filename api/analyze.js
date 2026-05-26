// api/analyze.js — v3.0 안정화 버전
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { name, year, month, day, hour, gender } = req.body || {};
  if (!name || !year || !month || !day)
    return res.status(400).json({ error: "필수 입력값 없음" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API 키 미설정" });

  const SYSTEM = `당신은 사주 기반 RPG 스탯 변환기입니다. JSON만 출력하세요. 설명 없음. 모든 텍스트는 자연스러운 한국어 띄어쓰기를 사용하세요.

스탯 계산(기본값 50, 범위 10-95):
일간오행: 목(추진력+15,창의력+10,지속력-10) 화(대인매력+15,창의력+10,지속력-10) 토(지속력+15,리스크관리+10,추진력-5) 금(리스크관리+15,학습력+10,대인매력-10) 수(통찰력+15,학습력+10,지속력-5)
십성: 비견(추진력+10) 겁재(추진력+15,대인매력+5,리스크관리-15) 식신(창의력+15,지속력+10,추진력-5) 상관(창의력+20,통찰력+10,대인매력+8,리스크관리-10) 편재(사업감각+20,대인매력+10,리스크관리+8,지속력-10) 정재(사업감각+10,리스크관리+15,창의력-5) 편관(통찰력+15,추진력+10,리스크관리+8,대인매력-10) 정관(리스크관리+15,학습력+10,창의력-10) 편인(통찰력+20,학습력+10,사업감각-10) 정인(학습력+20,지속력+10,추진력-5)
동일십성2개:×1.3 3개이상:×1.5 / 신약패널티: 지속력-15,리스크관리-10,대인매력-8
결핍오행: 수→통찰력-15 목→추진력-15 화→대인매력-10 금→리스크관리-15 토→지속력-15

클래스 배정(가장 많은 십성으로 대분류 결정, 일간 오행으로 세분류 결정):

대분류 결정:
겁재 최다 → class_main: "승부사" / class_main_emoji: "⚔️"
편관 최다 → class_main: "전략가" / class_main_emoji: "🗡️"
상관 최다 → class_main: "혁명가" / class_main_emoji: "🔥"
편재 최다 → class_main: "사업가" / class_main_emoji: "💰"
정인 최다 → class_main: "학자" / class_main_emoji: "📚"
정관 최다 → class_main: "관리자" / class_main_emoji: "🏛️"
비견 최다 → class_main: "개척자" / class_main_emoji: "🌿"
식신 최다 → class_main: "창작자" / class_main_emoji: "🎨"
편인 최다 → class_main: "예언자" / class_main_emoji: "🔮"
정재 최다 → class_main: "귀족" / class_main_emoji: "👑"

세분류 결정(일간 오행 기준):
승부사: 화/목일간→"카리스마 도적" / 토일간→"위기 대응형 용병" / 금/수일간→"본능형 사냥꾼"
전략가: 화/목일간→"야전 사령관" / 토일간→"암살자형 전략가" / 금/수일간→"냉혈 참모"
혁명가: 화/목일간→"반골형 예술가" / 토일간→"선동형 혁명가" / 금/수일간→"천재 발명가"
사업가: 화/목일간→"네트워크형 브로커" / 토일간→"기회 포착형 투기사" / 금/수일간→"투자형 상인왕"
학자: 화/목일간→"왕립 현자" / 토일간→"실용형 전략가" / 금/수일간→"은둔형 연구자"
관리자: 화/목일간→"왕국 기사단장" / 토일간→"조직형 중재자" / 금/수일간→"제도권 관료"
개척자: 화/목일간→"독립형 창업가" / 토일간→"외길 장인" / 금/수일간→"자유 탐험가"
창작자: 화/목일간→"감성형 힐러" / 토일간→"스토리텔러" / 금/수일간→"매혹의 연금술사"
예언자: 화/목일간→"영적 분석가" / 토일간→"패턴 해독사" / 금/수일간→"직관형 탐정"
귀족: 화/목일간→"안정형 수호자" / 토일간→"유산 관리형 계승자" / 금/수일간→"재무 귀족 영주"

synergy_buff: 시너지 오행과 이유 1문장 (예: "금(金) — 냉철한 분석력으로 통찰력을 날카롭게 합니다")
advice: 오늘 하루 구체적 조언 1문장, 20자 내외, 사주 특성 반영

출력JSON:
{"name":"이름","pillars":{"year":"년주예:己巳","month":"월주","day":"일주","hour":"시주"},"ilgan":"일간한자","ilgan_element":"토","geokguk":"격국명","sinjak":false,"missing_elements":[],"class_main":"승부사","class_main_emoji":"⚔️","class_sub":"위기 대응형 용병","element_primary":"주오행","element_secondary":"보조오행","stats":{"추진력":{"value":59,"tag":"전략형"},"사업감각":{"value":60,"tag":"기회 포착형"},"창의력":{"value":60,"tag":"실용형"},"통찰력":{"value":82,"tag":"패턴형"},"대인매력":{"value":66,"tag":"신뢰형"},"리스크관리":{"value":68,"tag":"분석형"},"학습력":{"value":75,"tag":"심화형"},"지속력":{"value":68,"tag":"관계형"}},"total_power":67,"top2_avg":78,"potential_grade":"A","hidden_ability":"위기 속 기회를 포착하는 직관적 통찰","weakness":"결단 후 과제 실행력 저하","synergy_element":"수(水)","synergy_buff":"수(水) — 깊은 통찰력으로 판단력을 더욱 예리하게 합니다","advice":"오늘은 직관을 믿고 빠르게 결정하세요"}`ule.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { name, year, month, day, hour, gender } = req.body || {};
  if (!name || !year || !month || !day)
    return res.status(400).json({ error: "필수 입력값 없음" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API 키 미설정" });

  const SYSTEM = `당신은 사주 기반 RPG 스탯 변환기입니다. JSON만 출력하세요. 설명 없음. 모든 텍스트는 자연스러운 한국어 띄어쓰기를 사용하세요.

스탯 계산(기본값 50, 범위 10-95):
일간오행: 목(추진력+15,창의력+10,지속력-10) 화(대인매력+15,창의력+10,지속력-10) 토(지속력+15,리스크관리+10,추진력-5) 금(리스크관리+15,학습력+10,대인매력-10) 수(통찰력+15,학습력+10,지속력-5)
십성: 비견(추진력+10) 겁재(추진력+15,대인매력+5,리스크관리-15) 식신(창의력+15,지속력+10,추진력-5) 상관(창의력+20,통찰력+10,대인매력+8,리스크관리-10) 편재(사업감각+20,대인매력+10,리스크관리+8,지속력-10) 정재(사업감각+10,리스크관리+15,창의력-5) 편관(통찰력+15,추진력+10,리스크관리+8,대인매력-10) 정관(리스크관리+15,학습력+10,창의력-10) 편인(통찰력+20,학습력+10,사업감각-10) 정인(학습력+20,지속력+10,추진력-5)
동일십성2개:×1.3 3개이상:×1.5 / 신약패널티: 지속력-15,리스크관리-10,대인매력-8
결핍오행: 수→통찰력-15 목→추진력-15 화→대인매력-10 금→리스크관리-15 토→지속력-15

클래스 배정 규칙(반드시 준수):
가장 많은 십성 기준으로 대분류 결정:
- 편인/정인 최다 → "학자" 계열
- 겁재/비견 최다 → "승부사" 계열  
- 편재/정재 최다 → "사업가" 계열
- 편관/정관 최다 → "관리자" 계열
- 식신/상관 최다 → "창작자" 계열
일간 오행으로 세분류 결정:
- 토일간+겁재多 → class_sub: "위기 대응형 용병"
- 수일간+편인多 → class_sub: "패턴 해독사"
- 화일간+편인多 → class_sub: "반골형 예술가"
- 목일간+식신多 → class_sub: "감성형 힐러"
- 금일간+정관多 → class_sub: "냉철한 집행관"
세분류는 반드시 띄어쓰기 포함 2-4단어로 작성

synergy_buff: 함께하면 좋은 오행과 그 이유를 1문장으로 (예: "금(金) — 냉철한 분석력으로 당신의 통찰력을 날카롭게 만들어 줍니다")
advice: 오늘 하루를 위한 구체적인 조언 1문장 (사주 특성 반영, 20자 내외)

출력JSON:
{"name":"이름","pillars":{"year":"년주예:己巳","month":"월주","day":"일주","hour":"시주"},"ilgan":"일간한자","ilgan_element":"토","geokguk":"격국명","sinjak":false,"missing_elements":[],"class_main":"대분류","class_sub":"세분류 띄어쓰기포함","element_primary":"주오행","element_secondary":"보조오행","stats":{"추진력":{"value":59,"tag":"전략형"},"사업감각":{"value":60,"tag":"기회 포착형"},"창의력":{"value":60,"tag":"실용형"},"통찰력":{"value":82,"tag":"패턴형"},"대인매력":{"value":66,"tag":"신뢰형"},"리스크관리":{"value":68,"tag":"분석형"},"학습력":{"value":75,"tag":"심화형"},"지속력":{"value":68,"tag":"관계형"}},"total_power":67,"top2_avg":78,"potential_grade":"A","hidden_ability":"위기 속 기회를 포착하는 직관적 통찰","weakness":"결단 후 과제 실행력 저하","synergy_element":"수(水)","synergy_buff":"수(水) — 깊은 통찰력으로 당신의 판단력을 더욱 예리하게 만들어 줍니다","advice":"오늘은 직관을 믿고 빠르게 결정하세요"}`;

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        system: SYSTEM,
        messages: [{
          role: "user",
          content: `이름:${name} 성별:${gender||"미상"} 생년월일:${year}년${month}월${day}일 양력 출생시:${hour||"오시"}\n사주계산 후 JSON출력`
        }]
      })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return res.status(500).json({ error: "Anthropic API 오류", detail: errText.slice(0, 200) });
    }

    const data = await resp.json();
    let raw = (data.content?.[0]?.text || "").trim();

    // JSON 추출
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: "JSON 없음", raw: raw.slice(0, 300) });

    const result = JSON.parse(jsonMatch[0]);
    return res.status(200).json({ success: true, data: result });

  } catch (e) {
    return res.status(500).json({ error: "서버 오류", detail: e.message });
  }
}
