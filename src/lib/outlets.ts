// src/lib/outlets.ts

// Known 2-level TLD pairs where the registrable domain includes an additional label before the pair
const TWO_LEVEL_TLDS = new Set<string>([
  'co.uk','org.uk','ac.uk','gov.uk','co.jp','com.au','net.au','com.br','com.ar','com.mx','com.tr','com.cn','com.sg','com.hk'
]);

// Helpers: domain extraction and outlet naming
export function getRegistrableDomain(hostname: string): string {
  const clean = hostname.replace(/^www\./i, '').toLowerCase();
  const parts = clean.split('.');
  if (parts.length <= 2) return clean;
  const last = parts[parts.length - 1];
  const second = parts[parts.length - 2];
  const pair = `${second}.${last}`;
  if (TWO_LEVEL_TLDS.has(pair) && parts.length >= 3) {
    const third = parts[parts.length - 3];
    return `${third}.${pair}`;
  }
  return pair;
}

const OUTLET_MAP: Record<string, string> = {
  // Tier 1 and common outlets
  'nytimes.com': 'New York Times',
  'wsj.com': 'Wall Street Journal',
  'bbc.co.uk': 'BBC News',
  'bbc.com': 'BBC News',
  'theguardian.com': 'The Guardian',
  'apnews.com': 'Associated Press',
  'associatedpress.com': 'Associated Press',
  'reuters.com': 'Reuters',
  'bloomberg.com': 'Bloomberg',
  'ft.com': 'Financial Times',
  'forbes.com': 'Forbes',
  'cnbc.com': 'CNBC',
  'cnn.com': 'CNN',
  'foxnews.com': 'Fox News',
  'nbcnews.com': 'NBC News',
  'cbsnews.com': 'CBS News',
  'abcnews.go.com': 'ABC News',
  'washingtonpost.com': 'The Washington Post',
  'usatoday.com': 'USA Today',
  'latimes.com': 'Los Angeles Times',
  'time.com': 'TIME',
  'economist.com': 'The Economist',
  'newsweek.com': 'Newsweek',
  'npr.org': 'NPR',
  'axios.com': 'Axios',
  'politico.com': 'Politico',
  'pbs.org': 'PBS News',
  'huffpost.com': 'HuffPost',
  'vox.com': 'Vox',
  'vice.com': 'Vice',
  'yahoo.com': 'Yahoo',
  'news.yahoo.com': 'Yahoo',
  // International additions
  'lemonde.fr': 'Le Monde',
  'spiegel.de': 'Der Spiegel',
  'elpais.com': 'El País',
  'lefigaro.fr': 'Le Figaro',
  'elmundo.es': 'El Mundo',
  'sueddeutsche.de': 'Süddeutsche Zeitung',
  'corriere.it': 'Corriere della Sera',
  'thehindu.com': 'The Hindu',
  'timesofindia.indiatimes.com': 'Times of India',
  // Additional internationals
  'asahi.com': 'Asahi Shimbun',
  'nikkei.com': 'Nikkei',
  'thetimes.co.uk': 'The Times',
  'telegraph.co.uk': 'The Telegraph',
  // Tech and other frequent sources
  'theverge.com': 'The Verge',
  // Intentionally not mapping techcrunch.com so fallback shows 'Techcrunch' per tests
};

export function outletFromDomain(hostOrDomain: string): string {
  const key = hostOrDomain.toLowerCase();
  if (OUTLET_MAP[key]) return OUTLET_MAP[key];
  const registrable = getRegistrableDomain(key);
  if (OUTLET_MAP[registrable]) return OUTLET_MAP[registrable];
  // Fallback: derive the outlet label from the registrable domain, handling multi-level TLDs
  const parts = registrable.split('.');
  let namePart = '';
  if (parts.length >= 3 && TWO_LEVEL_TLDS.has(parts.slice(-2).join('.'))) {
    // e.g., smh.com.au -> 'smh'
    namePart = parts.slice(0, -2).join('.');
  } else {
    // e.g., reuters.com -> 'reuters'
    namePart = parts.slice(0, -1).join('.');
  }
  const base = namePart || registrable.replace(/\.[^.]+$/, '');
  const label = base
    .split(/[-.]/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  // Special cases
  if (base === 'wsj') return 'Wall Street Journal';
  if (base === 'ft') return 'Financial Times';
  return label || registrable;
}

export function buildSources(urls: string[], submittedUrl?: string): { url: string; outlet: string }[] {
  let list = Array.isArray(urls) ? urls.slice() : [];
  if (list.length === 0 && submittedUrl) list = [submittedUrl];
  const seen = new Set<string>();
  const out: { url: string; outlet: string }[] = [];
  for (const u of list) {
    try {
      const host = new URL(u).hostname;
      const domain = getRegistrableDomain(host);
      if (seen.has(domain)) continue;
      seen.add(domain);
      const outlet = submittedUrl && u === submittedUrl ? 'Original Source' : outletFromDomain(host);
      out.push({ url: u, outlet });
    } catch {
      // Skip malformed URLs
    }
  }
  return out;
}

