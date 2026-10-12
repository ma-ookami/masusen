// ますせん: ますくん(キャラ)
// index.html から順番に読み込みます(前のファイルで決めた名前を使います)。

// ---------- mascot ----------
// LCD robot built from parts. Each face (normal / happy / sad / sleep / yawn) is a group shown by the mood class.
const CHAR_PARTS = {
  head:   { label:"頭", opts:{ none:"なし", antenna:"1本アンテナ", twin:"2本アンテナ", cat:"ねこ耳", signal:"電波", ribbon:"リボン", crown:"王冠", propeller:"プロペラ", leaf:"葉っぱ" } },
  wear:   { label:"かぶりもの", opts:{ none:"なし", headphones:"ヘッドホン" } },
  body:   { label:"体の色", color:true, opts:{ yellow:["#ffc531","#c98a00"], coral:["#ff8a7a","#d0604f"], mint:["#6fd6a8","#3a9f74"],
            sky:["#7cc4ff","#3b88c9"], grape:["#b9a4ff","#7f63d1"], white:["#eeeeee","#b5b5b5"], black:["#4a5068","#2a2e40"] } },
  screen: { label:"画面の色", color:true, opts:{ yellow:["#ffd54a","#1d2230"], red:["#ff7a6b","#2a1517"], green:["#7dffa0","#0f2a1c"],
            blue:["#7fd8ff","#0f2030"], pink:["#ff9fd0","#2a1424"], white:["#f4f4f4","#22252e"] } },
  eye:    { label:"目", opts:{ square:"四角", round:"まる", wide:"横長", dot:"点" } },
  mouth:  { label:"口", opts:{ soft:"小さめ", wide:"にっこり", cat:"ω", flat:"まっすぐ" } },
  face:   { label:"顔の小物", opts:{ none:"なし", glasses:"メガネ", brows:"まゆげ" } },
  cheeks: { label:"ほっぺ", opts:{ off:"なし", on:"あり" } },
  tail:   { label:"しっぽ", opts:{ off:"なし", on:"あり" } },
  item:   { label:"持ち物", opts:{ none:"なし", controller:"コントローラー" } },
};
const CHAR_PRESETS = {
  antenna:    { head:"antenna", wear:"none", body:"yellow", screen:"red", eye:"square", mouth:"soft", cheeks:"off", tail:"off" },
  headphones: { head:"twin", wear:"headphones", body:"yellow", screen:"yellow", eye:"square", mouth:"wide", cheeks:"off", tail:"off" },
  cat:        { head:"cat", wear:"none", body:"yellow", screen:"green", eye:"round", mouth:"cat", cheeks:"on", tail:"on" },
};
const CHAR_DEFAULT = { head:"antenna", wear:"none", body:"sky", screen:"blue", eye:"round", mouth:"wide", face:"none", cheeks:"off", tail:"off", item:"none" };
const cleanChar = c => Object.fromEntries(Object.entries(CHAR_PARTS).map(([k, p]) => [k, c && p.opts[c[k]] ? c[k] : CHAR_DEFAULT[k]]));
const MASCOT_ZZZ = `<g class="zzz" fill="var(--fg)" fill-opacity=".6" font-family="var(--f-body),sans-serif" font-weight="900">
  <text x="29" y="11" font-size="6.5">z</text><text x="29" y="11" font-size="8">z</text><text x="29" y="11" font-size="9.5">z</text></g>`;
