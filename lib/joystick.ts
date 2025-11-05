// Helper to read Gamepad and produce a cmd_vel-like object
// Mirrors logic from original python teleop: use axes[3] for forward/back and axes[0] for rotation, and require button 6 pressed

export type GamepadCmd = {
  active: boolean;
  linear: { x: number; y: number; z: number };
  angular: { x: number; y: number; z: number };
};

export function readGamepadCommand(
  gp: Gamepad,
  opts?: { x_speed?: number; w_speed?: number },
): GamepadCmd {
  const x_speed = opts?.x_speed ?? 0.3;
  const w_speed = opts?.w_speed ?? 1.0;

  // safe access to axes/buttons
  const axes = gp.axes ?? [];
  const buttons = gp.buttons ?? [];

  // button 6 pressed convention from original python code
  const btn6 = buttons[6];
  const pressed = !!(btn6 && (btn6 as GamepadButton).pressed);

  if (pressed) {
    const forward = axes[3] ?? 0; // python used axes[3]
    const rot = axes[0] ?? 0; // python used axes[0]
    const linear = { x: x_speed * forward, y: 0, z: 0 };
    const angular = { x: 0, y: 0, z: w_speed * rot };
    return { active: true, linear, angular };
  }

  return {
    active: false,
    linear: { x: 0, y: 0, z: 0 },
    angular: { x: 0, y: 0, z: 0 },
  };
}

export default readGamepadCommand;
