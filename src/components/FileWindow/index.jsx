import React from 'react';
import styles from './style.less';
import {bind} from 'decko';
import FileInputResults from '../FileInputResults';
import * as fileLoader from '../../lib/fileLoader/fileLoader';
import DicomFile from '../../lib/dicom/dicomFile';
import * as processor from '../../lib/dicom/processor';
import implantParserPromise from '../../lib/implant/implantParserPromise';
import carestreamParserStrategy from '../../lib/implant/carestreamParserStrategy';

/** A UI component that presents and coordinates all file-loading stage components.
 *
 */
export default class FileWindow extends React.Component {

	render() {
		const {dicomFile, implantFile} = this.props;
		return (
			<div className={styles.fileWindow}>
				<FileInputResults
					dicomFile={dicomFile}
					implantFile={implantFile}
					onLoadDicomFiles={this.loadDicomFiles}
					onLoadImplantFiles={this.loadImplantFiles}/>
			</div>
		);
	}

	@bind
	loadDicomFiles(fileList) {
		console.log('Loading DICOM data...');
		// TODO: Add async progress notifications on each file parse
		if (fileList.length > 0) {
			console.log(`Selected ${fileList.length} files...`);
			fileLoader.loadFiles(Array.from(fileList)).then(dataSets => {
				Promise.all(dataSets.map(dataSet => processor.processDataSet(dataSet))).then(pixelDataArrays => {
					let file = new DicomFile(dataSets[0], pixelDataArrays);
					this.props.handleFileLoaded(file);
				}).catch(err => console.log('Error processing image data: ' + err));
			});
		}
	}

	@bind
	loadImplantFiles(fileList) {
		console.log('Loading implant data...');
		if (fileList.length > 0) {
			console.log(`Selected ${fileList.length} files...`);
			console.dir(fileList);
			fileLoader.loadFiles(Array.from(fileList)).then(arrayBuffers => {
				implantParserPromise(arrayBuffers[0]).then(result => {
					let implantFile = carestreamParserStrategy(result);
					console.log(implantFile);
				}).catch(err => console.log('Error parsing implants data: ' + err));
			});
		}
	}

}

FileWindow.propTypes = {
	dicomFile: React.PropTypes.object,
	implantFile: React.PropTypes.object,
	handleFileLoaded: React.PropTypes.func
};
FileWindow.defaultProps = {
	dicomFile: null,
	implantFile: null,
	handleFileLoaded: null
};
