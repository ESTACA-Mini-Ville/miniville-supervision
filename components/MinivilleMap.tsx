"use client";
import Feature from "ol/Feature";
import type { Geometry } from "ol/geom";
import Point from "ol/geom/Point";
import ImageLayer from "ol/layer/Image";
import VectorLayer from "ol/layer/Vector";
import OlMap from "ol/Map";
import Projection from "ol/proj/Projection";
import ImageStatic from "ol/source/ImageStatic";
import VectorSource from "ol/source/Vector";
import Icon from "ol/style/Icon";
import Style from "ol/style/Style";
import View from "ol/View";
import { useEffect, useRef } from "react";
import type { PoseMessage } from "@/lib/msgTypes";
import { useWebSocket } from "@/lib/wsClient";

export default function MinivilleMap() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapObjRef = useRef<OlMap | null>(null);
  const { subscribeTopic } = useWebSocket();

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

    // dynamic car source: features keyed by robot_id (typed)
    const carSource = new VectorSource<Geometry>({ features: [] });
    const carLayer = new VectorLayer({ source: carSource, zIndex: 10 });

    // create map with only the image layer
    const map = new OlMap({
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

    function quatToYaw(qx: number, qy: number, qz: number, qw: number) {
      const siny_cosp = 2 * (qw * qz + qx * qy);
      const cosy_cosp = 1 - 2 * (qy ^ (2 + qz) ^ 2);

      return Math.atan2(siny_cosp, cosy_cosp);
    }

    // subscribe to amcl_pose topic and update/create car features
    const unsub = subscribeTopic("amcl_pose", (msg: PoseMessage) => {
      try {
        // the message shape in example: { header:..., pose: { pose: { position: {x,y,z}, orientation:{x,y,z,w} }, covariance: [...] }, robot_id }
        const pose = msg.pose?.pose || msg.pose;
        const pos = pose?.position;
        const ori = pose?.orientation || msg.pose?.pose?.orientation;
        const robotId = msg.robot_id || "unknown";

        if (!pos || !ori) return;

        const x = Number(pos.x);
        const y = Number(pos.y);
        const qx = Number(ori.x);
        const qy = Number(ori.y);
        const qz = Number(ori.z);
        const qw = Number(ori.w);

        if (Number.isNaN(x) || Number.isNaN(y)) return;

        const rotation = quatToYaw(qx, qy, qz, qw);
        // NOTE: if your car image's forward axis differs, you can offset here (e.g. rotation - Math.PI/2)
        // const rotation = quatToYaw(qx, qy, qz, qw) - Math.PI / 2;

        // find feature by id
        let feature = carSource.getFeatureById(robotId) as Feature | null;
        if (!feature) {
          feature = new Feature(new Point([x, y]));
          feature.setId(robotId);
          feature.setStyle(createCarStyle(rotation));
          // cast to any to satisfy OL typings in this project setup
          carSource.addFeature(feature);
        } else {
          const geom = feature.getGeometry() as Point;
          geom.setCoordinates([x, y]);
          feature.setStyle(createCarStyle(rotation));
        }
      } catch (e) {
        console.error("[MinivilleMap] error handling amcl_pose message", e);
      }
    });

    // cleanup on unmount
    return () => {
      // ol/Map.setTarget accepts string | HTMLElement | undefined; use undefined to remove target
      try {
        unsub?.();
      } catch (e) {
        console.error("[MinivilleMap] error unsubscribing from topic", e);
      }
      map.setTarget(undefined);
      mapObjRef.current = null;
    };
  }, [subscribeTopic]);

  return <div ref={mapRef} style={{ width: "100%", height: "100%" }} />;
}
