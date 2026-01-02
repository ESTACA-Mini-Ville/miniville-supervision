"use client";

import type OlMap from "ol/Map";
import Overlay from "ol/Overlay";
import { useEffect } from "react";
import { data as DEST_POINTS } from "@/lib/destinations";
import type { DestinationMessage } from "@/lib/msgTypes";
import { useWebSocket } from "@/lib/wsClient";

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

  useEffect(() => {
    let advertised = false;
    // Debounce advertisement to avoid double-send in React Strict Mode
    const timer = setTimeout(() => {
      try {
        sendMessage({
          op: "advertise",
          topic: "destination",
          type: "Destination",
        });
        advertised = true;
      } catch (e) {
        console.error("[DestinationSelector] advertise error", e);
      }
    }, 100); // Increased to 100ms just in case

    return () => {
      clearTimeout(timer);
      if (advertised) {
        // Only unadvertise if we actually advertised
        try {
          sendMessage({
            op: "unadvertise",
            topic: "destination",
          });
        } catch (e) {
          console.error("[DestinationSelector] unadvertise error", e);
        }
      }
    };
  }, [sendMessage]);

  useEffect(() => {
    if (!map) return;

    // Create overlays for each point
    const overlays: Overlay[] = [];

    DEST_POINTS.forEach((p) => {
      const el = document.createElement("div");
      el.className = "destination-point";
      el.style.width = "12px";
      el.style.height = "12px";
      el.style.backgroundColor = "rgba(0, 150, 255, 0.85)";
      el.style.border = "1.5px solid #fff";
      el.style.borderRadius = "50%";
      el.style.cursor = "pointer";
      el.style.transition = "transform 0.1s, background-color 0.1s";

      // Hover effects
      el.onmouseenter = () => {
        el.style.backgroundColor = "rgba(255, 165, 0, 0.95)";
        el.style.transform = "scale(1.3)";
        el.style.zIndex = "100";
      };
      el.onmouseleave = () => {
        el.style.backgroundColor = "rgba(0, 150, 255, 0.85)";
        el.style.transform = "scale(1)";
        el.style.zIndex = "auto";
      };

      // Click handler
      el.onclick = (e) => {
        e.stopPropagation(); // Prevent map click
        try {
          const msg: DestinationMessage = {
            robot_id: robotId,
            destination_id: p.id,
          };
          publish("destination", msg);
        } catch (err) {
          console.error("[DestinationSelector] publish error", err);
        }
        onDone();
      };

      const overlay = new Overlay({
        element: el,
        position: [p.x, p.y],
        positioning: "center-center",
        stopEvent: true, // Allow clicking the overlay without triggering map clicks
      });

      map.addOverlay(overlay);
      overlays.push(overlay);
    });

    return () => {
      // Cleanup overlays
      overlays.forEach((overlay) => {
        map.removeOverlay(overlay);
      });
    };
  }, [map, robotId, publish, onDone]);

  return null;
}
