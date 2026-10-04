
const COLL = [
  { name: 'NOIR', notes: 'SMOKE / AMBER / CEDAR', desc: 'A dark fragrance shaped by mineral smoke, warm amber and dry cedar.', accent: '#e8b25a', bg: '#060504', img: 'export/noir-hero.jpg', pos: '50% 55%', mask: 'radial-gradient(ellipse 30% 30% at 50% 57%, #000 60%, transparent 100%)' },
  { name: 'EMBER', notes: 'SAFFRON / RESIN / SANDALWOOD', desc: 'A warmer expression built around glowing resin, spice and polished wood.', accent: '#f0873a', bg: '#0a0604', img: 'export/ember.jpg', pos: '50% 50%', mask: 'radial-gradient(ellipse 32% 36% at 50% 45%, #000 60%, transparent 100%)' },
  { name: 'VEIL', notes: 'INCENSE / IRIS / MUSK', desc: 'A softer and more mysterious composition with incense, powdery iris and dark musk.', accent: '#b9a2d8', bg: '#070609', img: 'export/veil.jpg', pos: '50% 50%', mask: 'radial-gradient(ellipse 32% 36% at 50% 46%, #000 60%, transparent 100%)' },
];
const MAT = [
  { '--page': '#0b0a09', '--edge': 'rgba(232,178,90,.42)', '--sheen': 'rgba(255,226,180,.07)' },
  { '--page': '#130c08', '--edge': 'rgba(240,150,70,.72)', '--sheen': 'rgba(255,186,120,.10)' },
  { '--page': '#0b0a0d', '--edge': 'rgba(192,182,218,.40)', '--sheen': 'rgba(222,212,242,.07)' },
];
const FOLIO = COLL.map((c, i) => { const n = c.notes.split(' / '); return { name: c.name, desc: c.desc, img: c.img, pos: c.pos, mask: c.mask, n1: n[0], n2: n[1], n3: n[2], idx: '0' + (i + 1), pgL: '0' + (i * 2 + 1), pgR: '0' + (i * 2 + 2), vis: i === 0 ? 'visible' : 'hidden' }; });
const NS = 12, BEND = 2.3, LIGHT = 35, D2R = Math.PI / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = x => x * x * (3 - 2 * x);

class Component extends DCLogic {
  state = { note: 0, sel: 0, items: [], bagOpen: false, ck: false, mobile: false, stack: false, glFail: false, navH: -1 };

  componentDidMount() {
    window.__noirCta = id => { if (id === 'discover') this.go('collection')(); if (id === 'acquire') this.addItem(0); };
    this._msg = e => { const d = e.data; if (!d || typeof d.noirCta !== 'string') return; if (d.noirCta === 'discover') this.go('collection')(); if (d.noirCta === 'acquire') this.addItem(0); };
    try { const saved = JSON.parse(localStorage.getItem('noir-bag-v1') || '[]'); if (Array.isArray(saved)) this.setState({ items: saved.filter(x => x && COLL[x.id] && x.qty > 0).map(x => ({ id: x.id, qty: Math.min(99, x.qty | 0) })) }); } catch (e) {}
    this._esc = e => { if (e.key === 'Escape' && this.state.bagOpen) { e.preventDefault(); this.closeBag(); } };
    window.addEventListener('keydown', this._esc);
    window.addEventListener('message', this._msg);
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.T = { heroT: 0, scentT: 0, noteF: 0, ritualT: 0, finalT: 0, px: 0, py: 0, fogMul: 1, exposure: 1 };
    this.mq = window.matchMedia('(max-width: 1180px)');
    this._mq = () => { const fo = document.querySelector('[data-folio]'); const pw = fo ? fo.offsetWidth / 2 : innerWidth / 2; this.setState({ mobile: pw < 340, stack: innerWidth <= 980, navHidden: this.mq.matches }); requestAnimationFrame(() => this.craftUpdate()); };
    window.addEventListener('resize', this._mq);
    this._mq(); this.mq.addEventListener('change', this._mq);
    this._pm = e => { this.T.px = e.clientX / innerWidth * 2 - 1; this.T.py = e.clientY / innerHeight * 2 - 1; };
    window.addEventListener('pointermove', this._pm, { passive: true });
    this.tp = { x: 0, y: 0 }; this.tilt = { x: 0, y: 0 };
    this.cio = new IntersectionObserver(([e]) => { this.collVis = e.isIntersecting; if (e.isIntersecting && !this.reduced) this.startLoop(); }, { rootMargin: '10% 0px' });
    const cs = document.getElementById('collection'); cs && this.cio.observe(cs);
    this.initScene();
    this.initThreeUiCtas();
    if (!this.reduced) import((window.__resources && window.__resources.noirWordmark) || new URL('noir-wordmark.js', document.baseURI).href).then(m => m.createWordmark(document.querySelector('[data-wordmark]'))).then(w => { this.wm = w; }).catch(err => console.warn('NOIR: wordmark effect unavailable', err));
    const wait = () => { if (window.gsap && window.ScrollTrigger) this.setupMotion(); else this._wt = setTimeout(wait, 60); };
    wait();
  }

  componentWillUnmount() {
    delete window.__noirCta;
    window.removeEventListener('message', this._msg);
    window.removeEventListener('keydown', this._esc);
    window.removeEventListener('pointermove', this._pm);
    this.mq && this.mq.removeEventListener('change', this._mq);
    window.removeEventListener('resize', this._mq);
    this.lockScroll(false);
    clearTimeout(this._wt);
    this.io && this.io.disconnect();
    this.cio && this.cio.disconnect();
    cancelAnimationFrame(this._raf); this.endDrag && this.endDrag();
    this.api && this.api.dispose();
    this.wm && this.wm.dispose();
    this.ctx && this.ctx.revert();
  }

