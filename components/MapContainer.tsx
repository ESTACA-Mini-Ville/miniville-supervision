"use client";

import ImageLayer from "ol/layer/Image";
import OlMap from "ol/Map";
import Projection from "ol/proj/Projection";
import ImageStatic from "ol/source/ImageStatic";
import View from "ol/View";
import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";

export default function MapContainer({
  onMapReady,
  style,
}: {
  onMapReady: (map: OlMap, container: HTMLDivElement) => void;
  style?: CSSProperties;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const onMapReadyRef = useRef(onMapReady);

  // keep ref in sync when parent callback changes, but don't make the main
  // init effect depend on it (avoids effect re-run loops in parent)
  useEffect(() => {
    onMapReadyRef.current = onMapReady;
  }, [onMapReady]);

  useEffect(() => {
    if (!mapRef.current) return;

    const IMAGE_WIDTH_M = 5.63;
    const IMAGE_HEIGHT_M = 6.85;
    const HALF_W = IMAGE_WIDTH_M / 2;
    const HALF_H = IMAGE_HEIGHT_M / 2;
    const extent = [-HALF_W, -HALF_H, HALF_W, HALF_H];

    const projection = new Projection({
      code: "MINIVILLE-M",
      units: "m",
      extent,
    });

    const imageLayer = new ImageLayer({
      source: new ImageStatic({
        url: "/map.webp",
        imageExtent: extent,
        projection,
      }),
    });

    const map = new OlMap({
      target: mapRef.current as HTMLElement,
      layers: [imageLayer],
      view: new View({
        projection,
        center: [0, 0],
        zoom: 0,
      }),
      controls: [],
    });

    // fit view to extent so the image fills the container
    const size = map.getSize();
    if (size) {
      map.getView().fit(extent, { size });
    } else {
      requestAnimationFrame(() =>
        map.getView().fit(extent, { size: map.getSize() || undefined }),
      );
    }

    // call the latest callback from the ref to avoid listing it as a
    // dependency of this init effect which must run only once on mount
    try {
      onMapReadyRef.current(map, mapRef.current as HTMLDivElement);
    } catch (err) {
      // swallow errors from user-provided callback so map cleanup remains robust
      console.error("[MapContainer] onMapReady callback error", err);
    }

    return () => {
      try {
        map.setTarget(undefined);
      } catch (e) {
        console.error("[MapContainer] map.setTarget error", e);
      }
    };
  }, []);

  return (
    <div ref={mapRef} style={style ?? { width: "100%", height: "100%" }} />
  );
}
