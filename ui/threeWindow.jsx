// threeWindow.jsx
//
// Displays a threejs scene

import React from 'react';
import ReactTHREE from 'react-three';
import { findDOMNode } from 'react-dom';
import THREE from 'three';

const NEAR = 1;
const FAR = 5000;

/**
 * Displays a threejs scene inside a window component.
 */
export default class ThreeWindow extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			width : 0,
			height : 0
		};
	}

	componentDidMount() {
		addEventListener('resize', this.updateSize);
		this.updateSize();
	}

	componentWillUnmount() {
		removeEventListener('resize', this.updateSize);
	}

	updateSize() {
		this.setState({
			width: findDOMNode(this).offsetWidth,
			height: findDOMNode(this).offsetHeight
		});
	}

	render() {
		let { Scene, Mesh, OrthographicCamera } = ReactTHREE;
		let { Vector3 } = THREE;
		let { width, height } = this.state;

		let aspectratio = width / height;
		let perspectiveCameraProps = {
			fov : 75,
			aspect : aspectratio,
			near : NEAR,
			far : FAR,
			position : new Vector3(0,0,600),
			lookat : new Vector3(0,0,0)
		};
		let orthoCameraProps = {
			left : width / -2,
			right: width / 2,
			top : height / 2,
			bottom : height / -2,
			near : -500,
			far : FAR
		};

		let meshProps = {
			position : new THREE.Vector3(0,0,0),
			geometry : new THREE.BoxGeometry(100,100,100),
			material : new THREE.MeshBasicMaterial( {color: 0x0000ff} )
		};

		return (
			<div className="three-window">
		        <Scene camera="maincamera" width={width} height={height}>
		            <OrthographicCamera name="maincamera" {...orthoCameraProps} />
					<Mesh {...meshProps} />
		        </Scene>
			</div>
		);
	}

}
