// workspaceWindow.js
//
// A UI container that displays a workspace area and navigation controls for
// moving between workspace stages.

import React from 'react';
import NavigationFooter from './navigationFooter.jsx';
import ImageWindow from './imageWindow.jsx';
import ThreeWindow from './threeWindow.jsx';
import TestWindow from './testWindow.jsx';

import * as fileLoader from '../fileLoader';
import DicomFile from '../dicomFile';
import * as processor from '../processor';


/**
 * A UI container that displays a workspace area and navigation controls for
 * moving between workspace stages.
 */
export default class WorkspaceWindow extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			index: 0,
			stageWindows: [ImageWindow, ThreeWindow, TestWindow],
			dicomFile: null
		};
	}

	render() {
		let { stageWindows, index } = this.state;
		let StageWindow = stageWindows[index];

		return (
			<div className="workspace-window" onDragOver={this.handleDragOver.bind(this)} onDrop={this.handleDrop.bind(this)}>
				<div className="workspace-window-main">
					<StageWindow dicomFile={this.state.dicomFile}/>
				</div>
				<div className="workspace-window-nav">
					<NavigationFooter handleNavigationUpdate={this.handleNavigationDidChange.bind(this)}/>
				</div>
			</div>
		);
	}

	/**
	 * Callback that handles when the NavigationFooter changes the
	 * current workspace stage.
	 */
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
	handleDragOver(event) {
		event.stopPropagation();
		event.preventDefault();
		event.dataTransfer.dropEffect = 'copy';
	}

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
