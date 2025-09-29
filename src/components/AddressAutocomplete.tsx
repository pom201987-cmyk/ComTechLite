"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

/** Expect the Google JS API to already be loaded via a <script> tag elsewhere. */
declare global {
  interface Window {
    google?: typeof google;
  }
}

type Props = {
  value: string;
  onChange: (val: string) => void;
  onSelect?: (place: google.maps.places.PlaceResult) => void;
  placeholder?: string;
  className?: string;
};

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Street, Suburb, State",
  className,
}: Props) {
  const [preds, setPreds] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const canUsePlaces = typeof window !== "undefined" && !!window.google?.maps?.places;

  // Fetch predictions when value changes
  useEffect(() => {
    if (!canUsePlaces) return;
    if (!value || value.trim().length < 3) {
      setPreds([]);
      return;
    }
    const svc = new window.google.maps.places.AutocompleteService();
    svc.getPlacePredictions(
      { input: value, componentRestrictions: { country: "au" } },
      (predictions: google.maps.places.AutocompletePrediction[] | null) => {
        setPreds(predictions ?? []);
        setOpen(true);
      }
    );
  }, [value, canUsePlaces]);

  // Choose a prediction → resolve details → notify
  const choosePrediction = (prediction: google.maps.places.AutocompletePrediction) => {
    if (!canUsePlaces) return;
    onChange(prediction.description);
    setOpen(false);

    // Optionally resolve full place details if consumer wants it
    if (onSelect && prediction.place_id) {
      const dummy = document.createElement("div");
      const svc = new window.google.maps.places.PlacesService(dummy);
      svc.getDetails(
        { placeId: prediction.place_id, fields: ["formatted_address", "address_components", "geometry", "name", "place_id"] },
        (res: google.maps.places.PlaceResult | null, status: google.maps.places.PlacesServiceStatus) => {
          if (status === window.google!.maps.places.PlacesServiceStatus.OK && res) {
            onSelect(res);
          }
        }
      );
    }
  };

  // Close list when clicking outside
  useEffect(() => {
    const onDocClick = (evt: MouseEvent) => {
      if (!inputRef.current) return;
      if (!evt.target) return;
      if (!inputRef.current.parentElement?.contains(evt.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        className={className ?? "w-full rounded-xl border border-gray-400 p-2"}
        placeholder={placeholder}
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        onFocus={() => preds.length && setOpen(true)}
      />
      {open && preds.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-gray-300 bg-white shadow">
          {preds.map((p) => (
            <li
              key={p.place_id}
              className="cursor-pointer px-3 py-2 hover:bg-gray-50"
              onClick={() => choosePrediction(p)}
            >
              {p.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
