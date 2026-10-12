// Sets up the pre-commit hook that runs tools/stamp.js and adds index.html to the commit.
// Git doesn't copy hooks between computers, so run this once per clone: node tools/install-hook.js
const fs = require("fs"), path = require("path");
const hook = path.join(__dirname, "..", ".git", "hooks", "pre-commit");
fs.writeFileSync(hook, "#!/bin/sh\n# ますせん: stamp js/css links in index.html before each commit\nnode tools/stamp.js && git add index.html\n");
try { fs.chmodSync(hook, 0o755); } catch {}
console.log("installed " + hook);
