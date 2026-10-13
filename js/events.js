// ますせん: 画面遷移・ボタンなどの操作
// index.html から順番に読み込みます(前のファイルで決めた名前を使います)。

// ---------- navigation ----------
function go(gid){
  try { history.replaceState(null, "", gid ? "#" + gid : location.pathname + location.search); } catch {}
  openGroup(gid);
}
function hashGid(){ const g = location.hash.slice(1); return /^g[a-z0-9]{6,20}$/.test(g) ? g : null; }
window.addEventListener("hashchange", () => { const g = hashGid(); if (g !== S.gid && S.db) openGroup(g); });

// ---------- events ----------
document.querySelectorAll("[data-reload]").forEach(b => b.addEventListener("click", () => location.reload()));
let refreshing = false;
$("reloadBtn").addEventListener("click", async () => {
  if (refreshing || !S.gid) return;
  refreshing = true;
  const b = $("reloadBtn"); b.classList.add("spin"); closeSheets(true);
  const started = Date.now();
  try {
    if (await pageChanged()){ $("updating").hidden = false; setTimeout(() => location.reload(), 220); return; }
    openGroup(S.gid, true);
  } catch {}
  await new Promise(r => setTimeout(r, Math.max(0, 700 - (Date.now() - started))));
  b.classList.remove("spin"); refreshing = false;
  toast("最新の状態にしました");
});
$("errHome").addEventListener("click", () => { S.fatal = null; go(null); });
$("grpBtn").addEventListener("click", () => go(null));
let setTab = "me";
function showSetTab(t){
  setTab = t; $("shSet").dataset.cur = t;
  $("setTabs").querySelectorAll("button").forEach(b => { const on = b.dataset.t === t; b.classList.toggle("on", on); b.setAttribute("aria-selected", String(on)); });
}
$("setTabs").addEventListener("click", e => { const b = e.target.closest("button[data-t]"); if (b) showSetTab(b.dataset.t); });
showSetTab("me");
$("setBtn").addEventListener("click", () => {
  S.seen = undefined; if (isCreatorHere()) loadSeen();
  charDraft = null; renderCharMaker(); setCharOpen(false);
 gPicker.set(S.group); restDraft = [...(S.group.restDays || [])]; renderRestPick(); updateRuleSave(); wkDraft = null; wkSel = parseDay(S.day).getUTCDay(); delete $("rName").dataset.dirty; delete $("gNameInput").dataset.dirty; openSheet("shSet"); });
$("shareBtn").addEventListener("click", () => copy(linkFor(S.gid), "招待リンクをコピーしました。LINEやDiscordに貼ってね"));
$("anonBtn").addEventListener("click", () => {
  S.anon = !S.anon;
  $("anonBtn").classList.toggle("on", S.anon); $("anonBtn").setAttribute("aria-pressed", String(S.anon));
  render();
  toast(S.anon ? "匿名表示にしました。もう一度押すと戻ります" : "名前の表示に戻しました");
});
$("calBtn").addEventListener("click", () => { S.calMonth = S.sel.slice(0, 7); delete S.monthCache[S.month]; openSheet("shCal"); });

const cPicker = rulePicker($("cRule"), () => 0, () => { $("cRuleNow").textContent = "開催のルール:" + ruleText(cPicker.get(), 0); });
const gPicker = rulePicker($("gRule"), () => Object.keys(S.members).length, () => { updateRuleSave(); renderFrameMembers(); }, true);

