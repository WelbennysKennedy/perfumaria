const VS = `attribute vec2 p; varying vec2 vUv; void main(){ vUv=p*0.5+0.5; gl_Position=vec4(p,0.0,1.0); }`;
const FS = `precision highp float;
uniform sampler2D uM; uniform vec2 uRes; uniform float uT,uH; uniform vec3 uP[6]; varying vec2 vUv;
float hash(vec2 p){ vec3 p3=fract(vec3(p.xyx)*0.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),u.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),u.x),u.y); }
float fbm(vec2 p){ float s=0.0,a=0.5; mat2 m=mat2(1.6,1.2,-1.2,1.6); for(int i=0;i<4;i++){ s+=a*vnoise(p); p=m*p; a*=0.5; } return s/0.9375; }
float caus(vec2 uv, float time){ vec2 p=mod(uv*6.28318,6.28318)-250.0; vec2 i=p; float c=1.0; float inten=0.005;
  for(int n=0;n<4;n++){ float tt=time*(1.0-(3.5/float(n+1))); i=p+vec2(cos(tt-i.x)+sin(tt+i.y),sin(tt-i.y)+cos(tt+i.x));
    c+=1.0/length(vec2(p.x/(sin(i.x+tt)/inten),p.y/(cos(i.y+tt)/inten))); }
  c/=4.0; c=1.17-pow(c,1.4); return clamp(pow(abs(c),8.0),0.0,1.0); }
void main(){
  vec2 st=vec2(vUv.x,1.0-vUv.y); vec2 px=st*uRes;
  float m=texture2D(uM,st).a;
  vec3 ink=vec3(0.929,0.890,0.820);
  if(uH<0.001||m<0.002){ gl_FragColor=vec4(ink*m,m); return; }
  float R=uRes.y*0.2; vec2 disp=vec2(0.0); float f=0.0;
  for(int i=0;i<6;i++){ vec2 d=px-uP[i].xy; float g=exp(-dot(d,d)/(R*R))*uP[i].z; f+=g; float r=length(d)/R;
    disp+=(d/max(length(d),1e-3))*g*sin(r*5.5-uT*2.0); }
  f=min(f,1.4);
  vec2 off=disp*R*0.07;
  vec2 q=(px+off)/uRes.y;
  float n=fbm(q*2.6+vec2(0.0,uT*0.03));
  vec3 amber=vec3(1.0,0.56,0.2);
  vec3 ember=vec3(0.93,0.42,0.12);
  vec3 col=ink*(1.0+(n-0.5)*0.1*f);
  col=mix(col,col*vec3(1.0,0.84,0.66),0.35);
  vec2 e=vec2(2.0)/uRes; vec2 so=(px+off*1.6)/uRes;
  vec2 gr=vec2(texture2D(uM,so+vec2(e.x,0.0)).a-texture2D(uM,so-vec2(e.x,0.0)).a, texture2D(uM,so+vec2(0.0,e.y)).a-texture2D(uM,so-vec2(0.0,e.y)).a);
  float rim=clamp(dot(gr,vec2(-0.6,-0.8)),0.0,1.0);
  col=mix(col,ember*(0.78+0.45*n),clamp(f*0.62,0.0,0.8));
  float c=caus(q*1.4+off/uRes.y*1.5,uT*0.45);
  col+=amber*(c*0.55+rim*0.4)*f;
  col=mix(ink,col,uH);
  gl_FragColor=vec4(col*m,m);
}`;

