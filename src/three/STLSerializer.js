import THREE from 'three';

/** Serializes a Three.js Mesh object into STL.
 *
 * @param  {Object} mesh            a Mesh object
 * @param  {string} name='mesh'     an optional name for the solid
 * @return {string}                 a string containing pretty-printed STL
 */
export default function (mesh, name='mesh') {
	if (mesh instanceof THREE.Mesh) {
		let { geometry, matrixWorld } = mesh,
			vector = new THREE.Vector3(),
			normalMatrixWorld = new THREE.Matrix3();

		if (geometry instanceof THREE.Geometry) {
			let { vertices, faces } = geometry,
				output = 'solid ' + name + '\n';

			normalMatrixWorld.getNormalMatrix( matrixWorld );

			for (let i = 0, l = faces.length; i < l; i +=1) {
				let face = faces[i];
				vector.copy(face.normal).applyMatrix3(normalMatrixWorld).normalize();

				output += '\tfacet normal ' + vector.x + ' ' + vector.y + ' ' + vector.z + '\n';
				output += '\t\touter loop\n';

				let indices = [face.a, face.b, face.c];
				for (let j = 0; j < 3; j += 1) {
					vector.copy(vertices[indices[j]]).applyMatrix4(matrixWorld);
					output += '\t\t\tvertex ' + vector.x + ' ' + vector.y + ' ' + vector.z + '\n';
				}

				output += '\t\tendloop\n';
				output += '\tendfacet\n';
			}
			output += 'endsolid ' + name + '\n';
			return output;
		}
	}
}
