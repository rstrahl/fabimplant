// buildGeometry.js
//
// Constructs THREE.Geometry objects from a given TypedArray of coordinate
// values.

import THREE from 'three';

/** Generates a THREE.Geometry object from a TypedArray.
 * The TypedArray is expected to be a sequence of coordinate values in 3-dimensions;
 * [x, y, z, x, y, z, x, ...]. Three values in sequence represent a vertex, and
 * three sets of three values represent a triangle face in the geometry.
 *
 * @param  {TypedArray} vCoords A TypedArray of coordinate values
 * @return {Object}             A THREE.Geometry object.
 */
export default function(vCoords) {
	console.time('buildGeometry');

	let vertices = [],
		faces = [],
		faceVertexUvs = [];

	const UVS = [
		new THREE.Vector2(0,0),
		new THREE.Vector2(0,1),
		new THREE.Vector2(1,1)
	];

	vertices.length = vCoords.length / 3;
	faces.length = vertices.length / 3;
	faceVertexUvs.length = faces.length;

	let v = 0,
		i = 0,
		j = 0;
	while (v < vCoords.length) {
		vertices[i] = new THREE.Vector3(vCoords[v], vCoords[v+1], vCoords[v+2]);
		if (i > 0 && (i+1) % 3 === 0) {
			faces[j] = new THREE.Face3(i-2, i-1, i);
			faceVertexUvs[j] = UVS.slice();
			j += 1;
		}
		i += 1;
		v += 3;
	}

	let geometry = new THREE.Geometry();
	geometry.vertices = vertices;
	geometry.faces = faces;
	geometry.faceVertexUvs[0] = faceVertexUvs;
	console.timeEnd('buildGeometry');

	console.time('mergeVertices');
	console.log("Vertices merged: " + geometry.mergeVertices());
	geometry.computeFaceNormals();
	geometry.computeVertexNormals();
	console.timeEnd('mergeVertices');
	return geometry;
}
