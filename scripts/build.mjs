import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const localeIds = ['es', 'en'];
const requiredGroups = ['townsfolk', 'outsiders', 'minions', 'demon'];
const expectedCounts = {townsfolk: 14, outsiders: 4, minions: 4, demon: 1};
const allowedStatuses = new Set(['available', 'coming-soon']);
const checkOnly = process.argv.includes('--check');

const fail = message => { throw new Error(message); };
const assert = (condition, message) => { if (!condition) fail(message); };
const duplicates = values => values.filter((value, index) => values.indexOf(value) !== index);
const keys = value => Object.keys(value).sort();
const sameArray = (left, right) => left.length === right.length && left.every((value, index) => value === right[index]);

function validateMarkup(value, location) {
  assert(typeof value === 'string', `${location} debe ser texto.`);
  const withoutStrong = value.replaceAll('<strong>', '').replaceAll('</strong>', '');
  assert(!/[<>]/.test(withoutStrong), `${location} solo puede contener etiquetas <strong>.`);
}

function validateBundle(data, expectedLocale) {
  assert(data && typeof data === 'object', `${expectedLocale}.json debe contener un objeto.`);
  assert(data.locale === expectedLocale, `${expectedLocale}.json tiene un locale incorrecto.`);
  assert(typeof data.label === 'string' && data.label, `${expectedLocale}.label es obligatorio.`);
  assert(data.ui && typeof data.ui === 'object', `${expectedLocale}.ui es obligatorio.`);
  assert(data.trackMoods && typeof data.trackMoods === 'object', `${expectedLocale}.trackMoods es obligatorio.`);
  assert(Array.isArray(data.editions) && data.editions.length, `${expectedLocale}.editions debe ser una lista.`);

  const editionIds = data.editions.map(edition => edition.id);
  assert(!duplicates(editionIds).length, `${expectedLocale} contiene ediciones duplicadas.`);
  data.editions.forEach(edition => {
    assert(typeof edition.id === 'string' && edition.id, `${expectedLocale} contiene una edición sin id.`);
    assert(typeof edition.name === 'string' && edition.name, `${expectedLocale}.${edition.id}.name es obligatorio.`);
    assert(allowedStatuses.has(edition.status), `${expectedLocale}.${edition.id}.status no es válido.`);
    assert(Array.isArray(edition.groups), `${expectedLocale}.${edition.id}.groups debe ser una lista.`);
    if (edition.status === 'coming-soon') {
      assert(edition.groups.length === 0, `${expectedLocale}.${edition.id} no debe tener roles mientras esté próximamente.`);
      return;
    }

    const groupIds = edition.groups.map(group => group.id);
    assert(sameArray(groupIds, requiredGroups), `${expectedLocale}.${edition.id} debe contener las cuatro categorías en el orden esperado.`);
    const allRoleIds = [];
    edition.groups.forEach(group => {
      assert(typeof group.label === 'string' && group.label, `${expectedLocale}.${edition.id}.${group.id}.label es obligatorio.`);
      validateMarkup(group.note, `${expectedLocale}.${edition.id}.${group.id}.note`);
      assert(Array.isArray(group.roles), `${expectedLocale}.${edition.id}.${group.id}.roles debe ser una lista.`);
      const roleIds = group.roles.map(role => role.id);
      assert(!duplicates(roleIds).length, `${expectedLocale}.${edition.id}.${group.id} contiene roles duplicados.`);
      allRoleIds.push(...roleIds);
      group.roles.forEach(role => {
        assert(typeof role.id === 'string' && role.id, `${expectedLocale}.${edition.id}.${group.id} contiene un rol sin id.`);
        assert(typeof role.name === 'string' && role.name, `${expectedLocale}.${edition.id}.${role.id}.name es obligatorio.`);
        assert(typeof role.icon === 'string' && role.icon, `${expectedLocale}.${edition.id}.${role.id}.icon es obligatorio.`);
        assert(Array.isArray(role.ability) && role.ability.length, `${expectedLocale}.${edition.id}.${role.id}.ability debe contener al menos una línea.`);
        role.ability.forEach((line, index) => validateMarkup(line, `${expectedLocale}.${edition.id}.${role.id}.ability[${index}]`));
      });
    });
    assert(!duplicates(allRoleIds).length, `${expectedLocale}.${edition.id} contiene identificadores de rol duplicados.`);
  });
}

