const STEMS = ['갑甲','을乙','병丙','정丁','무戊','기己','경庚','신辛','임壬','계癸'];
const BRANCHES = ['자子','축丑','인寅','묘卯','진辰','사巳','오午','미未','신申','유酉','술戌','해亥'];
const STEM_ELEM = ['목','목','화','화','토','토','금','금','수','수'];
const BR_ELEM = ['수','토','목','목','토','화','화','토','금','금','토','수'];
const JIJANGGAN = {0:[9],1:[9,7,5],2:[4,2,0],3:[0,1],4:[1,9,4],5:[4,6,2],6:[2,5,3],7:[3,1,5],8:[4,8,6],9:[6,7],10:[7,3,4],11:[4,0,8]};
const BR_MAIN = {0:9,1:5,2:0,3:1,4:4,5:2,6:3,7:5,8:6,9:6,10:4,11:8};
const MONTH_TERMS= [[315,2],[345,3],[15,4],[45,5],[75,6],[105,7],[135,8],[165,9],[195,10],[225,11],[255,0],[285,1]];
const WUHU = [2,4,6,8,0,2,4,6,8,0];
const WUZI = [0,2,4,6,8,0,2,4,6,8];
const JD_BASE = 2460311.0;
const WOON_N = ['장생','목욕','관대','건록','제왕','쇠','병','사','묘','절','태','양'];
const JANGSEONG = {0:11,1:6,2:2,3:9,4:2,5:9,6:5,7:0,8:8,9:3};
const SINSAL_V1 = ['겁살','재살','천살','망신살','지살','년살','월살','장성살','반안살','역마살','육해살','화개살'];
const SINSAL_V2 = ['겁살','재살','천살','지살','년살','월살','망신살','장성살','반안살','역마살','육해살','화개살'];
const SINSAL_CFG = {0:[8,SINSAL_V2],1:[2,SINSAL_V2],2:[8,SINSAL_V2],3:[5,SINSAL_V2],4:[5,SINSAL_V2],5:[5,SINSAL_V1],6:[11,SINSAL_V2],7:[5,SINSAL_V2],8:[2,SINSAL_V2],9:[2,SINSAL_V2],10:[11,SINSAL_V2],11:[5,SINSAL_V2]};

