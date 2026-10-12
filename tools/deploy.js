// Publishes the site to Firebase Hosting in the background (runs after each commit; see tools/install-hook.js).
// The result goes to .firebase/last-deploy.log. Needs `npx firebase-tools login` done once on this PC.
const fs = require("fs"), path = require("path"), { spawn, spawnSync, execSync } = require("child_process");
const root = path.join(__dirname, "..");
let branch = "";
try { branch = execSync("git rev-parse --abbrev-ref HEAD", { cwd: root }).toString().trim(); } catch {}
if (branch !== "main"){ console.log(`deploy skipped (branch: ${branch || "?"})`); process.exit(0); }
fs.mkdirSync(path.join(root, ".firebase"), { recursive: true });
const log = path.join(root, ".firebase", "last-deploy.log");
fs.writeFileSync(log, `${new Date().toLocaleString("ja-JP")} deploy started\n`);
const cmd = `npx --yes firebase-tools deploy --only hosting --non-interactive >> "${log}" 2>&1`;
if (process.platform === "win32"){
  // a separate hidden process, so it keeps running after git (and VS Code's commit) has finished
  const q = s => "'" + s.replace(/'/g, "''") + "'";
  const ps = `Start-Process -WindowStyle Hidden -FilePath cmd.exe -WorkingDirectory ${q(root)} -ArgumentList '/c', ${q(cmd)}`;
  spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], { stdio: "ignore", windowsHide: true });
} else {
  spawn(cmd, { cwd: root, shell: true, detached: true, stdio: "ignore" }).unref();
}
console.log("Firebase Hosting に公開しています(結果: .firebase/last-deploy.log)");
