/**
 * NEM Grid Layer - Australian National Electricity Market transmission infrastructure.
 * 
 * Displays high-voltage transmission lines and substations for NSW, VIC, QLD, SA, TAS, ACT.
 * Lines are colored by voltage level (500 kV red → 66 kV teal).
 * 
 * Data source: Geoscience Australia Electricity Infrastructure
 * Licence: CC BY 4.0
 * Attribution: © Commonwealth of Australia (Geoscience Australia)
 */

import * as Cesium from 'cesium';
import { createNemGridSource } from './source.js';
import {
  createLineEntities,
  createSubstationEntities,
  highlightFeatures,
  resetFeatureHighlights,
} from './rendering.js';
import {
  NEM_LAYER_ID,
  NEM_LAYER_NAME,
  NEM_LAYER_ICON,
  NEM_LAYER_SOURCE,
} from './policy.js';

export { createNemGridSource } from './source.js';
export { buildVoltageLegend } from './rendering.js';
export * from './policy.js';

/**
 * Create the NEM Grid layer.
 * @param {object} options
 * @param {object} [options.source] - Data source (defaults to bundled GA data)
 * @param {function} [options.registerEntityContext] - Entity context registration
 * @param {function} [options.selectEntityContext] - Entity selection handler
 * @param {function} [options.screenSpaceEventHandlerFactory] - Click handler factory
 */
