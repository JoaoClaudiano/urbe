import { useState, useCallback, useMemo } from "react";
import DeckGL from "@deck.gl/react";
import { PolygonLayer } from "@deck.gl/layers";
import { Map } from "react-map-gl/maplibre";
import type { PickingInfo } from "@deck.gl/core";
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

/** MapLibre free dark-style tile URL (no token required) */
const MAP_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

/** deck.gl initial viewport centred on Fortaleza */
const INITIAL_VIEW_STATE = {
  longitude: -38.54,
  latitude: -3.76,
  zoom: 11,
  pitch: 0,
  bearing: 0,
};

// ─── Hex geometry ─────────────────────────────────────────────────────────────

/**
 * Generate 6 corner [lng, lat] pairs for a pointy-top hexagon.
 * Vertices are spaced 60° apart, starting at -30° so the top/bottom
 * edges are flat (pointy-top orientation).
 */
function hexCorners(
  centerLng: number,
  centerLat: number,
  rLng: number,
  rLat: number
): [number, number][] {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    return [centerLng + rLng * Math.cos(angle), centerLat + rLat * Math.sin(angle)];
  });
}

// ─── Density → RGBA colour ────────────────────────────────────────────────────

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

function densityToRgba(density: number, alpha: number): [number, number, number, number] {
  if (density <= COLOUR_STOPS[0][0]) return [...COLOUR_STOPS[0][1], alpha];
  if (density >= COLOUR_STOPS[COLOUR_STOPS.length - 1][0])
    return [...COLOUR_STOPS[COLOUR_STOPS.length - 1][1], alpha];

  for (let i = 1; i < COLOUR_STOPS.length; i++) {
    const [d0, c0] = COLOUR_STOPS[i - 1];
    const [d1, c1] = COLOUR_STOPS[i];
    if (density <= d1) {
      const t = (density - d0) / (d1 - d0);
      return [...lerpColour(c0, c1, t), alpha];
    }
  }
  return [...COLOUR_STOPS[COLOUR_STOPS.length - 1][1], alpha];
}

// ─── Hex data ─────────────────────────────────────────────────────────────────

interface HexFeature {
  id: string;
  name: string;
  density: number;
  /** Closed ring of corner coordinates */
  contour: [number, number][];
}

function buildHexFeatures(): HexFeature[] {
  return hexgridData.hexagons.map((hex) => ({
    id: hex.id,
    name: hex.name,
    density: hex.density,
    contour: hexCorners(hex.center[0], hex.center[1], 0.007, 0.005),
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function HexMap() {
  const { setSelectedRegion } = useRegion();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Pre-build hex features once (stable reference)
  const hexFeatures = useMemo(buildHexFeatures, []);

  const handleClick = useCallback(
    (info: PickingInfo<HexFeature>) => {
      if (!info.object) return;
      const regionName = info.object.name;
      const regionData = processedData.regions.find((r) => r.name === regionName);
      if (regionData) {
        setSelectedRegion(regionData as RegionData);
      } else {
        const hexInfo = hexgridData.hexagons.find((h) => h.name === regionName);
        if (hexInfo) setSelectedRegion(buildFallbackRegion(hexInfo));
      }
    },
    [setSelectedRegion]
  );

  const handleHover = useCallback((info: PickingInfo<HexFeature>) => {
    setHoveredId(info.object?.id ?? null);
  }, []);

  const layers = useMemo(
    () => [
      new PolygonLayer<HexFeature>({
        id: "hexbin-layer",
        data: hexFeatures,
        pickable: true,
        stroked: true,
        filled: true,
        // Polygon contour (closed ring)
        getPolygon: (d) => d.contour,
        // Density-interpolated fill; brighten hovered hex
        getFillColor: (d) =>
          densityToRgba(d.density, d.id === hoveredId ? 255 : 192),
        getLineColor: [255, 255, 255, 60],
        getLineWidth: 30,
        lineWidthUnits: "meters",
        // Smooth colour transitions when hover changes
        updateTriggers: { getFillColor: hoveredId },
        transitions: { getFillColor: 150 },
        onClick: handleClick,
        onHover: handleHover,
      }),
    ],
    [hexFeatures, hoveredId, handleClick, handleHover]
  );

  return (
    <DeckGL
      initialViewState={INITIAL_VIEW_STATE}
      controller
      layers={layers}
      style={{ position: "relative", width: "100%", height: "100%" }}
      getCursor={({ isHovering }) => (isHovering ? "pointer" : "grab")}
    >
      {/* MapLibre GL base map — no token required */}
      <Map mapStyle={MAP_STYLE} />
    </DeckGL>
  );
}
