// threeWindow.jsx
//
// Displays a threejs scene

import React from 'react';
import { findDOMNode } from 'react-dom';
import { bind } from 'decko';
import THREE from 'three';
import Stats from 'stats.js';
import createOrbitControls from 'three-orbit-controls';
import { getThresholdPixelArray } from '../processor';
import { default as marchingCubes, generateScaffold, generateScaffoldGeometry, makeSphere } from '../marchingCubes';
// import { marchingCubes } from 'isosurface';

const NEAR = -500;
const FAR = 1000;

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
		this.cameraProps = {
			left : 0,
			right : 0,
			top : 0,
			bottom : 0,
			near : NEAR,
			far : FAR,
			zoom : 1.0
		};
		this.lastX = 0;
		this.lastY = 0;
		this.xDelta = 0;
		this.yDelta = 0;
		this.stats = new Stats();
		this.stats.setMode(0);
		this.stats.domElement.style.position = 'absolute';
		this.stats.domElement.style.left = '0px';
		this.stats.domElement.style.top = '0px';
	}

	shouldComponentUpdate(nextProps, nextState) {
		// Should only update if the dimensions of the window changes
		// This impacts the renderer canvas and the camera
		return (nextState.width !== this.state.width || nextState.height !== this.state.height);
	}

	componentWillUpdate(nextProps, nextState) {
		this.updateCamera(nextState.width, nextState.height);
	}

	componentDidUpdate() {
		this.renderThree();
	}

	componentDidMount() {
		addEventListener('resize', this.updateSize);

		let { dicomFile } = this.props;
		if (dicomFile !== undefined && dicomFile !== null) {
			let pixelData = getThresholdPixelArray(dicomFile, 1424, 1);
			let isolevel = 0.5;
			let width = dicomFile.getImageWidth();
			let height = dicomFile.getImageHeight();
			let depth = dicomFile.pixelArrays.length;

			let volume = marchingCubes(width, height, depth, pixelData, isolevel);
			this.volumeMesh = new THREE.Mesh(
				volume,
				new THREE.MeshLambertMaterial({
					color : 0xFFFFFF,
					side : THREE.DoubleSide
				})
			);

			this.scaffoldMesh = new THREE.Mesh(
				generateScaffold(width, height, depth),
				new THREE.MeshBasicMaterial({
					color : 0xAAAAFF,
					transparent : true,
					opacity : 0.5,
					wireframe : true
				})
			);

		} else {
			let volume = makeSphere();
			let volumeGeometry = marchingCubes(volume.dims[0], volume.dims[1], volume.dims[2], volume.data, 1);
			this.volumeMesh = new THREE.Mesh(
				volumeGeometry,
				new THREE.MeshLambertMaterial({
					color : 0xFFFFFF,
					side : THREE.DoubleSide
				})
			);
			let scaffold = generateScaffold(volume.dims[0], volume.dims[1], volume.dims[2]);
			this.scaffoldMesh = new THREE.Mesh(
				generateScaffoldGeometry(scaffold.points, volume.dims[0], volume.dims[1], volume.dims[2]),
				new THREE.MeshBasicMaterial({
					color : 0xAAAAFF,
					transparent : true,
					opacity : 0.5,
					wireframe : true
				})
			);
		}

		this.setupThree();
		this.updateSize();
	}

	componentWillUnmount() {
		removeEventListener('resize', this.updateSize);
	}

	render() {
		return (
			<div className="three-window">
			</div>
		);
	}

	@bind
	setupThree() {
		let { left, right, top, bottom } = this.cameraProps;
		this.scene = new THREE.Scene();

		// Lights
		this.ambientLight = new THREE.AmbientLight(0x404040);
		this.scene.add(this.ambientLight);
		this.directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1);
		this.directionalLight.position.set(0,500,50);
		this.scene.add(this.directionalLight);

		// Camera
		this.camera = new THREE.OrthographicCamera(left, right, top, bottom, NEAR, FAR);
		this.camera.position.x = 200;
		this.camera.position.y = 100;
		this.camera.position.z = 200;
		this.axisHelper = new THREE.AxisHelper(FAR/2);
		this.scene.add(this.axisHelper);

		// Action!
		this.scene.add(this.scaffoldMesh);
		this.scene.add(this.volumeMesh);

		this.renderer = new THREE.WebGLRenderer({antialias : true});
		let OrbitControls = createOrbitControls(THREE);
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.addEventListener('change', this.animate);
		findDOMNode(this).appendChild(this.renderer.domElement);
		findDOMNode(this).appendChild(this.stats.domElement);
	}

	@bind
	renderThree() {
		let { width, height } = this.state;
		let { left, right, top, bottom, near, far, zoom } = this.cameraProps;
		// apply any rendering changes here
		this.renderer.setSize(width, height);
		this.camera.left = left;
		this.camera.right = right;
		this.camera.top = top;
		this.camera.bottom = bottom;
		this.camera.near = near;
		this.camera.far = far;
		this.camera.zoom = zoom;
		this.camera.updateProjectionMatrix();

		// let rotationX = -this.yDelta*0.005 * Math.PI;
		// let rotationY = this.xDelta*0.005 * Math.PI;
		// this.scaffoldMesh.rotation.x = rotationX;
		// this.scaffoldMesh.rotation.y = rotationY;
		this.renderer.render(this.scene, this.camera);
	}

	@bind
	animate() {
		this.controls.update();
		this.renderer.render(this.scene, this.camera);
	}

	@bind
	updateCamera(width, height) {
		this.cameraProps.left = width / -2;
		this.cameraProps.right = width / 2;
		this.cameraProps.top = height / 2;
		this.cameraProps.bottom = height / -2;
	}

	@bind
	updateSize() {
		let w = findDOMNode(this).offsetWidth;
		let h = findDOMNode(this).offsetHeight;
		this.setState({
			width: w,
			height: h
		});
	}

}
