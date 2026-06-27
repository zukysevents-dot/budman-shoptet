/*
 * shoptet-enhance.js — vylepšení živé Shoptet šablony (template-11).
 * Titulka: vloží hero (klientská fotka), skryje demo bannery a pustí jemný dým z rigu.
 * Vanilla, bez závislostí. Pauzuje mimo viewport / na skryté záložce / při reduced-motion.
 */
(function () {
	'use strict';

	var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	function ready(fn) {
		if (document.readyState !== 'loading') fn();
		else document.addEventListener('DOMContentLoaded', fn);
	}
	function isHome() {
		return /(^|\s)(in-index|type-index)(\s|$)/.test(document.body.className || '');
	}
	function rnd(a, b) { return a + Math.random() * (b - a); }

	// Kompaktní dýmový engine na <canvas> – emituje z relativní pozice (relX, relY).
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
		function rate() { return Math.max(4, Math.min(11, W / 140)); }
		function spawn() {
			if (parts.length > 180) return;
			parts.push({ x: relX * W + rnd(-W * 0.012, W * 0.012), y: relY * H + rnd(-4, 4), vx: rnd(-5, 5), vy: rnd(-22, -34), r: rnd(8, 16), grow: rnd(10, 18), life: 0, max: rnd(2.8, 4.6), seed: Math.random() * 6.28 });
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
				p.vx += (Math.sin(t * 0.0011 + p.seed) * 6 + 2) * dt;
				p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.grow * dt;
			}
			ctx.clearRect(0, 0, W, H);
			ctx.globalCompositeOperation = 'lighter';
			for (var j = 0; j < parts.length; j++) {
				var q = parts[j];
				var a = Math.sin(Math.PI * (q.life / q.max)) * 0.07;
				if (a <= 0) continue;
				var g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.r);
				g.addColorStop(0, 'rgba(208,220,200,' + a.toFixed(3) + ')');
				g.addColorStop(1, 'rgba(208,220,200,0)');
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

	function injectHero() {
		if (!isHome() || document.querySelector('.bm-hp-hero')) return;
		var anchor = document.querySelector('.banners-row, .banners, .carousel, #content .row');
		if (!anchor || !anchor.parentNode) return;
		var hero = document.createElement('section');
		hero.className = 'bm-hp-hero';
		hero.innerHTML =
			'<canvas class="bm-hp-hero__smoke"></canvas>' +
			'<div class="bm-hp-hero__in">' +
			'<p class="bm-hp-hero__eyebrow">Prémiový headshop gear</p>' +
			'<h2 class="bm-hp-hero__title">CBD a <span>kuřácké potřeby</span></h2>' +
			'<a class="bm-hp-hero__btn" href="/kuracke-potreby/">Do obchodu</a>' +
			'</div>';
		anchor.parentNode.insertBefore(hero, anchor);
		anchor.style.display = 'none';
		startSmoke(hero.querySelector('.bm-hp-hero__smoke'), 0.22, 0.18);
	}

	// Intro: „B" z loga přiletí do loga vlevo nahoře (1× za session).
	function playIntro() {
		if (reduce) return;
		try { if (sessionStorage.getItem('bm_intro')) return; sessionStorage.setItem('bm_intro', '1'); } catch (e) {}
		var logoEl = document.querySelector('.site-name a, .site-name img, .logo a, .logo img');
		if (!logoEl) return;

		var ov = document.createElement('div');
		ov.className = 'bm-intro';
		var img = document.createElement('img');
		img.className = 'bm-intro__b';
		img.alt = '';
		img.src = 'https://cdn.jsdelivr.net/gh/zukysevents-dot/budman-shoptet@main/assets/brand/budman-b.png';
		ov.appendChild(img);
		document.body.appendChild(ov);

		function fly() {
			var b = img.getBoundingClientRect();
			var logo = logoEl.getBoundingClientRect();
			if (!b.height || !logo.height) { setTimeout(remove, 600); return; }
			var targetCx = logo.left + logo.width * 0.2;
			var targetCy = logo.top + logo.height * 0.52;
			var scale = (logo.height * 1.15) / b.height;
			var dx = targetCx - (b.left + b.width / 2);
			var dy = targetCy - (b.top + b.height / 2);
			img.style.transition = 'transform 1.05s cubic-bezier(0.65, 0, 0.25, 1)';
			img.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + scale + ')';
			setTimeout(function () {
				ov.style.transition = 'opacity 0.5s ease';
				ov.style.opacity = '0';
				setTimeout(remove, 520);
			}, 980);
		}
		function remove() { if (ov && ov.parentNode) ov.parentNode.removeChild(ov); }

		// počkat na intro-in animaci, pak letět
		if (img.complete) setTimeout(fly, 650);
		else img.onload = function () { setTimeout(fly, 650); };
		setTimeout(remove, 3000); // pojistka
	}

	ready(function () {
		playIntro();
		injectHero();
	});
})();
