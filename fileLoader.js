// fileLoader.js
//
// Provides a lightweight loader for DICOM files via the FileReader API.

import Promise from 'promise';
import dicomParser from 'dicom-parser';

/**
 * Attempts to load a dicom File object and parse it, returning the parsed DataSet.
 *
 * @param  {File} file a File object from a .DCM file
 * @return {Promise<DataSet>} A promise to the DataSet
 */
export function loadFile(file) {
	return new Promise(function(resolve, reject) {
		let reader = new FileReader();
		reader.onload = () => {
			let arrayBuffer = reader.result;
			let byteArray = new Uint8Array(arrayBuffer);
			let dataSet = dicomParser.parseDicom(byteArray);
			resolve(dataSet);
		};
		reader.onerror = () => {
			reject(reader.error);
		};
		reader.readAsArrayBuffer(file);
	});
}
