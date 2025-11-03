"use client";

import type Feature from "ol/Feature";
import type { Geometry } from "ol/geom";
import type Point from "ol/geom/Point";
import type OlMap from "ol/Map";
import type VectorSource from "ol/source/Vector";
import { type RefObject, useEffect, useRef, useState } from "react";
import { useTeleop } from "@/components/TeleopContext";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

export default function CarContextMenu({
  map,
  carSource,
}: {
  map: OlMap | null;
  carSource: RefObject<VectorSource<Feature<Geometry>> | null>;
}) {
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const [menu, setMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
    robotId?: string | null;
  }>({
    open: false,
    x: 0,
    y: 0,
    robotId: null,
  });

  const teleop = useTeleop();

  useEffect(() => {
    if (!map) return;
    const viewport = map.getViewport();

    const onContext = (e: MouseEvent) => {
      try {
        e.preventDefault();
        // Use coordinate-based lookup instead of forEachFeatureAtPixel to avoid
        // canvas readback (getImageData) which triggers the "willReadFrequently" warning.
        const pixel = map.getEventPixel(e as unknown as UIEvent);
        const coord = map.getCoordinateFromPixel(pixel);

        let found: Feature | null = null;
        const src = carSource?.current;
        if (src) {
          const features = src.getFeatures();
          // simple nearest-neighbor search within a small tolerance (meters)
          const TOLERANCE = 0.12; // adjust to your marker size
          for (const f of features) {
            try {
              const g = f.getGeometry() as Point | null;
              if (!g) continue;
              const [fx, fy] = g.getCoordinates();
              const dx = fx - coord[0];
              const dy = fy - coord[1];
              const d = Math.hypot(dx, dy);
              if (d <= TOLERANCE) {
                found = f as Feature;
                break;
              }
            } catch (err) {
              console.error("[CarContextMenu] geometry error", err);
              // ignore geometry errors per-feature
            }
          }
        }

        if (found) {
          const id = (found as Feature).getId?.()?.toString() ?? null;
          const rect = (map.getTarget() as HTMLElement).getBoundingClientRect();
          setMenu({
            open: true,
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            robotId: id,
          });

          // open radial menu by dispatching contextmenu on trigger
          setTimeout(() => {
            try {
              const trg = triggerRef.current;
              if (trg) {
                trg.dispatchEvent(
                  new MouseEvent("contextmenu", {
                    bubbles: true,
                    clientX: e.clientX,
                    clientY: e.clientY,
                  }),
                );
                const onPointerDownClose = () => {
                  setMenu((s) => ({ ...s, open: false }));
                  document.removeEventListener(
                    "pointerdown",
                    onPointerDownClose,
                  );
                };
                document.addEventListener("pointerdown", onPointerDownClose);
              }
            } catch (err) {
              console.error("[CarContextMenu] dispatch contextmenu error", err);
            }
          }, 0);
        } else {
          setMenu((s) => (s.open ? { ...s, open: false } : s));
        }
      } catch (err) {
        console.error("[CarContextMenu] contextmenu handler error", err);
      }
    };

    viewport.addEventListener("contextmenu", onContext);

    return () => {
      try {
        viewport.removeEventListener("contextmenu", onContext as EventListener);
      } catch (e) {
        console.error("[CarContextMenu] removeEventListener error", e);
      }
    };
  }, [map, carSource?.current]);

  function handleCenter() {
    const id = menu.robotId;
    const src = carSource?.current;
    if (id && src) {
      const f = src.getFeatureById(id as string) as Feature | null;
      if (f) {
        const geom = f.getGeometry() as Point;
        const coord = geom.getCoordinates();
        map?.getView().animate({ center: coord, duration: 300 });
      }
    }
    setMenu((s) => ({ ...s, open: false }));
  }

  function handleTakeControl() {
    const id = menu.robotId;
    try {
      if (id) {
        // start teleop for this robot
        teleop.startControl(id);
      }
    } catch (e) {
      console.error("[CarContextMenu] take control error", e);
    }
    setMenu((s) => ({ ...s, open: false }));
  }

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            ref={triggerRef}
            style={{
              position: "absolute",
              left: menu.x,
              top: menu.y,
              width: 1,
              height: 1,
            }}
          />
        </ContextMenuTrigger>

        <ContextMenuContent>
          <ContextMenuLabel>Car {menu.robotId ?? ""}</ContextMenuLabel>
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={handleCenter}>Center on</ContextMenuItem>
          <ContextMenuItem onSelect={handleTakeControl}>
            Take control
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
}
