/* src/js/budman.js */
/*
 * budman.js — custom interakce pro Shoptet šablonu (vanilla, bez závislostí).
 * Nahrává se přes FTP do /user/documents/ a odkazuje v Návrháři šablon.
 * Pravidla Shoptet: žádné document.write, UTF-8, neobfuskovat.
 */
(function () {
	'use strict';

	var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	// --- Scroll-reveal: prvky s [data-reveal] se objeví při scrollu -------
	function initReveal() {
		var els = document.querySelectorAll('[data-reveal]');
		if (!els.length) return;

		// Bez podpory IO nebo s reduce-motion → rovnou viditelné.
		if (reduceMotion || !('IntersectionObserver' in window)) {
			els.forEach(function (el) {
				el.classList.add('is-revealed');
			});
			return;
		}

		var io = new IntersectionObserver(
			function (entries) {
				entries.forEach(function (entry) {
					if (entry.isIntersecting) {
						entry.target.classList.add('is-revealed');
						io.unobserve(entry.target);
					}
				});
			},
			{ rootMargin: '0px 0px -10% 0px', threshold: 0.15 }
		);

		els.forEach(function (el) {
			io.observe(el);
		});
	}

	// --- Sticky header: třída po odscrollování (zmenšení/stín) ------------
	function initStickyHeader() {
		var header = document.querySelector('[data-sticky-header]');
		if (!header) return;

		var ticking = false;
		function update() {
			header.classList.toggle('is-scrolled', window.scrollY > 24);
			ticking = false;
		}
		window.addEventListener(
			'scroll',
			function () {
				if (!ticking) {
					window.requestAnimationFrame(update);
					ticking = true;
				}
			},
			{ passive: true }
		);
		update();
	}

	function ready(fn) {
		if (document.readyState !== 'loading') fn();
		else document.addEventListener('DOMContentLoaded', fn);
	}

	ready(function () {
		initReveal();
		initStickyHeader();
	});
})();


/* src/js/header.js */
/*
 * header.js — přepínání mobilní navigace. Vanilla, bez závislostí.
 */
(function () {
	'use strict';

	function ready(fn) {
		if (document.readyState !== 'loading') fn();
		else document.addEventListener('DOMContentLoaded', fn);
	}

	ready(function () {
		var burger = document.querySelector('[data-burger]');
		var nav = document.querySelector('[data-nav]');
		if (!burger || !nav) return;

		function setOpen(open) {
			nav.classList.toggle('is-open', open);
			burger.setAttribute('aria-expanded', open ? 'true' : 'false');
		}

		burger.addEventListener('click', function () {
			setOpen(!nav.classList.contains('is-open'));
		});

		// Zavřít po kliknutí na odkaz nebo Esc.
		nav.addEventListener('click', function (e) {
			if (e.target.closest('a')) setOpen(false);
		});
		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape') setOpen(false);
		});
	});
})();


/* src/js/hero-smoke.js */
/*
 * hero-smoke.js — realistický dým/pára z dab rigu (vanilla Canvas, bez závislostí).
 * Particle systém na 2D canvasu, requestAnimationFrame. Běží jen když je hero ve viewportu
 * a záložka je aktivní. prefers-reduced-motion → nespustí se (zůstane statický SVG wisp).
 *
 * Markup: <div class="budman-hero__stage" data-hero-smoke> … SVG rig …
 *           <canvas class="budman-hero__smoke" data-smoke-canvas></canvas>
 *         </div>
 * Pozici emitoru (banger) lze doladit: data-emit-x / data-emit-y (0–1 vůči stage).
 */
