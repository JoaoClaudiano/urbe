import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import geoData from "../data/fortaleza.geojson";

mapboxgl.accessToken = "SEU_TOKEN_MAPBOX";

export default function Map() {
  const mapContainer = useRef(null);

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: mapContainer.current!,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-38.54, -3.73],
      zoom: 10.5,
    });

    map.on("load", () => {
      map.addSource("fortaleza", {
        type: "geojson",
        data: geoData as any,
      });

      map.addLayer({
        id: "density-layer",
        type: "fill",
        source: "fortaleza",
        paint: {
          "fill-color": [
            "interpolate",
            ["linear"],
            ["get", "density"],
            0, "#1a1a2e",
            2000, "#16213e",
            5000, "#0f3460",
            10000, "#e94560"
          ],
          "fill-opacity": 0.8
        }
      });

      map.addLayer({
        id: "outline",
        type: "line",
        source: "fortaleza",
        paint: {
          "line-color": "#ffffff",
          "line-width": 0.5
        }
      });
    });

    return () => map.remove();
  }, []);

  return <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />;
}
