/** Returns the minimum and maximum values along an axis.
 *
 * @param  {number} dim  The number of vertices
 * @param  {number} step The distance between vertices
 * @return {Array}       An array in the format of [min, max]
 */
export function getAxisRange(dim, step) {
	let max = ((dim-1)/2) * step;
	return [-1 * max, max];
}

/** Collapses an array of pixel-data arrays down to into one contiguous array.
 * The colour channels will be flattened during this process down to one.
 *
 * @param  {Array}  pixelArrays    An Array of Arrays containing pixel data
 * @param  {number} width          The width of an individual array in pixelArrays
 * @param  {number} height         The height of an individual array in pixelArrays
 * @param  {number} colourChannels The number of colour channels used in the pixelArrays
 * @return {Object}                A contiguous (flattened) Array
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
	return flatArray;
}

/** Adds a single pixel to each side of the pixel array for a single image.
 *
 * @param  {Array}  pixelArrays An Array of Arrays containing pixel data
 * @param  {number} width       The expected width of each pixel data array
 * @param  {number} height      The expected height of each pixel data array
 * @param  {number} value       The value to pad the pixel data array with
 * @return {Object}             An Object containing the padded pixelArrays and new width/height
 */
export function padPixelArrays(pixelArrays, width, height, value) {
	console.time('padPixelArrays');
	let paddedArrays = [],
		paddedWidth = width + 2,
		paddedHeight = height + 2;
	paddedArrays.length = pixelArrays.length + 2;
	for (let i = 0, j = 0; i < paddedArrays.length; i += 1) {
		paddedArrays[i] = (i === 0 || i === paddedArrays.length - 1)
			? emptyPixelArray(paddedWidth, paddedHeight, value)
			: padPixelArray(pixelArrays[j++], width, height, value);
	}
	console.timeEnd('padPixelArrays');
	return { pixelArrays: paddedArrays, width: paddedWidth, height: paddedHeight };
}

/** Adds a single pixel to each side of the pixel array for a single image.
 *
 * @param  {Array}  pixelArray An Array containing pixel data
 * @param  {number} width      The expected width of the pixel data array
 * @param  {number} height     The expected height of the pixel data array
 * @param  {number} value      The value to pad the pixel data array with
 * @return {Array}             An Array containing the padded pixel data
 */
export function padPixelArray(pixelArray, width, height, value) {
	let paddedWidth = width+2,
		paddedHeight = height+2,
		paddedPixelArray = emptyPixelArray(paddedWidth, paddedHeight, value);
	for (let i = 0, j = paddedWidth+1; i < pixelArray.length; j += 1) {
		paddedPixelArray[j] =  (j % paddedWidth === 0 || j % paddedWidth === paddedWidth-1)
			? 0
			: pixelArray[i++];
	}
	return paddedPixelArray;
}

/** Creates an Array from the given width and height filled with the given value.
 *
 * @param  {number} width  The width of the Array
 * @param  {number} height The height of the Array
 * @param  {number} value  The value to fill the Array with
 * @return {Array}         An Array of length (width*height) filled with (value)
 */
export function emptyPixelArray(width, height, value) {
	let emptyArray = [];
	emptyArray.length = width * height;
	emptyArray.fill(value);
	return emptyArray;
}

/** Resamples an array of pixel arrays down by a given factor.
 *
 * @see resamplePixelArray
 *
 * @param  {Array}  pixelArrays An Array of Arrays containing pixel data
 * @param  {number} width       The width of the Array
 * @param  {number} height      The height of the Array
 * @param  {number} factor      The resampling factor
 * @return {Object}             An Object containing the resampled pixel data arrays and new width/height
 */
export function resamplePixelArrays(pixelArrays, width, height, factor) {
	// Performance optimization: was 750ms using Array.splice, now 75ms
	console.time('resamplePixelArrays');
	let arrays = [],
		newWidth,
		newHeight;
	arrays.length = Math.floor(pixelArrays.length / factor);
	for (let i = 0, j = 0; pixelArrays.length - i >= factor; i += factor, j += 1) {
		let slice = resamplePixelArray(pixelArrays[i], width, height, factor);
		arrays[j] = slice.pixelArray;
		if (newWidth === undefined) newWidth = slice.width;
		if (newHeight === undefined) newHeight = slice.height;
	}
	console.timeEnd('resamplePixelArrays');
	return { pixelArrays: arrays, width: newWidth, height: newHeight };
}

/** Resamples a given pixel array down by a given factor.
 * The array is presumed to be a contiguous array that represents a 2-dimensional
 * plane of pixel values, and will be normalized up to support the factor if necessary.
 *
 * @see normalizeUpPixelArray
 *
 * @param  {Array}  pixelArray An Array containing pixel data
 * @param  {number} width      (optional) the width of the array
 * @param  {number} height     (optional) the height of the array
 * @param  {number} factor     (optional) the downsampling factor (2, 4, etc.)
 * @return {Object}            An Object containing the resampled pixel data array and new width/height
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
		array = [],
		n = 0;
	array.length = newWidth * newHeight;
	for (let i = 0; i < dim; i += factor, n += 1) {
		if (i && i % slice.width === 0) {
			i += (slice.width * (factor - 1));
		}
		if (i < dim) {
			array[n] = slice.pixelArray[i];
		}
	}
	return { pixelArray: array, width: newWidth, height: newHeight };
}

/** Normalizes an array representing x/y values up to support resampling at a given factor
 *
 * @param  {Array}  pixelArray An Array containing pixel data
 * @param  {number} width      The width of the array
 * @param  {number} height     The height of the array
 * @param  {number} factor     The resampling factor to normalize to
 * @return {Object}            An Object containing the normalized pixel data array and new width/height
 */
export function normalizeUpPixelArray(pixelArray, width, height, factor) {
	let nextHeight = findNextHighestValueForFactor(height, factor),
		heightDiff = nextHeight - height,
		newHeight = height + heightDiff,
		nextWidth = findNextHighestValueForFactor(width, factor),
		widthDiff = nextWidth - width,
		newWidth = width + widthDiff,
		normalizedPixelArray = [];
	normalizedPixelArray.length = newWidth * newHeight;
	normalizedPixelArray.fill(0);
	for (let i = 0, j = 0; i < pixelArray.length; i += 1) {
		j = (Math.floor(i / width) * newWidth) + (i % width);
		normalizedPixelArray[j] = pixelArray[i];
	}
	return { pixelArray: normalizedPixelArray, width: newWidth, height: newHeight };
}

/** Determines the next highest value that supports the given factor as a dividend.
 *
 * @param  {number} value  A numerator value
 * @param  {number} factor A dividend value
 * @return {number}        The next highest value that can be divided by the dividend parameter
 */
export function findNextHighestValueForFactor(value, factor) {
	const upperBound = value * factor;
	for (let i = value; i <= upperBound;i += 1) {
		if (i % factor === 0) {
			return i;
		}
	}
	return value;
}
