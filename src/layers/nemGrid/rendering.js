/**
 * NEM Grid rendering - creates Cesium entities for transmission lines and substations.
 */

import * as Cesium from 'cesium';
import {
  voltageColor,
  voltageLineWidth,
  substationMarkerSize,
  LINE_ALTITUDE_OFFSET,
  SUBSTATION_ALTITUDE_OFFSET,
} from './policy.js';

/**
 * Create transmission line entities from GeoJSON features.
 */
export function createLineEntities(features, dataSource) {
  const entities = [];
  
  for (const feature of features) {
    if (!feature.geometry?.coordinates) continue;
    
    const props = feature.properties || {};
    const voltage = props.voltage_kv;
    const color = Cesium.Color.fromCssColorString(voltageColor(voltage));
    const width = voltageLineWidth(voltage);
    
    // Convert coordinates to Cartesian3 positions
    const coords = feature.geometry.coordinates;
    const positions = coords.map(([lon, lat]) =>
      Cesium.Cartesian3.fromDegrees(lon, lat, LINE_ALTITUDE_OFFSET)
    );
    
    if (positions.length < 2) continue;
    
    const entity = dataSource.entities.add({
      id: `nem-line-${feature.id}`,
      polyline: {
        positions,
        width,
        material: new Cesium.ColorMaterialProperty(color),
        clampToGround: false,
        classificationType: Cesium.ClassificationType.BOTH,
      },
      properties: {
        featureType: 'transmission-line',
        ...props,
      },
    });
    
    entity.__nemLayerId = 'nem-grid';
    entity.__nemFeatureType = 'line';
    entity.__nemProps = props;
    entities.push(entity);
  }
  
  return entities;
}

/**
 * Create substation point entities from GeoJSON features.
 */
export function createSubstationEntities(features, dataSource) {
  const entities = [];
  
  for (const feature of features) {
    if (!feature.geometry?.coordinates) continue;
    
    const props = feature.properties || {};
    const voltage = props.voltage_kv;
    const color = Cesium.Color.fromCssColorString(voltageColor(voltage));
    const size = substationMarkerSize(voltage);
    
    const [lon, lat] = feature.geometry.coordinates;
    const position = Cesium.Cartesian3.fromDegrees(lon, lat, SUBSTATION_ALTITUDE_OFFSET);
    
    const entity = dataSource.entities.add({
      id: `nem-sub-${feature.id}`,
      position,
      point: {
        pixelSize: size,
        color,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 1.5,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      properties: {
        featureType: 'substation',
        ...props,
      },
    });
    
    entity.__nemLayerId = 'nem-grid';
    entity.__nemFeatureType = 'substation';
    entity.__nemProps = props;
    entities.push(entity);
  }
  
  return entities;
}

/**
 * Build a voltage legend for the layer.
 */
export function buildVoltageLegend() {
  return [
    { voltage: 500, label: '500 kV (EHV)', color: voltageColor(500) },
    { voltage: 330, label: '330 kV', color: voltageColor(330) },
    { voltage: 275, label: '275 kV', color: voltageColor(275) },
    { voltage: 220, label: '220 kV', color: voltageColor(220) },
    { voltage: 132, label: '132 kV', color: voltageColor(132) },
    { voltage: 110, label: '110 kV', color: voltageColor(110) },
    { voltage: 66, label: '66 kV', color: voltageColor(66) },
  ];
}

/**
 * Highlight specific features by name (for incident replay).
 */
export function highlightFeatures(entities, featureNames, highlightColor) {
  const highlight = Cesium.Color.fromCssColorString(highlightColor || '#ff0000');
  const matched = [];
  
  for (const entity of entities) {
    const name = entity.__nemProps?.name?.toLowerCase();
    if (!name) continue;
    
    const isMatch = featureNames.some(fn => 
      name.includes(fn.toLowerCase()) || fn.toLowerCase().includes(name)
    );
    
    if (isMatch) {
      if (entity.polyline) {
        entity.polyline.material = new Cesium.ColorMaterialProperty(highlight);
        entity.polyline.width = (entity.polyline.width?.getValue?.() || 3) + 2;
      }
      if (entity.point) {
        entity.point.color = highlight;
        entity.point.pixelSize = (entity.point.pixelSize?.getValue?.() || 10) + 4;
      }
      matched.push(entity);
    }
  }
  
  return matched;
}

/**
 * Reset all entities to their original appearance.
 */
export function resetFeatureHighlights(entities) {
  for (const entity of entities) {
    const voltage = entity.__nemProps?.voltage_kv;
    const color = Cesium.Color.fromCssColorString(voltageColor(voltage));
    
    if (entity.polyline) {
      entity.polyline.material = new Cesium.ColorMaterialProperty(color);
      entity.polyline.width = voltageLineWidth(voltage);
    }
    if (entity.point) {
      entity.point.color = color;
      entity.point.pixelSize = substationMarkerSize(voltage);
    }
  }
}
