// geometryWorker.js
//
// A Worker that coordinates the Marching Cubes algorithm.

// TODO: Rename to marchingCubesWorker
import marchingCubes, { flattenTriangles } from './marchingCubes';

addEventListener('message', (e) => {
	let { volume, width, height, depth, step, isolevel } = e.data;

	// Generate triangle vertices
	let triangles = marchingCubes(width, height, depth, step, volume, isolevel);

	// Flatten triangle array to TypedArray of coordinates for return to Caller
	// triangles = Array of Arrays with 3 {x,y,z} objects
	let flatVertices = flattenTriangles(triangles);

	postMessage(flatVertices);
});