$("openCreate").addEventListener("click", () => { setHomeOpen(homeOpen === "create" ? null : "create"); if (homeOpen) $("cName").focus(); });
$("openPaste").addEventListener("click", () => { setHomeOpen(homeOpen === "paste" ? null : "paste"); if (homeOpen) $("pasteInput").focus(); });
$("cRuleToggle").addEventListener("click", () => {
  const open = $("cRuleBox").hidden;
  $("cRuleBox").hidden = !open; $("cRuleToggle").setAttribute("aria-expanded", String(open));
  $("cRuleToggle").lastElementChild.textContent = open ? "閉じる" : "変える ›";
});
$("pasteForm").addEventListener("submit", e => {
  e.preventDefault();
  const m = $("pasteInput").value.match(/#(g[a-z0-9]{6,20})/);
  if (!m) return toast("招待リンクが読み取れませんでした。リンクをまるごと貼り付けてください", true);
  $("pasteInput").value = "";
  go(m[1]);
});
$("createForm").addEventListener("submit", async e => {
  e.preventDefault();
  const name = $("cName").value.trim(), me = $("cMe").value.trim(), pin = $("cPin").value.trim();
  if (!name || !me) return;
  if (!/^[0-9]{4}$/.test(pin)) return toast("合言葉は数字4桁で入れてください", true);
  if (S.owned.length >= MAX_OWNED) return toast(`作れるグループは${MAX_OWNED}つまでです。使わなくなったグループを削除すると、また作れます`, true);
  const gid = newId("g");
  $("cSubmit").disabled = true;
  try {
    // group, me and my passcode in one go, so they never end up half-saved
    const now = Date.now(), hash = await pinHash(gid, S.uid, pin);
    await withRetry(() => S.db.setMany([
      ["groups/" + gid, { name, ...cPicker.get(), createdBy:S.uid, createdAt:now }],
      [`groups/${gid}/members/${S.uid}`, { name:me, joinedAt:now, hasPin:true }],
      [`groups/${gid}/pins/${S.uid}`, { hash }],
      [`users/${S.uid}`, { groups:[{ id:gid, name }, ...S.myGroups].slice(0, 30), owned:[...S.owned, gid] }],
    ]));
    S.owned = [...S.owned, gid];
    ls.set("name", me); $("cName").value = ""; $("cPin").value = "";
    go(gid);
    toast("できました!右上の 🔗 で招待リンクをコピーして、友達に送ってね");
  } catch (err){ onWriteError(err); }
  finally { $("cSubmit").disabled = S.canWrite === false; }
});

function memberBody(m){
  const b = { name:m.name, joinedAt:m.joinedAt };
  if (m.color != null) b.color = m.color;
  if (m.hasPin) b.hasPin = true;
  if (m.shape && m.shape !== "circle") b.shape = m.shape;
  if (m.weekly && Object.keys(m.weekly).length) b.weekly = m.weekly;
  if (m.char) b.char = m.char;
  return b;
}
async function saveMember(patch){
  const mid = S.me || S.uid, prev = S.members[mid];
  const next = { ...(prev || { joinedAt:Date.now(), color:null, hasPin:false }), ...patch };
  await withRetry(() => S.db.doc(`groups/${S.gid}/members/${mid}`).set(memberBody(next)));
  S.members = { ...S.members, [mid]: next };
}
async function saveName(name){
  await saveMember({ name });
  ls.set("name", name);
}
$("weeklySave").addEventListener("click", async () => {
  if (!wkDraft) return;
  const w = cleanWeekly(wkDraft);
  $("weeklySave").disabled = true;
  try { await saveMember({ weekly:w }); wkDraft = JSON.parse(JSON.stringify(w)); render(); toast("いつもの返事を保存しました"); }
  catch (err){ onWriteError(err); renderWeeklyPick(); }
});
async function saveShape(k){
  const mid = S.me || S.uid, prev = S.members[mid]; if (!prev || (prev.shape || "circle") === k) return;
  S.members = { ...S.members, [mid]: { ...prev, shape:k } }; render();
  try { await saveMember({ shape:k }); toast("保存しました"); }
  catch (err){ onWriteError(err); }
}
async function saveColor(i){
  const mid = S.me || S.uid, prev = S.members[mid]; if (!prev) return;
  S.members = { ...S.members, [mid]: { ...prev, color:i } }; render();
  try { await saveMember({ color:i }); toast("保存しました"); }
  catch (err){ onWriteError(err); }
}
async function pinHash(gid, mid, pin){
  const data = new TextEncoder().encode(`${gid}:${mid}:${pin}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, "0")).join("");
}
async function setPin(pin){
  const mid = S.me || S.uid;
  if (pin == null){
    await withRetry(() => S.db.doc(`groups/${S.gid}/pins/${mid}`).delete());
    await saveMember({ hasPin:false });
  } else {
    const hash = await pinHash(S.gid, mid, pin);
    await withRetry(() => S.db.doc(`groups/${S.gid}/pins/${mid}`).set({ hash }));
    await saveMember({ hasPin:true });
  }
}
$("creatorVerifyForm").addEventListener("submit", async e => {
  e.preventDefault();
  const pin = $("creatorPin").value.trim(), mid = S.linkMid;
  if (!/^[0-9]{4}$/.test(pin)) return toast("合言葉(数字4桁)を入れてください", true);
  if (!mid) return;
  const ref = S.db.doc(`groups/${S.gid}/links/${S.uid}`), at = Date.now();
  try {
    try { await withRetry(() => ref.set({ mid, at, pin, verified:true })); }
    catch (err){ if (err && err.code === "invalid_argument"){ toast("合言葉が違います", true); return; } throw err; }
    await withRetry(() => ref.set({ mid, at, verified:true }));
    S.linkVerified = true; $("creatorPin").value = "";
    render(); toast("確認できました。「管理」タブから操作できます");
  } catch (err){ onWriteError(err); }
});
$("pinForm").addEventListener("submit", async e => {
  e.preventDefault();
  const pin = $("pinInput").value.trim();
  if (!/^[0-9]{4}$/.test(pin)) return toast("合言葉は数字4桁で入れてください", true);
  try { await setPin(pin); $("pinInput").value = ""; render(); toast("保存しました。合言葉は忘れないようにしてください"); }
  catch (err){ onWriteError(err); }
});
$("pinClear").addEventListener("click", async () => {
  try { await setPin(null); render(); toast("合言葉を解除しました"); }
  catch (err){ onWriteError(err); }
});
$("claimBtn").addEventListener("click", async () => {
  const mid = claimSel; if (!mid || !S.members[mid]) return;
  const needPin = S.members[mid].hasPin, pin = $("claimPin").value.trim();
  if (needPin && !/^[0-9]{4}$/.test(pin)) return toast("合言葉(数字4桁)を入れてください", true);
  const b = $("claimBtn"); b.disabled = true;
  const ref = S.db.doc(`groups/${S.gid}/links/${S.uid}`), at = Date.now();
  try {
    try { await withRetry(() => ref.set(needPin ? { mid, at, pin, verified:true } : { mid, at })); }
    catch (err){
      if (needPin && err && err.code === "invalid_argument"){ toast("合言葉が違います", true); return; }
      throw err;
    }
    // don't leave the passcode sitting in the link
    if (needPin) await withRetry(() => ref.set({ mid, at, verified:true }));
    $("claimPin").value = "";
    S.linkMid = mid; claimSel = null;
    ls.set("name", S.members[mid].name);
    render();
    toast(`${S.members[mid].name}として入りました`);
  } catch (err){ onWriteError(err); }
  finally { b.disabled = false; }
});
$("joinForm").addEventListener("submit", async e => {
  e.preventDefault();
  const name = $("jName").value.trim(); if (!name) return;
  $("jSubmit").disabled = true;
  try { await saveName(name); $("jName").value = ""; render(); }
  catch (err){ onWriteError(err); }
  finally { $("jSubmit").disabled = S.canWrite === false; }
});
$("rName").addEventListener("input", () => { $("rName").dataset.dirty = "1"; });
$("renameForm").addEventListener("submit", async e => {
  e.preventDefault();
  const name = $("rName").value.trim(); if (!name) return;
  try { await saveName(name); delete $("rName").dataset.dirty; render(); toast("保存しました"); }
  catch (err){ onWriteError(err); }
});
$("gNameInput").addEventListener("input", () => { $("gNameInput").dataset.dirty = "1"; });
$("gNameForm").addEventListener("submit", async e => {
  e.preventDefault();
  const name = $("gNameInput").value.trim().slice(0, 24); if (!name) return;
  if (name === S.group.name){ delete $("gNameInput").dataset.dirty; return; }
  try {
    await withRetry(() => S.db.doc("groups/" + S.gid).update({ name }));
    S.group = { ...S.group, name }; delete $("gNameInput").dataset.dirty;
    render(); toast("保存しました");
  } catch (err){ onWriteError(err); }
});
// a burst of +/− taps becomes one write
// the save button lights up only when the picked rule differs from the saved one
// 枠のメンバー: shown while "枠で決める" is picked. Everyone sets their own; the creator can set anyone's.
function renderFrameMembers(){
  const box = $("frameMembers");
  box.hidden = gPicker.rule() !== "frame";
  if (box.hidden) return;
  const admin = isCreatorHere();
  const ids = Object.keys(S.members).sort((a, b) => (b === S.me) - (a === S.me) || S.members[a].joinedAt - S.members[b].joinedAt);
  $("frameList").replaceChildren(...ids.map(id => {
    const can = (id === S.me || admin) && S.canWrite !== false, cur = S.frames[id] || "";
    return h("li", { class:"frame-row" },
      h("span", { class:"who" }, frameRing(id, avatar(id, S.members[id].name)), h("span", { text:S.members[id].name + (id === S.me ? "(あなた)" : "") })),
      h("div", { class:"frame-pick", role:"radiogroup", "aria-label":`${S.members[id].name}の枠` },
        [["", "なし"], ...Object.entries(FRAMES).map(([k, f]) => [k, f.label])].map(([k, l]) =>
          h("button", { type:"button", role:"radio", "aria-checked":String(cur === k), disabled:!can,
            class:"fp" + (cur === k ? " on" : ""), style:k ? `--ring:${FRAMES[k].color}` : "", onclick:() => setFrame(id, k) }, l))));
  }));
  $("frameHint").textContent = admin ? "作った人は、全員の枠を変えられます。" : "自分の枠だけ変えられます。";
}
async function setFrame(id, k){
  const prev = S.frames[id] || "";
  if (prev === k) return;
  S.frames = { ...S.frames }; if (k) S.frames[id] = k; else delete S.frames[id];
  render();
  try {
    const ref = S.db.doc(`groups/${S.gid}/frames/${id}`);
    await withRetry(() => k ? ref.set({ c:k }) : ref.delete());
    toast(k ? `${S.members[id].name}を${FRAMES[k].label}にしました` : `${S.members[id].name}の枠を外しました`);
  } catch (err){ S.frames = { ...S.frames }; if (prev) S.frames[id] = prev; else delete S.frames[id]; render(); onWriteError(err); }
}
let restDraft = [];
function renderRestPick(){
  $("restPick").replaceChildren(...DOW.map((dn, i) => h("button", { type:"button", "aria-pressed":String(restDraft.includes(i)),
    class:"wk" + (restDraft.includes(i) ? " restd" : " none") + (i === 0 ? " sun" : i === 6 ? " sat" : ""),
    onclick:() => { restDraft = restDraft.includes(i) ? restDraft.filter(x => x !== i) : [...restDraft, i].sort(); renderRestPick(); updateRuleSave(); } },
    h("span", { class:"wk-d", text:dn }), h("span", { class:"wk-v", text: restDraft.includes(i) ? "休" : "ー" }))));
}
function ruleChanged(){
  const r = gPicker.get(), g = S.group;
  return !!g && !(r.rule === g.rule && r.quorum === g.quorum && r.minus === g.minus && r.ratio === g.ratio && r.minOpen === g.minOpen
    && JSON.stringify(r.fq) === JSON.stringify(g.fq) && r.ftotal === g.ftotal
    && restDraft.join() === (g.restDays || []).join());
}
function updateRuleSave(){ $("ruleSave").disabled = !ruleChanged(); }
$("ruleSave").addEventListener("click", async () => {
  if (!ruleChanged()) return;
  const r = { ...gPicker.get(), restDays:[...restDraft] };
  $("ruleSave").disabled = true;
  try {
    await withRetry(() => S.db.doc("groups/" + S.gid).update(r)); S.group = { ...S.group, ...r }; render();
    toast("保存しました:" + ruleText(r, Object.keys(S.members).length) + (r.restDays.length ? `・毎週${r.restDays.map(i => DOW[i]).join("")}はお休み` : ""));
  }
  catch (err){ onWriteError(err); updateRuleSave(); }
});
$("switchBtn").addEventListener("click", () => go(null));
// two taps, like deleting a group
let leaveArmed = null;
$("leaveBtn").addEventListener("click", async () => {
  const b = $("leaveBtn");
  if (!leaveArmed){
    b.classList.add("armed"); b.textContent = "本当に抜ける(返事も消えます)";
    leaveArmed = setTimeout(() => { leaveArmed = null; b.classList.remove("armed"); b.textContent = "このグループを抜ける"; }, 5000);
    return;
  }
  clearTimeout(leaveArmed); leaveArmed = null;
  b.disabled = true; b.textContent = "抜けています…";
  const gid = S.gid, mid = S.me, name = S.group.name;
  try {
    await leaveGroup(gid, mid);
    forgetGroup(gid);
    go(null);
    toast(`「${name}」を抜けました`);
  } catch (err){
    toast("抜ける途中で止まりました。通信を確認して、もう一度押してください", true);
    openGroup(gid);
  } finally {
    b.disabled = false; b.classList.remove("armed"); b.textContent = "このグループを抜ける";
  }
});
async function leaveGroup(gid, mid){
  if (!mid || (S.group && S.group.createdBy === mid)) throw new Error("creator");
  const ans = await withRetry(() => S.db.collection(`groups/${gid}/answers`).where("uid", "==", mid).get());
  const answers = ans.docs.map(d => `groups/${gid}/answers/${d.id}`);
  stopSubs();
  // my link proves who I am on a re-entered browser, so it goes last, together with my record
  await S.db.deleteMany(answers);
  await S.db.deleteMany([`groups/${gid}/seen/${mid}`, `groups/${gid}/frames/${mid}`, `groups/${gid}/pins/${mid}`, `groups/${gid}/members/${mid}`, `groups/${gid}/links/${S.uid}`]);
}
// two taps: the first arms the button, the second (within 5 s) deletes
let delArmed = null;
$("delBtn").addEventListener("click", async () => {
  const b = $("delBtn");
  if (!delArmed){
    b.classList.add("armed"); b.textContent = "本当に削除する(元に戻せません)";
    delArmed = setTimeout(() => { delArmed = null; b.classList.remove("armed"); b.textContent = "このグループを削除する"; }, 5000);
    return;
  }
  clearTimeout(delArmed); delArmed = null;
  b.disabled = true; b.textContent = "削除しています…";
  const gid = S.gid, name = S.group.name;
  try {
    await deleteGroup(gid);
    S.owned = S.owned.filter(x => x !== gid);
    forgetGroup(gid);
    b.disabled = false; b.classList.remove("armed"); b.textContent = "このグループを削除する";
    go(null);
    toast(`「${name}」を削除しました`);
  } catch (err){
    b.disabled = false; b.classList.remove("armed"); b.textContent = "このグループを削除する";
    toast("削除が途中で止まりました。通信を確認して、もう一度「このグループを削除する」を押してください", true);
    openGroup(gid);
  }
});
let rmArmed = null, rmTimer = null;
// creator powers: the creating browser, or a passcode-verified link to the creator who still has a passcode
function isCreatorHere(){
  const c = S.group && S.group.createdBy;
  if (!c) return false;
  if (c === S.uid) return true;
  return S.linkMid === c && S.linkVerified && !!(S.members[c] && S.members[c].hasPin);
}
function seenText(id){
  if (id === S.me) return "いま開いています";
  if (S.seen === undefined) return "読み込み中…";
  if (S.seen === null) return "";
  const t = S.seen[id];
  return t ? `最後に開いた:${agoText(t)}` : "最後に開いた:記録なし";
}
function renderMemManage(){
  const ids = Object.keys(S.members).sort((a, b) => S.members[a].joinedAt - S.members[b].joinedAt);
  $("memManage").replaceChildren(...ids.map(id => h("li", null,
    h("span", { class:"who" }, avatar(id, S.members[id].name),
      h("span", { class:"who-t" }, h("span", { text: S.members[id].name + (id === S.me ? "(あなた)" : "") }), h("small", { class:"seen", text:seenText(id) }))),
    id === S.me ? null : h("button", { type:"button", class:"rm" + (rmArmed === id ? " armed" : ""), onclick:() => removeMember(id) }, rmArmed === id ? "本当に外す" : "外す"))));
}
async function removeMember(mid){
  if (rmArmed !== mid){
    rmArmed = mid; clearTimeout(rmTimer);
    rmTimer = setTimeout(() => { rmArmed = null; if (isOpen("shSet")) renderMemManage(); }, 5000);
    renderMemManage(); return;
  }
  clearTimeout(rmTimer); rmArmed = null;
  const gid = S.gid, name = S.members[mid] ? S.members[mid].name : "";
  try {
    const paths = [];
    const ans = await withRetry(() => S.db.collection(`groups/${gid}/answers`).where("uid", "==", mid).get());
    ans.docs.forEach(d => paths.push(`groups/${gid}/answers/${d.id}`));
    const links = await withRetry(() => S.db.collection(`groups/${gid}/links`).where("mid", "==", mid).get());
    links.docs.forEach(d => paths.push(`groups/${gid}/links/${d.id}`));
    paths.push(`groups/${gid}/seen/${mid}`, `groups/${gid}/frames/${mid}`, `groups/${gid}/pins/${mid}`, `groups/${gid}/members/${mid}`);
    await S.db.deleteMany(paths);
    toast(`${name}をグループから外しました`);
  } catch (err){ onWriteError(err); }
  if (isOpen("shSet")) renderMemManage();
}
async function deleteGroup(gid){
  stopSubs();
  const paths = [];
  for (const sub of ["answers", "overrides", "plans", "seen", "moves", "frames", "links", "members"]){
    const snap = await withRetry(() => S.db.collection(`groups/${gid}/${sub}`).get());
    snap.docs.forEach(d => paths.push(`groups/${gid}/${sub}/${d.id}`));
    // passcodes can't be listed; remove one per member (members come last, so this runs before them)
    if (sub === "links") Object.keys(S.members).forEach(mid => paths.push(`groups/${gid}/pins/${mid}`));
  }
  // my link and the creator's passcode prove I'm the creator on another device; the rules check them
  // before each write, so they go in the final batch together with the group itself
  const creator = S.group && S.group.createdBy;
  const keep = [`groups/${gid}/links/${S.uid}`, creator ? `groups/${gid}/pins/${creator}` : null].filter(Boolean);
  const rest = paths.filter(x => !keep.includes(x));
  await S.db.deleteMany(rest);
  await S.db.deleteMany([...keep, "groups/" + gid]);
}
$("planToggle").addEventListener("change", async e => {
  const on = e.target.checked;
  S.group = { ...S.group, showPlan:on }; render();
  try { await withRetry(() => S.db.doc("groups/" + S.gid).update({ showPlan:on })); toast(on ? "保存しました:「今日やること」を表示します" : "保存しました:「今日やること」を表示しません"); }
  catch (err){ onWriteError(err); }
});

$("answers").addEventListener("click", e => {
  const b = e.target.closest(".ans"); if (!b) return;
  if (S.canWrite === false) return;
  const s = b.dataset.s, me = mineOn(S.sel), raw = rawMine(S.sel);
  const usual = S.me ? (weeklyOf(S.me, S.sel) || {}).status || null : null;
  // tapping what's already selected clears it; on a weekly-default day, "cleared" has to be remembered
  const selected = me ? me.status : (!raw && usual) || null;
  const usualName = usual ? `毎週の「${STATUSES[usual].label}」` : "";
  if (selected === s){
    if (me && usual) clearMine(`${usualName}に戻しました`);            // my own answer -> back to the weekly one
    else if (usual){ saveMine({ status:"none" }); toast(`この日は返事なしにしました(${usualName}はこの日だけお休み)`); }
    else clearMine();
    return;
  }
  // "no answer" day, tapping the weekly answer: just go back to the weekly default
  if (raw && raw.status === "none" && usual === s){ clearMine(`${usualName}に戻しました`); return; }
  burst(b, e);
  saveMine({ status:s });
  mascotReact(s);
});
function tapHour(hr){
  const me = mineOn(S.sel); if (!me) return;
  let f = me.from, u = me.until;
  if (f == null && u == null){ if (hr === 27) u = hr; else f = hr; }
  else if (f != null && u == null){ if (hr > f) u = hr; else if (hr === f) f = null; else f = hr; }
  else { f = hr === 27 ? null : hr; u = hr === 27 ? hr : null; }
  saveMine({ from:f, until:u });
}
let commentOpened = false;
// keep the text box in sight inside the option sheet (phones jump to the top when the keyboard opens or the sheet redraws)
function keepInView(el){
  const go = () => { if (!el.isConnected || el.closest("[hidden]")) return; el.scrollIntoView({ block:"center", behavior:"smooth" }); };
  requestAnimationFrame(go); setTimeout(go, 350);   // again once the keyboard is up
}
["commentInput", "gameInput"].forEach(id => $(id).addEventListener("focus", e => keepInView(e.target.closest("form"))));
if (window.visualViewport) visualViewport.addEventListener("resize", () => {
  const a = document.activeElement;
  if (a && (a.id === "commentInput" || a.id === "gameInput")) keepInView(a.closest("form"));
});
$("commentOpen").addEventListener("click", () => { commentOpened = true; renderSheets(); $("commentInput").focus({ preventScroll:true }); keepInView($("commentForm")); });
$("timeClear").addEventListener("click", () => saveMine({ from:null, until:null }));
$("dtStatus").addEventListener("click", e => {
  const b = e.target.closest("button[data-s]"); if (!b) return;
  const me = mineOn(S.sel); if (me && me.status !== b.dataset.s) saveMine({ status:b.dataset.s });
});
$("gameForm").addEventListener("submit", e => {
  e.preventDefault(); const g = $("gameInput").value.trim(); if (!g) return;
  $("gameInput").value = ""; saveMine({ game:g }); keepInView($("gameForm"));
});
$("commentForm").addEventListener("submit", e => {
  e.preventDefault(); saveMine({ comment: $("commentInput").value.trim() }); $("commentInput").blur(); keepInView($("commentForm")); toast("ひとことを送りました");
});
$("clearBtn").addEventListener("click", () => clearMine());
function clearMine(msg){
  const k = myKey(S.sel); if (!S.answers[k]) return;
  const a = { ...S.answers }; delete a[k]; S.answers = a;
  $("commentInput").value = "";
  document.querySelectorAll(".sheet").forEach(s => s.hidden = true); document.body.classList.remove("sheet-open");
  render();
  writeDoc(S.db.doc(`groups/${S.gid}/answers/${k}`), null);
  toast(typeof msg === "string" ? msg : "返事を取り消しました");
}


let ovN = 2;
const ovMax = () => Math.max(1, Object.keys(S.members).length || 20);
const setOv = v => { ovN = Math.max(1, Math.min(ovMax(), v)); $("ovN").textContent = ovN; $("ovMinus").disabled = ovN <= 1; $("ovPlus").disabled = ovN >= ovMax(); };
function openRuleSheet(){ setOv((S.overrides[S.sel] || {}).need || Math.max(1, usualRule().need - 1)); openSheet("shOverride"); }
$("scoreCard").addEventListener("click", openRuleSheet);
$("scoreCard").addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " "){ e.preventDefault(); openRuleSheet(); } });
$("ovMinus").addEventListener("click", () => setOv(ovN - 1));
$("ovPlus").addEventListener("click", () => setOv(ovN + 1));
$("ovSave").addEventListener("click", async () => {
  const day = S.sel;
  S.overrides = { ...S.overrides, [day]: { need:ovN } }; closeSheets(); render();
  await writeDoc(S.db.doc(`groups/${S.gid}/overrides/${day}`), { need:ovN, day, by:S.me, at:Date.now() });
  toast(`${relLabel(day)}は${ovN}人でやることにしました`);
});
// rest day on / off. Nobody's id is stored with it.
$("ovRest").addEventListener("click", async () => {
  const day = S.sel, r = needFor(day), weekly = weeklyRestOn(day), ref = S.db.doc(`groups/${S.gid}/overrides/${day}`);
  const o = { ...S.overrides };
  if (r.rest && !weekly){ delete o[day]; S.overrides = o; closeSheets(); render(); await writeDoc(ref, null); toast(`${relLabel(day)}のお休みをやめました`); return; }
  const rest = !r.rest;   // weekly rest day -> play (rest:false); normal day -> rest
  o[day] = { rest }; S.overrides = o; closeSheets(); render();
  await writeDoc(ref, { rest, day, at:Date.now() });
  toast(rest ? `${relLabel(day)}はお休みにしました` : `${relLabel(day)}はやることにしました`);
});
$("ovReset").addEventListener("click", async () => {
  const day = S.sel, o = { ...S.overrides }; delete o[day]; S.overrides = o; closeSheets(); render();
  await writeDoc(S.db.doc(`groups/${S.gid}/overrides/${day}`), null);
  toast("いつものルールにもどしました");
});

$("calPrev").addEventListener("click", () => { S.calMonth = shiftMonth(S.calMonth, -1); renderCal(); });
$("calNext").addEventListener("click", () => { S.calMonth = shiftMonth(S.calMonth, 1); renderCal(); });
