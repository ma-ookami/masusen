// ますせん: ますくん(キャラ)
// index.html から順番に読み込みます(前のファイルで決めた名前を使います)。

// ---------- mascot ----------
// LCD: a yellow frame with a dark screen; the face glows. head: "antenna" or "signal"
const MASCOT_HEADS = {
  antenna: `<g class="ant"><rect x="15.2" y="0.8" width="1.6" height="4.5" fill="var(--masu-deep)"/><circle class="bulb" cx="16" cy="1.3" r="1.9"/></g>`,
  cat: `<path class="tail" d="M28 27 Q34.5 27 34.5 20.5 Q34.5 17 35.5 15" fill="none" stroke="var(--masu-deep)" stroke-width="2.4" stroke-linecap="round"/>
    <g class="ear earL"><path d="M3.5 9 L5.5 0.8 L12.5 5.5 Z" fill="var(--masu)"/><path d="M5.6 6.5 L6.6 3 L9.6 5.2 Z" fill="#ff8a7a"/></g>
    <g class="ear earR"><path d="M28.5 9 L26.5 0.8 L19.5 5.5 Z" fill="var(--masu)"/><path d="M26.4 6.5 L25.4 3 L22.4 5.2 Z" fill="#ff8a7a"/></g>`,
  headphones: `<g class="ant antL"><path d="M10.5 7 L7.5 -1.5" stroke="var(--masu-deep)" stroke-width="1.5" stroke-linecap="round"/><circle class="bulb" cx="7.3" cy="-2" r="1.6"/></g>
    <g class="ant antR"><path d="M21.5 7 L24.5 -1.5" stroke="var(--masu-deep)" stroke-width="1.5" stroke-linecap="round"/><circle class="bulb" cx="24.7" cy="-2" r="1.6"/></g>`,
};
// room above the body for taller heads
const MASCOT_VIEW = { headphones:"0 -4 32 38" };
// drawn over the body
const MASCOT_OVER = {
  headphones: `<g class="hp"><path d="M3.5 13 Q3.5 1.5 16 1.5 Q28.5 1.5 28.5 13" fill="none" stroke="#3a3f52" stroke-width="2.2"/>
    <rect x="0" y="11" width="4.2" height="8" rx="2" fill="#3a3f52"/><rect x="27.8" y="11" width="4.2" height="8" rx="2" fill="#3a3f52"/></g>`,
};
// starts just right of the head (clear of the cat's ear) so it is easy to see
const MASCOT_ZZZ = `<g class="zzz" fill="var(--fg)" fill-opacity=".6" font-family="var(--f-body),sans-serif" font-weight="900">
  <text x="29" y="11" font-size="6.5">z</text><text x="29" y="11" font-size="8">z</text><text x="29" y="11" font-size="9.5">z</text></g>`;