function jd(y, m, d, h = 0) {
  if(m <= 2){ y--; m += 12; }
  const A = Math.trunc(y / 100), B = 2 - A + Math.trunc(A / 4);
  return Math.trunc(365.25 * (y + 4716)) + Math.trunc(30.6001 * (m + 1)) + d + h / 24 + B - 1524.5;
}
function sl(jd) {
  const T = (jd - 2451545) / 36525;
  const L0 = ((280.46646 + 36000.76983 * T + 0.0003032 * T * T) % 360 + 360) % 360;
  const M = (((357.52911 + 35999.05029 * T - 0.0001537 * T * T) % 360) + 360) % 360;
  const Mr = M * Math.PI / 180;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr) + (0.019993 - 0.000101 * T) * Math.sin(2 * Mr) + 0.000289 * Math.sin(3 * Mr);
  const omega = 125.04 - 1934.136 * T;
  return ((L0 + C - 0.00569 - 0.00478 * Math.sin(omega * Math.PI / 180)) % 360 + 360) % 360;
}
function eot(jd) {
  const T = (jd - 2451545) / 36525;
  const e0 = 23 + 26 / 60 + 21.448 / 3600 - T * (46.815 / 3600);
  const e = 0.016708634 - 0.000042037 * T;
  const M = ((357.52911 + 35999.05029 * T) % 360 + 360) % 360;
  const L0 = ((280.46646 + 36000.76983 * T) % 360 + 360) % 360;
  const y = Math.tan(e0 * Math.PI / 360) ** 2;
  const Mr = M * Math.PI / 180, L0r = L0 * Math.PI / 180;
  const v = y * Math.sin(2 * L0r) - 2 * e * Math.sin(Mr) + 4 * e * y * Math.sin(Mr) * Math.cos(2 * L0r) - 0.5 * y * y * Math.sin(4 * L0r) - 1.25 * e * e * Math.sin(2 * Mr);
  return v * 180 / Math.PI * 4;
}
function findTerm(year, target) {
  const am = Math.trunc((target / 30 + 3) % 12) + 1;
  let js = jd(year, am, 1, 0) - 20;
  for(let i = 0; i < 60; i++){
    const j = js + i, s = sl(j), sn = sl(j + 1);
    const d = (target - s + 360) % 360, dn = (target - sn + 360) % 360;
    if(d < 180 && dn > 180){
      let lo = j, hi = j + 1;
      for(let k = 0; k < 60; k++){
        const mid = (lo + hi) / 2;
        if((target - sl(mid) + 360) % 360 < 180) lo = mid; else hi = mid;
      }
      return (lo + hi) / 2;
    }
  }
  return null;
}
function trueSolar(year, month, day, hour, minute, lon) {
  const kst = hour * 60 + minute, lo = (lon - 135) * 4;
  const ju = jd(year, month, day, hour - 9 + minute / 60);
  const e = eot(ju);
  const tm = ((kst + lo + e) % (24 * 60) + 24 * 60) % (24 * 60);
  return { h: Math.trunc(tm / 60), m: Math.trunc(tm % 60), lo: lo.toFixed(1), e: e.toFixed(1) };
}
function yearPillar(bjd, by) {
  const lc = findTerm(by, 315);
  const y = (lc && bjd >= lc) ? by : by - 1;
  return [((y - 1984) % 10 + 10) % 10, ((y - 1984) % 12 + 12) % 12];
}
function monthPillar(bjd, by, ys) {
  const terms = [];
  for(const [lon, bi] of MONTH_TERMS) for(const y of [by - 1, by, by + 1]){ const t = findTerm(y, lon); if(t) terms.push([t, bi]); }
  terms.sort((a, b) => a[0] - b[0]);
  let cb = terms[0][1];
  for(let i = 0; i < terms.length - 1; i++) if(terms[i][0] <= bjd && bjd < terms[i + 1][0]){ cb = terms[i][1]; break; }
  const ms = (WUHU[ys] + [2,3,4,5,6,7,8,9,10,11,0,1].indexOf(cb)) % 10;
  return [ms, cb];
}
function dayPillar(bjd) {
  let idx = Math.round(bjd - JD_BASE) % 60; if(idx < 0) idx += 60;
  return [idx % 10, idx % 12];
}
function hourBranch(h, m) {
  const t = h * 60 + m;
  if(t >= 23 * 60 || t < 60) return 0;
  return Math.trunc((t + 60) / 120);
}
function sipseong(ds, ts) {
  const me = Math.trunc(ds / 2), myy = ds % 2, ot = Math.trunc(ts / 2), oyy = ts % 2, same = myy === oyy;
  if(me === ot) return same ? '비견' : '겁재';
  if((me + 1) % 5 === ot) return same ? '식신' : '상관';
  if((me + 2) % 5 === ot) return same ? '편재' : '정재';
  if((ot + 1) % 5 === me) return same ? '편인' : '정인';
  return same ? '편관' : '정관';
}
function woon(ds, bi) {
  const st = JANGSEONG[ds], iy = ds % 2 === 1;
  return WOON_N[iy ? (st - bi + 12) % 12 : (bi - st + 12) % 12];
}
function sinsal(dbi, tbi) {
  const [base, order] = SINSAL_CFG[dbi];
  return order[(tbi - base + 12) % 12];
}
function daewoon(by, bjd, ms, mbi, ys, gender, count = 8) {
  const yy = ys % 2, isMale = gender === '남';
  const fwd = (yy === 0 && isMale) || (yy === 1 && !isMale);
  const terms = [];
  for(const [lon] of MONTH_TERMS) for(const y of [by - 1, by, by + 1]){ const t = findTerm(y, lon); if(t) terms.push(t); }
  terms.sort((a, b) => a - b);
  let near = null;
  if(fwd){ for(const t of terms) if(t > bjd){ near = t; break; } } else { for(const t of [...terms].reverse()) if(t < bjd){ near = t; break; } }
  const sf = near ? Math.abs(near - bjd) / 3 : 0;
  const si = Math.round(sf);
  const list = [];
  for(let i = 0; i < count; i++){
    const age = si + i * 10;
    const si2 = fwd ? (ms + 1 + i) % 10 : ((ms - 1 - i) % 10 + 10) % 10;
    const bi2 = fwd ? (mbi + 1 + i) % 12 : ((mbi - 1 - i) % 12 + 12) % 12;
    list.push({ age, stemI: si2, branchI: bi2, stem: STEMS[si2], branch: BRANCHES[bi2], sipseong: sipseong(ms, si2) });
  }
  return { dir: fwd ? '순행' : '역행', startF: sf.toFixed(2), startI: si, list };
}
function ohaeng(pillars) {
  const c = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for(const [s, b] of pillars) { c[STEM_ELEM[s]]++; c[BR_ELEM[b]]++; }
  return c;
}
function currentSeun() {
  const y = new Date().getFullYear();
  const si = ((y - 1984) % 10 + 10) % 10, bi = ((y - 1984) % 12 + 12) % 12;
  return { year: y, stem: STEMS[si], branch: BRANCHES[bi], stemI: si, branchI: bi };
}

