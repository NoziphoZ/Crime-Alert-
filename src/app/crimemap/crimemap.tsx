"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

type Priority = "High" | "Medium" | "Low";

interface CrimeReport {
  id: number;
  title: string;
  description: string;
  location_name: string;
  latitude: number;
  longitude: number;
  priority: Priority;
  status: string;
  created_at: string;
  reported_by?: string;
}

interface MarkerInfo {
  report: CrimeReport;
  position: { x: number; y: number };
}

// ─── Priority Config ──────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<
  Priority,
  { color: string; glow: string; label: string; bg: string; border: string }
> = {
  High: {
    color: "#EF4444",
    glow: "0 0 14px 4px rgba(239,68,68,0.7)",
    label: "High Priority",
    bg: "#FEF2F2",
    border: "#EF4444",
  },
  Medium: {
    color: "#F59E0B",
    glow: "0 0 14px 4px rgba(245,158,11,0.7)",
    label: "Medium Priority",
    bg: "#FFFBEB",
    border: "#F59E0B",
  },
  Low: {
    color: "#22C55E",
    glow: "0 0 14px 4px rgba(34,197,94,0.7)",
    label: "Low Priority",
    bg: "#F0FDF4",
    border: "#22C55E",
  },
};

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

// ─── Extend Window ────────────────────────────────────────────────────────────

declare global {
  interface Window {
    initCrimeMap: () => void;
  }
}

// ─── infoBadge helper (separate from styles to avoid type conflict) ────────────

