// ますせん: 画面の描画
// index.html から順番に読み込みます(前のファイルで決めた名前を使います)。

// ---------- render ----------
function show(id){ ["sLoading","sError","sHome","sJoin","sMain"].forEach(s => $(s).hidden = s !== id); document.body.classList.toggle("fit", id === "sMain"); }
function fail(msg){ S.fatal = msg; closeSheets(true); render(); }

// "3/16" counters; counted in characters as people see them
const COUNTED = ["cName", "cMe", "jName", "rName", "gNameInput"];
function updateCounters(){
  COUNTED.forEach(id => {
    const el = $(id), c = $(id + "Count"); if (!el || !c) return;
    const n = [...el.value].length, max = Number(el.getAttribute("maxlength"));
    c.textContent = `${n}/${max}`; c.classList.toggle("full", n >= max);
  });
}
COUNTED.forEach(id => {
  const el = $(id); if (!el) return;
  const c = h("span", { class:"count", id:id + "Count", "aria-live":"polite" });
  const wrap = h("span", { class:"in-wrap" });
  el.before(wrap); wrap.append(el, c);
  el.addEventListener("input", updateCounters);
});
function render(){
  queueMicrotask(updateCounters);
  const inGroup = s => { ["grpBtn","setBtn","shareBtn","calBtn"].forEach(id => $(id).hidden = !s); };
  $("setBtn").classList.toggle("attn", !!(S.group && S.me && S.group.createdBy === S.me && S.members[S.me] && !S.members[S.me].hasPin));
  if (S.fatal){ $("errMsg").textContent = S.fatal; $("errHome").hidden = !S.db; inGroup(false); return show("sError"); }
  if (!S.db) return show("sLoading");
  if (!S.gid){ inGroup(false); renderHome(); return show("sHome"); }
  if (!S.groupLoaded) return show("sLoading");
  if (!S.group){
    $("errMsg").textContent = "このグループは見つかりませんでした。削除されたか、リンクが間違っている可能性があります。";
    if (ls.get("last", null) === S.gid) ls.set("last", null);
    forgetGroup(S.gid);
    $("errHome").hidden = false; inGroup(false); return show("sError");
  }
  $("grpName").textContent = S.anon ? "グループ" : S.group.name;
  if (!S.membersLoaded || !S.linkLoaded) return show("sLoading");
  S.me = S.members[S.uid] ? S.uid : (S.linkMid && S.members[S.linkMid] ? S.linkMid : null);
  if (!S.me){ if (ansUnsub) stopDaySubs(); inGroup(false); renderJoin(); return show("sJoin"); }
  if (!ansUnsub && S.deniedFor !== S.me) subscribeAnswers();
  inGroup(true);
  rememberGroup(S.gid, S.group.name);
  markSeen();
  renderMain(); renderSheets();
  show("sMain");
}

