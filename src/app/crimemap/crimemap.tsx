"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ─── Types ────────────────────────────────────────────────────────────────────
type Priority = "High" | "Medium" | "Low";
type Status = "Submitted" | "Under Investigation" | "Dispatched" | "Resolved";

interface CrimeReport {
  id: string;
  user_id: string | null;
  is_anonymous: boolean;
  full_name: string | null;
  location_text: string;
  incident_date_time: string;
  type_of_incident: string;
  priority: Priority;
  description: string;
  status: Status;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
}

interface MarkerInfo {
  report: CrimeReport;
}

// ─── Priority Config ──────────────────────────────────────────────────────────
const PRIORITY_CONFIG: Record<
  Priority,
  { color: string; label: string; bg: string; border: string }
> = {
  High: { color: "#EF4444", label: "High Priority", bg: "#FEF2F2", border: "#EF4444" },
  Medium: { color: "#F59E0B", label: "Medium Priority", bg: "#FFFBEB", border: "#F59E0B" },
  Low: { color: "#22C55E", label: "Low Priority", bg: "#F0FDF4", border: "#22C55E" },
};

function priorityConfig(p: string) {
  return PRIORITY_CONFIG[p as Priority] ?? PRIORITY_CONFIG.Low;
}

const SEARCH_RADIUS_KM = 25;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const c = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.sqrt(c));
}

const GEOAPIFY_API_KEY = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY ?? "";

const TILE_URL = `https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${GEOAPIFY_API_KEY}`;
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | &copy; <a href="https://www.geoapify.com/">Geoapify</a>';