function lcdMascot(c){
  c = cleanChar(c);
  const [B, BD] = CHAR_PARTS.body.opts[c.body], [G, SCR] = CHAR_PARTS.screen.opts[c.screen];
  const st = `fill="none" stroke="${G}" stroke-width="1.6" stroke-linecap="square"`, rd = `fill="none" stroke="${G}" stroke-width="1.6" stroke-linecap="round"`;
  const eyeShape = {
    square:`<rect x="10" y="10" width="3" height="4" fill="${G}"/><rect x="19" y="10" width="3" height="4" fill="${G}"/>`,
    round:`<circle cx="11.5" cy="12" r="2" fill="${G}"/><circle cx="20.5" cy="12" r="2" fill="${G}"/>`,
    wide:`<rect x="9" y="11.2" width="5" height="2.4" rx="1" fill="${G}"/><rect x="18" y="11.2" width="5" height="2.4" rx="1" fill="${G}"/>`,
    dot:`<circle cx="11.5" cy="12.2" r="1.2" fill="${G}"/><circle cx="20.5" cy="12.2" r="1.2" fill="${G}"/>`,
  }[c.eye];
  const eyes = `<g class="eyes">${eyeShape}</g>`;
  const mouth = { soft:"M12.5 16.8 Q16 18.6 19.5 16.8", wide:"M11.5 16.3 Q16 20 20.5 16.3", cat:"M12.5 16.5 Q14.2 18.6 16 16.6 Q17.8 18.6 19.5 16.5", flat:"M13 17.2 H19" }[c.mouth];
  const cheeks = (o = .8) => c.cheeks === "on" ? `<rect x="7.5" y="15" width="3" height="1.4" rx=".7" fill="#ff8a7a" opacity="${o}"/><rect x="21.5" y="15" width="3" height="1.4" rx=".7" fill="#ff8a7a" opacity="${o}"/>` : "";
  const led = col => `<circle cx="26" cy="23.2" r=".9" fill="${col}"/>`;
  const faces = {
    normal: eyes + `<path d="${mouth}" ${rd}/>` + cheeks() + led("#4caf50"),
    happy: `<path d="M9.5 13 L11.5 10.5 L13.5 13" ${st}/><path d="M18.5 13 L20.5 10.5 L22.5 13" ${st}/><path d="M11.5 16 L16 18.5 L20.5 16" ${st}/>` + cheeks(1) + led("#4caf50"),
    sad: eyes + `<path d="M11.5 18.5 L16 16.5 L20.5 18.5" ${st}/>` + led("#4caf50"),
    sleep: `<g opacity=".55"><path d="M10 12.5 H13" ${st}/><path d="M19 12.5 H22" ${st}/><path d="M15 17 H17" ${st}/></g>` + cheeks(.35) + led("#e66"),
    yawn: `<g opacity=".7"><path d="M10 12 L13 13" ${st}/><path d="M22 12 L19 13" ${st}/><ellipse cx="16" cy="17.3" rx="2.2" ry="2.6" fill="${G}"/></g>` + led("#e66"),
  };
  const head = {
    none:"",
    antenna:`<g class="ant"><rect x="15.2" y="0.8" width="1.6" height="4.5" fill="${BD}"/><circle class="bulb" cx="16" cy="1.3" r="1.9"/></g>`,
    twin:`<g class="ant antL"><path d="M10.5 7 L7.5 -1.5" stroke="${BD}" stroke-width="1.5" stroke-linecap="round"/><circle class="bulb" cx="7.3" cy="-2" r="1.6"/></g>
      <g class="ant antR"><path d="M21.5 7 L24.5 -1.5" stroke="${BD}" stroke-width="1.5" stroke-linecap="round"/><circle class="bulb" cx="24.7" cy="-2" r="1.6"/></g>`,
    cat:`<g class="ear earL"><path d="M3.5 9 L5.5 0.8 L12.5 5.5 Z" fill="${B}"/><path d="M5.6 6.5 L6.6 3 L9.6 5.2 Z" fill="#ff8a7a"/></g>
      <g class="ear earR"><path d="M28.5 9 L26.5 0.8 L19.5 5.5 Z" fill="${B}"/><path d="M26.4 6.5 L25.4 3 L22.4 5.2 Z" fill="#ff8a7a"/></g>`,
    signal:`<rect x="15.2" y="2.5" width="1.6" height="3" fill="${BD}"/><circle cx="16" cy="2.3" r="1.1" fill="${BD}"/>
      <path class="wave" d="M12.8 1.6 Q16 -1.4 19.2 1.6" fill="none" stroke="${BD}" stroke-width="1.1" stroke-linecap="round"/>`,
    ribbon:`<path d="M16 4.5 L10 1 L10 8 Z M16 4.5 L22 1 L22 8 Z" fill="#ff6b9d"/><circle cx="16" cy="4.5" r="1.8" fill="#e04a80"/>`,
    crown:`<path d="M9 6.5 L9 1 L12.5 4 L16 0 L19.5 4 L23 1 L23 6.5 Z" fill="#ffd54a" stroke="#c98a00" stroke-width=".6"/>`,
    propeller:`<rect x="15.3" y="1.5" width="1.4" height="4" fill="${BD}"/><ellipse class="prop" cx="16" cy="1.4" rx="6" ry="1.2" fill="#7cc4ff"/><circle cx="16" cy="1.4" r="1" fill="#ff6b5a"/>`,
    leaf:`<g class="leaf"><path d="M16 5.5 Q15 2 16.5 0.5" fill="none" stroke="#3a9f74" stroke-width="1.2"/><path d="M16.5 1 Q21 -1 22 2.5 Q18.5 4.5 16.5 1 Z" fill="#6fd6a8"/></g>`,
  }[c.head];
  // on the screen, over the face
  const faceAcc = {
    none:"",
    glasses:`<g fill="none" stroke="#fff" stroke-width=".9" opacity=".9"><circle cx="11.5" cy="12" r="3.2"/><circle cx="20.5" cy="12" r="3.2"/><path d="M14.7 12 H17.3"/></g>`,
    brows:`<g class="brows" stroke="${G}" stroke-width="1.2" stroke-linecap="round"><path d="M9.5 8.6 L13 8"/><path d="M22.5 8.6 L19 8"/></g>`,
  }[c.face];
  const item = c.item === "controller" ? `<g class="pad"><rect x="10" y="27" width="12" height="5.5" rx="2.6" fill="#3a3f52"/><rect x="12.2" y="29.2" width="2.6" height=".9" fill="#fff"/><rect x="13.05" y="28.35" width=".9" height="2.6" fill="#fff"/><circle cx="19" cy="29" r=".7" fill="#ff6b5a"/><circle cx="20.3" cy="30.3" r=".7" fill="#7fd8ff"/></g>` : "";
  const tail = c.tail === "on" ? `<path class="tail" d="M28 27 Q34.5 27 34.5 20.5 Q34.5 17 35.5 15" fill="none" stroke="${BD}" stroke-width="2.4" stroke-linecap="round"/>` : "";
  const wear = c.wear === "headphones" ? `<g class="hp"><path d="M3.5 13 Q3.5 1.5 16 1.5 Q28.5 1.5 28.5 13" fill="none" stroke="#3a3f52" stroke-width="2.2"/>
    <rect x="0" y="11" width="4.2" height="8" rx="2" fill="#3a3f52"/><rect x="27.8" y="11" width="4.2" height="8" rx="2" fill="#3a3f52"/></g>` : "";
  const noise = `<g class="noise"><rect x="5.5" y="8" width="21" height="1.2" fill="${G}" opacity=".5"/><rect x="8" y="12" width="16" height=".8" fill="#fff" opacity=".35"/><rect x="5.5" y="15" width="12" height="1" fill="${G}" opacity=".4"/></g>`;
  const lines = [8,10,12,14,16,18,20].map(y => `<rect x="6" y="${y}" width="20" height=".5" fill="#fff" opacity=".05"/>`).join("");
  // the twin antennas reach higher, so that one gets more room on top
  const view = c.head === "twin" ? "0 -4 32 38" : "0 0 32 34";
  return `<svg viewBox="${view}" preserveAspectRatio="xMidYMax meet" aria-hidden="true">${tail}${head}<g transform="translate(0 2)"><rect x="2" y="7" width="28" height="22" rx="5" fill="${BD}"/><rect x="2" y="3" width="28" height="22" rx="5" fill="${B}"/>
    <rect x="5.5" y="6" width="21" height="15.5" rx="2.5" fill="${SCR}"/>${lines}${Object.entries(faces).map(([k, f]) => `<g class="f f-${k}">${f}</g>`).join("")}${faceAcc}${noise}</g>${wear}${item}${MASCOT_ZZZ}</svg>`;
}
// the row by the option button: three places for members' own characters (mine first, then by join order),
// then the official one on the right. An empty place is a faint dashed circle that opens the character maker.
// Each slot is redrawn only when what it shows changes.
const MASCOT_SLOTS = ["mascot", "mascot2", "mascot3", "mascot4"];
const OWN_PLACES = 3;
const PLACE_SVG = `<svg viewBox="0 0 32 34" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
  <circle cx="16" cy="19" r="12" fill="none" stroke="currentColor" stroke-width="1.3" stroke-dasharray="3 2.4"/>
  <path d="M16 15 V23 M12 19 H20" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`;
