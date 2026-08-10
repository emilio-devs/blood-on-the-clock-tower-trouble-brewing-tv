import assert from 'node:assert/strict';
import {resolveEdition, resolveLocale} from '../src/preferences.js';

const supportedLocales = ['es', 'en'];
assert.equal(resolveLocale({storedLocale: 'en', browserLanguage: 'es-ES', supportedLocales}), 'en');
assert.equal(resolveLocale({storedLocale: null, browserLanguage: 'en-US', supportedLocales}), 'en');
assert.equal(resolveLocale({storedLocale: null, browserLanguage: 'es-ES', supportedLocales}), 'es');
assert.equal(resolveLocale({storedLocale: null, browserLanguage: 'fr-FR', supportedLocales}), 'es');
assert.equal(resolveLocale({storedLocale: 'fr', browserLanguage: 'en-GB', supportedLocales}), 'en');

const editions = [
  {id: 'trouble-brewing', status: 'available'},
  {id: 'bad-moon-rising', status: 'coming-soon'},
  {id: 'sects-and-violets', status: 'coming-soon'}
];
assert.equal(resolveEdition({storedEdition: 'trouble-brewing', editions}), 'trouble-brewing');
assert.equal(resolveEdition({storedEdition: 'bad-moon-rising', editions}), 'trouble-brewing');
assert.equal(resolveEdition({storedEdition: 'missing', editions}), 'trouble-brewing');

console.log('Preferencias de idioma y edición validadas.');