// each one's face: eye shape, mouth, cheeks, screen colours
const MASCOT_LOOK = {
  antenna:    { eye:"square", mouth:"soft", glow:"#ff7a6b", screen:"#2a1517" },
  headphones: { eye:"square", mouth:"wide" },
  cat:        { eye:"round", mouth:"cat", cheeks:true, glow:"#7dffa0", screen:"#0f2a1c" },
};
function lcdMascot(head){
  const L = MASCOT_LOOK[head], G = L.glow || "#ffd54a";
  const st = `fill="none" stroke="${G}" stroke-width="1.6" stroke-linecap="square"`, rd = `fill="none" stroke="${G}" stroke-width="1.6" stroke-linecap="round"`;
  const eyes = `<g class="eyes">${L.eye === "round"
    ? `<circle cx="11.5" cy="12" r="2" fill="${G}"/><circle cx="20.5" cy="12" r="2" fill="${G}"/>`
    : `<rect x="10" y="10" width="3" height="4" fill="${G}"/><rect x="19" y="10" width="3" height="4" fill="${G}"/>`}</g>`;
  const mouth = { soft:"M12.5 16.8 Q16 18.6 19.5 16.8", wide:"M11.5 16.3 Q16 20 20.5 16.3", cat:"M12.5 16.5 Q14.2 18.6 16 16.6 Q17.8 18.6 19.5 16.5" }[L.mouth];
  const cheeks = (o = .8) => L.cheeks ? `<rect x="7.5" y="15" width="3" height="1.4" rx=".7" fill="#ff8a7a" opacity="${o}"/><rect x="21.5" y="15" width="3" height="1.4" rx=".7" fill="#ff8a7a" opacity="${o}"/>` : "";
  const led = c => `<circle cx="26" cy="23.2" r=".9" fill="${c}"/>`;
  const faces = {
    normal: eyes + `<path d="${mouth}" ${rd}/>` + cheeks() + led("#4caf50"),
    happy: `<path d="M9.5 13 L11.5 10.5 L13.5 13" ${st}/><path d="M18.5 13 L20.5 10.5 L22.5 13" ${st}/><path d="M11.5 16 L16 18.5 L20.5 16" ${st}/>` + cheeks(1) + led("#4caf50"),
    sad: eyes + `<path d="M11.5 18.5 L16 16.5 L20.5 18.5" ${st}/>` + led("#4caf50"),
    sleep: `<g opacity=".55"><path d="M10 12.5 H13" ${st}/><path d="M19 12.5 H22" ${st}/><path d="M15 17 H17" ${st}/></g>` + cheeks(.35) + led("#e66"),
    yawn: `<g opacity=".7"><path d="M10 12 L13 13" ${st}/><path d="M22 12 L19 13" ${st}/><ellipse cx="16" cy="17.3" rx="2.2" ry="2.6" fill="${G}"/></g>` + led("#e66"),
  };
  const noise = `<g class="noise"><rect x="5.5" y="8" width="21" height="1.2" fill="${G}" opacity=".5"/><rect x="8" y="12" width="16" height=".8" fill="#fff" opacity=".35"/><rect x="5.5" y="15" width="12" height="1" fill="${G}" opacity=".4"/></g>`;
  const lines = [8,10,12,14,16,18,20].map(y => `<rect x="6" y="${y}" width="20" height=".5" fill="#fff" opacity=".05"/>`).join("");
  return `<svg viewBox="${MASCOT_VIEW[head] || "0 0 32 34"}" preserveAspectRatio="xMidYMax meet" aria-hidden="true">${MASCOT_HEADS[head]}<g transform="translate(0 2)"><rect x="2" y="7" width="28" height="22" rx="5" fill="var(--masu-deep)"/><rect x="2" y="3" width="28" height="22" rx="5" fill="var(--masu)"/>
    <rect x="5.5" y="6" width="21" height="15.5" rx="2.5" fill="${L.screen || "#1d2230"}"/>${lines}${Object.entries(faces).map(([k, f]) => `<g class="f f-${k}">${f}</g>`).join("")}${noise}</g>${MASCOT_OVER[head] || ""}${MASCOT_ZZZ}</svg>`;
}
$("mascot").innerHTML = lcdMascot("antenna");
$("mascot2").innerHTML = lcdMascot("headphones");
$("mascot3").innerHTML = lcdMascot("cat");
// move -> how long it plays (ms)
const MASCOT_MS = { twitch:700, blink:300, hop:750, wiggle:600, spin:700, look:1700, glitch:400, groove:1800, yawn:1800, tilt:1100, nod:900 };
const MASCOT_MOVES = Object.keys(MASCOT_MS);
const mascots = () => [$("mascot"), $("mascot2"), $("mascot3")];
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
  const own = { mascot2:"groove", mascot3:"twitch" }[el.id] || "glitch";   // headphones groove, the cat twitches its ears
  return r < .35 ? "blink" : r < .55 ? "look" : r < .7 ? "hop" : r < .8 ? "wiggle" : r < .9 ? "glitch" : own;
}
// when I answer: ます = jump with a grin, たぶんます = tilt, せん = just a small nod (neither sad nor pleased)
function mascotReact(status){
  const move = { masu:"hop", tabun:"tilt", sen:"nod" }[status];
  if (!move) return;
  mascots().forEach((el, i) => setTimeout(() => mascotDo(el, move, status === "masu"), i * 130));
}
mascots().forEach(el => {
  el.addEventListener("click", () => {
    try { navigator.vibrate && navigator.vibrate(10); } catch {}
    if (el._nap) return mascotWake(el);
    mascotDo(el, el.classList.contains("sleep") ? "wiggle" : "hop");
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
if (lateNight()) setMascotMood("sleep");

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
