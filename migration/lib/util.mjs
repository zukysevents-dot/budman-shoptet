// Sdílené utility pro migrační skripty. Bez externích závislostí.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Combining diacritical marks (U+0300–U+036F) – pro odstranění diakritiky po NFD.
const DIACRITICS = /[̀-ͯ]/g;
const BOM = '﻿';

// --- Cesty ---------------------------------------------------------------
export const MIGRATION_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA_DIR = path.join(MIGRATION_DIR, 'data');
export const RAW_DIR = path.join(DATA_DIR, 'raw');
export const NORM_DIR = path.join(DATA_DIR, 'normalized');
export const OUT_DIR = path.join(DATA_DIR, 'out');
export const FIXTURES_DIR = path.join(MIGRATION_DIR, 'fixtures');

export function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}

export function readJSON(file) {
	return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function writeJSON(file, data) {
	ensureDir(path.dirname(file));
	fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// Zapíše textový soubor v UTF-8. withBom=true přidá BOM (kvůli diakritice v Excelu).
export function writeText(file, text, { withBom = false } = {}) {
	ensureDir(path.dirname(file));
	fs.writeFileSync(file, (withBom ? BOM : '') + text, 'utf8');
}

export function fileExists(file) {
	return fs.existsSync(file);
}

// --- Log -----------------------------------------------------------------
export const log = {
	info: (...a) => console.log('•', ...a),
	ok: (...a) => console.log('✓', ...a),
	warn: (...a) => console.warn('!', ...a),
	err: (...a) => console.error('✗', ...a),
	step: (...a) => console.log('\n=== ' + a.join(' ') + ' ==='),
};

// --- Text ----------------------------------------------------------------
// Slugify s podporou české diakritiky → ASCII.
export function slugify(input) {
	return String(input ?? '')
		.normalize('NFD')
		.replace(DIACRITICS, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

// Kód produktu pro Shoptet: povolené znaky A–Z 0–9 _ / - (max 64). Bez diakritiky.
export function sanitizeCode(input) {
	return String(input ?? '')
		.normalize('NFD')
		.replace(DIACRITICS, '')
		.toUpperCase()
		.replace(/[^A-Z0-9_/-]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 64);
}

// pairCode: Shoptet povoluje jen 0–9 A–Z (bez speciálních znaků).
export function sanitizePairCode(input) {
	return String(input ?? '')
		.normalize('NFD')
		.replace(DIACRITICS, '')
		.toUpperCase()
		.replace(/[^A-Z0-9]+/g, '')
		.slice(0, 64);
}

export function collapseWhitespace(s) {
	return String(s ?? '').replace(/\s+/g, ' ').trim();
}

// Ořízne text na max znaků na hranici slova (bez useknutí uprostřed slova).
export function truncateAtWord(text, max) {
	const s = collapseWhitespace(text);
	if (s.length <= max) return s;
	const cut = s.slice(0, max);
	const sp = cut.lastIndexOf(' ');
	return (sp > max * 0.6 ? cut.slice(0, sp) : cut).trim();
}

// Odstraní HTML tagy (pro počítání délky / fallback krátkého popisu).
export function stripTags(html) {
	return collapseWhitespace(String(html ?? '').replace(/<[^>]*>/g, ' '));
}

// Pročistí HTML popisek z WordPressu pro přenos na Shoptet:
// odstraní redakční balast (data-*, class, id, style — třídy starého theme jsou mrtvé)
// a sloučí obsah do jednoho řádku (kvůli bezpečnosti CSV importu).
export function cleanHtml(html) {
	if (!html) return '';
	let s = String(html);
	s = s.replace(/\s+(?:data-[\w-]+|class|id|style)\s*=\s*"(?:[^"\\]|\\.)*"/gi, '');
	s = s.replace(/\s+(?:data-[\w-]+|class|id|style)\s*=\s*'(?:[^'\\]|\\.)*'/gi, '');
	s = s.replace(/\s*\r?\n\s*/g, ' ').replace(/[ \t]{2,}/g, ' ');
	return s.trim();
}

// --- CSV (oddělovač ;) ---------------------------------------------------
export function csvCell(value) {
	const s = value === null || value === undefined ? '' : String(value);
	if (/[";\n\r]/.test(s)) {
		return '"' + s.replace(/"/g, '""') + '"';
	}
	return s;
}

export function csvRow(cells) {
	return cells.map(csvCell).join(';');
}

// columns: pole názvů sloupců; rows: pole objektů. Vrací CSV string (CRLF).
export function toCSV(columns, rows) {
	const lines = [csvRow(columns)];
	for (const row of rows) {
		lines.push(csvRow(columns.map((c) => row[c])));
	}
	return lines.join('\r\n') + '\r\n';
}

// --- XML ------------------------------------------------------------------
export function xmlEscape(s) {
	return String(s ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

// Pro bohatý HTML obsah (popisy) použij CDATA.
export function xmlCData(s) {
	const str = String(s ?? '');
	if (!str) return '';
	// Bezpečně rozdělit případný `]]>` uvnitř obsahu.
	return '<![CDATA[' + str.replace(/]]>/g, ']]]]><![CDATA[>') + ']]>';
}

// --- Číslo / cena ---------------------------------------------------------
// Woo ceny chodí jako string ("1239.00") nebo prázdné. Vrátí number nebo null.
export function parsePrice(value) {
	if (value === null || value === undefined || value === '') return null;
	const n = Number(String(value).replace(',', '.'));
	return Number.isFinite(n) ? n : null;
}

// Woo datum (ISO) → Shoptet datum YYYY-MM-DD, nebo '' když chybí.
export function toDateOnly(value) {
	if (!value) return '';
	const m = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
	return m ? m[1] : '';
}
