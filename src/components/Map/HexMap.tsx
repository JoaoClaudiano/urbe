import { useEffect, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import hexgridData from "../../data/hexgrid.json";
import processedData from "../../data/processed.json";
import { useRegion } from "../../context/RegionContext";
import type { RegionData } from "../../context/RegionContext";

mapboxgl.accessToken =
  import.meta.env.VITE_MAPBOX_TOKEN ||
  "pk.eyJ1IjoiZGVtb3VzZXIiLCJhIjoiY2xleGFtcGxlMDAwMDAwIn0.example";

function createHexagonCoordinates(
  centerLng: number,
  centerLat: number,
  radiusLng: number,
  radiusLat: number
): number[][] {
  const coords: number[][] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    coords.push([
      centerLng + radiusLng * Math.cos(angle),
      centerLat + radiusLat * Math.sin(angle),
    ]);
  }
  coords.push(coords[0]);
  return coords;
}

function buildHexGeoJSON() {
  const features = hexgridData.hexagons.map((hex) => ({
    type: "Feature" as const,
    properties: {
      id: hex.id,
      density: hex.density,
      name: hex.name,
    },
    geometry: {
      type: "Polygon" as const,
      coordinates: [
        createHexagonCoordinates(hex.center[0], hex.center[1], 0.007, 0.005),
      ],
    },
  }));
  return { type: "FeatureCollection" as const, features };
}

export default function HexMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const { setSelectedRegion } = useRegion();

  const handleRegionClick = useCallback(
    (regionName: string) => {
      const regionData = processedData.regions.find((r) => r.name === regionName);
      if (regionData) {
        setSelectedRegion(regionData as RegionData);
      } else {
        const hexInfo = hexgridData.hexagons.find((h) => h.name === regionName);
        if (hexInfo) {
          setSelectedRegion({
            name: hexInfo.name,
            density: hexInfo.density,
            population: hexInfo.density * 8,
            area: 1.5,
            growthRate: 1.2,
            populationHistory: [
              { year: 2000, population: Math.round(hexInfo.density * 6.5) },
              { year: 2005, population: Math.round(hexInfo.density * 7) },
              { year: 2010, population: Math.round(hexInfo.density * 7.3) },
              { year: 2015, population: Math.round(hexInfo.density * 7.7) },
              { year: 2020, population: Math.round(hexInfo.density * 8) },
            ],
            ageGroups: [
              { age: "0-14", male: Math.round(hexInfo.density * 0.7), female: Math.round(hexInfo.density * 0.68) },
              { age: "15-29", male: Math.round(hexInfo.density * 0.9), female: Math.round(hexInfo.density * 0.95) },
              { age: "30-44", male: Math.round(hexInfo.density * 1.1), female: Math.round(hexInfo.density * 1.15) },
              { age: "45-59", male: Math.round(hexInfo.density * 0.75), female: Math.round(hexInfo.density * 0.8) },
              { age: "60+", male: Math.round(hexInfo.density * 0.45), female: Math.round(hexInfo.density * 0.55) },
            ],
          });
        }
      }
    },
    [setSelectedRegion]
  );

  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-38.54, -3.76],
      zoom: 11,
    });
    mapRef.current = map;

    map.on("load", () => {
      const hexGeoJSON = buildHexGeoJSON();

      map.addSource("hexbins", {
        type: "geojson",
        data: hexGeoJSON,
        generateId: true,
      });

      map.addLayer({
        id: "hexbin-fill",
        type: "fill",
        source: "hexbins",
        paint: {
          "fill-color": [
            "interpolate",
            ["linear"],
            ["get", "density"],
            4000, "#1a1a2e",
            6000, "#16213e",
            7500, "#0f3460",
            9000, "#533483",
            10500, "#e94560",
            12500, "#ff6b6b",
          ],
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            1.0,
            0.75,
          ],
        },
      });

      map.addLayer({
        id: "hexbin-outline",
        type: "line",
        source: "hexbins",
        paint: {
          "line-color": "rgba(255,255,255,0.3)",
          "line-width": 0.8,
        },
      });

      let hoveredId: string | number | null = null;

      map.on("mousemove", "hexbin-fill", (e) => {
        if (e.features && e.features.length > 0) {
          if (hoveredId !== null) {
            map.setFeatureState(
              { source: "hexbins", id: hoveredId },
              { hover: false }
            );
          }
          hoveredId = e.features[0].id ?? null;
          if (hoveredId !== null) {
            map.setFeatureState(
              { source: "hexbins", id: hoveredId },
              { hover: true }
            );
          }
          map.getCanvas().style.cursor = "pointer";
        }
      });

      map.on("mouseleave", "hexbin-fill", () => {
        if (hoveredId !== null) {
          map.setFeatureState(
            { source: "hexbins", id: hoveredId },
            { hover: false }
          );
        }
        hoveredId = null;
        map.getCanvas().style.cursor = "";
      });

      map.on("click", "hexbin-fill", (e) => {
        if (e.features && e.features.length > 0) {
          const name = e.features[0].properties?.name as string;
          if (name) handleRegionClick(name);
        }
      });
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    return () => map.remove();
  }, [handleRegionClick]);

  return <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />;
}
