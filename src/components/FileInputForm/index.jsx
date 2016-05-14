import React from 'react';
import styles from './style.less';
import FileInputButton from '../FileInputButton';
import { bind } from 'decko';
import classNames from 'classnames/bind';
import * as fileLoader from '../../dicom/fileLoader';
import DicomFile from '../../dicom/dicomFile';
import * as processor from '../../dicom/processor';

let cx = classNames.bind(styles);

/** A UI component that presents an input button for loading files.
 */
export default class FileInputForm extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			dragging : false
		};
	}

	render() {
		const boxClassName = cx( { dragging : this.state.dragging, fileInputBox : true});
		return (
			<div className={boxClassName} onDragEnter={this.handleDragEnter} onDragOver={this.handleDragEnter} onDragLeave={this.handleDragLeave} onDrop={this.handleDrop}>
				<input className={styles.fileInputForm} type="file" id="file" multiple onChange={this.handleFileChange} />
				<div className={styles.fileInputButtonBox}>
					<FileInputButton formId="file"/>
				</div>
			</div>
		);
	}

	@bind
	handleDragEnter(e) {
		e.stopPropagation();
		e.preventDefault();
		e.dataTransfer.dropEffect = 'copy';
		this.setState({ dragging : true });
	}

	@bind
	handleDragLeave(e) {
		e.stopPropagation();
		e.preventDefault();
		this.setState({ dragging : false });
	}

	@bind
	handleDrop(e) {
		e.stopPropagation();
		e.preventDefault();
		this.setState({ dragging: false });
		const fileList = e.dataTransfer.files;
		this.loadFiles(fileList);
	}

	@bind
	handleFileChange(e) {
		const fileList = e.target.files;
		this.loadFiles(fileList);
	}

	@bind
	loadFiles(fileList) {
		// TODO: Move this code into a worker?
		if (fileList.length > 0) {
			console.log(`Selected ${fileList.length} files...`);
			fileLoader.loadFiles(Array.from(fileList))
			.then( dataSets => {
				Promise.all(dataSets.map( dataSet => processor.processDataSet(dataSet) ))
				.then( pixelDataArrays => {
					// For worker refactor we will be forced to work with ArrayBuffers directly,
					// requiring the DicomFile object to simply be a set of properties over
					// a collection of array buffers.  Ugh.
					let file = new DicomFile(dataSets[0], pixelDataArrays);
					this.handleFileLoaded(file);
				})
				.catch( err => console.log('Error processing image data: ' + err));
			});
		}
	}

	@bind
	handleFileLoaded(dicomFile) {
		this.props.onFileLoaded(dicomFile);
	}

}

FileInputForm.propTypes = {
	onFileLoaded : React.PropTypes.func
};
FileInputForm.defaultProps = {
	onFileLoaded : null
};
