// fileLoader.js
//
// Provides a lightweight loader for DICOM files via the FileReader API.

'use-strict';

import Promise from 'promise';
// import dicomParser from 'dicom-parser';

/**
 * Attempts to load a dicom File object and parse it, returning the parsed DataSet.
 *
 * @param  {File} file a File object from a .DCM file
 * @return {Promise<DataSet>} A promise to the DataSet
 */
export function loadFile(file) {
	return new Promise( (resolve, reject) => {
		let reader = new FileReader();
		reader.onload = () => {
			let arrayBuffer = reader.result;
			// let byteArray = new Uint8Array(arrayBuffer);
			// let dataSet = dicomParser.parseDicom(byteArray);
			resolve(arrayBuffer);
		};
		reader.onerror = () => {
			reject(reader.error);
		};
		reader.readAsText(file);
	});
}

/**
 * Attempts to load an array of File objects and parse them as DICOM files,
 * returning an Array of DataSet objects.
 *
 * @param  {Array} files an Array of File objects
 * @return {Promise} a Promise returning an Array of DataSets
 */
export function loadFiles(files) {
	return Promise.all(files.map( file => loadFile(file) ))
	// .then( dataSets => {
	// 	return dataSets;
	// })
	.then ( arrayBuffers => {
		return arrayBuffers;
	})
	.catch( err => console.error('Error loading file set: ' + err) );
}
