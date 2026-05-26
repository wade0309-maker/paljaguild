// ════════════════════════════════
// TrueBaziEngine (만세력 계산 엔진)
// ════════════════════════════════
// ════════════════════════════════════════════════════════════════
// TrueBaziEngine — JavaScript Port (v2.0)
// ════════════════════════════════════════════════════════════════

// ── 상수 ────────────────────────────────────────────────────────
const STEMS    = ['갑甲','을乙','병丙','정丁','무戊','기己','경庚','신辛','임壬','계癸'];
const BRANCHES = ['자子','축丑','인寅','묘卯','진辰','사巳','오午','미未','신申','유酉','술戌','해亥'];
const STEM_ELEM  = ['목','목','화','화','토','토','금','금','수','수'];
const BR_ELEM    = ['수','토','목','목','토','화','화','토','금','금','토','수'];
const SIPSEONG_N = ['비견','겁재','식신','상관','편재','정재','편관','정관','편인','정인'];

const JIJANGGAN = {
  0:[9], 1:[9,7,5], 2:[4,2,0], 3:[0,1], 4:[1,9,4],
  5:[4,6,2], 6:[2,5,3], 7:[3,1,5], 8:[4,8,6],
  9:[6,7], 10:[7,3,4], 11:[4,0,8]
};
const BR_MAIN_STEM = {0:9,1:5,2:0,3:1,4:4,5:2,6:3,7:5,8:6,9:6,10:4,11:8};
const SAMHAP_SAENGJI = {2:2,6:2,10:2, 8:8,0:8,4:8, 5:5,9:5,1:5, 11:11,3:11,7:11};
const MONTH_TERMS = [[315,2],[345,3],[15,4],[45,5],[75,6],[105,7],[135,8],[165,9],[195,10],[225,11],[255,0],[285,1]];
const WUHU_BASE = [2,4,6,8,0,2,4,6,8,0];
const WUZI_BASE = [0,2,4,6,8,0,2,4,6,8];
const JD_BASE_DAY = 2460311.0;
const WOONSEONG_N = ['장생','목욕','관대','건록','제왕','쇠','병','사','묘','절','태','양'];
const JANGSEONG   = {0:11,1:6,2:2,3:9,4:2,5:9,6:5,7:0,8:8,9:3};
const SINSAL_V1 = ['겁살','재살','천살','망신살','지살','년살','월살','장성살','반안살','역마살','육해살','화개살'];
const SINSAL_V2 = ['겁살','재살','천살','지살','년살','월살','망신살','장성살','반안살','역마살','육해살','화개살'];
const SINSAL_CFG = {
  0:[8,SINSAL_V2], 1:[2,SINSAL_V2], 2:[8,SINSAL_V2], 3:[5,SINSAL_V2],
  4:[5,SINSAL_V2], 5:[5,SINSAL_V1], 6:[11,SINSAL_V2], 7:[5,SINSAL_V2],
  8:[2,SINSAL_V2], 9:[2,SINSAL_V2], 10:[11,SINSAL_V2], 11:[5,SINSAL_V2]
};