export function createNemGridLayer({
  source = createNemGridSource(),
  registerEntityContext,
  selectEntityContext,
  screenSpaceEventHandlerFactory = (canvas) => new Cesium.ScreenSpaceEventHandler(canvas),
} = {}) {
  // Layer state
  let _viewer = null;
  let _enabled = false;
  let _loading = false;
  let _loaded = false;
  let _error = null;
  let _lastUpdate = null;
  let _abort = null;
  
  // Data sources
  let _linesDataSource = null;
  let _substationsDataSource = null;
  let _lineEntities = [];
  let _substationEntities = [];
  
  // Cached data for re-enable
  let _cachedLines = null;
  let _cachedSubstations = null;
  
  // Click handler
  let _clickHandler = null;
  
  // Count tracking
  let _lineCount = 0;
  let _substationCount = 0;
  
  async function load(viewer) {
    if (_loaded || _loading) return;
    if (!_enabled) return;
    
    _loading = true;
    _error = null;
    
    try {
      _abort = new AbortController();
      
      let lines = _cachedLines;
      let substations = _cachedSubstations;
      
      if (!lines || !substations) {
        const data = await source.fetch(_abort.signal);
        lines = data.lines;
        substations = data.substations;
        _cachedLines = lines;
        _cachedSubstations = substations;
      }
      
      if (!_enabled) return; // Disabled during load
      
      // Create data sources
      _linesDataSource = new Cesium.CustomDataSource('nem-lines');
      _substationsDataSource = new Cesium.CustomDataSource('nem-substations');
      
      // Create entities
      _lineEntities = createLineEntities(lines.features, _linesDataSource);
      _substationEntities = createSubstationEntities(substations.features, _substationsDataSource);
      
      _lineCount = _lineEntities.length;
      _substationCount = _substationEntities.length;
      
      // Register entity contexts for selection
      if (registerEntityContext) {
        for (const entity of [..._lineEntities, ..._substationEntities]) {
          const props = entity.__nemProps || {};
          registerEntityContext(entity, {
            id: entity.id,
            layerId: NEM_LAYER_ID,
            layerName: NEM_LAYER_NAME,
            source: NEM_LAYER_SOURCE,
            dataSource: entity.__nemFeatureType === 'line' ? _linesDataSource : _substationsDataSource,
            label: props.name || `${props.type} (${props.voltage_kv || '?'} kV)`,
            properties: props,
          });
        }
      }
      
      // Add to viewer
      await viewer.dataSources.add(_linesDataSource);
      await viewer.dataSources.add(_substationsDataSource);
      
      _loaded = true;
      _lastUpdate = Date.now();
      
    } catch (e) {
      if (e.name !== 'AbortError') {
        _error = e.message || 'Failed to load NEM grid data';
        console.error('NEM Grid layer load error:', e);
      }
    } finally {
      _loading = false;
      _abort = null;
    }
  }
  
  function releaseDataSources(viewer) {
    if (_linesDataSource && viewer?.dataSources) {
      try {
        viewer.dataSources.remove(_linesDataSource, true);
      } catch { /* already removed */ }
    }
    if (_substationsDataSource && viewer?.dataSources) {
      try {
        viewer.dataSources.remove(_substationsDataSource, true);
      } catch { /* already removed */ }
    }
    _linesDataSource = null;
    _substationsDataSource = null;
    _lineEntities = [];
    _substationEntities = [];
    _loaded = false;
  }
  
  return {
    id: NEM_LAYER_ID,
    name: NEM_LAYER_NAME,
    icon: NEM_LAYER_ICON,
    source: NEM_LAYER_SOURCE,
    updateInterval: 0, // Static data, no refresh needed
    statsRefreshInterval: 1000,
    
    init(viewer) {
      _viewer = viewer;
      
      // Set up click handler
      if (!_clickHandler && screenSpaceEventHandlerFactory) {
        _clickHandler = screenSpaceEventHandlerFactory(viewer.scene.canvas);
        _clickHandler.setInputAction((click) => {
          if (!_enabled) return;
          
          const picked = viewer.scene.pick(click.position);
          if (picked?.id?.__nemLayerId === NEM_LAYER_ID) {
            const entity = picked.id;
            viewer.selectedEntity = entity;
            if (selectEntityContext) {
              selectEntityContext(entity);
            }
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
      }
    },
    
    async enable(viewer) {
      _enabled = true;
      _viewer = viewer || _viewer;
      
      if (_linesDataSource) _linesDataSource.show = true;
      if (_substationsDataSource) _substationsDataSource.show = true;
      
      await load(_viewer);
      _viewer?.scene?.requestRender?.();
    },
    
    disable() {
      _enabled = false;
      
      if (_abort) {
        _abort.abort();
        _abort = null;
        _loading = false;
      }
      
      // Hide but keep data for quick re-enable
      if (_linesDataSource) _linesDataSource.show = false;
      if (_substationsDataSource) _substationsDataSource.show = false;
    },
    
    update(viewer) {
      // Static data, no periodic updates needed
    },
    
    destroy(viewer) {
      _enabled = false;
      
      if (_abort) {
        _abort.abort();
        _abort = null;
      }
      
      releaseDataSources(viewer || _viewer);
      
      if (_clickHandler) {
        _clickHandler.destroy();
        _clickHandler = null;
      }
      
      _cachedLines = null;
      _cachedSubstations = null;
      _viewer = null;
      _loading = false;
      _loaded = false;
      _error = null;
      _lastUpdate = null;
      _lineCount = 0;
      _substationCount = 0;
    },
    
    getStats() {
      return {
        count: _lineCount + _substationCount,
        lines: _lineCount,
        substations: _substationCount,
        lastUpdate: _lastUpdate,
        loading: _loading,
        error: _error,
      };
    },
    
    // Additional methods for incident replay
    
    /**
     * Get all entities for filtering/highlighting.
     */
    getEntities() {
      return [..._lineEntities, ..._substationEntities];
    },
    
    /**
     * Highlight features by name (partial match).
     * @param {string[]} featureNames - Names to highlight
     * @param {string} [color] - Highlight color (default red)
     * @returns {object[]} Matched entities
     */
    highlightByName(featureNames, color) {
      return highlightFeatures(this.getEntities(), featureNames, color);
    },
    
    /**
     * Reset all feature highlighting.
     */
    resetHighlights() {
      resetFeatureHighlights(this.getEntities());
    },
    
    /**
     * Find features by name pattern.
     * @param {string} pattern - Search pattern
     * @returns {object[]} Matching feature properties
     */
    findFeatures(pattern) {
      const regex = new RegExp(pattern, 'i');
      return this.getEntities()
        .filter(e => regex.test(e.__nemProps?.name || ''))
        .map(e => e.__nemProps);
    },
    
    /**
     * Fly camera to a specific feature.
     * @param {string} featureName - Feature name to fly to
     * @param {object} [options] - Camera fly options
     */
    flyToFeature(featureName, options = {}) {
      const entity = this.getEntities().find(e => 
        e.__nemProps?.name?.toLowerCase().includes(featureName.toLowerCase())
      );
      
      if (entity && _viewer) {
        _viewer.flyTo(entity, {
          duration: options.duration || 2,
          offset: options.offset,
        });
      }
      
      return entity;
    },
    
    /**
     * Get features in a bounding box (for NSW focus).
     * @param {object} bounds - { west, south, east, north } in degrees
     */
    getFeaturesInBounds(bounds) {
      const entities = this.getEntities();
      const result = { lines: [], substations: [] };
      
      for (const entity of entities) {
        let lon, lat;
        
        if (entity.position) {
          const carto = Cesium.Cartographic.fromCartesian(entity.position.getValue(Cesium.JulianDate.now()));
          lon = Cesium.Math.toDegrees(carto.longitude);
          lat = Cesium.Math.toDegrees(carto.latitude);
        } else if (entity.polyline) {
          // Use first point of line
          const positions = entity.polyline.positions?.getValue(Cesium.JulianDate.now());
          if (positions?.length > 0) {
            const carto = Cesium.Cartographic.fromCartesian(positions[0]);
            lon = Cesium.Math.toDegrees(carto.longitude);
            lat = Cesium.Math.toDegrees(carto.latitude);
          }
        }
        
        if (lon !== undefined && lat !== undefined) {
          if (lon >= bounds.west && lon <= bounds.east &&
              lat >= bounds.south && lat <= bounds.north) {
            if (entity.__nemFeatureType === 'line') {
              result.lines.push(entity.__nemProps);
            } else {
              result.substations.push(entity.__nemProps);
            }
          }
        }
      }
      
      return result;
    },
  };
}
