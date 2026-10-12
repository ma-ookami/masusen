// Sets up the git hooks for this folder. Git doesn't copy hooks between computers, so run this once per clone:
//   node tools/install-hook.js
//  - pre-commit:  tools/stamp.js stamps the js/css links in index.html and adds it to the commit
//  - post-commit: tools/deploy.js publishes the site to Firebase Hosting in the background
const fs = require("fs"), path = require("path");
const dir = path.join(__dirname, "..", ".git", "hooks");
const hooks = {
  "pre-commit": "#!/bin/sh\n# ますせん: stamp js/css links in index.html before each commit\nnode tools/stamp.js && git add index.html\n",
  "post-commit": "#!/bin/sh\n# ますせん: publish to Firebase Hosting after each commit (in the background)\nnode tools/deploy.js || true\n",
};
for (const [name, body] of Object.entries(hooks)){
  const f = path.join(dir, name);
  fs.writeFileSync(f, body);
  try { fs.chmodSync(f, 0o755); } catch {}
  console.log("installed " + f);
}