// ── 천문 함수 ────────────────────────────────────────────────────
function julianDay(y,m,d,hut=0){
  if(m<=2){y--;m+=12;}
  const A=Math.trunc(y/100), B=2-A+Math.trunc(A/4);
  return Math.trunc(365.25*(y+4716))+Math.trunc(30.6001*(m+1))+d+hut/24+B-1524.5;
}
function solarLongitude(jd){
  const T=(jd-2451545)/36525;
  const L0=((280.46646+36000.76983*T+0.0003032*T*T)%360+360)%360;
  const M=(((357.52911+35999.05029*T-0.0001537*T*T)%360)+360)%360;
  const Mr=M*Math.PI/180;
  const C=(1.914602-0.004817*T-0.000014*T*T)*Math.sin(Mr)
         +(0.019993-0.000101*T)*Math.sin(2*Mr)
         +0.000289*Math.sin(3*Mr);
  const omega=125.04-1934.136*T;
  return ((L0+C-0.00569-0.00478*Math.sin(omega*Math.PI/180))%360+360)%360;
}
function equationOfTime(jd){
  const T=(jd-2451545)/36525;
  const e0=23+26/60+21.448/3600-T*(46.815/3600);
  const e=0.016708634-0.000042037*T;
  const M=((357.52911+35999.05029*T)%360+360)%360;
  const L0=((280.46646+36000.76983*T)%360+360)%360;
  const y=Math.tan(e0*Math.PI/360)**2;
  const Mr=M*Math.PI/180, L0r=L0*Math.PI/180;
  const eot=y*Math.sin(2*L0r)-2*e*Math.sin(Mr)+4*e*y*Math.sin(Mr)*Math.cos(2*L0r)
            -0.5*y*y*Math.sin(4*L0r)-1.25*e*e*Math.sin(2*Mr);
  return eot*180/Math.PI*4;
}
function findSolarTermJD(year, targetLon){
  const am=Math.trunc((targetLon/30+3)%12)+1;
  let jdStart=julianDay(year,am,1,0)-20;
  for(let i=0;i<60;i++){
    const jd=jdStart+i;
    const sl=solarLongitude(jd), slN=solarLongitude(jd+1);
    const d=(targetLon-sl+360)%360, dN=(targetLon-slN+360)%360;
    if(d<180 && dN>180){
      let lo=jd,hi=jd+1;
      for(let k=0;k<60;k++){
        const mid=(lo+hi)/2;
        if((targetLon-solarLongitude(mid)+360)%360<180) lo=mid; else hi=mid;
      }
      return (lo+hi)/2;
    }
  }
  return null;
}

// ── 음력 → 양력 변환 (Meeus 알고리즘 기반 근사치) ────────────────
// 실용적 구현: 음력 1900~2100 변환 테이블 사용 (핵심 절기 날짜만 필요)
// 간단 구현: 음력달의 대략적인 양력 날짜 계산
function lunarToSolar(ly, lm, ld){
  // 평균 음력 달 길이 = 29.53059일
  // 음력 1월 1일 기준 양력 추정 (춘절 = 입춘 전후)
  // 정확한 변환은 별도 테이블 필요 - 여기서는 근사값 제공
  // 더 정확한 구현을 위해 외부 데이터 필요
  // 현재는 단순 경고 후 양력으로 처리
  return null; // 음력 변환 미구현 표시
}

// ── 사주 계산 ────────────────────────────────────────────────────
function calcYearPillar(birthJD, birthYear){
  const licJD=findSolarTermJD(birthYear,315);
  const y=(licJD && birthJD>=licJD)?birthYear:birthYear-1;
  return [((y-1984)%10+10)%10, ((y-1984)%12+12)%12];
}
function calcMonthPillar(birthJD, birthYear, yearStemI){
  const allTerms=[];
  for(const [lon,bidx] of MONTH_TERMS){
    for(const y of [birthYear-1,birthYear,birthYear+1]){
      const jd=findSolarTermJD(y,lon);
      if(jd) allTerms.push([jd,bidx]);
    }
  }
  allTerms.sort((a,b)=>a[0]-b[0]);
  let curBranch=allTerms[0][1];
  for(let i=0;i<allTerms.length-1;i++){
    if(allTerms[i][0]<=birthJD && birthJD<allTerms[i+1][0]){curBranch=allTerms[i][1];break;}
  }
  const mss=WUHU_BASE[yearStemI];
  const bord=[2,3,4,5,6,7,8,9,10,11,0,1];
  const off=bord.indexOf(curBranch);
  return [(mss+off)%10, curBranch];
}
function calcDayPillar(birthJD){
  let idx=Math.round(birthJD-JD_BASE_DAY)%60;
  if(idx<0)idx+=60;
  return [idx%10, idx%12];
}
function getHourBranch(h,m){
  const t=h*60+m;
  if(t>=23*60||t<60)return 0;
  return Math.trunc((t+60)/120);
}
function calcHourPillar(hbI, dStemI){
  return [(WUZI_BASE[dStemI]+hbI)%10, hbI];
}
function trueSolarTime(year,month,day,hour,minute,lon){
  const kst=hour*60+minute;
  const lonOff=(lon-135)*4;
  const jd=julianDay(year,month,day,hour-9+minute/60);
  const eot=equationOfTime(jd);
  const tm=((kst+lonOff+eot)%(24*60)+24*60)%(24*60);
  return {tm, lonOff, eot, h:Math.trunc(tm/60), m:Math.trunc(tm%60)};
}

