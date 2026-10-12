// Adds a short fingerprint of each js/css file to its link in index.html (js/data.js?v=1a2b3c4d).
// When a file changes, its link changes, so browsers fetch the new file instead of a cached old one
// (old and new files mixed together can stop the app from loading).
// Runs automatically before each commit (see tools/install-hook.js); can also be run by hand: node tools/stamp.js
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const root = path.join(__dirname, "..");
const indexPath = path.join(root, "index.html");
const before = fs.readFileSync(indexPath, "utf8");
const stamp = file => crypto.createHash("sha1").update(fs.readFileSync(path.join(root, file))).digest("hex").slice(0, 8);
const after = before
  .replace(/(<script src=")(js\/[\w.-]+\.js)(?:\?v=[0-9a-f]+)?(")/g, (_, a, f, b) => a + f + "?v=" + stamp(f) + b)
  .replace(/(<link rel="stylesheet" href=")(css\/[\w.-]+\.css)(?:\?v=[0-9a-f]+)?(")/g, (_, a, f, b) => a + f + "?v=" + stamp(f) + b);
if (after !== before){ fs.writeFileSync(indexPath, after); console.log("index.html: updated file fingerprints"); }
