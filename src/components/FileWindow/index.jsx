import React from 'react';
import styles from './style.less';
import {bind} from 'decko';
import FileInputResults from '../FileInputResults';
import { loadFiles, FILE_READER_MODE } from '../../lib/fileLoader/fileLoader';
import DicomFile from '../../lib/dicom/dicomFile';
import * as processor from '../../lib/dicom/processor';
import implantParserPromise from '../../lib/implant/implantParserPromise';
import dicomParserPromise from '../../lib/dicom/dicomParserPromise';
import carestreamParserStrategy from '../../lib/implant/carestreamParserStrategy';

/** A UI component that presents and coordinates importing/loading data files.
 */
export default class FileWindow extends React.Component {

	render() {
		const { session } = this.props;
		return (
			<div className={styles.fileWindow}>
				<FileInputResults
					dicomFile={session.dicomFile}
					implantFile={session.implantFile}
					onLoadDicomFiles={this.loadDicomFiles}
					onLoadImplantFiles={this.loadImplantFiles}/>
			</div>
		);
	}

	@bind
	handleDicomFileChanged(dicomFile) {
		const { session } = this.props;
		session.dicomFile = dicomFile;
		session.windowCenter = dicomFile.getWindowCenter();
		session.windowWidth = dicomFile.getWindowWidth();
		this.props.handleSessionChanged(session);
	}

	@bind
	handleImplantFileChanged(implantFile) {
		const { session } = this.props;
		session.implantFile = implantFile;
		this.props.handleSessionChanged(session);
	}

	// TODO: Redux refactor
	@bind
	loadDicomFiles(fileList) {
		console.log('Loading DICOM data...');
		// TODO: Add async progress notifications on each file parse
		if (fileList.length > 0) {
			console.log(`Selected ${fileList.length} files...`);
			loadFiles(fileList, FILE_READER_MODE.ARRAYBUFFER)
			.then(arrayBuffers => {
				Promise.all(arrayBuffers.map(arrayBuffer => dicomParserPromise(arrayBuffer)))
				.then(dataSets => {
					Promise.all(dataSets.map(dataSet => processor.processDataSet(dataSet)))
					.then(pixelDataArrays => {
						let dicomFile = new DicomFile(dataSets[0], pixelDataArrays);
						this.handleDicomFileChanged(dicomFile);
					})
					.catch(err => console.log(`Error processing image data: ${err}`));
				})
				.catch(err => console.log(`Error parsing DICOM files: ${err}`));
			});
		}
	}

	// TODO: Redux refactor
	@bind
	loadImplantFiles(fileList) {
		console.log('Loading implant data...');
		if (fileList.length > 0) {
			console.log(`Selected ${fileList.length} files...`);
			loadFiles(fileList, FILE_READER_MODE.TEXT)
			.then(arrayBuffers => {
				implantParserPromise(arrayBuffers[0])
				.then(result => {
					let implantFile = carestreamParserStrategy(result);
					this.handleImplantFileChanged(implantFile);
				})
				.catch(err => console.log(`Error parsing implants data: ${err}`));
			})
			.catch(err => console.log(`Error loading files: ${err}`));
		}
	}

}

FileWindow.propTypes = {
	session: React.PropTypes.object,
	handleSessionChanged: React.PropTypes.func
};
FileWindow.defaultProps = {
	session: null,
	handleSessionChanged: null
};
