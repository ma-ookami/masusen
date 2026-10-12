// ますせん: 定数・状態・日付・小さな道具・書き込み
// index.html から順番に読み込みます(前のファイルで決めた名前を使います)。

// Invite links are this page's own URL + "#<group id>".
const SHARE_BASE = location.origin + location.pathname;

const $ = id => document.getElementById(id);
const STATUSES = { masu:{ic:"◎",label:"ます"}, tabun:{ic:"△",label:"たぶんます"}, sen:{ic:"×",label:"せん"} };
const FROM_HOURS = [19,20,21,22,23,24,25,26];
const UNTIL_HOURS = [22,23,24,25,26,27];
const TL_HOURS = [19,20,21,22,23,24,25,26,27];
const SEN_GROUPS = [
  { label:"からだ・気分", color:"var(--tmrw)", tags:["眠い","疲れた","体調いまいち","気分じゃない"] },
  { label:"予定・用事", color:"var(--wd3)", tags:["仕事","忙しい","予定あり","用事あり","外出中","明日朝早い"] },
  { label:"そのほか", color:"var(--coral)", tags:["明日なら","別のことする","また今度!"] },
];
const SEN_TAGS = SEN_GROUPS.flatMap(g => g.tags);
const COND_GROUPS = [
  { color:"var(--tmrw)", tags:["眠くなければ","元気があれば"] },
  { color:"var(--wd3)", tags:["ご飯のあと","用事が済んだら","家族が寝たら"] },
  { color:"var(--coral)", tags:["遅れるかも","途中から参加","途中抜けあり","少しだけ","聞き専"] },
];
const CONDS = COND_GROUPS.flatMap(g => g.tags);
// earlier, longer names of the same tags
const TAG_RENAMES = { "ご飯のあとなら":"ご飯のあと", "仕事・用事が終われば":"用事が済んだら", "途中で抜けるかも":"途中抜けあり", "聞き専(通話のみ)":"聞き専" };
const hourLabel = h => (h % 24) + "時";
const DOW = ["日","月","火","水","木","金","土"];
const RATIOS = {
  half:{label:"過半数", need:n => Math.floor(n / 2) + 1},
  "2of3":{label:"3分の2", need:n => Math.ceil(n * 2 / 3)},
  "3of4":{label:"4分の3", need:n => Math.ceil(n * 3 / 4)},
  all:{label:"全員", need:n => n},
};

const S = {
  db:null, user:null, uid:null, canWrite:null,
  gid:null, group:null, groupLoaded:false,
  members:{}, membersLoaded:false,
  answers:{}, overrides:{}, plans:{}, day:"", sel:"", month:"",
  calMonth:"", monthCache:{},
  myGroups:[], owned:[], fatal:null, unsubs:[], prevFest:"",
};

const ls = {
  get(k, d){ try{ const v = localStorage.getItem("masusen." + k); return v == null ? d : JSON.parse(v); }catch{ return d; } },
  set(k, v){ try{ localStorage.setItem("masusen." + k, JSON.stringify(v)); }catch{} },
};

// ---------- dates: a "game day" runs from 4:00 to 4:00 JST ----------
function gameDay(now = Date.now()){ return new Date(now + 5 * 3600e3).toISOString().slice(0, 10); }
function msUntilReset(now = Date.now()){ const d = 86400e3; return d - ((now + 5 * 3600e3) % d); }
// 0:00-4:00 JST: still yesterday's game day
function lateNight(now = Date.now()){ return new Date(now + 9 * 3600e3).getUTCHours() < 4; }
function parseDay(d){ const [y,m,dd] = d.split("-").map(Number); return new Date(Date.UTC(y, m-1, dd)); }
function addDays(d, n){ const t = parseDay(d); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); }
function dayLabel(d, short){
  const t = parseDay(d), m = t.getUTCMonth() + 1, dd = t.getUTCDate(), w = DOW[t.getUTCDay()];
  return `${m}/${dd}(${w})`;
}
// Japanese public holidays, computed (fixed days, happy Mondays, equinoxes, substitute and sandwiched days)
const holidayCache = {};
function holidaysOf(y){
  if (holidayCache[y]) return holidayCache[y];
  const set = new Set(), key = (m, d) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const nthMonday = (m, n) => { const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(); return 1 + ((8 - first) % 7) + (n - 1) * 7; };
  [[1,1],[2,11],[2,23],[4,29],[5,3],[5,4],[5,5],[8,11],[11,3],[11,23]].forEach(([m, d]) => set.add(key(m, d)));
  [[1,2],[7,3],[9,3],[10,2]].forEach(([m, n]) => set.add(key(m, nthMonday(m, n))));
  const k = y - 1980, leap = Math.floor(k / 4);
  set.add(key(3, Math.floor(20.8431 + 0.242194 * k - leap)));
  set.add(key(9, Math.floor(23.2488 + 0.242194 * k - leap)));
  const base = [...set].sort();
  base.forEach(d => {                     // a holiday on Sunday moves to the next free day
    if (parseDay(d).getUTCDay() !== 0) return;
    let n = addDays(d, 1); while (set.has(n)) n = addDays(n, 1); set.add(n);
  });
  base.forEach(d => {                     // a weekday between two holidays is a holiday too
    const mid = addDays(d, 1);
    if (!set.has(mid) && set.has(addDays(d, 2)) && parseDay(mid).getUTCDay() !== 0) set.add(mid);
  });
  return (holidayCache[y] = set);
}
const isHoliday = d => holidaysOf(Number(d.slice(0, 4))).has(d);
function relLabel(d){ return d === S.day ? "今日" : d === addDays(S.day, 1) ? "明日" : dayLabel(d, true); }
function shiftMonth(ym, delta){ const [y,m] = ym.split("-").map(Number); return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7); }
function weekDays(){ return Array.from({length:7}, (_, i) => addDays(S.day, i)); }
function startDay(){ return S.day; }

