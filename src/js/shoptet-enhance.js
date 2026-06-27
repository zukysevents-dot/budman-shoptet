/*
 * shoptet-enhance.js — drobná vylepšení živé Shoptet šablony (template-11).
 * Zatím: na titulní straně vloží náš hero a skryje demo bannery.
 * Vanilla, bez závislostí. Bundluje se do assets/budman.js.
 */
(function () {
	'use strict';

	function ready(fn) {
		if (document.readyState !== 'loading') fn();
		else document.addEventListener('DOMContentLoaded', fn);
	}

	function isHomepage() {
		return /(^|\s)(in-index|type-index)(\s|$)/.test(document.body.className || '');
	}

	function injectHero() {
		if (!isHomepage()) return;
		if (document.querySelector('.bm-hp-hero')) return;

		var anchor = document.querySelector('.banners-row, .banners, .carousel, #content .row');
		if (!anchor || !anchor.parentNode) return;

		var hero = document.createElement('section');
		hero.className = 'bm-hp-hero';
		hero.innerHTML =
			'<div class="bm-hp-hero__in">' +
			'<p class="bm-hp-hero__eyebrow">Prémiový headshop gear</p>' +
			'<h2 class="bm-hp-hero__title">CBD a <span>kuřácké potřeby</span></h2>' +
			'<a class="bm-hp-hero__btn" href="/kuracke-potreby/">Do obchodu</a>' +
			'</div>';

		anchor.parentNode.insertBefore(hero, anchor);
		anchor.style.display = 'none';
	}

	ready(injectHero);
})();
