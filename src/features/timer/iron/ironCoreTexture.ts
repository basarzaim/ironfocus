import {
  ClampToEdgeWrapping,
  LinearFilter,
  NoColorSpace,
  type Texture,
} from "three";

export const VORONOI_BAKE_URL = "/textures/VoronoiPattern_Bake2.png";

/** Linear distance-map bake — not sRGB albedo. */
export function configureVoronoiDataTexture(texture: Texture): void {
  texture.colorSpace = NoColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.needsUpdate = true;
}
