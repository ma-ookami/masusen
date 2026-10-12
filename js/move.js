// ますせん: 古いURL(GitHub Pages)から新しいURLへの引っ越し
// index.html から順番に読み込みます(前のファイルで決めた名前を使います)。
//
// The browser is a different "site" at the new URL, so it would start as a stranger.
// The old page leaves a one-time move ticket in each group it belongs to and opens the new URL with the ticket;
// the new page uses the ticket to link itself to the same member (no passcode needed), then the ticket is deleted.

const NEW_HOME = "https://masusen.rokunanabox.com/";
const OLD_HOSTS = ["ma-ookami.github.io"];
const isOldHome = () => OLD_HOSTS.includes(location.hostname);

// ---------- old page: leave tickets and go ----------
async function moveToNewHome(){
  $("updating").querySelector("p").textContent = "新しいURLに引っ越しています…";
  $("updating").hidden = false;
  const token = newId("m") + newId("");
  const moved = [];
  // a fresh ticket every time (cheap, and still works if an earlier move didn't finish); each is used once and deleted
  for (const g of S.myGroups.slice(0, 30)){
    try {
      const gid = g.id;
      // which member am I in this group, and am I its "verified" self (needed to stay the creator)
      let mid = null, verified = false;
      const mine = await S.db.doc(`groups/${gid}/members/${S.uid}`).get();
      if (mine.exists){ mid = S.uid; verified = true; }
      else {
        const link = await S.db.doc(`groups/${gid}/links/${S.uid}`).get();
        const d = link.exists ? link.data() : null;
        if (d && typeof d.mid === "string" && (await S.db.doc(`groups/${gid}/members/${d.mid}`).get()).exists){ mid = d.mid; verified = d.verified === true; }
      }
      if (!mid) continue;
      await S.db.doc(`groups/${gid}/moves/${token}`).set({ mid, at:Date.now(), verified });
      moved.push(gid);
    } catch {}
  }
  const start = hashGid() || ls.get("last", null);
  const q = new URLSearchParams();
  if (moved.length){ q.set("move", token); q.set("g", moved.join(".")); }
  const owned = S.owned.filter(id => moved.includes(id));
  if (owned.length) q.set("o", owned.join("."));
  if (start) q.set("to", start);
  const theme = ls.get("theme", "auto"); if (theme !== "auto") q.set("th", theme);
  location.replace(NEW_HOME + (q.toString() ? "#" + q.toString() : ""));
}

// ---------- new page: use the tickets ----------
async function claimMove(){
  if (!/(^#|&)(move|to|th)=/.test(location.hash)) return;
  const q = new URLSearchParams(location.hash.slice(1));
  const ok = id => /^g[a-z0-9]{6,20}$/.test(id);
  const token = q.get("move") || "", gids = (q.get("g") || "").split(".").filter(ok);
  const owned = (q.get("o") || "").split(".").filter(ok), to = q.get("to"), th = q.get("th");
  if (th && ["light", "dark"].includes(th)){ ls.set("theme", th); applyTheme(); }
  let n = 0;
  if (token.length >= 20) for (const gid of gids){
    try {
      const ref = S.db.doc(`groups/${gid}/moves/${token}`);
      const mv = await ref.get();
      if (!mv.exists) continue;
      const d = mv.data();
      if (!(await S.db.doc(`groups/${gid}/members/${S.uid}`).get()).exists)
        await S.db.doc(`groups/${gid}/links/${S.uid}`).set({ mid:d.mid, at:Date.now(), move:token, verified:d.verified === true });
      ref.delete().catch(() => {});
      const gs = await S.db.doc(`groups/${gid}`).get();
      if (!gs.exists) continue;
      if (!S.myGroups.some(x => x.id === gid)) S.myGroups.push({ id:gid, name:str(gs.data().name, 24) });
      n++;
    } catch {}
  }
  if (n){
    S.owned = [...new Set([...S.owned, ...owned.filter(id => S.myGroups.some(x => x.id === id))])].slice(0, MAX_OWNED);
    ls.set("groups", S.myGroups);
    try { await S.db.doc(`users/${S.uid}`).set(userDoc()); } catch {}
  }
  const start = to && ok(to) ? to : null;
  if (start) ls.set("last", start);
  try { history.replaceState(null, "", start ? "#" + start : location.pathname + location.search); } catch {}
  if (n) setTimeout(() => toast("新しいURLに引っ越しました。これからはこのページを使ってください"), 600);
}
