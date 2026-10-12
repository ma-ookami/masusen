// ますせん: 保存の操作・シート(下から出る画面)
// index.html から順番に読み込みます(前のファイルで決めた名前を使います)。

// ---------- actions ----------
function buildAnswer(day, patch){
  const cur = S.answers[myKey(day)] || { game:"", comment:"", from:null, until:null, conds:[] };
  const next = { ...cur, ...patch, uid:S.me, day, month:day.slice(0, 7), updatedAt:Date.now() };
  if (patch.status && (patch.status === "sen") !== (cur.status === "sen")) next.conds = [];
  if (next.status === "sen"){ next.from = null; next.until = null; next.game = ""; next.cutoff = null; }
  if (next.status === "none"){ next.from = null; next.until = null; next.game = ""; next.cutoff = null; next.conds = []; next.comment = ""; }
  return next;
}
function saveMine(patch, day = S.sel){
  if (S.canWrite === false) return toast("このページは閲覧のみです", true);
  const next = buildAnswer(day, patch);
  S.answers = { ...S.answers, [myKey(day)]: next };
  render();
  return writeDoc(S.db.doc(`groups/${S.gid}/answers/${myKey(day)}`), next);
}

function burst(btn, e){
  try { navigator.vibrate && navigator.vibrate(12); } catch {}
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  btn.classList.remove("boing"); void btn.offsetWidth; btn.classList.add("boing");
  const r = btn.getBoundingClientRect();
  const x = e && e.clientX ? e.clientX - r.left : r.width / 2, y = e && e.clientY ? e.clientY - r.top : r.height / 2;
  let clip = btn.querySelector(".rip");
  if (!clip){ clip = h("span", { class:"rip" }); btn.prepend(clip); }
  const size = Math.hypot(Math.max(x, r.width - x), Math.max(y, r.height - y)) * 2;
  const rp = h("span", { class:"ripple", style:`left:${x}px;top:${y}px;width:${size}px;height:${size}px` });
  clip.append(rp); setTimeout(() => rp.remove(), 650);
  const colors = ["var(--masu)","var(--tabun)","var(--coral)","var(--fg)"];
  for (let i = 0; i < 12; i++){
    const ang = (Math.PI * 2 * i) / 12 + Math.random() * .4, dist = 45 + Math.random() * 40;
    const sp = h("span", { class:"spark", style:`left:${x}px;top:${y}px;--dx:${Math.cos(ang)*dist}px;--dy:${Math.sin(ang)*dist}px;background:${colors[i%4]}` });
    btn.append(sp); setTimeout(() => sp.remove(), 650);
  }
}
let confettiRun = 0;
function confetti(fromEl){
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const c = $("confetti"), ctx = c.getContext("2d"), dpr = window.devicePixelRatio || 1;
  c.width = innerWidth * dpr; c.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cs = getComputedStyle(document.documentElement);
  const cols = ["--masu","--tabun","--coral","--fg","--tmrw"].map(v => cs.getPropertyValue(v).trim());
  const r = fromEl ? fromEl.getBoundingClientRect() : { left:innerWidth * .2, right:innerWidth * .8, top:innerHeight * .3, bottom:innerHeight * .35 };
  // launch points spread along the card's top edge; each piece leans away from the middle,
  // so together they open like one fan
  const cx = (r.left + r.right) / 2, half = Math.max(40, (r.right - r.left) / 2), top = r.top !== undefined ? r.top + 6 : r.bottom - 40;
  const P = [];
  for (let i = 0; i < 170; i++){
    const u = (Math.random() * 2 - 1);                          // -1 (left) … 1 (right)
    const x = cx + u * half * 0.85;
    const deg = -90 + u * 38 + (Math.random() - .5) * 26;       // mostly up, fanning outward
    const sp = 10 + Math.random() * 9 - Math.abs(u) * 2;
    const ribbon = Math.random() < .22;
    P.push({ x, y:top, vx:Math.cos(deg * Math.PI / 180) * sp, vy:Math.sin(deg * Math.PI / 180) * sp,
      r:Math.random() * Math.PI, vr:(Math.random() - .5) * .5,
      w: ribbon ? 3 : 5 + Math.random() * 5, hh: ribbon ? 16 + Math.random() * 10 : 7 + Math.random() * 6,
      c: cols[Math.floor(Math.random() * cols.length)] });
  }
  const run = ++confettiRun, t0 = performance.now();
  (function frame(t){
    if (run !== confettiRun) return;            // a newer burst took over the canvas
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    P.forEach(p => { p.vy += .32; p.vx *= .985; p.vy *= .995; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.w/2, -p.hh/2, p.w, p.hh); ctx.restore(); });
    if (t - t0 < 3000) requestAnimationFrame(frame); else ctx.clearRect(0, 0, innerWidth, innerHeight);
  })(t0);
}

// ---------- sheets ----------
let lastFocus = null;
function openSheet(id){
  closeSheets(true);
  commentOpened = false;
  lastFocus = document.activeElement;
  $(id).hidden = false; document.body.classList.add("sheet-open");
  const f = $(id).querySelector(".x"); f && f.focus({preventScroll:true});
  renderSheets(); updateCounters();
}
function closeSheets(silent){
  const open = document.querySelector(".sheet:not([hidden])");
  if (open && open.id === "shDetail") flushComment();
  document.querySelectorAll(".sheet").forEach(s => s.hidden = true);
  document.body.classList.remove("sheet-open");
  if (!silent && lastFocus && lastFocus.focus) lastFocus.focus({preventScroll:true});
}
document.querySelectorAll(".sheet").forEach(s => {
  s.addEventListener("click", e => { if (e.target === s || e.target.closest("[data-close]")) closeSheets(); });
});
document.addEventListener("keydown", e => { if (e.key === "Escape") closeSheets(); });
const isOpen = id => !$(id).hidden;
function flushComment(){
  const me = mineOn(S.sel), v = $("commentInput").value.trim();
  if (me && v !== (me.comment || "")) saveMine({ comment:v });
}