(function () {
	'use strict';

	var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	function rnd(a, b) {
		return a + Math.random() * (b - a);
	}

	function HeroSmoke(stage) {
		var canvas = stage.querySelector('[data-smoke-canvas]');
		if (!canvas || !canvas.getContext) return;

		var ctx = canvas.getContext('2d');
		var dpr = Math.min(window.devicePixelRatio || 1, 2);
		var W = 0,
			H = 0;
		var particles = [];
		var ems = [];
		var running = false,
			inView = false,
			visible = !document.hidden,
			raf = 0,
			last = 0;

		function baseRate() {
			// částic/s — škáluje s šířkou, na mobilu lehčí
			return Math.max(7, Math.min(24, W / 44));
		}
		function maxParticles() {
			return Math.round(Math.min(240, W * 0.65));
		}

		function computeEmitters() {
			var mx = parseFloat(stage.getAttribute('data-emit-x'));
			var my = parseFloat(stage.getAttribute('data-emit-y'));
			if (isNaN(mx)) mx = 0.7;
			if (isNaN(my)) my = 0.4;
			ems = [
				// hlavní dým z bangeru (zahřátý extrakt)
				{ x: mx * W, y: my * H, rate: baseRate(), spread: W * 0.012, vy0: -26, size: [7, 13], life: [2.6, 4.2], warm: true, acc: 0 },
				// jemný wisp z náustku
				{ x: 0.46 * W, y: 0.17 * H, rate: baseRate() * 0.4, spread: W * 0.009, vy0: -30, size: [5, 9], life: [2.2, 3.4], warm: false, acc: 0 },
			];
		}

		function resize() {
			var r = stage.getBoundingClientRect();
			W = r.width;
			H = r.height;
			if (!W || !H) return;
			canvas.width = Math.round(W * dpr);
			canvas.height = Math.round(H * dpr);
			canvas.style.width = W + 'px';
			canvas.style.height = H + 'px';
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			computeEmitters();
		}

		function spawn(em) {
			if (particles.length >= maxParticles()) return;
			particles.push({
				x: em.x + rnd(-em.spread, em.spread),
				y: em.y + rnd(-2, 2),
				vx: rnd(-4, 4),
				vy: em.vy0 + rnd(-6, 6),
				r: rnd(em.size[0], em.size[1]),
				grow: rnd(9, 18),
				life: 0,
				max: rnd(em.life[0], em.life[1]),
				seed: Math.random() * 6.283,
				warm: em.warm,
			});
		}

		function update(dt, t) {
			for (var e = 0; e < ems.length; e++) {
				var em = ems[e];
				em.acc += em.rate * dt;
				while (em.acc >= 1) {
					spawn(em);
					em.acc -= 1;
				}
			}
			for (var i = particles.length - 1; i >= 0; i--) {
				var p = particles[i];
				p.life += dt;
				if (p.life >= p.max) {
					particles.splice(i, 1);
					continue;
				}
				// stoupání (mírné zrychlení) + sotva znatelný úklon a turbulence
				p.vy += -7 * dt;
				p.vx += (Math.sin(t * 0.0012 + p.seed) * 7 + 3) * dt;
				p.x += p.vx * dt;
				p.y += p.vy * dt;
				p.r += p.grow * dt;
			}
		}

		function draw(t) {
			ctx.clearRect(0, 0, W, H);

			// „ember" — měkké pulzující žhnutí na bangeru (zahřátý quartz)
			if (ems[0]) {
				var pulse = 0.5 + 0.5 * Math.sin(t * 0.004);
				var er = 26 + pulse * 10;
				var eg = ctx.createRadialGradient(ems[0].x, ems[0].y, 0, ems[0].x, ems[0].y, er);
				eg.addColorStop(0, 'rgba(255, 168, 70, ' + (0.16 + pulse * 0.12).toFixed(3) + ')');
				eg.addColorStop(1, 'rgba(255, 168, 70, 0)');
				ctx.globalCompositeOperation = 'lighter';
				ctx.fillStyle = eg;
				ctx.beginPath();
				ctx.arc(ems[0].x, ems[0].y, er, 0, 6.283);
				ctx.fill();
			}

			// dým — aditivně, ať na tmavém pozadí jemně světélkuje jako pára
			ctx.globalCompositeOperation = 'lighter';
			for (var i = 0; i < particles.length; i++) {
				var p = particles[i];
				var ratio = p.life / p.max;
				var alpha = Math.sin(Math.PI * ratio) * (p.warm ? 0.1 : 0.07);
				if (alpha <= 0) continue;
				var col = p.warm ? '198, 214, 180' : '210, 222, 205';
				var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
				g.addColorStop(0, 'rgba(' + col + ', ' + alpha.toFixed(3) + ')');
				g.addColorStop(1, 'rgba(' + col + ', 0)');
				ctx.fillStyle = g;
				ctx.beginPath();
				ctx.arc(p.x, p.y, p.r, 0, 6.283);
				ctx.fill();
			}
			ctx.globalCompositeOperation = 'source-over';
		}

		function loop(t) {
			if (!running) return;
			if (!last) last = t;
			var dt = Math.min((t - last) / 1000, 0.05);
			last = t;
			update(dt, t);
			draw(t);
			raf = window.requestAnimationFrame(loop);
		}

		function start() {
			if (running || reduce) return;
			running = true;
			last = 0;
			raf = window.requestAnimationFrame(loop);
		}
		function stop() {
			running = false;
			if (raf) window.cancelAnimationFrame(raf);
		}
		function sync() {
			if (inView && visible) start();
			else stop();
		}

		resize();

		if ('ResizeObserver' in window) {
			new ResizeObserver(resize).observe(stage);
		} else {
			window.addEventListener('resize', resize, { passive: true });
		}

		if ('IntersectionObserver' in window) {
			new IntersectionObserver(
				function (entries) {
					inView = entries[0].isIntersecting;
					sync();
				},
				{ threshold: 0.05 }
			).observe(stage);
		} else {
			inView = true;
		}

		document.addEventListener('visibilitychange', function () {
			visible = !document.hidden;
			sync();
		});

		sync();
	}

	function ready(fn) {
		if (document.readyState !== 'loading') fn();
		else document.addEventListener('DOMContentLoaded', fn);
	}

	ready(function () {
		document.querySelectorAll('[data-hero-smoke]').forEach(function (stage) {
			HeroSmoke(stage);
		});
	});
})();


