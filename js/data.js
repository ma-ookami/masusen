// ますせん: 購読(リアルタイム更新)・参加グループ・開催ルールと返事の集計
// index.html から順番に読み込みます(前のファイルで決めた名前を使います)。

// ---------- subscriptions ----------
function stopSubs(){ S.unsubs.forEach(u => { try{u();}catch{} }); S.unsubs = []; ansUnsub = null; dayUnsubs = []; }
function onSubError(e){
  if (e && e.code === "revoked") return fail("このページへのアクセスが変わりました。再読み込みしてください。");
  fail("データを読み込めませんでした。通信を確認して再読み込みしてください。");
}
function openGroup(gid, quiet){
  if (gid && !quiet) S.diffPending = true;
  if (gid && !quiet){ ls.set("last", gid); bumpGroup(gid); }
  stopSubs();
  if (quiet){
    S.deniedFor = null;
    S.day = gameDay(); S.month = S.day.slice(0, 7);
    if (S.sel < S.day) S.sel = S.day;
  } else {
  closeSheets();
  Object.assign(S, { gid, deniedFor:null, me:null, linkMid:null, linkVerified:false, linkLoaded:false, group:null, groupLoaded:false, members:{}, membersLoaded:false, answers:{}, overrides:{}, plans:{}, monthCache:{}, prevFest:"", ansReady:false, festState:{} });
  planEditing = false;
  S.day = gameDay(); S.sel = S.day; S.month = S.day.slice(0, 7); S.calMonth = S.month;
  render();
  }
  if (!gid) return;
  const g = S.db.doc("groups/" + gid);
  const settle = key => setTimeout(() => { if (S.gid === gid && !S[key]){ S[key] = true; render(); } }, 4000);

  S.unsubs.push(g.onSnapshot(snap => {
    if (S.gid !== gid) return;
    const d = snap.exists ? snap.data() : null;
    S.group = d ? { name:str(d.name,24) || "グループ", ...cleanRule(d), restDays:cleanRestDays(d.restDays), showPlan: d.showPlan !== false, createdBy: str(d.createdBy,200) } : null;
    if (!snap.metadata.fromCache || d) S.groupLoaded = true; else settle("groupLoaded");
    render();
  }, onSubError));

  S.unsubs.push(g.collection("members").onSnapshot(snap => {
    if (S.gid !== gid) return;
    const m = {};
    snap.docs.forEach(doc => { const d = doc.data(); if (d && str(d.name,16)) m[doc.id] = { name:str(d.name,16), joinedAt:num(d.joinedAt)||0, color:clamp(d.color, 0, 15, null), hasPin:d.hasPin === true, weekly:cleanWeekly(d.weekly), shape:Object.hasOwn(SHAPES, d.shape || "") ? d.shape : "circle" }; });
    S.members = m;
    if (!snap.metadata.fromCache || m[S.uid] || (S.linkMid && m[S.linkMid])) S.membersLoaded = true; else settle("membersLoaded");
    render();
  }, onSubError));

  // which member this browser acts as, when it isn't the browser that joined
  S.unsubs.push(g.collection("links").doc(S.uid).onSnapshot(snap => {
    if (S.gid !== gid) return;
    if (snap.metadata.hasPendingWrites) return;   // wait for the server's verdict
    const d = snap.exists ? snap.data() : null;
    S.linkMid = d && typeof d.mid === "string" ? d.mid : null;
    S.linkVerified = !!(d && d.verified === true);
    if (!snap.metadata.fromCache || d) S.linkLoaded = true; else settle("linkLoaded");
    render();
  }, onSubError));

}
let ansUnsub = null, ansFrom = "";
let dayUnsubs = [];
function stopDaySubs(){
  dayUnsubs.forEach(u => { try{u();}catch{} });
  S.unsubs = S.unsubs.filter(u => !dayUnsubs.includes(u)); dayUnsubs = []; ansUnsub = null;
}
// these reads need membership; losing it (removed by the creator) just stops them
function daySubError(e){
  if (e && e.code === "invalid_argument"){ S.deniedFor = S.me; stopDaySubs(); S.answers = {}; S.plans = {}; S.overrides = {}; render(); return; }
  onSubError(e);
}
function subscribeAnswers(){
  if (!S.me) return;
  const from = startDay();
  if (ansUnsub && from === ansFrom) return;
  dayUnsubs.forEach(u => { try{u();}catch{} });
  S.unsubs = S.unsubs.filter(u => !dayUnsubs.includes(u)); dayUnsubs = [];
  const gid = S.gid; ansFrom = from;
  const watch = (sub, fn) => {
    const u = S.db.collection(`groups/${gid}/${sub}`).where("day", ">=", from).onSnapshot(snap => {
      if (S.gid !== gid || ansFrom !== from) return;
      fn(snap); render();
    }, daySubError);
    dayUnsubs.push(u); S.unsubs.push(u);
  };
  watch("plans", snap => {
    const o = {};
    snap.docs.forEach(doc => { const d = doc.data(); const t = d && str(d.text, 30).trim(); if (t) o[doc.id] = { text:t, by:str(d.by, 200) }; });
    S.plans = o;
  });
  watch("overrides", snap => {
    const o = {};
    snap.docs.forEach(doc => { const c = cleanOv(doc.data()); if (c) o[doc.id] = c; });
    S.overrides = o;
  });
  ansUnsub = S.db.collection(`groups/${gid}/answers`).where("day", ">=", from).onSnapshot(snap => {
    if (S.gid !== gid || ansFrom !== from) return;
    const a = {};
    snap.docs.forEach(doc => { const c = cleanAnswer(doc.data()); if (c) a[doc.id] = c; });
    S.answers = a; S.ansReady = true; render();
    if (!snap.metadata.fromCache) noteChanges(gid);
  }, daySubError);
  S.unsubs.push(ansUnsub); dayUnsubs.push(ansUnsub);
}

