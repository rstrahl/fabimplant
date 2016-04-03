// processor.js
//
// Processes a DataSet object, extracting relevant dicom metadata and image pixel data.

import jpeg from 'jpeg-lossless-decoder-js';

/**
 * Attempts to process a DataSet for an image and if successful returns the pixel values
 * for the image.
 *
 * @param  {DataSet} dataSet a dicom-js DataSet object
 * @return {TypedArray} an array containg pixel values extract from the image
 */
export function processDataSet(dataSet) {
	return new Promise( (resolve, reject) => {
		let imageMetadata = getImageMetadata(dataSet);
		if (imageMetadata === undefined) {
			reject(new Error('Unable to extract image metadata from DataSet'));
		}

		let pixelData = processPixelData(dataSet, imageMetadata);
		if (pixelData === undefined) {
			reject(new Error('Unable to process pixel data from DataSet'));
		}

		resolve(pixelData);
	});
}

/**
 * Processes the provided DataSet and attempts to decode its image data; if successful
 * will return a TypedArray containing the image's pixel values.
 *
 * @param  {DataSet} dataSet a dicom-parser DataSet.
 * @param  {Object} imageMetadata an Object containing the image data.
 * @return {TypedArray} a TypedArray of pixel data, may be either 16 or 8 bit.
 */
export function processPixelData(dataSet, imageMetadata) {
	// TODO: Convert to promise?
	let decoder = new jpeg.lossless.Decoder();
  // TODO: Note this only handles one fragment
  // TODO: Can we pass in the bytearray buffer from the imageMetadata.pixelData
	let decompressedData = decoder.decompress(dataSet.byteArray.buffer,
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

/**
 * Processes a TypedArray of pixel data into an ImageData object.
 *
 * @param  {Array} pixelData a TypedArray containing pixel data.
 * @param  {number} width the width of the image.
 * @param  {number} height the height of the image.
 * @param  {number} windowCenter the Window Center used when rendering the image
 * @param  {number} windowWidth the Window Width used when rendering the image
 * @return {ImageData} an ImageData object in RGBA interlaced format.
 */
export function prepareImageData(pixelData, width, height, windowCenter, windowWidth) {
	let image = new ImageData(width, height);
	let data = image.data;
	let i = 0, j = 0;
	while (i < pixelData.length) {
		let val = applyWindowLevelAndCenter(pixelData[i], windowCenter, windowWidth);
		j = i*4;
		data[j] = val;		// r
		data[j+1] = val;	// g
		data[j+2] = val;	// b
		data[j+3] = 255;	// a
		i++;
	}
	return image;
}

/**
 * Generates an array of all image pixel data contained in the specified DicomFile
 * object.  The pixel data will have the resulting Window Center and Window Width
 * applied.
 *
 * @param  {Object} dicomFile a DicomFile object
 * @param  {number} windowCenter the desired Window Center
 * @param  {number} windowWidth the desired Window Width
 * @return {Array} an array of pixel value arrays
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
		pixelArray.forEach( (value) => {
			thresholdArray.push(applyWindowLevelAndCenter(value, windowCenter, windowWidth));
		});
		thresholdPixelArrays.push(thresholdArray);
	}
	return thresholdPixelArrays;
}

export function applyWindowLevelAndCenter(pixelValue, windowCenter, windowWidth) {
	// TODO: UNIT TEST
	// By spec, windowWidth can never be less than 1 - we gracefully fail by returning an unaltered pixelValue
	if (windowWidth < 1) {
		console.error('windowWidth cannot be < 1');
		return pixelValue;
	}

	const MAX_VALUE = 255;
	const MIN_VALUE = 0;

	let alteredPixelValue = 0;
	if (pixelValue <= (windowCenter - 0.5 - ((windowWidth - 1) / 2))) {
		 alteredPixelValue = MIN_VALUE;
	} else if (pixelValue > ((windowCenter - 0.5) + (windowWidth - 1) / 2)) {
		alteredPixelValue = MAX_VALUE;
	} else {
		alteredPixelValue = ((pixelValue - (windowCenter - 0.5)) / (windowWidth - 1) + 0.5) * (MAX_VALUE - MIN_VALUE) + MIN_VALUE;
	}
	return alteredPixelValue;
}

export function pixelValueToInterpretedValue(value, slope, intercept) {
	return value * slope + intercept;
}

export function pixelValueFromInterpretedValue(value, slope, intercept) {
	return (value - intercept) / slope;
}

// TODO: This is lazy and bad engineering - should be refactored as convenience getter extension over DataSet
/**
 * Convenience method for extracting the relevant image parameters from a DataSet
 * object.
 * @param  {DataSet} dataSet a dicom-parser DataSet object
 * @return {Object} an Object
 */
function getImageMetadata(dataSet) {
	let imageMetadata = {
		rows : dataSet.uint16('x00280010'),
		cols : dataSet.uint16('x00280011'),
		samplesPerPixel: dataSet.uint16('x00280002'),
		pixelRepresentation : dataSet.uint16('x00280103'),
		interpretation : dataSet.string('x00280004'),
		planarConfiguration : dataSet.uint16('x00280006'),
		frames : dataSet.uint16('x00280008'),
		bitsAllocated : dataSet.uint16('x00280100'),
		bitsStored : dataSet.uint16('x00280101'),
		transferSyntax : dataSet.string('x00020010'),
		sopClassUID : dataSet.string('x00080016'),
		compressionMethod : dataSet.string('x00282114'),
		pixelPaddingValue : dataSet.string('x00280120'),
		pixelData : dataSet.elements.x7fe00010
	};
	return imageMetadata;
}
