// import { getThresholdPixelArray } from '../lib/dicom/processor';
import { getAxisRange, resamplePixelArrays, padPixelArrays, flattenPixelArrays } from './utils';
import Volume from './volume';

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
	// TODO: PERFORMANCE OPTIMIZATION: use strictly TypedArrays
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

	let paddedResampledArrays = padPixelArrays(resampledArrays.data, resampledArrays.width, resampledArrays.height);

	// Generate a "Volume" from the downsampled data set
	let volume = flattenPixelArrays(paddedResampledArrays.data, paddedResampledArrays.width, paddedResampledArrays.height);

	// Downsampling also impacts image size - account for that by adjusting the step size
	// volume.step = factor;
	return volume;
}

// TODO: Rename to functionVolume?
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