// Remember when each person's answer for today was last seen; on the next visit, say how many changed.
function noteChanges(gid){
  const today = {};
  Object.values(S.answers).forEach(a => { if (a.day === S.day && a.uid !== S.me && a.status !== "none") today[a.uid] = a.updatedAt || 0; });
  const prev = ls.get("seen." + gid, null);
  if (S.diffPending && S.me){
    S.diffPending = false;
    if (prev && prev.day === S.day){
      const n = Object.keys(today).filter(id => S.members[id] && today[id] > (prev.at[id] || 0)).length;
      if (n) setTimeout(() => toast(`前回から${n}人が返事しました`), 600);
    }
  }
  ls.set("seen." + gid, { day:S.day, at:today });
}

// ---------- my groups ----------
// groups this browser has created (kept with the group list; the rules cap it)
const MAX_OWNED = 3;
const userDoc = () => ({ groups:S.myGroups.slice(0, 30), owned:S.owned.slice(0, MAX_OWNED) });
async function loadMyGroups(){
  S.myGroups = ls.get("groups", []);
  if (!S.uid || !S.db) return;
  try {
    const snap = await S.db.doc(`users/${S.uid}`).get();
    const remote = snap.exists && Array.isArray(snap.data().groups) ? snap.data().groups : [];
    S.owned = snap.exists && Array.isArray(snap.data().owned) ? snap.data().owned.filter(x => typeof x === "string").slice(0, MAX_OWNED) : [];
    const merged = [...S.myGroups];
    remote.forEach(g => { if (g && typeof g.id === "string" && !merged.some(x => x.id === g.id)) merged.push({id:str(g.id,40), name:str(g.name,24)}); });
    S.myGroups = merged; ls.set("groups", merged);
  } catch {}
}
// most recently opened group goes to the top of the home list
function bumpGroup(id){
  const i = S.myGroups.findIndex(g => g.id === id);
  if (i <= 0) return;                       // not listed yet, or already first
  S.myGroups = [S.myGroups[i], ...S.myGroups.slice(0, i), ...S.myGroups.slice(i + 1)];
  ls.set("groups", S.myGroups);
  if (S.uid && S.canWrite !== false) writeDoc(S.db.doc(`users/${S.uid}`), userDoc());
}
function forgetGroup(id){
  if (!S.myGroups.some(g => g.id === id)) return;
  S.myGroups = S.myGroups.filter(g => g.id !== id);
  ls.set("groups", S.myGroups);
  if (S.uid && S.canWrite !== false) writeDoc(S.db.doc(`users/${S.uid}`), userDoc());
}
// note that I opened this group; only the creator can read these. Quietly skipped if it can't be saved.
const SEEN_EVERY = 30 * 60e3;
function markSeen(){
  if (!S.gid || !S.me || !S.db) return;
  const k = `seen.${S.gid}.${S.me}`;
  if (Date.now() - ls.get(k, 0) < SEEN_EVERY) return;
  ls.set(k, Date.now());
  S.db.doc(`groups/${S.gid}/seen/${S.me}`).set({ at:Date.now() }).catch(() => ls.set(k, 0));
}
// creator only: when each member last opened the group
async function loadSeen(){
  const gid = S.gid;
  try {
    const snap = await S.db.collection(`groups/${gid}/seen`).get();
    if (S.gid !== gid) return;
    S.seen = Object.fromEntries(snap.docs.map(d => [d.id, num(d.data() && d.data().at) || 0]));
  } catch { S.seen = null; }
  if (isOpen("shSet")) renderMemManage();
}
function rememberGroup(id, name){
  const i = S.myGroups.findIndex(g => g.id === id);
  if (i >= 0 && S.myGroups[i].name === name) return;
  if (i >= 0) S.myGroups[i] = {id, name}; else S.myGroups.unshift({id, name});
  ls.set("groups", S.myGroups);
  if (S.uid && S.canWrite !== false) writeDoc(S.db.doc(`users/${S.uid}`), userDoc());
}

