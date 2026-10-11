# Australian NEM Grid Infrastructure

Bundled GeoJSON for the Australian National Electricity Market (NEM) transmission
network: high-voltage transmission lines and substations.

## Source

**Geoscience Australia — Electricity Infrastructure**  
https://services.ga.gov.au/gis/rest/services/Electricity_Infrastructure/MapServer

- Layer 0: Substations (switchyards and substations)
- Layer 2: Power Lines (transmission lines)

Downloaded 2026-10-11 for NEM states (NSW, VIC, QLD, SA, TAS, ACT).

## Licence

**Creative Commons Attribution 4.0 International (CC BY 4.0)**  
https://creativecommons.org/licenses/by/4.0/

### Attribution (required)

> © Commonwealth of Australia (Geoscience Australia) 2026.
> This product incorporates data from Geoscience Australia's Electricity Infrastructure dataset.

This dataset is compatible with the project's MIT license for bundled data.
Commercial use is permitted with attribution.

## Files

| File | Features | Description |
|------|----------|-------------|
| `transmission-lines.json` | 2,679 | High-voltage transmission lines (66 kV – 500 kV) |
| `substations.json` | 1,589 | Substations and switchyards |

### Features by State

| State | Lines | Substations |
|-------|-------|-------------|
| NSW   | 957   | 586 |
| VIC   | 653   | 326 |
| QLD   | 719   | 444 |
| SA    | 225   | 128 |
| TAS   | 112   | 86  |
| ACT   | 13    | 19  |

### Lines by Voltage

| Voltage | Count |
|---------|-------|
| 500 kV  | 50    |
| 330 kV  | 143   |
| 275 kV  | 209   |
| 220 kV  | 176   |
| 132 kV  | 812   |
| 110 kV  | 223   |
| 66 kV   | 1,064 |

## Processing

Line geometries were simplified using the Douglas-Peucker algorithm (0.0005° tolerance,
~50 m) and coordinates rounded to 4 decimal places to reduce file size while preserving
visual fidelity at globe scale.

## Schema

### Transmission Lines

```json
{
  "id": 123,
  "name": "Sydney West to Bannaby",
  "type": "Power Line",
  "subtype": "Overhead",
  "voltage_kv": 330,
  "status": "Operational",
  "state": "NSW"
}
```

### Substations

```json
{
  "id": 456,
  "name": "Sydney West",
  "type": "Substation",
  "subtype": "Substation",
  "voltage_kv": 330,
  "status": "Operational",
  "state": "NSW"
}
```

## Notes

- Line names typically follow the pattern "Substation A to Substation B"
- Voltage indicates the maximum operating voltage of the line/substation
- NEM interconnectors (e.g., QNI, VNI, Basslink) are included
- Some lines may have multiple voltage levels; the highest is recorded
