import { default as marchingCubes } from './marchingCubes';
import { default as buildGeometry } from './buildGeometry';
import SubdivisionModifier from './LoopSubdivision';
import { getThresholdPixelArray } from '../lib/dicom/processor';
import { getAxisRange, resamplePixelArrays, flattenPixelArrays } from './utils';
import Volume from './volume';
import THREE from 'three';

/** Generates a Mesh from a given Volume.
 *
 * @param  {Object} volume   a Volume object
 * @param  {number} step     the distance between units scaffold used during surface extraction
 * @param  {number} isolevel the isolevel (threshold) used during surface extraction
 * @return {Object}          a THREE.Mesh object
 */
export default function(volume, step, isolevel, subdivision) {
	console.profile("marchingCubes");
	let triangles = marchingCubes(volume.width, volume.height, volume.depth, step, volume.data, isolevel);
	console.profileEnd();
	if (triangles.length > 0) {
		console.profile("buildGeometry");
		// Build geometry
		let geometry = buildGeometry(triangles);
		console.profileEnd();

		// Perform surface subdivision (optional)
		// Also - can this be within the buildGeometry script???
		if (subdivision !== undefined && subdivision > 0) {
			let modifier = new SubdivisionModifier(subdivision);
			modifier.modify(geometry);
		}

		console.profile("Mesh");
		// Build mesh
		let volumeMesh = new THREE.Mesh(
			geometry,
			new THREE.MeshLambertMaterial({
				color : 0xF0F0F0,
				side : THREE.DoubleSide
			})
		);
		console.profileEnd();
		return volumeMesh;
	}

	console.warn("No triangles generated from volume");
	return undefined;
}

/** Creates a Volume object from a DicomFile.
 *
 * @param  {Object} dicomFile a DicomFile object
 * @param  {number} factor    the factor of reduction to apply to the image data
 * @return {Object}           a Volume object
 */
export function dicomVolume(dicomFile, factor) {
	let width = dicomFile.getImageWidth(),
		height = dicomFile.getImageHeight();

	// TODO: Try to do all of this entirely with TypedArrays for maximum performance
	// let pixelArrays = getThresholdPixelArray(dicomFile, 1500, 1);

	// Converts from TypedArray to Array
	// We only do this because resampling impl requires Array not TypedArray
	let pixelArrays = [];
	dicomFile.pixelArrays.forEach( (value) => {
		pixelArrays.push(Array.from(value));
	});

	// Downsample the file if requested
	// TODO: This is a huge performance loss section - we're modifying arrays
	// AND moving to/from typedarray/array
	let resampledArrays = (factor > 1)
		? resamplePixelArrays(pixelArrays, width, height, factor)
		: { data: pixelArrays, width, height };

	// Generate a "Volume" from the downsampled data set
	let volume = flattenPixelArrays(resampledArrays.data, resampledArrays.width, resampledArrays.height);
	volume.step = 1;
	return volume;
}

/** Creates a Volume from a function.
 *
 * @param  {number}   width  the width of the volume in units
 * @param  {number}   height the height of the volume in units
 * @param  {number}   depth  the depth of the volume in units
 * @param  {number}   step   the distance between units
 * @param  {function} f      a function that accepts x, y, z values iteratively
 * @return {Object}          a Volume object
 */
export function makeVolume(width, height, depth, step, f) {
	let volume = new Float32Array(width * height * depth),
		n = 0,
		minZ = getAxisRange(depth, step)[0],
		minY = getAxisRange(height, step)[0],
		minX = getAxisRange(width, step)[0];

	for (let k = 0, z = minZ; k < depth; ++k, z += step)
		for (let j = 0, y = minY; j < height; ++j, y += step)
			for (let i = 0, x = minX; i < width; ++i, x += step, ++n) {
				volume[n] = f(x,y,z);
			}
	return new Volume(volume, width, height, depth, step);
}

/** Creates a Sphere volume.
 *
 * @param  {number} width  the width of the volume in units
 * @param  {number} height the height of the volume in units
 * @param  {number} depth  the depth of the volume in units
 * @param  {number} step   the distance between units
 * @return {Object}        a Volume object
 */
export function sphereVolume(width, height, depth, step) {
	return makeVolume(width, height, depth, step, (x,y,z) => {
		return Math.sqrt(x*x + y*y + z*z);
	});
}