/* src/js/shop.js */
/*
 * shop.js — drobná interaktivita detailu produktu (galerie, varianty, množství).
 * Vanilla, bez závislostí. Na Shoptetu se část řeší nativně; tohle je pro náš markup/preview.
 */
(function () {
	'use strict';

	function ready(fn) {
		if (document.readyState !== 'loading') fn();
		else document.addEventListener('DOMContentLoaded', fn);
	}

	function activate(group, selector, el) {
		group.querySelectorAll(selector).forEach(function (x) {
			x.classList.remove('is-active');
		});
		el.classList.add('is-active');
	}

	ready(function () {
		// Galerie: klik na náhled označí aktivní (v reálu by přehodil hlavní obrázek).
		document.querySelectorAll('[data-gallery]').forEach(function (g) {
			g.querySelectorAll('[data-thumb]').forEach(function (t) {
				t.addEventListener('click', function () {
					activate(g, '[data-thumb]', t);
				});
			});
		});

		// Výběr varianty (chip).
		document.querySelectorAll('[data-chips]').forEach(function (group) {
			group.querySelectorAll('.budman-chip').forEach(function (c) {
				c.addEventListener('click', function () {
					activate(group, '.budman-chip', c);
				});
			});
		});

		// Množství +/−.
		document.querySelectorAll('[data-qty]').forEach(function (q) {
			var input = q.querySelector('input');
			var dec = q.querySelector('[data-qty-dec]');
			var inc = q.querySelector('[data-qty-inc]');
			if (dec) dec.addEventListener('click', function () {
				input.value = Math.max(1, (parseInt(input.value, 10) || 1) - 1);
			});
			if (inc) inc.addEventListener('click', function () {
				input.value = (parseInt(input.value, 10) || 1) + 1;
			});
		});
	});
})();


/* src/js/shoptet-enhance.js */
/*
 * shoptet-enhance.js — premium vylepšení živé Shoptet šablony (template-11).
 * Vanilla, bez závislostí. Vše respektuje prefers-reduced-motion, pauzuje mimo
 * viewport / na skryté záložce, čistí se a nezasahuje do použitelnosti (formuláře, košík).
 *
 *  1) Intro: „B" z loga přiletí a MORPHNE do hlavičkového loga (1× za session)
 *  2) Hero: reálný prodávaný rig (Watermelon Recycler) s dýmem z náustku
 *  3) Custom „B" kurzor (desktop, mimo formuláře/pokladnu)
 *  4) Jemný scroll-reveal na titulce + magnetické CTA
 */
