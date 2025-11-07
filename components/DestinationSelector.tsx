"use client";

import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import VectorLayer from "ol/layer/Vector";
import type OlMap from "ol/Map";
import VectorSource from "ol/source/Vector";
import CircleStyle from "ol/style/Circle";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import { useEffect } from "react";
import { data as DEST_POINTS } from "@/lib/destinations";
import type { DestinationMessage } from "@/lib/msgTypes";
import { useWebSocket } from "@/lib/wsClient";

// module-level state to ensure we advertise only once per page lifecycle
let _destinationAdvertised = false;
let _destinationSendMessage: ((msg: object) => void) | null = null;
let _destinationUnloadRegistered = false;

export default function DestinationSelector({
  map,
  robotId,
  onDone,
}: {
  map: OlMap | null;
  robotId: string;
  onDone: () => void;
}) {
  const { publish, sendMessage } = useWebSocket();

  // Module-level single-advertise across the page lifecycle. We advertise
  // on first selector mount and unadvertise only when the page unloads.

  useEffect(() => {
    if (!map) return;

    const baseFill = new Fill({ color: "rgba(0,150,255,0.85)" });
    const hoverFill = new Fill({ color: "rgba(255,165,0,0.95)" });
    const stroke = new Stroke({ color: "#fff", width: 1.5 });

    const baseStyle = new Style({
      image: new CircleStyle({ radius: 5, fill: baseFill, stroke }),
    });
    const hoverStyle = new Style({
      image: new CircleStyle({ radius: 6.5, fill: hoverFill, stroke }),
    });

    const src = new VectorSource();
    for (const p of DEST_POINTS) {
      const f = new Feature(new Point([p.x, p.y]));
      f.setId(`dest-${p.id}`);
      f.set("pointId", p.id);
      f.setStyle(baseStyle);
      src.addFeature(f);
    }

    const layer = new VectorLayer({ source: src, zIndex: 30 });
    map.addLayer(layer);

    // advertise destination topic on first use for the whole page lifecycle
    try {
      if (!_destinationAdvertised) {
        sendMessage({
          op: "advertise",
          topic: "destination",
          type: "miniville_msgs/Destination",
        });
        _destinationAdvertised = true;
        _destinationSendMessage = sendMessage;

        if (!_destinationUnloadRegistered) {
          // ensure we unadvertise once when the page unloads
          const handleUnload = () => {
            try {
              _destinationSendMessage?.({
                op: "unadvertise",
                topic: "destination",
              });
            } catch (_e) {
              // ignore
            }
          };
          window.addEventListener("unload", handleUnload);
          _destinationUnloadRegistered = true;
        }
      }
    } catch (e) {
      console.error("[DestinationSelector] advertise error", e);
    }

    let hovered: Feature | null = null;

    const viewport = map.getViewport();

    const onPointerMove = (evt: PointerEvent) => {
      try {
        const pixel = map.getEventPixel(evt as unknown as UIEvent);
        let hit: Feature | null = null;
        map.forEachFeatureAtPixel(pixel, (feat, lyr) => {
          if (lyr === layer) {
            hit = feat as Feature;
            return true;
          }
          return false;
        });

        if (hit !== hovered) {
          if (hovered) (hovered as Feature).setStyle(baseStyle);
          if (hit) (hit as Feature).setStyle(hoverStyle);
          hovered = hit as Feature | null;
        }
      } catch (_e) {
        // ignore pointer errors
      }
    };

    const onClick = (evt: MouseEvent) => {
      try {
        const pixel = map.getEventPixel(evt as unknown as UIEvent);
        let clicked: Feature | null = null;
        map.forEachFeatureAtPixel(pixel, (feat, lyr) => {
          if (lyr === layer) {
            clicked = feat as Feature;
            return true;
          }
          return false;
        });

        if (clicked) {
          const feat = clicked as Feature;
          const pid = feat.get("pointId") as number | undefined;
          const geom = feat.getGeometry() as Point;
          const [x, y] = geom.getCoordinates();

          if (pid != null) {
            // publish typed destination message
            try {
              const msg: DestinationMessage = {
                robot_id: robotId,
                point_id: pid,
                x,
                y,
              };
              publish("destination", msg);
            } catch (e) {
              console.error("[DestinationSelector] publish error", e);
            }
          }

          onDone();
        }
      } catch (e) {
        console.error("[DestinationSelector] click handler error", e);
      }
    };

    viewport.addEventListener("pointermove", onPointerMove);
    viewport.addEventListener("click", onClick);

    return () => {
      try {
        viewport.removeEventListener("pointermove", onPointerMove);
      } catch (_e) {
        // ignore
      }
      try {
        viewport.removeEventListener("click", onClick);
      } catch (_e) {
        // ignore
      }
      try {
        map.removeLayer(layer);
      } catch (_e) {
        // ignore
      }
    };
  }, [map, robotId, publish, onDone, sendMessage]);

  return null;
}