function renderMascotRow(){
  const ids = Object.keys(S.gid ? S.members : {}).filter(id => S.members[id].char)
    .sort((a, b) => (b === S.me) - (a === S.me) || S.members[a].joinedAt - S.members[b].joinedAt).slice(0, OWN_PLACES);
  const list = [...ids.map(id => ({ c:S.members[id].char, who:id }))];
  while (list.length < OWN_PLACES) list.push({ place:true });
  list.push({ c:CHAR_PRESETS.antenna, who:null });
  MASCOT_SLOTS.forEach((sid, i) => {
    const el = $(sid), it = list[i];
    const key = it.place ? "place" : JSON.stringify(it.c) + "|" + (it.who || "");
    if (el.dataset.key === key) return;
    el.dataset.key = key; el.dataset.who = it.who || "";
    el.classList.toggle("place", !!it.place);
    if (it.place){
      el.innerHTML = PLACE_SVG; el.dataset.own = "";
      el.classList.remove("happy", "sad", "sleep", ...MASCOT_MOVES, "cheer"); el._nap = false;
      el.setAttribute("aria-label", "ここに自分のキャラを作れます"); el.title = "ここに自分のキャラを作れます";
      return;
    }
    el.innerHTML = lcdMascot(it.c);
    el.dataset.own = it.c.wear === "headphones" ? "groove" : it.c.head === "cat" || it.c.tail === "on" ? "twitch" : "glitch";
    const name = it.who && S.members[it.who] ? S.members[it.who].name : "";
    el.setAttribute("aria-label", name && !S.anon ? `${name}のキャラ` : "ますくん");
    el.title = name && !S.anon ? `${name}のキャラ` : "ますくん";
  });
}
// open 設定 → 自分 at the character maker
function openCharMaker(){
  if ($("setBtn").hidden) return;
  $("setBtn").click(); showSetTab("me");
  requestAnimationFrame(() => $("charPreview").closest(".sec").scrollIntoView({ block:"start", behavior:"smooth" }));
}
// move -> how long it plays (ms)
const MASCOT_MS = { twitch:700, blink:300, hop:750, wiggle:600, spin:700, look:1700, glitch:400, groove:1800, yawn:1800, tilt:1100, nod:900 };
const MASCOT_MOVES = Object.keys(MASCOT_MS);
// the ones that are characters right now (not an empty place)
const mascots = () => MASCOT_SLOTS.map(id => $(id)).filter(el => !el.classList.contains("place"));
let mascotMood = "";
function setMascotMood(m){
  mascotMood = m;
  mascots().forEach(el => { const mm = el._nap ? "sleep" : m; ["happy", "sad", "sleep"].forEach(k => el.classList.toggle(k, k === mm)); });
}
// naps: one at a time, 40-90s; wake on tap
function mascotNap(el){
  el._nap = true; setMascotMood(mascotMood);
  el._napT = setTimeout(() => mascotWake(el), 40000 + Math.random() * 50000);
}
function mascotWake(el){
  if (!el._nap) return;
  el._nap = false; clearTimeout(el._napT); setMascotMood(mascotMood);
  mascotDo(el, "hop");
}
function napChance(){
  const h = new Date(Date.now() + 9 * 3600e3).getUTCHours();
  return (h >= 13 && h < 16) || (h >= 17 && h < 19) ? .12 : .03;   // 昼寝 and 夕寝 time
}
function mascotDo(el, move, cheer){
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  clearTimeout(el._mt);
  el.classList.remove(...MASCOT_MOVES, "cheer"); void el.offsetWidth; el.classList.add(move);
  if (cheer) el.classList.add("cheer");
  el._mt = setTimeout(() => el.classList.remove(move, "cheer"), MASCOT_MS[move] + (cheer ? 500 : 0));
}
// what they do on their own
function mascotIdleMove(el){
  const r = Math.random();
  if (el.classList.contains("sleep")) return r < .5 ? "wiggle" : "yawn";
  const own = el.dataset.own || "glitch";   // headphones groove, cat ears / tails twitch
  return r < .35 ? "blink" : r < .55 ? "look" : r < .7 ? "hop" : r < .8 ? "wiggle" : r < .9 ? "glitch" : own;
}
// when I answer: ます = jump with a grin, たぶんます = tilt, せん = just a small nod (neither sad nor pleased)
function mascotReact(status){
  const move = { masu:"hop", tabun:"tilt", sen:"nod" }[status];
  if (!move) return;
  mascots().forEach((el, i) => setTimeout(() => mascotDo(el, move, status === "masu"), i * 130));
}
MASCOT_SLOTS.map(id => $(id)).forEach(el => {
  el.addEventListener("click", () => {
    if (el.classList.contains("place")) return openCharMaker();
    try { navigator.vibrate && navigator.vibrate(10); } catch {}
    if (el._nap) return mascotWake(el);
    mascotDo(el, el.classList.contains("sleep") ? "wiggle" : "hop");
    const who = el.dataset.who;
    if (who && S.members[who] && !S.anon) toast(who === S.me ? "あなたのキャラ" : `${S.members[who].name}のキャラ`);
  });
});
(function idle(last){
  setTimeout(() => {
    const pick = mascots().filter(el => el !== last);
    const el = pick[Math.floor(Math.random() * pick.length)];
    if (!document.hidden && el.offsetParent){
      const napping = mascots().some(m => m._nap);
      if (!napping && !el.classList.contains("sleep") && Math.random() < napChance()) mascotNap(el);
      else mascotDo(el, mascotIdleMove(el));
    }
    idle(el);
  }, 5000 + Math.random() * 2000);
})(null);
renderMascotRow();
if (lateNight()) setMascotMood("sleep");

