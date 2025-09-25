/// <reference types="@types/google.maps" />
"use client";

import React, { useEffect, useRef, useState } from "react";
import Script from "next/script";

type Props = {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  country?: string; // ISO-2 like "au"
};

export default function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Street, Suburb, State",
  country = "au",
}: Props) {
  const [ready, setReady] = useState(false);
  const [q, setQ] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<
    google.maps.places.AutocompletePrediction[]
  >([]);

  const svcRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const detailsRef = useRef<google.maps.places.PlacesService | null>(null);
  const debounceRef = useRef<number | null>(null);

  // Keep input in sync when parent value changes
  useEffect(() => {
    setQ(value || "");
  }, [value]);

  // Init Places services once the script has loaded
  useEffect(() => {
    if (!ready) return;
    const g = (window as any).google as typeof google | undefined;
    if (!g?.maps?.places) return;

    if (!svcRef.current) {
      svcRef.current = new g.maps.places.AutocompleteService();
    }
    if (!detailsRef.current) {
      const dummy = document.createElement("div");
      detailsRef.current = new g.maps.places.PlacesService(dummy);
    }
  }, [ready]);

  // Debounced predictions
  useEffect(() => {
    if (!ready || !svcRef.current) return;

    if (!q.trim()) {
      setSuggestions([]);
      return;
    }

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      svcRef.current!.getPlacePredictions(
        {
          input: q,
          componentRestrictions: country ? { country } : undefined,
          types: ["address"],
        },
        (preds: google.maps.places.AutocompletePrediction[] | null) => {
          setSuggestions(preds ?? []);
        }
      );
    }, 200);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [q, ready, country]);

  function selectPrediction(p: google.maps.places.AutocompletePrediction) {
    const g = (window as any).google as typeof google | undefined;
    if (detailsRef.current && g?.maps?.places) {
      detailsRef.current.getDetails(
        { placeId: p.place_id, fields: ["formatted_address"] },
        (
          res: google.maps.places.PlaceResult | null,
          status: google.maps.places.PlacesServiceStatus
        ) => {
          if (
            status === google.maps.places.PlacesServiceStatus.OK &&
            res?.formatted_address
          ) {
            onChange(res.formatted_address);
            setQ(res.formatted_address);
          } else {
            onChange(p.description);
            setQ(p.description);
          }
          setOpen(false);
          setSuggestions([]);
        }
      );
    } else {
      onChange(p.description);
      setQ(p.description);
      setOpen(false);
      setSuggestions([]);
    }
  }

  return (
    <div className="relative">
      {/* Load Google Maps JS (with Places library) once */}
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&v=weekly`}
        strategy="afterInteractive"
        onLoad={() => setReady(true)}
      />
      <input
        className="w-full rounded-xl border p-2"
        placeholder={placeholder}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          onChange(e.target.value);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)} // allow click
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border bg-white shadow">
          <ul className="max-h-64 overflow-auto">
            {suggestions.map((p) => (
              <li key={p.place_id}>
                <button
                  type="button"
                  onClick={() => selectPrediction(p)}
                  className="block w-full px-3 py-2 text-left hover:bg-gray-50"
                >
                  {p.structured_formatting?.main_text}
                  {p.structured_formatting?.secondary_text && (
                    <span className="text-gray-500">
                      {" "}
                      {p.structured_formatting.secondary_text}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
