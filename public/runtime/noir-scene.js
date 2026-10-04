const THREE_URL = 'https://unpkg.com/three@0.160.0/build/three.module.js';
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

const POSES = {
  hero:    { cx: 0,    cy: 1.05, cz: 6.9, lx: 0,    ly: 0.98, ecS: 1,   ecY: 3.25, ecI: 1,    bY: 0.12, bR: -0.42, fog: 0.04,  smoke: 1,   env: 1,    key: 1,   amp: 1,    dust: 1,   dof: 0.18, ray: 1 },
  push:    { cx: 0.12, cy: 0.98, cz: 3.5, lx: 0,    ly: 0.9,  ecS: 2.8, ecY: 5.6,  ecI: 0.55, bY: 0.03, bR: -0.2,  fog: 0.1,   smoke: 1.9, env: 0.9,  key: 1,   amp: 1.2,  dust: 1,   dof: 0.4,  ray: 0.7 },
  scent:   { cx: -1.15,cy: 1.12, cz: 4.7, lx: -1.15,ly: 0.9,  ecS: 5.5, ecY: 9,    ecI: 0,    bY: 0.1,  bR: -0.6,  fog: 0.055, smoke: 1.1, env: 0.9,  key: 1,   amp: 1,    dust: 0.8, dof: 0.3,  ray: 0 },
  ritual:  { cx: 0.85, cy: 1.62, cz: 2.5, lx: 0.85, ly: 1.42, ecS: 1.8, ecY: 3.6,  ecI: 0.18, bY: 0.1,  bR: -0.28, fog: 0.045, smoke: 0.6, env: 1.1,  key: 1.1, amp: 0.8,  dust: 0.6, dof: 0.6,  ray: 0.25 },
  finalIn: { cx: 0,    cy: 1.5,  cz: 9.8, lx: 0,    ly: 1.1,  ecS: 1.1, ecY: 3.25, ecI: 0,    bY: 0.35, bR: -0.8,  fog: 0.05,  smoke: 0.45,env: 0.2,  key: 0.2, amp: 0.3,  dust: 0.3, dof: 0,    ray: 0 },
  final:   { cx: 0,    cy: 1.0,  cz: 7.4, lx: 0,    ly: 1.02, ecS: 1.1, ecY: 3.25, ecI: 0.3,  bY: 0.14, bR: -0.5,  fog: 0.03,  smoke: 0.4, env: 0.45, key: 0.4, amp: 0.35, dust: 0.35,dof: 0.15, ray: 0.35 },
};
const KEYS = Object.keys(POSES.hero);
const mix = (a, b, t) => { const o = {}; for (const k of KEYS) o[k] = lerp(a[k], b[k], t); return o; };

function immPose(u) {
  let by;
  if (u < 0.18) by = 0.9;
  else if (u < 0.34) { const f = (u - 0.18) / 0.16; by = 0.9 * (1 - f * f); }
  else { const q = u - 0.34; by = -1.2 * (1 - Math.exp(-q * 9)) - q * 2.0; }
  const cy = u < 0.34 ? lerp(1.3, 0.45, sstep(0.14, 0.36, u)) : lerp(0.45, by + 0.25, sstep(0.34, 0.5, u));
  const cross = sstep(0.36, 0.46, u);
  return { cx: lerp(-0.1, -0.45, sstep(0.3, 1, u)), cy, cz: lerp(4.5, 3.5, sstep(0.4, 1, u)), lx: -0.7, ly: by + 0.55,
    ecS: 1.35, ecY: 3.25, ecI: 0.45 * (1 - cross), bY: by, bR: -0.35 + Math.max(0, u - 0.34) * 2.4,
    fog: 0.035, smoke: 0.35 * (1 - cross), env: 1, key: 0.9, amp: 0.7, dust: 0.5 * (1 - cross), dof: 0.35, ray: 0.25 * (1 - cross) };
}
const EP = {
  intro: { cx: 0.3, cy: 0.9, cz: 4.2, lx: 0, ly: 0.7, ecS: 1, ecY: 3.25, ecI: 0, bY: 0.1, bR: -0.4, fog: 0.05, smoke: 0.12, env: 0.04, key: 0, amp: 0.2, dust: 0.12, dof: 0.2, ray: 0 },
  g: [
    { cx: 0.95, cy: 0.74, cz: 2.5, lx: 0.1, ly: 0.64, ecS: 1, ecY: 3.25, ecI: 0, bY: 0.1, bR: -0.4, fog: 0.045, smoke: 0.18, env: 1.1, key: 0.22, amp: 0.2, dust: 0.25, dof: 0.45, ray: 0 },
    { cx: 0.38, cy: 1.52, cz: 1.75, lx: 0, ly: 1.38, ecS: 1, ecY: 3.25, ecI: 0, bY: 0.1, bR: -0.25, fog: 0.04, smoke: 0.12, env: 0.55, key: 0.3, amp: 0.2, dust: 0.3, dof: 0.6, ray: 0 },
    { cx: 0.0, cy: 0.72, cz: 2.3, lx: 0, ly: 0.66, ecS: 1, ecY: 3.25, ecI: 0, bY: 0.1, bR: -0.06, fog: 0.05, smoke: 0.3, env: 0.45, key: 0.15, amp: 0.2, dust: 0.2, dof: 0.4, ray: 0 },
    { cx: -0.2, cy: 0.85, cz: 3.0, lx: 0, ly: 0.66, ecS: 1, ecY: 3.25, ecI: 0, bY: 0.1, bR: -0.5, fog: 0.05, smoke: 0.08, env: 0.03, key: 0, amp: 0.15, dust: 0.08, dof: 0.3, ray: 0 },
  ],
};
const CAUS = `
  float caus(vec2 uv, float time){ vec2 p=mod(uv*6.28318,6.28318)-250.0; vec2 i=p; float c=1.0; float inten=0.005;
    for(int n=0;n<4;n++){ float tt=time*(1.0-(3.5/float(n+1))); i=p+vec2(cos(tt-i.x)+sin(tt+i.y),sin(tt-i.y)+cos(tt+i.x));
      c+=1.0/length(vec2(p.x/(sin(i.x+tt)/inten),p.y/(cos(i.y+tt)/inten))); }
    c/=4.0; c=1.17-pow(c,1.4); return clamp(pow(abs(c),8.0),0.0,1.0); }
`;

const FX_END = `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;
const NOISE = `
  float hash(vec2 p){ vec3 p3=fract(vec3(p.xyx)*0.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
  float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),u.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),u.x),u.y); }
  float fbm(vec2 p){ float s=0.0,a=0.5; mat2 m=mat2(1.6,1.2,-1.2,1.6);
    for(int i=0;i<4;i++){ s+=a*vnoise(p); p=m*p; a*=0.5; } return s/0.9375; }
`;
const QUAD_VS = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`;

