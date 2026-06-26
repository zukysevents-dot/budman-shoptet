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
