'use client';
import React, { useEffect, useRef } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';

export default function Home() {
  const mapEl = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    let map: any;
    let cancelled = false;

    (async () => {
      const maplibregl = (await import('maplibre-gl')) as any;
      if (cancelled) return;

      map = new maplibregl.Map({
        container: mapEl.current as HTMLElement,
        style: {
          version: 8,
          sources: {},
          layers: [],
        },
        center: [0, 0],
        zoom: 0,
      });

      map.on('load', () => {
        const imgCoords: [number, number][] = [
          [-3.06, 3.00], // top-left
          [2.69, 3.30],  // top-right
          [3.11, -3.67], // bottom-right
          [-2.74, -3.98] // bottom-left
        ];

        map.addSource('imaginary-map', {
          type: 'image',
          url: '/imaginary-map.png',
          coordinates: imgCoords,
        });

        map.addLayer({
          id: 'imaginary-layer',
          type: 'raster',
          source: 'imaginary-map',
        });

        // compute bounding box from the four coordinates and fit view
        const lons = imgCoords.map(c => c[0]);
        const lats = imgCoords.map(c => c[1]);
        const sw: [number, number] = [Math.min(...lons), Math.min(...lats)]; // south-west
        const ne: [number, number] = [Math.max(...lons), Math.max(...lats)]; // north-east
        map.fitBounds([sw, ne], { padding: 20, animate: false });

        // place car using MapLibre symbol layer (no DOM marker element)
        const rand = (min: number, max: number) => Math.random() * (max - min) + min;
        const randomPos: [number, number] = [rand(-2.74, 3.11), rand(-3.98, 3.30)];

        // load car.webp reliably and add as a style image, then add a geojson source + symbol layer
        (async () => {
          try {
            const res = await fetch('/car.webp');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            // createImageBitmap is more compatible for map.addImage
            const bitmap = await createImageBitmap(blob);

            if (map.hasImage && map.hasImage('car')) {
              try { map.removeImage('car'); } catch {}
            }
            map.addImage('car', bitmap);

            const carSource = {
              type: 'geojson',
              data: {
                type: 'FeatureCollection',
                features: [
                  {
                    type: 'Feature',
                    geometry: {
                      type: 'Point',
                      coordinates: randomPos,
                    },
                    properties: {
                      rotation: rand(0, 360), // random rotation
                    },
                  },
                ],
              },
            };

            if (map.getSource('cars')) {
              (map.getSource('cars') as any).setData(carSource.data);
            } else {
              map.addSource('cars', carSource);
              map.addLayer({
                id: 'car-symbol',
                type: 'symbol',
                source: 'cars',
                layout: {
                  'icon-image': 'car',
                  'icon-size': 0.10,
                  'icon-allow-overlap': true,
                  'icon-anchor': 'center',
                  'icon-rotate': ['get', 'rotation'], // use feature property
                  'icon-rotation-alignment': 'map',
                },
              });
            }
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Failed to load/add car.webp', err);
          }
        })();
      });
    })();

    return () => {
      cancelled = true;
      if (map) map.remove();
    };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <div ref={mapEl} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}