// ─── Pulse animation ──────────────────────────────────────────────────────────
function ensurePulseStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById("crime-marker-pulse-style")) return;
  const style = document.createElement("style");
  style.id = "crime-marker-pulse-style";
  style.textContent = `
    @keyframes crime-pulse {
      0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.6); }
      70% { box-shadow: 0 0 0 10px rgba(239,68,68,0); }
      100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
    }
    .crime-marker-high { animation: crime-pulse 1.6s infinite; }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

function makeCrimeIcon(priority: Priority) {
  const config = priorityConfig(priority);
  const size = priority === "High" ? 26 : priority === "Medium" ? 22 : 18;
  const pulseClass = priority === "High" ? "crime-marker-high" : "";
  return L.divIcon({
    className: "",
    html: `<div class="${pulseClass}" style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${config.color};border:2px solid #ffffff;
      box-shadow:0 0 6px rgba(0,0,0,0.5);
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function makeUserIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:22px;height:22px;border-radius:50%;
      background:#3B82F6;border:3px solid #ffffff;
      box-shadow:0 0 8px rgba(59,130,246,0.8);
    "></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function CrimeMap() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userCircleRef = useRef<L.Circle | null>(null);
  const geocodeAttempted = useRef<Set<string>>(new Set());

  const [reports, setReports] = useState<CrimeReport[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<MarkerInfo | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [filterPriority, setFilterPriority] = useState<Priority | "All">("All");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  // City / area search panel state
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchedArea, setSearchedArea] = useState<{
    lat: number;
    lng: number;
    label: string;
  } | null>(null);

  const showLoadingOverlay = status === "loading" || mapLoading;

  // ── Auth Guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // ── Fetch Reports ───────────────────────────────────────────────────────────
  const fetchReports = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("crime_reports")
        .select(
          "id, user_id, is_anonymous, full_name, location_text, incident_date_time, type_of_incident, priority, description, status, created_at, latitude, longitude"
        )
        .eq("status", "Resolved");

      if (error) {
        console.error("Supabase fetch error:", error.message);
        setMapError(`Failed to fetch reports: ${error.message}`);
        return;
      }

      setReports((data as CrimeReport[]) ?? []);
    } catch (err) {
      console.error("Fetch error:", err);
      setMapError("Failed to load reports");
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // ── Get User Location (in-memory only) ──────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocationError("Unable to retrieve your location.")
    );
  }, []);

  // ── Init Leaflet Map ─────────────────────────────────────────────────────────
  // IMPORTANT: the map <div> is now rendered unconditionally below (the
  // loading screen is an overlay on top of it, not a replacement for it), so
  // mapRef.current is guaranteed to exist by the time this effect runs.
  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    if (!GEOAPIFY_API_KEY) {
      setMapError("Geoapify API key is missing. Add NEXT_PUBLIC_GEOAPIFY_API_KEY to your .env.local.");
      setMapLoading(false);
      return;
    }

    ensurePulseStyles();

    try {
      const center: [number, number] = [-33.0153, 27.9116]; // East London, EC fallback

      const map = L.map(mapRef.current, {
        center,
        zoom: 13,
        zoomControl: true,
      });

      L.tileLayer(TILE_URL, {
        attribution: TILE_ATTRIBUTION,
        maxZoom: 19,
      }).addTo(map);

      leafletMapRef.current = map;
      setMapLoading(false);
    } catch (err) {
      console.error("Failed to initialize map:", err);
      setMapError(`Failed to initialize map: ${err instanceof Error ? err.message : "Unknown error"}`);
      setMapLoading(false);
    }

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // ── Recenter once the user's real location comes in ────────────────────────
  useEffect(() => {
    if (!leafletMapRef.current || !userLocation || searchedArea) return;
    leafletMapRef.current.setView([userLocation.lat, userLocation.lng], 13);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation]);

  // ── Backfill missing coordinates via Geoapify ───────────────────────────────
  useEffect(() => {
    if (!GEOAPIFY_API_KEY) return;

    const missing = reports.filter(
      (r) => (r.latitude == null || r.longitude == null) && !geocodeAttempted.current.has(r.id)
    );
    if (missing.length === 0) return;

    missing.forEach((report, idx) => {
      geocodeAttempted.current.add(report.id);

      setTimeout(async () => {
        try {
          const res = await fetch(
            `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(
              report.location_text
            )}&limit=1&apiKey=${GEOAPIFY_API_KEY}`
          );
          const data = await res.json();
          const feature = data?.features?.[0];
          if (!feature) return;

          const lat = feature.properties.lat;
          const lng = feature.properties.lon;

          setReports((prev) =>
            prev.map((r) => (r.id === report.id ? { ...r, latitude: lat, longitude: lng } : r))
          );

          const { error } = await supabase
            .from("crime_reports")
            .update({ latitude: lat, longitude: lng })
            .eq("id", report.id);

          if (error) console.error("Failed to cache geocoded coordinates:", error.message);
        } catch (err) {
          console.error("Geocoding error:", err);
        }
      }, idx * 300);
    });
  }, [reports]);

  // ── Place Crime Markers ─────────────────────────────────────────────────────
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    let visible = reports.filter((r) => r.latitude != null && r.longitude != null);

    if (filterPriority !== "All") {
      visible = visible.filter((r) => r.priority === filterPriority);
    }

    if (searchedArea) {
      visible = visible.filter(
        (r) =>
          distanceKm(searchedArea, { lat: r.latitude as number, lng: r.longitude as number }) <=
          SEARCH_RADIUS_KM
      );
    }

    visible.forEach((report) => {
      const marker = L.marker([report.latitude as number, report.longitude as number], {
        icon: makeCrimeIcon(report.priority),
      }).addTo(map);

      marker.on("click", () => {
        setSelectedMarker({ report });
        map.panTo([report.latitude as number, report.longitude as number]);
      });

      markersRef.current.push(marker);
    });
  }, [reports, filterPriority, searchedArea]);

  // ── Place User Location Marker ──────────────────────────────────────────────
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map || !userLocation) return;

    if (userMarkerRef.current) map.removeLayer(userMarkerRef.current);
    if (userCircleRef.current) map.removeLayer(userCircleRef.current);

    userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
      icon: makeUserIcon(),
      zIndexOffset: 1000,
    }).addTo(map);

    userCircleRef.current = L.circle([userLocation.lat, userLocation.lng], {
      radius: 150,
      color: "#3B82F6",
      weight: 2,
      opacity: 0.4,
      fillColor: "#3B82F6",
      fillOpacity: 0.1,
    }).addTo(map);
  }, [userLocation]);

  // ── City / Area Search (Geoapify) ────────────────────────────────────────────
  const handleSearchArea = useCallback(async () => {
    if (!searchQuery.trim()) return;

    if (!GEOAPIFY_API_KEY) {
      setSearchError("Geoapify API key is missing.");
      return;
    }

    setSearching(true);
    setSearchError(null);

    try {
      const res = await fetch(
        `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(
          searchQuery
        )}&limit=1&apiKey=${GEOAPIFY_API_KEY}`
      );
      const data = await res.json();
      const feature = data?.features?.[0];

      if (feature) {
        const lat = feature.properties.lat;
        const lng = feature.properties.lon;

        setSearchedArea({ lat, lng, label: feature.properties.formatted });
        leafletMapRef.current?.setView([lat, lng], 12);
      } else {
        setSearchError("Couldn't find that place. Try a different search.");
      }
    } catch (err) {
      console.error(err);
      setSearchError("Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const handleResetArea = useCallback(() => {
    setSearchedArea(null);
    setSearchQuery("");
    setSearchError(null);
    if (userLocation && leafletMapRef.current) {
      leafletMapRef.current.setView([userLocation.lat, userLocation.lng], 13);
    }
  }, [userLocation]);

  // ── Counts ──────────────────────────────────────────────────────────────────
  const visibleForCounts = reports.filter((r) => r.latitude != null && r.longitude != null);
  const inArea = searchedArea
    ? visibleForCounts.filter(
        (r) =>
          distanceKm(searchedArea, { lat: r.latitude as number, lng: r.longitude as number }) <=
          SEARCH_RADIUS_KM
      )
    : visibleForCounts;

  const counts = {
    High: inArea.filter((r) => r.priority === "High").length,
    Medium: inArea.filter((r) => r.priority === "Medium").length,
    Low: inArea.filter((r) => r.priority === "Low").length,
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  // NOTE: there is no early `return` for the loading state anymore. The map
  // <div> below is always present in the DOM from the very first render, so
  // the init effect above can always find it. Loading is shown as an overlay
  // instead, layered on top of the map.
  return (
    <div style={styles.wrapper}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerIcon}>🚨</span>
          <div>
            <h1 style={styles.headerTitle}>Crime Alert Map</h1>
            <p style={styles.headerSub}>
              Resolved Cases · {searchedArea ? searchedArea.label : "East London, EC"}
            </p>
          </div>
        </div>
        <div style={styles.headerRight}>
          {userLocation ? (
            <span style={styles.locationBadge}>📍 Location Active</span>
          ) : (
            <span style={styles.locationBadgeOff}>📍 {locationError ?? "Locating…"}</span>
          )}
        </div>
      </div>

      {/* Legend + Filters */}
      <div style={styles.controlBar}>
        <div style={styles.legendRow}>
          <LegendDot color="#3B82F6" label="Your Location" />
          <LegendDot color="#EF4444" label={`High (${counts.High})`} />
          <LegendDot color="#F59E0B" label={`Medium (${counts.Medium})`} />
          <LegendDot color="#22C55E" label={`Low (${counts.Low})`} />
          <span style={styles.resolvedBadge}>✅ Case Resolved Only</span>
        </div>

        <div style={styles.filterRow}>
          {(["All", "High", "Medium", "Low"] as const).map((p) => (
            <button
              key={p}
              style={{
                ...styles.filterBtn,
                ...(filterPriority === p ? styles.filterBtnActive : {}),
                borderColor:
                  p === "High" ? "#EF4444" : p === "Medium" ? "#F59E0B" : p === "Low" ? "#22C55E" : "#6B7280",
              }}
              onClick={() => setFilterPriority(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Area search panel */}
      <div style={styles.searchBar}>
        <input
          style={styles.searchInput}
          placeholder="Search a city or area (e.g. East London)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearchArea()}
        />
        <button style={styles.searchBtn} onClick={handleSearchArea} disabled={searching}>
          {searching ? "Searching…" : "Search"}
        </button>
        {searchedArea && (
          <button style={styles.searchResetBtn} onClick={handleResetArea}>
            Reset to my location
          </button>
        )}
        {searchError && <span style={styles.searchError}>{searchError}</span>}
      </div>

      {/* Map (always mounted) */}
      <div style={styles.mapWrapper}>
        <div ref={mapRef} style={styles.map} />

        {showLoadingOverlay && (
          <div style={styles.loadingOverlay}>
            <div style={styles.loadingInner}>
              <div style={styles.spinner} />
              <p style={styles.loadingText}>Loading Crime Alert Map…</p>
              {mapError && <p style={styles.errorText}>{mapError}</p>}
            </div>
          </div>
        )}

        {!showLoadingOverlay && mapError && (
          <div style={styles.mapErrorOverlay}>
            <p>⚠️ {mapError}</p>
          </div>
        )}

        {selectedMarker && (
          <InfoPanel report={selectedMarker.report} onClose={() => setSelectedMarker(null)} />
        )}
      </div>
    </div>
  );
}

// ─── Info Panel ───────────────────────────────────────────────────────────────

function InfoPanel({ report, onClose }: { report: CrimeReport; onClose: () => void }) {
  const config = priorityConfig(report.priority);
  const reportedBy = report.is_anonymous ? "Anonymous" : report.full_name ?? "Anonymous";

  return (
    <div style={{ ...styles.infoPanel, borderTop: `4px solid ${config.color}` }}>
      <button style={styles.closeBtn} onClick={onClose} aria-label="Close">
        ✕
      </button>

      <div style={infoBadgeStyle(config.color)}>
        <span
          style={{
            display: "inline-block",
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: config.color,
            marginRight: 6,
          }}
        />
        {config.label} · Resolved
      </div>

      <h2 style={styles.infoTitle}>{report.type_of_incident}</h2>

      <div style={styles.infoRow}>
        <span style={styles.infoIcon}>📍</span>
        <span style={styles.infoValue}>{report.location_text}</span>
      </div>

      <div style={styles.infoRow}>
        <span style={styles.infoIcon}>🕒</span>
        <span style={styles.infoValue}>{formatDate(report.incident_date_time)}</span>
      </div>

      <div style={styles.infoRow}>
        <span style={styles.infoIcon}>👤</span>
        <span style={styles.infoValue}>Reported by: {reportedBy}</span>
      </div>

      <div style={styles.infoDescBox}>
        <p style={styles.infoDescLabel}>What Happened</p>
        <p style={styles.infoDesc}>{report.description}</p>
      </div>

      {report.latitude != null && report.longitude != null && (
        <div style={styles.infoCoords}>
          🌐 {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
        </div>
      )}
    </div>
  );
}

// ─── Legend Dot ───────────────────────────────────────────────────────────────

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div style={styles.legendItem}>
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: color,
          display: "inline-block",
          border: "2px solid rgba(255,255,255,0.6)",
          flexShrink: 0,
        }}
      />
      <span style={styles.legendLabel}>{label}</span>
    </div>
  );
}

function infoBadgeStyle(color: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    background: `${color}22`,
    color,
    border: `1px solid ${color}55`,
    borderRadius: 20,
    padding: "3px 10px",
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 10,
    letterSpacing: "0.3px",
  };
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    background: "#0F172A",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    color: "#F1F5F9",
    overflow: "hidden",
  },
  loadingOverlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(15,23,42,0.92)",
    zIndex: 2000,
  },
  loadingInner: { display: "flex", flexDirection: "column", alignItems: "center", gap: 16 },
  spinner: {
    width: 44,
    height: 44,
    border: "4px solid #1E293B",
    borderTop: "4px solid #EF4444",
    borderRadius: "50%",
    animation: "spin 0.9s linear infinite",
  },
  loadingText: { color: "#94A3B8", fontSize: 15, margin: 0 },
  errorText: { color: "#EF4444", fontSize: 13, margin: 0, maxWidth: 360, textAlign: "center" },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 20px",
    background: "#1E293B",
    borderBottom: "1px solid #334155",
    flexShrink: 0,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 12 },
  headerIcon: { fontSize: 28 },
  headerTitle: { margin: 0, fontSize: 20, fontWeight: 700, color: "#F1F5F9", letterSpacing: "-0.3px" },
  headerSub: { margin: 0, fontSize: 12, color: "#64748B", marginTop: 2 },
  headerRight: { display: "flex", alignItems: "center", gap: 8 },
  locationBadge: {
    background: "#1D4ED8",
    color: "#BFDBFE",
    padding: "5px 12px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
  },
  locationBadgeOff: { background: "#374151", color: "#9CA3AF", padding: "5px 12px", borderRadius: 20, fontSize: 12 },
  controlBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 20px",
    background: "#1E293B",
    borderBottom: "1px solid #334155",
    flexShrink: 0,
    flexWrap: "wrap",
    gap: 8,
  },
  legendRow: { display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" },
  legendItem: { display: "flex", alignItems: "center", gap: 6 },
  legendLabel: { fontSize: 12, color: "#CBD5E1" },
  resolvedBadge: {
    background: "#064E3B",
    color: "#6EE7B7",
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
  },
  filterRow: { display: "flex", gap: 6 },
  filterBtn: {
    padding: "5px 14px",
    borderRadius: 20,
    border: "1px solid",
    background: "transparent",
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s",
  },
  filterBtnActive: { background: "#334155", color: "#F1F5F9" },
  searchBar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 20px",
    background: "#16213A",
    borderBottom: "1px solid #334155",
    flexShrink: 0,
    flexWrap: "wrap",
  },
  searchInput: {
    flex: "1 1 260px",
    minWidth: 200,
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #334155",
    background: "#0F172A",
    color: "#F1F5F9",
    fontSize: 13,
    outline: "none",
  },
  searchBtn: {
    padding: "8px 16px",
    borderRadius: 8,
    border: "none",
    background: "#2563EB",
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  searchResetBtn: {
    padding: "8px 16px",
    borderRadius: 8,
    border: "1px solid #475569",
    background: "transparent",
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  searchError: { fontSize: 12, color: "#F87171" },
  mapWrapper: { flex: 1, position: "relative", overflow: "hidden" },
  map: { width: "100%", height: "100%" },
  mapErrorOverlay: {
    position: "absolute",
    top: 20,
    left: "50%",
    transform: "translateX(-50%)",
    background: "#EF4444",
    color: "white",
    padding: "10px 20px",
    borderRadius: 8,
    zIndex: 1000,
  },
  infoPanel: {
    position: "absolute",
    bottom: 24,
    left: 24,
    width: 320,
    background: "#1E293B",
    borderRadius: 12,
    padding: "20px 20px 16px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    zIndex: 1000,
  },
  closeBtn: {
    position: "absolute",
    top: 12,
    right: 14,
    background: "transparent",
    border: "none",
    color: "#94A3B8",
    fontSize: 16,
    cursor: "pointer",
    lineHeight: 1,
  },
  infoTitle: { margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: "#F1F5F9", lineHeight: 1.3 },
  infoRow: { display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 },
  infoIcon: { fontSize: 14, flexShrink: 0, marginTop: 1 },
  infoValue: { fontSize: 13, color: "#CBD5E1", lineHeight: 1.4 },
  infoDescBox: { background: "#0F172A", borderRadius: 8, padding: "10px 12px", marginTop: 10, marginBottom: 10 },
  infoDescLabel: {
    margin: "0 0 4px",
    fontSize: 10,
    fontWeight: 700,
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
  },
  infoDesc: { margin: 0, fontSize: 13, color: "#94A3B8", lineHeight: 1.5 },
  infoCoords: { fontSize: 11, color: "#475569", textAlign: "center", marginTop: 4 },
};