export async function createWordmark(host) {
  const cv = document.createElement('canvas');
  const gl = cv.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) return null;
  const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
  gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(pr, n);
  const uRes = U('uRes'), uT = U('uT'), uH = U('uH'), uP = U('uP');
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);

  const mc = document.createElement('canvas');
  const text = host.textContent.trim();
  let cw = 1, ch = 1, padT = 0;
  cv.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;display:block;';
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';

  async function layout() {
    const cs = getComputedStyle(host), F = parseFloat(cs.fontSize), lh = parseFloat(cs.lineHeight) || F;
    try { await document.fonts.load('400 ' + Math.round(F) + 'px Cinzel'); } catch (e) {}
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    let ctx = mc.getContext('2d');
    const setFont = () => { ctx.font = '400 ' + F + 'px Cinzel'; ctx.letterSpacing = (0.06 * F) + 'px'; ctx.textBaseline = 'alphabetic'; };
    setFont();
    const m = ctx.measureText(text);
    const asc = m.fontBoundingBoxAscent || F * 0.9, desc = m.fontBoundingBoxDescent || F * 0.25;
    const bY = (lh - (asc + desc)) / 2 + asc;
    padT = Math.ceil(F * 0.3);
    cw = Math.ceil(Math.max(host.clientWidth, m.width + F * 0.1)); ch = Math.ceil(lh + padT + F * 0.12);
    mc.width = Math.round(cw * dpr); mc.height = Math.round(ch * dpr);
    ctx = mc.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); setFont();
    ctx.clearRect(0, 0, cw, ch); ctx.fillStyle = '#fff'; ctx.fillText(text, 0, padT + bY);
    cv.width = mc.width; cv.height = mc.height;
    cv.style.width = cw + 'px'; cv.style.height = ch + 'px'; cv.style.top = -padT + 'px';
    gl.viewport(0, 0, cv.width, cv.height);
    gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mc);
    gl.uniform2f(uRes, cw, ch);
    draw();
  }

  const P = Array.from({ length: 6 }, () => ({ x: 0, y: 0, e: 0 }));
  const tgt = { x: 0, y: 0, in: false }; let H = 0, E = 0, t = 0, raf = 0, last = 0, lx = 0, ly = 0, lt = 0;
  const arr = new Float32Array(18);
  function draw() {
    for (let i = 0; i < 6; i++) { arr[i * 3] = P[i].x; arr[i * 3 + 1] = P[i].y; arr[i * 3 + 2] = P[i].e * (1 - i * 0.12); }
    gl.uniform3fv(uP, arr); gl.uniform1f(uT, t); gl.uniform1f(uH, H);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now; t += dt;
    H += ((tgt.in ? 1 : 0) - H) * (1 - Math.exp(-dt * (tgt.in ? 3 : 2.2)));
    E *= Math.exp(-dt * 1.1); E = Math.max(E, tgt.in ? 0.22 : 0);
    P[0].x += (tgt.x - P[0].x) * (1 - Math.exp(-dt * 12)); P[0].y += (tgt.y - P[0].y) * (1 - Math.exp(-dt * 12));
    P[0].e += (E - P[0].e) * (1 - Math.exp(-dt * 8));
    for (let i = 1; i < 6; i++) {
      const k = 1 - Math.exp(-dt * 6);
      P[i].x += (P[i - 1].x - P[i].x) * k; P[i].y += (P[i - 1].y - P[i].y) * k; P[i].e += (P[i - 1].e - P[i].e) * k;
    }
    draw();
    cv.style.filter = H > 0.01 ? 'drop-shadow(0 0 ' + (22 * H).toFixed(1) + 'px rgba(240,120,40,' + (0.32 * H).toFixed(3) + ')) drop-shadow(0 0 ' + (4 * H).toFixed(1) + 'px rgba(255,170,90,' + (0.25 * H).toFixed(3) + '))' : 'none';
    const idle = !tgt.in && H < 0.002;
    if (idle) { H = 0; E = 0; P.forEach(p => { p.e = 0; }); draw(); raf = 0; return; }
    raf = requestAnimationFrame(tick);
  }
  const wake = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } };
  const onMove = e => {
    if (e.pointerType === 'touch') return;
    const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, now = performance.now();
    if (!tgt.in) { P.forEach(p => { p.x = x; p.y = y; }); lx = x; ly = y; lt = now; }
    const sp = Math.hypot(x - lx, y - ly) / Math.max(0.008, (now - lt) / 1000);
    E = Math.max(E, Math.min(1, sp / 900)); lx = x; ly = y; lt = now;
    tgt.x = x; tgt.y = y; tgt.in = true; wake();
  };
  const onLeave = () => { tgt.in = false; wake(); };
  host.addEventListener('pointermove', onMove, { passive: true });
  host.addEventListener('pointerleave', onLeave);

  host.appendChild(cv);
  await layout();
  host.style.color = 'transparent';
  let rt; const onResize = () => { clearTimeout(rt); rt = setTimeout(layout, 150); };
  addEventListener('resize', onResize);
  return {
    dispose() {
      cancelAnimationFrame(raf); removeEventListener('resize', onResize);
      host.removeEventListener('pointermove', onMove); host.removeEventListener('pointerleave', onLeave);
      cv.remove(); host.style.color = '';
    },
  };
}
