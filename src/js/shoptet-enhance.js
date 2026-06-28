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
	// měnitelné assety pinnuty na commit (jsDelivr @main cache servíruje stale) — bump při změně souboru
	var RIG_URL = 'https://cdn.jsdelivr.net/gh/zukysevents-dot/budman-shoptet@3497d21/assets/hero/rig.png';
	var B_URL = 'https://cdn.jsdelivr.net/gh/zukysevents-dot/budman-shoptet@dd8b66b/assets/brand/budman-b.png';
	var CDN_PIN_LOGO = 'https://cdn.jsdelivr.net/gh/zukysevents-dot/budman-shoptet@e65092b/assets/brand/budman-logo-web.png';

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
		// POZOR: porovnávat CELÉ tokeny tříd — Shoptet má feature-flag třídu
		// „ums_homepage_cart_checkout_headings--on", která obsahuje podřetězce
		// „cart"/„checkout" → široká regex by vypnula kurzor na každé stránce.
		var c = ' ' + (document.body.className || '') + ' ';
		return / (type-cart|type-order|type-checkout|in-cart) /.test(c) ||
			/\/(kosik|objednavka|pokladna|order|cart|checkout)(\/|$)/i.test(location.pathname);
	}
	function rnd(a, b) { return a + Math.random() * (b - a); }

	/* ============================================================ */
	/* Kompaktní dýmový engine na <canvas> – emituje z (relX, relY). */
	/* ============================================================ */
	function startSmoke(canvas, relX, relY) {
		if (reduce || !canvas || !canvas.getContext) return;
		var ctx = canvas.getContext('2d');
		// nižší DPR strop = výrazně levnější fill (radiální gradient/částici) bez viditelné ztráty
		var dpr = Math.min(window.devicePixelRatio || 1, 1.25);
		var W = 0, H = 0, parts = [], raf = 0, running = false, inView = false, vis = !document.hidden, last = 0, acc = 0;

		function size() {
			var r = canvas.getBoundingClientRect();
			W = r.width; H = r.height;
			if (!W || !H) return;
			canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
			canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		}
		function rate() { return Math.max(6, Math.min(14, W / 95)); }
		function spawn() {
			if (parts.length > 130) return;
			// rozměry relativní k velikosti canvasu → konzistentní dým malý i velký
			parts.push({ x: relX * W + rnd(-W * 0.025, W * 0.025), y: relY * H + rnd(-H * 0.01, H * 0.01), vx: rnd(-W * 0.02, W * 0.02), vy: rnd(-H * 0.07, -H * 0.11), r: rnd(W * 0.045, W * 0.085), grow: rnd(W * 0.05, W * 0.09), life: 0, max: rnd(3.2, 5.4), seed: Math.random() * 6.28 });
		}
		function step(t) {
			if (!last) last = t;
			var dt = Math.min((t - last) / 1000, 0.05); last = t;
			acc += rate() * dt;
			while (acc >= 1) { spawn(); acc -= 1; }
			for (var i = parts.length - 1; i >= 0; i--) {
				var p = parts[i]; p.life += dt;
				if (p.life >= p.max) { parts.splice(i, 1); continue; }
				p.vy += -H * 0.012 * dt;
				p.vx += (Math.sin(t * 0.0011 + p.seed) * W * 0.02 + W * 0.005) * dt;
				p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.grow * dt;
			}
			ctx.clearRect(0, 0, W, H);
			ctx.globalCompositeOperation = 'lighter';
			for (var j = 0; j < parts.length; j++) {
				var q = parts[j];
				var a = Math.sin(Math.PI * (q.life / q.max)) * 0.26;
				if (a <= 0) continue;
				var g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.r);
				g.addColorStop(0, 'rgba(224, 234, 212,' + a.toFixed(3) + ')');
				g.addColorStop(0.5, 'rgba(196, 216, 176,' + (a * 0.5).toFixed(3) + ')');
				g.addColorStop(1, 'rgba(196, 216, 176,0)');
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
			// interaktivní piny na produkty v banneru → proklik na kategorii
			'<a class="bm-hp-pin" href="/rigy/" style="left:50%;top:42%" data-label="Skleněné rigy"><span class="bm-hp-pin__dot"></span></a>' +
			'<a class="bm-hp-pin" href="/doplnky-na-extrakty/" style="left:53%;top:85%" data-label="Dab nářadí"><span class="bm-hp-pin__dot"></span></a>' +
			'<a class="bm-hp-pin" href="/baleni/" style="left:65%;top:33%" data-label="Balení"><span class="bm-hp-pin__dot"></span></a>' +
			'<div class="bm-hp-hero__grid">' +
				'<div class="bm-hp-hero__copy">' +
					'<p class="bm-hp-hero__eyebrow">Prémiový dab &amp; smoking gear</p>' +
					'<h2 class="bm-hp-hero__title">Skleněné <span>dab rigy</span> ruční práce</h2>' +
					'<p class="bm-hp-hero__sub">Recyclery, slurpery a kuřácké potřeby pro dab komunitu — pečlivě vybrané kousky skladem.</p>' +
					'<div class="bm-hp-hero__cta">' +
						'<a class="bm-btn-primary" href="/rigy/">Prohlédnout rigy</a>' +
						'<a class="bm-btn-ghost" href="/kuracke-potreby/">Celý sortiment</a>' +
					'</div>' +
				'</div>' +
			'</div>' +
			// Watermelon bong vsazený přímo do banneru (vpravo, bez ceny/karty) + dým + proklik
			'<a class="bm-hp-bong" href="/watermelon-enhydro-recycler--9-rig-murdocglass/" aria-label="Watermelon Recycler #9 — prohlédnout produkt">' +
				'<canvas class="bm-hp-bong__smoke"></canvas>' +
				'<img class="bm-hp-bong__rig" src="' + RIG_URL + '" alt="Watermelon Enhydro Recycler rig" loading="eager" decoding="async">' +
				'<span class="bm-hp-bong__tag">Watermelon Recycler #9 <b>›</b></span>' +
			'</a>';
		anchor.parentNode.insertBefore(hero, anchor);
		anchor.style.display = 'none';
		// dým z náustku bongu (canvas přesahuje nad bong → dým stoupá a je vidět)
		startSmoke(hero.querySelector('.bm-hp-bong__smoke'), 0.5, 0.28);
	}

	/* ============================================================ */
	/* Intro: „B" doletí a MORPHNE do hlavičkového loga.            */
	/* ============================================================ */
	/* ============================================================ */
	/* Načítací obrazovka: bud odznak z loga (1× za session).       */
	/* ============================================================ */
	function playLoader() {
		try { if (sessionStorage.getItem('bm_loader')) return; sessionStorage.setItem('bm_loader', '1'); } catch (e) {}
		var ov = document.createElement('div');
		ov.className = 'bm-loader';
		// jen „B" (černé) — finální B dodá grafik, zatím typograficky
		ov.innerHTML = '<div class="bm-loader__badge"><span class="bm-loader__ring"></span>' +
			'<span class="bm-loader__b">B</span></div>';
		document.documentElement.classList.add('bm-loading');
		(document.body || document.documentElement).appendChild(ov);
		var done = false;
		function finish() {
			if (done) return; done = true;
			ov.classList.add('is-out');
			document.documentElement.classList.remove('bm-loading');
			setTimeout(function () { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 650);
		}
		if (document.readyState === 'complete') setTimeout(finish, 850);
		else window.addEventListener('load', function () { setTimeout(finish, 450); });
		setTimeout(finish, 2800); // pojistka
	}

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
		var scale = 0.68, tScale = 0.68, on = false, raf = 0, vis = true;

		// --- kapající rosin (zlatý extrakt stéká z kurzoru) ---
		var drips = [], dripRaf = 0, dripLastT = 0;
		function dripLoop(now) {
			var dt = dripLastT ? Math.min(now - dripLastT, 42) : 16; dripLastT = now;
			var s = dt / 16;
			for (var i = drips.length - 1; i >= 0; i--) {
				var p = drips[i];
				p.life += dt; p.vy += 0.05 * s; p.y += p.vy * 3.4 * s; p.x += p.vx * s;
				var t = p.life / p.ttl;
				var stretch = 1 + Math.min(p.vy * 0.7, 1.5);                 // rychlejší pád → víc protažená (jako med)
				var op = t < 0.12 ? (t / 0.12) : (t > 0.72 ? (1 - (t - 0.72) / 0.28) : 1);
				p.el.style.transform = 'translate3d(' + (p.x - p.size / 2).toFixed(1) + 'px,' + p.y.toFixed(1) + 'px,0) scaleY(' + stretch.toFixed(2) + ')';
				p.el.style.opacity = op < 0 ? '0' : op.toFixed(2);
				if (p.life >= p.ttl || p.y > window.innerHeight + 30) { p.el.remove(); drips.splice(i, 1); }
			}
			dripRaf = drips.length ? window.requestAnimationFrame(dripLoop) : 0;
		}
		function spawnDrip() {
			if (drips.length > 15) return;
			var size = 5 + Math.random() * 4;
			var d = document.createElement('div');
			d.className = 'bm-drip';
			d.style.width = d.style.height = size.toFixed(1) + 'px';
			document.body.appendChild(d);
			drips.push({ el: d, x: x + (Math.random() - 0.5) * 4, y: y + 1, vx: (Math.random() - 0.5) * 0.25, vy: 0.15 + Math.random() * 0.25, life: 0, ttl: 950 + Math.random() * 600, size: size });
			if (!dripRaf) { dripLastT = 0; dripRaf = window.requestAnimationFrame(dripLoop); }
		}
		// kapky vypnuty kvůli plynulosti (DOM spawn + rAF každých 640 ms = škubání); kurzor zůstává
		void spawnDrip;

		function move(e) { tx = e.clientX; ty = e.clientY; if (!on) { on = true; el.classList.add('is-on'); } }
		function over(e) {
			var t = e.target;
			tScale = (t.closest && t.closest('a, button, .btn, input[type="submit"], .add-to-cart-button, [role="button"]')) ? 0.8 : 0.68;
		}
		function loop() {
			x += (tx - x) * 0.3; y += (ty - y) * 0.3; scale += (tScale - scale) * 0.2;
			el.style.transform = 'translate3d(' + (x - 15) + 'px,' + (y - 45) + 'px, 0) scale(' + scale + ')';
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

	/* helper: najdi href kategorie/stránky podle textu odkazu (reálné slugy) */
	function findHref(rx, fallback) {
		var a = [].slice.call(document.querySelectorAll('.menu a, .navigation a, .footer a, .top-navigation-bar a, a')).find(function (x) { return rx.test((x.textContent || '').trim()); });
		return (a && a.getAttribute('href')) || fallback;
	}
	var ICON = {
		arrow: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
		truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 3h13v11H1zM14 8h4l3 3v3h-7"/><circle cx="5.5" cy="17" r="1.6"/><circle cx="17.5" cy="17" r="1.6"/></svg>',
		box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7 12 3 4 7v10l8 4 8-4z"/><path d="M4 7l8 4 8-4M12 11v10"/></svg>',
		ig: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c2.7 0 3 0 4.1.1 1 0 1.7.2 2.3.4.6.3 1.1.6 1.6 1.1.5.5.8 1 1.1 1.6.2.6.4 1.3.4 2.3.1 1.1.1 1.4.1 4.1s0 3-.1 4.1c0 1-.2 1.7-.4 2.3a4.6 4.6 0 0 1-1.1 1.6 4.6 4.6 0 0 1-1.6 1.1c-.6.2-1.3.4-2.3.4-1.1.1-1.4.1-4.1.1s-3 0-4.1-.1c-1 0-1.7-.2-2.3-.4a4.6 4.6 0 0 1-1.6-1.1 4.6 4.6 0 0 1-1.1-1.6c-.2-.6-.4-1.3-.4-2.3C2 15 2 14.7 2 12s0-3 .1-4.1c0-1 .2-1.7.4-2.3.3-.6.6-1.1 1.1-1.6.5-.5 1-.8 1.6-1.1.6-.2 1.3-.4 2.3-.4C9 2 9.3 2 12 2zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4zM17.4 6.6a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z"/></svg>',
		fb: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z"/></svg>',
		gift: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7S11 2 8 2 5 5 7.5 7M12 7s1-5 4-5 1 5-3.5 5"/></svg>'
	};

	/* Horní lišta: doplnit USP (doprava zdarma / skladem) ----------- */
	function topBarMsg() {
		var bar = document.querySelector('.top-navigation-bar, .header-top');
		if (!bar || bar.querySelector('.bm-topmsg-host')) return;
		var host = document.createElement('span');
		host.className = 'bm-topmsg-host';
		host.style.cssText = 'display:inline-flex;align-items:center;gap:1.4rem;margin-right:auto;padding-right:1rem';
		host.innerHTML = '<span class="bm-topmsg">' + ICON.truck + 'Doprava zdarma od 1 500 Kč</span>' +
			'<span class="bm-topmsg bm-hide-sm">' + ICON.gift + 'Dárek zdarma k nákupu nad 2 000 Kč</span>' +
			'<span class="bm-topmsg bm-hide-sm">' + ICON.box + 'Skladem, expedice do 24 h</span>';
		var inner = bar.querySelector('.top-navigation-bar__in, .header-top__in, .container, .wrapper') || bar;
		inner.insertBefore(host, inner.firstChild);
	}

	/* USP pruh (benefitBanner): nahradit rozbité Shoptet ikony čistými SVG ---- */
	function enhanceBenefits() {
		var items = document.querySelectorAll('.benefitBanner__item');
		if (!items.length) return;
		var SVG = {
			shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 5v6c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V5l-8-3z"/><path d="m9 12 2 2 4-4"/></svg>',
			gift: ICON.gift,
			pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>',
			truck: ICON.truck,
			clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'
		};
		items.forEach(function (item) {
			if (item.querySelector('.bm-usp-ico')) return;
			var txt = (item.textContent || '').toLowerCase();
			var key = /dárek|darek/.test(txt) ? 'gift'
				: /garanc|nepoškoz|neposkoz|kvalit|ověř|over|18|vrácen|vracen|originál|original/.test(txt) ? 'shield'
				: /druh(ý|y|ého|eho)\s*dne|následující|nasledujic|do 24|expedi|rychl/.test(txt) ? 'truck'
				: /výdej|vydej|míst|mist|pobočk|pobock|zásilk|zasilk|ppl|doprav/.test(txt) ? 'pin'
				: 'clock';
			var img = item.querySelector('.benefitBanner__img'); if (img) img.style.display = 'none';
			var pic = item.querySelector('.benefitBanner__picture') || item;
			var ico = document.createElement('span');
			ico.className = 'bm-usp-ico';
			ico.innerHTML = SVG[key];
			pic.insertBefore(ico, pic.firstChild);
			// dárek: srovnat podmínku na „nad 2K" (nativní „ke každé objednávce" si protiřečí)
			if (key === 'gift') {
				[].forEach.call(item.querySelectorAll('*'), function (el) {
					if (!el.children.length && /každ|kazd/i.test(el.textContent || '')) el.textContent = 'Při nákupu nad 2 000 Kč';
				});
			}
		});
	}

	/* Brandové PROMO bannery (titulka, za hero) --------------------- */
	function injectPromo() {
		if (!isHome() || document.querySelector('.bm-promo')) return;
		var hero = document.querySelector('.bm-hp-hero');
		if (!hero) return;
		var hrefRig = findHref(/^rigy$|skleněné rig|^rig/i, '/rigy/');
		var hrefPuffco = findHref(/puffco/i, '/kuracke-potreby/');
		var hrefSmoke = findHref(/kuřáck/i, '/kuracke-potreby/');
		var hrefMerch = findHref(/^merch$/i, '/merch/');
		var hrefClean = findHref(/cleaning/i, '/kuracke-potreby/');
		var IMG = 'https://800882.myshoptet.com/user/shop/big/';
		var tiles = [
			{ big: true, href: hrefRig, eye: 'Prémiové kousky', t: 'Skleněné rigy &amp; recyclery', s: 'Ruční kousky i kompaktní dab rigy — pečlivě vybrané, skladem.', img: IMG + '81_dragon-monster-rig-hashba.jpg', tint: 'rgba(47,138,30,0.50)' },
			{ href: hrefPuffco, eye: 'Dab gear', t: 'Puffco doplňky', s: 'Atomizéry, nástavce a příslušenství.', img: IMG + '48_puffco-wigwag-opal-drytop.jpg', tint: 'rgba(210,169,85,0.46)' },
			{ href: hrefSmoke, eye: 'Sortiment', t: 'Kuřácké potřeby', s: 'Vše pro pohodový dab.', img: IMG + '273_high-tower-v2.png', tint: 'rgba(47,138,30,0.50)' },
			{ href: hrefClean, eye: 'Péče', t: 'Cleaning', s: 'Ať sklo září jako nové.', img: IMG + '261_green-xl-bath.png', tint: 'rgba(143,214,79,0.42)' },
			{ href: hrefMerch, eye: 'Budman', t: 'Merch', s: 'Oblečení a doplňky komunity.', img: IMG + '171_cepice-main-scaled.jpg', tint: 'rgba(60,72,40,0.54)' }
		];
		var sec = document.createElement('section');
		sec.className = 'bm-promo';
		sec.innerHTML = tiles.map(function (x) {
			return '<a class="bm-promo__tile' + (x.big ? ' bm-promo__tile--big' : '') + '" href="' + x.href + '">' +
				'<span class="bm-promo__img" style="background-image: url(' + x.img + ');"></span>' +
				'<span class="bm-promo__body">' +
					'<p class="bm-promo__eyebrow">' + x.eye + '</p>' +
					'<h3 class="bm-promo__title">' + x.t + '</h3>' +
					'<p class="bm-promo__sub">' + x.s + '</p>' +
					'<span class="bm-promo__cta">Prohlédnout ' + ICON.arrow + '</span>' +
				'</span>' +
				'</a>';
		}).join('');
		hero.parentNode.insertBefore(sec, hero.nextSibling);
	}

	/* Skrýt Shoptet demo text + branded „proč u nás" ---------------- */
	function cleanDemo() {
		if (!isHome()) return;
		var rx = /Vítejte v na|zkušebn|administraci přepsat|30 dní zdarma|registračním emailu|přepsat nebo smazat/i;
		// celý Shoptet „welcome" demo blok
		[].slice.call(document.querySelectorAll('.welcome-wrapper, .welcome, .bottom-description, .homepage-text')).forEach(function (el) {
			if (rx.test(el.textContent || '')) el.classList.add('bm-demo-hidden');
		});
		// fallback: jednotlivé demo nadpisy/odstavce (i div.h1)
		[].slice.call(document.querySelectorAll('h1, h2, h3, h4, p, .h1, .h2, .h3')).forEach(function (el) {
			if (el.children.length <= 1 && rx.test(el.textContent || '')) el.classList.add('bm-demo-hidden');
		});
		if (document.querySelector('.bm-why')) return;
		var promo = document.querySelector('.bm-promo');
		var why = document.createElement('section');
		why.className = 'bm-why';
		why.innerHTML = '<h2 class="bm-why__title">Headshop pro dab komunitu</h2>' +
			'<p class="bm-why__lead">Skleněné rigy, recyclery a kvalitní kuřácké potřeby vybírané s citem pro detail. ' +
			'Skladové zásoby, expedice do 24 hodin a férové ceny — od kompaktních kousků po sběratelské ruční skleničky.</p>';
		var usp = document.querySelector('.benefitBanner');
		if (usp && usp.parentNode) usp.parentNode.insertBefore(why, usp);
		else if (promo && promo.parentNode) promo.parentNode.insertBefore(why, promo.nextSibling);
	}

	/* Bohatá patička (nativní je prázdná) --------------------------- */
	function injectFooter() {
		var f = document.querySelector('.footer');
		if (!f || f.querySelector('.bm-footer')) return;
		var L = {
			rigy: findHref(/^rigy$|^rig/i, '/rigy/'),
			puffco: findHref(/puffco/i, '/kuracke-potreby/'),
			smoke: findHref(/kuřáck/i, '/kuracke-potreby/'),
			clean: findHref(/cleaning/i, '/cleaning/'),
			merch: findHref(/^merch$/i, '/merch/'),
			jak: findHref(/jak nakupovat/i, '/jak-nakupovat/'),
			op: findHref(/obchodní podmínky/i, '/obchodni-podminky/'),
			gdpr: findHref(/osobních údaj|ochrana/i, '/podminky-ochrany-osobnich-udaju/'),
			kontakt: findHref(/kontakt/i, '/kontakty/')
		};
		var sec = document.createElement('div');
		sec.className = 'bm-footer';
		sec.innerHTML =
			'<div class="bm-footer__grid">' +
				'<div>' +
					'<div class="bm-footer__logo" style="background-image:url(\'' + CDN_PIN_LOGO + '\')" role="img" aria-label="budMan"></div>' +
					'<p class="bm-footer__tag">Prémiový dab &amp; smoking gear. Skleněné rigy, Puffco doplňky a kuřácké potřeby pro českou dab komunitu.</p>' +
					'<div class="bm-footer__social"><a href="' + L.kontakt + '" aria-label="Instagram">' + ICON.ig + '</a><a href="' + L.kontakt + '" aria-label="Facebook">' + ICON.fb + '</a></div>' +
					'<span class="bm-footer__age"><b>18+</b> Prodej pouze osobám starším 18 let</span>' +
				'</div>' +
				'<div><h4>Nakupování</h4><ul>' +
					'<li><a href="' + L.rigy + '">Skleněné rigy</a></li>' +
					'<li><a href="' + L.puffco + '">Puffco doplňky</a></li>' +
					'<li><a href="' + L.smoke + '">Kuřácké potřeby</a></li>' +
					'<li><a href="' + L.clean + '">Cleaning</a></li>' +
					'<li><a href="' + L.merch + '">Merch</a></li>' +
				'</ul></div>' +
				'<div><h4>Informace</h4><ul>' +
					'<li><a href="' + L.jak + '">Jak nakupovat</a></li>' +
					'<li><a href="' + L.op + '">Obchodní podmínky</a></li>' +
					'<li><a href="' + L.gdpr + '">Ochrana osobních údajů</a></li>' +
					'<li><a href="' + L.kontakt + '">Kontakt</a></li>' +
				'</ul></div>' +
				'<div class="bm-footer__contact"><h4>Kontakt</h4>' +
					'<strong>Lukáš Hrdina</strong><br>IČO 14293714<br>Rybná 716/24<br>110 00 Praha 1<br>' +
					'<a href="tel:+420702081458">702 081 458</a>' +
					'<div class="bm-footer__pay"><span>Visa</span><span>Mastercard</span><span>GoPay</span></div>' +
					'<div class="bm-footer__pay"><span>Zásilkovna</span><span>PPL</span></div>' +
				'</div>' +
			'</div>' +
			'<div class="bm-footer__bottom"><span>© 2026 Budman-shop — všechna práva vyhrazena</span><span>Vyrobeno s láskou k dab komunitě 🌿</span></div>';
		f.insertBefore(sec, f.firstChild);
	}

	/* Menu: emojis ke kategoriím (barevné, hezké) ------------------ */
	// Zploští menu: parent „Kuřácké potřeby" pryč, jeho podkategorie jako top-level položky.
	function flattenMenu() {
		var SHORT = { '/slurpery/': 'Slurpery', '/puffco-doplnky/': 'Puffco doplňky', '/doplnky-na-extrakty/': 'Doplňky na extrakty', '/kuracke-potreby/': null };
		var roots = document.querySelectorAll('.menu-level-0, .navigation-in.menu > ul, .mobile-navigation ul.menu, .mobile-navigation > ul, .box-categories ul');
		roots.forEach(function (root) {
			if (!root || root.getAttribute('data-bm-flat')) return;
			var lis = Array.prototype.slice.call(root.children);
			var parentLi = null;
			lis.forEach(function (li) {
				var a = li.querySelector(':scope > a, a');
				if (a && (a.getAttribute('href') || '').indexOf('/kuracke-potreby/') > -1) parentLi = parentLi || li;
			});
			if (!parentLi) return;
			// sběr podkategorií (dedup dle href, bez parenta)
			var seen = {}, subs = [];
			parentLi.querySelectorAll('a[href]').forEach(function (a) {
				var href = (a.getAttribute('href') || '').replace(/\?.*$/, '');
				if (href && href.slice(-1) !== '/') href += '/';
				if (!href || href.indexOf('/kuracke-potreby/') > -1 || seen[href]) return;
				var raw = (a.textContent || '').replace(/[\u{1F000}-\u{1FFFF}☀-➿←-⇿️]/gu, '').trim();
				if (!raw && !SHORT[href]) return;
				seen[href] = 1;
				subs.push({ href: href, txt: SHORT[href] || raw });
			});
			if (!subs.length) return;
			// vzor: top-level li bez submenu (Merch), jinak parent
			var tmpl = null;
			lis.forEach(function (li) { var a = li.querySelector(':scope > a, a'); if (!tmpl && a && /\/merch\//.test(a.getAttribute('href') || '')) tmpl = li; });
			tmpl = tmpl || parentLi;
			var frag = document.createDocumentFragment();
			subs.forEach(function (s) {
				var li = tmpl.cloneNode(true);
				li.querySelectorAll('ul').forEach(function (u) { u.remove(); });
				['has-children', 'with-submenu', 'active', 'menu-item--active', 'js-menu-item-has-children'].forEach(function (c) { li.classList.remove(c); });
				var a = li.querySelector(':scope > a, a');
				if (!a) return;
				a.setAttribute('href', s.href);
				a.removeAttribute('title');
				a.innerHTML = '';
				a.textContent = s.txt;
				frag.appendChild(li);
			});
			parentLi.parentNode.insertBefore(frag, parentLi);
			parentLi.remove();
			root.setAttribute('data-bm-flat', '1');
		});
		// drobečková navigace: skryj „Kuřácké potřeby" článek (+ navazující oddělovač)
		document.querySelectorAll('.breadcrumbs a[href*="kuracke-potreby"], .breadcrumb a[href*="kuracke-potreby"]').forEach(function (a) {
			var item = a.closest('[itemprop="itemListElement"]') || a.parentElement;
			if (!item) return;
			item.style.display = 'none';
			var sep = item.nextElementSibling;
			if (sep && /separator|arrow|delimiter|navigation-separator/i.test(sep.className || '')) sep.style.display = 'none';
		});
		// sidebar (.box-categories): skryj „Kuřácké potřeby" řádek (.topic), děti odsaď nahoru
		document.querySelectorAll('.box-categories a[href*="kuracke-potreby"]').forEach(function (a) {
			var topic = a.closest('.topic') || a.closest('li');
			if (topic) topic.style.display = 'none';
			var cat = a.closest('.categories');
			if (cat) {
				cat.querySelectorAll('ul').forEach(function (ul) { ul.style.margin = '0'; ul.style.padding = '0'; ul.style.listStyle = 'none'; });
				cat.classList.remove('expandable');
			}
		});
	}

	function enhanceMenu() {
		var EMOJI = {
			'/merch/': '👕', '/kuracke-potreby/': '🌿', '/rigy/': '⚗️',
			'/slurpery/': '💎', '/mereni/': '🌡️', '/baleni/': '📦',
			'/cleaning/': '🧼', '/puffco-doplnky/': '🔋', '/doplnky-na-extrakty/': '🍯',
			'/kontakty/': '✉️', '/znacky/': '🏷️'
		};
		var links = document.querySelectorAll('.navigation a[href], .menu a[href], .mobile-navigation a[href], [class*="mobile"] .menu a[href]');
		links.forEach(function (a) {
			if (a.querySelector('.bm-emoji')) return;
			var txt = (a.textContent || '').trim();
			if (!txt) return; // přeskoč obrázkové/prázdné odkazy
			var href = (a.getAttribute('href') || '').replace(/\?.*$/, '');
			if (href && href.slice(-1) !== '/') href += '/';
			var e = EMOJI[href];
			if (!e) return;
			var span = document.createElement('span');
			span.className = 'bm-emoji';
			span.textContent = e;
			a.insertBefore(span, a.firstChild);
		});
	}

	/* ============================================================ */
	/* Rozbalovací menu „KATEGORIE ▾" (nahrazuje pill bubliny).      */
	/* ============================================================ */
	function buildCategoryDropdown() {
		var menu = document.querySelector('.navigation-in.menu');
		if (!menu) return;
		var wrap = document.querySelector('header .container.navigation-wrapper') || menu.closest('.navigation-wrapper') || menu.parentNode;
		if (!wrap || wrap.querySelector('.bm-catmenu')) return;
		// posbírej kategorie z (zploštělého) menu
		var links = [].slice.call(menu.querySelectorAll('ul.menu-level-1 > li > a, ul > li > a'));
		var seen = {}, cats = [];
		links.forEach(function (a) {
			var href = (a.getAttribute('href') || '').replace(/\?.*$/, '');
			if (href && href.slice(-1) !== '/') href += '/';
			var txt = (a.textContent || '').replace(/[\u{1F000}-\u{1FFFF}☀-➿←-⇿️]/gu, '').trim();
			if (!href || !txt || seen[href]) return;
			if (/\/(kontakty|login|prihlaseni|prihlaseni)/i.test(href)) return;
			seen[href] = 1; cats.push({ href: href, txt: txt });
		});
		if (cats.length < 2) return;
		// pořadí dle přání klienta: Rigy/Slurpery první, Merch poslední
		var ORDER = { '/rigy/': 1, '/slurpery/': 2, '/doplnky-na-extrakty/': 3, '/mereni/': 4, '/baleni/': 5, '/cleaning/': 6, '/puffco-doplnky/': 7, '/merch/': 99 };
		cats.sort(function (a, b) { return (ORDER[a.href] || 50) - (ORDER[b.href] || 50); });
		var box = document.createElement('div');
		box.className = 'bm-catmenu';
		box.innerHTML =
			'<button type="button" class="bm-catmenu__btn" aria-expanded="false" aria-haspopup="true">' +
				'<span class="bm-catmenu__bars" aria-hidden="true"><span></span><span></span><span></span></span>' +
				'<span>Kategorie</span><span class="bm-catmenu__chev" aria-hidden="true"></span>' +
			'</button>' +
			'<div class="bm-catmenu__panel" role="menu">' +
				'<ul>' + cats.map(function (c) {
					return '<li role="none"><a role="menuitem" href="' + c.href + '">' + c.txt + '</a></li>';
				}).join('') + '</ul>' +
			'</div>';
		// umísti KATEGORIE vedle loga (do řady s logem/hledáním); fallback = nad nav
		var anchor = document.querySelector('.header-top .site-name-wrapper, .header-top .site-name, .site-name-wrapper, .site-name');
		if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(box, anchor.nextSibling);
		else wrap.insertBefore(box, wrap.firstChild);
		document.documentElement.classList.add('bm-has-catmenu'); // CSS skryje pilly
		var btn = box.querySelector('.bm-catmenu__btn');
		function setOpen(o) { box.classList.toggle('is-open', o); btn.setAttribute('aria-expanded', o ? 'true' : 'false'); }
		btn.addEventListener('click', function (e) { e.stopPropagation(); setOpen(!box.classList.contains('is-open')); });
		document.addEventListener('click', function (e) { if (!box.contains(e.target)) setOpen(false); });
		document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
	}

	ready(function () {
		playLoader();
		injectHero();
		injectPromo();
		cleanDemo();
		topBarMsg();
		enhanceBenefits();
		injectFooter();
		flattenMenu();
		enhanceMenu();
		buildCategoryDropdown();
		customCursor();
		reveal();
		magnetic();
		// mobilní menu se může dostavět později
		setTimeout(function () { flattenMenu(); enhanceMenu(); buildCategoryDropdown(); }, 1200);
		document.addEventListener('click', function (e) {
			if (e.target.closest && e.target.closest('[class*="menu-trigger"], .hamburger, [class*="mobile"]')) setTimeout(function () { flattenMenu(); enhanceMenu(); }, 120);
		}, true);
	});
})();
