#!/usr/bin/env node
/**
 * Download Australian NEM transmission infrastructure from Geoscience Australia.
 * 
 * Source: https://services.ga.gov.au/gis/rest/services/Electricity_Infrastructure/MapServer
 * - Layer 0: Substations
 * - Layer 2: Power Lines
 * 
 * Licence: Commonwealth of Australia (Geoscience Australia) CC BY 4.0
 * https://creativecommons.org/licenses/by/4.0/
 * 
 * Attribution: © Commonwealth of Australia (Geoscience Australia) 2026. 
 * This product incorporates data from Geoscience Australia's Electricity Infrastructure dataset.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '../../src/data/local_data/nem_grid');

const BASE_URL = 'https://services.ga.gov.au/gis/rest/services/Electricity_Infrastructure/MapServer';
const NEM_STATES = ['NSW', 'VIC', 'QLD', 'SA', 'TAS', 'ACT'];
const MAX_RECORDS = 2000;

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      console.log(`  Retry ${i + 1}/${retries - 1}...`);
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

async function fetchAllRecords(layerId, whereClause) {
  const features = [];
  let offset = 0;
  
  while (true) {
    const url = new URL(`${BASE_URL}/${layerId}/query`);
    url.searchParams.set('where', whereClause);
    url.searchParams.set('outFields', '*');
    url.searchParams.set('f', 'geojson');
    url.searchParams.set('resultRecordCount', MAX_RECORDS);
    url.searchParams.set('resultOffset', offset);
    
    console.log(`  Fetching records ${offset} to ${offset + MAX_RECORDS}...`);
    const data = await fetchWithRetry(url.href);
    
    if (!data.features || data.features.length === 0) break;
    features.push(...data.features);
    
    if (!data.exceededTransferLimit) break;
    offset += MAX_RECORDS;
  }
  
  return features;
}

function simplifyCoordinates(coords, precision = 5) {
  if (typeof coords[0] === 'number') {
    return coords.map(c => Math.round(c * 10 ** precision) / 10 ** precision);
  }
  return coords.map(c => simplifyCoordinates(c, precision));
}

function processFeature(feature, type) {
  const props = feature.properties || {};
  const simplified = {
    type: 'Feature',
    id: props.objectid,
    geometry: {
      type: feature.geometry.type,
      coordinates: simplifyCoordinates(feature.geometry.coordinates, 5),
    },
    properties: {
      id: props.objectid,
      name: props.feature_name || null,
      type: props.feature_type || type,
      subtype: props.feature_subtype || null,
      voltage_kv: props.capacity_kv || props.voltage_kv || null,
      status: props.status || null,
      state: props.state || null,
    },
  };
  return simplified;
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  
  const whereClause = NEM_STATES.map(s => `STATE='${s}'`).join(' OR ');
  
  console.log('Downloading NEM power lines...');
  const linesRaw = await fetchAllRecords(2, whereClause);
  console.log(`  Downloaded ${linesRaw.length} power lines`);
  
  console.log('Downloading NEM substations...');
  const substationsRaw = await fetchAllRecords(0, whereClause);
  console.log(`  Downloaded ${substationsRaw.length} substations`);
  
  // Process and simplify
  const lines = linesRaw.map(f => processFeature(f, 'Power Line'));
  const substations = substationsRaw.map(f => processFeature(f, 'Substation'));
  
  // Create GeoJSON FeatureCollections
  const linesGeoJson = {
    type: 'FeatureCollection',
    features: lines,
  };
  
  const substationsGeoJson = {
    type: 'FeatureCollection',
    features: substations,
  };
  
  // Write files
  const linesPath = join(OUTPUT_DIR, 'transmission-lines.json');
  const substationsPath = join(OUTPUT_DIR, 'substations.json');
  
  writeFileSync(linesPath, JSON.stringify(linesGeoJson));
  writeFileSync(substationsPath, JSON.stringify(substationsGeoJson));
  
  // Calculate file sizes
  const linesSize = (JSON.stringify(linesGeoJson).length / 1024).toFixed(1);
  const substationsSize = (JSON.stringify(substationsGeoJson).length / 1024).toFixed(1);
  
  console.log(`\nWritten:`);
  console.log(`  ${linesPath} (${linesSize} KB, ${lines.length} features)`);
  console.log(`  ${substationsPath} (${substationsSize} KB, ${substations.length} features)`);
  
  // Stats by state
  console.log('\nFeatures by state:');
  for (const state of NEM_STATES) {
    const stateLines = lines.filter(f => f.properties.state === state).length;
    const stateSubs = substations.filter(f => f.properties.state === state).length;
    if (stateLines > 0 || stateSubs > 0) {
      console.log(`  ${state}: ${stateLines} lines, ${stateSubs} substations`);
    }
  }
  
  // Stats by voltage
  console.log('\nTransmission lines by voltage:');
  const voltages = [...new Set(lines.map(f => f.properties.voltage_kv))].sort((a, b) => (b || 0) - (a || 0));
  for (const v of voltages.slice(0, 10)) {
    const count = lines.filter(f => f.properties.voltage_kv === v).length;
    console.log(`  ${v || 'unknown'} kV: ${count} lines`);
  }
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
