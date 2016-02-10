import { default as marchingCubes } from './marchingCubes';
import { getThresholdPixelArray } from '../dicom/processor';
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
export default function(volume, step, isolevel) {
	let volumeGeometry = marchingCubes(volume.width, volume.height, volume.depth, step, volume.data, isolevel);
	let volumeMesh = new THREE.Mesh(
		volumeGeometry,
		new THREE.MeshLambertMaterial({
			color : 0xF0F0F0,
			side : THREE.DoubleSide
		})
	);
	return volumeMesh;
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

	// let pixelArrays = getThresholdPixelArray(dicomFile, 1500, 1);
	// TODO: Necessary?
	let pixelArrays = [];
	dicomFile.pixelArrays.forEach( (value) => {
		pixelArrays.push(Array.from(value));
	});

	// Downsample the file to a manageable size
	let resampledArrays = resamplePixelArrays(pixelArrays, width, height, factor);
	// Generate a "Volume" from the downsampled data set
	let volume = flattenPixelArrays(resampledArrays.data, resampledArrays.width, resampledArrays.height);
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
	return new Volume(volume, width, height, depth);
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
