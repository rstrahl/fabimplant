import THREE from 'three';

export default function(triangles) {
	let geometry = new THREE.Geometry();
	for (let i = 0, v = 0; i < triangles.length; i += 1, v += 3) {
		geometry.vertices.push(triangles[i][0]);
		geometry.vertices.push(triangles[i][1]);
		geometry.vertices.push(triangles[i][2]);
		geometry.faces.push(new THREE.Face3(v, v+1, v+2));
		geometry.faceVertexUvs[0].push([
			new THREE.Vector2(0,0),
			new THREE.Vector2(0,1),
			new THREE.Vector2(1,1)
		]);
	}
	console.warn("Vertices merged: " + geometry.mergeVertices());
	geometry.computeFaceNormals();
	return geometry;
}
