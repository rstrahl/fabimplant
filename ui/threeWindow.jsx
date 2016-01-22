// threeWindow.jsx
//
// Displays a threejs scene

import React from 'react';
import { findDOMNode } from 'react-dom';
import { bind } from 'decko';
import THREE from 'three';

const NEAR = -500;
const FAR = 5000;

/**
 * Displays a threejs scene inside a window component.
 */
export default class ThreeWindow extends React.Component {

	constructor(props) {
		super(props);
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

	shouldComponentUpdate(nextProps, nextState) {
		// Should only update if the dimensions of the window changes
		return (nextState.width !== this.state.width || nextState.height !== this.state.height);
	}

	componentWillUpdate() {
	}

	componentDidUpdate() {
		this.renderThree();
	}

	componentDidMount() {
		addEventListener('resize', this.updateSize);
		this.setupThree();
		this.updateSize();
	}

	componentWillUnmount() {
		removeEventListener('resize', this.updateSize);
	}

	render() {
		return (
			<div className="three-window" onMouseDown={this.handleMouseDown} onMouseUp={this.handleMouseUp}>
			</div>
		);
	}

	@bind
	setupThree() {
		let { left, right, top, bottom } = this.state.cameraProps;
		this.camera = new THREE.OrthographicCamera(left, right, top, bottom, NEAR, FAR);
		this.mesh = new THREE.Mesh(
			new THREE.BoxGeometry(100,100,100),
			new THREE.MeshBasicMaterial( {color: 0x0000ff})
		);
		this.scene = new THREE.Scene();
		this.scene.add(this.mesh);
		this.renderer = new THREE.WebGLRenderer();
		findDOMNode(this).appendChild(this.renderer.domElement);
		this.renderThree();
	}

	@bind
	renderThree() {
		let { width, height } = this.state;
		let { left, right, top, bottom } = this.state.cameraProps;
		// apply any rendering changes here
		this.renderer.setSize(width, height);
		this.camera.left = left;
		this.camera.right = right;
		this.camera.top = top;
		this.camera.bottom = bottom;
		this.camera.updateProjectionMatrix();
		this.renderer.render(this.scene, this.camera);
	}

	@bind
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

	@bind
	handleMouseDown(mouseEvent) {
		this.setState({
			mouseTracking: true,
			mouseDownX : mouseEvent.clientX,
			mouseDownY : mouseEvent.clientY
		});
		addEventListener('mousemove', this.handleMouseMove);
	}

	@bind
	handleMouseMove(mouseEvent) {
		mouseEvent.preventDefault();
		let xD = mouseEvent.clientX - this.state.mouseDownX;
		let yD = mouseEvent.clientY - this.state.mouseDownY;
		console.log("mouse delta: "+xD+","+yD);
		this.setState({
			xDelta : this.state.xDelta += xD,
			yDelta : this.state.yDelta += yD
		});
	}

	@bind
	handleMouseUp() {
		removeEventListener('mousemove', this.handleMouseMove);
	}
}
