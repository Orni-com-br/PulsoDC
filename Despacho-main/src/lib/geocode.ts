// Geocoding helper using OpenStreetMap Nominatim (free, no API key required).
// Respect usage policy: 1 request/second max — caller should throttle when batching.

export interface GeocodeInput {
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  municipio?: string | null;
  uf?: string | null;
  cep?: string | null;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

export function buildAddressQuery(addr: GeocodeInput): string {
  const parts = [
    [addr.logradouro, addr.numero].filter(Boolean).join(", "),
    addr.bairro,
    addr.municipio || "",
    addr.uf || "RS",
    addr.cep,
    "Brasil",
  ].filter(Boolean);
  return parts.join(", ");
}

export async function geocodeAddress(addr: GeocodeInput): Promise<GeocodeResult | null> {
  const query = buildAddressQuery(addr);
  if (!query.trim() || query.trim() === ", , Brasil") return null;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: { "Accept-Language": "pt-BR" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const first = data[0];
    return {
      lat: parseFloat(first.lat),
      lng: parseFloat(first.lon),
      displayName: first.display_name,
    };
  } catch (err) {
    console.warn("Geocode failed for:", query, err);
    return null;
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