// ---------- キャラクタークリエイト (設定 → 自分) ----------
// saved on my member data in this group, so everyone in the group sees it. Edits stay on the preview until saved.
let charDraft = null, charOn = false;
const myCharSaved = () => (S.members[S.me] || {}).char || null;
const charChanged = () => charOn !== !!myCharSaved() || (charOn && JSON.stringify(charDraft) !== JSON.stringify(myCharSaved()));
function renderCharMaker(){
  if (!charDraft){ charDraft = myCharSaved() || { ...CHAR_DEFAULT }; charOn = !!myCharSaved(); }
  $("charPreview").innerHTML = lcdMascot(charDraft);
  $("charPreview").classList.toggle("off", !charOn);
  $("charParts").replaceChildren(...Object.entries(CHAR_PARTS).map(([k, p]) => h("div", { class:"char-row" },
    h("span", { class:"label", text:p.label }),
    h("div", { class:"chips" + (p.color ? " char-colors" : ""), role:"radiogroup", "aria-label":p.label },
      Object.entries(p.opts).map(([v, o]) => p.color
        ? h("button", { type:"button", class:"char-sw" + (charDraft[k] === v ? " on" : ""), role:"radio", "aria-checked":String(charDraft[k] === v),
            "aria-label":v, style:`background:${o[k === "screen" ? 1 : 0]}`, onclick:() => setCharPart(k, v) },
            k === "screen" ? h("span", { style:`background:${o[0]}` }) : null)
        : h("button", { type:"button", class:"chip sm" + (charDraft[k] === v ? " on" : ""), role:"radio", "aria-checked":String(charDraft[k] === v),
            onclick:() => setCharPart(k, v) }, o))))));
  $("charShow").checked = charOn;
  $("charSave").disabled = !charChanged() || S.canWrite === false;
}
function setCharPart(k, v){
  charDraft = { ...charDraft, [k]: v };
  charOn = true;              // choosing a part means "use it"
  renderCharMaker();
  mascotDo($("charPreview"), "hop");
}
$("charShow").addEventListener("change", e => { charOn = e.target.checked; renderCharMaker(); });
$("charPreview").addEventListener("click", () => mascotDo($("charPreview"), "hop"));
$("charReset").addEventListener("click", () => { charDraft = { ...CHAR_DEFAULT }; charOn = true; renderCharMaker(); });
$("charSave").addEventListener("click", async () => {
  if (!charChanged() || !S.me || !S.members[S.me]) return;
  const c = charOn ? { ...charDraft } : null;
  $("charSave").disabled = true;
  try {
    await saveMember({ char:c });
    renderMascotRow(); setMascotMood(mascotMood); renderCharMaker();
    toast(c ? "キャラを保存しました(グループのみんなに見えます)" : "キャラを外しました");
  } catch (err){ onWriteError(err); renderCharMaker(); }
});

// day rollover at 4:00 and countdown refresh
setInterval(() => {
  if (!S.gid || !S.db) return;
  const d = gameDay();
  if (d !== S.day){
    const wasToday = S.sel === S.day;
    S.day = d; S.month = d.slice(0, 7);
    if (wasToday || S.sel < d) S.sel = d;
    subscribeAnswers();
  }
  if (!$("sMain").hidden) renderMain();
}, 30000);
