/**
 * NEM Grid Incident Replay Panel
 * 
 * Provides UI controls for selecting and replaying NEM grid incidents,
 * including timeline scrubbing, event cards, and camera flyovers.
 */

import {
  INCIDENT_CATALOG,
  loadIncident,
  createIncidentReplay,
  formatTimelineEvent,
} from '../layers/nemGrid/incidents.js';

const EVENT_TYPE_ICONS = {
  trip: '⚠️',
  return: '✅',
  constraint: '🔒',
  note: 'ℹ️',
};

/**
 * Create the NEM incident panel controller.
 */
export function createNemIncidentPanel({
  container,
  nemLayer,
  viewer,
  onLayerEnable,
  isLayerEnabled,
}) {
  const document = container?.ownerDocument;
  if (!document) return null;

  const panel = document.getElementById('nem-incident-panel');
  const select = document.getElementById('nem-incident-select');
  const loadBtn = document.getElementById('nem-incident-load-btn');
  const incidentInfo = document.getElementById('nem-incident-info');
  const timelineControls = document.getElementById('nem-timeline-controls');
  const prevBtn = document.getElementById('nem-prev-btn');
  const playBtn = document.getElementById('nem-play-btn');
  const nextBtn = document.getElementById('nem-next-btn');
  const flyoverBtn = document.getElementById('nem-flyover-btn');
  const flyToBtn = document.getElementById('nem-fly-to-btn');
  const timelineFill = document.getElementById('nem-timeline-fill');
  const timelinePosition = document.getElementById('nem-timeline-position');
  const eventCard = document.getElementById('nem-event-card');
  const statusEl = document.getElementById('nem-incident-status');

  if (!panel || !select) return null;

  let replay = null;
  let destroyed = false;
  let flyoverInProgress = false;

  // Populate incident select
  function populateSelect() {
    select.innerHTML = '<option value="">-- Select Incident --</option>';
    for (const incident of INCIDENT_CATALOG) {
      const option = document.createElement('option');
      option.value = incident.id;
      option.textContent = `${incident.name} (${incident.date})`;
      if (incident.hasFlyover) {
        option.textContent += ' 🎥';
      }
      select.appendChild(option);
    }
  }

  // Update UI based on current state
  function updateUI() {
    const incident = replay?.getIncident();
    const currentIndex = replay?.getCurrentIndex() ?? -1;
    const isPlaying = replay?.isPlaying() ?? false;
    const hasFlyover = replay?.hasFlyover() ?? false;

    if (incident) {
      // Show incident info
      incidentInfo.hidden = false;
      incidentInfo.querySelector('.nem-incident-title').textContent = incident.name;
      incidentInfo.querySelector('.nem-incident-date').textContent = incident.date;
      incidentInfo.querySelector('.nem-incident-summary').textContent = incident.summary || '';

      // Show timeline controls
      timelineControls.hidden = false;
      flyoverBtn.hidden = !hasFlyover;

      // Update timeline progress
      const total = incident.timeline?.length || 0;
      const progress = total > 0 ? ((currentIndex + 1) / total) * 100 : 0;
      timelineFill.style.width = `${progress}%`;
      timelinePosition.textContent = `${currentIndex + 1} / ${total}`;

      // Update play button
      playBtn.textContent = isPlaying ? '⏸ PAUSE' : '▶ PLAY';

      // Update event card
      if (currentIndex >= 0 && incident.timeline[currentIndex]) {
        const event = incident.timeline[currentIndex];
        const formatted = formatTimelineEvent(event);
        
        eventCard.hidden = false;
        eventCard.className = `nem-event-card event-${event.type}`;
        eventCard.querySelector('.nem-event-icon').textContent = formatted.icon;
        eventCard.querySelector('.nem-event-time').textContent = formatted.time;
        eventCard.querySelector('.nem-event-text').textContent = formatted.text;
        eventCard.querySelector('.nem-event-elements').textContent = 
          formatted.elements.length > 0 
            ? `Elements: ${formatted.elements.join(', ')}`
            : '';

        // Show constraints if available
        const constraintsEl = eventCard.querySelector('.nem-event-constraints');
        const constraintsList = eventCard.querySelector('.nem-constraints-list');
        if (event.constraints && event.constraints.length > 0) {
          constraintsEl.hidden = false;
          constraintsList.innerHTML = event.constraints.map(c => 
            `<div class="nem-constraint-item">
              <span class="nem-constraint-id">${c.id || c.setId || 'Unknown'}</span>
              <span class="nem-constraint-desc">${c.description || ''}</span>
            </div>`
          ).join('');
        } else {
          constraintsEl.hidden = true;
        }
      } else {
        eventCard.hidden = true;
      }

      statusEl.textContent = '';
    } else {
      incidentInfo.hidden = true;
      timelineControls.hidden = true;
      eventCard.hidden = true;
      statusEl.textContent = isLayerEnabled?.() 
        ? 'Select an incident to begin replay'
        : 'Enable NEM Grid layer to view incidents';
    }
  }

  // Load selected incident
  async function loadSelectedIncident() {
    const incidentId = select.value;
    if (!incidentId) {
      statusEl.textContent = 'Select an incident first';
      return;
    }

    // Enable layer if not already
    if (!isLayerEnabled?.()) {
      await onLayerEnable?.();
    }

    statusEl.textContent = 'Loading incident...';

    try {
      if (!replay) {
        replay = createIncidentReplay({
          nemLayer,
          viewer,
          onTimelineUpdate: updateUI,
          onEventChange: updateUI,
        });
      }

      await replay.load(incidentId);
      replay.flyToArea();
      updateUI();
    } catch (error) {
      console.error('Failed to load incident:', error);
      statusEl.textContent = `Error: ${error.message}`;
    }
  }

  // Event handlers
  loadBtn?.addEventListener('click', loadSelectedIncident);

  prevBtn?.addEventListener('click', () => {
    replay?.stepBackward();
  });

  nextBtn?.addEventListener('click', () => {
    replay?.stepForward();
  });

  playBtn?.addEventListener('click', () => {
    if (replay?.isPlaying()) {
      replay.stop();
    } else {
      replay?.play(2500);
    }
    updateUI();
  });

  flyToBtn?.addEventListener('click', () => {
    replay?.flyToArea();
  });

  flyoverBtn?.addEventListener('click', async () => {
    if (flyoverInProgress) return;
    if (!replay?.hasFlyover()) return;

    flyoverInProgress = true;
    flyoverBtn.textContent = '🎥 FLYING...';
    flyoverBtn.disabled = true;

    try {
      await replay.flyover((wp) => {
        // Update timeline as we pass waypoints
        if (wp.index < (replay.getIncident()?.timeline?.length || 0)) {
          replay.seekTo(wp.index);
        }
      });
    } finally {
      flyoverInProgress = false;
      flyoverBtn.textContent = '🎥 FLYOVER';
      flyoverBtn.disabled = false;
    }
  });

  // Initialize
  populateSelect();
  updateUI();

  return {
    update() {
      updateUI();
    },

    setNemLayer(layer) {
      nemLayer = layer;
      if (replay) {
        replay = createIncidentReplay({
          nemLayer,
          viewer,
          onTimelineUpdate: updateUI,
          onEventChange: updateUI,
        });
      }
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      replay?.unload();
      replay = null;
    },

    // For URL param demo mode
    async loadIncidentById(incidentId) {
      select.value = incidentId;
      await loadSelectedIncident();
    },

    getReplay() {
      return replay;
    },
  };
}
