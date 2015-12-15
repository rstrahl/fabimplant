// processor.js
//
// Processes a DataSet object, extracting relevant dicom metadata and image pixel data.

import jpeg from 'JPEGLosslessDecoderJS';

/**
 * Attempts to process the provided DataSet object and extract image data.
 * 
 * @param  {DataSet} dataSet a dicom-js DataSet object
 * @return {ImageData} an HTML ImageData object
 */
export function processDataSet(dataSet) {
	let imageMetadata = getImageMetadata(dataSet);
 	let pixelData = processPixelData(dataSet, imageMetadata);
 	let imageData = prepareImageData(pixelData, imageMetadata.cols, imageMetadata.rows);
 	return imageData;
}

/**
 * Processes the image data contained in a provided DataSet and returns a
 * TypedArray containing the pixel data.
 *
 * @param  {DataSet} dataSet a dicom-parser DataSet.
 * @param  {Object} imageMetadata an Object containing the image data.
 * @return {TypedArray} a TypedArray of pixel data, may be either 16 or 8 bit.
 */
function processPixelData(dataSet, imageMetadata) {
  let decoder = new jpeg.lossless.Decoder();
  // TODO: Note this only handles one fragment
  // TODO: Can we pass in the bytearray buffer from the imageMetadata.pixelData
  var decompressedData = decoder.decompress(dataSet.byteArray.buffer,
    imageMetadata.pixelData.fragments[0].position, imageMetadata.pixelData.fragments[0].length);
  var byteOutput = imageMetadata.bitsAllocated <= 8 ? 1 : 2;
  var pixelData;
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
 * Processes a TypedArray of pixel data into an ImageData object that can be
 * injected into a Canvas element.
 *
 * @param  {TypedArray} pixelData a TypedArray containing pixel data.
 * @param  {uint16} width the width of the image.
 * @param  {uint16} height the height of the image.
 * @return {ImageData} an ImageData object in RGBA interlaced format.
 */
function prepareImageData(pixelData, width, height) {
  let image = new ImageData(width, height);
  let data = image.data;
  let i = 0, j = 0;
  while (i < pixelData.length) {
    let val = (pixelData[i] / 4096) * 255; // normalized to 8bit
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
