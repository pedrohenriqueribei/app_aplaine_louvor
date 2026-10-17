import { AuditLocationInfo, AuditSecurityAssessment } from './audit-types';

// In-memory cache for resolved IP locations to guarantee 0ms latency for repeated IPs
interface CacheEntry {
  location: AuditLocationInfo;
  timestamp: number;
}

const geoCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

// Portuguese country name translations for friendlier UI
const COUNTRY_TRANSLATIONS: Record<string, string> = {
  'Brazil': 'Brasil',
  'United States': 'Estados Unidos',
  'Portugal': 'Portugal',
  'Spain': 'Espanha',
  'Argentina': 'Argentina',
  'United Kingdom': 'Reino Unido',
  'Germany': 'Alemanha',
  'France': 'França',
  'Canada': 'Canadá',
  'Italy': 'Itália',
  'Netherlands': 'Países Baixos',
  'Switzerland': 'Suíça',
  'Chile': 'Chile',
  'Uruguay': 'Uruguai',
  'Paraguay': 'Paraguai',
  'Colombia': 'Colômbia',
  'Mexico': 'México',
  'Russia': 'Rússia',
  'China': 'China',
  'Japan': 'Japão',
};

/**
 * Extracts client IP address from standard and reverse-proxy HTTP headers.
 */
export function extractClientIp(
  headers: Headers | Record<string, string | string[] | undefined> | null | undefined
): string | null {
  if (!headers) return null;

  const getHeader = (name: string): string | null => {
    if (typeof (headers as any).get === 'function') {
      return (headers as Headers).get(name);
    }
    const val = (headers as Record<string, string | string[] | undefined>)[name.toLowerCase()] ||
      (headers as Record<string, string | string[] | undefined>)[name];
    if (Array.isArray(val)) return val[0] || null;
    return (val as string) || null;
  };

  // Check high-priority real IP headers
  const cfIp = getHeader('cf-connecting-ip');
  if (cfIp) return cleanIp(cfIp);

  const realIp = getHeader('x-real-ip');
  if (realIp) return cleanIp(realIp);

  const clientIp = getHeader('x-client-ip') || getHeader('fastly-client-ip') || getHeader('true-client-ip');
  if (clientIp) return cleanIp(clientIp);

  const forwardedFor = getHeader('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can be a comma-separated list: "client, proxy1, proxy2"
    const parts = forwardedFor.split(',').map((p) => p.trim());
    if (parts.length > 0 && parts[0]) {
      return cleanIp(parts[0]);
    }
  }

  return null;
}

function cleanIp(ip: string): string {
  let cleaned = ip.trim();
  // Strip IPv6-mapped IPv4 e.g. ::ffff:192.168.1.1
  if (cleaned.startsWith('::ffff:')) {
    cleaned = cleaned.substring(7);
  }
  // Strip port from IPv4 if present e.g. 192.168.1.1:8080
  if (cleaned.includes(':') && !cleaned.includes('::') && cleaned.split(':').length === 2) {
    cleaned = cleaned.split(':')[0];
  }
  return cleaned;
}

/**
 * Checks if an IP is in private, loopback, or local ranges (RFC 1918 / RFC 4193).
 */
export function isPrivateIp(ip: string | null | undefined): boolean {
  if (!ip) return true;
  const cleaned = cleanIp(ip);

  if (
    cleaned === '127.0.0.1' ||
    cleaned === '::1' ||
    cleaned === 'localhost' ||
    cleaned.startsWith('0.')
  ) {
    return true;
  }

  // 10.0.0.0 - 10.255.255.255
  if (cleaned.startsWith('10.')) return true;

  // 172.16.0.0 - 172.31.255.255
  if (cleaned.startsWith('172.')) {
    const second = parseInt(cleaned.split('.')[1], 10);
    if (second >= 16 && second <= 31) return true;
  }

  // 192.168.0.0 - 192.168.255.255
  if (cleaned.startsWith('192.168.')) return true;

  // 169.254.0.0 - 169.254.255.255 (Link-local)
  if (cleaned.startsWith('169.254.')) return true;

  // IPv6 ULA (fc00::/7) or Link-local (fe80::/10)
  if (cleaned.toLowerCase().startsWith('fc') || cleaned.toLowerCase().startsWith('fd') || cleaned.toLowerCase().startsWith('fe80:')) {
    return true;
  }

  return false;
}

