/**
 * LP Canvas アニメーション「種類→ボタン格納」フェーズ埋め込み用 HTML。
 *
 * why-animation.js の Grid(T=5.5) 〜 Reset(T=9.5) フェーズのみを 4.0s ループで再生。
 * Scatter / Sort / Merge フェーズ、カウンターウィジェット、食材パーティクルは除外。
 *
 * 視覚フロー (5.0s):
 *   0.0-1.0s : ゾーンブロブ + 食材ラベルがゾーン内に出現・周回
 *   1.0-1.5s : ラベルがタイルへ収束 + ゾーンブロブ退場
 *   1.5-2.5s : 9 ボタンが staggered pop-in
 *   2.5-3.3s : 9 ボタン ホールド
 *   3.3-4.0s : フェードアウト → ループ
 *
 * WebView source={{ html: BUCKET_REVEAL_HTML }} で埋め込む。
 * 外部リソース依存なし。devicePixelRatio 対応済み。
 */
export const BUCKET_REVEAL_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; background: #FFFDF7; overflow: hidden; touch-action: none; }
  canvas { display: block; width: 100%; height: 100%; }
</style>
</head>
<body>
<canvas id="c"></canvas>
<script>
// ── Bucket data (ids only — foods array not needed, drawNodes is disabled) ──
var HB_BUCKETS = [
 {label:'ごはんパン麺',emoji:'\\u{1F35A}',c:'#B57E18',
  ids:['ごはん','おにぎり','おかゆ','食パン','パン(リッチ)','オートミール','シリアル','餅・団子','じゃがいも','さつまいも','うどん・蕎麦','パスタ麺','中華麺']},
 {label:'肉魚（低脂肪）',emoji:'\\u{1F413}',c:'#1F7A6E',
  ids:['鶏むね・ささみ','サラダチキン','白身魚','イカ・タコ・エビ','赤身肉','缶詰魚水煮','プロテイン','ジャーキー類']},
 {label:'卵',emoji:'\\u{1F95A}',c:'#C9A227',
  ids:['卵']},
 {label:'脂あり肉魚',emoji:'\\u{1F969}',c:'#C2571C',
  ids:['鶏もも・手羽','牛・豚普通脂','牛・豚高脂','脂魚','缶詰魚脂','ハム','ベーコン・ソーセージ','レバー','プロテインバー']},
 {label:'乳・大豆',emoji:'\\u{1F95B}',c:'#7E8478',
  ids:['牛乳','ヨーグルト','豆乳','チーズ','チーズ低脂','豆腐','油揚げ系','納豆','大豆・枝豆']},
 {label:'野菜・汁物',emoji:'\\u{1F966}',c:'#52864B',
  ids:['サラダ・生野菜','温野菜','高タンパク野菜','煮物・和え物','クリーミー系','漬物','野菜スープ']},
 {label:'果物',emoji:'\\u{1F34E}',c:'#A84A5A',
  ids:['バナナ','りんご・梨','柑橘','いちご','ベリー・ぶどう','カットフルーツ']},
 {label:'油・調味',emoji:'\\u{1F9C8}',c:'#7A5EA8',
  ids:['オイル','バター・生クリーム','マヨネーズ','ドレッシング','アボカド','ナッツ']},
 {label:'おやつ甘飲',emoji:'\\u{1F369}',c:'#8B3E14',
  ids:['チョコ','和菓子・米菓','ケーキ・洋菓子','プリン・ゼリー','アイス','クッキー・焼菓子','スナック菓子','菓子パン','甘飲料']},
];
window.HB_BUCKETS = HB_BUCKETS;
</script>
<script>
// ── why-animation.js — Grid→Hold フェーズのみ再生するよう改変 ─────────────
// 変更点:
//   1. drawCounter 削除 (カウンターウィジェット不要)
//   2. T を CUES.Grid(5.5) 起点の 4.0s ループに変更
//   3. draw() から drawNodes (食材パーティクル) を除外
//   4. lang 切替 / MutationObserver 削除
//   5. IntersectionObserver → 常時 auto-start
//   6. 背景色を IVORY から RAISED (#FFFDF7) に変更 (heroWrap と一致)
(function () {
  var IVORY_HI = '#FBF8F2';
  var SUMI     = '#1A1916';
  var STONE6   = '#6E776E';
  var RAISED   = '#FFFDF7';

  var TOTAL = 9.5;
  var CUES  = { Scatter:0, Sort:2.0, Merge:3.7, Grid:5.5, Hold:7.2, Reset:8.7 };

  // 食材ラベル出現フェーズから開始、ボタン Hold を短縮して 4.0s ループ
  var LOOP_START = 4.5;
  var LOOP_DUR   = 4.0;
  // ループ終端に合わせたカスタムフェードウィンドウ (T 7.8→8.5)
  var FADE_S = 7.8, FADE_E = 8.5;

  function easeOutCubic(t)   { return 1 - Math.pow(1-t, 3); }
  function easeInOutCubic(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2; }
  function easeOutBack(t)    { var c1=1.70158, c3=c1+1; return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2); }
  var M = { enter:easeOutCubic, drift:easeInOutCubic, pop:easeOutBack };

  function clamp(v,lo,hi) { return v<lo?lo:v>hi?hi:v; }
  function lerp(a,b,t)    { return a+(b-a)*t; }
  function P(T,a,b,e)     { return e(clamp((T-a)/(b-a),0,1)); }

  function rnd(seed) {
    var s = seed|0;
    return function() {
      s = (s+0x6D2B79F5)|0;
      var t = Math.imul(s^(s>>>15), 1|s);
      t = (t+Math.imul(t^(t>>>7), 61|t))^t;
      return ((t^(t>>>14))>>>0)/4294967296;
    };
  }

  function rgba(hex, a) {
    return 'rgba('+parseInt(hex.slice(1,3),16)+','+parseInt(hex.slice(3,5),16)+','+parseInt(hex.slice(5,7),16)+','+a+')';
  }

  function buildLayout(LW, LH) {
    var CX = LW/2, CY = LH/2;
    var S  = Math.min(LW, LH);
    var ZRX = CX * 0.516;
    var ZRY = CY * 0.528;
    var TGAP = Math.max(8,  Math.round(S * 0.0194));
    var TW   = Math.max(56, Math.round(S * 0.278));
    var TH   = Math.max(40, Math.round(S * 0.175));
    var GW   = TW*3 + TGAP*2;
    var GH   = TH*3 + TGAP*2;
    return {
      LW, LH, CX, CY, S,
      ZRX, ZRY,
      ZX: [CX-ZRX, CX, CX+ZRX],
      ZY: [CY-ZRY, CY, CY+ZRY],
      TW, TH, TGAP, GW, GH,
      GX: CX - GW/2,
      GY: CY - GH/2 + LH*0.011,
      TRADIUS: Math.max(12, Math.round(S * 0.0306)),
      KEY_X: LW * 0.28,
      KEY_Y: LH * 0.16,
      FI:  Math.max(11, Math.round(S * 0.0208)),
      FT:  Math.max(10, Math.round(S * 0.0229)),
      FE:  Math.max(16, Math.round(S * 0.0389)),
    };
  }

  function tileBox(L, i) {
    return { x: L.GX+(i%3)*(L.TW+L.TGAP), y: L.GY+Math.floor(i/3)*(L.TH+L.TGAP), w:L.TW, h:L.TH };
  }
  function tileC(L, i) { var b=tileBox(L,i); return [b.x+b.w/2, b.y+b.h/2]; }

  function buildData(L, BK) {
    // nodes は drawNodes 非使用のため空配列を返す
    var r2 = rnd(31), idents = [];
    BK.forEach(function(b, bi) {
      var zc = [L.ZX[bi%3], L.ZY[Math.floor(bi/3)]];
      var n  = b.ids.length;
      var rx = L.ZRX * 0.38;
      var ry = L.ZRY * 0.39;
      b.ids.forEach(function(text, k2) {
        var a    = (k2/n)*Math.PI*2 - Math.PI/2;
        var ring = k2%2 ? 1 : 0.55;
        idents.push({ t:text, c:b.c, bi:bi, d:r2(), a:a, ring:ring, zc:zc, solo:n===1, rx:rx, ry:ry });
      });
    });
    return { nodes:[], idents:idents };
  }

  function roundRect(ctx, x, y, w, h, r) {
    if (ctx.roundRect) { ctx.roundRect(x,y,w,h,r); return; }
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
    ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
    ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
  }

  function drawLight(ctx, T, L) {
    var flat   = P(T,CUES.Grid,CUES.Grid+0.5,M.enter);
    var s      = L.S * 1.0;
    var g1 = ctx.createRadialGradient(L.KEY_X,L.KEY_Y,0,L.KEY_X,L.KEY_Y,s*0.5);
    g1.addColorStop(0,    rgba(IVORY_HI, 0.9*flat*0.06));
    g1.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.fillStyle=g1; ctx.fillRect(0,0,L.LW,L.LH);
  }

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

      ctx.font = '400 '+L.FI+'px sans-serif';
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

  function drawTiles(ctx, T, L, BK) {
    BK.forEach(function(b, i) {
      var p = P(T, CUES.Grid+0.35+0.05*i, CUES.Grid+1.0+0.05*i, M.pop);
      if (p <= 0) return;

      var tb = tileBox(L, i);
      var cx = tb.x+tb.w/2, cy = tb.y+tb.h/2;
      var sc = lerp(0.93, 1, p);

      ctx.save(); ctx.translate(cx,cy); ctx.scale(sc,sc);
      ctx.globalAlpha = Math.min(1, p*1.4);

      ctx.shadowColor=rgba('#1C1C1A',0.12); ctx.shadowBlur=8; ctx.shadowOffsetY=3;
      ctx.beginPath(); roundRect(ctx,-tb.w/2,-tb.h/2,tb.w,tb.h,L.TRADIUS);
      ctx.fillStyle=RAISED; ctx.fill();
      ctx.shadowColor='transparent'; ctx.shadowBlur=0; ctx.shadowOffsetY=0;

      ctx.strokeStyle=rgba('#1C1C1A',0.07); ctx.lineWidth=1; ctx.stroke();

      ctx.beginPath(); roundRect(ctx,-tb.w/2,-tb.h/2,tb.w,1.5,1);
      ctx.fillStyle=rgba('#FFFFFF',0.6); ctx.fill();

      ctx.font = L.FE+'px sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(b.emoji, 0, -tb.h*0.13);

      ctx.font = '600 '+L.FT+'px sans-serif';
      ctx.fillStyle = '#1C1C1A';
      ctx.fillText(b.label, 0, tb.h*0.26);

      ctx.restore(); ctx.globalAlpha=1;
    });
  }

  // ── Canvas setup ──────────────────────────────────────────────────────────
  var canvas = document.getElementById('c');
  var dpr    = window.devicePixelRatio || 1;
  var LW, LH, L, BK, data;
  var startTime = null, rafId = null;

  function setup() {
    LW = canvas.offsetWidth  || 320;
    LH = canvas.offsetHeight || 480;
    canvas.width  = LW * dpr;
    canvas.height = LH * dpr;
    canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    L    = buildLayout(LW, LH);
    BK   = window.HB_BUCKETS;
    data = buildData(L, BK);
  }

  function draw(ts) {
    if (!startTime) startTime = ts;
    var elapsed = (ts - startTime) / 1000;
    // Grid フェーズ起点から LOOP_DUR 周期でループ
    var T    = LOOP_START + (elapsed % LOOP_DUR);
    var fade = 1 - P(T, FADE_S, FADE_E, M.drift);

    var ctx  = canvas.getContext('2d');
    ctx.clearRect(0,0,LW,LH);
    ctx.fillStyle = RAISED; ctx.fillRect(0,0,LW,LH);

    ctx.globalAlpha = fade;
    drawLight(ctx, T, L);
    drawZones(ctx, T, L, BK);
    // drawNodes: 食材パーティクル — 除外
    drawIdentities(ctx, T, L, data.idents);
    drawTiles(ctx, T, L, BK);
    ctx.globalAlpha = 1;

    rafId = requestAnimationFrame(draw);
  }

  function start() { if (rafId) return; startTime = null; rafId = requestAnimationFrame(draw); }

  setup();
  start();

  window.addEventListener('resize', function() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    setup();
    start();
  });
})();
</script>
</body>
</html>`;
