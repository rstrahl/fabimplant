import Promise from 'promise';

/** Sets the mode for the FileReader when loading files.
 * @type {Object}
 */
export const FILE_READER_MODE = {
	ARRAYBUFFER: 0,
	TEXT: 1
};

/** Attempts to read a File object using a FileReader.
 * By default this method will attempt to read the File as text, unless the
 * readerMode parameter specifies otherwise.
 *
 * @see FILE_READER_MODE
 * @param  {Object} file       a File object
 * @param  {number} readerMode the mode used by the FileReader when reading a file
 * @return {Object}            A Promise to read the File and return an ArrayBuffer
 */
export function loadFile(file, readerMode = FILE_READER_MODE.TEXT) {
	return new Promise((resolve, reject) => {
		let reader = new FileReader();
		reader.onload = () => {
			let arrayBuffer = reader.result;
			resolve(arrayBuffer);
		};
		reader.onerror = () => {
			reject(reader.error);
		};
		switch(readerMode) {
			case FILE_READER_MODE.ARRAYBUFFER:
				reader.readAsArrayBuffer(file);
				break;
			case FILE_READER_MODE.TEXT:
			default:
				reader.readAsText(file);
				break;
		}
	});
}

/**
 * Attempts to load an array of File objects and parse them as DICOM files,
 * returning an Array of DataSet objects.
 *
 * @param  {Array}  files      an Array of File objects
 * @param  {number} readerMode the mode used by the FileReader when reading a file
 * @return {Object}            a Promise returning an Array of DataSets
 */
export function loadFiles(files, readerMode) {
	return Promise.all(files.map(file => loadFile(file, readerMode)))
		.then(arrayBuffers => {
			return arrayBuffers;
		})
		.catch(err => console.error('Error loading file set: ' + err));
}