// ── 십성 ─────────────────────────────────────────────────────────
function calcSipseong(dayStemI, targetStemI){
  const me=Math.trunc(dayStemI/2), myy=dayStemI%2;
  const ot=Math.trunc(targetStemI/2), oyy=targetStemI%2;
  const same=myy===oyy;
  if(me===ot)                    return same?'비견':'겁재';
  if((me+1)%5===ot)              return same?'식신':'상관';
  if((me+2)%5===ot)              return same?'편재':'정재';
  if((ot+1)%5===me)              return same?'편인':'정인';
  return same?'편관':'정관';
}
function calcSipseongBr(dayStemI, branchI){
  return calcSipseong(dayStemI, BR_MAIN_STEM[branchI]);
}

// ── 12운성 ───────────────────────────────────────────────────────
function calc12Woonseong(dayStemI, branchI){
  const st=JANGSEONG[dayStemI];
  const isYin=dayStemI%2===1;
  const step=isYin?(st-branchI+12)%12:(branchI-st+12)%12;
  return WOONSEONG_N[step];
}

// ── 12신살 ───────────────────────────────────────────────────────
function calcSinsal(dayBrI, targetBrI){
  const [base,order]=SINSAL_CFG[dayBrI];
  const step=(targetBrI-base+12)%12;
  return order[step];
}

// ── 대운 ─────────────────────────────────────────────────────────
function calcDaewoon(birthYear,birthJD,mStemI,mBrI,yStemI,gender,count=8){
  const yYY=yStemI%2;
  const isMale=gender==='M';
  const isForward=(yYY===0&&isMale)||(yYY===1&&!isMale);
  const allTerms=[];
  for(const [lon] of MONTH_TERMS){
    for(const y of [birthYear-1,birthYear,birthYear+1]){
      const jd=findSolarTermJD(y,lon);
      if(jd)allTerms.push(jd);
    }
  }
  allTerms.sort((a,b)=>a-b);
  let nearJD=null;
  if(isForward){for(const t of allTerms){if(t>birthJD){nearJD=t;break;}}}
  else{for(const t of [...allTerms].reverse()){if(t<birthJD){nearJD=t;break;}}}
  const startF=nearJD?Math.abs(nearJD-birthJD)/3:0;
  const startI=Math.round(startF);
  const list=[];
  for(let i=0;i<count;i++){
    const age=startI+i*10;
    const sI=isForward?(mStemI+1+i)%10:((mStemI-1-i)%10+10)%10;
    const bI=isForward?(mBrI+1+i)%12:((mBrI-1-i)%12+12)%12;
    list.push({age, stem:STEMS[sI], branch:BRANCHES[bI], stemI:sI, branchI:bI});
  }
  return {dir:isForward?'순행':'역행', startF:startF.toFixed(2), startI, list};
}

// ── 오행 분포 ────────────────────────────────────────────────────
function calcOhaeng(pillars){
  const count={목:0,화:0,토:0,금:0,수:0};
  for(const p of pillars){
    count[STEM_ELEM[p.stemI]]++;
    count[BR_ELEM[p.branchI]]++;
  }
  return count;
}

