"use client";
import React, { useEffect, useRef } from "react";
import Map from "ol/Map";
import View from "ol/View";
import ImageLayer from "ol/layer/Image";
import ImageStatic from "ol/source/ImageStatic";
import Projection from "ol/proj/Projection";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import Style from "ol/style/Style";
import Icon from "ol/style/Icon";

export default function MinivilleMap() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapObjRef = useRef<Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // image size in meters
    const IMAGE_WIDTH_M = 5.63;
    const IMAGE_HEIGHT_M = 6.85;
    const HALF_W = IMAGE_WIDTH_M / 2;
    const HALF_H = IMAGE_HEIGHT_M / 2;

    // extent in map units (meters), origin at center
    const extent = [-HALF_W, -HALF_H, HALF_W, HALF_H];

    // projection that uses meters as units and our extent
    const projection = new Projection({
      code: "MINIVILLE-M",
      units: "m",
      extent,
    });

    // static image layer
    const imageLayer = new ImageLayer({
      source: new ImageStatic({
        url: "/map.webp",
        imageExtent: extent,
        projection,
      }),
    });

    // --- cars (vector) layer ---
    // create a style for a car with a given rotation (radians)
    const createCarStyle = (rotation: number) =>
      new Style({
        image: new Icon({
          src: "/car.webp",
          scale: 0.06,
          anchor: [0.5, 0.5],
          rotation,
          rotateWithView: true,
        }),
      });

    // sample car positions in map units (meters) within the extent
    const carPositions: [number, number, number][] = [
      [-1.1, -1.25, Math.PI / 2],
      [0.8, 1.25, (Math.PI * 240) / 180],
      [1.95, -0.5, 0],
    ];

    // first car (idx 0) faces left (π radians), others get a random orientation
    const carFeatures = carPositions.map((coord, idx) => {
      const f = new Feature(new Point(coord.slice(0, 2)));
      f.setId(`car-${idx}`);
      f.setStyle(createCarStyle(coord[2]));
      return f;
    });

    const carSource = new VectorSource({ features: carFeatures });
    const carLayer = new VectorLayer({ source: carSource, zIndex: 10 });

    // create map with only the image layer
    const map = new Map({
      target: mapRef.current as HTMLElement,
      layers: [imageLayer, carLayer],
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

    mapObjRef.current = map;

    // cleanup on unmount
    return () => {
      // ol/Map.setTarget accepts string | HTMLElement | undefined; use undefined to remove target
      map.setTarget(undefined);
      mapObjRef.current = null;
    };
  }, []);

  return <div ref={mapRef} style={{ width: "100%", height: "100%" }} />;
}
