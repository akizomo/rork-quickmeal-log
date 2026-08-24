(function () {
  // ─── Palette ──────────────────────────────────────────────────────────────
  var IVORY    = '#F6F3EC';
  var IVORY_HI = '#FBF8F2';
  var SUMI     = '#1A1916';
  var STONE6   = '#6E776E';
  var SAGE_L   = '#82A280';
  var RAISED   = '#FFFDF7';
  var TAPI     = 1; // index of tapped tile

  // ─── Timeline (authored seconds, ratio-independent) ───────────────────────
  var TOTAL = 9.5;
  var CUES  = { Scatter:0, Sort:2.0, Merge:3.7, Grid:5.5, Hold:7.2, Reset:8.7 };

  // ─── Easing ───────────────────────────────────────────────────────────────
  function easeOutCubic(t)   { return 1 - Math.pow(1-t, 3); }
  function easeInOutCubic(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2; }
  function easeOutBack(t)    { var c1=1.70158, c3=c1+1; return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2); }
  var M = { enter:easeOutCubic, drift:easeInOutCubic, pop:easeOutBack };

  function clamp(v,lo,hi) { return v<lo?lo:v>hi?hi:v; }
  function lerp(a,b,t)    { return a+(b-a)*t; }
  function P(T,a,b,e)     { return e(clamp((T-a)/(b-a),0,1)); }

  // ─── Seeded RNG ───────────────────────────────────────────────────────────
  function rnd(seed) {
    var s = seed|0;
    return function() {
      s = (s+0x6D2B79F5)|0;
      var t = Math.imul(s^(s>>>15), 1|s);
      t = (t+Math.imul(t^(t>>>7), 61|t))^t;
      return ((t^(t>>>14))>>>0)/4294967296;
    };
  }

  // ─── Colour helper ────────────────────────────────────────────────────────
  function rgba(hex, a) {
    return 'rgba('+parseInt(hex.slice(1,3),16)+','+parseInt(hex.slice(3,5),16)+','+parseInt(hex.slice(5,7),16)+','+a+')';
  }

  // ─── Layout: ALL positions computed proportionally from LW/LH ────────────
  // Rationale: makes the animation correct at any aspect ratio without
  // cropping or distorting — just re-run buildLayout() with different dims.
  function buildLayout(LW, LH) {
    var CX = LW/2, CY = LH/2;
    var S  = Math.min(LW, LH); // smaller dimension for scale-invariant values

    // Zone lattice: proportional fractions validated against the original
    // ±330/640 = 0.516 horizontal; ±190/360 = 0.528 vertical
    var ZRX = CX * 0.516;
    var ZRY = CY * 0.528;

    // Tile dimensions: S-based so labels stay readable regardless of ratio
    // Original: 200/720=0.278 wide, 126/720=0.175 tall (landscape S=720)
    var TGAP = Math.max(8,  Math.round(S * 0.0194)); // 14/720
    var TW   = Math.max(56, Math.round(S * 0.278));
    var TH   = Math.max(40, Math.round(S * 0.175));
    var GW   = TW*3 + TGAP*2;
    var GH   = TH*3 + TGAP*2;

    // Font sizes: S-based so text scales with the smaller dimension
    return {
      LW, LH, CX, CY, S,
      ZRX, ZRY,
      ZX: [CX-ZRX, CX, CX+ZRX],
      ZY: [CY-ZRY, CY, CY+ZRY],
      TW, TH, TGAP, GW, GH,
      GX: CX - GW/2,
      GY: CY - GH/2 + LH*0.011,
      TRADIUS: Math.max(12, Math.round(S * 0.0306)), // 22/720

      KEY_X: LW * 0.28,
      KEY_Y: LH * 0.16,

      CTR_X: Math.max(28, LW * 0.0438), // 56/1280
      CTR_Y: Math.max(20, LH * 0.0611), // 44/720

      FN:  Math.max(10, Math.round(S * 0.0181)), // 13/720 — food pill text
      FI:  Math.max(11, Math.round(S * 0.0208)), // 15/720 — identity pill text
      FT:  Math.max(10, Math.round(S * 0.0229)), // 16.5/720 — tile label
      FE:  Math.max(16, Math.round(S * 0.0389)), // 28/720  — emoji
      FCN: Math.max(24, Math.round(S * 0.075)),  // 54/720  — counter number
      FCU: Math.max(10, Math.round(S * 0.0194)), // 14/720  — counter unit
    };
  }

  function tileBox(L, i) {
    return {
      x: L.GX + (i%3)*(L.TW+L.TGAP),
      y: L.GY + Math.floor(i/3)*(L.TH+L.TGAP),
      w: L.TW, h: L.TH
    };
  }
  function tileC(L, i) { var b=tileBox(L,i); return [b.x+b.w/2, b.y+b.h/2]; }

  // ─── Pre-compute node & identity positions ────────────────────────────────
  function buildData(L, BK) {
    var r = rnd(7), nodes = [], k = 0;
    var mg = Math.max(36, L.S * 0.072); // margin from edge

    BK.forEach(function(b, bi) {
      var zc    = [L.ZX[bi%3], L.ZY[Math.floor(bi/3)]];
      var orRX  = L.ZRX * 0.455; // orbit radius within zone (150/330 in original)
      var orRY  = L.ZRY * 0.421; // 80/190

      b.foods.forEach(function(f) {
        var a  = k*2.39996 + r()*0.6;
        var t2 = Math.pow(r(), 0.55);
        var za = r()*Math.PI*2;
        var zt = Math.pow(r(), 0.5);
        nodes.push({
          t: f, c: b.c, bi: bi, d: r(),
          // p1: scatter position (fills ~94% of each half-dimension)
          p1: [
            clamp(L.CX + Math.cos(a)*t2*L.CX*0.9375, mg, L.LW-mg),
            clamp(L.CY + Math.sin(a)*t2*L.CY*0.9167, mg*1.4, L.LH-mg*0.78)
          ],
          // p2: position within zone (for Sort stage)
          p2: [zc[0]+Math.cos(za)*zt*orRX, zc[1]+Math.sin(za)*zt*orRY],
          // p3: zone center (for Merge convergence)
          p3: zc
        });
        k++;
      });
    });

    var r2 = rnd(31), idents = [];
    BK.forEach(function(b, bi) {
      var zc = [L.ZX[bi%3], L.ZY[Math.floor(bi/3)]];
      var n  = b.ids.length;
      // Orbit radii proportional to zone spread
      var rx = L.ZRX * 0.38; // 126/330 ≈ 0.38
      var ry = L.ZRY * 0.39; // 74/190 ≈ 0.39
      b.ids.forEach(function(text, k2) {
        var a    = (k2/n)*Math.PI*2 - Math.PI/2;
        var ring = k2%2 ? 1 : 0.55;
        idents.push({ t:text, c:b.c, bi:bi, d:r2(), a:a, ring:ring, zc:zc, solo:n===1, rx:rx, ry:ry });
      });
    });

    return { nodes:nodes, idents:idents };
  }

  // ─── Canvas round-rect polyfill ───────────────────────────────────────────
  function roundRect(ctx, x, y, w, h, r) {
    if (ctx.roundRect) { ctx.roundRect(x,y,w,h,r); return; }
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
    ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
    ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
  }

  // ─── Draw: ambient light ──────────────────────────────────────────────────
  function drawLight(ctx, T, L) {
    var open   = P(T,0,1.0,M.enter)*(1-P(T,CUES.Merge,CUES.Merge+0.6,M.drift));
    var settle = P(T,CUES.Sort,CUES.Sort+0.7,M.enter)*(1-P(T,CUES.Grid-0.2,CUES.Grid+0.3,M.drift));
    var flat   = P(T,CUES.Grid,CUES.Grid+0.5,M.enter);
    var s      = lerp(L.S*1.53, L.S*1.0, flat);
    var oKey   = lerp(0.20,0.28,open)+flat*0.06;

    var g1 = ctx.createRadialGradient(L.KEY_X,L.KEY_Y,0,L.KEY_X,L.KEY_Y,s*0.5);
    g1.addColorStop(0,    rgba(IVORY_HI, 0.9*oKey));
    g1.addColorStop(0.46, rgba('#D89A27', open*0.09*oKey));
    g1.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.fillStyle=g1; ctx.fillRect(0,0,L.LW,L.LH);

    if (settle > 0.01) {
      var g2 = ctx.createRadialGradient(L.KEY_X,L.KEY_Y,0,L.KEY_X,L.KEY_Y,L.LW*0.62);
      g2.addColorStop(0, rgba(SAGE_L, 0.11*settle*0.45));
      g2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle=g2; ctx.fillRect(0,0,L.LW,L.LH);
    }

    var g3 = ctx.createRadialGradient(L.KEY_X,L.KEY_Y,L.LW*0.52,L.KEY_X,L.KEY_Y,L.LW);
    g3.addColorStop(0, 'rgba(0,0,0,0)');
    g3.addColorStop(1, rgba(SUMI, 0.03));
    ctx.fillStyle=g3; ctx.fillRect(0,0,L.LW,L.LH);
  }

  // ─── Draw: counter (top-left) ─────────────────────────────────────────────
  function drawCounter(ctx, T, L, NF, NI) {
    var v, unit;
    if (T < CUES.Merge) {
      v = lerp(0, NF, P(T,0,0.9,M.enter)); unit = '品';
    } else if (T < CUES.Grid) {
      v = lerp(NF, NI, P(T,CUES.Merge+0.35,CUES.Merge+1.25,M.drift));
      unit = v > 120 ? '品' : '種類';
    } else {
      v = lerp(NI, 9, P(T,CUES.Grid,CUES.Grid+0.6,M.drift));
      unit = v > 24 ? '種類' : 'ボタン';
    }
    var alpha = P(T,0,0.35,M.enter);
    ctx.globalAlpha = alpha;

    var numStr = String(Math.round(v));
    ctx.font = '300 '+L.FCN+'px Lato, sans-serif';
    ctx.fillStyle = SUMI;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(numStr, L.CTR_X, L.CTR_Y);

    var nw = ctx.measureText(numStr).width;
    ctx.font = L.FCU+'px "Noto Sans JP", sans-serif';
    ctx.fillStyle = STONE6;
    ctx.fillText(unit, L.CTR_X + nw + L.S*0.017, L.CTR_Y + L.FCN*0.65);

    ctx.globalAlpha = 1;
  }

  // ─── Draw: zone blobs ─────────────────────────────────────────────────────
  function drawZones(ctx, T, L, BK) {
    var o = P(T,CUES.Sort-0.15,CUES.Sort+0.7,M.drift)*(1-P(T,CUES.Grid-0.1,CUES.Grid+0.45,M.drift));
    if (o <= 0.002) return;
    BK.forEach(function(b, i) {
      var zc = [L.ZX[i%3], L.ZY[Math.floor(i/3)]];
      var w  = L.ZRX * 1.75;
      var h  = L.ZRY * 1.75;
      var g  = ctx.createRadialGradient(zc[0],zc[1],0,zc[0],zc[1],Math.max(w,h)*0.5);
      g.addColorStop(0,    rgba(b.c, 0.13*o));
      g.addColorStop(0.6,  rgba(b.c, 0.03*o));
      g.addColorStop(0.76, 'rgba(0,0,0,0)');
      ctx.fillStyle=g; ctx.fillRect(zc[0]-w/2, zc[1]-h/2, w, h);
    });
  }

  // ─── Draw: food pills (Scatter → Sort → Merge) ───────────────────────────
  function drawNodes(ctx, T, L, nodes) {
    nodes.forEach(function(n) {
      var a = P(T, 0.1*n.d, 1.05+0.35*n.d, M.pop);
      var b = P(T, CUES.Sort+0.25*n.d, CUES.Merge-0.05, M.drift);
      var c = P(T, CUES.Merge+0.1+0.45*n.d, CUES.Merge+0.75+0.45*n.d, M.drift);
      if (a <= 0) return;

      var x = lerp(L.CX, n.p1[0], a);
      var y = lerp(L.CY, n.p1[1], a);
      x = lerp(x, n.p2[0], b); y = lerp(y, n.p2[1], b);
      x = lerp(x, n.p3[0], c); y = lerp(y, n.p3[1], c);

      var o  = Math.min(1, a*1.6) * (1-c);
      if (o <= 0.004) return;

      var sc = lerp(0.72,1,a) * lerp(1,0.74,c);
      ctx.globalAlpha = o;
      ctx.save();
      ctx.translate(x,y); ctx.scale(sc,sc);

      ctx.font = '300 '+L.FN+'px "Noto Sans JP", sans-serif';
      var tw = ctx.measureText(n.t).width;
      var pw = tw + L.FN*1.23, ph = L.FN*1.69, pr = L.FN*0.85;

      ctx.beginPath(); roundRect(ctx,-pw/2,-ph/2,pw,ph,pr);
      ctx.fillStyle = rgba(IVORY_HI,0.86); ctx.fill();
      ctx.strokeStyle = rgba(n.c,0.34); ctx.lineWidth=1; ctx.stroke();

      ctx.fillStyle = n.c;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(n.t, 0, 0);

      ctx.restore(); ctx.globalAlpha=1;
    });
  }

  // ─── Draw: identity/group pills (Merge → Grid) ───────────────────────────
  function drawIdentities(ctx, T, L, idents) {
    idents.forEach(function(d) {
      var inp = P(T, CUES.Merge+0.5+0.35*d.d, CUES.Merge+1.15+0.35*d.d, M.pop);
      if (inp <= 0) return;

      var g   = P(T, CUES.Grid, CUES.Grid+0.6, M.drift);
      var orb = (T - CUES.Merge) * 0.14;
      var rx  = d.solo ? 0 : lerp(d.rx, d.rx*0.587, 1-d.ring);
      var ry  = d.solo ? 0 : lerp(d.ry, d.ry*0.587, 1-d.ring);
      var x   = d.zc[0] + Math.cos(d.a+orb)*rx*d.ring;
      var y   = d.zc[1] + Math.sin(d.a+orb)*ry*d.ring;
      var tc  = tileC(L, d.bi);
      x = lerp(x, tc[0], g); y = lerp(y, tc[1], g);

      var o = inp * (1-P(T, CUES.Grid+0.1, CUES.Grid+0.5, M.drift));
      if (o <= 0.004) return;

      var sc = lerp(0.74,1,inp) * lerp(1,0.82,g);
      ctx.globalAlpha = o;
      ctx.save();
      ctx.translate(x,y); ctx.scale(sc,sc);

      ctx.font = '400 '+L.FI+'px "Noto Sans JP", sans-serif';
      var tw = ctx.measureText(d.t).width;
      var pw = tw + L.FI*1.47, ph = L.FI*1.8, pr = L.FI*0.93;

      ctx.beginPath(); roundRect(ctx,-pw/2,-ph/2,pw,ph,pr);
      ctx.fillStyle = rgba(IVORY_HI,0.95); ctx.fill();
      ctx.strokeStyle = rgba(d.c,0.5); ctx.lineWidth=1; ctx.stroke();

      ctx.fillStyle = d.c;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(d.t, 0, 0);

      ctx.restore(); ctx.globalAlpha=1;
    });
  }

  // ─── Draw: 9 Quick Log buttons (Grid → Hold) ─────────────────────────────
  function drawTiles(ctx, T, L, BK) {
    BK.forEach(function(b, i) {
      var p = P(T, CUES.Grid+0.35+0.05*i, CUES.Grid+1.0+0.05*i, M.pop);
      if (p <= 0) return;

      var tb    = tileBox(L, i);
      var tap   = i===TAPI ? P(T,CUES.Hold+0.25,CUES.Hold+0.37,M.drift)*(1-P(T,CUES.Hold+0.41,CUES.Hold+0.63,M.drift)) : 0;
      var pulse = i===TAPI ? P(T,CUES.Hold+0.27,CUES.Hold+0.95,M.enter) : 0;
      var cx=tb.x+tb.w/2, cy=tb.y+tb.h/2;
      var sc = lerp(0.93,1,p) * lerp(1,0.97,tap);

      ctx.save(); ctx.translate(cx,cy);

      // Pulse ring
      if (pulse > 0 && pulse < 1) {
        var ps = lerp(1, 1.3, pulse);
        ctx.globalAlpha = 0.55*(1-pulse);
        ctx.strokeStyle = SAGE_L; ctx.lineWidth = 2;
        ctx.beginPath();
        roundRect(ctx,-tb.w/2*ps,-tb.h/2*ps,tb.w*ps,tb.h*ps, L.TRADIUS+lerp(0,L.S*0.028,pulse));
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      ctx.scale(sc,sc);
      ctx.globalAlpha = Math.min(1, p*1.4);

      // Card shadow
      ctx.shadowColor=rgba('#1C1C1A',0.05); ctx.shadowBlur=4; ctx.shadowOffsetY=2;
      ctx.beginPath(); roundRect(ctx,-tb.w/2,-tb.h/2,tb.w,tb.h,L.TRADIUS);
      ctx.fillStyle=RAISED; ctx.fill();
      ctx.shadowColor='transparent'; ctx.shadowBlur=0; ctx.shadowOffsetY=0;

      // Inset highlight
      ctx.beginPath(); roundRect(ctx,-tb.w/2,-tb.h/2,tb.w,1.5,1);
      ctx.fillStyle=rgba('#FFFFFF',0.6); ctx.fill();

      // Emoji
      ctx.font = L.FE+'px "Noto Sans JP", sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(b.emoji, 0, -tb.h*0.13);

      // Label
      ctx.font = '600 '+L.FT+'px "Noto Sans JP", sans-serif';
      ctx.fillStyle = '#1C1C1A';
      ctx.fillText(b.label, 0, tb.h*0.26);

      ctx.restore(); ctx.globalAlpha=1;
    });
  }

  // ─── Per-canvas setup ─────────────────────────────────────────────────────
  // Usage: <canvas data-hb-anim data-ratio="landscape|square|portrait">
  var RATIO_DIMS = {
    landscape: [1280, 720],
    square:    [720,  720],
    portrait:  [405,  720],
  };

  function setupCanvas(canvas, BK) {
    var ratio = canvas.dataset.ratio || 'landscape';
    var dims  = RATIO_DIMS[ratio] || RATIO_DIMS.landscape;
    var LW = dims[0], LH = dims[1];

    canvas.width  = LW;
    canvas.height = LH;

    var ctx  = canvas.getContext('2d');
    var L    = buildLayout(LW, LH);
    var data = buildData(L, BK);
    var NF   = data.nodes.length;  // 181
    var NI   = data.idents.length; // 71

    var startTime = null, rafId = null, visible = false;

    function draw(ts) {
      if (!startTime) startTime = ts;
      var T    = ((ts-startTime)/1000) % TOTAL;
      var fade = 1 - P(T, CUES.Reset+0.15, CUES.Reset+0.85, M.drift);

      ctx.clearRect(0,0,LW,LH);
      ctx.fillStyle = IVORY; ctx.fillRect(0,0,LW,LH);

      ctx.globalAlpha = fade;
      drawLight(ctx, T, L);
      drawCounter(ctx, T, L, NF, NI);
      drawZones(ctx, T, L, BK);
      drawNodes(ctx, T, L, data.nodes);
      drawIdentities(ctx, T, L, data.idents);
      drawTiles(ctx, T, L, BK);
      ctx.globalAlpha = 1;

      if (visible) rafId = requestAnimationFrame(draw);
    }

    function start() { if(rafId) return; startTime=null; rafId=requestAnimationFrame(draw); }
    function stop()  { if(rafId) { cancelAnimationFrame(rafId); rafId=null; } }

    // Start/stop tied to visibility (IntersectionObserver)
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function(entries) {
        entries.forEach(function(e) {
          visible = e.isIntersecting;
          visible ? start() : stop();
        });
      }, { threshold: 0.1 });
      io.observe(canvas);
    } else {
      visible = true; start();
    }
  }

  // ─── Init: wire up all [data-hb-anim] canvases ───────────────────────────
  function init() {
    if (!window.HB_BUCKETS) return;
    var BK = window.HB_BUCKETS;

    // Primary selector: data-hb-anim attribute
    var canvases = document.querySelectorAll('[data-hb-anim]');
    // Legacy fallback: id="why-anim"
    if (!canvases.length) {
      var el = document.getElementById('why-anim');
      if (el) canvases = [el];
    }
    canvases.forEach(function(c) { setupCanvas(c, BK); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