// ── 음력 변환 안내 ───────────────────────────────────────────────
const LUNAR_TO_SOLAR_NOTE = '음력 변환 기능은 현재 준비 중입니다.\n양력으로 입력해주세요.';




function calculateBazi(year,month,day,hour,minute,lon,gender){
  const {tm,lonOff,eot,h:th,m:tm2}=trueSolarTime(year,month,day,hour,minute,lon);
  const jdNoon=julianDay(year,month,day,12-9);

  const [ysI,ybI]=calcYearPillar(jdNoon,year);
  const [msI,mbI]=calcMonthPillar(jdNoon,year,ysI);
  const [dsI,dbI]=calcDayPillar(jdNoon);
  const hbI=getHourBranch(th,tm2);
  const [hsI,hbI2]=calcHourPillar(hbI,dsI);

  const mkP=(sI,bI)=>({
    stemI:sI, branchI:bI,
    stem:STEMS[sI], branch:BRANCHES[bI],
    stemElem:STEM_ELEM[sI], branchElem:BR_ELEM[bI],
    stemSS: calcSipseong(dsI,sI),
    branchSS: calcSipseongBr(dsI,bI),
    woonseong: calc12Woonseong(dsI,bI),
    jijanggan: JIJANGGAN[bI].map(i=>STEMS[i]),
    sinsal: calcSinsal(dbI,bI),
  });

  const pillars={
    년주: mkP(ysI,ybI),
    월주: mkP(msI,mbI),
    일주: {...mkP(dsI,dbI), stemSS:'비견'},
    시주: mkP(hsI,hbI2),
  };
  const daewoon=calcDaewoon(year,jdNoon,msI,mbI,ysI,gender);
  const ohaeng=calcOhaeng([pillars.년주,pillars.월주,pillars.일주,pillars.시주]);

  return {
    meta:{trueSolar:`${String(th).padStart(2,'0')}:${String(tm2).padStart(2,'0')}`,lonOff:lonOff.toFixed(1),eot:eot.toFixed(1)},
    pillars, daewoon, ohaeng
  };
}
// 시주 변환 헬퍼 (한국어 → 시간)
function hourNameToTime(hourName) {
  const map = {
    '자시': [23, 0], '축시': [1, 0], '인시': [3, 0], '묘시': [5, 0],
    '진시': [7, 0], '사시': [9, 0], '오시': [11, 0], '미시': [13, 0],
    '신시': [15, 0], '유시': [17, 0], '술시': [19, 0], '해시': [21, 0]
  };
  return map[hourName] || [12, 0];
}


