// imageWindow.jsx
//
// A UI component that displays images from a DICOM file with image navigation elements.
//

import React from 'react';
import ReactDOM from 'react-dom';
import { prepareImageData, pixelValueToInterpretedValue } from '../processor';
import DicomDebugWindow from './dicomDebugWindow.jsx';

/**
 * A UI component that displays images from a DICOM file with image navigation
 * elements.
 */
export default class ImageWindow extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			imageIndex: 0,
			windowWidth: 4096, // TODO: Modify these to use HU-based values
			windowCenter: 2048
		};
	}

	render() {
		if (this.props.dicomFile === undefined) {
			return (
				<div id="image-window"></div>
			);
		}

		let pixelArray = this.props.dicomFile.pixelArrays[this.state.imageIndex];
		let height = this.props.dicomFile.getImageHeight();
		let width = this.props.dicomFile.getImageWidth();
		let imageData = prepareImageData(pixelArray, width, height, this.state.windowCenter, this.state.windowWidth);

		let interpretedCenter = pixelValueToInterpretedValue(this.state.windowCenter, this.props.dicomFile.getImageSlope(), this.props.dicomFile.getImageIntercept());
		let interpretedWidth =  pixelValueToInterpretedValue(this.state.windowWidth, this.props.dicomFile.getImageSlope(), this.props.dicomFile.getImageIntercept());

		// TODO: Add WL/WC controls
		// TODO: Add debug toggle buttons
		return (
			<div id="image-window">
				<div id="image-window-canvascontainer">
					<ImageCanvas imageData={imageData}/>
					<ImageNavigationBar
						handleImageIndexChanged={this.handleImageIndexChanged.bind(this)}
						currentImageIndex={this.state.imageIndex}
						imageIndexMax={this.props.dicomFile.pixelArrays.length} />
					<ImageWindowCenterWidthDisplay windowCenter={interpretedCenter} windowWidth={interpretedWidth} />
				</div>
				<DicomDebugWindow dataSet={this.props.dicomFile.getDicomMetadata()} title='Image Metadata'/>
			</div>
		);
	}

	handleImageIndexChanged(newIndex) {
		if (newIndex < 0) {
			this.setState({imageIndex: 0});
		} else if (newIndex >= this.props.dicomFile.pixelArrays.length) {
			this.setState({imageIndex:this.props.dicomFile.pixelArrays.length - 1});
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

/**
 * An HTML Canvas that renders an ImageData object.
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

class ImageWindowCenterWidthDisplay extends React.Component {

	constructor(props) {
		super(props);
	}

	render() {
		return (
			<div className="image-window-centerwidth-display">
					Window Center: {this.props.windowCenter} / Window Width: {this.props.windowWidth}
			</div>
		);
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
				 <ImageNavigationButton label="&lt; Prev" handleButtonClick={this.handleButtonClick.bind(this)} indexModifier={-1} />
				 <div className="image-navigation-text">
					 {this.props.currentImageIndex + 1} / {this.props.imageIndexMax}
				 </div>
				 <ImageNavigationButton label="Next &gt;" handleButtonClick={this.handleButtonClick.bind(this)} indexModifier={1} />
			 </div>
		 );
	 }

	 handleButtonClick(indexModifier) {
		 this.props.handleImageIndexChanged(this.props.currentImageIndex + indexModifier);
	 }

}

/**
 * A button that calls a callback in the ImageNavigationBar when clicked.
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