let homeOpen;          // undefined until the first render decides; then null | "create" | "paste"
function setHomeOpen(which){
  homeOpen = which;
  $("createForm").hidden = which !== "create";
  $("pasteForm").hidden = which !== "paste";
  [["openCreate","create"],["openPaste","paste"]].forEach(([id, w]) => {
    $(id).classList.toggle("on", which === w); $(id).setAttribute("aria-expanded", String(which === w));
  });
}
function renderHome(){
  const first = !S.myGroups.length;
  $("homeSteps").hidden = !first;
  if (homeOpen === undefined) setHomeOpen(first ? "create" : null);
  $("cRuleNow").textContent = "開催のルール:" + ruleText(cPicker.get(), 0);
  $("myGroups").replaceChildren(...S.myGroups.map(g => h("li", null,
    h("button", { onclick: () => go(g.id) }, h("span", {text:g.name || "グループ"}), h("span", {class:"muted", text:"開く ›"})))));
  $("myGroupsCard").hidden = !S.myGroups.length;
  if (!$("cMe").value) $("cMe").value = ls.get("name", "");
  $("cSubmit").disabled = S.canWrite === false;
}
let claimSel = null;
function renderJoin(){
  $("joinGroupName").textContent = S.group.name;
  const cid = S.group.createdBy, creator = cid && S.members[cid];
  $("joinBy").hidden = !creator;
  if (creator) $("joinBy").replaceChildren(h("span", { class:"lbl", text:"作った人" }), avatar(cid, creator.name), h("span", { text:creator.name }));
  const n = Object.keys(S.members).length;
  const ids = Object.keys(S.members).sort((a, b) => S.members[a].joinedAt - S.members[b].joinedAt);
  if (claimSel && !S.members[claimSel]) claimSel = null;
  $("claimCard").hidden = !n;
  $("claimChips").replaceChildren(...ids.map(id => h("button", { type:"button", class:"chip with-av" + (claimSel === id ? " on" : ""), "aria-pressed":String(claimSel === id),
    onclick:() => { claimSel = claimSel === id ? null : id; $("claimPin").value = ""; renderJoin(); } }, avatar(id, S.members[id].name), S.members[id].name, S.members[id].hasPin ? " 🔒" : "")));
  $("claimPinRow").hidden = !(claimSel && S.members[claimSel].hasPin);
  $("claimBtn").hidden = !claimSel;
  if (claimSel) $("claimBtn").textContent = `${S.members[claimSel].name}として入る`;
  $("jLabel").textContent = n ? "はじめての人は名前を入れて参加" : "あなたの名前(みんなに表示されます)";
  $("joinCount").textContent = (n ? `${n}人が参加中・` : "") + ruleText(S.group, n);
  if (document.activeElement !== $("jName") && !$("jName").value) $("jName").value = ls.get("name", "");
  $("jSubmit").disabled = S.canWrite === false;
}