// ════════════════════════════════
// Claude용 시스템 프롬프트
// ════════════════════════════════
const SYSTEM = `당신은 사주 RPG 스탯 변환기입니다. 이미 계산된 사주 데이터를 받아 JSON만 출력하세요. 설명 없음. 모든 텍스트는 자연스러운 한국어 띄어쓰기를 사용하세요.

스탯 계산(기본값 50, 범위 10-95):
일간오행: 목(추진력+15,창의력+10,지속력-10) 화(대인매력+15,창의력+10,지속력-10) 토(지속력+15,리스크관리+10,추진력-5) 금(리스크관리+15,학습력+10,대인매력-10) 수(통찰력+15,학습력+10,지속력-5)
십성: 비견(추진력+10) 겁재(추진력+15,대인매력+5,리스크관리-15) 식신(창의력+15,지속력+10,추진력-5) 상관(창의력+20,통찰력+10,대인매력+8,리스크관리-10) 편재(사업감각+20,대인매력+10,리스크관리+8,지속력-10) 정재(사업감각+10,리스크관리+15,창의력-5) 편관(통찰력+15,추진력+10,리스크관리+8,대인매력-10) 정관(리스크관리+15,학습력+10,창의력-10) 편인(통찰력+20,학습력+10,사업감각-10) 정인(학습력+20,지속력+10,추진력-5)
동일십성2개:x1.3 3개이상:x1.5 / 신약패널티: 지속력-15,리스크관리-10,대인매력-8
결핍오행: 수없음->통찰력-15 목없음->추진력-15 화없음->대인매력-10 금없음->리스크관리-15 토없음->지속력-15

클래스 배정(입력된 십성 목록에서 가장 많은 것으로 대분류, 일간 오행으로 세분류):
겁재최다->승부사(emoji:⚔️) / 편관최다->전략가(emoji:🗡️) / 상관최다->혁명가(emoji:🔥) / 편재최다->사업가(emoji:💰) / 정인최다->학자(emoji:📚) / 정관최다->관리자(emoji:🏛️) / 비견최다->개척자(emoji:🌿) / 식신최다->창작자(emoji:🎨) / 편인최다->예언자(emoji:🔮) / 정재최다->귀족(emoji:👑)
세분류(일간기준): 승부사: 화목->카리스마 도적 / 토->위기 대응형 용병 / 금수->본능형 사냥꾼. 전략가: 화목->야전 사령관 / 토->암살자형 전략가 / 금수->냉혈 참모. 혁명가: 화목->반골형 예술가 / 토->선동형 혁명가 / 금수->천재 발명가. 사업가: 화목->네트워크형 브로커 / 토->기회 포착형 투기사 / 금수->투자형 상인왕. 학자: 화목->왕립 현자 / 토->실용형 전략가 / 금수->은둔형 연구자. 관리자: 화목->왕국 기사단장 / 토->조직형 중재자 / 금수->제도권 관료. 개척자: 화목->독립형 창업가 / 토->외길 장인 / 금수->자유 탐험가. 창작자: 화목->감성형 힐러 / 토->스토리텔러 / 금수->매혹의 연금술사. 예언자: 화목->영적 분석가 / 토->패턴 해독사 / 금수->직관형 탐정. 귀족: 화목->안정형 수호자 / 토->유산 관리형 계승자 / 금수->재무 귀족 영주.

synergy_buff: 시너지 오행과 이유 1문장
advice: 오늘 하루 구체적 조언 1문장 20자 내외

출력JSON:
{"name":"이름","pillars":{"year":"년주","month":"월주","day":"일주","hour":"시주"},"ilgan":"일간한자","ilgan_element":"토","geokguk":"격국명","sinjak":false,"missing_elements":[],"class_main":"승부사","class_main_emoji":"⚔️","class_sub":"위기 대응형 용병","element_primary":"토","element_secondary":"금","stats":{"추진력":{"value":59,"tag":"전략형"},"사업감각":{"value":60,"tag":"기회 포착형"},"창의력":{"value":60,"tag":"실용형"},"통찰력":{"value":82,"tag":"패턴형"},"대인매력":{"value":66,"tag":"신뢰형"},"리스크관리":{"value":68,"tag":"분석형"},"학습력":{"value":75,"tag":"심화형"},"지속력":{"value":68,"tag":"관계형"}},"total_power":67,"top2_avg":78,"potential_grade":"A","hidden_ability":"위기 속 기회를 포착하는 직관적 통찰","weakness":"결단 후 과제 실행력 저하","synergy_element":"수(水)","synergy_buff":"수(Water) — 깊은 통찰력으로 판단력을 더욱 예리하게 합니다","advice":"오늘은 직관을 믿고 빠르게 결정하세요"}`;