// ---------- helpers ----------
function h(tag, attrs, ...kids){
  const el = document.createElement(tag);
  if (attrs) for (const k in attrs){
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat()){ if (c == null || c === false) continue; el.append(c.nodeType ? c : document.createTextNode(String(c))); }
  return el;
}
const str = (v, n) => typeof v === "string" ? v.slice(0, n) : "";
const num = v => typeof v === "number" && isFinite(v) ? v : null;
const clamp = (v, lo, hi, d) => { const n = num(v); return n == null ? d : Math.max(lo, Math.min(hi, Math.round(n))); };
function cleanAnswer(d){
  if (!d || !(STATUSES[d.status] || d.status === "none") || typeof d.day !== "string") return null;
  return { uid:str(d.uid,200), day:str(d.day,10), month:str(d.month,7) || str(d.day,7), status:d.status,
    from:num(d.from), until:num(d.until), game:str(d.game,24), conds:Array.isArray(d.conds) ? d.conds.map(c => TAG_RENAMES[c] || c).filter(c => (d.status === "sen" ? SEN_TAGS : CONDS).includes(c)).slice(0, 16) : [], comment:str(d.comment,40), cutoff:num(d.cutoff), updatedAt:num(d.updatedAt)||0 };
}
function cleanRule(d){
  const rule = ["count","minus","ratio","open"].includes(d && d.rule) ? d.rule : "count";
  return { rule, quorum:clamp(d && d.quorum, 1, 20, 4), minus:clamp(d && d.minus, 0, 19, 1),
    ratio:RATIOS[d && d.ratio] ? d.ratio : "half", minOpen:clamp(d && d.minOpen, 1, 20, 2) };
}
// weekdays that are always rest days (0 = Sunday)
const cleanRestDays = v => Array.isArray(v) ? [...new Set(v.filter(x => Number.isInteger(x) && x >= 0 && x <= 6))].sort() : [];
// a day's own setting: { need } = this many is enough, { rest:true } = rest day, { rest:false } = play despite the weekly rest day
function cleanOv(d){
  if (!d) return null;
  const need = clamp(d.need, 1, 20, null), rest = typeof d.rest === "boolean" ? d.rest : null;
  if (need) return { need };
  return rest == null ? null : { rest };
}
// "メンバー数に合わせる": everyone minus a few, never below one
const minusNeed = (minus, n) => Math.max(1, n - minus);
function linkFor(gid){ return SHARE_BASE + "#" + gid; }
function newId(prefix){ const a = new Uint8Array(8); crypto.getRandomValues(a); return prefix + Array.from(a, b => (b % 36).toString(36)).join(""); }

let toastT;
function toast(msg, err){
  const t = $("toast"); t.textContent = msg; t.classList.toggle("err", !!err); t.classList.add("show");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2200);
}
async function copy(text, okMsg){
  try { await navigator.clipboard.writeText(text); toast(okMsg || "コピーしました"); }
  catch {
    const ta = h("textarea", {style:"position:fixed;top:0;left:0;opacity:0"}); ta.value = text; document.body.append(ta);
    ta.select(); let ok = false; try{ ok = document.execCommand("copy"); }catch{}
    ta.remove();
    toast(ok ? (okMsg || "コピーしました") : "コピーできませんでした。もう一度押してください", !ok);
  }
}

// ---------- writes: one at a time per document, retry once on transient errors ----------
const writers = new Map();
function writeDoc(ref, data){
  let w = writers.get(ref.path);
  if (!w){ w = {busy:false, next:null, p:Promise.resolve()}; writers.set(ref.path, w); }
  w.next = {ref, data};
  if (!w.busy) w.p = drain(w);
  return w.p;
}
async function drain(w){
  w.busy = true;
  while (w.next){
    const {ref, data} = w.next; w.next = null;
    try { await withRetry(() => data === null ? ref.delete() : ref.set(data)); }
    catch (e){ onWriteError(e); }
  }
  w.busy = false;
}
async function withRetry(fn){
  try { return await fn(); }
  catch (e){
    if (e && e.code === "unavailable"){ await new Promise(r => setTimeout(r, 400 + Math.random() * 600)); return await fn(); }
    throw e;
  }
}
function onWriteError(e){
  const code = e && e.code;
  if (code === "invalid_argument" || code === "not_granted"){ S.canWrite = false; render(); toast("保存できませんでした。ページを再読み込みしてから、もう一度押してください", true); }
  else if (code === "quota_exceeded") toast("今日はこれ以上保存できません(無料枠の上限)。明日また試してください", true);
  else if (code === "revoked") fail("このページへのアクセスが変わりました。再読み込みしてください。");
  else toast("保存に失敗しました。通信を確認して、もう一度押してください", true);
}
