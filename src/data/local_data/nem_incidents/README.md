# NEM Power System Incidents

Bundled incident data for demonstrating power system event replay on the NEM grid layer.
These incidents are sourced from public AEMO (Australian Energy Market Operator) reports.

## Source

**AEMO Power System Operating Incident Reports**  
https://aemo.com.au/energy-systems/electricity/national-electricity-market-nem/nem-events-and-reports/power-system-operating-incident-reports

All incident data is derived from publicly available AEMO reports. Constraint data
is from NEMWeb MMSDM archives.

## Licence

AEMO data is published under Australian Government open data principles.
Incident reports are public documents available from the AEMO website.

## Selected Incidents

### 1. Mt Piper 500 kV Line Trips (21 December 2019)

**File:** `mt-piper-2019-12-21.json`

During the 2019-2020 Black Summer bushfires, multiple 500 kV transmission lines
between Mt Piper and Bayswater tripped due to bushfire activity. Mt Piper Unit 1
also tripped. This incident demonstrates cascading effects on the NSW transmission
network.

**Key elements:**
- Mt Piper to Bayswater 5A3 line (500 kV)
- Mt Piper to Bayswater 5A5 line (500 kV)
- Mt Piper Power Station Unit 1

**Source:** AEMO Power System Operating Incident Report - NSW Bushfire Events
December 2019 to January 2020

### 2. Munmorah-Tuggerah Line Trips (9 January 2020)

**File:** `munmorah-2020-01-09.json`

Fire activity under transmission lines caused tripping of the 2M (Munmorah-Tuggerah)
and 26 (Munmorah-Sydney West) lines in the Central Coast/Hunter region of NSW.

**Key elements:**
- Munmorah to Tuggerah 2M line (132 kV)
- Munmorah to Sydney West 26 line (330 kV)
- Munmorah Substation

**Source:** AEMO Power System Operating Incident Report - NSW Line Trips
January 2020

### 3. NSW-Victoria Interconnector Separation (4 January 2020)

**File:** `vic-nsw-separation-2020-01-04.json`

Severe bushfire conditions in the Snowy Mountains region caused multiple 330 kV
line trips, leading to separation of the NSW and Victorian power systems via
the VIC-NSW interconnector.

**Key elements:**
- Upper Tumut to Canberra 3 line (330 kV)
- Murray to Upper Tumut 66 line (330 kV)
- VIC-NSW Interconnector (Snowy region)
- Upper Tumut Substation

**Source:** AEMO Power System Operating Incident Report - NSW/VIC Separation
January 2020

## Data Schema

Each incident file contains:

```json
{
  "id": "incident-id",
  "name": "Incident Name",
  "date": "2020-01-09",
  "region": "NSW",
  "summary": "Brief description",
  "source": "AEMO report reference",
  "sourceUrl": "URL to public report",
  "timeline": [
    {
      "time": "14:30",
      "event": "Description of event",
      "elements": ["affected element names"],
      "type": "trip|return|constraint|note"
    }
  ],
  "affectedElements": {
    "lines": ["line names"],
    "substations": ["substation names"],
    "generators": ["generator names"]
  },
  "constraints": [
    {
      "id": "constraint ID",
      "description": "constraint description",
      "invoked": "HH:MM",
      "released": "HH:MM or null"
    }
  ],
  "camera": {
    "longitude": 150.0,
    "latitude": -33.5,
    "height": 200000
  }
}
```

## Notes

- Times are in AEST (Australian Eastern Standard Time, UTC+10)
- Line names match those in the Geoscience Australia transmission data
- Constraint IDs reference AEMO MMS constraint sets
- Some details are simplified for demonstration purposes
