// dicomFile.js
//
// Represents a fully parsed DICOM file containing metadata and a renderable image

'use-strict';

import dicomParser from 'dicom-parser';

/**
 * An object that contains both DICOM metadata and a renderable image from a parsed
 * DICOM file.
 */
export default class DicomFile {

	/**
	 * Default constructor.
	 * @param {Object} dataSet a dicom-js DataSet object
	 * @param {Array} pixelArrays	an array of arrays containing pixel values for an image
	 */
	constructor(dataSet, pixelArrays) {
		this.dataSet = dataSet;
		this.pixelArrays = pixelArrays;
	}

	getDicomMetadata() {
		return dicomParser.explicitDataSetToJS(this.dataSet);
	}

	getImageWidth() {
		return this.dataSet.uint16('x00280011');
	}

	getImageHeight() {
		return this.dataSet.uint16('x00280010');
	}

	getImageSlope() {
		return parseFloat(this.dataSet.string('x00281053'));
	}

	getImageIntercept() {
		return parseFloat(this.dataSet.string('x00281052'));
	}

}
