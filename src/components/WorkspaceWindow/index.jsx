import React from 'react';
import { bind } from 'decko';
import styles from './style.less';
import NavigationFooter from '../NavigationFooter';
import FileWindow from '../FileWindow';
import ImageWindow from '../ImageWindow';
import ThreeWindow from '../ThreeWindow';
import TestWindow from '../TestWindow';
import * as fileLoader from '../../dicom/fileLoader';
import DicomFile from '../../dicom/dicomFile';
import * as processor from '../../dicom/processor';

/**
 * A container component that presents a workspace stage, and navigation controls for
 * moving between workspace stages.
 */
export default class WorkspaceWindow extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			index: 0,
			stageWindows: [FileWindow, ImageWindow, ThreeWindow, TestWindow],
			dicomFile: null
		};
	}

	render() {
		let { stageWindows, index } = this.state;
		let StageWindow = stageWindows[index];

		return (
			<div className={styles.workspace} onDragOver={this.handleDragOver} onDrop={this.handleDrop}>
				<StageWindow dicomFile={this.state.dicomFile}/>
				<NavigationFooter handleNavigationUpdate={this.handleNavigationDidChange}/>
			</div>
		);
	}

	@bind
	handleNavigationDidChange(newIndex) {
		if (newIndex < 0) {
			this.setState({index: 0});
		} else if (newIndex >= this.state.stageWindows.length) {
			this.setState({index:this.state.stageWindows.length - 1});
		} else {
			this.setState({index: newIndex});
		}
	}

	// TODO: file loading should eventually be moved into its own stage with file browser (possible?)
	@bind
	handleDragOver(event) {
		event.stopPropagation();
		event.preventDefault();
		event.dataTransfer.dropEffect = 'copy';
	}

	@bind
	handleDrop(event) {
		event.stopPropagation();
		event.preventDefault();
		let files = event.dataTransfer.files;
		if (files.length > 0) {
			fileLoader.loadFiles(Array.from(files))
			.then( dataSets => {
				Promise.all(dataSets.map( dataSet => processor.processDataSet(dataSet) ))
				.then( pixelDataArrays => {
					let file = new DicomFile(dataSets[0], pixelDataArrays);
					this.setState({
						dicomFile: file}
					);
				})
				.catch( err => console.log('Error processing image data: ' + err));
			});
		}
	}
}

WorkspaceWindow.propTypes = {
};

WorkspaceWindow.defaultProps = {
};
