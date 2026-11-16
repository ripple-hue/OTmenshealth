'use strict';
// Paper Shaders (@paper-design/shaders, Apache 2.0): WebGL backgrounds the agent may use, served from
// node_modules by both servers at /vendor/paper/... so the site never depends on a CDN for them.
// The agent calls them through public/vendor/ot-shader.js (window.OTShader), which render.js loads.
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'node_modules', '@paper-design', 'shaders', 'dist');

// "/vendor/paper/shader-mount.js" or "/vendor/paper/shaders/warp.js" -> the file, or null.
function paperFile(p) {
  const m = /^\/vendor\/paper\/((?:shaders\/)?[a-z0-9-]+\.js)$/.exec(p);
  if (!m) return null;
  const file = path.join(DIST, m[1]);
  return file.startsWith(DIST + path.sep) && fs.existsSync(file) ? file : null;
}

module.exports = { paperFile, DIST };
