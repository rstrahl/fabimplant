// threeWindow.jsx
//
// Displays a threejs scene

import React from 'react';
import ReactTHREE from 'react-three';
import THREE from 'three';

/**
 * Displays a threejs scene inside a window component.
 */
export default class ThreeWindow extends React.Component {

	constructor(props) {
		super(props);
	}

	render() {
		let width = 640;
		let height = 480;
		let aspectratio = width / height;
		let cameraprops = {
			fov : 75,
			aspect : aspectratio,
			near : 1, far : 5000,
			position : new THREE.Vector3(0,0,600),
			lookat : new THREE.Vector3(0,0,0)
		};

		let position = new THREE.Vector3(0,0,0);
		let geometry = new THREE.BoxGeometry(100,100,100);
		let material = new THREE.MeshBasicMaterial( {color: 0x0000ff});

		return (
			<div className="three-window">
		        <ReactTHREE.Scene width={width} height={height} camera="maincamera">
		            <ReactTHREE.PerspectiveCamera name="maincamera" {...cameraprops} />
					<ReactTHREE.Mesh position={position} geometry={geometry} material={material} />
		        </ReactTHREE.Scene>
			</div>
		);
	}

}