function compareBundles(base, candidate) {
  assert(sameArray(keys(base.ui), keys(candidate.ui)), `${candidate.locale}.ui no contiene las mismas claves que ${base.locale}.ui.`);
  assert(sameArray(keys(base.trackMoods), keys(candidate.trackMoods)), `${candidate.locale}.trackMoods no coincide con ${base.locale}.trackMoods.`);
  assert(base.editions.length === candidate.editions.length, `${candidate.locale} no contiene las mismas ediciones que ${base.locale}.`);
  base.editions.forEach((baseEdition, editionIndex) => {
    const edition = candidate.editions[editionIndex];
    assert(baseEdition.id === edition.id, `${candidate.locale} cambia el orden o id de las ediciones.`);
    assert(baseEdition.status === edition.status, `${candidate.locale}.${edition.id}.status no coincide.`);
    assert(baseEdition.groups.length === edition.groups.length, `${candidate.locale}.${edition.id}.groups no coincide.`);
    baseEdition.groups.forEach((baseGroup, groupIndex) => {
      const group = edition.groups[groupIndex];
      assert(baseGroup.id === group.id, `${candidate.locale}.${edition.id} cambia el orden o id de las categorías.`);
      assert(baseGroup.roles.length === group.roles.length, `${candidate.locale}.${edition.id}.${group.id} no contiene los mismos roles.`);
      baseGroup.roles.forEach((baseRole, roleIndex) => {
        const role = group.roles[roleIndex];
        assert(baseRole.id === role.id, `${candidate.locale}.${edition.id}.${group.id} cambia el orden o id de los roles.`);
        assert(baseRole.icon === role.icon, `${candidate.locale}.${edition.id}.${role.id} usa un icono distinto.`);
        assert(baseRole.ability.length === role.ability.length, `${candidate.locale}.${edition.id}.${role.id} no contiene las mismas líneas de habilidad.`);
      });
    });
  });
}

const bundles = {};
for (const locale of localeIds) {
  const file = path.join(root, 'data', `${locale}.json`);
  let parsed;
  try {
    parsed = JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    fail(`No se pudo leer ${locale}.json: ${error.message}`);
  }
  validateBundle(parsed, locale);
  bundles[locale] = parsed;
}

compareBundles(bundles.es, bundles.en);
const troubleBrewing = bundles.es.editions.find(edition => edition.id === 'trouble-brewing');
assert(troubleBrewing?.status === 'available', 'Trouble Brewing debe estar disponible.');
troubleBrewing.groups.forEach(group => {
  assert(group.roles.length === expectedCounts[group.id], `Trouble Brewing debe contener ${expectedCounts[group.id]} roles en ${group.id}.`);
});
assert(troubleBrewing.groups.reduce((total, group) => total + group.roles.length, 0) === 23, 'Trouble Brewing debe contener 23 tarjetas.');

const templatePath = path.join(root, 'src', 'index.template.html');
const appPath = path.join(root, 'src', 'app.js');
const preferencesPath = path.join(root, 'src', 'preferences.js');
const outputPath = path.join(root, 'index.html');
const template = await readFile(templatePath, 'utf8');
const app = await readFile(appPath, 'utf8');
const preferences = (await readFile(preferencesPath, 'utf8')).replace(/^export /gm, '');
assert(template.split('__I18N_DATA__').length === 2, 'La plantilla debe contener un único marcador __I18N_DATA__.');
assert(template.split('__APP_JS__').length === 2, 'La plantilla debe contener un único marcador __APP_JS__.');

const embeddedData = JSON.stringify(bundles)
  .replaceAll('<', '\\u003c')
  .replaceAll('\u2028', '\\u2028')
  .replaceAll('\u2029', '\\u2029');
const generated = template
  .replace('<!-- Plantilla fuente: index.html se genera con scripts/build.mjs. -->', '<!-- Archivo generado: modifica src/index.template.html, src/app.js o data/*.json. -->')
  .replace('__I18N_DATA__', embeddedData)
  .replace('__APP_JS__', `${preferences.trim()}\n\n${app.trim()}`)
  .replaceAll('\r\n', '\n');

if (checkOnly) {
  let current = '';
  try { current = await readFile(outputPath, 'utf8'); } catch { /* reported below */ }
  assert(current === generated, 'index.html no está actualizado. Ejecuta: node scripts/build.mjs');
  console.log('Datos e index.html válidos y actualizados.');
} else {
  await writeFile(outputPath, generated, 'utf8');
  console.log('index.html generado correctamente con español e inglés.');
}
