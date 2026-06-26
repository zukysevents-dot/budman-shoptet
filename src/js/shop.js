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