export async function createNoirScene(container, opts = {}) {
  const probe = document.createElement('canvas');
  const gl2 = !!probe.getContext('webgl2');
  if (!(gl2 || probe.getContext('webgl'))) throw new Error('WebGL unavailable');
  const THREE = await import(THREE_URL);
  try { await document.fonts.load('400 120px Cinzel'); } catch (e) {}

  const T = opts.target || {};
  const reduced = !!opts.reduced;
  const zones = opts.zones || {};
  const small = innerWidth < 820;

  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  const pixelRatio = Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.5);
  const scrollPixelRatio = Math.min(pixelRatio, 0.9);
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  const CLEAR = 0x060404;
  renderer.setClearColor(CLEAR, 1);
  const cv = renderer.domElement;
  cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  container.prepend(cv);

  const scene = new THREE.Scene();
  const fogBase = new THREE.Color(0x060404), fogSmoke = new THREE.Color(0x0d0c0b), fogCedar = new THREE.Color(0x0b0704);
  scene.fog = new THREE.FogExp2(0x060404, 0.04);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 120);
  const look = new THREE.Vector3();

  // Studio environment: crisp strip softboxes + amber ring, for glass/metal reflections
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x010101);
  const em = (geo, col, i, pos, rot) => {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(i), side: THREE.DoubleSide }));
    m.position.set(...pos); if (rot) m.rotation.set(...rot); env.add(m);
  };
  em(new THREE.TorusGeometry(5, 0.12, 16, 128), 0xff9a44, 5, [0, 2, -9]);
  em(new THREE.PlaneGeometry(0.35, 8), 0xfff0e0, 9, [-5, 1, 1.5], [0, Math.PI / 2, 0]);
  em(new THREE.PlaneGeometry(0.18, 8), 0xffd6a8, 5, [5, 1, -0.5], [0, -Math.PI / 2, 0]);
  em(new THREE.PlaneGeometry(0.12, 6), 0xffc890, 2, [2.5, 1, 5], [0, Math.PI, 0]);
  em(new THREE.PlaneGeometry(6, 2.2), 0x3a2a1c, 1.2, [0, 7, 0], [Math.PI / 2, 0, 0]);
  em(new THREE.PlaneGeometry(40, 0.25), 0xff8a3a, 0.6, [0, -0.2, -12]);
  em(new THREE.PlaneGeometry(2.6, 7), 0xffe6cc, 0.025, [-3.2, 2, 6], [0, Math.PI - 0.45, 0]);
  em(new THREE.PlaneGeometry(0.3, 7), 0xfff2e4, 1.6, [-1.6, 2, 6.5], [0, Math.PI - 0.2, 0]);
  em(new THREE.PlaneGeometry(8, 0.3), 0xffe0c0, 1.5, [0, 6, 3], [Math.PI / 2 + 0.5, 0, 0]);
  em(new THREE.PlaneGeometry(0.45, 7), 0xff9a44, 7, [4.2, 1, -2.6], [0, -Math.PI / 2 + 0.55, 0]);
  em(new THREE.PlaneGeometry(0.25, 7), 0xffb070, 4, [-4.4, 1, -2.2], [0, Math.PI / 2 - 0.5, 0]);
  em(new THREE.PlaneGeometry(0.2, 6), 0xfff4e6, 6, [0.9, 1.5, 6], [0, Math.PI, 0]);
  scene.environment = pmrem.fromScene(env, 0.02).texture;

  const world = new THREE.Group();
  scene.add(world);

  world.add(new THREE.HemisphereLight(0x2a1c10, 0x000000, 0.25));
  const key = new THREE.DirectionalLight(0xffe2c0, 0.8); key.position.set(-3, 4, 5); world.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xff9a3a, 1.8); rim.position.set(0.5, 3, -6); world.add(rim, rim.target);
  const amberC = new THREE.Color(0xff9a3a), cedarC = new THREE.Color(0x9a6a36);
  const pt = new THREE.PointLight(0xff8a2a, 1.2, 3, 2); pt.position.set(0, 1.1, -0.8); world.add(pt);
  const rim2 = new THREE.DirectionalLight(0xffa048, 2.4); rim2.position.set(3.5, 1.6, -3); world.add(rim2, rim2.target);
  const capKey = new THREE.SpotLight(0xffe8cc, 6, 6, 0.35, 0.8, 1.5); capKey.position.set(-1.2, 3.6, 2.2); world.add(capKey, capKey.target); capKey.target.position.set(0, 1.35, 0);

  // Rounded box with segments clustered in the micro-bevel and analytic normals
  function roundedBox(w, h, d, r, seg = 24, meniscus = 0) {
    const g = new THREE.BoxGeometry(w, h, d, seg, seg, seg);
    const P = g.attributes.position, N = g.attributes.normal;
    const hx = w / 2, hy = h / 2, hz = d / 2, v = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
    const remap = (x, hh) => { const a = (hh - r) / hh, t = Math.abs(x) / hh; const tt = t < 0.5 ? (t / 0.5) * a : a + ((t - 0.5) / 0.5) * (1 - a); return Math.sign(x) * tt * hh; };
    for (let i = 0; i < P.count; i++) {
      v.set(remap(P.getX(i), hx), remap(P.getY(i), hy), remap(P.getZ(i), hz));
      c.set(clamp(v.x, -hx + r, hx - r), clamp(v.y, -hy + r, hy - r), clamp(v.z, -hz + r, hz - r));
      n.subVectors(v, c); if (n.lengthSq() < 1e-12) n.set(0, 1, 0); n.normalize();
      v.copy(c).addScaledVector(n, r);
      if (meniscus && v.y > hy - r * 1.2) {
        const e = Math.max(sstep(hx - 0.06, hx, Math.abs(v.x)), sstep(hz - 0.06, hz, Math.abs(v.z)));
        v.y += meniscus * e * e;
      }
      P.setXYZ(i, v.x, v.y, v.z); N.setXYZ(i, n.x, n.y, n.z);
    }
    return g;
  }

  // Roughness imperfections: faint smudges + speckle
  const rc = document.createElement('canvas'); rc.width = rc.height = 512; const rx = rc.getContext('2d');
  rx.fillStyle = 'rgb(40,40,40)'; rx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 26; i++) {
    const x = Math.random() * 512, y = Math.random() * 512, r = 18 + Math.random() * 70;
    const gr = rx.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(120,120,120,0.35)'); gr.addColorStop(1, 'rgba(120,120,120,0)');
    rx.fillStyle = gr; rx.fillRect(0, 0, 512, 512);
  }
  for (let i = 0; i < 1400; i++) { const s = 90 + Math.random() * 120 | 0; rx.fillStyle = `rgba(${s},${s},${s},0.35)`; rx.fillRect(Math.random() * 512, Math.random() * 512, 1, 1); }
  const roughTex = new THREE.CanvasTexture(rc); roughTex.wrapS = roughTex.wrapT = THREE.RepeatWrapping;

  // Bottle dimensions (glass local: centered)
  const W = 0.88, H = 1.14, D = 0.56, WT = 0.1, BASE = 0.2, TOP = 0.1;
  const bottle = new THREE.Group(); world.add(bottle);
  const glassU = {
    uCamObj: { value: new THREE.Vector3() }, uLightObj: { value: new THREE.Vector3(0, 3, -14) },
    uHalf: { value: new THREE.Vector3(W / 2, H / 2, D / 2) },
    uCMin: { value: new THREE.Vector3(-W / 2 + WT, -H / 2 + BASE, -D / 2 + WT) },
    uCMax: { value: new THREE.Vector3(W / 2 - WT, H / 2 - TOP, D / 2 - WT) },
    uSigma: { value: new THREE.Vector3(5.5, 8.5, 12.5) }, uEdgeGlow: { value: 1 }, uInner: { value: 1 }, uAmb: { value: new THREE.Color(1.0, 0.46, 0.13) },
  };
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x020101, metalness: 0, roughness: 0.06, roughnessMap: roughTex, transmission: 0, transparent: true, opacity: 0.8, thickness: 0.4, ior: 1.52,
    attenuationColor: new THREE.Color(0x6a3a12), attenuationDistance: 0.7, clearcoat: 1, clearcoatRoughness: 0.03,
    specularIntensity: 1, envMapIntensity: 1.6,
  });
  glassMat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, glassU);
    sh.vertexShader = 'varying vec3 vObjP; varying vec3 vObjN;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vObjP = transformed; vObjN = objectNormal;');
    sh.fragmentShader = `varying vec3 vObjP; varying vec3 vObjN;
      uniform vec3 uCamObj,uLightObj,uHalf,uCMin,uCMax,uSigma,uAmb; uniform float uEdgeGlow,uInner;
      vec2 slab(vec3 ro, vec3 rd, vec3 bmin, vec3 bmax, out vec3 nE){
        vec3 inv=1.0/(rd+sign(rd)*1e-6+vec3(1e-7)); vec3 t0=(bmin-ro)*inv, t1=(bmax-ro)*inv; vec3 a=min(t0,t1), b=max(t0,t1);
        float tn=max(max(a.x,a.y),a.z), tf=min(min(b.x,b.y),b.z);
        nE = tn==a.x ? vec3(-sign(rd.x),0.0,0.0) : (tn==a.y ? vec3(0.0,-sign(rd.y),0.0) : vec3(0.0,0.0,-sign(rd.z)));
        return vec2(tn,tf); }
      ` + sh.fragmentShader.replace('#include <transmission_fragment>', `#include <transmission_fragment>
      {
        vec3 rdO=normalize(vObjP-uCamObj); vec3 nO=normalize(vObjN);
        vec3 rr=refract(rdO,nO,1.0/1.52); if(dot(rr,rr)<0.01) rr=rdO; rr=normalize(rr);
        vec3 dn; vec2 outer=slab(vObjP,rr,-uHalf,uHalf,dn); float tExit=max(outer.y,0.0);
        vec3 nC; vec2 cav=slab(vObjP,rr,uCMin,uCMax,nC);
        bool hit=cav.x>0.0 && cav.x<cav.y && cav.x<tExit;
        float path=hit?cav.x:tExit;
        totalDiffuse*=exp(-uSigma*path);
        vec3 Ld=normalize(uLightObj-vObjP); float al=pow(max(dot(rr,Ld),0.0),3.0);
        vec3 amb=uAmb;
        float al8=al*al; al8*=al8;
        totalDiffuse+=amb*uEdgeGlow*al8*(1.0-exp(-path*2.2))*(hit?0.2:1.0)*0.015*(1.0-abs(nO.y)*0.85);
        float inBase=step(vObjP.y,uCMin.y);
        float bLine=exp(-abs(vObjP.y-uCMin.y)*55.0);
        totalDiffuse+=amb*uEdgeGlow*(bLine*0.22+inBase*0.03*(1.0-exp(-path*3.0)));
        float ex=smoothstep(uHalf.x-0.03,uHalf.x,abs(vObjP.x)), ey=smoothstep(uHalf.y-0.03,uHalf.y,abs(vObjP.y)), ez=smoothstep(uHalf.z-0.03,uHalf.z,abs(vObjP.z));
        float side=ex*ez+ex*ey+ey*ez;
        float rt=smoothstep(-0.2,0.6,vObjP.x/uHalf.x);
        totalDiffuse+=amb*uEdgeGlow*side*(0.35+0.9*rt)*(0.3+al);
        if(hit){
          vec3 hp=vObjP+rr*cav.x; float fr=pow(1.0-abs(dot(rr,nC)),4.0);
          vec3 dm=min(hp-uCMin,uCMax-hp); float lo=min(dm.x,min(dm.y,dm.z)), hi=max(dm.x,max(dm.y,dm.z)); float md=dm.x+dm.y+dm.z-lo-hi;
          float el=smoothstep(0.018,0.0,md);
          totalDiffuse+=(vec3(1.0,0.8,0.6)*fr*0.012+amb*el*0.006*(0.35+al))*uInner;
        }
      }`);
  };
    const glass = new THREE.Mesh(roundedBox(W, H, D, 0.026, 28), glassMat); glass.renderOrder = 1; glass.position.y = H / 2; bottle.add(glass);

  // Liquid: opaque, rendered into the transmission pass; glows only at grazing edges / backlight
  const cavW = W - 2 * WT - 0.004, cavD = D - 2 * WT - 0.004, cavH = H - BASE - TOP, liqH = cavH * 0.93;
  const liqMat = new THREE.ShaderMaterial({
    uniforms: { uGlow: { value: 1 }, uLight: { value: new THREE.Vector3(0, 3, -14) }, uLvl: { value: new THREE.Vector2(0, 1) }, uTint: { value: new THREE.Color(1.0, 0.56, 0.2) }, uT: { value: 0 }, uBands: { value: 0 } },
    vertexShader: `varying vec3 vW; varying vec3 vN; varying float vY; varying float vX; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); vY=position.y; vX=position.x; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float uGlow,uT,uBands; uniform vec3 uLight,uTint; uniform vec2 uLvl; varying vec3 vW; varying vec3 vN; varying float vY; varying float vX;
      void main(){ vec3 V=normalize(cameraPosition-vW); vec3 N=normalize(vN); float nv=abs(dot(N,V));
        vec3 Ld=normalize(uLight-vW); float back=pow(max(dot(-V,Ld),0.0),14.0);
        float edge=pow(1.0-nv,3.0); float g=smoothstep(uLvl.x,uLvl.y,vY);
        vec3 amber=uTint;
        float lowG=pow(1.0-g,4.0); float line=exp(-(vY-uLvl.x)*28.0);
        vec3 col=vec3(0.006,0.003,0.001)+amber*(lowG*0.42+edge*(0.06+0.6*lowG)+back*(0.01+0.6*edge)+line*1.2)*uGlow;
        col+=vec3(1.0,0.78,0.5)*line*line*0.3*uGlow;
        float sw=sin(vX*38.0+vY*22.0+uT*0.6+sin(vY*14.0-uT*0.4)*2.0)*sin(vX*17.0-vY*31.0-uT*0.45);
        col+=amber*smoothstep(0.55,1.0,sw)*0.05*(0.3+lowG)*uGlow;
        float sheen=smoothstep(0.16,0.0,abs(vX+0.45*vY+0.12))*smoothstep(uLvl.x,uLvl.y,vY);
        col+=vec3(1.0,0.86,0.7)*sheen*0.05*(0.5+0.5*nv);
        col+=vec3(1.0,0.8,0.6)*smoothstep(0.93,1.0,vY/uLvl.y)*0.03;
        float top=smoothstep(0.6,0.95,N.y); col+=amber*top*pow(1.0-nv,2.0)*0.3*uGlow;
        if(uBands>0.001){ float yb=(vY-uLvl.x)/(uLvl.y-uLvl.x)+0.035*sin(vX*7.0+uT*0.25)+0.02*sin(vX*17.0-uT*0.4);
          float wS=smoothstep(0.6,0.8,yb), wC=1.0-smoothstep(0.16,0.38,yb), wA=clamp(1.0-wS-wC,0.0,1.0);
          float n=0.6+0.4*sin(vX*9.0+yb*18.0+uT*0.35)*sin(vX*4.0-uT*0.22+yb*6.0);
          vec3 bc=vec3(0.5,0.56,0.66)*wS*0.09+vec3(1.0,0.55,0.18)*wA*0.15+vec3(0.72,0.2,0.07)*wC*0.14;
          float seams=exp(-pow((yb-0.7)/0.025,2.0))+exp(-pow((yb-0.27)/0.025,2.0));
          col+=(bc*n+vec3(1.0,0.78,0.5)*seams*0.035)*uBands; }
        gl_FragColor=vec4(col,1.0); ${FX_END} }`,
  });
  liqMat.uniforms.uLvl.value.set(-liqH / 2, liqH / 2);
  const liquid = new THREE.Mesh(roundedBox(cavW, liqH, cavD, 0.014, 24, 0.008), liqMat);
  liquid.position.y = BASE + liqH / 2; bottle.add(liquid);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, cavH, 10), new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.2, emissive: 0x3a1a06, emissiveIntensity: 0.4 }));
  tube.position.set(0, BASE + cavH / 2, 0); bottle.add(tube);

  // Label: printed ivory-gold ink + faint smoked inset hairline
  const lc = document.createElement('canvas'); lc.width = 1024; lc.height = 384;
  const lx = lc.getContext('2d'); lx.fillStyle = '#000'; lx.fillRect(0, 0, 1024, 384);
  lx.globalCompositeOperation = 'lighter';
  const rr2 = (x, y, w, h, r) => { lx.beginPath(); lx.moveTo(x + r, y); lx.arcTo(x + w, y, x + w, y + h, r); lx.arcTo(x + w, y + h, x, y + h, r); lx.arcTo(x, y + h, x, y, r); lx.arcTo(x, y, x + w, y, r); lx.closePath(); };
  lx.fillStyle = 'rgb(255,0,0)'; lx.font = '400 96px Cinzel, serif'; lx.textBaseline = 'middle';
  const letters = 'NOIR'.split(''), sp = 52, widths = letters.map(c => lx.measureText(c).width);
  let px0 = (1024 - (widths.reduce((a, b) => a + b, 0) + sp * (letters.length - 1))) / 2;
  letters.forEach((c, i) => { lx.fillText(c, px0, 196); px0 += widths[i] + sp; });
  const ltex = new THREE.CanvasTexture(lc); ltex.anisotropy = 8;
  const labelMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { map: { value: ltex }, uKey: { value: new THREE.Vector3(-3, 4, 5).normalize() }, uI: { value: 1 } },
    vertexShader: `varying vec2 vUv; varying vec3 vW; varying vec3 vN; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; vN=normalize(mat3(modelMatrix)*vec3(0.0,0.0,1.0)); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform sampler2D map; uniform vec3 uKey; uniform float uI; varying vec2 vUv; varying vec3 vW; varying vec3 vN;
      void main(){ vec3 m=texture2D(map,vUv).rgb; vec3 V=normalize(cameraPosition-vW); vec3 N=normalize(vN);
        vec3 R=reflect(-V,N); float sp=pow(max(dot(R,normalize(uKey)),0.0),24.0); float fr=pow(1.0-max(dot(N,V),0.0),3.0);
        vec3 ink=vec3(0.92,0.74,0.48);
        vec3 lit=ink*(0.55+sp*1.8+fr*0.4)*uI;
        float a=m.r*0.96;
        vec3 col=mix(vec3(0.0), lit, m.r/max(a,0.001)*m.r);
        col+=vec3(0.7,0.55,0.38)*m.g*(0.05+sp*0.6)*uI; a=max(a,m.g*0.25);
        gl_FragColor=vec4(col,a); ${FX_END} }`,
  });
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.1875), labelMat);
  label.position.set(0, 0.66, D / 2 + 0.0015); label.renderOrder = 3; bottle.add(label);

  // Atomizer + anodized cap
  const polished = new THREE.MeshPhysicalMaterial({ color: 0xd2ad84, metalness: 1, roughness: 0.1, envMapIntensity: 1.2 });
  const darkMetal = new THREE.MeshPhysicalMaterial({ color: 0x2b241e, metalness: 1, roughness: 0.22, envMapIntensity: 1.1 });
  const capMat = new THREE.MeshPhysicalMaterial({ color: 0xc9a27a, metalness: 1, roughness: 0.13, clearcoat: 0.6, clearcoatRoughness: 0.06, envMapIntensity: 1.2 });
  const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.175, 0.046, 96), polished); ferrule.position.y = H + 0.023; bottle.add(ferrule);
  const lip = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.012, 96), polished); lip.position.y = H + 0.052; bottle.add(lip);
  const neckShadow = new THREE.Mesh(new THREE.CylinderGeometry(0.178, 0.178, 0.004, 96), darkMetal); neckShadow.position.y = H + 0.045; bottle.add(neckShadow);
  const actuator = new THREE.Group(); actuator.position.y = H + 0.05; bottle.add(actuator);
  const act = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.08, 0.09, 64), darkMetal); act.position.y = 0.045; actuator.add(act);
  const actTop = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.078, 0.008, 64), polished); actTop.position.y = 0.094; actuator.add(actTop);
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.012, 16), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  hole.rotation.z = Math.PI / 2; hole.position.set(0.077, 0.05, 0); actuator.add(hole);
  const capG = new THREE.Group(); bottle.add(capG);
  const CAPH = 0.34, capBase = H + 0.058;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.205, CAPH, 160, 1), capMat); cap.position.y = CAPH / 2 + 0.008; capG.add(cap);
  const capTop = new THREE.Mesh(new THREE.TorusGeometry(0.199, 0.006, 16, 160), capMat); capTop.rotation.x = Math.PI / 2; capTop.position.y = CAPH + 0.008; capG.add(capTop);
  const capFace = new THREE.Mesh(new THREE.CircleGeometry(0.2, 160), capMat); capFace.rotation.x = -Math.PI / 2; capFace.position.y = CAPH + 0.0135; capG.add(capFace);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.008, 160), darkMetal); band.position.y = 0.004; capG.add(band);
  capG.position.y = capBase;
  const nozzleL = new THREE.Vector3(0.09, H + 0.1, 0);

  const NOTE_C = [new THREE.Color(0.62, 0.7, 0.92), new THREE.Color(1.0, 0.56, 0.2), new THREE.Color(0.95, 0.26, 0.12)];
  const noteTint = new THREE.Color(1.0, 0.56, 0.2), tmpC2 = new THREE.Color();
  const hc = document.createElement('canvas'); hc.width = hc.height = 256; const hx = hc.getContext('2d');
  const hg = hx.createRadialGradient(128, 128, 0, 128, 128, 128); hg.addColorStop(0, 'rgba(255,255,255,0.55)'); hg.addColorStop(0.35, 'rgba(255,255,255,0.16)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
  hx.fillStyle = hg; hx.fillRect(0, 0, 256, 256);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(hc), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  const haloOff = new THREE.Vector3(0, 0.75, -0.9); world.add(halo);

  // Eclipse: real occluding sphere in front of an asymmetric corona
  const ecl = new THREE.Group(); ecl.position.set(0, 3.25, -14); world.add(ecl);
  const glowMat = new THREE.ShaderMaterial({
    uniforms: { uI: { value: 1 }, uT: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `varying vec2 vUv; uniform float uI,uT; ${NOISE}
      void main(){ vec2 p=(vUv-0.5)*5.0; float r=length(p); float a=atan(p.y,p.x); vec2 dir=p/max(r,1e-4);
        float hot=pow(max(0.0,cos(a-0.72)),10.0);
        float irr=fbm(dir*2.2+vec2(uT*0.006,0.0));
        float str=(0.22+0.6*irr+1.7*hot)*(0.55+0.45*smoothstep(-1.0,0.7,sin(a+0.5)));
        float rimK=46.0-hot*18.0;
        float rim=exp(-max(r-0.985,0.0)*rimK)*smoothstep(0.96,0.985,r);
        float s=fbm(dir*7.0+dir*r*0.35+vec2(0.0,uT*0.004));
        float cor=exp(-max(r-1.0,0.0)*(2.5-hot*0.7))*smoothstep(0.97,1.03,r)*(0.3+1.1*s*s);
        float haze=exp(-max(r-1.0,0.0)*0.6)*0.03*smoothstep(0.98,1.1,r);
        float I=(rim*(1.1+4.2*hot)*str+cor*(0.2+0.8*hot)*str+haze)*uI*smoothstep(2.5,1.7,r);
        vec3 c=mix(vec3(1.0,0.44,0.13),vec3(1.0,0.76,0.5),clamp(rim*hot,0.0,1.0));
        gl_FragColor=vec4(c*I,1.0); ${FX_END} }`,
  });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(15, 15), glowMat); glow.position.z = -0.4; ecl.add(glow);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(2.93, 96, 48), new THREE.MeshStandardMaterial({ color: 0x060504, roughness: 0.9, envMapIntensity: 0.15 })); ecl.add(moon);

  // Volumetric fog layers: domain-warped noise, height falloff, HG forward scattering
  const fogMat = (o) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: {
      uT: { value: 0 }, uDens: { value: o.dens }, uScale: { value: o.scale }, uSpeed: { value: o.speed }, uRise: { value: o.rise || 0 },
      uSharp: { value: o.sharp || 1 }, uSeed: { value: Math.random() * 10 }, uHy: { value: o.hy }, uHk: { value: o.hk }, uLow: { value: o.low || 0.05 },
      uBase: { value: new THREE.Color(0.02, 0.016, 0.013) }, uAmber: { value: new THREE.Color(1.0, 0.5, 0.18) },
      uSun: { value: new THREE.Vector3() }, uSunI: { value: 1 }, uGlow: { value: 1 }, uBottle: { value: new THREE.Vector3() }, uPulse: { value: 1 },
    },
    vertexShader: `varying vec3 vW; varying vec2 vUv; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float uT,uDens,uScale,uSpeed,uRise,uSharp,uSeed,uHy,uHk,uLow,uSunI,uGlow,uPulse; uniform vec3 uBase,uAmber,uSun,uBottle;
      varying vec3 vW; varying vec2 vUv; ${NOISE}
      void main(){ float y=abs(vW.y);
        vec2 p=vec2(vW.x,y)*uScale+vec2(uSeed*7.1,uSeed*3.3);
        vec2 fl=vec2(uT*uSpeed,-uT*uRise);
        vec2 q=vec2(fbm(p+fl*0.6),fbm(p+vec2(5.2,1.3)-fl*0.4));
        float n=fbm(p+1.8*q+fl+vec2(0.0,uT*0.01));
        float d=smoothstep(0.5-0.5/uSharp,0.5+0.5/uSharp,n);
        float hp=exp(-max(y-uHy,0.0)*uHk)*smoothstep(0.0,uLow,y);
        float ed=smoothstep(0.0,0.2,vUv.x)*smoothstep(1.0,0.8,vUv.x)*smoothstep(1.0,0.7,vUv.y);
        float cf=smoothstep(0.7,2.4,distance(cameraPosition,vW));
        float a=d*hp*ed*cf*uDens*uPulse;
        vec3 V=normalize(vW-cameraPosition); vec3 Ls=normalize(uSun-vW); float c=dot(V,Ls);
        float g=0.6; float ph=(1.0-g*g)/pow(1.0+g*g-2.0*g*c,1.5);
        vec3 bb=vW-uBottle; float bl=exp(-dot(bb,bb)*0.7);
        vec3 lit=uBase+uAmber*uSunI*ph*0.028*(0.4+0.6*n)+uAmber*uGlow*bl*0.05;
        lit*=mix(1.0,0.5,d);
        gl_FragColor=vec4(lit,clamp(a,0.0,0.92)); ${FX_END} }`,
  });
  const fogLayers = [];
  const addFog = (o, w, h, x, y, z) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), fogMat(o)); m.position.set(x, y, z); m.userData = o; world.add(m); fogLayers.push(m);
  };
  const LOW = { dens: 0.6, scale: 0.38, speed: 0.018, hy: 0.08, hk: 3.6, low: 0.05, kind: 'low' };
  const BEH = { dens: 0.3, scale: 0.55, speed: 0.01, rise: 0.02, hy: 0.4, hk: 0.55, sharp: 1.3, kind: 'beh' };
  const WSP = { dens: 0.4, scale: 0.9, speed: 0.06, sharp: 3, hy: 1.5, hk: 1.6, low: 1.0, kind: 'wisp' };
  addFog({ ...LOW }, 18, 2.2, 0, 0.6, 1.3);
  addFog({ ...LOW, dens: 0.7 }, 20, 2.2, 0, 0.6, -0.7);
  addFog({ ...LOW, dens: 0.75, scale: 0.3 }, 26, 2.4, 0, 0.7, -2.8);
  if (!small) addFog({ ...LOW, dens: 0.8, scale: 0.24 }, 34, 2.6, 0, 0.8, -6);
  addFog({ ...BEH }, 11, 6, 0, 2.4, -1.4);
  addFog({ ...BEH, dens: 0.35, scale: 0.42 }, 16, 7, 0, 2.9, -3.2);
  if (!small) addFog({ ...BEH, dens: 0.4, scale: 0.3, hy: 1.2 }, 26, 9, 0, 3.6, -7);
  addFog({ ...WSP, ph: 0 }, 12, 1.4, 0, 1.45, -1.0);
  if (!small) addFog({ ...WSP, ph: 2.4, hy: 2.3, speed: -0.045 }, 16, 1.6, 0, 2.3, -3.8);

  // Dust
  const ND = small ? 180 : 420;
  const dg = new THREE.BufferGeometry(); const dp = new Float32Array(ND * 3), ds = new Float32Array(ND);
  for (let i = 0; i < ND; i++) { dp[i * 3] = (Math.random() - 0.5) * 14; dp[i * 3 + 1] = Math.random() * 5; dp[i * 3 + 2] = -10 + Math.random() * 13; ds[i] = Math.random(); }
  dg.setAttribute('position', new THREE.BufferAttribute(dp, 3)); dg.setAttribute('aS', new THREE.BufferAttribute(ds, 1));
  const dustMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uScale: { value: 800 }, uI: { value: 1 } },
    vertexShader: `attribute float aS; uniform float uT,uScale,uI; varying float vA;
      void main(){ vec3 p=position; p.y=mod(p.y+uT*(0.02+aS*0.03),5.0);
        p.x+=sin(uT*0.09+aS*31.0)*0.3; p.z+=cos(uT*0.07+aS*17.0)*0.3;
        vec4 mv=modelViewMatrix*vec4(p,1.0); gl_Position=projectionMatrix*mv;
        gl_PointSize=max(1.0,uScale*(0.005+aS*0.009)/-mv.z);
        float tw=0.5+0.5*sin(uT*(0.6+aS)+aS*50.0);
        vA=uI*(0.2+0.8*tw)*smoothstep(0.0,0.6,abs(p.y))*smoothstep(5.0,4.0,p.y); }`,
    fragmentShader: `varying float vA; void main(){ float d=length(gl_PointCoord-0.5); float a=smoothstep(0.5,0.0,d);
      gl_FragColor=vec4(vec3(1.0,0.7,0.42)*a*vA*0.55,1.0); ${FX_END} }`,
  });
  const dust = new THREE.Points(dg, dustMat); world.add(dust);

  // Mist (ritual)
  const NM = small ? 700 : 1600;
  const mg = new THREE.BufferGeometry(); const mp = new Float32Array(NM * 3), ms = new Float32Array(NM), mr = new Float32Array(NM * 3);
  for (let i = 0; i < NM; i++) {
    ms[i] = Math.random();
    const g = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
    mr[i * 3] = g(); mr[i * 3 + 1] = g() * 0.7; mr[i * 3 + 2] = g();
  }
  mg.setAttribute('position', new THREE.BufferAttribute(mp, 3)); mg.setAttribute('aS', new THREE.BufferAttribute(ms, 1)); mg.setAttribute('aR', new THREE.BufferAttribute(mr, 3));
  const mistMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uMist: { value: 0 }, uT: { value: 0 }, uScale: { value: 800 }, uO: { value: new THREE.Vector3() }, uD: { value: new THREE.Vector3(1, 0.12, 0.25).normalize() } },
    vertexShader: `attribute float aS; attribute vec3 aR; uniform float uMist,uT,uScale; uniform vec3 uO,uD; varying float vA;
      void main(){ float age=uMist*1.5-aS*0.9; float a=clamp(age,0.0,1.4);
        vec3 p=uO+uD*(a*1.25+a*a*0.35)+aR*(0.01+a*a*0.55);
        p.y+=a*a*0.16; p.x+=sin(uT*0.35+aS*40.0)*a*0.12; p.y+=sin(uT*0.27+aS*23.0)*a*0.1; p.z+=cos(uT*0.3+aS*11.0)*a*0.12;
        vec4 mv=modelViewMatrix*vec4(p,1.0); gl_Position=projectionMatrix*mv;
        gl_PointSize=uScale*(0.012+a*0.16)/-mv.z;
        vA=step(0.0,age)*smoothstep(0.0,0.05,a)*(1.0-smoothstep(0.55,1.4,a)); }`,
    fragmentShader: `varying float vA; void main(){ float d=length(gl_PointCoord-0.5); float s=smoothstep(0.5,0.0,d);
      gl_FragColor=vec4(vec3(0.95,0.84,0.7)*s*s*vA*0.035,1.0); ${FX_END} }`,
  });
  const mist = new THREE.Points(mg, mistMat); mist.frustumCulled = false; world.add(mist);

  // Water: multi-frequency waves + fbm, Fresnel, streaked reflection, near-bottle ripples
  const reflRT = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType });
  const waterMat = new THREE.ShaderMaterial({
    uniforms: {
      tR: { value: reflRT.texture }, uRes: { value: new THREE.Vector2(1, 1) }, uT: { value: 0 }, uAmp: { value: 1 },
      uWarm: { value: 0.15 }, uGrain: { value: 0 }, uFogD: { value: 0.04 }, uFog: { value: fogBase.clone() }, uCam: { value: new THREE.Vector3() },
      uSunPos: { value: new THREE.Vector3(0, 3, -14) }, uSun: { value: 1 }, uB: { value: new THREE.Vector3() }, uNear: { value: 1 }, uSpill: { value: 1 },
      uImp: { value: new THREE.Vector4(0, 0, -1, 0) },
    },
    side: THREE.DoubleSide,
    vertexShader: `varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform sampler2D tR; uniform vec2 uRes; uniform float uT,uAmp,uWarm,uGrain,uFogD,uSun,uNear,uSpill; uniform vec3 uFog,uCam,uSunPos,uB; uniform vec4 uImp; varying vec3 vW;
      ${NOISE} ${CAUS}
      float hgt(vec2 p, float lod){
        float h=sin(dot(p,vec2(0.8,0.6))*1.15+uT*0.42)*0.3;
        h+=sin(dot(p,vec2(-0.5,0.86))*1.9-uT*0.55)*0.17;
        h+=sin(dot(p,vec2(0.97,-0.24))*3.4+uT*0.83)*0.08*lod;
        vec2 q=p*1.7+vec2(uT*0.05,-uT*0.035); float a=0.24; mat2 m=mat2(1.6,1.2,-1.2,1.6);
        for(int i=0;i<4;i++){ h+=(vnoise(q)-0.5)*a; q=m*q+uT*0.07; a*=0.5*lod; }
        vec2 d=p-uB.xz; float r=length(d);
        h+=uNear*sin(r*17.0-uT*1.9)*exp(-r*1.5)*smoothstep(0.08,0.45,r)*0.16;
        h+=uNear*sin(r*7.0-uT*1.1)*exp(-r*0.7)*0.05;
        h+=uGrain*sin(p.x*9.0+sin(p.y*1.3)*4.0)*0.1;
        if(uImp.w>0.0){ vec2 di=p-uImp.xy; float ri=length(di); float dr=ri-(0.35+uImp.z*0.85); float d2=ri-(0.3+uImp.z*0.5);
          h+=exp(-dr*dr*9.0)*sin(dr*24.0)*0.2*exp(-uImp.z*0.55)*uImp.w;
          h+=exp(-d2*d2*20.0)*sin(d2*40.0)*0.09*exp(-uImp.z*0.9)*uImp.w; }
        return h; }
      void main(){ vec2 p=vW.xz; vec3 V=normalize(uCam-vW); float dist=length(uCam-vW);
        float lod=1.0/(1.0+dist*0.12); float e=0.025+dist*0.004;
        vec2 g=vec2(hgt(p+vec2(e,0.0),lod)-hgt(p-vec2(e,0.0),lod),hgt(p+vec2(0.0,e),lod)-hgt(p-vec2(0.0,e),lod))/(2.0*e);
        vec3 N=normalize(vec3(-g.x*uAmp*0.07,1.0,-g.y*uAmp*0.07));
        if(uCam.y<0.0){
          vec3 Ld=normalize(vW-uCam); float up=Ld.y+dot(g,vec2(0.05))*uAmp;
          float win=smoothstep(0.6,0.74,up);
          float cs=caus(p*0.32+g*0.02,uT*0.35);
          vec3 tir=vec3(0.002,0.006,0.011)+vec3(0.25,0.4,0.6)*cs*0.02;
          vec3 sky=vec3(0.02,0.02,0.024)+vec3(1.0,0.5,0.16)*0.04+vec3(0.6,0.75,0.95)*cs*0.09;
          vec3 col=mix(tir,sky,win)+vec3(0.7,0.8,0.95)*exp(-pow((up-0.66)/0.025,2.0))*0.03;
          col=mix(col,uFog,1.0-exp(-uFogD*uFogD*dist*dist*0.8));
          gl_FragColor=vec4(col,1.0); ${FX_END} return; }
        float F=0.02+0.98*pow(1.0-clamp(dot(N,V),0.0,1.0),5.0);
        vec2 uv=gl_FragCoord.xy/uRes+g*uAmp*vec2(0.006,0.013)/(0.6+dist*0.12);
        float s=0.003*(1.0+dist*0.04);
        vec3 refl=(texture2D(tR,clamp(uv,0.001,0.999)).rgb*1.0+texture2D(tR,clamp(uv+vec2(0.0,s),0.001,0.999)).rgb*0.8
          +texture2D(tR,clamp(uv-vec2(0.0,s),0.001,0.999)).rgb*0.8+texture2D(tR,clamp(uv-vec2(0.0,2.5*s),0.001,0.999)).rgb*0.5)/3.1;
        vec2 bd=p-uB.xz; float rb=dot(bd,bd);
        vec3 amber=vec3(1.0,0.5,0.16);
        vec3 body=vec3(0.0025,0.002,0.0017)+amber*(uSpill*exp(-rb*2.2)*0.01+uWarm*0.003);
        vec3 col=mix(body,refl*(vec3(0.9,0.86,0.8)+uWarm*vec3(0.4,0.15,0.0)),clamp(F*1.25,0.0,1.0));
        vec3 L=normalize(uSunPos-vW); vec3 Hh=normalize(L+V);
        col+=amber*pow(max(dot(N,Hh),0.0),380.0)*2.2*uSun*F;
        vec3 Lb=normalize(uB+vec3(0.0,0.6,0.0)-vW); vec3 Hb=normalize(Lb+V);
        col+=amber*pow(max(dot(N,Hb),0.0),260.0)*0.25*uSpill*exp(-rb*0.4)*F;
        col=mix(col,uFog,1.0-exp(-uFogD*uFogD*dist*dist*0.6));
        gl_FragColor=vec4(col,1.0); ${FX_END} }`,
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), waterMat); water.rotation.x = -Math.PI / 2; scene.add(water);
  const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0.0);

  // Immersion: studio tank (back wall caustics, light shafts, bubbles, particles) + surface splash
  const uwG = new THREE.Group(); uwG.visible = false; scene.add(uwG);
  const uwFogC = new THREE.Color(0.0035, 0.008, 0.014), endC = new THREE.Color(0.002, 0.002, 0.002);
  const wallMat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uI: { value: 1 }, uCam: { value: new THREE.Vector3() }, uFog: { value: new THREE.Color() }, uFogD: { value: 0.1 } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float uT,uI,uFogD; uniform vec3 uCam,uFog; varying vec3 vW; ${CAUS}
      void main(){ float c=caus(vW.xy*0.16,uT*0.3); float dep=exp(vW.y*0.28);
        vec3 col=vec3(0.003,0.007,0.012)+(vec3(0.3,0.45,0.65)*0.07+vec3(1.0,0.5,0.16)*0.015)*c*dep*uI;
        float d=length(uCam-vW); col=mix(col,uFog,1.0-exp(-uFogD*uFogD*d*d*0.5));
        gl_FragColor=vec4(col,1.0); ${FX_END} }`,
  });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 16), wallMat); wall.position.set(0, -8, -6.5); uwG.add(wall);
  const shaftMat = seed => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uI: { value: 0 }, uSeed: { value: seed } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform float uT,uI,uSeed; varying vec2 vUv; ${NOISE}
      void main(){ float x=vUv.x; float ed=smoothstep(0.0,0.4,x)*smoothstep(1.0,0.6,x);
        float st=0.5+0.5*sin(x*13.0+uSeed*10.0+uT*0.3)*sin(x*5.0-uT*0.2+uSeed);
        float n=vnoise(vec2(x*5.0+uSeed,vUv.y*2.0-uT*0.12));
        float a=ed*pow(vUv.y,2.4)*(0.35+0.65*st)*(0.5+0.5*n)*uI;
        gl_FragColor=vec4((vec3(0.5,0.66,0.9)*0.05+vec3(1.0,0.55,0.2)*0.012)*a,1.0); ${FX_END} }`,
  });
  const shafts = [[-2.4, -2.2, 0.1], [-0.9, -3.2, -0.06], [0.8, -1.6, 0.12], [2.3, -3.6, -0.1], [0.1, -4.6, 0.05]].map(([x, z, r], i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1 + i * 0.12, 8), shaftMat(i * 1.37)); m.position.set(x, -4, z); m.userData.r = r; uwG.add(m); return m;
  });
  const NB = small ? 150 : 280, bg2 = new THREE.BufferGeometry(), bR = new Float32Array(NB * 4);
  for (let i = 0; i < NB * 4; i++) bR[i] = Math.random();
  bg2.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NB * 3), 3)); bg2.setAttribute('aR', new THREE.BufferAttribute(bR, 4));
  const bubMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uScale: { value: 800 }, uCont: { value: 0 }, uBurst: { value: 0 }, uAge: { value: -1 }, uB: { value: new THREE.Vector3() } },
    vertexShader: `attribute vec4 aR; uniform float uT,uScale,uCont,uBurst,uAge; uniform vec3 uB; varying float vA;
      void main(){ vec3 p; float a;
        if(aR.w<0.55){ float Hh=2.6; float y=mod(uT*(0.16+aR.z*0.28)+aR.x*37.0,Hh);
          p=uB+vec3((aR.x-0.5)*0.9+sin(uT*1.6+aR.z*40.0)*0.025*y,0.2+y,(aR.y-0.5)*0.55+cos(uT*1.3+aR.x*25.0)*0.025*y);
          a=uCont*smoothstep(0.0,0.35,y)*smoothstep(Hh,Hh*0.55,y);
        } else { float age=uAge-aR.z*0.5;
          p=vec3((aR.x-0.5)*(0.8+age*0.25)+sin(uT*2.0+aR.x*30.0)*0.03,-0.15-aR.y*1.2+age*(0.3+aR.z*0.5),(aR.w-0.775)*2.0*(0.4+age*0.12));
          a=uBurst*step(0.0,age)*(1.0-smoothstep(2.2,3.6,age)); }
        a*=smoothstep(0.0,-0.08,p.y);
        vec4 mv=modelViewMatrix*vec4(p,1.0); gl_Position=projectionMatrix*mv;
        gl_PointSize=max(1.5,uScale*(0.007+aR.z*0.016)/-mv.z);
        vA=a*exp(-length(mv.xyz)*0.2); }`,
    fragmentShader: `varying float vA; void main(){ vec2 c=gl_PointCoord; float d=length(c-0.5);
      float rim=smoothstep(0.5,0.4,d)*smoothstep(0.16,0.42,d); float hl=smoothstep(0.14,0.0,length(c-vec2(0.36,0.34)));
      gl_FragColor=vec4((vec3(0.6,0.76,0.95)*rim*0.45+vec3(1.0,0.84,0.6)*hl*0.8)*vA,1.0); ${FX_END} }`,
  });
  const bubbles = new THREE.Points(bg2, bubMat); bubbles.frustumCulled = false; uwG.add(bubbles);
  const NP = small ? 260 : 560, pg = new THREE.BufferGeometry(), pP = new Float32Array(NP * 4);
  for (let i = 0; i < NP; i++) { pP[i * 4] = (Math.random() - 0.5) * 9; pP[i * 4 + 1] = -0.1 - Math.random() * 6.5; pP[i * 4 + 2] = -4.5 + Math.random() * 8; pP[i * 4 + 3] = Math.random(); }
  pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NP * 3), 3)); pg.setAttribute('aP', new THREE.BufferAttribute(pP, 4));
  const parMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uScale: { value: 800 }, uI: { value: 0 } },
    vertexShader: `attribute vec4 aP; uniform float uT,uScale,uI; varying float vA; varying float vS;
      void main(){ vec3 p=aP.xyz; p.x+=sin(uT*0.07+aP.w*40.0)*0.25; p.y+=sin(uT*0.05+aP.w*23.0)*0.15; p.z+=cos(uT*0.06+aP.w*17.0)*0.25;
        vec4 mv=modelViewMatrix*vec4(p,1.0); gl_Position=projectionMatrix*mv;
        gl_PointSize=max(1.0,uScale*(0.004+aP.w*0.006)/-mv.z);
        vA=uI*exp(-length(mv.xyz)*0.28)*(0.5+0.5*sin(uT*0.5+aP.w*60.0))*smoothstep(0.0,-0.2,p.y); vS=aP.w; }`,
    fragmentShader: `varying float vA; varying float vS; void main(){ float d=length(gl_PointCoord-0.5); float s=smoothstep(0.5,0.0,d);
      vec3 c=mix(vec3(0.5,0.64,0.85),vec3(1.0,0.6,0.28),step(0.82,vS)); gl_FragColor=vec4(c*s*vA*0.4,1.0); ${FX_END} }`,
  });
  const parts = new THREE.Points(pg, parMat); parts.frustumCulled = false; uwG.add(parts);
  const uwLight = new THREE.DirectionalLight(0xbcd2ff, 0); uwLight.position.set(0.4, 6, 1.2); scene.add(uwLight, uwLight.target);
  const NS2 = small ? 90 : 160, sg = new THREE.BufferGeometry(), sV = new Float32Array(NS2 * 4);
  for (let i = 0; i < NS2; i++) {
    const low = Math.random() < 0.3;
    sV[i * 4] = Math.random() * Math.PI * 2; sV[i * 4 + 1] = low ? 0.2 + Math.random() * 0.3 : 0.9 + Math.random() * 1.0;
    sV[i * 4 + 2] = low ? 0.6 + Math.random() * 0.7 : 0.25 + Math.random() * 0.6; sV[i * 4 + 3] = Math.random();
  }
  sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NS2 * 3), 3)); sg.setAttribute('aV', new THREE.BufferAttribute(sV, 4));
  const splMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uAge: { value: -1 }, uScale: { value: 800 } },
    vertexShader: `attribute vec4 aV; uniform float uAge,uScale; varying float vA;
      void main(){ float age=uAge-aV.w*0.08; vec2 dir=vec2(cos(aV.x),sin(aV.x));
        vec3 p=vec3(dir.x*0.46,0.0,dir.y*0.3); p.xz+=dir*aV.z*max(age,0.0); p.y+=aV.y*age-4.9*age*age;
        vec4 mv=modelViewMatrix*vec4(p,1.0); gl_Position=projectionMatrix*mv;
        gl_PointSize=max(1.5,uScale*(0.005+aV.w*0.007)/-mv.z);
        vA=step(0.0,age)*step(-0.01,p.y)*(1.0-smoothstep(0.45,1.1,age)); }`,
    fragmentShader: `varying float vA; void main(){ float d=length(gl_PointCoord-0.5); float s=smoothstep(0.5,0.1,d);
      vec3 c=mix(vec3(1.0,0.6,0.28),vec3(1.0,0.92,0.82),smoothstep(0.3,0.0,d)); gl_FragColor=vec4(c*s*vA*0.75,1.0); ${FX_END} }`,
  });
  const splash = new THREE.Points(sg, splMat); splash.frustumCulled = false; splash.visible = false; scene.add(splash);

  // Post: main HDR target w/ depth -> occlusion -> rays -> composite (DOF, rays, CA, vignette, grain)
  const mainRT = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: gl2 ? 4 : 0 });
  mainRT.depthTexture = new THREE.DepthTexture(2, 2);
  const occRT = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType });
  const raysRT = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType });
  const blackMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); quad.frustumCulled = false;
  const quadScene = new THREE.Scene(); quadScene.add(quad);
  const raysMat = new THREE.ShaderMaterial({
    uniforms: { tOcc: { value: occRT.texture }, uSun: { value: new THREE.Vector2(0.5, 0.7) }, uI: { value: 0 }, uT: { value: 0 }, uAsp: { value: 1 } },
    vertexShader: QUAD_VS, toneMapped: false,
    fragmentShader: `uniform sampler2D tOcc; uniform vec2 uSun; uniform float uI,uT,uAsp; varying vec2 vUv; ${NOISE}
      void main(){ vec2 d=vUv-uSun; vec2 st=d*(0.92/40.0); float j=hash(vUv*1733.0+fract(uT)*91.0);
        vec2 c=vUv-st*j; vec3 s=vec3(0.0); float dec=1.0;
        for(int i=0;i<40;i++){ s+=texture2D(tOcc,c).rgb*dec; dec*=0.962; c-=st; }
        s/=40.0;
        vec2 dir=normalize(d*vec2(uAsp,1.0)+1e-5);
        float irr=(0.35+0.65*vnoise(dir*7.0+vec2(uT*0.02,0.0)))*(0.55+0.45*vnoise(dir*19.0+3.1));
        gl_FragColor=vec4(s*uI*irr,1.0); }`,
  });
  const compMat = new THREE.ShaderMaterial({
    uniforms: {
      tCol: { value: mainRT.texture }, tDep: { value: mainRT.depthTexture }, tRays: { value: raysRT.texture },
      uRes: { value: new THREE.Vector2(1, 1) }, uFocus: { value: 7 }, uAp: { value: 0 }, uNear: { value: camera.near }, uFar: { value: camera.far },
      uT: { value: 0 }, uRayOn: { value: 1 },
      uImpC: { value: new THREE.Vector2(0.5, 0.5) }, uImpA: { value: 0 }, uImpS: { value: 0 }, uCross: { value: 0 }, uUW: { value: 0 }, uDark: { value: 0 }, uLens: { value: new THREE.Vector4(0.5, 0.5, 0, 0.1) },
    },
    vertexShader: QUAD_VS,
    fragmentShader: `uniform sampler2D tCol,tDep,tRays; uniform vec2 uRes; uniform float uFocus,uAp,uNear,uFar,uT,uRayOn,uImpA,uImpS,uCross,uUW,uDark; uniform vec2 uImpC; uniform vec4 uLens; varying vec2 vUv;
      ${NOISE}
      float linZ(float d){ float z=d*2.0-1.0; return (2.0*uNear*uFar)/(uFar+uNear-z*(uFar-uNear)); }
      float coc(vec2 uv){ float z=linZ(texture2D(tDep,uv).x); float c=uAp*abs(z-uFocus)/z; return min(c,9.0); }
      void main(){ vec2 px=1.0/uRes; vec2 uv=vUv;
        { float asp=uRes.x/uRes.y;
          if(uImpS>0.001){ vec2 d=(uv-uImpC)*vec2(asp,1.0); float r=length(d); uv+=(d/max(r,1e-4))*sin(r*70.0-uImpA*14.0)*exp(-r*5.0)*0.006*uImpS/vec2(asp,1.0); }
          uv+=vec2(sin(uv.y*24.0+uT*4.0)*0.008,sin(uv.x*20.0-uT*3.5)*0.005)*uCross;
          uv+=vec2(sin(uv.y*9.0+uT*1.3),cos(uv.x*7.0+uT*1.1))*0.0022*uUW;
          if(uLens.z>0.001){ vec2 d=(uv-uLens.xy)*vec2(asp,1.0); float r2=dot(d,d)/(uLens.w*uLens.w); uv=uLens.xy+(uv-uLens.xy)*(1.0-uLens.z*exp(-r2)); } } vec2 cd=uv-0.5; float cl=dot(cd,cd);
        vec2 ca=cd*cl*0.004;
        vec3 col=vec3(texture2D(tCol,uv-ca).r,texture2D(tCol,uv).g,texture2D(tCol,uv+ca).b);
        float c0=coc(uv); c0*=smoothstep(0.7,1.8,c0);
        if(c0>0.5){ vec3 acc=col; float ws=1.0;
          for(int i=0;i<16;i++){ float fi=float(i)+0.5; float r=sqrt(fi/16.0)*c0; float th=fi*2.39996;
            vec2 o=vec2(cos(th),sin(th))*r*px; float w=clamp(coc(uv+o)-r+1.0,0.0,1.0);
            acc+=texture2D(tCol,uv+o).rgb*w; ws+=w; }
          col=acc/ws; }
        col+=texture2D(tRays,uv).rgb*uRayOn;
        { float lum=dot(col,vec3(0.3,0.6,0.1)); col=mix(col,col*vec3(0.5,0.72,1.0)+vec3(0.0,0.0015,0.003),uUW*0.65*(1.0-smoothstep(0.15,1.0,lum))); col*=1.0-uDark; }
        float v=smoothstep(1.05,0.25,length(cd*vec2(uRes.x/uRes.y,1.0))); col*=mix(1.0,v,0.35);
        gl_FragColor=vec4(col,1.0);
        ${FX_END}
        gl_FragColor.rgb+=(hash(uv*uRes+fract(uT*7.0)*311.0)-0.5)*0.016; }`,
  });

  const db = new THREE.Vector2();
  function resize() {
    const w = container.clientWidth || innerWidth, h = container.clientHeight || innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.getDrawingBufferSize(db);
    reflRT.setSize(Math.max(2, Math.floor(db.x * 0.5)), Math.max(2, Math.floor(db.y * 0.5)));
    mainRT.setSize(db.x, db.y);
    occRT.setSize(Math.max(2, Math.floor(db.x / 4)), Math.max(2, Math.floor(db.y / 4)));
    raysRT.setSize(Math.max(2, Math.floor(db.x / 2)), Math.max(2, Math.floor(db.y / 2)));
    waterMat.uniforms.uRes.value.copy(db); compMat.uniforms.uRes.value.copy(db);
    raysMat.uniforms.uAsp.value = camera.aspect;
    const s = db.y / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    dustMat.uniforms.uScale.value = s; mistMat.uniforms.uScale.value = s;
    bubMat.uniforms.uScale.value = s; parMat.uniforms.uScale.value = s; splMat.uniforms.uScale.value = s;
  }
  resize(); addEventListener('resize', resize);

  let visible = true, raf = 0, t = 0, zone = 'A';
  let scrolling = false, scrollTimer = 0, lastFrame = 0;
  function handleScroll() {
    if (!scrolling) {
      scrolling = true;
      renderer.setPixelRatio(scrollPixelRatio);
      resize();
    }
    clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(() => {
      scrolling = false;
      renderer.setPixelRatio(pixelRatio);
      resize();
    }, 160);
  }
  addEventListener('scroll', handleScroll, { passive: true });
  const cur = { ...POSES.hero };
  let cFS = -1, ndcX = 0, ndcY = 0; const panV = new THREE.Vector3(), upV = new THREE.Vector3(), edgeV = new THREE.Vector3();
  let uS = 0, impT0 = -1, prevBY = 1, lastCross = 0;
  const uwClear = new THREE.Color(), CLEARC = new THREE.Color(CLEAR);
  let noteS = 0, mS = 0, mistS = 0, capS = 0, pxS = 0, pyS = 0;
  const clock = new THREE.Clock(); const tmpC = new THREE.Color(); const tmpV = new THREE.Vector3();
  const sunW = new THREE.Vector3(), bottleW = new THREE.Vector3(), inv = new THREE.Matrix4(), nozDir = new THREE.Vector3();
  const fogBaseC = new THREE.Color(0.02, 0.016, 0.013), fogSmokeC = new THREE.Color(0.034, 0.032, 0.03), fogCedarC = new THREE.Color(0.032, 0.019, 0.009);

  function syncGlass() {
    scene.updateMatrixWorld();
    inv.copy(glass.matrixWorld).invert();
    glassU.uCamObj.value.copy(camera.position).applyMatrix4(inv);
    ecl.getWorldPosition(sunW);
    glassU.uLightObj.value.copy(sunW).applyMatrix4(inv);
    liqMat.uniforms.uLight.value.copy(sunW);
  }

  function frame(now = performance.now()) {
    raf = requestAnimationFrame(frame);
    const minFrameTime = scrolling ? 1000 / 30 : 1000 / 60;
    if (now - lastFrame < minFrameTime) return;
    lastFrame = now;
    const rawDt = clock.getDelta();
    if (!visible) return;
    const dt = Math.min(rawDt, 0.05); t += dt * (reduced ? 0.15 : 1);
    const vh = innerHeight;
    let z = 'A';
    if (zones.final && zones.final.getBoundingClientRect().top < vh) z = 'C';
    else if (zones.craft && zones.craft.getBoundingClientRect().top < vh) z = 'E';
    else if (zones.imm && zones.imm.getBoundingClientRect().top < vh) z = 'D';
    else if (zones.ritual && zones.ritual.getBoundingClientRect().top < vh) z = 'B';
    let tp;
    if (z === 'A') tp = (T.scentT || 0) > 0 ? mix(POSES.push, POSES.scent, ease(T.scentT)) : mix(POSES.hero, POSES.push, ease(T.heroT || 0));
    else if (z === 'B') { tp = { ...POSES.ritual }; tp.cz -= (T.ritualT || 0) * 0.35; tp.cy += (T.ritualT || 0) * 0.05; }
    else if (z === 'E') {
      cFS = lerp(cFS, T.craftF ?? -1, reduced ? 1 : 1 - Math.exp(-dt * 3));
      tp = { ...EP.intro };
      for (let i = 0; i < 4; i++) { const w = sstep(i - 0.15, i + 0.12, cFS) * (1 - sstep(i + 0.88, i + 1.12, cFS)); if (w > 0) for (const kk of KEYS) tp[kk] = lerp(tp[kk], EP.g[i][kk], w); }
    }
    else if (z === 'D') { uS = lerp(uS, T.immT || 0, reduced ? 1 : 1 - Math.exp(-dt * 3)); tp = immPose(uS); }
    else tp = mix(POSES.finalIn, POSES.final, ease(T.finalT || 0));
    const k = reduced ? 1 : 1 - Math.exp(-dt * 2.6);
    if (z !== zone) { const soft = (z === 'B' && zone === 'D') || (z === 'D' && zone === 'B'); if (!soft) Object.assign(cur, tp); zone = z; }
    const inD = z === 'D', inE = z === 'E';
    const cw = [0, 1, 2, 3].map(i => inE ? sstep(i - 0.15, i + 0.12, cFS) * (1 - sstep(i + 0.88, i + 1.12, cFS)) : 0);
    const csw = [0, 1, 2, 3].map(i => clamp(cFS - i)), cSum = cw[0] + cw[1] + cw[2] + cw[3];
    const I4 = sstep(0.05, 0.55, csw[3]) * (1 - 0.35 * sstep(0.75, 1, csw[3]));
    for (const key2 of KEYS) cur[key2] = lerp(cur[key2], tp[key2], k);
    noteS = lerp(noteS, T.noteF || 0, reduced ? 1 : 1 - Math.exp(-dt * 1.8));
    mS = lerp(mS, z === 'A' ? clamp((T.scentT || 0) * 1.2) : 0, k);
    const rT = z === 'B' ? (T.ritualT || 0) : 0;
    mistS = lerp(mistS, z === 'B' ? clamp((rT - 0.2) / 0.72) : 0, reduced ? 1 : 1 - Math.exp(-dt * 3));
    capS = lerp(capS, sstep(0.02, 0.2, rT), reduced ? 1 : 1 - Math.exp(-dt * 3));
    pxS = lerp(pxS, reduced ? 0 : (T.px || 0), 1 - Math.exp(-dt * 2));
    pyS = lerp(pyS, reduced ? 0 : (T.py || 0), 1 - Math.exp(-dt * 2));

    // Camera + subtle handheld breathing
    const nar = camera.aspect < 1, dm = nar ? 1.6 : (camera.aspect < 1.4 ? 1.18 : 1), xm = nar ? 0.2 : 1;
    const hh = reduced ? 0 : 1;
    const hx = (Math.sin(t * 0.71) * 0.6 + Math.sin(t * 1.37 + 1.2) * 0.3 + Math.sin(t * 2.3 + 0.4) * 0.1) * hh;
    const hy = (Math.sin(t * 0.83 + 2.1) * 0.6 + Math.sin(t * 1.61 + 0.7) * 0.3 + Math.sin(t * 2.7) * 0.1) * hh;
    const hr = (Math.sin(t * 0.52 + 0.9) * 0.7 + Math.sin(t * 1.19) * 0.3) * hh;
    camera.position.set(cur.cx * xm + pxS * 0.2 + hx * 0.006, cur.cy - pyS * 0.08 + hy * 0.005, cur.cz * dm + Math.sin(t * 0.29) * 0.01 * hh);
    look.set(cur.lx * xm + pxS * 0.05 + hy * 0.002, cur.ly + (dm - 1) * 0.1 + hx * 0.002, 0); camera.lookAt(look);
    camera.rotateZ(hr * 0.0012);
    if (inE) {
      const kp = reduced ? 1 : 1 - Math.exp(-dt * 6);
      ndcX = lerp(ndcX, T.craftX ?? 0, kp); ndcY = lerp(ndcY, T.craftY ?? 0, kp);
      camera.updateMatrix();
      const dist = camera.position.distanceTo(look), hH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist;
      panV.setFromMatrixColumn(camera.matrix, 0).multiplyScalar(-ndcX * hH * camera.aspect);
      upV.setFromMatrixColumn(camera.matrix, 1).multiplyScalar(-ndcY * hH);
      camera.position.add(panV).add(upV);
    }

    bottle.position.y = cur.bY;
    bottle.rotation.y = cur.bR + Math.sin(t * 0.13) * 0.015 - pxS * 0.1 + mS * noteS * Math.PI * 2;
    bottle.position.y += mS * Math.sin(noteS * Math.PI) * 0.0 + mS * Math.abs(Math.sin(noteS * Math.PI)) * 0.08;
    bottle.rotation.z = 0; bottle.rotation.x = 0;
    if (inE) bottle.rotation.y += cw[0] * lerp(-0.42, 0.42, ease(csw[0])) + cw[3] * lerp(-0.18, 0.18, csw[3]);
    if (inD) {
      bottle.position.y += Math.sin(t * 0.9) * 0.012 * (1 - sstep(0.12, 0.2, uS));
      bottle.rotation.z = 0.26 * sstep(0.36, 1, uS) + Math.sin(t * 0.37) * 0.015 * sstep(0.34, 0.4, uS);
      bottle.rotation.x = 0.1 * sstep(0.42, 1, uS);
    }
    if (inD && !reduced) { if (prevBY > 0 && cur.bY <= 0) impT0 = t; if (cur.bY > 0.08) impT0 = -1; } else impT0 = -1;
    prevBY = cur.bY;
    const impAge = impT0 < 0 ? -1 : t - impT0;
    const camY = camera.position.y;
    const uw = inD ? sstep(0.04, -0.12, camY) : 0, sink = inD ? sstep(0.8, 0.99, uS) : 0;
    const cross = inD ? Math.exp(-Math.pow(camY / 0.18, 2)) : 0;
    if (opts.onImm && (cross > 0.002 || lastCross > 0.002)) opts.onImm(cross);
    lastCross = cross;
    const ce = ease(capS);
    capG.position.set(-0.34 * ce, capBase + 0.62 * ce, -0.12 * ce); capG.rotation.set(0, 0.1 * ce, 0.16 * ce);
    const press = sstep(0.0, 0.03, mistS) * (1 - sstep(0.08, 0.2, mistS));
    actuator.position.y = H + 0.05 - 0.012 * press;

    ecl.scale.setScalar(cur.ecS); ecl.position.set(0, cur.ecY, -14);
    if (inE) {
      const bw = 1 - cSum, a4 = Math.PI + lerp(1.3, -1.3, csw[3]);
      const ex = cw[0] * lerp(-6, 6, ease(csw[0])) + cw[1] * lerp(-3, 3, csw[1]) + cw[3] * Math.sin(a4) * 8;
      const ey = bw * 2.5 + cw[0] * 1.8 + cw[1] * 3 + cw[2] * 1.2 + cw[3] * 1.6;
      const ez = bw * -9 + cw[0] * -6 + cw[1] * -6 + cw[2] * -8 + cw[3] * Math.cos(a4) * 8;
      ecl.position.set(ex, ey, ez);
    } ecl.visible = cur.ecI > 0.003 && uw < 0.5;
    const ws = Math.max(0, 1 - Math.abs(noteS)), wa = Math.max(0, 1 - Math.abs(noteS - 1)), wc = Math.max(0, 1 - Math.abs(noteS - 2));
    const m = mS, fm = T.fogMul ?? 1;
    noteTint.copy(NOTE_C[0]).multiplyScalar(ws).add(tmpC2.copy(NOTE_C[1]).multiplyScalar(wa)).add(tmpC2.copy(NOTE_C[2]).multiplyScalar(wc));
    noteTint.lerp(NOTE_C[1], 1 - m);
    liqMat.uniforms.uTint.value.copy(noteTint); liqMat.uniforms.uT.value = t;
    glassU.uAmb.value.copy(noteTint).multiplyScalar(0.92);
    halo.material.color.copy(noteTint).multiplyScalar(m * (0.32 + 0.18 * ws));
    halo.visible = m > 0.01; halo.position.copy(bottle.position).add(haloOff); halo.lookAt(camera.position);
    const fogD = (cur.fog + m * (ws * 0.06 + wc * 0.02)) * fm;
    const att = lerp(1, Math.exp(-fogD * 17), 0.6);
    glowMat.uniforms.uI.value = cur.ecI * att * (0.95 + 0.05 * Math.sin(t * 0.4)); glowMat.uniforms.uT.value = t;

    scene.fog.density = fogD;
    tmpC.copy(fogBase).lerp(fogSmoke, m * ws).lerp(fogCedar, m * wc); scene.fog.color.copy(tmpC);
    waterMat.uniforms.uFog.value.copy(tmpC); waterMat.uniforms.uFogD.value = fogD;
    if (uw > 0) {
      const fd = lerp(fogD, 0.13 + sink * 0.42, uw);
      scene.fog.density = fd; scene.fog.color.copy(tmpC).lerp(uwFogC, uw).lerp(endC, sink);
      waterMat.uniforms.uFog.value.copy(scene.fog.color); waterMat.uniforms.uFogD.value = fd;
    }

    const envI = cur.env * (1 - m * (ws * 0.45 + wc * 0.35)) + m * wa * 0.3;
    glassMat.envMapIntensity = 1.0 * envI; capMat.envMapIntensity = 1.2 * envI; polished.envMapIntensity = 1.2 * envI; darkMetal.envMapIntensity = 1.1 * envI;
    const glowL = (0.9 + m * wa * 1.1 - m * ws * 0.4) * (0.35 + 0.65 * cur.env);
    liqMat.uniforms.uGlow.value = glowL;
    glassU.uEdgeGlow.value = (0.4 + 0.6 * cur.ecI + m * wa * 0.8) * (0.4 + 0.6 * cur.env);
    glassU.uInner.value = 0.5 + 0.5 * cur.env;
    labelMat.uniforms.uI.value = 0.55 + 0.45 * cur.env;
    pt.intensity = (1.2 + m * wa * 3) * (0.35 + 0.65 * cur.env);
    rim.color.copy(amberC).lerp(noteTint, m); rim2.color.copy(noteTint); pt.color.copy(noteTint);
    rim.intensity = 1.8 * (0.5 + 0.5 * cur.env) * (1 + m * wa * 0.5);
    key.position.set(-3 + pxS * 1.6, 4 - pyS * 0.8, 5); key.intensity = 0.8 * cur.key * (1 - m * (ws * 0.4 + wc * 0.55));
    labelMat.uniforms.uKey.value.copy(key.position).normalize();
    rim2.intensity = 2.4; rim2.position.set(3.5, 1.6, -3);
    capKey.position.set(-1.2, 3.6, 2.2); capKey.intensity = 6; capMat.roughness = 0.13; liqMat.uniforms.uBands.value = 0;
    compMat.uniforms.uLens.value.z = 0;
    if (inE) {
      const a4 = Math.PI + lerp(1.3, -1.3, csw[3]);
      glassU.uEdgeGlow.value = 0.12 + cw[0] * 0.9 + cw[1] * 0.3 + cw[2] * 0.35 + cw[3] * 1.8 * I4;
      liqMat.uniforms.uGlow.value = 0.08 + cw[0] * 0.8 + cw[1] * 0.35 + cw[2] * 0.95 + cw[3] * 0.18 * I4;
      liqMat.uniforms.uBands.value = cw[2] * sstep(0, 0.25, csw[2]);
      capKey.position.set(cw[1] > 0.01 ? lerp(-1.8, 1.8, ease(csw[1])) : -1.2, cw[1] > 0.01 ? 1.95 : 3.6, cw[1] > 0.01 ? 1.3 : 2.2);
      capKey.intensity = 6 * (cw[0] + cw[2]) * 0.5 + cw[1] * 16;
      capMat.roughness = 0.13 + cw[1] * (0.1 + 0.03 * Math.sin(t * 0.7));
      if (cw[3] > 0.01) rim2.position.set(Math.sin(a4) * 4, 1.4, Math.cos(a4) * 4);
      rim2.intensity = 2.4 * (cw[0] + cw[1] + cw[2]) * 0.6 + cw[3] * 7 * I4;
      rim.intensity *= (1 - cw[3]) * cSum; pt.intensity *= (1 - cw[3] * 0.95) * cSum;
      labelMat.uniforms.uI.value *= (1 - cw[3] * 0.8) * (0.25 + 0.75 * cSum);
      if (cw[0] > 0.01) {
        edgeV.set(W / 2, H * 0.48, D / 2); bottle.localToWorld(edgeV); edgeV.project(camera);
        compMat.uniforms.uLens.value.set(edgeV.x * 0.5 + 0.5, edgeV.y * 0.5 + 0.5, reduced ? 0 : cw[0] * sstep(0.08, 0.4, csw[0]) * 0.22, 0.09);
      }
    }
    if (inD) {
      const fl = 0.5 + 0.5 * Math.sin(t * 1.7) * Math.sin(t * 2.3 + 1.1), dk = 1 - sink * 0.92;
      const camD = camera.position.distanceTo(bottle.position), fF = Math.exp(-Math.pow(camD * scene.fog.density, 2));
      const f = (1 - 0.35 * uw) * dk;
      glassMat.envMapIntensity *= f; capMat.envMapIntensity *= f; polished.envMapIntensity *= f; darkMetal.envMapIntensity *= f;
      liqMat.uniforms.uGlow.value *= (1 - 0.3 * uw) * dk * lerp(1, fF, uw); labelMat.uniforms.uI.value *= dk * lerp(1, fF, uw);
      glassU.uEdgeGlow.value *= dk; pt.intensity *= dk; rim.intensity *= (1 - 0.4 * uw) * dk; rim2.intensity = 2.4 * (1 - 0.3 * uw) * dk; key.intensity *= (1 - 0.5 * uw) * dk;
      uwLight.intensity = uw * dk * (0.7 + 0.7 * fl); uwLight.position.set(0.4 + Math.sin(t * 0.6) * 0.5, 6, 1.2 + Math.cos(t * 0.5) * 0.4);
    } else uwLight.intensity = 0;

    bottle.updateMatrixWorld(true); ecl.updateMatrixWorld(true);
    ecl.getWorldPosition(sunW); glass.getWorldPosition(bottleW);
    const smoke = cur.smoke * fm * (1 + m * ws * 1.2 + m * wc * 0.3);
    tmpC.copy(fogBaseC).lerp(fogSmokeC, m * ws).lerp(fogCedarC, m * wc);
    for (const f of fogLayers) {
      const u = f.material.uniforms, o = f.userData;
      u.uT.value = t; u.uSun.value.copy(sunW); u.uBottle.value.copy(bottleW);
      u.uSunI.value = cur.ecI * att * (1 - m * ws * 0.5); u.uGlow.value = glowL * (1 + m * wa);
      u.uBase.value.copy(tmpC);
      u.uDens.value = o.dens * clamp(smoke, 0, 2.6) * (o.kind === 'low' ? 1 : (o.kind === 'beh' ? 0.8 + 0.4 * m * ws : 1));
      u.uPulse.value = o.kind === 'wisp' ? sstep(0.2, 0.9, 0.5 + 0.5 * Math.sin(t * 0.07 + o.ph)) : 1;
    }

    waterMat.uniforms.uAmp.value = cur.amp * (1 + m * wc * 0.6);
    waterMat.uniforms.uWarm.value = 0.15 + m * wa * 0.9;
    waterMat.uniforms.uGrain.value = m * wc;
    waterMat.uniforms.uT.value = t; waterMat.uniforms.uCam.value.copy(camera.position);
    waterMat.uniforms.uSunPos.value.copy(sunW); waterMat.uniforms.uSun.value = cur.ecI * att;
    waterMat.uniforms.uB.value.copy(bottleW);
    waterMat.uniforms.uNear.value = cur.amp * (0.5 + 0.5 * sstep(0.45, 0.0, cur.bY));
    waterMat.uniforms.uSpill.value = glowL;
    dustMat.uniforms.uI.value = cur.dust * (1 + m * wa * 0.5) * (1 - m * ws * 0.3); dustMat.uniforms.uT.value = t;
    uwG.visible = inD && camY < 0.1;
    if (uwG.visible) {
      wallMat.uniforms.uT.value = t; wallMat.uniforms.uI.value = 1 - sink; wallMat.uniforms.uCam.value.copy(camera.position);
      wallMat.uniforms.uFog.value.copy(scene.fog.color); wallMat.uniforms.uFogD.value = scene.fog.density;
      for (const sh of shafts) { sh.material.uniforms.uT.value = t; sh.material.uniforms.uI.value = uw * (1 - sink); sh.rotation.set(0, Math.atan2(camera.position.x - sh.position.x, camera.position.z - sh.position.z), sh.userData.r); }
      bubMat.uniforms.uT.value = t; bubMat.uniforms.uB.value.copy(bottle.position); bubMat.uniforms.uAge.value = impAge;
      bubMat.uniforms.uCont.value = sstep(0.36, 0.45, uS) * (1 - sink * 0.85); bubMat.uniforms.uBurst.value = impAge >= 0 ? 1 : 0;
      parMat.uniforms.uT.value = t; parMat.uniforms.uI.value = uw * (1 - sink * 0.7);
    }
    splash.visible = impAge >= 0 && impAge < 1.4 && camY > -0.2; splMat.uniforms.uAge.value = impAge;
    waterMat.uniforms.uImp.value.set(0, 0, Math.max(impAge, 0), impAge >= 0 && impAge < 12 ? 1 : 0);
    if (inD && impAge >= 0) waterMat.uniforms.uNear.value *= Math.exp(-impAge * 0.4);
    const fogOn = uw < 0.5; for (const f of fogLayers) f.visible = fogOn; dust.visible = fogOn;
    mistMat.uniforms.uMist.value = mistS; mistMat.uniforms.uT.value = t; mist.visible = mistS > 0.001;
    mistMat.uniforms.uO.value.copy(bottle.localToWorld(tmpV.copy(nozzleL)));
    mistMat.uniforms.uD.value.copy(nozDir.set(1, 0.12, 0).applyQuaternion(bottle.quaternion).normalize());
    renderer.toneMappingExposure = 1.0 * (T.exposure ?? 1);

    // Reflection
    if (uw < 0.5) {
      const uv0 = uwG.visible, sv0 = splash.visible; uwG.visible = false; splash.visible = false;
      water.visible = false; world.scale.y = -1; renderer.clippingPlanes = [clipPlane];
      syncGlass();
      renderer.setRenderTarget(reflRT); renderer.clear(); renderer.render(scene, camera);
      world.scale.y = 1; renderer.clippingPlanes = []; water.visible = true; uwG.visible = uv0; splash.visible = sv0;
    }
    renderer.setClearColor(uw > 0 ? uwClear.copy(scene.fog.color) : CLEARC, 1);
    // Main
    syncGlass();
    renderer.setRenderTarget(mainRT); renderer.clear(); renderer.render(scene, camera);
    renderer.setClearColor(CLEAR, 1);
    // Rays
    const rayI = cur.ray * cur.ecI * att * (1 - m * ws * 0.6);
    tmpV.copy(sunW).project(camera);
    const rayOn = rayI > 0.01 && ecl.visible && tmpV.z < 1 && uw < 0.5;
    if (rayOn) {
      const uwv = uwG.visible, spv = splash.visible; uwG.visible = false; splash.visible = false;
      for (const f of fogLayers) f.visible = false; dust.visible = false; const mv = mist.visible; mist.visible = false; label.visible = false; glow.visible = false; const hv = halo.visible; halo.visible = false;
      scene.overrideMaterial = blackMat;
      renderer.setRenderTarget(occRT); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, camera);
      scene.overrideMaterial = null; glow.visible = true;
      renderer.autoClear = false; renderer.render(glow, camera); renderer.autoClear = true;
      for (const f of fogLayers) f.visible = true; dust.visible = true; mist.visible = mv; label.visible = true; halo.visible = hv; uwG.visible = uwv; splash.visible = spv;
      renderer.setClearColor(CLEAR, 1);
      raysMat.uniforms.uSun.value.set(tmpV.x * 0.5 + 0.5, tmpV.y * 0.5 + 0.5);
      raysMat.uniforms.uI.value = rayI * 0.9; raysMat.uniforms.uT.value = t;
      quad.material = raysMat; renderer.setRenderTarget(raysRT); renderer.render(quadScene, quadCam);
    }
    // Composite
    tmpV.copy(bottleW).applyMatrix4(camera.matrixWorldInverse);
    compMat.uniforms.uFocus.value = Math.max(0.5, -tmpV.z - D * 0.3);
    compMat.uniforms.uAp.value = reduced ? 0 : cur.dof * 14 * (db.y / 1080);
    compMat.uniforms.uT.value = t; compMat.uniforms.uRayOn.value = rayOn ? 1 : 0;
    tmpV.set(0, 0, 0).project(camera); compMat.uniforms.uImpC.value.set(tmpV.x * 0.5 + 0.5, tmpV.y * 0.5 + 0.5);
    compMat.uniforms.uImpA.value = Math.max(impAge, 0);
    compMat.uniforms.uImpS.value = impAge >= 0 ? Math.exp(-impAge * 1.6) * sstep(0, 0.04, impAge) * (1 - uw) : 0;
    compMat.uniforms.uCross.value = reduced ? 0 : cross; compMat.uniforms.uUW.value = uw; compMat.uniforms.uDark.value = inE ? (1 - sstep(0, 1, T.craftIn ?? 1)) * 0.85 : sink * 0.85;
    quad.material = compMat; renderer.setRenderTarget(null); renderer.render(quadScene, quadCam);
  }
  frame();

  return {
    setVisible(v) { visible = v; },
    dispose() {
      cancelAnimationFrame(raf); removeEventListener('resize', resize);
      removeEventListener('scroll', handleScroll); clearTimeout(scrollTimer);
      scene.traverse(o => { if (o.geometry) o.geometry.dispose(); const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach(x => { for (const k in x) { const v = x[k]; if (v && v.isTexture) v.dispose(); } x.dispose(); }); });
      env.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
      if (scene.environment) scene.environment.dispose();
      [glowMat, raysMat, compMat, blackMat].forEach(m => m.dispose()); quad.geometry.dispose(); ltex.dispose(); roughTex.dispose();
      renderer.dispose(); renderer.forceContextLoss(); reflRT.dispose(); mainRT.dispose(); occRT.dispose(); raysRT.dispose(); pmrem.dispose(); cv.remove();
    },
  };
}