function renderMain(){
  const day = S.sel, today = answersFor(day), me = mineOn(day), ro = S.canWrite === false;
  const ids = Object.keys(S.members), rule = needFor(day);
  $("roNotice").hidden = !ro;

  // scoreboard
  const masuN = ids.filter(id => isMasu(today[id])).length;
  const tabunN = ids.filter(id => isTabun(today[id])).length;
  {
    const t = parseDay(day), w = t.getUTCDay();
    $("dayLabel").replaceChildren((day === S.day ? "今日 " : day === addDays(S.day, 1) ? "明日 " : "") + `${t.getUTCMonth() + 1}/${t.getUTCDate()}`,
      h("span", { class:"dow-pill", style:`--c:var(--wd${isHoliday(day) ? 0 : w})`, text:DOW[w] }),
      ...(day === S.day && lateNight() ? [h("span", { class:"late", text:"(🔄朝4時)" })] : []));
  }
  $("masuN").textContent = masuN; $("needN").textContent = rule.rest ? "" : rule.need;
  $("slashN").hidden = !!rule.open; $("needN").hidden = !!rule.open;
  $("unitN").textContent = rule.open ? "人がます" : "ます";
  const rest = rule.need - masuN;
  const fest = !rule.rest && masuN >= rule.need && masuN > 0;
  const dayWord = day === S.day ? "今日" : day === addDays(S.day, 1) ? "明日" : "この日";
  // everyone has answered and even the maybes can't make it: the day is off
  const skip = !fest && !rule.rest && ids.length > 0 && ids.every(id => today[id]) && masuN + tabunN < rule.need;
  let status;
  if (rule.rest) status = `💤 ${dayWord}はお休み`;
  else if (fest) status = rule.open ? `🎉 ${dayWord}は${masuN}人でやります!` : `🎉 ${dayWord}は開催です!`;
  else if (skip) status = `⏭ ${dayWord}は開催スキップです!`;
  else if (rule.override) status = `${dayWord}だけ${rule.need}人でOK・あと${rest}人`;
  else if (rule.open) status = `${rule.need}人いればやる・あと${rest}人`;
  else status = `あと${rest}人で開催`;
  $("scoreSub").textContent = status + (tabunN && !skip && !rule.rest ? `・たぶん${tabunN}人` : "");
  const card = $("scoreCard"), wasHeld = card.classList.contains("held"), wasSkip = card.classList.contains("skip");
  card.classList.toggle("held", fest);
  card.classList.toggle("soft", fest && !!rule.open);
  card.classList.toggle("skip", skip);
  card.classList.toggle("rest", !!rule.rest);
  renderMascotRow();
  setMascotMood(lateNight() ? "sleep" : fest ? "happy" : skip ? "sad" : "");
  if ((fest && !wasHeld) || (skip && !wasSkip)){ card.classList.remove("pop"); void card.offsetWidth; card.classList.add("pop"); }
  if (S.ansReady){
    if (S.festState[day] === false && fest) confetti($("scoreCard"));
    S.festState[day] = fest;
  }

  // week strip
  $("week").replaceChildren(...weekDays().map((d, i) => {
    const n = masuCount(d), r = needFor(d), held = n >= r.need && n > 0, my = mineOn(d);
    const ad = answersFor(d), mids = Object.keys(S.members);
    const tb = mids.filter(id => ad[id] && ad[id].status === "tabun").length;
    const skipped = !held && !r.rest && mids.length > 0 && mids.every(id => ad[id]) && n + tb < r.need;
    const t = parseDay(d);
    const wdN = t.getUTCDay();
    return h("button", { class: "wd" + (d === day ? " sel" : "") + (held ? " held" : skipped ? " skipd" : r.rest ? " restd" : "") + (i === 0 ? " today" : i === 1 ? " tmrw" : "") + (wdN === 0 || isHoliday(d) ? " sun" : wdN === 6 ? " sat" : ""), role:"tab", "aria-selected":String(d === day),
        "aria-label": `${dayLabel(d)} ます${n}人` + (held ? " 開催" : skipped ? " 見送り" : r.rest ? " お休み" : "") + (my ? ` 自分は${STATUSES[my.status].label}` : " 自分は未回答"),
        onclick: () => { S.sel = d; planEditing = false; render(); } },
      S.overrides[d] ? h("span", { class:"ov" }) : null,
      h("span", { class:"w", text: i === 0 ? "今日" : i === 1 ? "明日" : DOW[t.getUTCDay()] }),
      h("span", { class:"dn", text: t.getUTCDate() }),
      h("span", { class:"c", text: held ? "★開催" : skipped ? "見送り" : r.rest ? "休み" : n ? `◎${n}` : "" }));
  }));

  // buttons
  const box = $("answers");
  box.classList.toggle("ro", ro);
  const myUsual = !rawMine(day) && S.me ? (weeklyOf(S.me, day) || {}).status || null : null;
  box.querySelectorAll(".ans").forEach(b => b.classList.toggle("sel", (!!me && me.status === b.dataset.s) || myUsual === b.dataset.s));
  const line = $("mineLine"); line.replaceChildren();
  // always there; it lights up (solid border) once there is an answer to add tags to
  const usualAns = !me && myUsual && S.canWrite !== false ? weeklyOf(S.me, day) : null;
  const canOpt = !!me || !!usualAns;
  line.append(h("button", { type:"button", class:"opt-btn" + (canOpt ? " on" : ""), disabled:!canOpt,
    title: canOpt ? "" : "先に返事を選んでください",
    onclick:() => { if (usualAns) saveMine({ status:usualAns.status, conds:[...usualAns.conds] }, day); openSheet("shDetail"); } },
    me && detailText(me) ? "返事のタグを変える" : "+ 返事にタグを追加"));
  const wkSt = S.me ? (weeklyOf(S.me, day) || {}).status || null : null;
  const wkName = wkSt ? `毎週の「${STATUSES[wkSt].label}」` : "";
  const myRaw = rawMine(day);
  $("ansHint").textContent = me && wkSt ? `${dayLabel(day)}の返事 ・ もう一度押すと${wkName}に戻ります`
    : me ? `${dayLabel(day)}の返事 ・ もう一度押すと取り消し`
    : myUsual ? `${dayLabel(day)}は${wkName} ・ もう一度押すとこの日だけ返事なし`
    : myRaw && wkSt ? `${dayLabel(day)}は返事なし ・ ${wkName}に戻すときはそのボタンを`
    : `${dayLabel(day)}の返事をボタンで選んでね`;

  // members
  const order = { masu:0, tabun:1, none:2, sen:3 };
  const stOf = a => a ? a.status : "none";
  const sorted = ids.sort((a, b) => {
    const sa = stOf(today[a]), sb = stOf(today[b]);
    return order[sa] - order[sb] || S.members[a].joinedAt - S.members[b].joinedAt;
  });
  $("memTitle").textContent = `${relLabel(day)}の返事`;
  $("memberList").replaceChildren(...sorted.map((id, i) => {
    const a = today[id], st = stOf(a), m = S.members[id];
    const meta = metaNodes(a, false, S.anon);
    const shown = S.anon ? `メンバー${i + 1}` : m.name;
    return h("li", { class: "mem " + st },
      h("div", { class:"nm" }, avatar(id, S.anon ? String(i + 1) : m.name), h("span", { class:"nm-t", text:shown }), id === S.me ? h("em", { text:"あなた" }) : null, a && a.usual ? h("span", { class:"usual", title:"毎週この曜日のいつもの返事", text:"🔁 毎週" }) : null),
      h("span", { class:"ago", text: a && !a.usual ? agoText(a.updatedAt) : "" }),
      a ? h("span", { class:"st " + st + (a.usual ? " usual-st" : ""), text:`${STATUSES[st].ic} ${STATUSES[st].label}` }) : h("span"),
      meta.length ? h("div", { class:"meta" }, meta) : null);
  }));
  $("answeredN").textContent = `${sorted.filter(id => today[id]).length} / ${sorted.length}人が返事`;
  renderPlan();
}

