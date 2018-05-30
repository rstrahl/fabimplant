import jpeg from 'jpeg-lossless-decoder-js';

/** Attempts to process a DataSet and return the pixel data for an image.
 *
 * @param  {DataSet} dataSet A dicom-js DataSet object
 * @return {Promise}         A Promise that will return a TypedArray containing
 * pixel values extract from the image
 */
export function processDataSet(dataSet) {
	return new Promise((resolve, reject) => {
		let imageMetadata = getImageMetadata(dataSet);
		if (imageMetadata === undefined) {
			reject(new Error('Unable to extract image metadata from DataSet'));
		}

		let pixelData = decodePixelData(dataSet.byteArray, imageMetadata);
		if (pixelData === undefined) {
			reject(new Error('Unable to process pixel data from DataSet'));
		}

		resolve(pixelData);
	});
}

/** Processes the provided DataSet and attempts to decode its image data.
 * If successful will return a TypedArray containing the image's pixel values.
 *
 * @param  {ByteArray}  byteArray     A ByteArray or TypedArray of pixel values
 * @param  {Object}     imageMetadata An Object containing the image data
 * @return {TypedArray}               A TypedArray of pixel data
 */
export function decodePixelData(byteArray, imageMetadata) {
	let decoder = new jpeg.lossless.Decoder();
	// TODO: Note this only handles one fragment
	// Can we pass in the bytearray buffer from the imageMetadata.pixelData
	let decompressedData = decoder.decompress(byteArray.buffer,
		imageMetadata.pixelData.fragments[0].position, imageMetadata.pixelData.fragments[0].length);
	let byteOutput = imageMetadata.bitsAllocated <= 8 ? 1 : 2;
	let pixelData;
	if (imageMetadata.pixelRepresentation === 0) {
		if (byteOutput === 2) {
			pixelData = new Uint16Array(decompressedData);
		} else {
			// untested!
			pixelData = new Uint8Array(decompressedData);
		}
	} else {
		pixelData = new Int16Array(decompressedData);
	}
	return pixelData;
}

/** Converts a TypedArray of pixel data into an ImageData object.
 *
 * @param  {Array}     pixelData    A TypedArray containing pixel data
 * @param  {number}    width        The width of the image
 * @param  {number}    height       The height of the image
 * @param  {number}    slope        The Rescale Slope to apply to the pixel data values
 * @param  {number}    intercept    The Rescale Intercept to apply to the pixel data values
 * @param  {number}    windowCenter The Window Center to apply to the pixel data values
 * @param  {number}    windowWidth  The Window Width to apply to the pixel data values
 * @return {ImageData}              An ImageData object in RGBA interlaced format.
 */
export function prepareImageData(pixelData, width, height, slope, intercept, windowCenter, windowWidth) {
	let image = new ImageData(width, height);
	let data = image.data;
	let i = 0,
		j = 0;
	while (i < pixelData.length) {
		let modVal = rescalePixelValueByModality(pixelData[i], slope, intercept);
		let val = rescalePixelValueByVoi(modVal, windowCenter, windowWidth);
		j = i * 4;
		data[j] = val; // r
		data[j + 1] = val; // g
		data[j + 2] = val; // b
		data[j + 3] = 255; // a
		i++;
	}
	return image;
}

/** Generates an array of all image pixel data contained in the specified DicomFile.
 * The pixel data will have the resulting Window Center and Window Width applied.
 *
 * @param  {Object} dicomFile    A DicomFile object
 * @param  {number} windowCenter The desired Window Center
 * @param  {number} windowWidth  The desired Window Width
 * @return {Array}               An Array of Arrays containing pixel values
 */
export function getThresholdPixelArray(dicomFile, windowCenter, windowWidth) {
	let height = dicomFile.getImageHeight();
	let width = dicomFile.getImageWidth();
	let pixelArrays = dicomFile.pixelArrays;
	let thresholdPixelArrays = [];
	for (let i = 0; i < pixelArrays.length; i++) {
		let pixelArray = pixelArrays[i];
		let thresholdArray = [];
		// let imageData = prepareImageData(pixelArray, width, height, windowCenter, windowWidth);
		pixelArray.forEach((value) => {
			thresholdArray.push(rescalePixelValueByVoi(value, windowCenter, windowWidth));
		});
		thresholdPixelArrays.push(thresholdArray);
	}
	return thresholdPixelArrays;
}

