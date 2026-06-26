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