  initThreeUiCtas() {
    fetch(new URL('/runtime/noir-cta.html', document.baseURI))
      .then(response => {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.text();
      })
      .then(raw => {
        document.querySelectorAll('[data-threeui-cta]').forEach(f => {
          const qs = '?id=' + f.dataset.threeuiCta + '&label=' + encodeURIComponent(f.dataset.threeuiLabel);
          f.srcdoc = raw.replace('new URLSearchParams(location.search)', 'new URLSearchParams(' + JSON.stringify(qs) + ')');
        });
      })
      .catch(err => console.error('NOIR: CTA visual unavailable.', err));
  }

  async initScene() {
    const stage = document.querySelector('[data-noir-stage]');
    try {
      const mod = await import((window.__resources && window.__resources.noirScene) || new URL('noir-scene.js', document.baseURI).href);
      this.api = await mod.createNoirScene(stage, {
        reduced: this.reduced, target: this.T,
        zones: { ritual: document.getElementById('ritual'), imm: document.getElementById('immersion'), craft: document.getElementById('craft'), final: document.getElementById('final') },
        onImm: c => this.immWarp(c),
      });
      const vis = new Set();
      this.io = new IntersectionObserver(es => {
        es.forEach(e => (e.isIntersecting ? vis.add(e.target) : vis.delete(e.target)));
        this.api.setVisible(vis.size > 0);
      }, { rootMargin: '8% 0px' });
      document.querySelectorAll('[data-3d]').forEach(el => this.io.observe(el));
    } catch (err) {
      console.warn('NOIR: 3D scene unavailable, using still fallback.', err);
      this.setState({ glFail: true });
    }
  }

