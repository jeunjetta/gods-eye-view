/**
 * NEM Grid Incident Replay Module
 * 
 * Loads and replays historical power system incidents on the NEM grid layer.
 * Supports timeline scrubbing, element highlighting, and camera flyovers.
 */

import * as Cesium from 'cesium';

// Incident data URLs
function incidentUrl(filename) {
  return new URL(
    `../../data/local_data/nem_incidents/${filename}`,
    import.meta.url,
  ).href;
}

// Available incidents
export const INCIDENT_CATALOG = [
  {
    id: 'balranald-buronga-2026-01-19',
    name: 'Balranald-Buronga 220 kV X3 Line Trip',
    date: '2026-01-19',
    region: 'NSW',
    file: 'balranald-buronga-2026-01-19.json',
    hasFlyover: true,
  },
  {
    id: 'mt-piper-2019-12-21',
    name: 'Mt Piper 500 kV Line Trips',
    date: '2019-12-21',
    region: 'NSW',
    file: 'mt-piper-2019-12-21.json',
    hasFlyover: false,
  },
  {
    id: 'munmorah-2020-01-09',
    name: 'Munmorah-Tuggerah Line Trips',
    date: '2020-01-09',
    region: 'NSW',
    file: 'munmorah-2020-01-09.json',
    hasFlyover: false,
  },
  {
    id: 'vic-nsw-separation-2020-01-04',
    name: 'NSW-Victoria Interconnector Separation',
    date: '2020-01-04',
    region: 'NSW/VIC',
    file: 'vic-nsw-separation-2020-01-04.json',
    hasFlyover: false,
  },
];

/**
 * Load an incident data file.
 */
