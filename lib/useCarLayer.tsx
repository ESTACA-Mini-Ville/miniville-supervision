"use client";

import Feature from "ol/Feature";
import type { Geometry } from "ol/geom";
import Point from "ol/geom/Point";
import VectorLayer from "ol/layer/Vector";
import type OlMap from "ol/Map";
import VectorSource from "ol/source/Vector";
import Icon from "ol/style/Icon";
import Style from "ol/style/Style";
import { useEffect, useRef } from "react";
import type { PoseMessage } from "@/lib/msgTypes";
import type { WSContextValue } from "@/lib/wsTypes";

export function useCarLayer(
  map: OlMap | null,
  // accept the same generic subscribe signature used in WSContextValue so
  // callers can provide callbacks narrow as PoseMessage.
  subscribeTopic: WSContextValue["subscribeTopic"],
) {
  const sourceRef = useRef<VectorSource<Feature<Geometry>> | null>(null);

  useEffect(() => {
    if (!map) return;

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

    function quatToYaw(qx: number, qy: number, qz: number, qw: number) {
      const siny_cosp = 2 * (qw * qz + qx * qy);
      const cosy_cosp = 1 - 2 * (qy ^ (2 + qz) ^ 2);

      return Math.atan2(siny_cosp, cosy_cosp);
    }

    const carSource = new VectorSource<Feature<Geometry>>({ features: [] });
    sourceRef.current = carSource;
    const carLayer = new VectorLayer({ source: carSource, zIndex: 10 });
    map.addLayer(carLayer);

    let unsub: (() => void) | undefined;
    try {
      unsub = subscribeTopic?.("amcl_pose", (msg: PoseMessage) => {
        try {
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

          let feature = carSource.getFeatureById(robotId) as Feature | null;
          if (!feature) {
            feature = new Feature(new Point([x, y]));
            feature.setId(robotId);
            feature.setStyle(createCarStyle(rotation));
            carSource.addFeature(feature);
          } else {
            const geom = feature.getGeometry() as Point;
            geom.setCoordinates([x, y]);
            feature.setStyle(createCarStyle(rotation));
          }
        } catch (e) {
          console.error("[useCarLayer] error handling amcl_pose", e);
        }
      });
    } catch (e) {
      console.error("[useCarLayer] subscribe error", e);
    }

    return () => {
      try {
        unsub?.();
      } catch (e) {
        console.error("[useCarLayer] unsubscribe error", e);
      }
      try {
        map.removeLayer(carLayer);
      } catch (e) {
        console.error("[useCarLayer] removeLayer error", e);
      }
      sourceRef.current = null;
    };
  }, [map, subscribeTopic]);

  return {
    source: sourceRef,
  } as const;
}
