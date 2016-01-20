// threeWindow.jsx
//
// Displays a threejs scene

import React from 'react';
import ReactTHREE from 'react-three';
import { findDOMNode } from 'react-dom';
import THREE from 'three';

const NEAR = -500;
const FAR = 5000;

/**
 * Displays a threejs scene inside a window component.
 */
export default class ThreeWindow extends React.Component {

	constructor(props) {
		super(props);
		this.handleMouseMove = this.handleMouseMove.bind(this);
		this.state = {
			width : 0,
			height : 0,
			mouseDownX : 0,
			mouseDownY : 0,
			xDelta : 0,
			yDelta : 0,
			cameraProps : {
				left : 0,
				right: 0,
				top : 0,
				bottom : 0,
				near : NEAR,
				far : FAR
			}
		};
	}

	componentDidMount() {
		addEventListener('resize', this.updateSize);
		this.updateSize();
	}

	componentWillUnmount() {
		removeEventListener('resize', this.updateSize);
	}

	render() {
		let { Scene, Mesh, OrthographicCamera } = ReactTHREE;
		let { Vector3, BoxGeometry, MeshBasicMaterial } = THREE;
		let { width, height, cameraProps } = this.state;

		// TODO: Replace with generated mesh
		let meshProps = {
			position : new Vector3(0,0,0),
			geometry : new BoxGeometry(100,100,100),
			material : new MeshBasicMaterial( {color: 0x0000ff} )
		};

		return (
			<div className="three-window" onMouseDown={this.handleMouseDown.bind(this)} onMouseUp={this.handleMouseUp.bind(this)}>
		        <Scene camera="maincamera" width={width} height={height}>
		            <OrthographicCamera name="maincamera" {...cameraProps} />
					<Mesh {...meshProps} />
		        </Scene>
			</div>
		);
	}

	updateSize() {
		let w = findDOMNode(this).offsetWidth;
		let h = findDOMNode(this).offsetHeight;
		this.setState({
			width: w,
			height: h,
			cameraProps : {
				left : w / -2,
				right: w / 2,
				top : h / 2,
				bottom : h / -2,
				near : NEAR,
				far : FAR
			}
		});
	}

	handleMouseDown(mouseEvent) {
		this.setState({
			mouseTracking: true,
			mouseDownX : mouseEvent.clientX,
			mouseDownY : mouseEvent.clientY
		});
		addEventListener('mousemove', this.handleMouseMove);
	}

	handleMouseMove(mouseEvent) {
		mouseEvent.preventDefault();
		let xD = this.state.mouseDownX - mouseEvent.clientX;
		let yD = this.state.mouseDownY - mouseEvent.clientY;
		this.setState({
			xDelta : this.state.xDelta += xD,
			yDelta : this.state.yDelta += yD
		});
	}

	handleMouseUp() {
		removeEventListener('mousemove', this.handleMouseMove);
	}
}
