import Promise from 'promise';
import { Parser } from 'xml2js';

export default function implantParserPromise(arrayBuffer) {
	return new Promise( (resolve, reject) => {
		const parser = new Parser({explicitArray : false });
		parser.parseString(arrayBuffer, (error, result) => {
			if (error === undefined || error === null) {
				resolve(result);
			} else {
				reject(error);
			}
		});
	});
}