let planEditing = false;
function renderPlan(){
  $("planCard").hidden = !S.group.showPlan;
  if (!S.group.showPlan) return;
  const day = S.sel, plan = S.plans[day], ro = S.canWrite === false;
  $("planLabel").textContent = `${relLabel(day)}やること`;
  $("planBy").textContent = !S.anon && plan && plan.by && S.members[plan.by] ? `${S.members[plan.by].name}が決めた` : "";
  const v = $("planView");
  v.classList.toggle("empty", !plan);
  v.replaceChildren(plan ? plan.text : (ro ? "まだ決まってない" : "まだ決まってない ・ タップして書く"));
  if (plan && !ro) v.append(h("span", { class:"pen", text:"✎ 変える" }));
  v.disabled = ro;
  $("planEdit").hidden = !planEditing; v.hidden = planEditing;
  if (planEditing){
    const recent = {};
    Object.values(S.answers).forEach(a => { if (a.game) recent[a.game] = (recent[a.game] || 0) + 1; });
    Object.values(S.plans).forEach(p => { recent[p.text] = (recent[p.text] || 0) + 1; });
    const opts = ["いつも通り", ...Object.keys(recent).sort((a, b) => recent[b] - recent[a]).filter(t => t !== "いつも通り")].slice(0, 8);
    $("planChips").replaceChildren(...opts.map(t => h("button", { type:"button", class:"chip sm" + (plan && plan.text === t ? " on" : ""), onclick:() => savePlan(t) }, t)));
  }
}
function savePlan(text){
  if (S.canWrite === false) return toast("このページは閲覧のみです", true);
  const day = S.sel, t = (text || "").trim().slice(0, 30);
  const p = { ...S.plans };
  if (t) p[day] = { text:t, by:S.me }; else delete p[day];
  S.plans = p; planEditing = false; renderPlan();
  writeDoc(S.db.doc(`groups/${S.gid}/plans/${day}`), t ? { text:t, day, by:S.me, at:Date.now() } : null);
  toast(t ? `${relLabel(day)}やること:${t}` : "未定にもどしました");
}
$("planView").addEventListener("click", () => {
  if (S.canWrite === false) return;
  planEditing = true; renderPlan();
  $("planInput").value = (S.plans[S.sel] && S.plans[S.sel].text) || "";
  $("planInput").focus();
});
$("planForm").addEventListener("submit", e => { e.preventDefault(); savePlan($("planInput").value); });
$("planClear").addEventListener("click", () => savePlan(""));
$("planCancel").addEventListener("click", () => { planEditing = false; renderPlan(); });