// ---------- rules ----------
function ruleText(r, n){
  if (r.rule === "count") return `${r.quorum}人そろったら開催`;
  if (r.rule === "minus"){
    if (!n || n < 2) return r.minus === 0 ? "メンバー全員そろったら開催" : `メンバー数より${r.minus}人少なくても開催`;
    return r.minus === 0 ? `全員(${n}人)そろったら開催` : `${n}人中${minusNeed(r.minus, n)}人で開催`;
  }
  if (r.rule === "ratio") return `メンバーの${RATIOS[r.ratio].label}で開催` + (n ? `(${n}人中${Math.max(1, RATIOS[r.ratio].need(n))}人)` : "");
  return `集まった人でやる(${r.minOpen}人から)`;
}
const weeklyRestOn = day => !isHoliday(day) && (S.group.restDays || []).includes(parseDay(day).getUTCDay());
function needFor(day, ovs = S.overrides){
  const o = ovs[day] || {};
  const weekly = weeklyRestOn(day);
  if (o.rest === true || (weekly && !o.need && o.rest !== false)) return { rest:true, weekly: o.rest !== true, need:Infinity, open:true, tag:"お休み" };
  if (o.need) return { need:o.need, open:true, override:true, tag:`この日だけ${o.need}人でやる` };
  return usualRule();
}
// the group's rule, ignoring rest days and one-day settings
function usualRule(){
  const n = Object.keys(S.members).length, g = S.group;
  if (g.rule === "minus"){ const need = minusNeed(g.minus, n); return { need, tag:`${n}人中${need}人で開催` }; }
  if (g.rule === "ratio"){ const need = Math.max(1, RATIOS[g.ratio].need(n)); return { need, tag:`${n}人中${need}人で開催` }; }
  if (g.rule === "open") return { need:g.minOpen, open:true, tag:`集まった人でやる・${g.minOpen}人から` };
  return { need:g.quorum, tag:`${g.quorum}人そろったら開催` };
}
// weekly defaults: { "0":"sen", "5":"masu" } (0 = Sunday)
function cleanWeekly(w){
  const out = {};
  if (w && typeof w === "object") for (let i = 0; i < 7; i++){
    const v = w[String(i)];
    const st = typeof v === "string" ? v : v && v.status;
    if (!STATUSES[st]) continue;
    const allowed = st === "sen" ? SEN_TAGS : CONDS;
    const conds = v && Array.isArray(v.conds) ? v.conds.filter(c => allowed.includes(c)).slice(0, 16) : [];
    out[String(i)] = { status:st, conds };
  }
  return out;
}
// { status, conds } for that member on that day, or null (never on holidays)
function weeklyOf(id, day){
  const m = S.members[id];
  if (!m || !m.weekly || isHoliday(day)) return null;
  return m.weekly[String(parseDay(day).getUTCDay())] || null;
}
function answersFor(day){
  const out = {};
  const cleared = new Set();      // explicitly "no answer" for this day: no weekly default either
  for (const k in S.answers){ const a = S.answers[k]; if (a.day !== day || !S.members[a.uid]) continue;
    if (a.status === "none") cleared.add(a.uid); else out[a.uid] = a; }
  for (const id in S.members){
    if (out[id] || cleared.has(id)) continue;
    const u = weeklyOf(id, day);
    if (u) out[id] = { uid:id, day, status:u.status, from:null, until:null, cutoff:null, game:"", conds:[...u.conds], comment:"", updatedAt:0, usual:true };
  }
  return out;
}
const isMasu = a => !!a && a.status === "masu";
const isTabun = a => !!a && a.status === "tabun";
function masuCount(day){ const ad = answersFor(day); return Object.values(ad).filter(isMasu).length; }
const myKey = day => day + "_" + S.me;
// my real answer for the day ("none" = I cleared it), and the one that counts as an answer
const rawMine = day => S.answers[myKey(day)] || null;
const mineOn = day => { const a = rawMine(day); return a && a.status !== "none" ? a : null; };
function detailText(a){
  if (!a) return "";
  return [timeText(a), cutText(a), (a.conds || []).join("・"), a.game ? "🎮 " + a.game : "", a.comment ? "「" + a.comment + "」" : ""].filter(Boolean).join(" ・ ");
}
// 12 well-spaced hues; the member id picks one
function colorIndex(id){
  const m = S.members[id];
  if (m && m.color != null) return m.color;
  let x = 0; for (const ch of String(id)) x = (x * 31 + ch.charCodeAt(0)) >>> 0;
  return x % 12;
}
// stored color numbers: 0–11 soft hues, 12 black, 13–15 vivid red / blue / yellow
const AV_ORDER = [0,1,2,3,4,5,6,7,8,9,10,11,13,14,15,12];   // order shown in the picker
const AV_VIVID = { 13:"#e60012", 14:"#0068d9", 15:"#ffd400" };
const AV_NAMES = { 12:"黒", 13:"赤", 14:"青", 15:"黄" };
// icon shapes; the CSS class "shape-<key>" draws each one (circle is the plain .av)
const SHAPES = { circle:"まる", squircle:"角丸", badge:"バッジ", flower:"お花", hexagon:"六角形" };
const avBg = i => i === 12 ? "#141318" : AV_VIVID[i] || `hsl(${i * 30} 55% 44%)`;
const avStyle = i => `--avbg:${avBg(i)};--avfg:${i === 15 ? "#2b1d00" : "#fff"}`;
function avatar(id, name){
  const m = S.members[id], shape = m && m.shape && m.shape !== "circle" ? m.shape : "";
  return h("span", { class:"av" + (shape ? " shape-" + shape : ""), style:avStyle(colorIndex(id)), "aria-hidden":"true", text:[...(name || "?")][0] });
}
// edits happen on a draft; "いつもの返事を保存" writes it
let wkDraft = null, wkSel = 1;
const wkJson = w => JSON.stringify(Object.keys(w || {}).sort().map(k => [k, w[k].status, [...w[k].conds].sort()]));
function renderWeeklyPick(){
  const mid = S.me || S.uid, m = S.members[mid]; if (!m) return;
  if (!wkDraft) wkDraft = JSON.parse(JSON.stringify(m.weekly || {}));
  $("weeklyPick").replaceChildren(...DOW.map((dn, i) => {
    const v = wkDraft[String(i)];
    return h("button", { type:"button", role:"tab", "aria-selected":String(i === wkSel),
      class:"wk " + (v ? v.status : "none") + (i === wkSel ? " pick" : "") + (i === 0 ? " sun" : i === 6 ? " sat" : ""),
      "aria-label":`${dn}曜日:${v ? STATUSES[v.status].label : "なし"}`, onclick:() => { wkSel = i; renderWeeklyPick(); } },
      h("span", { class:"wk-d", text:dn }), h("span", { class:"wk-v", text: v ? STATUSES[v.status].ic : "ー" }));
  }));
  // the chosen weekday's answer and tags
  const cur = wkDraft[String(wkSel)];
  const setStatus = st => {
    if (!st) delete wkDraft[String(wkSel)];
    else wkDraft[String(wkSel)] = { status:st, conds: cur && (cur.status === "sen") === (st === "sen") ? cur.conds : [] };
    renderWeeklyPick();
  };
  const opts = [[null, "なし"], ["masu", "◎ ます"], ["tabun", "△ たぶん"], ["sen", "× せん"]];
  const tags = cur ? (cur.status === "sen" ? SEN_TAGS : CONDS) : [];
  $("weeklyEdit").replaceChildren(...[
    h("span", { class:"label", text:`${DOW[wkSel]}曜日のいつもの返事` }),
    h("div", { class:"chips" }, opts.map(([st, label]) => h("button", { type:"button",
      class:"chip sm" + ((cur ? cur.status : null) === st ? " on" : ""), onclick:() => setStatus(st) }, label))),
    cur ? h("span", { class:"label", text: cur.status === "sen" ? "理由(いくつでも・なくてもOK)" : "条件(いくつでも・なくてもOK)" }) : null,
    cur ? h("div", { class:"chips" }, tags.map(t => h("button", { type:"button", class:"chip sm" + (cur.conds.includes(t) ? " on" : ""),
      onclick:() => { cur.conds = cur.conds.includes(t) ? cur.conds.filter(x => x !== t) : [...cur.conds, t]; renderWeeklyPick(); } }, t))) : null].filter(Boolean));
  $("weeklySave").disabled = wkJson(wkDraft) === wkJson(m.weekly);
}
function renderColorPick(){
  renderWeeklyPick();
  const mid = (S.me || S.uid), m = S.members[mid]; if (!m) return;
  const cur = colorIndex(mid), ch = [...(m.name || "?")][0], curShape = m.shape || "circle";
  $("shapePick").replaceChildren(...Object.keys(SHAPES).map(k => h("button", { type:"button", class:"shape-opt" + (k === curShape ? " on" : ""),
    role:"radio", "aria-checked":String(k === curShape), onclick:() => saveShape(k) },
    h("span", { class:"av" + (k === "circle" ? "" : " shape-" + k), style:avStyle(cur), "aria-hidden":"true", text:ch }),
    h("span", { text:SHAPES[k] }))));
  $("colorPick").replaceChildren(...AV_ORDER.map(i => h("button", { type:"button", class:"swatch" + (i === cur ? " on" : ""),
    style:avStyle(i), role:"radio", "aria-checked":String(i === cur), "aria-label": AV_NAMES[i] || `色${i + 1}`,
    onclick:() => saveColor(i) }, ch)));
}
// how long ago, in the coarsest unit that fits
function agoText(t){
  if (!t) return "";
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return "たった今";
  if (m < 60) return `${m}分前`;
  const hr = Math.floor(m / 60);
  if (hr < 24) return `${hr}時間前`;
  return `${Math.floor(hr / 24)}日前`;
}
function metaNodes(a, withStatusClass, hideComment){
  if (!a) return [];
  const out = [];
  const tt = timeText(a); if (tt) out.push(h("span", { class:"mtag time", text:tt }));
  const ct = cutText(a); if (ct) out.push(h("span", { class:"mtag", text:ct }));
  (a.conds || []).forEach(c => out.push(h("span", { class:"mtag" + (withStatusClass ? " " + a.status : ""), text:c })));
  if (a.game) out.push(h("span", { text:"🎮 " + a.game }));
  if (a.comment && !hideComment) out.push(h("span", { text:"「" + a.comment + "」" }));
  return out;
}
function cutText(a){ return a && a.status !== "sen" && a.cutoff != null ? `${hourLabel(a.cutoff)}にいなければ先に始めて` : ""; }
function timeText(a){
  if (!a || a.status === "sen") return "";
  if (a.from != null && a.until != null) return `${hourLabel(a.from)}〜${hourLabel(a.until)}`;
  if (a.from != null) return `${hourLabel(a.from)}から`;
  if (a.until != null) return `${hourLabel(a.until)}まで`;
  return "";
}

