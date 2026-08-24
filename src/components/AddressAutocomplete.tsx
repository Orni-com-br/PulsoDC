import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin } from "lucide-react";

export interface AddressSuggestion {
  displayName: string;
  lat: number;
  lng: number;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cep?: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect: (s: AddressSuggestion) => void;
  placeholder?: string;
  className?: string;
}

export default function AddressAutocomplete({ value, onChange, onSelect, placeholder, className }: Props) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!value || value.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        // Detect a house number anywhere in the query (e.g. "Rua X, 123" or "123 Rua X")
        const numMatch = value.match(/(?:^|[,\s])(\d{1,6}[A-Za-z]?)(?:\s|,|$)/);
        const houseNumber = numMatch ? numMatch[1] : "";
        const streetOnly = houseNumber
          ? value.replace(numMatch![0], " ").replace(/\s{2,}/g, " ").replace(/,\s*,/g, ",").replace(/^[,\s]+|[,\s]+$/g, "")
          : value;

        const base = "https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&countrycodes=br";
        const url = streetOnly 
          ? `${base}&street=${encodeURIComponent(`${houseNumber} ${streetOnly}`)}&country=Brasil`
          : `${base}&q=${encodeURIComponent(`${value}, Brasil`)}`;

        const res = await fetch(url, { headers: { "Accept-Language": "pt-BR" } });
        let data = await res.json();
        // Fallback: if structured search returned nothing, try free-form
        if (houseNumber && Array.isArray(data) && data.length === 0) {
          const fb = await fetch(
            `${base}&q=${encodeURIComponent(`${streetOnly} ${houseNumber}, Brasil`)}`,
            { headers: { "Accept-Language": "pt-BR" } },
          );
          data = await fb.json();
        }
        const list: AddressSuggestion[] = (Array.isArray(data) ? data : []).map((r: any) => {
          const a = r.address || {};
          return {
            displayName: r.display_name,
            lat: parseFloat(r.lat),
            lng: parseFloat(r.lon),
            logradouro: a.road || "",
            numero: a.house_number || houseNumber || "",
            bairro: a.suburb || a.neighbourhood || "",
            cep: a.postcode || "",
          };
        });
        setSuggestions(list);
        setOpen(true);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [value]);

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {loading && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
      )}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-border bg-popover text-popover-foreground shadow-lg">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  onSelect(s);
                  setOpen(false);
                }}
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="line-clamp-2">{s.displayName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
