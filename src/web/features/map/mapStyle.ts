/**
 * Portalens egen kortstil bygget på OpenFreeMap's åbne vektorkort
 * (OpenMapTiles-skema, © OpenStreetMap-bidragydere). Ingen API-nøgle,
 * ingen cookies. Farverne er midnatsblå, is og guld.
 */
import type { StyleSpecification } from 'maplibre-gl';

const NAME_DA: unknown = ['coalesce', ['get', 'name:da'], ['get', 'name:latin'], ['get', 'name']];

export function buildMapStyle(): StyleSpecification {
  return {
    version: 8,
    name: 'Nordpolen Nat',
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    projection: { type: 'globe' },
    sky: {
      'sky-color': '#0a1530',
      'horizon-color': '#234179',
      'fog-color': '#0a1530',
      'sky-horizon-blend': 0.6,
      'horizon-fog-blend': 0.6,
      'fog-ground-blend': 0.8,
      'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 0.9, 5, 0.4, 7, 0],
    },
    sources: {
      openmaptiles: {
        type: 'vector',
        url: 'https://tiles.openfreemap.org/planet',
        attribution:
          '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> Data fra <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
      },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': '#0c1c3f' } },
      {
        id: 'water',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'water',
        filter: ['!=', ['get', 'brunnel'], 'tunnel'],
        paint: { 'fill-color': '#071026', 'fill-antialias': false },
      },
      {
        id: 'ice',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landcover',
        filter: ['in', ['get', 'subclass'], ['literal', ['glacier', 'ice_shelf']]],
        paint: { 'fill-color': '#c8d6ee', 'fill-opacity': 0.22 },
      },
      {
        id: 'wood',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landcover',
        filter: ['==', ['get', 'class'], 'wood'],
        paint: { 'fill-color': '#0f2a3a', 'fill-opacity': 0.5 },
      },
      {
        id: 'residential',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landuse',
        filter: ['in', ['get', 'class'], ['literal', ['residential', 'suburb', 'neighbourhood']]],
        paint: {
          'fill-color': '#f2c96b',
          'fill-opacity': ['interpolate', ['linear'], ['zoom'], 4, 0.06, 10, 0.12],
        },
      },
      {
        id: 'roads',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        minzoom: 5,
        filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary']]],
        paint: {
          'line-color': '#f2c96b',
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 5, 0.1, 10, 0.3],
          'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.4, 12, 2],
        },
      },
      {
        id: 'boundary-country',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'boundary',
        filter: ['all', ['==', ['get', 'admin_level'], 2], ['!=', ['get', 'maritime'], 1]],
        paint: {
          'line-color': '#e3b04b',
          'line-opacity': 0.45,
          'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.5, 6, 1.4],
          'line-dasharray': [3, 2],
        },
      },
      {
        id: 'coast-glow',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'water',
        maxzoom: 7,
        paint: { 'line-color': '#5c86c9', 'line-opacity': 0.25, 'line-width': 0.6 },
      },
      {
        id: 'place-country',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'place',
        maxzoom: 6,
        filter: ['==', ['get', 'class'], 'country'],
        layout: {
          'text-field': NAME_DA as never,
          'text-font': ['Noto Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 1, 9, 5, 13],
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.18,
          'text-max-width': 8,
        },
        paint: { 'text-color': '#9aa9c8', 'text-halo-color': '#050b1a', 'text-halo-width': 1.2 },
      },
      {
        id: 'place-city',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'place',
        minzoom: 3,
        filter: ['in', ['get', 'class'], ['literal', ['city', 'town']]],
        layout: {
          'text-field': NAME_DA as never,
          'text-font': ['Noto Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 3, 10, 8, 14],
          'text-anchor': 'top',
          'text-offset': [0, 0.4],
          'symbol-sort-key': ['get', 'rank'],
        },
        paint: {
          'text-color': '#f7f2e8',
          'text-opacity': ['interpolate', ['linear'], ['zoom'], 3, 0.6, 6, 0.9],
          'text-halo-color': '#050b1a',
          'text-halo-width': 1.4,
        },
      },
    ],
  } as unknown as StyleSpecification;
}
