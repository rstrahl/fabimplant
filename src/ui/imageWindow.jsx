// imageWindow.jsx
//
// A UI component that displays images from a DICOM file with image navigation elements.
//

import React from 'react';
import ReactDOM from 'react-dom';
import { bind } from 'decko';
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

		// let interpretedCenter = pixelValueToInterpretedValue(windowCenter, dicomFile.getImageSlope(), dicomFile.getImageIntercept());
		// let interpretedWidth =  pixelValueToInterpretedValue(windowWidth, dicomFile.getImageSlope(), dicomFile.getImageIntercept());

		// TODO: Add debug toggle buttons
		return (
			<div id="image-window">
				<div id="image-window-canvascontainer">
					<ImageCanvas imageData={imageData} />
					<ImageNavigationBar
						handleImageIndexChanged={this.handleImageIndexChanged}
						currentImageIndex={imageIndex}
						imageIndexMax={dicomFile.pixelArrays.length} />
					<ImageWindowCenterWidthDisplay
						windowCenter={windowCenter}
						windowWidth={windowWidth}
						handleWindowWidthChanged={this.handleWindowWidthChanged}
						handleWindowCenterChanged={this.handleWindowCenterChanged} />
				</div>
				<DicomDebugWindow dataSet={dicomFile.getDicomMetadata()} title='Image Metadata' />
			</div>
		);
	}

	@bind
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

	@bind
	handleWindowWidthChanged(newWindowWidth) {
		if (newWindowWidth > 1) {
			this.setState({windowWidth: newWindowWidth});
		}
	}

	@bind
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
				<div className="image-window-centerwidth-title">
					Window Level
				</div>
				<div className="image-window-centerwidth-control">
					<div className="image-window-centerwidth-value">{this.props.windowCenter}</div>
					<input
						type="range"
						className="image-window-centerwidth-input"
						defaultValue={this.props.windowCenter}
						min="0"
						max="4096"
						onChange={this.handleWindowCenterChanged}>
					</input>
					<div className="image-window-centerwidth-text">Center</div>
				</div>
				<div className="image-window-centerwidth-control">
					<div className="image-window-centerwidth-value">{this.props.windowWidth}</div>
					<input
						type="range"
						className="image-window-centerwidth-input"
						defaultValue={this.props.windowWidth}
						min="0"
						max="4096"
						onChange={this.handleWindowWidthChanged}>
					</input>
					<div className="image-window-centerwidth-text">Width</div>
				</div>
			</div>
		);
	}

	@bind
	handleWindowWidthChanged(event) {
		this.props.handleWindowWidthChanged(event.target.valueAsNumber);
	}

	@bind
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
					 <ImageNavigationButton label="&lt;" handleButtonClick={this.handleButtonClick} indexModifier={-1} />
					 <div className="image-navigation-input">
						 <input type="range" defaultValue="0" min="0" max={this.props.imageIndexMax} onChange={this.handleChangeImageIndex}></input>
					 </div>
					 <ImageNavigationButton label="&gt;" handleButtonClick={this.handleButtonClick} indexModifier={1} />
				 </div>
			 </div>
		 );
	 }

	 @bind
	 handleButtonClick(indexModifier) {
		 this.props.handleImageIndexChanged(this.props.currentImageIndex + indexModifier);
	 }

	 @bind
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
			<div className="image-navigation-button" onClick={this.handleButtonClick}>
				{this.props.label}
			</div>
		);
	}

	@bind
	handleButtonClick() {
		this.props.handleButtonClick(this.props.indexModifier);
	}
}
