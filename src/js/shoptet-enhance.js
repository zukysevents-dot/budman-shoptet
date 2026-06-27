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
	var RIG_URL = CDN + '/assets/hero/rig.png';
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
			// cíl: „bud" je vlevo v logu; B (jen bud) sedne na jeho pozici a velikost
			var targetCx = logo.left + logo.width * 0.10;
			var targetCy = logo.top + logo.height * 0.52;
			var scale = (logo.height * 0.94) / b.height;
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