function renderSheets(){
  if (!S.group || !S.membersLoaded) return;
  const day = S.sel, me = mineOn(day);
  if (isOpen("shDetail")){
    if (!me) return closeSheets();
    const going = me.status !== "sen";
    $("dtTitle").textContent = `${dayLabel(day, true)} ${STATUSES[me.status].label}`;
    $("timeRow").hidden = !going; $("gameRow").hidden = !going; $("dtStatus").hidden = !going; $("cutRow").hidden = !going;
    if (going){
      $("cutChips").replaceChildren(
        h("button", { type:"button", class:"chip" + (me.cutoff == null ? " on" : ""), onclick:() => saveMine({ cutoff:null }) }, "なし"),
        ...[20,21,22,23,24,25,26].map(hr => h("button", { type:"button", class:"chip" + (me.cutoff === hr ? " on" : ""), "aria-pressed":String(me.cutoff === hr),
          onclick:() => saveMine({ cutoff: me.cutoff === hr ? null : hr }) }, hourLabel(hr))));
    }
    $("condTitle").textContent = going ? "条件" : "理由タグ(なくてもOK)";
    const panel = $("dtPanel");
    panel.classList.toggle("st-tabun", me.status === "tabun"); panel.classList.toggle("st-sen", me.status === "sen");
    $("dtDay").textContent = dayLabel(day) + (day === S.day ? "・今日" : day === addDays(S.day, 1) ? "・明日" : "");
    $("dtTitle").textContent = going ? "オプション" : "せんのひとこと";
    const pv = $("dtPreview"); const det = detailText(me);
    pv.replaceChildren(h("span", { class:"pv-st", text:`${STATUSES[me.status].ic} ${STATUSES[me.status].label}` }),
      h("span", { class:"pv-d" + (det ? "" : " empty"), text: det || "みんなにはこう見えます。下で足せます" }));
    $("dtStatus").querySelectorAll("button").forEach(b => { const on = b.dataset.s === me.status; b.classList.toggle("on", on); b.setAttribute("aria-checked", String(on)); });
    if (going){
      const f = me.from, u = me.until;
      $("timeline").replaceChildren(...TL_HOURS.map(hr => {
        const cls = ["tl"];
        if (f != null && u != null && hr > f && hr < u) cls.push("in");
        if (hr === f) cls.push("start");
        if (hr === u) cls.push("end");
        return h("button", { type:"button", class:cls.join(" "), "aria-pressed":String(hr === f || hr === u), "aria-label":hourLabel(hr),
          onclick:() => tapHour(hr) }, h("b", { text:String(hr % 24) }), h("small", { text: hr === f ? "から" : hr === u ? "まで" : "時" }));
      }));
      const tt = timeText(me);
      $("timeVal").textContent = ""; $("timeClear").hidden = !tt;
      $("slotFromV").textContent = f != null ? hourLabel(f) : "—";
      $("slotUntilV").textContent = u != null ? hourLabel(u) : "—";
      $("slotFrom").classList.toggle("set", f != null); $("slotUntil").classList.toggle("set", u != null);
      $("slotFrom").classList.toggle("next", f == null && u == null);
      $("slotUntil").classList.toggle("next", f != null && u == null);
      $("timeTip").textContent = f == null && u == null ? "下の数字をタップして、はじまる時間を選んでね"
        : u == null ? "続けて終わりの時間もタップできます(なくてもOK)" : "数字をタップすると選び直せます";
    }
    const conds = me.conds || [];
    const condBtn = (c, color) => h("button", { type:"button", class:"cond" + (color ? " g" : "") + (conds.includes(c) ? " on" : ""), style: color ? `--g:${color}` : null,
      "aria-pressed":String(conds.includes(c)),
      onclick: () => saveMine({ conds: conds.includes(c) ? conds.filter(x => x !== c) : [...conds, c] }) }, h("span", { class:"ck", text:"✓" }), h("span", { text:c }));
    $("condChips").className = "cond3";
    $("condChips").replaceChildren(...(going ? COND_GROUPS : SEN_GROUPS).flatMap(g => g.tags.map(c => condBtn(c, g.color))));
    const recent = {};
    Object.values(S.answers).forEach(a => { if (a.game) recent[a.game] = (recent[a.game] || 0) + 1; });
    const games = Object.keys(recent).sort((a,b) => recent[b] - recent[a]).slice(0, 8);
    if (me.game && !games.includes(me.game)) games.unshift(me.game);
    $("gameChips").replaceChildren(...games.map(g => h("button", { class:"chip" + (me.game === g ? " on" : ""), onclick: () => saveMine({ game: me.game === g ? "" : g }) }, g)));
    if (document.activeElement !== $("commentInput")) $("commentInput").value = me.comment || "";
    const showC = !!me.comment || commentOpened;
    $("commentForm").hidden = !showC; $("commentOpen").hidden = showC;
    $("commentInput").placeholder = going ? "ご飯食べたら行く" : "また明日誘って!";
  }
  if (isOpen("shOverride")){
    const ov = S.overrides[day];
    $("ovTitle").textContent = `${dayLabel(day)}の開催ルール`;
    $("ovUsual").textContent = ruleText(S.group, Object.keys(S.members).length);
    const r = needFor(day), weekly = weeklyRestOn(day);
    $("ovToday").textContent = r.rest ? (r.weekly ? "お休み(毎週のお休み)" : "お休み")
      : ov && ov.need ? `この日だけ${ov.need}人いればやる`
      : weekly ? "毎週のお休みの日だけど、この日はやる" : "いつものルールどおり";
    $("ovRest").textContent = r.rest ? (r.weekly ? "▶ この日はやる" : "▶ お休みをやめる") : "💤 この日はお休みにする";
    $("ovRest").classList.toggle("primary", !!r.rest);
    $("ovRest").disabled = S.canWrite === false;
    $("ovReset").hidden = !ov;
    $("ovSave").disabled = S.canWrite === false;
  }
  if (isOpen("shCal")) renderCal();
  if (isOpen("shSet")){
    $("planToggle").checked = S.group.showPlan;
    const creator = isCreatorHere();
    $("dangerSec").hidden = !creator;
    const iCreated = !!S.group.createdBy && S.group.createdBy === S.me;
    $("leaveBtn").hidden = iCreated;
    $("leaveHint").textContent = iCreated
      ? "グループを作った人は抜けられません。使わなくなったら、「管理」タブからグループを削除してください。"
      : "あなたの名前と返事がこのグループから消えます。招待リンクから、また参加できます。";
    $("manageTab").hidden = !creator;
    if (!creator && setTab === "manage") showSetTab("me");
    const linkedCreator = !creator && !!S.group.createdBy && S.group.createdBy === S.me;
    $("creatorNote").hidden = !linkedCreator;
    if (linkedCreator){
      const hasPin = !!(S.members[S.me] && S.members[S.me].hasPin);
      $("creatorNoteText").textContent = hasPin
        ? "この端末でメンバーを外したりグループを削除したりするには、合言葉を入れてください。"
        : "メンバーを外す・グループを削除する操作は、グループを作った端末からだけできます。作った端末で合言葉を設定すると、別の端末でも合言葉で管理できるようになります。";
      $("creatorVerifyForm").hidden = !hasPin;
    }
    if (creator) renderMemManage();
  }
  if (isOpen("shSet")) renderColorPick();
  if (isOpen("shSet") && S.members[S.me]){
    const me = S.members[S.me];
    $("profileHead").replaceChildren(
      avatar(S.me, me.name),
      h("div", { class:"pf-text" },
        h("div", { class:"pf-name", text:me.name }),
        h("div", { class:"pf-sub" },
          h("span", { text:`「${S.group.name}」でのあなた` }),
          h("span", { class:"lock", text: me.hasPin ? "🔒 合言葉あり" : "合言葉なし" }))));
  }
  if (isOpen("shSet") && document.activeElement !== $("gNameInput") && !$("gNameInput").dataset.dirty) $("gNameInput").value = S.group.name;
  if (isOpen("shSet")){
    const me = S.members[S.me];
    const iAmCreator = S.group.createdBy && S.group.createdBy === S.me;
    $("pinClear").hidden = !(me && me.hasPin) || iAmCreator;
    $("pinHint").classList.toggle("warn", !!(iAmCreator && !(me && me.hasPin)));
    $("pinHint").textContent = iAmCreator
      ? (me && me.hasPin
          ? "グループを作った人は合言葉が必要です。機種変更やブラウザが変わったときに、作った本人だと確かめるために使います。"
          : "グループを作った人は、合言葉を設定してください。機種変更やブラウザが変わったときに、作った本人だと確かめるために使います。")
      : me && me.hasPin
        ? "合言葉を設定済みです。別のスマホやブラウザから自分として入るときに必要です。"
        : "設定すると、別のスマホやブラウザから自分として入るときに合言葉が必要になります。ほかの人があなたになりすますのを防げます。";
  }
  if (isOpen("shSet") && document.activeElement !== $("rName") && !$("rName").dataset.dirty) $("rName").value = S.members[S.me].name;
}

