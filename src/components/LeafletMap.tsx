import { useEffect, useRef, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface LeafletMapProps {
  lat: number | null;
  lng: number | null;
  onLocationSelect?: (lat: number, lng: number, address?: AddressResult) => void;
  readOnly?: boolean;
  height?: string;
  markers?: Array<{ lat: number; lng: number; popup?: string; popupNode?: ReactNode; iconColor?: string }>;
  mapClassName?: string;
  hideSearch?: boolean;
}

export interface AddressResult {
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cep?: string;
}

const POA_CENTER: [number, number] = [-30.0346, -51.2177];

async function reverseGeocode(lat: number, lng: number): Promise<AddressResult | undefined> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
    );
    const data = await res.json();
    const addr = data.address || {};

    return {
      logradouro: addr.road || "",
      numero: addr.house_number || "",
      bairro: addr.suburb || addr.neighbourhood || "",
      cep: addr.postcode || "",
    };
  } catch {
    return undefined;
  }
}

export default function LeafletMap({
  lat,
  lng,
  onLocationSelect,
  readOnly = false,
  height = "h-72",
  markers,
  mapClassName = "",
  hideSearch = false,
}: LeafletMapProps) {
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const selectedMarkerRef = useRef<L.Marker | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: lat != null && lng != null ? [lat, lng] : POA_CENTER,
      zoom: lat != null && lng != null ? 16 : 12,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      selectedMarkerRef.current = null;
      markersLayerRef.current = null;
    };
  }, [lat, lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || readOnly || !onLocationSelect) return;

    const handleClick = async (e: L.LeafletMouseEvent) => {
      const nextLat = e.latlng.lat;
      const nextLng = e.latlng.lng;
      const address = await reverseGeocode(nextLat, nextLng);
      onLocationSelect(nextLat, nextLng, address);
    };

    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
    };
  }, [onLocationSelect, readOnly]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (lat != null && lng != null) {
      const position: L.LatLngExpression = [lat, lng];

      if (!selectedMarkerRef.current) {
        selectedMarkerRef.current = L.marker(position).addTo(map);
      } else {
        selectedMarkerRef.current.setLatLng(position);
      }

      map.setView(position, Math.max(map.getZoom(), 16));
    } else if (selectedMarkerRef.current) {
      selectedMarkerRef.current.remove();
      selectedMarkerRef.current = null;
    }
  }, [lat, lng]);

  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    const validMarkers = (markers || []).filter(
      (marker) => Number.isFinite(marker.lat) && Number.isFinite(marker.lng),
    );

    validMarkers.forEach((marker) => {
      let iconOptions = {};
      if (marker.iconColor) {
        const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${marker.iconColor}" width="32" height="32" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.3));"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3" fill="white"/></svg>`;
        iconOptions = {
          icon: L.divIcon({
            html: svgIcon,
            className: "bg-transparent border-none",
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32],
          }),
        };
      }
      
      const leafletMarker = L.marker([marker.lat, marker.lng], Object.keys(iconOptions).length ? iconOptions : undefined);
      if (marker.popupNode) {
        const container = document.createElement("div");
        const root = createRoot(container);
        root.render(marker.popupNode);
        leafletMarker.bindPopup(container);
      } else if (marker.popup) {
        leafletMarker.bindPopup(marker.popup);
      }
      leafletMarker.addTo(markersLayer);
    });

    if (readOnly && lat == null && lng == null && validMarkers.length > 1) {
      const bounds = L.latLngBounds(validMarkers.map((marker) => [marker.lat, marker.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [24, 24] });
    }
  }, [markers, readOnly, lat, lng]);

  const buscarEndereco = async () => {
    if (!search.trim() || !onLocationSelect) return;

    setSearching(true);
    try {
      const q = encodeURIComponent(`${search}, Brasil`);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1&addressdetails=1`);
      const results = await res.json();

      if (results.length > 0) {
        const result = results[0];
        const addr = result.address || {};
        onLocationSelect(parseFloat(result.lat), parseFloat(result.lon), {
          logradouro: addr.road || "",
          numero: addr.house_number || "",
          bairro: addr.suburb || addr.neighbourhood || "",
          cep: addr.postcode || "",
        });
      }
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-3">
      {!readOnly && !hideSearch && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar endereço..."
              className="rounded-lg pl-9"
              onKeyDown={(e) => {
                if (e.key === "Enter") buscarEndereco();
              }}
            />
          </div>
          <Button variant="outline" className="rounded-lg" onClick={buscarEndereco} disabled={searching}>
            Buscar
          </Button>
        </div>
      )}

      <div className={`${height} ${mapClassName} overflow-hidden rounded-xl border border-border`}>
        <div ref={containerRef} className="h-full w-full z-0 relative" />
      </div>

      {!readOnly && !hideSearch && (
        <p className="text-xs text-muted-foreground">Clique no mapa ou pesquise para selecionar o endereço</p>
      )}
    </div>
  );
}
