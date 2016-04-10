// geometryWorker.js
//
// Generates a THREE.Geometry object from a given Volume in a Worker

import { default as marchingCubes } from './marchingCubes';
import { default as buildGeometry } from './buildGeometry';

addEventListener('message', (e) => {
	let { volume, width, height, depth, step, isolevel } = e.data;

	// Generate triangle vertices
	console.time('marchingCubes');
	let triangles = marchingCubes(width, height, depth, step, volume, isolevel);
	console.timeEnd('marchingCubes');

	// Build geometry
	let geometry;
	if (triangles.length > 0) {
		console.time('buildGeometry');
		geometry = buildGeometry(triangles);
		console.timeEnd('buildGeometry');
	}

	postMessage(geometry);
});