async function renderCal(){
  const ym = S.calMonth;
  const [y, m] = ym.split("-").map(Number);
  $("calTitle").textContent = `${y}年${m}月`;
  const maxMonth = addDays(S.day, 6).slice(0, 7);
  $("calNext").disabled = ym >= maxMonth;
  let list, ovs = S.overrides;
  if (S.monthCache[ym]) ({ list, ovs } = S.monthCache[ym]);
  else {
    $("cal").replaceChildren(h("div", { style:"grid-column:1/-1", class:"muted", text:"読み込み中…" }));
    try {
      const snap = await withRetry(() => S.db.collection(`groups/${S.gid}/answers`).where("month", "==", ym).get());
      const ovSnap = await withRetry(() => S.db.collection(`groups/${S.gid}/overrides`).where("day", ">=", ym + "-01").where("day", "<=", ym + "-31").get());
      const o = {};
      ovSnap.docs.forEach(doc => { const c = cleanOv(doc.data()); if (c) o[doc.id] = c; });
      S.monthCache[ym] = { list: snap.docs.map(d => cleanAnswer(d.data())).filter(Boolean), ovs: o };
    } catch { $("cal").replaceChildren(h("div", { style:"grid-column:1/-1", class:"muted", text:"読み込めませんでした。閉じてもう一度開いてください" })); return; }
    if (S.calMonth !== ym || !isOpen("shCal")) return;
    ({ list, ovs } = S.monthCache[ym]);
  }
  // days from today on are live: let the current answers/overrides win over the fetched copy
  if (ym >= S.month){
    const byId = {};
    list.forEach(a => { byId[a.day + "_" + a.uid] = a; });
    Object.entries(S.answers).forEach(([k, a]) => { if (a.day.startsWith(ym)) byId[k] = a; });
    Object.keys(byId).forEach(k => { const a = byId[k]; if (a.day >= S.day && !S.answers[k]) delete byId[k]; });
    list = Object.values(byId);
    ovs = { ...ovs };
    Object.keys(ovs).forEach(d => { if (d >= S.day && !S.overrides[d]) delete ovs[d]; });
    Object.assign(ovs, Object.fromEntries(Object.entries(S.overrides).filter(([d]) => d.startsWith(ym))));
  }
  const cnt = {}, answered = new Set();
  list.forEach(a => { answered.add(a.day + "_" + a.uid); if (isMasu(a) && S.members[a.uid]) cnt[a.day] = (cnt[a.day] || 0) + 1; });
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(), days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  for (let d = 1; d <= days; d++){
    const key = `${ym}-${String(d).padStart(2, "0")}`;
    for (const id in S.members) if (!answered.has(key + "_" + id) && (weeklyOf(id, key) || {}).status === "masu") cnt[key] = (cnt[key] || 0) + 1;
  }
  const cells = DOW.map((d, i) => h("div", { class:"dow" + (i === 0 ? " sun" : i === 6 ? " sat" : ""), text:d }));
  for (let i = 0; i < first; i++) cells.push(h("div", { class:"d pad" }));
  let held = 0;
  for (let d = 1; d <= days; d++){
    const key = `${ym}-${String(d).padStart(2, "0")}`, n = cnt[key] || 0, rr = needFor(key, ovs), isHeld = n > 0 && n >= rr.need;
    if (isHeld) held++;
    const wd = (first + d - 1) % 7;
    cells.push(h("div", { class: "d" + (isHeld ? " held" : "") + (key === S.day ? " today" : "") + (isHoliday(key) || wd === 0 ? " hol" : wd === 6 ? " sat" : "") },
      String(d), rr.rest ? h("small", { text:"休み" }) : n ? h("small", { text: isHeld ? "開催" : `◎${n}` }) : null));
  }
  $("cal").replaceChildren(...cells);
  $("calLegend").textContent = `開催 ${held}日・◎は「ます」の人数・いまのルール(${ruleText(S.group, Object.keys(S.members).length)})で判定`;

}