export async function loadIncident(incidentId, signal) {
  const catalog = INCIDENT_CATALOG.find(i => i.id === incidentId);
  if (!catalog) throw new Error(`Unknown incident: ${incidentId}`);
  
  const url = incidentUrl(catalog.file);
  const response = await fetch(url, { signal, cache: 'force-cache' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/**
 * Create an incident replay controller.
 */
export function createIncidentReplay({
  nemLayer,
  viewer,
  onTimelineUpdate,
  onEventChange,
}) {
  let _incident = null;
  let _currentEventIndex = -1;
  let _highlightedEntities = [];
  let _playing = false;
  let _playInterval = null;
  
  function clearHighlights() {
    if (nemLayer) {
      nemLayer.resetHighlights();
    }
    _highlightedEntities = [];
  }
  
  function highlightEvent(eventIndex) {
    if (!_incident || eventIndex < 0 || eventIndex >= _incident.timeline.length) {
      clearHighlights();
      return;
    }
    
    const event = _incident.timeline[eventIndex];
    const elements = event.elements || [];
    
    clearHighlights();
    
    if (elements.length > 0 && nemLayer) {
      // Determine highlight color based on event type
      let color;
      switch (event.type) {
        case 'trip':
          color = '#ff3333'; // Red for trips
          break;
        case 'return':
          color = '#33ff33'; // Green for returns
          break;
        case 'constraint':
          color = '#ffaa00'; // Orange for constraints
          break;
        default:
          color = '#ffff00'; // Yellow for notes
      }
      
      _highlightedEntities = nemLayer.highlightByName(elements, color);
    }
    
    _currentEventIndex = eventIndex;
    onEventChange?.({
      index: eventIndex,
      event,
      total: _incident.timeline.length,
    });
  }
  
  function flyToIncidentArea() {
    if (!_incident?.camera || !viewer) return;
    
    const { longitude, latitude, height, heading = 0, pitch = -45 } = _incident.camera;
    
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, height),
      orientation: {
        heading: Cesium.Math.toRadians(heading),
        pitch: Cesium.Math.toRadians(pitch),
        roll: 0,
      },
      duration: 2,
    });
  }
  
  /**
   * Execute the camera flyover for incidents that have one (e.g., 2026 Balranald-Buronga).
   */
  async function executeFlyover(onWaypointReached) {
    if (!_incident?.flyover?.waypoints || !viewer) return;
    
    const { waypoints, flightDurationSec = 3 } = _incident.flyover;
    
    for (let i = 0; i < waypoints.length; i++) {
      const wp = waypoints[i];
      
      // Fly to waypoint
      await new Promise((resolve) => {
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(
            wp.longitude,
            wp.latitude,
            wp.altitude
          ),
          orientation: {
            heading: Cesium.Math.toRadians(wp.heading || 0),
            pitch: Cesium.Math.toRadians(wp.pitch || -35),
            roll: 0,
          },
          duration: flightDurationSec,
          complete: resolve,
          cancel: resolve,
        });
      });
      
      // Notify callback
      onWaypointReached?.({
        index: i,
        waypoint: wp,
        total: waypoints.length,
      });
      
      // Hold at waypoint
      if (wp.holdSec > 0) {
        await new Promise(r => setTimeout(r, wp.holdSec * 1000));
      }
    }
  }
  
  return {
    /**
     * Load and activate an incident.
     */
    async load(incidentId, signal) {
      this.stop();
      clearHighlights();
      
      _incident = await loadIncident(incidentId, signal);
      _currentEventIndex = -1;
      
      onTimelineUpdate?.({
        incident: _incident,
        events: _incident.timeline,
        currentIndex: -1,
      });
      
      return _incident;
    },
    
    /**
     * Unload the current incident.
     */
    unload() {
      this.stop();
      clearHighlights();
      _incident = null;
      _currentEventIndex = -1;
      onTimelineUpdate?.(null);
    },
    
    /**
     * Get the current incident data.
     */
    getIncident() {
      return _incident;
    },
    
    /**
     * Get the current timeline position.
     */
    getCurrentIndex() {
      return _currentEventIndex;
    },
    
    /**
     * Seek to a specific timeline event.
     */
    seekTo(eventIndex) {
      highlightEvent(eventIndex);
    },
    
    /**
     * Step forward one event.
     */
    stepForward() {
      if (!_incident) return;
      const next = Math.min(_currentEventIndex + 1, _incident.timeline.length - 1);
      highlightEvent(next);
    },
    
    /**
     * Step backward one event.
     */
    stepBackward() {
      if (!_incident) return;
      const prev = Math.max(_currentEventIndex - 1, 0);
      highlightEvent(prev);
    },
    
    /**
     * Start automatic playback.
     */
    play(intervalMs = 3000) {
      if (_playing || !_incident) return;
      
      _playing = true;
      
      // Start at beginning if at end
      if (_currentEventIndex >= _incident.timeline.length - 1) {
        _currentEventIndex = -1;
      }
      
      _playInterval = setInterval(() => {
        if (_currentEventIndex >= _incident.timeline.length - 1) {
          this.stop();
          return;
        }
        this.stepForward();
      }, intervalMs);
      
      // Immediately step forward
      this.stepForward();
    },
    
    /**
     * Stop automatic playback.
     */
    stop() {
      _playing = false;
      if (_playInterval) {
        clearInterval(_playInterval);
        _playInterval = null;
      }
    },
    
    /**
     * Check if playing.
     */
    isPlaying() {
      return _playing;
    },
    
    /**
     * Fly camera to the incident area.
     */
    flyToArea() {
      flyToIncidentArea();
    },
    
    /**
     * Execute camera flyover (if available).
     */
    async flyover(onWaypointReached) {
      await executeFlyover(onWaypointReached);
    },
    
    /**
     * Check if incident has flyover.
     */
    hasFlyover() {
      return !!_incident?.flyover?.waypoints;
    },
    
    /**
     * Reset highlights.
     */
    reset() {
      clearHighlights();
      _currentEventIndex = -1;
      onEventChange?.(null);
    },
  };
}

/**
 * Format a timeline event for display.
 */
export function formatTimelineEvent(event) {
  const typeIcons = {
    trip: '⚠️',
    return: '✅',
    constraint: '🔒',
    note: 'ℹ️',
  };
  
  return {
    icon: typeIcons[event.type] || '•',
    time: event.time,
    text: event.event,
    type: event.type,
    elements: event.elements || [],
  };
}
