/**
 * Application wrapper for NEM Grid layer.
 * Wires the layer to the application's entity context and overlay systems.
 */

import * as Cesium from 'cesium';
import { createNemGridLayer } from '../../layers/nemGrid/index.js';
import { overlayHost } from './overlayHost.js';
import {
  registerEntityContext,
  selectEntityContext,
  clearSelectedEntityContextForLayer,
} from '../../data/contextStore.js';

/**
 * Create the NEM Grid layer with application services wired in.
 * @param {object} [options]
 * @param {object} [options.source] - Custom data source
 */
export function createApplicationNemGrid(options = {}) {
  return createNemGridLayer({
    overlayHost,
    registerEntityContext,
    selectEntityContext,
    screenSpaceEventHandlerFactory: (canvas) =>
      new Cesium.ScreenSpaceEventHandler(canvas),
    ...options,
  });
}
