"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const STREET_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const SATELLITE_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

// Leaflet's default marker PNGs don't resolve reliably through bundler
// static-asset handling, so use an inline SVG pin instead.
const pinIcon = L.divIcon({
  className: "",
  html: `<svg width="30" height="40" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20c0-6.6-5.4-12-12-12z" fill="#ef4444" stroke="white" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="4.5" fill="white"/>
  </svg>`,
  iconSize: [30, 40],
  iconAnchor: [15, 40],
});

type Coords = { lat: number; lng: number };

export function LocationPickerMapCanvas({
  position,
  onChange,
  mapType,
}: {
  position: Coords;
  onChange: (position: Coords) => void;
  mapType: "street" | "satellite";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapObjRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    if (!containerRef.current || mapObjRef.current) return;

    const map = L.map(containerRef.current, { zoomControl: true }).setView(
      [position.lat, position.lng],
      14,
    );
    mapObjRef.current = map;

    // The dialog is still animating open when this runs, so Leaflet measures
    // the container before it has settled and renders grey/mis-tiled — force
    // a resize once the container's real size is available.
    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(containerRef.current);

    const marker = L.marker([position.lat, position.lng], {
      draggable: true,
      icon: pinIcon,
    }).addTo(map);
    markerRef.current = marker;

    marker.on("dragend", () => {
      const { lat, lng } = marker.getLatLng();
      onChangeRef.current({ lat, lng });
    });

    map.on("click", (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      onChangeRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapObjRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapObjRef.current;
    if (!map) return;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const layer = L.tileLayer(
      mapType === "satellite" ? SATELLITE_TILE_URL : STREET_TILE_URL,
      {
        maxZoom: 19,
        attribution:
          mapType === "satellite"
            ? "Tiles &copy; Esri"
            : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
    );
    layer.addTo(map);
    tileLayerRef.current = layer;
  }, [mapType]);

  useEffect(() => {
    const map = mapObjRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    const current = marker.getLatLng();
    if (current.lat !== position.lat || current.lng !== position.lng) {
      marker.setLatLng([position.lat, position.lng]);
      map.setView([position.lat, position.lng]);
    }
  }, [position.lat, position.lng]);

  return <div ref={containerRef} className="h-full w-full" />;
}