function calcBazi(year, month, day, hour, minute, lon, gender) {
  const ts = trueSolar(year, month, day, hour, minute, lon);
  const jdN = jd(year, month, day, 12 - 9);
  const [ys, yb] = yearPillar(jdN, year);
  const [ms, mb] = monthPillar(jdN, year, ys);
  const [ds, db] = dayPillar(jdN);
  const hbi = hourBranch(ts.h, ts.m);
  const hs = (WUZI[ds] + hbi) % 10, hb = hbi;
  const dw = daewoon(year, jdN, ms, mb, ys, gender);
  const seun = currentSeun();
  const nowY = new Date().getFullYear();
  const age = nowY - year;
  
  let curDw = dw.list[0];
  for(let i = 0; i < dw.list.length; i++){
    if(dw.list[i].age <= age) { curDw = dw.list[i]; if(i + 1 < dw.list.length && dw.list[i + 1].age > age) break; }
  }
  const remaining = Math.max(0, (curDw.age + 10) - age);
  const oh = ohaeng([[ys, yb], [ms, mb], [ds, db], [hs, hb]]);
  
  const mkP = (si, bi) => ({
    stemI: si, branchI: bi, stem: STEMS[si], branch: BRANCHES[bi],
    stemElem: STEM_ELEM[si], branchElem: BR_ELEM[bi], stemSS: sipseong(ds, si),
    branchSS: sipseong(ds, BR_MAIN[bi]), woon: woon(ds, bi), jjg: JIJANGGAN[bi].map(i => STEMS[i]), sinsal: sinsal(db, bi),
  });

  return { ts, pillars: { 년주: mkP(ys, yb), 월주: mkP(ms, mb), 일주: { ...mkP(ds, db), stemSS: '비견' }, 시주: mkP(hs, hb) },
    dw, curDw, remaining, seun, oh, age, raw: { ys, yb, ms, mb, ds, db, hs, hb } };
}

function generateGeminiPayload(input, res, focusList = ["재물운", "직업운"]) {
  const { year, month, day, hour, minute, lon, gender, name, city } = input;
  const { pillars, dw, curDw, remaining, seun, oh, ts } = res;

  return JSON.stringify({
    members: [{
      id: "본인", name: name || "이름없음", gender,
      birth: { calendar: "양력", year, month, day, hour, minute, true_solar_hour: ts.h, true_solar_minute: ts.m, lon_offset_min: parseFloat(ts.lo), eot_min: parseFloat(ts.e), longitude: lon, birthplace: city },
      bazi_pillars: { year: { stem: pillars.년주.stem, branch: pillars.년주.branch }, month: { stem: pillars.월주.stem, branch: pillars.월주.branch }, day: { stem: pillars.일주.stem, branch: pillars.일주.branch }, hour: { stem: pillars.시주.stem, branch: pillars.시주.branch } },
      sipseong: { year_stem: pillars.년주.stemSS, year_branch: pillars.년주.branchSS, month_stem: pillars.월주.stemSS, month_branch: pillars.월주.branchSS, hour_stem: pillars.시주.stemSS, hour_branch: pillars.시주.branchSS },
      woonseong_12: { year: pillars.년주.woon, month: pillars.월주.woon, day: pillars.일주.woon, hour: pillars.시주.woon },
      sinsal_12: { year: pillars.년주.sinsal, month: pillars.월주.sinsal, day: pillars.일주.sinsal, hour: pillars.시주.sinsal },
      jijanggan: { year: pillars.년주.jjg, month: pillars.월주.jjg, day: pillars.일주.jjg, hour: pillars.시주.jjg },
      ohaeng: oh,
      current_daewoon: { stem: curDw.stem, branch: curDw.branch, sipseong: curDw.sipseong, start_age: curDw.age, current_approx_age: res.age, remaining_years: remaining },
      daewoon_full: dw.list.map(d => ({ age: d.age, stem: d.stem, branch: d.branch, sipseong: d.sipseong })),
      daewoon_direction: dw.dir, daewoon_start_age: dw.startI,
      current_seun: { year: seun.year, stem: seun.stem, branch: seun.branch }
    }],
    analysis_focus: focusList, language: "ko"
  });
}

// 외부에서 쓸 수 있도록 내보내기
module.exports = { calcBazi, generateGeminiPayload };