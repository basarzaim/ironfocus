/**
 * Iron outer shell — cumulative crack levels (Blender → GLB).
 *
 * Architecture (intentional, no smooth blend):
 * - ShellLevel_00 … in `public/models/cracked_shell.glb`
 * - Core mesh `core` in `public/models/iron_core.glb`
 * - Each level adds real Boolean-cut cracks (different topology per level)
 * - Runtime: exactly ONE shell visible; hard swap on level change
 * - Shell PBR only — no emissive on shell (glow lives on core meshes)
 */

/** Must match highest ShellLevel_XX index present in cracked_shell.glb (+1). */
export const SHELL_LEVEL_COUNT = 22;

export const SHELL_LEVEL_PREFIX = "ShellLevel_";

/** Cumulative visible crack count per level (from Blender spec). */
export const SHELL_CRACK_COUNTS: readonly number[] = [
  0, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 26, 29, 31, 33, 35, 37, 39, 41, 43,
] as const;

export function shellLevelName(index: number): string {
  const clamped = Math.max(0, Math.min(SHELL_LEVEL_COUNT - 1, index));
  return `${SHELL_LEVEL_PREFIX}${String(clamped).padStart(2, "0")}`;
}

/** Map session depth (0…1, ~180 min focus) → shell level index. Hard step, no lerp. */
export function resolveShellLevel(depthParam: number): number {
  if (depthParam <= 0) return 0;
  if (depthParam >= 1) return SHELL_LEVEL_COUNT - 1;
  return Math.min(SHELL_LEVEL_COUNT - 1, Math.floor(depthParam * SHELL_LEVEL_COUNT));
}
