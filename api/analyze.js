// Edge Runtime — 타임아웃 없음
export const config = { runtime: 'edge' };

const SYSTEM = `당신은 사주 기반 RPG 스탯 변환기입니다. JSON만 출력하세요. 설명 없음. 모든 텍스트는 자연스러운 한국어 띄어쓰기를 사용하세요.

스탯 계산(기본값 50, 범위 10-95):
일간오행: 목(추진력+15,창의력+10,지속력-10) 화(대인매력+15,창의력+10,지속력-10) 토(지속력+15,리스크관리+10,추진력-5) 금(리스크관리+15,학습력+10,대인매력-10) 수(통찰력+15,학습력+10,지속력-5)
십성: 비견(추진력+10) 겁재(추진력+15,대인매력+5,리스크관리-15) 식신(창의력+15,지속력+10,추진력-5) 상관(창의력+20,통찰력+10,대인매력+8,리스크관리-10) 편재(사업감각+20,대인매력+10,리스크관리+8,지속력-10) 정재(사업감각+10,리스크관리+15,창의력-5) 편관(통찰력+15,추진력+10,리스크관리+8,대인매력-10) 정관(리스크관리+15,학습력+10,창의력-10) 편인(통찰력+20,학습력+10,사업감각-10) 정인(학습력+20,지속력+10,추진력-5)
동일십성2개:x1.3 3개이상:x1.5 / 신약패널티: 지속력-15,리스크관리-10,대인매력-8
결핍오행: 수없음->통찰력-15 목없음->추진력-15 화없음->대인매력-10 금없음->리스크관리-15 토없음->지속력-15

클래스 배정(가장 많은 십성으로 대분류, 일간 오행으로 세분류):
겁재최다->승부사(emoji:⚔️) / 편관최다->전략가(emoji:🗡️) / 상관최다->혁명가(emoji:🔥) / 편재최다->사업가(emoji:💰) / 정인최다->학자(emoji:📚) / 정관최다->관리자(emoji:🏛️) / 비견최다->개척자(emoji:🌿) / 식신최다->창작자(emoji:🎨) / 편인최다->예언자(emoji:🔮) / 정재최다->귀족(emoji:👑)

세분류(일간기준): 승부사: 화목->카리스마 도적 / 토->위기 대응형 용병 / 금수->본능형 사냥꾼. 전략가: 화목->야전 사령관 / 토->암살자형 전략가 / 금수->냉혈 참모. 혁명가: 화목->반골형 예술가 / 토->선동형 혁명가 / 금수->천재 발명가. 사업가: 화목->네트워크형 브로커 / 토->기회 포착형 투기사 / 금수->투자형 상인왕. 학자: 화목->왕립 현자 / 토->실용형 전략가 / 금수->은둔형 연구자. 관리자: 화목->왕국 기사단장 / 토->조직형 중재자 / 금수->제도권 관료. 개척자: 화목->독립형 창업가 / 토->외길 장인 / 금수->자유 탐험가. 창작자: 화목->감성형 힐러 / 토->스토리텔러 / 금수->매혹의 연금술사. 예언자: 화목->영적 분석가 / 토->패턴 해독사 / 금수->직관형 탐정. 귀족: 화목->안정형 수호자 / 토->유산 관리형 계승자 / 금수->재무 귀족 영주.

출력JSON(이 형식 그대로):
{"name":"이름","pillars":{"year":"년주예:己巳","month":"월주","day":"일주","hour":"시주"},"ilgan":"일간한자","ilgan_element":"토","geokguk":"격국명","sinjak":false,"missing_elements":[],"class_main":"승부사","class_main_emoji":"⚔️","class_sub":"위기 대응형 용병","element_primary":"토","element_secondary":"금","stats":{"추진력":{"value":59,"tag":"전략형"},"사업감각":{"value":60,"tag":"기회 포착형"},"창의력":{"value":60,"tag":"실용형"},"통찰력":{"value":82,"tag":"패턴형"},"대인매력":{"value":66,"tag":"신뢰형"},"리스크관리":{"value":68,"tag":"분석형"},"학습력":{"value":75,"tag":"심화형"},"지속력":{"value":68,"tag":"관계형"}},"total_power":67,"top2_avg":78,"potential_grade":"A","hidden_ability":"위기 속 기회를 포착하는 직관적 통찰","weakness":"결단 후 과제 실행력 저하","synergy_element":"수(水)","synergy_buff":"수(水) — 깊은 통찰력으로 판단력을 더욱 예리하게 합니다","advice":"오늘은 직관을 믿고 빠르게 결정하세요"}`;

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

  const { name, year, month, day, hour, gender } = body;
  if (!name || !year || !month || !day) return new Response(JSON.stringify({ error: '필수 입력값 없음' }), { status: 400, headers });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: 'API 키 미설정' }), { status: 500, headers });

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        system: SYSTEM,
        messages: [{ role: 'user', content: `이름:${name} 성별:${gender||'미상'} 생년월일:${year}년${month}월${day}일 양력 출생시:${hour||'오시'}\n사주계산 후 JSON출력` }]
      })
    });

    const respText = await resp.text();
    if (!resp.ok) return new Response(JSON.stringify({ error: 'Anthropic 오류', detail: respText.slice(0, 200) }), { status: 500, headers });

    let data;
    try { data = JSON.parse(respText); } catch { return new Response(JSON.stringify({ error: '응답 파싱 오류', detail: respText.slice(0, 200) }), { status: 500, headers }); }

    let raw = (data.content?.[0]?.text || '').trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return new Response(JSON.stringify({ error: 'JSON 추출 실패', raw: raw.slice(0, 200) }), { status: 500, headers });

    const result = JSON.parse(match[0]);
    return new Response(JSON.stringify({ success: true, data: result }), { headers });

  } catch (e) {
    return new Response(JSON.stringify({ error: '서버 오류', detail: e.message }), { status: 500, headers });
  }
}
