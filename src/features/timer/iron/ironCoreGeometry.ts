import { Mesh } from "three";

/** Keep GLB core UVs (voronoi bake is authored for this mesh). */
export function refineCoreMeshGeometry(mesh: Mesh): void {
  mesh.geometry.computeVertexNormals();
}