/**
 * Formats a clean, readable Portuguese summary string for display.
 */
export function formatGeoSummary(loc: AuditLocationInfo | null | undefined): string {
  if (!loc) return 'Localização Desconhecida';
  if (loc.is_local) return 'Rede Local / Intranet';

  const parts: string[] = [];
  if (loc.city && loc.city !== 'Desconhecido') {
    parts.push(loc.city);
  }
  if (loc.region_code || loc.region) {
    parts.push(loc.region_code || loc.region || '');
  }
  if (loc.country) {
    parts.push(loc.country);
  }

  if (parts.length === 0) return 'Localização Não Determinada';
  return parts.join(' - ');
}

/**
 * Resolves approximate geolocation from IP, inspecting edge/cloud proxy headers first,
 * then falling back to in-memory cache and fast geo lookup.
 */
export async function resolveIpLocation(
  ip: string | null | undefined,
  headers?: Headers | Record<string, string | string[] | undefined> | null
): Promise<{ location: AuditLocationInfo; geoSummary: string }> {
  const getHeader = (name: string): string | null => {
    if (!headers) return null;
    if (typeof (headers as any).get === 'function') {
      return (headers as Headers).get(name);
    }
    const val = (headers as Record<string, string | string[] | undefined>)[name.toLowerCase()] ||
      (headers as Record<string, string | string[] | undefined>)[name];
    if (Array.isArray(val)) return val[0] || null;
    return (val as string) || null;
  };

  // 1. Check for Edge/Proxy Geo Headers (Vercel, Cloudflare, Google Cloud AppEngine/CloudRun)
  const edgeCity = getHeader('x-vercel-ip-city') || getHeader('cf-ipcity') || getHeader('x-appengine-city');
  const edgeRegion = getHeader('x-vercel-ip-country-region') || getHeader('cf-region') || getHeader('x-appengine-region');
  const edgeCountryCode = getHeader('x-vercel-ip-country') || getHeader('cf-ipcountry') || getHeader('x-appengine-country');
  const edgeTimezone = getHeader('x-vercel-ip-timezone') || getHeader('cf-timezone');

  if (edgeCity || edgeCountryCode) {
    const rawCountry = edgeCountryCode === 'BR' ? 'Brasil' : edgeCountryCode || 'Desconhecido';
    const loc: AuditLocationInfo = {
      city: edgeCity ? decodeURIComponent(edgeCity) : null,
      region: edgeRegion ? decodeURIComponent(edgeRegion) : null,
      region_code: edgeRegion || null,
      country: COUNTRY_TRANSLATIONS[rawCountry] || rawCountry,
      country_code: edgeCountryCode || null,
      timezone: edgeTimezone || 'America/Sao_Paulo',
      isp: 'Provedor de Conexão Web',
      org: 'Edge Proxy Gateway',
      is_local: false,
      is_approximate: true,
    };
    return { location: loc, geoSummary: formatGeoSummary(loc) };
  }

  // 2. Private/Local IPs (Development / Intranet)
  if (!ip || isPrivateIp(ip)) {
    const loc: AuditLocationInfo = {
      city: 'Rede Local',
      region: 'Ambiente de Desenvolvimento',
      region_code: 'LAN',
      country: 'Rede Privada (RFC 1918)',
      country_code: 'LAN',
      timezone: 'America/Sao_Paulo',
      isp: 'Rede Local Privada / Loopback',
      org: 'Ambiente Local / Servidor de Aplicação',
      is_local: true,
      is_approximate: true,
    };
    return { location: loc, geoSummary: formatGeoSummary(loc) };
  }

  const cleanedIp = cleanIp(ip);

  // 3. Cache lookup
  const cached = geoCache.get(cleanedIp);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { location: cached.location, geoSummary: formatGeoSummary(cached.location) };
  }

  // 4. Fast Geo API lookup with 1500ms timeout
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);

    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(cleanedIp)}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone,isp,org`, {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success') {
        const rawCountry = data.country || '';
        const loc: AuditLocationInfo = {
          city: data.city || null,
          region: data.regionName || null,
          region_code: data.region || null,
          country: COUNTRY_TRANSLATIONS[rawCountry] || rawCountry,
          country_code: data.countryCode || null,
          timezone: data.timezone || null,
          isp: data.isp || null,
          org: data.org || null,
          latitude: typeof data.lat === 'number' ? data.lat : null,
          longitude: typeof data.lon === 'number' ? data.lon : null,
          is_local: false,
          is_approximate: true,
        };

        geoCache.set(cleanedIp, { location: loc, timestamp: Date.now() });
        return { location: loc, geoSummary: formatGeoSummary(loc) };
      }
    }
  } catch (err) {
    // Timeout or network error - graceful fallback
  }

  // Fallback when external lookup is unavailable
  const fallbackLoc: AuditLocationInfo = {
    city: 'Localização Aproximada',
    region: null,
    region_code: null,
    country: 'Internet Pública',
    country_code: null,
    timezone: 'America/Sao_Paulo',
    isp: 'Provedor de Conexão',
    org: null,
    is_local: false,
    is_approximate: true,
  };

  return { location: fallbackLoc, geoSummary: formatGeoSummary(fallbackLoc) };
}

/**
 * Evaluates whether an audit log entry comes from a leadership account,
 * and detects anomalous or suspicious access characteristics (e.g. international IP,
 * datacenter/VPN IP for leadership actions).
 */
export function evaluateLeadershipSecurity(
  actorRole: string | undefined,
  actorEmail: string | undefined,
  location: AuditLocationInfo | null | undefined,
  ipAddress: string | null | undefined
): AuditSecurityAssessment {
  const normalizedRole = (actorRole || '').toLowerCase();
  const email = (actorEmail || '').toLowerCase();

  // Determine if leadership role
  const isLeadership =
    normalizedRole.includes('líder') ||
    normalizedRole.includes('lider') ||
    normalizedRole.includes('super_admin') ||
    normalizedRole.includes('admin') ||
    normalizedRole.includes('pastor') ||
    normalizedRole.includes('ministro') ||
    email === 'pedrohenriqueribei@gmail.com';

  const suspiciousFlags: string[] = [];
  let riskLevel: 'low' | 'medium' | 'high' = 'low';

  if (!location) {
    return {
      is_leadership_account: isLeadership,
      risk_level: 'low',
      suspicious_flags: [],
      flagged: false,
      explanation: isLeadership ? 'Conta de liderança com acesso padrão.' : null,
    };
  }

  // Check 1: Foreign access for leadership account
  // Churches in this app operate in Brazil. Access from other countries warrants immediate attention.
  if (location.country_code && location.country_code !== 'BR' && location.country_code !== 'LAN') {
    suspiciousFlags.push(
      `Acesso internacional (${location.country || location.country_code}): fora do padrão habitual do Brasil.`
    );
    riskLevel = isLeadership ? 'medium' : 'low';
  }

  // Check 2: Datacenter / Cloud / Hosting / Proxy ISP for leadership changes
  const ispAndOrg = `${location.isp || ''} ${location.org || ''}`.toLowerCase();
  const isHostingOrVpn = [
    'amazon',
    'aws',
    'digitalocean',
    'hetzner',
    'ovh',
    'linode',
    'microsoft',
    'azure',
    'google cloud',
    'vultr',
    'tor',
    'vpn',
    'proxy',
    'leaseweb',
    'choopa',
    'm247',
  ].some((keyword) => ispAndOrg.includes(keyword));

  if (isHostingOrVpn) {
    suspiciousFlags.push(
      `Provedor associado a Datacenter, Servidor em Nuvem ou VPN (${location.isp || location.org}).`
    );
    if (isLeadership) {
      // If already has foreign access + hosting, mark as HIGH risk
      riskLevel = suspiciousFlags.length > 1 ? 'high' : 'medium';
    }
  }

  // Check 3: Local environment / test indicator
  if (location.is_local) {
    // Local development access is not suspicious
    riskLevel = 'low';
  }

  const flagged = isLeadership && riskLevel !== 'low';

  let explanation: string | null = null;
  if (flagged) {
    if (riskLevel === 'high') {
      explanation = 'Atenção Máxima: Ação de liderança executada a partir de servidor/datacenter no exterior. Verifique se o líder estava utilizando VPN ou se a conta foi comprometida.';
    } else {
      explanation = 'Atenção: Ação de liderança executada a partir de localização ou rede atípica. Recomenda-se verificação.';
    }
  } else if (isLeadership) {
    explanation = 'Acesso verificado para conta de liderança em ambiente regular.';
  }

  return {
    is_leadership_account: isLeadership,
    risk_level: riskLevel,
    suspicious_flags: suspiciousFlags,
    flagged,
    explanation,
  };
}
