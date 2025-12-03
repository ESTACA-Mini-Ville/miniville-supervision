"use client";

import { useState } from "react";

import CarContextMenu from "@/components/CarContextMenu";
import DestinationSelector from "@/components/DestinationSelector";
import MapContainer from "@/components/MapContainer";
import { useCarLayer } from "@/lib/useCarLayer";
import { useWebSocket } from "@/lib/wsClient";

export default function MinivilleMap() {
  const { subscribeTopic } = useWebSocket();
  const [map, setMap] = useState<import("ol/Map").default | null>(null);
  const [selectingRobotId, setSelectingRobotId] = useState<string | null>(null);
  const carLayer = useCarLayer(map, subscribeTopic);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <MapContainer
        onMapReady={(m) => {
          setMap(m);
        }}
        style={{ width: "100%", height: "100%" }}
      />

      {/* Car context menu overlays the map and listens to right-clicks */}
      <CarContextMenu
        map={map}
        carSource={carLayer.source}
        onSetDestination={(id) => setSelectingRobotId(id)}
      />
      {selectingRobotId && map ? (
        <DestinationSelector
          map={map}
          robotId={selectingRobotId}
          onDone={() => setSelectingRobotId(null)}
        />
      ) : null}
    </div>
  );
}
