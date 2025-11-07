import type { FixedLengthArray } from "@/lib/types";

export interface BaseMessagePayload {
  robot_id: string;
}

export interface PoseMessage extends BaseMessagePayload {
  header: {
    frame_id: string;
    seq: number;
    stamp_nsecs: number;
    stamp_secs: number;
  };
  pose: {
    covariance: FixedLengthArray<number, 36>;
    pose: {
      position: {
        x: number;
        y: number;
        z: number;
      };
      orientation: {
        w: number;
        x: number;
        y: number;
        z: number;
      };
    };
  };
}

export interface DestinationMessage extends BaseMessagePayload {
  // id of the target point in the map dataset
  point_id: number;
  // coordinates in map meters
  x: number;
  y: number;
}

export type MessagePayload = PoseMessage | DestinationMessage;
