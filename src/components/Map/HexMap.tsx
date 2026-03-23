import { useState, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, Polygon } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import hexgridData from "../../data/hexgrid.json";
import processedData from "../../data/processed.json";
import { useRegion } from "../../context/RegionContext";
import type { RegionData } from "../../context/RegionContext";

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Average residents per density unit used when the full processed.json record
 * is unavailable for a hex.  Derived from the Centro sample data:
 * 72 000 pop / ~9 000 density ≈ 8.
 */
const DENSITY_TO_POPULATION_FACTOR = 8;

/** Age distribution coefficients (share of total population, per group & gender) */
const AGE_COEFFICIENTS = {
  "0-14":  { male: 0.70, female: 0.68 },
  "15-29": { male: 0.90, female: 0.95 },
  "30-44": { male: 1.10, female: 1.15 },
  "45-59": { male: 0.75, female: 0.80 },
  "60+":   { male: 0.45, female: 0.55 },
} as const;

/**
 * CARTO Dark Matter raster tiles — OpenStreetMap-based dark theme.
 * No API token required.
 */
const TILE_URL =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' +
  ' &copy; <a href="https://carto.com/attributions">CARTO</a>';

/** Leaflet map centre and initial zoom for Fortaleza */
const MAP_CENTER: [number, number] = [-3.76, -38.54];
const MAP_ZOOM = 11;

// ─── Hex geometry ─────────────────────────────────────────────────────────────

/**
 * Generate 6 corner [lat, lng] pairs for a pointy-top hexagon.
 * Vertices are spaced 60° apart, starting at -30° so the top/bottom
 * edges are flat (pointy-top orientation).
 * Note: Leaflet uses [lat, lng] ordering.
 */
function hexCorners(
  centerLng: number,
  centerLat: number,
  rLng: number,
  rLat: number
): [number, number][] {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    return [centerLat + rLat * Math.sin(angle), centerLng + rLng * Math.cos(angle)];
  });
}

// ─── Density → CSS hex colour ─────────────────────────────────────────────────

/** Linearly interpolate between two [R,G,B] colours. */
function lerpColour(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

const COLOUR_STOPS: [number, [number, number, number]][] = [
  [4000,  [26,  26,  46]],   // #1a1a2e
  [6000,  [22,  33,  62]],   // #16213e
  [7500,  [15,  52,  96]],   // #0f3460
  [9000,  [83,  52, 131]],   // #533483
  [10500, [233, 69,  96]],   // #e94560
  [12500, [255, 107, 107]],  // #ff6b6b
];

function densityToHex(density: number): string {
  let rgb: [number, number, number];
  if (density <= COLOUR_STOPS[0][0]) {
    rgb = COLOUR_STOPS[0][1];
  } else if (density >= COLOUR_STOPS[COLOUR_STOPS.length - 1][0]) {
    rgb = COLOUR_STOPS[COLOUR_STOPS.length - 1][1];
  } else {
    rgb = COLOUR_STOPS[COLOUR_STOPS.length - 1][1];
    for (let i = 1; i < COLOUR_STOPS.length; i++) {
      const [d0, c0] = COLOUR_STOPS[i - 1];
      const [d1, c1] = COLOUR_STOPS[i];
      if (density <= d1) {
        const t = (density - d0) / (d1 - d0);
        rgb = lerpColour(c0, c1, t);
        break;
      }
    }
  }
  return `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

// ─── Hex data ─────────────────────────────────────────────────────────────────

interface HexFeature {
  id: string;
  name: string;
  density: number;
  /** Corner coordinates in Leaflet [lat, lng] format */
  positions: [number, number][];
}

function buildHexFeatures(): HexFeature[] {
  return hexgridData.hexagons.map((hex) => ({
    id: hex.id,
    name: hex.name,
    density: hex.density,
    positions: hexCorners(hex.center[0], hex.center[1], 0.007, 0.005),
  }));
}

// ─── Fallback region builder ───────────────────────────────────────────────────

function buildFallbackRegion(hex: (typeof hexgridData.hexagons)[number]): RegionData {
  return {
    name: hex.name,
    density: hex.density,
    population: hex.density * DENSITY_TO_POPULATION_FACTOR,
    area: 1.5,       // approximate area of a single hex tile in km²
    growthRate: 1.2, // baseline CAGR (%) used when historical data is absent
    populationHistory: [
      { year: 2000, population: Math.round(hex.density * 6.5) },
      { year: 2005, population: Math.round(hex.density * 7.0) },
      { year: 2010, population: Math.round(hex.density * 7.3) },
      { year: 2015, population: Math.round(hex.density * 7.7) },
      { year: 2020, population: Math.round(hex.density * DENSITY_TO_POPULATION_FACTOR) },
    ],
    ageGroups: (
      Object.entries(AGE_COEFFICIENTS) as [
        keyof typeof AGE_COEFFICIENTS,
        { male: number; female: number },
      ][]
    ).map(([age, coef]) => ({
      age,
      male: Math.round(hex.density * coef.male),
      female: Math.round(hex.density * coef.female),
    })),
  };
}

// ─── Single hex polygon component ─────────────────────────────────────────────

function HexPolygon({
  hex,
  onSelect,
}: {
  hex: HexFeature;
  onSelect: (hex: HexFeature) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const fillColor = densityToHex(hex.density);

  return (
    <Polygon
      positions={hex.positions}
      pathOptions={{
        fillColor,
        fillOpacity: hovered ? 1.0 : 0.75,
        color: "rgba(255,255,255,0.24)",
        weight: 1,
      }}
      eventHandlers={{
        click: () => onSelect(hex),
        mouseover: () => setHovered(true),
        mouseout: () => setHovered(false),
      }}
    />
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HexMap() {
  const { setSelectedRegion } = useRegion();
  const hexFeatures = useMemo(buildHexFeatures, []);

  const handleSelect = useCallback(
    (hex: HexFeature) => {
      const regionData = processedData.regions.find((r) => r.name === hex.name);
      if (regionData) {
        setSelectedRegion(regionData as RegionData);
      } else {
        const hexInfo = hexgridData.hexagons.find((h) => h.name === hex.name);
        if (hexInfo) setSelectedRegion(buildFallbackRegion(hexInfo));
      }
    },
    [setSelectedRegion]
  );

  return (
    <MapContainer
      center={MAP_CENTER}
      zoom={MAP_ZOOM}
      style={{ width: "100%", height: "100%" }}
      zoomControl
    >
      {/* CARTO Dark Matter — OpenStreetMap-based dark raster tiles, no token required */}
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={19} />
      {hexFeatures.map((hex) => (
        <HexPolygon key={hex.id} hex={hex} onSelect={handleSelect} />
      ))}
    </MapContainer>
  );
}
