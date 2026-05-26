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

  const SYSTEM = `당신은 사주 기반 RPG 스탯 변환기입니다. JSON만 출력하세요. 설명 없음.

규칙(기본값 50):
일간오행: 목(추진력+15,창의력+10,지속력-10) 화(대인매력+15,창의력+10,지속력-10) 토(지속력+15,리스크관리+10,추진력-5) 금(리스크관리+15,학습력+10,대인매력-10) 수(통찰력+15,학습력+10,지속력-5)
십성: 비견(추진력+10) 겁재(추진력+15,대인매력+5,리스크관리-15) 식신(창의력+15,지속력+10,추진력-5) 상관(창의력+20,통찰력+10,대인매력+8,리스크관리-10) 편재(사업감각+20,대인매력+10,리스크관리+8,지속력-10) 정재(사업감각+10,리스크관리+15,창의력-5) 편관(통찰력+15,추진력+10,리스크관리+8,대인매력-10) 정관(리스크관리+15,학습력+10,창의력-10) 편인(통찰력+20,학습력+10,사업감각-10) 정인(학습력+20,지속력+10,추진력-5)
동일십성2개:×1.3 3개이상:×1.5
신약패널티(체력만): 지속력-15,리스크관리-10,대인매력-8
결핍오행: 수없음→통찰력-15 목없음→추진력-15 화없음→대인매력-10 금없음→리스크관리-15 토없음→지속력-15
스탯범위:10-95

출력JSON(반드시 이 형식 그대로):
{"name":"이름","pillars":{"year":"년주","month":"월주","day":"일주","hour":"시주"},"ilgan":"일간한자","ilgan_element":"토","geokguk":"격국명","sinjak":false,"missing_elements":[],"class_main":"대분류","class_sub":"세분류","element_primary":"주오행","element_secondary":"보조오행","stats":{"추진력":{"value":50,"tag":"전략형"},"사업감각":{"value":50,"tag":"기회포착형"},"창의력":{"value":50,"tag":"실용형"},"통찰력":{"value":50,"tag":"패턴형"},"대인매력":{"value":50,"tag":"신뢰형"},"리스크관리":{"value":50,"tag":"분석형"},"학습력":{"value":50,"tag":"탐구형"},"지속력":{"value":50,"tag":"루틴형"}},"total_power":50,"top2_avg":50,"potential_grade":"B","hidden_ability":"숨겨진능력","weakness":"약점","synergy_element":"금(金)","calc_notes":"적용규칙요약"}`;

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
};
