// geometryWorker.js
//
// Generates a THREE.Geometry object from a given Volume in a Worker

import { default as marchingCubes } from './marchingCubes';
import { default as buildGeometry } from './buildGeometry';

addEventListener('message', (e) => {
	let { volume, width, height, depth, step, isolevel } = e.data;

	// Generate triangle vertices
	let t0 = performance.now();
	let triangles = marchingCubes(width, height, depth, step, volume, isolevel);
	let t1 = performance.now();
	console.log(t1-t0);

	// Build geometry
	let geometry;
	if (triangles.length > 0) {
		let t0 = performance.now();
		geometry = buildGeometry(triangles);
		let t1 = performance.now();
		console.log(t1-t0);
		console.log(geometry);
	}

	postMessage(geometry);
});
