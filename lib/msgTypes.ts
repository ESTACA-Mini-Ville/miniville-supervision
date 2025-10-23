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
      orientation: {
        x: number;
        y: number;
        z: number;
      };
      quaternion: {
        w: number;
        x: number;
        y: number;
        z: number;
      };
    };
  };
}

export type MessagePayload = PoseMessage;
