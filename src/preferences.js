export function resolveLocale({storedLocale, browserLanguage, supportedLocales, defaultLocale = 'es'}) {
  if (supportedLocales.includes(storedLocale)) return storedLocale;
  const normalized = String(browserLanguage || '').toLowerCase();
  return normalized.startsWith('en') && supportedLocales.includes('en') ? 'en' : defaultLocale;
}

export function resolveEdition({storedEdition, editions, defaultEdition = 'trouble-brewing'}) {
  const stored = editions.find(edition => edition.id === storedEdition);
  return stored?.status === 'available' ? stored.id : defaultEdition;
}