/** Applies the Modality LUT to a set of pixel data.
 * This LUT is expected to be applied first before any other LUT.
 *
 * @param  {Array}  pixelData An array of pixel values
 * @param  {number} slope     A Rescale Slope value
 * @param  {number} intercept A Rescale Intercept value
 * @return {Array}            An array of pixel values rescaled by the Modality LUT
 */
export function applyModalityLut(pixelData, slope, intercept) {
	let rescaledPixelData = [];
	rescaledPixelData.length = pixelData.length;
	for (let i = 0; i < pixelData.length; i++) {
		rescaledPixelData[i] = rescalePixelValueByModality(pixelData[i], slope, intercept);
	}
	return rescaledPixelData;
}

/** Applies the Value-of-Interest LUT to a set of pixel data.
 * This LUT is expected to be applied after the Modality LUT is applied.
 *
 * @param  {Array}  pixelData    An array of pixel values
 * @param  {number} windowCenter The Window Center value
 * @param  {number} windowWidth  The Window Width value
 * @return {Array}               An array of pixel values rescaled by the VOI LUT
 */
export function applyVoiLut(pixelData, windowCenter, windowWidth) {
	let rescaledPixelData = [];
	rescaledPixelData.length = pixelData.length;
	for (let i = 0; i < pixelData.length; i++) {
		rescaledPixelData[i] = rescalePixelValueByVoi(pixelData[i], windowCenter, windowWidth);
	}
	return rescaledPixelData;
}

/** Rescales a pixel value by a Value-of-Interest (VOI) LUT.
 *
 * @param  {number} pixelValue   A pixel value
 * @param  {number} windowCenter A Window Center value
 * @param  {number} windowWidth  A Window Width value
 * @return {number}              The rescaled pixel value
 */
export function rescalePixelValueByVoi(pixelValue, windowCenter, windowWidth) {
	// By spec, windowWidth can never be less than 1 - we gracefully fail by returning an unaltered pixelValue
	if (windowWidth < 1) {
		console.error('windowWidth cannot be < 1');
		return pixelValue;
	}

	const MAX_VALUE = 255;
	const MIN_VALUE = 0;

	let rescaledPixelValue = 0;
	if (pixelValue <= (windowCenter - 0.5 - ((windowWidth - 1) / 2))) {
		rescaledPixelValue = MIN_VALUE;
	} else if (pixelValue > ((windowCenter - 0.5) + (windowWidth - 1) / 2)) {
		rescaledPixelValue = MAX_VALUE;
	} else {
		rescaledPixelValue = ((pixelValue - (windowCenter - 0.5)) / (windowWidth - 1) + 0.5) * (MAX_VALUE - MIN_VALUE) +
			MIN_VALUE;
	}
	return rescaledPixelValue;
}

/** Rescales a pixel value by the Modality LUT.
 *
 * @param  {number} value     A pixel value
 * @param  {number} slope     A Rescale Slope value
 * @param  {number} intercept A Rescale Intercept value
 * @return {number}           The rescaled pixel value
 */
export function rescalePixelValueByModality(value, slope, intercept) {
	return value * slope + intercept;
}

// TODO: This is lazy and bad engineering - should be refactored as convenience getter extension over DataSet
/** Convenience method for extracting the relevant image parameters from a DataSet object.
 *
 * @param  {DataSet} dataSet A dicom-parser DataSet object
 * @return {Object}          An Object
 */
function getImageMetadata(dataSet) {
	let imageMetadata = {
		rows: dataSet.uint16('x00280010'),
		cols: dataSet.uint16('x00280011'),
		rescaleIntercept: dataSet.int16('x00281052'),
		rescaleSlope: dataSet.int16('x00281053'),
		samplesPerPixel: dataSet.uint16('x00280002'),
		pixelRepresentation: dataSet.uint16('x00280103'),
		interpretation: dataSet.string('x00280004'),
		planarConfiguration: dataSet.uint16('x00280006'),
		frames: dataSet.uint16('x00280008'),
		bitsAllocated: dataSet.uint16('x00280100'),
		bitsStored: dataSet.uint16('x00280101'),
		transferSyntax: dataSet.string('x00020010'),
		sopClassUID: dataSet.string('x00080016'),
		compressionMethod: dataSet.string('x00282114'),
		pixelPaddingValue: dataSet.string('x00280120'),
		pixelData: dataSet.elements.x7fe00010
	};
	return imageMetadata;
}
