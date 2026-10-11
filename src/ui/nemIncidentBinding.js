/**
 * NEM Grid Incident Panel Binding
 * 
 * Wires the NEM incident panel to the NEM grid layer and data manager.
 * Handles URL parameter for demo mode (?nem-demo=incident-id).
 */

import { createNemIncidentPanel } from './nemIncidentPanel.js';

const NEM_LAYER_ID = 'nem-grid';

/**
 * Create and bind the NEM incident panel to the application.
 * @param {object} options
 * @param {object} options.dataManager - Layer data manager
 * @param {object} options.viewer - Cesium viewer instance
 * @param {function} [options.setPanelCollapsed] - Panel collapse controller
 */
export function createNemIncidentBinding({
  dataManager,
  viewer,
  setPanelCollapsed,
}) {
  let panelController = null;
  let nemLayer = null;
  let destroyed = false;
  
  const container = document.body;
  
  function getIsLayerEnabled() {
    return dataManager?.isEnabled(NEM_LAYER_ID) ?? false;
  }
  
  async function enableLayer() {
    if (!dataManager) return;
    await dataManager.setEnabled(NEM_LAYER_ID, true, { origin: 'nem-incident-panel' });
  }
  
  function findNemLayer() {
    return dataManager?.layers?.get(NEM_LAYER_ID)?.module || null;
  }
  
  function initialize() {
    if (destroyed) return;
    
    nemLayer = findNemLayer();
    
    panelController = createNemIncidentPanel({
      container,
      nemLayer,
      viewer,
      onLayerEnable: enableLayer,
      isLayerEnabled: getIsLayerEnabled,
    });
    
    if (!panelController) {
      console.warn('NEM incident panel: DOM elements not found');
      return;
    }
    
    if (dataManager) {
      dataManager.subscribe((change) => {
        if (change?.layerId !== NEM_LAYER_ID) return;
        
        if (change.type === 'visibility-settled') {
          if (!nemLayer) {
            nemLayer = findNemLayer();
            panelController?.setNemLayer(nemLayer);
          }
          panelController?.update();
        }
      });
    }
    
    checkDemoMode();
  }
  
  async function checkDemoMode() {
    if (destroyed) return;
    
    try {
      const params = new URLSearchParams(window.location.search);
      const demoIncident = params.get('nem-demo');
      
      if (demoIncident && panelController) {
        const nemPanel = document.getElementById('nem-incident-panel');
        if (nemPanel) {
          nemPanel.classList.remove('collapsed');
          if (setPanelCollapsed) {
            setPanelCollapsed('nem-incident-panel', false, { explicit: true });
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        await enableLayer();
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        nemLayer = findNemLayer();
        panelController?.setNemLayer(nemLayer);
        
        await panelController?.loadIncidentById(demoIncident);
      }
    } catch (error) {
      console.error('NEM demo mode error:', error);
    }
  }
  
  initialize();
  
  return {
    getController() {
      return panelController;
    },
    
    getNemLayer() {
      return nemLayer;
    },
    
    destroy() {
      if (destroyed) return;
      destroyed = true;
      panelController?.destroy();
      panelController = null;
      nemLayer = null;
    },
  };
}

export function parseNemDemoParam(search = window.location.search) {
  try {
    return new URLSearchParams(search).get('nem-demo') || null;
  } catch {
    return null;
  }
}
