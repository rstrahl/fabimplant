import Promise from 'promise';
import dicomParser from 'dicom-parser';

/** Returns a Promise for parsing a DICOM file.
 *
 * @param  {ArrayBuffer} arrayBuffer an ArrayBuffer containing DICOM data
 * @return {Object}                  a Promise
 */
export default function dicomParserPromise(arrayBuffer) {
	return new Promise( (resolve, reject) => {
		let byteArray = new Uint8Array(arrayBuffer);
		let dataSet = dicomParser.parseDicom(byteArray);
		if (dataSet === null || dataSet === undefined) {
			reject('DICOM parser returned null or undefined');
		} else {
			resolve(dataSet);
		}
	});
}
