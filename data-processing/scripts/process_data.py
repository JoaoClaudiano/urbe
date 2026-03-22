"""
URBE Data Pipeline
Processes raw demographic data for the metropolitan region of Fortaleza
and outputs processed.json and hexgrid.json for the frontend.
"""

import json
import math
import os
import sys

try:
    import pandas as pd
except ImportError:
    print("pandas not installed, using built-in csv module")
    pd = None

# ─── Configuration ─────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "..", "data", "raw")
OUTPUT_DIR = os.path.join(SCRIPT_DIR, "..", "..", "src", "data")

HEX_RADIUS_LNG = 0.012
HEX_RADIUS_LAT = 0.009
BBOX = {
    "min_lng": -38.620,
    "max_lng": -38.460,
    "min_lat": -3.860,
    "max_lat": -3.690,
}


# ─── Utility functions ──────────────────────────────────────────────────────────

def load_csv(filepath: str) -> list[dict[str, str]]:
    """Load a CSV file using pandas if available, otherwise stdlib csv."""
    if pd is not None:
        df = pd.read_csv(filepath)
        return df.to_dict("records")
    import csv
    with open(filepath, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def compute_density(population: float, area_km2: float) -> float:
    """Population density: inhabitants per km²."""
    if area_km2 <= 0:
        return 0.0
    return population / area_km2


def compute_growth_rate(pop_start: float, pop_end: float, years: int) -> float:
    """Compound annual growth rate (CAGR) in percent."""
    if pop_start <= 0 or years <= 0:
        return 0.0
    return (math.pow(pop_end / pop_start, 1 / years) - 1) * 100


def generate_hex_centers(
    bbox: dict, radius_lng: float, radius_lat: float
) -> list[tuple[float, float]]:
    """
    Generate a regular hexagonal grid covering the bounding box.
    Uses offset-column layout (pointy-top hexagons).
    """
    centers = []
    col_step = radius_lng * 3
    row_step = radius_lat * math.sqrt(3)

    col = 0
    lng = bbox["min_lng"]
    while lng <= bbox["max_lng"] + radius_lng:
        offset = (row_step / 2) if col % 2 == 1 else 0
        lat = bbox["min_lat"] + offset
        while lat <= bbox["max_lat"] + radius_lat:
            centers.append((round(lng, 6), round(lat, 6)))
            lat += row_step
        lng += col_step
        col += 1

    return centers


def assign_density_to_hex(
    center: tuple[float, float],
    regions: list[dict[str, float | str]],
    default_density: float = 3000,
) -> tuple[float, str]:
    """
    Assign density to a hex center by finding the nearest region centroid.
    Uses squared distance to avoid sqrt for comparisons. Returns (density, region_name).
    """
    best_dist_sq = float("inf")
    best_region = None

    for region in regions:
        dlng = center[0] - float(region["centroid_lng"])
        dlat = center[1] - float(region["centroid_lat"])
        dist_sq = dlng ** 2 + dlat ** 2
        if dist_sq < best_dist_sq:
            best_dist_sq = dist_sq
            best_region = region

    # 0.05 degrees threshold (squared: 0.0025)
    if best_region is None or best_dist_sq > 0.0025:
        return default_density, "Outro"

    return best_region["density"], best_region["name"]


# ─── Main processing logic ──────────────────────────────────────────────────────

def process_region_data(raw_data: list[dict[str, str | float]]) -> list[dict[str, object]]:
    """Transform raw CSV rows into enriched region objects."""
    processed = []
    for row in raw_data:
        try:
            pop_2020 = float(row.get("population_2020", 0))
            pop_2000 = float(row.get("population_2000", 0))
            area = float(row.get("area_km2", 1))
            density = compute_density(pop_2020, area)
            growth = compute_growth_rate(pop_2000, pop_2020, 20)

            processed.append({
                "name": str(row.get("name", "Unknown")),
                "density": round(density, 1),
                "population": int(pop_2020),
                "area": round(area, 2),
                "growthRate": round(growth, 2),
                "centroid_lng": float(row.get("centroid_lng", -38.54)),
                "centroid_lat": float(row.get("centroid_lat", -3.73)),
                "populationHistory": [
                    {"year": 2000, "population": int(pop_2000)},
                    {"year": 2005, "population": int(pop_2000 + (pop_2020 - pop_2000) * 0.25)},
                    {"year": 2010, "population": int(pop_2000 + (pop_2020 - pop_2000) * 0.5)},
                    {"year": 2015, "population": int(pop_2000 + (pop_2020 - pop_2000) * 0.75)},
                    {"year": 2020, "population": int(pop_2020)},
                ],
                "ageGroups": [
                    {"age": "0-14",  "male": int(pop_2020 * 0.085), "female": int(pop_2020 * 0.083)},
                    {"age": "15-29", "male": int(pop_2020 * 0.115), "female": int(pop_2020 * 0.118)},
                    {"age": "30-44", "male": int(pop_2020 * 0.135), "female": int(pop_2020 * 0.140)},
                    {"age": "45-59", "male": int(pop_2020 * 0.095), "female": int(pop_2020 * 0.100)},
                    {"age": "60+",   "male": int(pop_2020 * 0.055), "female": int(pop_2020 * 0.074)},
                ],
            })
        except (ValueError, TypeError) as exc:
            print(f"Warning: skipping row {row} — {exc}", file=sys.stderr)

    return processed


def build_hexgrid(regions: list[dict]) -> dict:
    """Generate hexgrid GeoJSON-compatible structure from region data."""
    centers = generate_hex_centers(BBOX, HEX_RADIUS_LNG, HEX_RADIUS_LAT)
    hexagons = []

    for idx, center in enumerate(centers):
        density, name = assign_density_to_hex(center, regions)
        hexagons.append({
            "id": f"hex-{idx}",
            "center": list(center),
            "density": round(density),
            "name": name,
        })

    return {"hexagons": hexagons}


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    csv_path = os.path.join(DATA_DIR, "population.csv")
    if os.path.exists(csv_path):
        print(f"Loading data from {csv_path}")
        raw_data = load_csv(csv_path)
    else:
        print("CSV not found — using sample data", file=sys.stderr)
        raw_data = [
            {"name": "Centro",        "population_2020": 72000,  "population_2000": 61000,  "area_km2": 6.0,  "centroid_lng": -38.542, "centroid_lat": -3.728},
            {"name": "Aldeota",       "population_2020": 95000,  "population_2000": 78000,  "area_km2": 10.0, "centroid_lng": -38.487, "centroid_lat": -3.730},
            {"name": "Barra do Ceará","population_2020": 108000, "population_2000": 85000,  "area_km2": 15.0, "centroid_lng": -38.570, "centroid_lat": -3.705},
            {"name": "Messejana",     "population_2020": 87000,  "population_2000": 68000,  "area_km2": 15.0, "centroid_lng": -38.495, "centroid_lat": -3.815},
            {"name": "Maraponga",     "population_2020": 64800,  "population_2000": 52000,  "area_km2": 8.0,  "centroid_lng": -38.552, "centroid_lat": -3.787},
            {"name": "Parangaba",     "population_2020": 76000,  "population_2000": 62000,  "area_km2": 10.0, "centroid_lng": -38.550, "centroid_lat": -3.762},
            {"name": "Jóquei Clube",  "population_2020": 55200,  "population_2000": 46000,  "area_km2": 8.0,  "centroid_lng": -38.520, "centroid_lat": -3.762},
            {"name": "Mondubim",      "population_2020": 102000, "population_2000": 81000,  "area_km2": 12.0, "centroid_lng": -38.580, "centroid_lat": -3.815},
        ]

    regions = process_region_data(raw_data)

    output_regions = [
        {k: v for k, v in r.items() if k not in ("centroid_lng", "centroid_lat")}
        for r in regions
    ]
    processed_path = os.path.join(OUTPUT_DIR, "processed.json")
    with open(processed_path, "w", encoding="utf-8") as f:
        json.dump({"regions": output_regions}, f, ensure_ascii=False, indent=2)
    print(f"Written: {processed_path}")

    hexgrid = build_hexgrid(regions)
    hexgrid_path = os.path.join(OUTPUT_DIR, "hexgrid.json")
    with open(hexgrid_path, "w", encoding="utf-8") as f:
        json.dump(hexgrid, f, ensure_ascii=False, indent=2)
    print(f"Written: {hexgrid_path}")

    print(f"\nDone! Processed {len(regions)} regions and {len(hexgrid['hexagons'])} hexagons.")


if __name__ == "__main__":
    main()
