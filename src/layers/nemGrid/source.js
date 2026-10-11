/**
 * NEM Grid bundled data source.
 * 
 * Data: Geoscience Australia Electricity Infrastructure
 * Licence: CC BY 4.0
 * Attribution: © Commonwealth of Australia (Geoscience Australia)
 */

function linesUrl() {
  return new URL(
    '../../data/local_data/nem_grid/transmission-lines.json',
    import.meta.url,
  ).href;
}

function substationsUrl() {
  return new URL(
    '../../data/local_data/nem_grid/substations.json',
    import.meta.url,
  ).href;
}

export function createNemGridSource({ fetchImpl = (...args) => fetch(...args) } = {}) {
  async function read(url, signal) {
    signal?.throwIfAborted();
    const response = await fetchImpl(url, { signal, cache: 'force-cache' });
    if (!response.ok) {
      try {
        await response.body?.cancel();
      } catch {
        /* best effort */
      }
      throw new Error(`HTTP ${response.status} for ${url}`);
    }
    const json = await response.json();
    signal?.throwIfAborted();
    return json;
  }

  return {
    label: 'Geoscience Australia',
    async fetch(signal) {
      const [lines, substations] = await Promise.all([
        read(linesUrl(), signal),
        read(substationsUrl(), signal),
      ]);
      return { lines, substations };
    },
  };
}
