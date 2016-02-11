// imageWindow.jsx
//
// A UI component that displays images from a DICOM file with image navigation elements.
//

import React from 'react';
import ReactDOM from 'react-dom';
import { prepareImageData, pixelValueToInterpretedValue } from '../dicom/processor';
import DicomDebugWindow from './dicomDebugWindow.jsx';

/** A UI component that displays images from a DICOM file.
 */
export default class ImageWindow extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			imageIndex: 0,
			windowWidth: 4096,
			windowCenter: 2048
		};
	}

	render() {
		let { dicomFile } = this.props;
		let { imageIndex, windowCenter, windowWidth } = this.state;

		if (dicomFile === undefined || dicomFile === null) {
			return (
				<div id="image-window"></div>
			);
		}

		// TODO: Seems like this could be refactored out into somewhere cleaner
		let pixelArray = dicomFile.pixelArrays[imageIndex];
		let height = dicomFile.getImageHeight();
		let width = dicomFile.getImageWidth();
		let imageData = prepareImageData(pixelArray, width, height, windowCenter, windowWidth);

		let interpretedCenter = pixelValueToInterpretedValue(windowCenter, dicomFile.getImageSlope(), dicomFile.getImageIntercept());
		let interpretedWidth =  pixelValueToInterpretedValue(windowWidth, dicomFile.getImageSlope(), dicomFile.getImageIntercept());

		// TODO: Add WL/WC controls
		// TODO: Add debug toggle buttons
		return (
			<div id="image-window">
				<div id="image-window-canvascontainer">
					<ImageCanvas imageData={imageData} />
					<ImageNavigationBar
						handleImageIndexChanged={this.handleImageIndexChanged.bind(this)}
						currentImageIndex={imageIndex}
						imageIndexMax={dicomFile.pixelArrays.length} />
					<ImageWindowCenterWidthDisplay
						windowCenter={interpretedCenter}
						windowWidth={interpretedWidth}
						handleWindowWidthChanged={this.handleWindowWidthChanged.bind(this)}
						handleWindowCenterChanged={this.handleWindowCenterChanged.bind(this)} />
				</div>
				<DicomDebugWindow dataSet={dicomFile.getDicomMetadata()} title='Image Metadata' />
			</div>
		);
	}

	handleImageIndexChanged(newIndex) {
		let { dicomFile } = this.props;
		if (newIndex < 0) {
			this.setState({imageIndex: 0});
		} else if (newIndex >= dicomFile.pixelArrays.length) {
			this.setState({imageIndex:dicomFile.pixelArrays.length - 1});
		} else {
			this.setState({imageIndex: newIndex});
		}
	}

	handleWindowWidthChanged(newWindowWidth) {
		if (newWindowWidth > 1) {
			this.setState({windowWidth: newWindowWidth});
		}
	}

	handleWindowCenterChanged(newWindowCenter) {
		this.setState({windowCenter: newWindowCenter});
	}

}

/** An HTML Canvas that renders an ImageData object.
 */
export class ImageCanvas extends React.Component {

	constructor(props) {
		super(props);
	}

	componentDidMount() {
		let context = ReactDOM.findDOMNode(this).getContext('2d');
		this.renderImage(context);
	}

	componentDidUpdate() {
		let context = ReactDOM.findDOMNode(this).getContext('2d');
		context.clearRect(0, 0, this.props.imageData.width, this.props.imageData.height);
		this.renderImage(context);
	}

	render() {
		let canvasStyle = {
			width: this.props.imageData.width,
			height: this.props.imageData.height
		};

		return (
			<canvas
				id="image-window-canvas"
				width={this.props.imageData.width}
				height={this.props.imageData.height}
				style={canvasStyle}
			/>
		);
	}

	renderImage(context) {
		context.putImageData(this.props.imageData, 0, 0);
	}

}

/** A UI component that displays and controls DICOM Window Width and Center.
 */
class ImageWindowCenterWidthDisplay extends React.Component {

	constructor(props) {
		super(props);
	}

	render() {
		return (
			<div className="image-window-centerwidth-display">
				<div>
					Window Levels
				</div>
				<div className="image-window-centerwidth-control">
					{this.props.windowCenter}
					<input type="range" className="vertical" defaultValue={this.props.windowCenter}
						min="0" max="4096" onChange={this.handleWindowWidthChanged.bind(this)}></input>
					Center
				</div>
				<div className="image-window-centerwidth-control">
					{this.props.windowWidth}
					<input type="range" className="vertical" defaultValue={this.props.windowWidth}
						min="0" max="4096" onChange={this.handleWindowCenterChanged.bind(this)}></input>
					Width
				</div>
			</div>
		);
	}

	handleWindowWidthChanged(event) {
		this.props.handleWindowWidthChanged(event.target.valueAsNumber);
	}

	handleWindowCenterChanged(event) {
		this.props.handleWindowCenterChanged(event.target.valueAsNumber);
	}

}

/**
 * A Navigation Bar for navigating through the collection of DICOM images in
 * a given DicomFile.
 */
class ImageNavigationBar extends React.Component {

	 constructor(props) {
		 super(props);
	 }

	 shouldComponentUpdate(nextProps) {
		 return nextProps.currentImageIndex !== this.props.currentImageIndex;
	 }

	 render() {
		 return (
			 <div className="image-navigation-bar">
				 <div className="image-navigation-text">
					 {this.props.currentImageIndex + 1} / {this.props.imageIndexMax}
				 </div>
				 <div className="image-navigation-controls">
					 <ImageNavigationButton label="&lt;" handleButtonClick={this.handleButtonClick.bind(this)} indexModifier={-1} />
					 <input type="range" defaultValue="0" min="0" max={this.props.imageIndexMax} onChange={this.handleChangeImageIndex.bind(this)}></input>
					 <ImageNavigationButton label="&gt;" handleButtonClick={this.handleButtonClick.bind(this)} indexModifier={1} />
				 </div>
			 </div>
		 );
	 }

	 handleButtonClick(indexModifier) {
		 this.props.handleImageIndexChanged(this.props.currentImageIndex + indexModifier);
	 }

	 handleChangeImageIndex(event) {
		 this.props.handleImageIndexChanged(event.target.valueAsNumber);
	 }

}

/** A button that calls a callback in the ImageNavigationBar when clicked.
 */
class ImageNavigationButton extends React.Component {

	constructor(props) {
		super(props);
	}

	render() {
		return (
			<div className="image-navigation-button" onClick={this.handleButtonClick.bind(this)}>
				{this.props.label}
			</div>
		);
	}

	handleButtonClick() {
		this.props.handleButtonClick(this.props.indexModifier);
	}
}
