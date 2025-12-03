"use client";

import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { readGamepadCommand } from "@/lib/joystick";
import { useWebSocket } from "@/lib/wsClient";

type TeleopContextValue = {
  controllingId: string | null;
  startControl: (robotId: string) => void;
  stopControl: () => void;
  isControlling: boolean;
};

const TeleopContext = createContext<TeleopContextValue | null>(null);

export const TeleopProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { sendMessage } = useWebSocket();
  const teleopAdvertisedRef = useRef(false);
  const [controllingId, setControllingId] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  // keep last published command to avoid flooding identical small updates
  const lastCmdRef = useRef<{
    linear: { x: number; y: number; z: number };
    angular: { x: number; y: number; z: number };
  } | null>(null);
  const TOLERANCE = 2e-3;

  const publishCmd = useCallback(
    (
      robotId: string,
      linear: { x: number; y: number; z: number },
      angular: { x: number; y: number; z: number },
      // when force is true, bypass the tolerance-diff check and send even if
      // values are identical. Still skip repeated all-zero publishes.
      force = false,
    ) => {
      const prev = lastCmdRef.current;

      const isAllZero =
        Math.abs(linear.x) <= TOLERANCE &&
        Math.abs(linear.y) <= TOLERANCE &&
        Math.abs(linear.z) <= TOLERANCE &&
        Math.abs(angular.x) <= TOLERANCE &&
        Math.abs(angular.y) <= TOLERANCE &&
        Math.abs(angular.z) <= TOLERANCE;

      if (!force) {
        // Only send if this command is meaningfully different from previous one
        let shouldSend = false;
        if (!prev) {
          shouldSend = true;
        } else {
          const checkObj = (
            a: { x: number; y: number; z: number },
            b: { x: number; y: number; z: number },
          ) => {
            return (
              Math.abs(a.x - b.x) > TOLERANCE ||
              Math.abs(a.y - b.y) > TOLERANCE ||
              Math.abs(a.z - b.z) > TOLERANCE
            );
          };
          if (
            checkObj(prev.linear, linear) ||
            checkObj(prev.angular, angular)
          ) {
            shouldSend = true;
          }
        }

        if (!shouldSend) return;
      } else {
        // force === true: send even if identical, but avoid resending repeated
        // all-zero messages at the forced rate.
        if (isAllZero) {
          if (prev) {
            const prevAllZero =
              Math.abs(prev.linear.x) <= TOLERANCE &&
              Math.abs(prev.linear.y) <= TOLERANCE &&
              Math.abs(prev.linear.z) <= TOLERANCE &&
              Math.abs(prev.angular.x) <= TOLERANCE &&
              Math.abs(prev.angular.y) <= TOLERANCE &&
              Math.abs(prev.angular.z) <= TOLERANCE;
            if (prevAllZero) return; // skip repeated zero publishes
          }
          // else fall through and send the zero (transition to zero or first send)
        }
      }

      // Use sendMessage to bypass strict typing for custom cmd_vel payload
      const msg = {
        op: "publish",
        topic: "cmd_vel",
        msg: {
          robot_id: robotId,
          linear,
          angular,
        },
      } as const;

      try {
        sendMessage(msg);
        lastCmdRef.current = { linear, angular };
      } catch (e) {
        console.error("[Teleop] publish error", e);
      }
    },
    [sendMessage],
  );

  const startControl = useCallback(
    (robotId: string) => {
      if (!robotId) return;
      if (controllingId === robotId) return;
      setControllingId(robotId);
      activeRef.current = true;

      // advertise topic before publishing any cmd_vel
      try {
        if (!teleopAdvertisedRef.current) {
          sendMessage({
            op: "advertise",
            topic: "cmd_vel",
            type: "geometry_msgs/Twist",
          });
          teleopAdvertisedRef.current = true;
        }
      } catch (e) {
        console.error("[Teleop] advertise error", e);
      }

      // reset last-published command to force initial sends
      lastCmdRef.current = null;
      // send stop once before starting to avoid ghost commands
      try {
        // send a definitive zero command immediately (bypass tolerance)
        sendMessage({
          op: "publish",
          topic: "cmd_vel",
          msg: {
            robot_id: robotId,
            linear: { x: 0, y: 0, z: 0 },
            angular: { x: 0, y: 0, z: 0 },
          },
        });
      } catch (e) {
        console.error("[Teleop] initial stop publish error", e);
        // fallback to publishCmd if sendMessage throws for any reason
        try {
          publishCmd(robotId, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
        } catch (e2) {
          console.error("[Teleop] initial stop publish error", e2);
        }
      }

      // start interval at ~5Hz
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = window.setInterval(
        () => {
          try {
            const gamepads = navigator.getGamepads?.() ?? [];
            const gp = Array.from(gamepads).find((g) => !!g) as
              | Gamepad
              | undefined;
            if (!gp) {
              // no gamepad plugged
              if (activeRef.current) {
                // publish zero
                publishCmd(robotId, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
              }
              return;
            }

            const { active, linear, angular } = readGamepadCommand(gp, {
              x_speed: 0.3,
              w_speed: 1.0,
              deadzone: 0.02,
            });

            if (active) {
              // force publish at the interval rate even if values didn't change.
              // publishCmd will still avoid repeated all-zero publishes.
              publishCmd(robotId, linear, angular, true);
            } else {
              // publish zero when not active to ensure stop (use normal path so
              // repeated zeros are filtered by tolerance logic)
              publishCmd(robotId, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
            }
          } catch (e) {
            console.error("[Teleop] interval error", e);
          }
        },
        (1 / 5) * 1e3,
      );
    },
    [controllingId, publishCmd, sendMessage],
  );

  const stopControl = useCallback(() => {
    activeRef.current = false;
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    const id = controllingId;
    if (id) {
      // publish zero once
      // force publish zero regardless of tolerance by clearing lastCmd first
      lastCmdRef.current = null;
      try {
        sendMessage({
          op: "publish",
          topic: "cmd_vel",
          msg: {
            robot_id: id,
            linear: { x: 0, y: 0, z: 0 },
            angular: { x: 0, y: 0, z: 0 },
          },
        });
      } catch (e) {
        console.error("[Teleop] stop publish error", e);
        // fallback
        try {
          publishCmd(id, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
        } catch (e2) {
          console.error("[Teleop] stop publish error", e2);
        }
      }

      // unadvertise topic after stopping
      try {
        if (teleopAdvertisedRef.current) {
          sendMessage({ op: "unadvertise", topic: "cmd_vel" });
          teleopAdvertisedRef.current = false;
        }
      } catch (e) {
        console.error("[Teleop] unadvertise error", e);
      }
    }
    setControllingId(null);
  }, [controllingId, publishCmd, sendMessage]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, []);

  const value: TeleopContextValue = {
    controllingId,
    startControl,
    stopControl,
    isControlling: controllingId !== null,
  };

  return (
    <TeleopContext.Provider value={value}>{children}</TeleopContext.Provider>
  );
};

export function useTeleop() {
  const ctx = useContext(TeleopContext);
  if (!ctx) throw new Error("useTeleop must be used inside TeleopProvider");
  return ctx;
}

export default TeleopContext;
