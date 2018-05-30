// import { getThresholdPixelArray } from '../lib/dicom/processor';
import { getAxisRange, resamplePixelArrays, padPixelArrays, flattenPixelArrays } from './utils';
import { applyModalityLut } from '../lib/dicom/processor';
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

	// Converts from TypedArray to Array to abstract out the typing and simplify life
	let pixelArrays = [];
	pixelArrays.length = dicomFile.pixelArrays.length;
	for (let i = 0; i < dicomFile.pixelArrays.length; i += 1) {
		pixelArrays[i] = applyModalityLut(dicomFile.pixelArrays[i], dicomFile.getImageSlope(), dicomFile.getImageIntercept());
		// pixelArrays[i] = Array.from(dicomFile.pixelArrays[i]);
	}

	// Optionally downsample the volume data by a given factor
	let resampledArrays = (factor > 1)
		? resamplePixelArrays(pixelArrays, width, height, factor)
		: { pixelArrays, width, height };

	// Pad the pixel arrays to ensure a closed solid
	let paddedResampledArrays = padPixelArrays(resampledArrays.pixelArrays, resampledArrays.width, resampledArrays.height, dicomFile.getImageIntercept());

	// Flatten all the pixels into a contiguous array of volume data
	let flatArray = flattenPixelArrays(paddedResampledArrays.pixelArrays, paddedResampledArrays.width, paddedResampledArrays.height);
	return new Volume(flatArray, paddedResampledArrays.width, paddedResampledArrays.height, pixelArrays.length);
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
