#!/usr/bin/env node
/**
 * Simplify NEM transmission line geometry using Douglas-Peucker algorithm.
 * Reduces file size while preserving visual appearance at globe scale.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../src/data/local_data/nem_grid');

// Douglas-Peucker line simplification
function perpendicularDistance(point, lineStart, lineEnd) {
  const dx = lineEnd[0] - lineStart[0];
  const dy = lineEnd[1] - lineStart[1];
  const mag = Math.sqrt(dx * dx + dy * dy);
  if (mag === 0) return Math.sqrt((point[0] - lineStart[0]) ** 2 + (point[1] - lineStart[1]) ** 2);
  const u = ((point[0] - lineStart[0]) * dx + (point[1] - lineStart[1]) * dy) / (mag * mag);
  const closestX = lineStart[0] + u * dx;
  const closestY = lineStart[1] + u * dy;
  return Math.sqrt((point[0] - closestX) ** 2 + (point[1] - closestY) ** 2);
}

function douglasPeucker(points, epsilon) {
  if (points.length <= 2) return points;
  
  let maxDist = 0;
  let maxIndex = 0;
  
  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }
  
  if (maxDist > epsilon) {
    const left = douglasPeucker(points.slice(0, maxIndex + 1), epsilon);
    const right = douglasPeucker(points.slice(maxIndex), epsilon);
    return left.slice(0, -1).concat(right);
  }
  
  return [points[0], points[points.length - 1]];
}

function simplifyCoords(coords, epsilon, precision = 4) {
  const simplified = douglasPeucker(coords, epsilon);
  return simplified.map(c => [
    Math.round(c[0] * 10 ** precision) / 10 ** precision,
    Math.round(c[1] * 10 ** precision) / 10 ** precision,
  ]);
}

function main() {
  const linesPath = join(DATA_DIR, 'transmission-lines.json');
  const lines = JSON.parse(readFileSync(linesPath, 'utf8'));
  
  // Simplification tolerance in degrees (roughly 0.001 deg ≈ 100m at equator)
  const epsilon = 0.0005; // ~50m tolerance
  
  let totalPointsBefore = 0;
  let totalPointsAfter = 0;
  
  for (const feature of lines.features) {
    if (feature.geometry.type === 'LineString') {
      totalPointsBefore += feature.geometry.coordinates.length;
      feature.geometry.coordinates = simplifyCoords(feature.geometry.coordinates, epsilon);
      totalPointsAfter += feature.geometry.coordinates.length;
    } else if (feature.geometry.type === 'MultiLineString') {
      for (let i = 0; i < feature.geometry.coordinates.length; i++) {
        totalPointsBefore += feature.geometry.coordinates[i].length;
        feature.geometry.coordinates[i] = simplifyCoords(feature.geometry.coordinates[i], epsilon);
        totalPointsAfter += feature.geometry.coordinates[i].length;
      }
    }
  }
  
  writeFileSync(linesPath, JSON.stringify(lines));
  
  const sizeBefore = 7582.3; // From previous run
  const sizeAfter = (JSON.stringify(lines).length / 1024).toFixed(1);
  
  console.log(`Simplified transmission lines:`);
  console.log(`  Points: ${totalPointsBefore} -> ${totalPointsAfter} (${((totalPointsAfter / totalPointsBefore) * 100).toFixed(1)}%)`);
  console.log(`  File size: ${sizeBefore} KB -> ${sizeAfter} KB`);
}

main();