// rule picker (used on create and in settings)
// min/max may be functions, so the range can follow the member count
function stepper(get, set, min, max, unit){
  const lo = () => typeof min === "function" ? min() : min, hi = () => typeof max === "function" ? max() : max;
  const out = h("output", { text:get() });
  const minus = h("button", { type:"button", "aria-label":"減らす", onclick:() => upd(get() - 1) }, "−");
  const plus = h("button", { type:"button", "aria-label":"増やす", onclick:() => upd(get() + 1) }, "+");
  const sync = () => { out.textContent = get(); minus.disabled = get() <= lo(); plus.disabled = get() >= hi(); };
  // a saved value outside today's range (members left) can still be lowered/raised back in
  function upd(v){ const cur = get(); const next = Math.max(Math.min(lo(), cur), Math.min(Math.max(hi(), cur), v));
    if (v < cur) set(Math.max(Math.min(lo(), cur), v)); else if (v > cur && cur < hi()) set(Math.min(hi(), v)); else if (next !== cur) set(next);
    sync(); }
  sync();
  return h("div", { class:"stepper" }, minus, out, h("span", { text:unit }), plus);
}
function rulePicker(root, memberCount, onChange){
  let st = cleanRule({});
  const changed = () => { if (onChange) onChange(); };
  // with members known, every number stays within them (the create form has none yet, so it's left alone)
  const fit = () => {
    const n = memberCount(); if (n < 1) return;
    st.quorum = Math.min(Math.max(st.quorum, 1), n);
    st.minOpen = Math.min(Math.max(st.minOpen, 1), n);
    st.minus = Math.min(Math.max(st.minus, 0), n - 1);
  };
  const draw = () => {
    fit();
    const seg = h("div", { class:"seg", role:"radiogroup" },
      [["count","人数を\n決める"],["minus","メンバー数に\n合わせる"],["open","集まった\n人でやる"]].map(([k, l]) =>
        h("button", { type:"button", role:"radio", "aria-checked":String(st.rule === k), class: st.rule === k ? "on" : "", onclick:() => { st.rule = k; draw(); changed(); } },
          ...l.split("\n").flatMap((p, i) => i ? [h("br"), p] : [p]))));
    let detail;
    const n = () => memberCount(), cap = () => n() >= 1 ? n() : 20;
    if (st.rule === "count") detail = stepper(() => st.quorum, v => { st.quorum = v; hint.textContent = ruleText(st, memberCount()); changed(); }, 1, cap, "人そろったら開催");
    else if (st.rule === "minus") detail = stepper(() => st.minus, v => { st.minus = v; hint.textContent = minusHint(); changed(); }, 0, () => n() >= 1 ? Math.max(0, n() - 1) : 19, "人少なくても開催");
    else detail = stepper(() => st.minOpen, v => { st.minOpen = v; hint.textContent = ruleText(st, memberCount()); changed(); }, 1, cap, "人いればやる");
    const minusHint = () => {
      const n = memberCount();
      if (n < 2) return st.minus === 0 ? "メンバー全員そろったら開催します" : `メンバーが集まったら、その人数より${st.minus}人少なくても開催します`;
      return st.minus === 0 ? `いまのメンバー${n}人なら、全員そろったら開催` : `いまのメンバー${n}人なら、${minusNeed(st.minus, n)}人で開催`;
    };
    const hint = h("p", { class:"rule-hint", text: st.rule === "minus" ? minusHint() : ruleText(st, memberCount()) });
    const extra = st.rule === "minus" ? h("p", { class:"rule-hint", text:"メンバーが増えたら、開催の人数も自動で増えます。" })
      : st.rule === "open" ? h("p", { class:"rule-hint", text:"何人そろうかより、集まった人で遊ぶグループ向け。" }) : null;
    root.replaceChildren(...[seg, detail, hint, extra].filter(Boolean));
  };
  draw();
  return {
    get:() => ({ rule:st.rule, quorum:st.quorum, minus:st.minus, ratio:st.ratio, minOpen:st.minOpen }),
    set(v){
      st = cleanRule(v);
      // an old "何人中何人" group opens as the matching "◯人少なくても開催"
      if (st.rule === "ratio"){ const n = memberCount(); st.minus = Math.max(0, n - Math.max(1, RATIOS[st.ratio].need(n))); st.rule = "minus"; }
      draw();
    } };
}
