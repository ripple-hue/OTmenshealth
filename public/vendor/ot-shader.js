/* OT Studio shader helper. Wraps Paper Shaders (@paper-design/shaders 0.0.82, Apache 2.0,
 * https://github.com/paper-design/shaders), served from this site at /vendor/paper/.
 *
 *   OTShader.mount(element, { type: 'grain', colors: ['#3a2a1c', '#b8925a'], back: '#0c0a08' })
 *
 * Types: 'grain' (grainy gradient), 'mesh' (flowing mesh gradient), 'rays' (light rays), 'warp'
 * (marbled, smoky fields). The canvas fills `element` behind its content. Colours must be hex, rgb()
 * or hsl() strings (anything else is ignored). Does nothing without WebGL 2; under reduced motion
 * it draws one still frame. Pauses itself when off screen. Returns a promise of the mount, or null.
 */
(function () {
  'use strict';
  var me = document.currentScript && document.currentScript.src;
  var base = me ? me.replace(/ot-shader\.js(\?.*)?$/, 'paper/') : '/vendor/paper/';
  var FILES = { grain: 'grain-gradient', mesh: 'mesh-gradient', rays: 'god-rays', warp: 'warp' };
  // Paper's dots and truchet patterns are left out; blob (the owner's favourite) and sphere stay.
  var GRAIN_SHAPES = { wave: 1, corners: 4, ripple: 5, blob: 6, sphere: 7 };
  var WARP_SHAPES = { checks: 0, stripes: 1, edge: 2 };
  var FIT = { none: 0, contain: 1, cover: 2 };
  var cache = {};
  var load = function (f) { return cache[f] || (cache[f] = import(base + f)); };
  var isColour = function (c) { return typeof c === 'string' && /^\s*(#[0-9a-f]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\))\s*$/i.test(c); };
  var num = function (v, d, lo, hi) { v = typeof v === 'number' && isFinite(v) ? v : d; return Math.min(hi, Math.max(lo, v)); };
  var webgl2 = function () { try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; } };

  function mount(el, o) {
    o = o || {};
    var type = FILES[o.type] ? o.type : 'grain';
    var colors = (Array.isArray(o.colors) ? o.colors : []).filter(isColour).slice(0, type === 'mesh' ? 10 : 7);
    var back = isColour(o.back) ? o.back : '#0c0a08';
    if (!el || el.nodeType !== 1 || !colors.length || !webgl2()) return Promise.resolve(null);
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    return Promise.all([
      load('shader-mount.js'), load('get-shader-color-from-string.js'), load('get-shader-noise-texture.js'), load('shaders/' + FILES[type] + '.js')
    ]).then(function (m) {
      // The noise texture is an image; the shader refuses it until it has loaded.
      var img = m[2].getShaderNoiseTexture();
      var ready = !img || (img.complete && img.naturalWidth) ? Promise.resolve() : new Promise(function (ok, fail) { img.addEventListener('load', ok, { once: true }); img.addEventListener('error', fail, { once: true }); });
      return ready.then(function () { return m; });
    }).then(function (m) {
      var col = m[1].getShaderColorFromString, noise = m[2].getShaderNoiseTexture, sh = m[3];
      var pattern = (type === 'warp') || (type === 'grain' && o.shape === 'wave');
      var u = {
        // Backgrounds fill the element: shapes are scaled to cover it, patterns tile.
        u_fit: pattern ? FIT.none : FIT[o.fit] != null ? FIT[o.fit] : FIT.cover, u_scale: num(o.scale, 1, 0.01, 4), u_rotation: num(o.rotation, 0, 0, 360),
        u_offsetX: num(o.offsetX, 0, -1, 1), u_offsetY: num(o.offsetY, type === 'rays' ? -0.55 : 0, -1, 1),
        u_originX: 0.5, u_originY: 0.5, u_worldWidth: 0, u_worldHeight: 0,
        u_colors: colors.map(col), u_colorsCount: colors.length
      };
      var frag;
      if (type === 'grain') {
        frag = sh.grainGradientFragmentShader;
        u.u_colorBack = col(back); u.u_softness = num(o.softness, 0.5, 0, 1); u.u_intensity = num(o.intensity, 0.5, 0, 1);
        u.u_noise = num(o.noise, 0.25, 0, 1); u.u_shape = GRAIN_SHAPES[o.shape] || GRAIN_SHAPES.corners; u.u_noiseTexture = noise();
      } else if (type === 'mesh') {
        frag = sh.meshGradientFragmentShader;
        u.u_distortion = num(o.distortion, 0.8, 0, 1); u.u_swirl = num(o.swirl, 0.1, 0, 1);
        u.u_grainMixer = num(o.grainMixer, 0, 0, 1); u.u_grainOverlay = num(o.grain, 0.15, 0, 1);
      } else if (type === 'rays') {
        frag = sh.godRaysFragmentShader;
        u.u_colorBack = col(back); u.u_colorBloom = col(isColour(o.bloomColor) ? o.bloomColor : colors[0]);
        u.u_density = num(o.density, 0.3, 0, 1); u.u_spotty = num(o.spotty, 0.3, 0, 1); u.u_midIntensity = num(o.midIntensity, 0.4, 0, 1);
        u.u_midSize = num(o.midSize, 0.2, 0, 1); u.u_intensity = num(o.intensity, 0.8, 0, 1); u.u_bloom = num(o.bloom, 0.4, 0, 1);
        u.u_noiseTexture = noise();
      } else {
        frag = sh.warpFragmentShader;
        u.u_proportion = num(o.proportion, 0.45, 0, 1); u.u_softness = num(o.softness, 1, 0, 1); u.u_distortion = num(o.distortion, 0.25, 0, 1);
        u.u_swirl = num(o.swirl, 0.8, 0, 1); u.u_swirlIterations = num(o.swirlIterations, 10, 0, 20); u.u_shapeScale = num(o.shapeScale, 0.1, 0, 1);
        u.u_shape = WARP_SHAPES[o.shape] != null ? WARP_SHAPES[o.shape] : 0; u.u_noiseTexture = noise();
      }
      var speed = reduce ? 0 : num(o.speed, 0.4, 0, 2);
      // A modest pixel budget: these are backgrounds, and phones should stay cool.
      var s = new m[0].ShaderMount(el, frag, u, undefined, speed, num(o.frame, 4000, 0, 1e7), 1, 1920 * 1080);
      var c = el.querySelector('canvas');
      if (c) c.setAttribute('aria-hidden', 'true');
      return s;
    }).catch(function (e) {
      if (window.console) console.warn('OTShader:', e && e.message);
      return null;
    });
  }

  window.OTShader = { mount: mount };
})();