(function () {
	'use strict';

	var CDN = 'https://cdn.jsdelivr.net/gh/zukysevents-dot/budman-shoptet@main';
	// rig.png pinnut na commit (jsDelivr @main cache na mutable cestě servíruje stale) — bump při změně rigu
	var RIG_URL = 'https://cdn.jsdelivr.net/gh/zukysevents-dot/budman-shoptet@3497d21/assets/hero/rig.png';
	var B_URL = CDN + '/assets/brand/budman-b.png';

	var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

	function ready(fn) {
		if (document.readyState !== 'loading') fn();
		else document.addEventListener('DOMContentLoaded', fn);
	}
	function isHome() {
		return /(^|\s)(in-index|type-index)(\s|$)/.test(document.body.className || '');
	}
	function isSensitivePage() {
		var c = document.body.className || '';
		return /type-cart|type-order|in-cart|ordering|checkout/.test(c) ||
			/\/(kosik|objednavka|pokladna|order|cart)/i.test(location.pathname);
	}
	function rnd(a, b) { return a + Math.random() * (b - a); }

	/* ============================================================ */
	/* Kompaktní dýmový engine na <canvas> – emituje z (relX, relY). */
	/* ============================================================ */
	function startSmoke(canvas, relX, relY) {
		if (reduce || !canvas || !canvas.getContext) return;
		var ctx = canvas.getContext('2d');
		var dpr = Math.min(window.devicePixelRatio || 1, 2);
		var W = 0, H = 0, parts = [], raf = 0, running = false, inView = false, vis = !document.hidden, last = 0, acc = 0;

		function size() {
			var r = canvas.getBoundingClientRect();
			W = r.width; H = r.height;
			if (!W || !H) return;
			canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
			canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		}
		function rate() { return Math.max(5, Math.min(13, W / 120)); }
		function spawn() {
			if (parts.length > 200) return;
			parts.push({ x: relX * W + rnd(-W * 0.018, W * 0.018), y: relY * H + rnd(-4, 4), vx: rnd(-5, 5), vy: rnd(-24, -38), r: rnd(7, 15), grow: rnd(11, 19), life: 0, max: rnd(2.8, 4.8), seed: Math.random() * 6.28 });
		}
		function step(t) {
			if (!last) last = t;
			var dt = Math.min((t - last) / 1000, 0.05); last = t;
			acc += rate() * dt;
			while (acc >= 1) { spawn(); acc -= 1; }
			for (var i = parts.length - 1; i >= 0; i--) {
				var p = parts[i]; p.life += dt;
				if (p.life >= p.max) { parts.splice(i, 1); continue; }
				p.vy += -6 * dt;
				p.vx += (Math.sin(t * 0.0011 + p.seed) * 6 + 1.5) * dt;
				p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.grow * dt;
			}
			ctx.clearRect(0, 0, W, H);
			ctx.globalCompositeOperation = 'lighter';
			for (var j = 0; j < parts.length; j++) {
				var q = parts[j];
				var a = Math.sin(Math.PI * (q.life / q.max)) * 0.08;
				if (a <= 0) continue;
				var g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.r);
				g.addColorStop(0, 'rgba(212, 224, 200,' + a.toFixed(3) + ')');
				g.addColorStop(1, 'rgba(212, 224, 200,0)');
				ctx.fillStyle = g;
				ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 6.28); ctx.fill();
			}
			ctx.globalCompositeOperation = 'source-over';
		}
		function loop(t) { if (!running) return; step(t); raf = window.requestAnimationFrame(loop); }
		function start() { if (running) return; running = true; last = 0; raf = window.requestAnimationFrame(loop); }
		function stop() { running = false; if (raf) window.cancelAnimationFrame(raf); }
		function sync() { if (inView && vis) start(); else stop(); }

		size();
		if ('ResizeObserver' in window) new ResizeObserver(size).observe(canvas);
		else window.addEventListener('resize', size, { passive: true });
		if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { inView = e[0].isIntersecting; sync(); }, { threshold: 0.05 }).observe(canvas);
		else inView = true;
		document.addEventListener('visibilitychange', function () { vis = !document.hidden; sync(); });
		sync();
	}

	/* ============================================================ */
	/* Hero: reálný rig + dým (jen titulka).                        */
	/* ============================================================ */
	function injectHero() {
		if (!isHome() || document.querySelector('.bm-hp-hero')) return;
		var anchor = document.querySelector('.banners-row, .banners, .carousel, #content .row');
		if (!anchor || !anchor.parentNode) return;
		var hero = document.createElement('section');
		hero.className = 'bm-hp-hero';
		hero.innerHTML =
			'<div class="bm-hp-hero__bg"></div>' +
			'<div class="bm-hp-hero__grid">' +
				'<div class="bm-hp-hero__copy">' +
					'<p class="bm-hp-hero__eyebrow">Prémiový dab &amp; smoking gear</p>' +
					'<h2 class="bm-hp-hero__title">Skleněné <span>dab rigy</span> ruční práce</h2>' +
					'<p class="bm-hp-hero__sub">Recyclery, Puffco gear a kuřácké potřeby pro dab komunitu — pečlivě vybrané kousky skladem.</p>' +
					'<div class="bm-hp-hero__cta">' +
						'<a class="bm-btn-primary" href="/rigy/">Prohlédnout rigy</a>' +
						'<a class="bm-btn-ghost" href="/kuracke-potreby/">Celý sortiment</a>' +
					'</div>' +
				'</div>' +
				'<a class="bm-hp-hero__rig" href="/watermelon-enhydro-recycler--9-rig-murdocglass/" aria-label="Watermelon Enhydro Recycler — skleněný dab rig">' +
					'<img class="bm-hp-hero__rig-img" src="' + RIG_URL + '" alt="Skleněný dab rig Watermelon Enhydro Recycler" loading="eager" decoding="async">' +
					'<canvas class="bm-hp-hero__smoke"></canvas>' +
				'</a>' +
			'</div>';
		anchor.parentNode.insertBefore(hero, anchor);
		anchor.style.display = 'none';
		// dým z náustku rigu (pozice náustku v ořezaném PNG)
		startSmoke(hero.querySelector('.bm-hp-hero__smoke'), 0.46, 0.07);
	}

	/* ============================================================ */
	/* Intro: „B" doletí a MORPHNE do hlavičkového loga.            */
	/* ============================================================ */
	function playIntro() {
		if (reduce) return;
		var logoEl = document.querySelector('.site-name a, .site-name img, .logo a, .logo img');
		if (!logoEl) return;
		try { if (sessionStorage.getItem('bm_intro')) return; sessionStorage.setItem('bm_intro', '1'); } catch (e) {}

		document.body.classList.add('bm-intro-active'); // skryje logo dokud B nedoletí

		var ov = document.createElement('div');
		ov.className = 'bm-intro';
		var img = document.createElement('img');
		img.className = 'bm-intro__b';
		img.alt = '';
		img.src = B_URL;
		ov.appendChild(img);
		document.body.appendChild(ov);

		var done = false;
		function finish() {
			if (done) return; done = true;
			document.body.classList.remove('bm-intro-active');
			if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
		}
		function fly() {
			var b = img.getBoundingClientRect();
			var logo = logoEl.getBoundingClientRect();
			if (!b.height || !logo.height) { finish(); return; }
			// cíl: „bud" je vlevo v logu (logo má zapečený okraj); B sedne na jeho pozici a velikost
			var targetCx = logo.left + logo.width * 0.12;
			var targetCy = logo.top + logo.height * 0.5;
			var scale = (logo.height * 0.78) / b.height;
			var dx = targetCx - (b.left + b.width / 2);
			var dy = targetCy - (b.top + b.height / 2);
			img.style.transition = 'transform 1.05s cubic-bezier(0.65, 0, 0.25, 1)';
			img.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + scale + ')';
			// dopad: odkryj logo (CSS fade) + zlatý záblesk + cross-fade B ven
			setTimeout(function () {
				document.body.classList.remove('bm-intro-active');
				document.body.classList.add('bm-logo-pop');
				ov.style.transition = 'opacity 0.45s ease';
				ov.style.opacity = '0';
				img.style.transition += ', opacity 0.45s ease';
				img.style.opacity = '0';
				setTimeout(function () {
					document.body.classList.remove('bm-logo-pop');
					finish();
				}, 470);
			}, 1000);
		}
		if (img.complete) setTimeout(fly, 600);
		else img.onload = function () { setTimeout(fly, 600); };
		setTimeout(finish, 3500); // pojistka
	}

	/* ============================================================ */
	/* Custom „B" kurzor (desktop, mimo formuláře / košík).         */
	/* ============================================================ */
	function customCursor() {
		if (reduce || !finePointer || isSensitivePage()) return;
		var el = document.createElement('div');
		el.className = 'bm-cursor';
		document.body.appendChild(el);
		document.documentElement.classList.add('bm-has-cursor');

		var tx = window.innerWidth / 2, ty = window.innerHeight / 2, x = tx, y = ty;
		var scale = 1, tScale = 1, on = false, raf = 0, vis = true;

		function move(e) { tx = e.clientX; ty = e.clientY; if (!on) { on = true; el.classList.add('is-on'); } }
		function over(e) {
			var t = e.target;
			tScale = (t.closest && t.closest('a, button, .btn, input[type="submit"], .add-to-cart-button, [role="button"]')) ? 1.75 : 1;
		}
		function loop() {
			x += (tx - x) * 0.3; y += (ty - y) * 0.3; scale += (tScale - scale) * 0.2;
			el.style.transform = 'translate3d(' + (x - 16) + 'px,' + (y - 16) + 'px, 0) scale(' + scale + ')';
			raf = window.requestAnimationFrame(loop);
		}
		document.addEventListener('mousemove', move, { passive: true });
		document.addEventListener('mouseover', over, { passive: true });
		document.addEventListener('mouseout', function (e) { if (!e.relatedTarget) { on = false; el.classList.remove('is-on'); } });
		document.addEventListener('visibilitychange', function () {
			vis = !document.hidden;
			if (vis && !raf) loop();
			else if (!vis && raf) { window.cancelAnimationFrame(raf); raf = 0; }
		});
		loop();
	}

	/* ============================================================ */
	/* Jemný scroll-reveal na titulce.                              */
	/* ============================================================ */
	function reveal() {
		if (reduce || !isHome() || !('IntersectionObserver' in window)) return;
		var targets = [].slice.call(document.querySelectorAll(
			'#content .products .product, #content .products-block-header, #content .featured-products .product, #content h2.heading'
		));
		if (!targets.length) return;
		targets.forEach(function (t, i) {
			t.classList.add('bm-reveal');
			t.style.transitionDelay = (Math.min(i, 8) * 0.06) + 's';
		});
		var io = new IntersectionObserver(function (entries) {
			entries.forEach(function (e) {
				if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
			});
		}, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
		targets.forEach(function (t) { io.observe(t); });
	}

	/* ============================================================ */
	/* Magnetické CTA (desktop).                                    */
	/* ============================================================ */
	function magnetic() {
		if (reduce || !finePointer) return;
		document.querySelectorAll('.bm-btn-primary').forEach(function (btn) {
			btn.addEventListener('mousemove', function (e) {
				var r = btn.getBoundingClientRect();
				var mx = e.clientX - r.left - r.width / 2;
				var my = e.clientY - r.top - r.height / 2;
				btn.style.transform = 'translate(' + (mx * 0.18).toFixed(1) + 'px,' + (my * 0.3).toFixed(1) + 'px)';
			});
			btn.addEventListener('mouseleave', function () { btn.style.transform = ''; });
		});
	}

	ready(function () {
		playIntro();
		injectHero();
		customCursor();
		reveal();
		magnetic();
	});
})();
