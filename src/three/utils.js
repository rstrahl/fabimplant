import Volume from './volume';
import Slice from './slice';

/** Returns the minimum and maximum values along an axis.
 *
 * @param  {number} dim the number of vertices
 * @param  {number} step the distance between vertices
 * @return {Array} An array in the format of [min, max]
 */
export function getAxisRange(dim, step) {
	let max = ((dim-1)/2) * step;
	return [-1 * max, max];
}

/** Collapses an array of pixel-data arrays down to into one contiguous array.
 * The colour channels will be flattened during this process down to one.
 *
 * @param  {Array}  pixelArrays    an array of arrays
 * @param  {number} width          the width of an individual array in pixelArrays
 * @param  {number} height         the height of an individual array in pixelArrays
 * @param  {number} colourChannels the number of colour channels used in the pixelArrays
 * @return {Object}                a Volume object
 */
export function flattenPixelArrays(pixelArrays, width, height) {
	console.time('flattenPixelArrays');
	// Performance: using Array.concat() was 1100ms, this is now 10ms (!!)
	let flatArray = [];
	flatArray.length = pixelArrays.length * width * height;
	for (let i = 0; i < pixelArrays.length; i += 1) {
		for (let j = 0; j < pixelArrays[i].length; j += 1) {
			flatArray[(i * pixelArrays[i].length) + j] = pixelArrays[i][j];
		}
	}
	console.timeEnd('flattenPixelArrays');
	return new Volume(flatArray, width, height, pixelArrays.length);
}

/** Adds a single pixel to each side of the pixel array for a single image.
 *
 * @param  {Array}  pixelArrays An Array of pixel data arrays
 * @param  {number} width       The expected width of each pixel data array
 * @param  {number} height      The expected height of each pixel data array
 * @return {Array}              An Array of pixel data arrays
 */
export function padPixelArrays(pixelArrays, width, height) {
	console.time('padPixelArrays');
	let paddedArrays = [],
		paddedWidth = width + 2,
		paddedHeight = height + 2;
	paddedArrays.length = pixelArrays.length + 2;
	for (let i = 0, j = 0; i < paddedArrays.length; i += 1) {
		paddedArrays[i] = (i === 0 || i === paddedArrays.length - 1)
			? emptyPixelArray(paddedWidth, paddedHeight)
			: padPixelArray(pixelArrays[j++], width, height);
	}
	console.timeEnd('padPixelArrays');
	return { data: paddedArrays, width: paddedWidth, height: paddedHeight };
}

/** Adds a single pixel to each side of the pixel array for a single image.
 *
 * @param  {Array}  pixelArray A pixel data array
 * @param  {number} width      The expected width of the pixel data array
 * @param  {number} height     The expected height of the pixel data array
 * @return {Array}             A pixel data array
 */
export function padPixelArray(pixelArray, width, height) {
	let paddedWidth = width+2,
		paddedHeight = height+2,
		paddedPixelArray = emptyPixelArray(paddedWidth, paddedHeight);
	for (let i = 0, j = paddedWidth+1; i < pixelArray.length; j += 1) {
		paddedPixelArray[j] =  (j % paddedWidth === 0 || j % paddedWidth === paddedWidth-1)
			? 0
			: pixelArray[i++];
	}
	return paddedPixelArray;
}

/** Creates a zero-filled Array from the given width and height.
 *
 * @param  {number} width  The width of the pixel array
 * @param  {number} height The height of the pixel array
 * @return {Array}         A zero-filled Array
 */
export function emptyPixelArray(width, height) {
	let emptyArray = [];
	emptyArray.length = width * height;
	emptyArray.fill(0);
	return emptyArray;
}

/** Resamples an array of pixel arrays down by a given factor.
 *
 * @see resamplePixelArray
 *
 * @param  {Array}  pixelArrays an Array of Arrays
 * @param  {number} width       the width of the array
 * @param  {number} height      the height of the array
 * @param  {number} factor      the resampling factor
 * @return {Array}              an array of arrays
 */
export function resamplePixelArrays(pixelArrays, width, height, factor) {
	// Performance optimization: was 750ms using Array.splice, now 75ms
	console.time('resamplePixelArrays');
	let arrays = [],
		newWidth,
		newHeight;
	arrays.length = Math.floor(pixelArrays.length / factor);
	for (let i = 0, j = 0; pixelArrays.length - i >= factor; i += factor, j += 1) {
		let array = resamplePixelArray(pixelArrays[i], width, height, factor);
		arrays[j] = array.data;
		if (newWidth === undefined) newWidth = array.width;
		if (newHeight === undefined) newHeight = array.height;
	}
	console.timeEnd('resamplePixelArrays');
	return { data: arrays, width: newWidth, height: newHeight };
}

/** Resamples a given pixel array down by a given factor.
 * The array is presumed to be a contiguous array that represents a 2-dimensional
 * plane of pixel values, and will be normalized up to support the factor if necessary.
 *
 * @see normalizeUpPixelArray
 *
 * @param  {Array}  pixelArray a normalized array
 * @param  {number} width      (optional) the width of the array
 * @param  {number} height     (optional) the height of the array
 * @param  {number} factor     (optional) the downsampling factor (2, 4, etc.)
 * @return {Object}            a Slice object containing the downsampled pixel array and new dimensions
 */
export function resamplePixelArray(pixelArray, width, height, factor) {
	width = (width === undefined) ? Math.sqrt(pixelArray.length) : width;
	height = (height === undefined) ? width : height;
	factor = (factor === undefined) ? 2 : factor;

	// Normalize the array to support the factor
	let slice = normalizeUpPixelArray(pixelArray, width, height, factor);

	let dim = slice.width * slice.height,
		newWidth = Math.floor(slice.width/factor),
		newHeight = Math.floor(slice.height/factor),
		array = new Uint16Array(newWidth * newHeight),
		n = 0;
	for (let i = 0; i < dim; i += factor, n += 1) {
		if (i && i % slice.width === 0) {
			i += (slice.width * (factor - 1));
		}
		if (i < dim) {
			array[n] = slice.data[i];
		}
	}
	return new Slice(array, newWidth, newHeight);
}

/** Normalizes an array representing x/y values up to support resampling at a given factor
 *
 * @param  {Array}  pixelArray an array
 * @param  {number} width      the width of the array
 * @param  {number} height     the height of the array
 * @param  {number} factor     the resampling factor to normalize to
 * @return {Object}            a Slice object containing the array data, and its width and height
 */
export function normalizeUpPixelArray(pixelArray, width, height, factor) {
	let heightDiff = height % factor,
		newHeight = height + heightDiff,
		widthDiff = width % factor,
		newWidth = width + widthDiff,
		normalizedPixelArray = [];
	normalizedPixelArray.length = newWidth * newHeight;
	normalizedPixelArray.fill(0);
	for (let i = 0, j = 0; i < pixelArray.length; i += 1) {
		j = (Math.floor(i / width) * newWidth) + (i % width);
		normalizedPixelArray[j] = pixelArray[i];
	}
	return new Slice(normalizedPixelArray, newWidth, newHeight);
}