function infoBadgeStyle(color: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    background: `${color}22`,
    color: color,
    border: `1px solid ${color}55`,
    borderRadius: 20,
    padding: "3px 10px",
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 10,
    letterSpacing: "0.3px",
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CrimeMap() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);

  const [reports, setReports] = useState<CrimeReport[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<MarkerInfo | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [filterPriority, setFilterPriority] = useState<Priority | "All">("All");
  const [locationError, setLocationError] = useState<string | null>(null);

  // ── Auth Guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // ── Fetch Reports ───────────────────────────────────────────────────────────
  const fetchReports = useCallback(async () => {
    const { data, error } = await supabase
      .from("crime_reports")
      .select(
        "id, title, description, location_name, latitude, longitude, priority, status, created_at, reported_by"
      )
      .eq("status", "Case Resolved")
      .not("latitude", "is", null)
      .not("longitude", "is", null);

    if (error) {
      console.error("Supabase fetch error:", error.message);
      return;
    }
    setReports((data as CrimeReport[]) ?? []);
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // ── Get User Location ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setLocationError("Unable to retrieve your location.");
      }
    );
  }, []);

  // ── Save User Location to Supabase ──────────────────────────────────────────
  useEffect(() => {
    if (!userLocation || !session?.user) return;
    const userId = (session.user as { id?: string }).id;
    if (!userId) return;

    supabase
      .from("user_locations")
      .upsert(
        {
          user_id: userId,
          latitude: userLocation.lat,
          longitude: userLocation.lng,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .then(({ error }) => {
        if (error) console.error("Location save error:", error.message);
      });
  }, [userLocation, session]);

  // ── Load Google Maps Script ─────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.google?.maps) {
      setMapReady(true);
      setLoading(false);
      return;
    }

    window.initCrimeMap = () => {
      setMapReady(true);
      setLoading(false);
    };

    const existing = document.getElementById("google-maps-script");
    if (existing) return;

    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&callback=initCrimeMap`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      const s = document.getElementById("google-maps-script");
      if (s) document.head.removeChild(s);
    };
  }, []);

  // ── Init Map ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || googleMapRef.current) return;

    const center = userLocation ?? { lat: -33.0153, lng: 27.9116 };

    const map = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: 13,
      mapTypeId: "roadmap",
      styles: DARK_MAP_STYLE,
      disableDefaultUI: false,
      zoomControl: true,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: true,
    });

    googleMapRef.current = map;
  }, [mapReady, userLocation]);

  // ── Place Crime Markers ─────────────────────────────────────────────────────
  useEffect(() => {
    const map = googleMapRef.current;
    if (!map || !mapReady) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const filtered =
      filterPriority === "All"
        ? reports
        : reports.filter((r) => r.priority === filterPriority);

    filtered.forEach((report) => {
      const config = PRIORITY_CONFIG[report.priority] ?? PRIORITY_CONFIG.Low;

      const marker = new window.google.maps.Marker({
        position: { lat: report.latitude, lng: report.longitude },
        map,
        title: report.title,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: report.priority === "High" ? 14 : report.priority === "Medium" ? 11 : 9,
          fillColor: config.color,
          fillOpacity: 0.92,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
        animation:
          report.priority === "High"
            ? window.google.maps.Animation.BOUNCE
            : undefined,
      });

      marker.addListener("click", () => {
        setSelectedMarker({ report, position: { x: 0, y: 0 } });
        map.panTo({ lat: report.latitude, lng: report.longitude });
      });

      markersRef.current.push(marker);
    });
  }, [reports, mapReady, filterPriority]);

  // ── Place User Location Marker ──────────────────────────────────────────────
  useEffect(() => {
    const map = googleMapRef.current;
    if (!map || !mapReady || !userLocation) return;

    if (userMarkerRef.current) userMarkerRef.current.setMap(null);

    userMarkerRef.current = new window.google.maps.Marker({
      position: userLocation,
      map,
      title: "Your Location",
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 13,
        fillColor: "#3B82F6",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 3,
      },
      zIndex: 999,
    });

    new window.google.maps.Circle({
      map,
      center: userLocation,
      radius: 150,
      strokeColor: "#3B82F6",
      strokeOpacity: 0.4,
      strokeWeight: 2,
      fillColor: "#3B82F6",
      fillOpacity: 0.1,
    });
  }, [userLocation, mapReady]);

  // ── Counts ──────────────────────────────────────────────────────────────────
  const counts = {
    High: reports.filter((r) => r.priority === "High").length,
    Medium: reports.filter((r) => r.priority === "Medium").length,
    Low: reports.filter((r) => r.priority === "Low").length,
  };

  // ── Loading State ───────────────────────────────────────────────────────────
  if (status === "loading" || loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.loadingInner}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Loading Crime Alert Map…</p>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={styles.wrapper}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerIcon}>🚨</span>
          <div>
            <h1 style={styles.headerTitle}>Crime Alert Map</h1>
            <p style={styles.headerSub}>Resolved Cases · East London, EC</p>
          </div>
        </div>
        <div style={styles.headerRight}>
          {userLocation ? (
            <span style={styles.locationBadge}>📍 Location Active</span>
          ) : (
            <span style={styles.locationBadgeOff}>
              📍 {locationError ?? "Locating…"}
            </span>
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
                  p === "High"
                    ? "#EF4444"
                    : p === "Medium"
                    ? "#F59E0B"
                    : p === "Low"
                    ? "#22C55E"
                    : "#6B7280",
              }}
              onClick={() => setFilterPriority(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div style={styles.mapWrapper}>
        <div ref={mapRef} style={styles.map} />

        {selectedMarker && (
          <InfoPanel
            report={selectedMarker.report}
            onClose={() => setSelectedMarker(null)}
          />
        )}
      </div>
    </div>
  );
}

// ─── Info Panel ───────────────────────────────────────────────────────────────

function InfoPanel({
  report,
  onClose,
}: {
  report: CrimeReport;
  onClose: () => void;
}) {
  const config = PRIORITY_CONFIG[report.priority] ?? PRIORITY_CONFIG.Low;

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
        {config.label} · Case Resolved
      </div>

      <h2 style={styles.infoTitle}>{report.title}</h2>

      <div style={styles.infoRow}>
        <span style={styles.infoIcon}>📍</span>
        <span style={styles.infoValue}>{report.location_name}</span>
      </div>

      <div style={styles.infoRow}>
        <span style={styles.infoIcon}>🕒</span>
        <span style={styles.infoValue}>{formatDate(report.created_at)}</span>
      </div>

      {report.reported_by && (
        <div style={styles.infoRow}>
          <span style={styles.infoIcon}>👤</span>
          <span style={styles.infoValue}>Reported by: {report.reported_by}</span>
        </div>
      )}

      <div style={styles.infoDescBox}>
        <p style={styles.infoDescLabel}>What Happened</p>
        <p style={styles.infoDesc}>{report.description}</p>
      </div>

      <div style={styles.infoCoords}>
        🌐 {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
      </div>
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

// ─── Styles ───────────────────────────────────────────────────────────────────
// infoBadge is now a standalone function above — no longer in this object

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
  loadingScreen: {
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0F172A",
  },
  loadingInner: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
  },
  spinner: {
    width: 44,
    height: 44,
    border: "4px solid #1E293B",
    borderTop: "4px solid #EF4444",
    borderRadius: "50%",
    animation: "spin 0.9s linear infinite",
  },
  loadingText: {
    color: "#94A3B8",
    fontSize: 15,
    margin: 0,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 20px",
    background: "#1E293B",
    borderBottom: "1px solid #334155",
    flexShrink: 0,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  headerIcon: {
    fontSize: 28,
  },
  headerTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    color: "#F1F5F9",
    letterSpacing: "-0.3px",
  },
  headerSub: {
    margin: 0,
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  locationBadge: {
    background: "#1D4ED8",
    color: "#BFDBFE",
    padding: "5px 12px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
  },
  locationBadgeOff: {
    background: "#374151",
    color: "#9CA3AF",
    padding: "5px 12px",
    borderRadius: 20,
    fontSize: 12,
  },
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
  legendRow: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  legendLabel: {
    fontSize: 12,
    color: "#CBD5E1",
  },
  resolvedBadge: {
    background: "#064E3B",
    color: "#6EE7B7",
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
  },
  filterRow: {
    display: "flex",
    gap: 6,
  },
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
  filterBtnActive: {
    background: "#334155",
    color: "#F1F5F9",
  },
  mapWrapper: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  map: {
    width: "100%",
    height: "100%",
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
    zIndex: 10,
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
  infoTitle: {
    margin: "0 0 12px",
    fontSize: 16,
    fontWeight: 700,
    color: "#F1F5F9",
    lineHeight: 1.3,
  },
  infoRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  infoIcon: {
    fontSize: 14,
    flexShrink: 0,
    marginTop: 1,
  },
  infoValue: {
    fontSize: 13,
    color: "#CBD5E1",
    lineHeight: 1.4,
  },
  infoDescBox: {
    background: "#0F172A",
    borderRadius: 8,
    padding: "10px 12px",
    marginTop: 10,
    marginBottom: 10,
  },
  infoDescLabel: {
    margin: "0 0 4px",
    fontSize: 10,
    fontWeight: 700,
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
  },
  infoDesc: {
    margin: 0,
    fontSize: 13,
    color: "#94A3B8",
    lineHeight: 1.5,
  },
  infoCoords: {
    fontSize: 11,
    color: "#475569",
    textAlign: "center",
    marginTop: 4,
  },
};

// ─── Dark Map Style ───────────────────────────────────────────────────────────

const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2c2c54" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1a1a2e" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#373760" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1626" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#1e1e3a" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#162720" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#334155" }] },
  { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
];