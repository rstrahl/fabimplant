// imageWindow.jsx
//
// A UI component that displays a DICOM image and navigational elements
//

import React from 'react';
import ReactDOM from 'react-dom';

export default class ImageWindow extends React.Component {

	// Add imageIndex prop with default of 0

	constructor(props) {
		super(props);
		this.state = {
			imageIndex: 0
		};
	}

	shouldComponentUpdate(nextProps, nextState) {
		return (nextState.imageIndex !== this.state.imageIndex
			|| nextProps.images !== this.props.images);
	}

	render() {
		if (this.props.images.length < 1) {
			return (
				<div id="image-window"></div>
			);
		}

		return (
			<div id="image-window">
				<ImageCanvas imageData={this.props.images[this.state.imageIndex]}/>
				<ImageNavigationBar
					handleImageIndexChanged={this.handleImageIndexChanged.bind(this)}
					currentImageIndex={this.state.imageIndex}
					imageIndexMax={this.props.images.length} />
				// Window Level/Center manipulation controls
			</div>
		);
	}

	handleImageIndexChanged(newIndex) {
		if (newIndex < 0) {
			this.setState({imageIndex: 0});
		} else if (newIndex >= this.props.images.length) {
			this.setState({imageIndex:this.props.images.length - 1});
		} else {
			this.setState({imageIndex: newIndex});
		}
	}

}

ImageWindow.propTypes = {
	images: React.PropTypes.array
};

ImageWindow.defaultProps = {
	images: []
};


class ImageCanvas extends React.Component {

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

// Navigation Bar --------------------------------

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
