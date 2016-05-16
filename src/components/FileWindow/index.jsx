import React from 'react';
import styles from './style.less';
import { bind } from 'decko';
import FileInputForm from '../FileInputForm';
import FileInputDetails from '../FileInputDetails';
import * as fileLoader from '../../dicom/fileLoader';
import DicomFile from '../../dicom/dicomFile';
import * as processor from '../../dicom/processor';

/** A UI component that presents and coordinates all file-loading stage components.
 *
 */
export default class FileWindow extends React.Component {

	render() {
		const { dicomFile } = this.props;
		return (
			<div className={styles.fileWindow}>
				{ dicomFile === null
					? <FileInputForm onFileLoaded={this.loadDicomFiles}/>
					: <FileInputDetails dicomFile={dicomFile} />
				}
			</div>
		);
	}

	@bind
	loadDicomFiles(fileList) {
		// TODO: Add async progress notifications on each file parse
		if (fileList.length > 0) {
			console.log(`Selected ${fileList.length} files...`);
			fileLoader.loadFiles(Array.from(fileList))
			.then( dataSets => {
				Promise.all(dataSets.map( dataSet => processor.processDataSet(dataSet) ))
				.then( pixelDataArrays => {
					let file = new DicomFile(dataSets[0], pixelDataArrays);
					this.props.handleFileLoaded(file);
				})
				.catch( err => console.log('Error processing image data: ' + err));
			});
		}
	}

	@bind
	loadAnalysisFile(file) {
		// TODO: Implement loading/parsing of analysis file
	}

}

FileWindow.propTypes = {
	dicomFile : React.PropTypes.object,
	handleFileLoaded : React.PropTypes.func
};
FileWindow.defaultProps = {
	dicomFile : null,
	handleFileLoaded : null
};