  setupMotion() {
    const gsap = window.gsap, ST = window.ScrollTrigger, T = this.T, R = this.reduced;
    gsap.registerPlugin(ST);
    this.ctx = gsap.context(() => {
      ST.create({ trigger: '#hero', start: 'top top', end: 'bottom bottom', onUpdate: s => { T.heroT = s.progress; } });
      ST.create({ trigger: '#scent', start: 'top bottom', end: 'top top', onUpdate: s => { T.scentT = s.progress; } });
      ST.create({ trigger: '#scent', start: 'top top', end: 'bottom bottom', onUpdate: s => {
        const n = Math.min(2, Math.max(0, Math.floor(s.progress * 3)));
        this.scrollNote = n;
        if (this.hoverNote == null) { T.noteF = n; if (n !== this.state.note) this.setState({ note: n }); }
      } });
      ST.create({ trigger: '#ritual', start: 'top top', end: 'bottom bottom', onUpdate: s => { T.ritualT = s.progress; } });
      ST.create({ trigger: '#immersion', start: 'top top', end: 'bottom bottom', onUpdate: s => { T.immT = s.progress; } });
      ST.create({ trigger: '#craft', start: 'top bottom', end: 'bottom top', onUpdate: () => this.craftUpdate(), onRefresh: () => this.craftUpdate() });
      ST.create({ trigger: '#final', start: 'top bottom', end: 'center center', onUpdate: s => { T.finalT = s.progress; } });

      if (R) {
        const mq0 = document.querySelector('[data-craft-marquee]');
        if (mq0) gsap.set(mq0, { transformOrigin: '0% 50%', x: () => innerWidth * 0.04, scale: () => (innerWidth * 0.92) / mq0.scrollWidth });
        return;
      }

      gsap.fromTo('[data-scroll-dot]', { yPercent: -100 }, { yPercent: 450, duration: 2.6, ease: 'power2.inOut', repeat: -1, repeatDelay: 0.4 });
      gsap.fromTo('[data-noir-stage]', { opacity: 0 }, { opacity: 1, duration: 2.6, ease: 'power2.out' });
      gsap.from('[data-hero-line]', { yPercent: 112, duration: 1.9, ease: 'expo.out', stagger: 0.12, delay: 0.5 });
      gsap.from('[data-intro]', { opacity: 0, duration: 1.6, ease: 'power2.out', delay: 1.2, stagger: 0.08 });

      gsap.to('[data-hero-x]', { yPercent: -112, ease: 'none', stagger: 0.04, scrollTrigger: { trigger: '#hero', start: 'top top', end: '+=60%', scrub: 1 } });
      gsap.to('[data-hero-exit]', { opacity: 0, y: -30, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: '+=35%', scrub: 1 } });

      gsap.from('[data-scent-reveal]', { yPercent: 115, ease: 'none', stagger: 0.1, scrollTrigger: { trigger: '#scent', start: 'top 80%', end: 'top 10%', scrub: 1 } });

      const rt = gsap.timeline({ scrollTrigger: { trigger: '#ritual', start: 'top top', end: 'bottom bottom', scrub: 1 } });
      rt.from('[data-ritual-eyebrow]', { opacity: 0, duration: 0.1 }, 0)
        .from('[data-ritual-line]', { yPercent: 112, stagger: 0.06, duration: 0.2, ease: 'power3.out' }, 0)
        .set({}, {}, 1);
      document.querySelectorAll('[data-ritual-step]').forEach((el, i) => {
        const at = 0.3 + i * 0.2;
        rt.fromTo(el, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.16, ease: 'none' }, at)
          .fromTo(el.querySelector('[data-ritual-rule]'), { scaleX: 0 }, { scaleX: 1, duration: 0.18, ease: 'none' }, at);
      });

      const imt = gsap.timeline({ scrollTrigger: { trigger: '#immersion', start: 'top top', end: 'bottom bottom', scrub: 1 } });
      imt.from('[data-imm-eyebrow]', { opacity: 0, duration: 0.06 }, 0)
        .from('[data-imm-line]', { yPercent: 112, stagger: 0.04, duration: 0.12, ease: 'power3.out' }, 0)
        .from('[data-imm-sub]', { opacity: 0, y: 14, duration: 0.08 }, 0.1)
        .to(['[data-imm-eyebrow]', '[data-imm-head]', '[data-imm-sub]'], { opacity: 0, duration: 0.1 }, 0.82)
        .set({}, {}, 1);

      gsap.set('[data-coll-title]', { clipPath: 'inset(-10% 100% -10% 0%)' });
      gsap.set('[data-folio-intro]', { z: -380, rotationX: 7, opacity: 0 });
      gsap.set('[data-coll-late]', { opacity: 0 });
      const ci = gsap.timeline({ paused: true });
      ci.to('[data-coll-title]', { clipPath: 'inset(-10% 0% -10% 0%)', duration: 1.6, ease: 'expo.inOut' })
        .to('[data-folio-intro]', { z: 0, rotationX: 0, opacity: 1, duration: 2.4, ease: 'power3.out', clearProps: 'opacity' }, 0.6)
        .to('[data-coll-late]', { opacity: 1, duration: 1.2, ease: 'power2.out' }, 2.1);
      ST.create({ trigger: '#collection', start: 'top 70%', once: true, onEnter: () => ci.play() });

      const mq = document.querySelector('[data-craft-marquee]');
      const fit = () => (innerWidth * 0.92) / mq.scrollWidth;
      gsap.set(mq, { transformOrigin: '0% 50%' });
      gsap.timeline({ scrollTrigger: { trigger: mq, start: 'top 95%', end: 'top 6%', scrub: 1, invalidateOnRefresh: true } })
        .fromTo(mq, { x: () => innerWidth * 0.12, scale: 1 }, { x: () => -(mq.scrollWidth - innerWidth * 0.94), ease: 'none', duration: 0.45 })
        .to(mq, { x: () => innerWidth * 0.04, scale: fit, ease: 'power2.inOut', duration: 0.25 })
        .to({}, { duration: 0.3 });
      gsap.fromTo(mq, { opacity: 1 }, { opacity: 0.2, ease: 'none', immediateRender: false, scrollTrigger: { trigger: mq, start: 'top 4%', end: 'top -40%', scrub: true } });
      gsap.fromTo('[data-craft-film]', { clipPath: 'inset(20% 26% 20% 26%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: { trigger: '[data-craft-row]', start: 'top 95%', end: 'top 30%', scrub: true } });
      gsap.fromTo('[data-craft-plate] img', { scale: 1.25 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '[data-craft-row]', start: 'top 95%', end: 'top 30%', scrub: true } });
      gsap.fromTo('[data-craft-macro] img', { yPercent: -10 }, { yPercent: 10, ease: 'none', scrollTrigger: { trigger: '[data-craft-macro]', start: 'top bottom', end: 'bottom top', scrub: true } });
      document.querySelectorAll('[data-craft-item]').forEach(el => {
        gsap.from(el.querySelectorAll('[data-craft-l]'), { yPercent: 105, duration: 1.4, ease: 'expo.out', stagger: 0.12, scrollTrigger: { trigger: el, start: 'top 72%' } });
      });

      gsap.set('[data-wordmark]', { clipPath: 'inset(-45% 100% -5% 0%)' });
      gsap.to('[data-wordmark]', { clipPath: 'inset(-45% 0% -5% 0%)', duration: 3.2, ease: 'power3.inOut', scrollTrigger: { trigger: '[data-wordmark]', start: 'top 92%' } });
      gsap.fromTo('[data-foot-rule]', { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '[data-footer]', start: 'top bottom', end: 'top 55%', scrub: true } });
      gsap.fromTo('[data-noir-stage]', { opacity: 1 }, { opacity: 0.3, ease: 'none', immediateRender: false, scrollTrigger: { trigger: '[data-footer]', start: 'top bottom', end: 'top 35%', scrub: true } });

      const ft = gsap.timeline({ scrollTrigger: { trigger: '#final', start: 'top 75%', end: 'center center', scrub: 1 } });
      ft.fromTo('[data-final-l]', { opacity: 0, letterSpacing: '0.34em', xPercent: -8 }, { opacity: 1, letterSpacing: '0.02em', xPercent: 0, ease: 'none' }, 0)
        .fromTo('[data-final-r]', { opacity: 0, letterSpacing: '0.34em', xPercent: 8 }, { opacity: 1, letterSpacing: '0.02em', xPercent: 0, ease: 'none' }, 0)
        .fromTo('[data-final-meta]', { opacity: 0 }, { opacity: 1, stagger: 0.1, ease: 'none' }, 0.55);

    });
  }

  saveBag(items) { try { localStorage.setItem('noir-bag-v1', JSON.stringify(items)); } catch (e) {} }

  roll(sel, dir) {
    const gsap = window.gsap; if (!gsap || this.reduced) return;
    document.querySelectorAll(sel).forEach(el => gsap.fromTo(el, { yPercent: dir * 70, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.55, ease: 'power3.out', overwrite: true }));
  }

  setItems(items, dir, id) {
    this.saveBag(items);
    this.setState({ items }, () => {
      this.roll('[data-bag-count]', dir); this.roll('[data-subtotal]', dir);
      if (id != null) { this.roll('[data-qty="' + id + '"]', dir); this.roll('[data-line="' + id + '"]', dir); }
    });
  }

  addItem(id) {
    const items = this.state.items.map(x => ({ ...x })), f = items.find(x => x.id === id);
    if (f) f.qty = Math.min(99, f.qty + 1); else items.push({ id, qty: 1 });
    this.setItems(items, 1, id);
  }

  setQty(id, d) {
    const items = this.state.items.map(x => ({ ...x })), f = items.find(x => x.id === id);
    if (!f) return; const q = Math.max(1, Math.min(99, f.qty + d)); if (q === f.qty) return;
    f.qty = q; this.setItems(items, d > 0 ? 1 : -1, id);
  }

  removeItem(id) {
    const gsap = window.gsap, row = document.querySelector('[data-bag-row="' + id + '"]');
    const done = () => {
      const items = this.state.items.filter(x => x.id !== id);
      this.saveBag(items);
      this.setState({ items }, () => {
        document.querySelectorAll('[data-bag-row]').forEach(el => { if (gsap) gsap.set(el, { clearProps: 'height,opacity' }); else { el.style.height = ''; el.style.opacity = ''; } });
        this.roll('[data-bag-count]', -1); this.roll('[data-subtotal]', -1);
        if (!items.length) { const c = document.querySelector('[data-bag-close]'); c && c.focus(); const em = document.querySelector('[data-bag-empty]'); if (em && gsap && !this.reduced) gsap.fromTo(em, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'power3.inOut' }); }
      });
    };
    if (!row || !gsap || this.reduced) return done();
    if (this._removing) return; this._removing = true;
    gsap.timeline({ onComplete: () => { this._removing = false; done(); } })
      .to(row, { opacity: 0.25, duration: 0.3, ease: 'power2.out' })
      .to(row, { height: 0, opacity: 0, duration: 0.6, ease: 'power3.inOut' });
  }

  lockScroll(on) {
    const de = document.documentElement;
    if (on) { const sw = innerWidth - de.clientWidth; de.style.overflow = 'hidden'; if (sw > 0) de.style.paddingRight = sw + 'px'; }
    else { de.style.overflow = ''; de.style.paddingRight = ''; }
  }

  openBag() {
    if (this.state.bagOpen) return;
    const gsap = window.gsap, layer = document.querySelector('[data-bag-layer]'), dr = document.querySelector('[data-bag-drawer]'), sc = document.querySelector('[data-bag-scrim]');
    const main = document.querySelector('main'), stage = document.querySelector('[data-noir-stage]');
    this.lastFocus = document.activeElement;
    this.setState({ bagOpen: true }); this.lockScroll(true);
    layer.style.visibility = 'visible';
    if (!gsap || this.reduced) { sc.style.opacity = 1; dr.style.transform = 'none'; }
    else {
      gsap.killTweensOf([dr, sc]); gsap.killTweensOf([main, stage], 'scale');
      gsap.to(sc, { opacity: 1, duration: 0.9, ease: 'power2.out' });
      gsap.fromTo(dr, { xPercent: 100 }, { xPercent: 0, duration: 1.15, ease: 'power4.out' });
      gsap.fromTo(dr, { rotationY: -9, z: -60 }, { rotationY: 0, z: 0, duration: 0.8, ease: 'power3.out' });
      gsap.to(main, { scale: 0.985, transformOrigin: '50% ' + (scrollY + innerHeight / 2) + 'px', duration: 1.1, ease: 'power3.out' });
      gsap.to(stage, { scale: 0.985, transformOrigin: '50% 50%', duration: 1.1, ease: 'power3.out' });
    }
    setTimeout(() => { const c = document.querySelector('[data-bag-close]'); c && c.focus({ preventScroll: true }); }, 60);
  }

  closeBag(after) {
    if (!this.state.bagOpen) return;
    const gsap = window.gsap, layer = document.querySelector('[data-bag-layer]'), dr = document.querySelector('[data-bag-drawer]'), sc = document.querySelector('[data-bag-scrim]');
    const main = document.querySelector('main'), stage = document.querySelector('[data-noir-stage]');
    const finish = () => {
      layer.style.visibility = 'hidden'; this.lockScroll(false);
      if (gsap) gsap.set([main, stage], { clearProps: 'scale,transformOrigin' });
      this.setState({ bagOpen: false });
      const b = document.querySelector('[data-bag-btn]');
      b && b.focus({ preventScroll: true });
      after && after();
    };
    if (!gsap || this.reduced) { sc.style.opacity = 0; return finish(); }
    gsap.killTweensOf([dr, sc]); gsap.killTweensOf([main, stage], 'scale');
    gsap.to(sc, { opacity: 0, duration: 0.8, ease: 'power2.inOut' });
    gsap.to([main, stage], { scale: 1, duration: 0.85, ease: 'power3.inOut' });
    gsap.to(dr, { xPercent: 100, rotationY: -5, duration: 0.85, ease: 'power3.inOut', onComplete: finish });
  }

  bagKey(e) {
    if (e.key !== 'Tab') return;
    const dr = document.querySelector('[data-bag-drawer]');
    const f = [...dr.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])')].filter(el => !el.disabled && el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  craftUpdate() {
    const T = this.T; if (!T) return;
    const c = this._cu || (this._cu = { items: [...document.querySelectorAll('[data-craft-item]')], film: document.querySelector('[data-craft-film]'), plate: document.querySelector('[data-craft-plate]'), idx: document.querySelector('[data-craft-idx]'), macro: document.querySelector('[data-craft-macro]'), macroL: document.querySelector('[data-craft-macro-l]') });
    if (!c.film || !c.items.length) return;
    const vh = innerHeight, pr = c.film.getBoundingClientRect(), stack = this.state.stack;
    const refY = stack ? pr.bottom + (vh - pr.bottom) * 0.5 : vh * 0.5;
    const rs = c.items.map(el => el.getBoundingClientRect());
    let f = clamp((refY - rs[0].top) / rs[0].height, -1, 0);
    rs.forEach((r, i) => { const p = (refY - r.top) / r.height; if (p >= 0) f = i + Math.min(p, 0.999); });
    T.craftF = f;
    const sec = c.sec || (c.sec = document.getElementById('craft'));
    T.craftIn = clamp((vh - sec.getBoundingClientRect().top) / (vh * 0.7), 0, 1);
    T.craftX = ((pr.left + pr.width / 2) / innerWidth) * 2 - 1;
    T.craftY = -(((pr.top + pr.height / 2) / vh) * 2 - 1);
    const act = f < 0 ? -1 : Math.min(3, Math.floor(f));
    const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
    c.items.forEach((el, i) => {
      let o = act === i ? 1 : 0.34;
      if (stack) o *= clamp((rs[i].bottom - pr.bottom) / 120, 0, 1);
      el.style.opacity = o;
      const nm = el.querySelector('[data-craft-name]'); if (nm) nm.style.color = act === i ? '#e8b25a' : '#ede3d1';
    });
    const d4 = c.items[3] && c.items[3].querySelector('[data-craft-desc]');
    if (d4) { const r = this.reduced ? 1 : ss(0.3, 0.58, f - 3); d4.style.clipPath = 'inset(0% ' + ((1 - r) * 100).toFixed(2) + '% 0% 0%)'; }
    if (c.macro) { const m = this.reduced ? (act === 1 ? 1 : 0) : ss(1.02, 1.3, f) * (1 - ss(1.85, 2.1, f)); c.macro.style.clipPath = 'inset(' + ((1 - m) * 100).toFixed(2) + '% 0% 0% 0%)'; if (c.macroL) c.macroL.style.opacity = m; }
    if (c.plate && !this.state.glFail) { const w = this.reduced ? (f > -0.2 ? 1 : 0) : ss(-0.4, 0.02, f); c.plate.style.clipPath = 'inset(' + (w * 100).toFixed(2) + '% 0% 0% 0%)'; }
    if (c.idx) {
      const NM = ['GLASS', 'MATERIAL', 'COMPOSITION', 'LIGHT & DARK'];
      const txt = act < 0 ? '' : 'INSPECTION 0' + (act + 1) + ' / 04 — ' + NM[act];
      if (c.idx.textContent !== txt) c.idx.textContent = txt;
      c.idx.style.opacity = act < 0 ? 0 : 1;
    }
  }

  immWarp(c) {
    if (this.reduced) return;
    const w = this._iw || (this._iw = { d: document.querySelector('[data-imm-disp]'), n: document.querySelector('[data-imm-turb]'), h: document.querySelector('[data-imm-head]') });
    if (!w.d || !w.h) return;
    const sc = c * 18;
    w.d.setAttribute('scale', sc.toFixed(1));
    w.n.setAttribute('baseFrequency', '0.006 ' + (0.045 + 0.015 * Math.sin(performance.now() / 260)).toFixed(4));
    w.h.style.filter = sc > 0.3 ? 'url(#immWarp)' : 'none';
  }

  go(id) {
    return e => {
      e && e.preventDefault();
      const el = document.getElementById(id); if (!el) return;
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + (id === 'final' ? el.offsetHeight * 0.34 : 0), behavior: this.reduced ? 'auto' : 'smooth' });
    };
  }

  fe() {
    if (this._fe) return this._fe;
    const root = document.getElementById('collection'), nf = n => !n.closest('[data-leaf-host]');
    const by = (sel, key) => [...root.querySelectorAll(sel)].filter(nf).sort((a, b) => a.dataset[key] - b.dataset[key]);
    return (this._fe = { root, stage: root.querySelector('[data-folio-stage]'), folio: root.querySelector('[data-folio]'), host: root.querySelector('[data-leaf-host]'),
      lp: by('[data-lp]', 'lp'), rp: by('[data-rp]', 'rp'), shL: root.querySelector('[data-shadow="L"]'), shR: root.querySelector('[data-shadow="R"]') });
  }

  show(list, k) { list.forEach((el, x) => { el.style.visibility = x === k ? 'visible' : 'hidden'; }); }

  setWorld(j) {
    const gsap = window.gsap, E = this.fe(), inst = !gsap || this.reduced;
    document.querySelectorAll('[data-coll-atmos]').forEach((el, k) => inst ? (el.style.opacity = k === j ? 1 : 0) : gsap.to(el, { opacity: k === j ? 1 : 0, duration: 2, ease: 'power2.inOut' }));
    if (inst) { E.root.style.backgroundColor = COLL[j].bg; Object.entries(MAT[j]).forEach(([k, v]) => E.folio.style.setProperty(k, v)); return; }
    gsap.to(E.root, { backgroundColor: COLL[j].bg, duration: 2, ease: 'power2.inOut' });
    gsap.to(E.folio, { ...MAT[j], duration: 1.8, ease: 'power2.inOut' });
  }

  face(src, off, W, sw, back) {
    const f = document.createElement('div');
    f.style.cssText = 'position:absolute;top:0;left:0;width:' + (sw + 0.8) + 'px;height:100%;overflow:hidden;backface-visibility:hidden;-webkit-backface-visibility:hidden;' + (back ? 'transform-origin:' + (sw / 2) + 'px 50%;transform:rotateY(180deg);' : '');
    const c = src.cloneNode(true);
    c.removeAttribute('data-lp'); c.removeAttribute('data-rp');
    Object.assign(c.style, { position: 'absolute', inset: 'auto', top: '0', left: -off + 'px', width: W + 'px', height: '100%', visibility: 'visible' });
    const d = document.createElement('div'); d.style.cssText = 'position:absolute;inset:0;background:#000;opacity:0;';
    const s = document.createElement('div'); s.style.cssText = 'position:absolute;inset:0;opacity:0;background:linear-gradient(90deg,rgba(255,232,196,0),rgba(255,232,196,.5),rgba(255,232,196,0));';
    f.append(c, d, s);
    return { f, c, d, s };
  }

  begin(j, dir) {
    const E = this.fe(), i = this.state.sel, fwd = dir > 0;
    const W = E.host.offsetWidth, sw = W / NS;
    const front = E.rp[fwd ? i : j], back = E.lp[fwd ? j : i];
    E.host.innerHTML = '';
    let parent = E.host; const strips = [], faces = [], titles = [];
    for (let k = 0; k < NS; k++) {
      const s = document.createElement('div');
      s.style.cssText = 'position:absolute;top:0;left:' + (k ? sw : 0) + 'px;width:' + sw + 'px;height:100%;transform-origin:0 50%;transform-style:preserve-3d;';
      const fr = this.face(front, k * sw, W, sw, false), bk = this.face(back, (NS - 1 - k) * sw, W, sw, true);
      if (fwd) { bk.c.querySelectorAll('[data-meta]').forEach(m => { m.style.opacity = 0; }); titles.push(bk.c.querySelector('[data-title]')); }
      s.append(fr.f, bk.f); parent.appendChild(s); parent = s;
      strips.push(s); faces.push({ fr, bk });
    }
    const rest = fwd ? 0 : 1, goal = fwd ? 1 : 0;
    if (fwd) { this.show(E.rp, j); this.rVis = j; }
    else {
      this.show(E.lp, j);
      E.lp[j].querySelectorAll('[data-meta]').forEach(m => { m.style.opacity = 0; });
    }
    this.turn = { i, j, dir, fwd, rest, goal, p: rest, v: 0, drive: { t: rest }, strips, faces, titles, baseTitle: E.lp[j].querySelector('[data-title]') };
    this.render(this.turn);
    this.startLoop();
    return this.turn;
  }

  driveTo(t, target, dur, ez) {
    t.tw && t.tw.kill(); t.done = false; t.settle = target;
    t.tw = window.gsap.to(t.drive, { t: target, duration: dur, ease: ez, onComplete: () => { t.done = true; } });
  }

  commit(ez) {
    const t = this.turn; if (!t || t.committed) return;
    t.committed = true; t.preview = false;
    this.driveTo(t, t.goal, 0.5 + 1.4 * Math.abs(t.goal - t.drive.t), ez || 'power2.inOut');
    this.setWorld(t.j);
  }

  release() {
    const t = this.turn; if (!t) return;
    t.preview = false;
    this.driveTo(t, t.rest, 0.4 + 0.9 * Math.abs(t.drive.t - t.rest), 'power2.out');
  }

  render(t) {
    const E = this.fe(), p = t.p, th0 = -180 * p, s1 = Math.sin(Math.PI * p);
    let b = -BEND * (0.8 * Math.sin(2 * Math.PI * p) + 0.35 * t.dir * s1);
    b = clamp(b, (-180 - th0) / (NS - 1), -th0 / (NS - 1));
    t.strips.forEach((s, k) => { s.style.transform = 'rotateY(' + (k ? b : th0) + 'deg)'; });
    const shade = (o, rel) => {
      const x = Math.abs(rel) - LIGHT;
      o.d.style.opacity = Math.max(0, 0.82 - Math.cos(x * D2R)) * 1.25;
      o.s.style.opacity = Math.exp(-(x / 14) * (x / 14)) * 0.22 * s1;
    };
    t.faces.forEach((fc, k) => { const A = th0 + (k + 0.5) * b; shade(fc.fr, -A); shade(fc.bk, A + 180); });
    const th = -(th0 + (NS / 2) * b) * D2R, sn = Math.sin(th), cs = Math.cos(th);
    E.shR.style.opacity = cs > -0.15 ? sn * 0.8 : 0; E.shR.style.transform = 'scaleX(' + clamp(cs + 0.32 * sn, 0, 1) + ')';
    E.shL.style.opacity = cs < 0.15 ? sn * 0.8 : 0; E.shL.style.transform = 'scaleX(' + clamp(-cs + 0.32 * sn, 0, 1) + ')';
    E.stage.style.perspective = (2400 - 800 * s1) + 'px';
    if (t.fwd) { const ty = (1 - ease(clamp((p - 0.5) / 0.4, 0, 1))) * 102; t.titles.forEach(el => { el.style.transform = 'translateY(' + ty + '%)'; }); }
    else t.baseTitle.style.transform = 'translateY(' + ease(clamp((p - 0.35) / 0.5, 0, 1)) * 102 + '%)';
  }

  finish(done) {
    const t = this.turn, E = this.fe(), gsap = window.gsap;
    t.tw && t.tw.kill(); this.turn = null;
    E.host.innerHTML = '';
    E.shL.style.opacity = 0; E.shR.style.opacity = 0; E.stage.style.perspective = '2400px';
    const k = done ? t.j : t.i;
    this.show(E.lp, k); this.show(E.rp, k); this.rVis = k;
    E.lp.forEach(el => { const ti = el.querySelector('[data-title]'); if (ti) ti.style.transform = ''; });
    if (done) {
      const metas = E.lp[k].querySelectorAll('[data-meta]');
      if (t.fwd) metas.forEach(m => { m.style.opacity = 0; });
      gsap.fromTo(metas, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 1.1, ease: 'power2.out', stagger: 0.09, clearProps: 'transform' });
      this.setState({ sel: k });
    } else {
      E.lp.forEach(el => el.querySelectorAll('[data-meta]').forEach(m => { m.style.opacity = ''; }));
      this.setWorld(k);
    }
  }

  startLoop() {
    if (this._raf || this.reduced) return;
    let last = performance.now();
    const tick = now => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      this.frame(dt);
      const idle = !this.collVis && !this.turn && Math.abs(this.tilt.x) + Math.abs(this.tilt.y) < 0.001;
      this._raf = idle ? null : requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }

  frame(dt) {
    const E = this.fe(); if (!E.folio) return;
    const tl = this.tilt, f = Math.min(1, dt * 2.6);
    tl.x += (this.tp.x - tl.x) * f; tl.y += (this.tp.y - tl.y) * f;
    E.folio.style.transform = 'rotateX(' + (-tl.y * 2.2).toFixed(3) + 'deg) rotateY(' + (tl.x * 2.8).toFixed(3) + 'deg)';
    E.folio.style.setProperty('--hx', (50 + tl.x * 34).toFixed(1) + '%');
    E.folio.style.setProperty('--hy', (40 + tl.y * 30).toFixed(1) + '%');
    const t = this.turn;
    if (t) {
      const a = 38 * (t.drive.t - t.p) - 11 * t.v;
      t.v += a * dt; t.p += t.v * dt;
      if (t.p < 0 || t.p > 1) { t.p = clamp(t.p, 0, 1); t.v = 0; }
      this.render(t);
      if (!t.dragging && t.done && Math.abs(t.p - t.settle) < 0.002 && Math.abs(t.v) < 0.02 && t.settle !== undefined && !t.preview) {
        if (t.settle === t.goal) this.finish(true); else if (t.settle === t.rest) this.finish(false);
      }
    }
    const rp = E.rp[this.rVis ?? this.state.sel]; if (!rp) return;
    const u = this.turn && this.turn.fwd ? 1 - this.turn.p : 0;
    const env = rp.querySelector('[data-env]'), bot = rp.querySelector('[data-bottle]');
    if (env) env.style.transform = 'translate(' + (tl.x * -6 - u * 10).toFixed(2) + 'px,' + (tl.y * -4).toFixed(2) + 'px)';
    if (bot) bot.style.transform = 'translate(' + (tl.x * 5 - u * 22).toFixed(2) + 'px,' + (tl.y * 3).toFixed(2) + 'px)';
  }

  instant(j) {
    const E = this.fe();
    this.show(E.lp, j); this.show(E.rp, j); this.rVis = j;
    this.setWorld(j); this.setState({ sel: j });
  }

  chapter(j) {
    const sel = this.state.sel;
    if (j === sel) return;
    if (this.reduced || !window.gsap) return this.instant(j);
    const t = this.turn;
    if (t) { if (t.j === j && !t.committed && !t.dragging) this.commit(); return; }
    this.begin(j, j > sel ? 1 : -1); this.commit();
  }

  preview(j) {
    if (this.reduced || !window.gsap || this.turn || j === this.state.sel || this.drag) return;
    const t = this.begin(j, j > this.state.sel ? 1 : -1);
    t.preview = true;
    t.tw = window.gsap.to(t.drive, { t: t.rest + (t.goal - t.rest) * 0.045, duration: 1, ease: 'power2.out' });
  }

  unpreview() { const t = this.turn; if (t && t.preview && !t.committed) this.release(); }

  folioDown(e) {
    if (this.reduced || !window.gsap || (e.button && e.button > 0) || e.target.closest('a')) return;
    if (this.turn) { if (this.turn.preview && !this.turn.committed) this.finish(false); else return; }
    const r = this.fe().folio.getBoundingClientRect();
    const d = this.drag = { x0: e.clientX, y0: e.clientY, r, side: e.clientX > r.left + r.width / 2 ? 1 : -1, started: false, last: 0, lt: performance.now(), vel: 0 };
    const move = ev => {
      const dx = ev.clientX - d.x0, dy = ev.clientY - d.y0;
      if (!d.started) {
        if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
        const sel = this.state.sel, t = this.begin(d.side > 0 ? (sel + 1) % 3 : (sel + 2) % 3, d.side);
        t.dragging = true; d.started = true;
        d.spine = d.r.left + d.r.width / 2; d.W = d.r.width / 2;
        d.a0 = Math.acos(clamp((d.x0 - d.spine) / d.W, -1, 1)) / Math.PI; d.last = t.rest;
      }
      const t = this.turn; if (!t) return;
      const a = Math.acos(clamp((ev.clientX - d.spine) / d.W, -1, 1)) / Math.PI;
      const v = clamp(t.rest + (a - d.a0), 0, 1), now = performance.now(), dtt = Math.max(0.001, (now - d.lt) / 1000);
      d.vel = d.vel * 0.6 + ((v - d.last) / dtt) * 0.4; d.last = v; d.lt = now;
      t.drive.t = v;
    };
    const up = ev => {
      this.endDrag();
      if (!d.started) {
        const x = (ev.clientX - r.left) / r.width, sel = this.state.sel;
        if (ev.type === 'pointerup' && x > 0.5) this.chapter((sel + 1) % 3);
        else if (ev.type === 'pointerup' && x < 0.15) this.chapter((sel + 2) % 3);
        return;
      }
      const t = this.turn; if (!t) return;
      t.dragging = false;
      const sgn = t.goal > t.rest ? 1 : -1, frac = (t.drive.t - t.rest) * sgn, vg = d.vel * sgn;
      if ((frac > 0.38 || vg > 0.9) && vg > -0.6) this.commit('power2.out'); else this.release();
    };
    this.endDrag = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); this.drag = null; this.endDrag = null; };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  }

  renderVals() {
    const s = this.state, v = {};
    if (this.T) { this.T.fogMul = this.props.fogAmount ?? 1; this.T.exposure = this.props.exposure ?? 1; }
    for (let i = 0; i < 4; i++) {
      v['navEnter' + i] = () => this.setState({ navH: i });
      v['nl' + i] = s.navH === i ? 'scaleX(1)' : 'scaleX(0)';
    }
    v.navLeave = () => this.setState({ navH: -1 });
    v.navDisplay = s.navHidden ? 'none' : 'flex';

    for (let i = 0; i < 3; i++) {
      const on = s.note === i;
      v['noteEnter' + i] = () => { this.hoverNote = i; if (this.T) this.T.noteF = i; this.setState({ note: i }); };
      v['wc' + i] = on ? '#ede3d1' : 'rgba(237,227,209,0)';
      v['ws' + i] = on ? 'rgba(237,227,209,0)' : 'rgba(237,227,209,.32)';
      v['do' + i] = on ? 1 : 0;
      v['dt' + i] = on ? 'translateY(0)' : 'translateY(10px)';
      v['mk' + i] = on ? '28px' : '0px';
    }
    v.noteLeave = () => { this.hoverNote = null; const n = this.scrollNote ?? 0; if (this.T) this.T.noteF = n; this.setState({ note: n }); };
    v.noteNum = '0' + (s.note + 1);

    const c = COLL[s.sel];
    v.cNotes = c.notes; v.cDesc = c.desc; v.cIdx = '0' + (s.sel + 1);
    v.folio = FOLIO; v.mobile = s.mobile; v.detailDisp = s.mobile ? 'none' : 'flex'; v.idxDisp = s.mobile ? 'none' : 'inline';
    for (let i = 0; i < 3; i++) {
      v['ch' + i] = e => { e && e.preventDefault(); this.chapter(i); };
      v['chEnter' + i] = () => this.preview(i);
      v['chc' + i] = s.sel === i ? '#e8b25a' : 'rgba(237,227,209,.42)';
    }
    v.chLeave = () => this.unpreview();
    v.folioDown = e => this.folioDown(e);
    v.collMove = e => {
      if (e.pointerType === 'touch' || this.reduced || !this.tp) return;
      const r = this.fe().folio.getBoundingClientRect();
      this.tp.x = clamp((e.clientX - (r.left + r.width / 2)) / (r.width / 2 + 160), -1, 1);
      this.tp.y = clamp((e.clientY - (r.top + r.height / 2)) / (r.height / 2 + 160), -1, 1);
    };
    v.collLeave = () => { if (this.tp) { this.tp.x = 0; this.tp.y = 0; } };

    v.addBag = e => { e && e.preventDefault(); this.addItem(s.sel); };
    const money = n => '$' + n.toLocaleString('en-US');
    const PRICE = 185, count = s.items.reduce((a, x) => a + x.qty, 0);
    v.bag = count; v.glFail = s.glFail;
    v.bagLabel = count + (count === 1 ? ' ITEM' : ' ITEMS');
    v.bagHas = s.items.length > 0; v.bagEmpty = s.items.length === 0; v.bagExp = s.bagOpen ? 'true' : 'false';
    v.subtotal = money(count * PRICE);
    v.cart = s.items.map(x => ({
      id: x.id, name: COLL[x.id].name, idx: '0' + (x.id + 1), qtyS: String(x.qty).padStart(2, '0'),
      total: money(x.qty * PRICE), unit: x.qty > 1 ? money(PRICE) + ' EACH' : '', minusO: x.qty > 1 ? 1 : 0.3,
      d0: x.id === 0 ? 'block' : 'none', d1: x.id === 1 ? 'block' : 'none', d2: x.id === 2 ? 'block' : 'none',
      dec: () => this.setQty(x.id, -1), inc: () => this.setQty(x.id, 1), rm: () => this.removeItem(x.id),
    }));
    v.openBag = e => { e && e.preventDefault(); this.openBag(); };
    v.bagBtnKey = e => { if (e.key === ' ') { e.preventDefault(); this.openBag(); } };
    v.closeBag = () => this.closeBag();
    v.bagKey = e => this.bagKey(e);
    v.exploreColl = () => this.closeBag(() => this.go('collection')());
    v.ckEnter = () => this.setState({ ck: true }); v.ckLeave = () => this.setState({ ck: false });
    v.ckFill = s.ck ? 'scaleX(1)' : 'scaleX(0)'; v.ckText = s.ck ? '#0a0806' : '#ede3d1'; v.ckLine = s.ck ? '34px' : '18px';
    v.craftBg = s.glFail ? '#080706' : 'transparent';
    v.craftVisB = s.stack ? '100%' : '440px'; v.craftVisH = s.stack ? '58vh' : '100vh'; v.craftFilmH = s.stack ? '50vh' : 'min(84vh,900px)';

    v.goHero = this.go('hero'); v.goScent = this.go('scent'); v.goCollection = this.go('collection');
    v.goRitual = this.go('ritual'); v.goFinal = this.go('final');
    return v;
  }
}