// ════════════════════════════════
// Edge Handler
// ════════════════════════════════
export const config = { runtime: 'edge' };

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
  catch { return new Response(JSON.stringify({ error: '요청 파싱 오류' }), { status: 400, headers }); }

  const { name, year, month, day, hour, gender } = body;
  if (!name || !year || !month || !day)
    return new Response(JSON.stringify({ error: '필수 입력값 없음' }), { status: 400, headers });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey)
    return new Response(JSON.stringify({ error: 'API 키 미설정' }), { status: 500, headers });

  // ── 사주 코드 계산 (TrueBaziEngine)
  let baziData;
  try {
    const [h, m] = hourNameToTime(hour || '오시');
    const lon = 127.0; // 서울 기준
    baziData = calculateBazi(
      parseInt(year), parseInt(month), parseInt(day),
      h, m, lon, gender === '여' ? 'F' : 'M'
    );
  } catch(e) {
    return new Response(JSON.stringify({ error: '사주 계산 오류', detail: e.message, stack: e.stack?.slice(0,300) }), { status: 500, headers });
  }

  // ── 십성 목록 정리
  const p = baziData.pillars;
  const sipseongList = [
    p.년주.stemSS, p.년주.branchSS,
    p.월주.stemSS, p.월주.branchSS,
    p.시주.stemSS, p.시주.branchSS
  ].filter(s => s && s !== '비견');

  const ilganElem = p.일주.stemElem;
  const ohaeng = baziData.ohaeng;
  const missing = Object.entries(ohaeng).filter(([,v])=>v===0).map(([k])=>k);

  // 격국 판별 (월지 십성 기준)
  const geokguk = p.월주.branchSS + '격';

  // ── Claude에 전달할 사주 정보
  const baziInfo = `
이름: ${name}
일간: ${p.일주.stem} (${ilganElem})
년주: ${p.년주.stem}${p.년주.branch} (${p.년주.stemSS}/${p.년주.branchSS})
월주: ${p.월주.stem}${p.월주.branch} (${p.월주.stemSS}/${p.월주.branchSS})
일주: ${p.일주.stem}${p.일주.branch} (일간/${p.일주.branchSS})
시주: ${p.시주.stem}${p.시주.branch} (${p.시주.stemSS}/${p.시주.branchSS})
오행분포: 목${ohaeng.목} 화${ohaeng.화} 토${ohaeng.토} 금${ohaeng.금} 수${ohaeng.수}
결핍오행: ${missing.length ? missing.join(',') : '없음'}
격국: ${geokguk}
주요십성: ${sipseongList.join(', ')}

위 사주 데이터로 스탯을 계산하고 JSON을 출력하라. 사주는 이미 계산되었으니 그대로 사용하라.`;

  // ── Anthropic API 호출
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
        max_tokens: 2000,
        system: SYSTEM,
        messages: [{ role: 'user', content: baziInfo }]
      })
    });

    const respText = await resp.text();
    if (!resp.ok)
      return new Response(JSON.stringify({ error: 'Anthropic 오류', detail: respText.slice(0,200) }), { status: 500, headers });

    let data;
    try { data = JSON.parse(respText); }
    catch { return new Response(JSON.stringify({ error: '응답 파싱 오류' }), { status: 500, headers }); }

    let raw = (data.content?.[0]?.text || '').trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match)
      return new Response(JSON.stringify({ error: 'JSON 추출 실패', raw: raw.slice(0,200) }), { status: 500, headers });

    const result = JSON.parse(match[0]);

    // 사주 정보 보완 (코드 계산 결과로 덮어쓰기)
    result.pillars = {
      year: p.년주.stem + p.년주.branch,
      month: p.월주.stem + p.월주.branch,
      day: p.일주.stem + p.일주.branch,
      hour: p.시주.stem + p.시주.branch
    };
    result.ilgan = p.일주.stem.replace(/[가-힣]/g,'');
    result.ilgan_element = ilganElem;
    result.geokguk = geokguk;
    result.missing_elements = missing;

    return new Response(JSON.stringify({ success: true, data: result }), { headers });

  } catch(e) {
    return new Response(JSON.stringify({ error: '서버 오류', detail: e.message }), { status: 500, headers });
  }
}
