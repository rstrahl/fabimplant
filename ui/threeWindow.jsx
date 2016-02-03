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
import { default as marchingCubes, generateScaffold, sphereVolume } from '../marchingCubes';
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
		this.scaffoldGeometry = null;
		this.volumeGeometry = null;

		this.sphereVolume = sphereVolume(10, 10, 10);
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
			// let pixelData = getThresholdPixelArray(dicomFile, 1424, 1);
			// let isolevel = 0.5;
			// let width = dicomFile.getImageWidth();
			// let height = dicomFile.getImageHeight();
			// let depth = dicomFile.pixelArrays.length;
			// This is incorrect - it PRESUMES that the data inserted will be precisely cubic!

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
		this.directionalLight.position.set(0,1000,1000);
		this.scene.add(this.directionalLight);

		// Camera
		this.camera = new THREE.OrthographicCamera(left, right, top, bottom, NEAR, FAR);
		this.camera.position.x = 200;
		this.camera.position.y = 100;
		this.camera.position.z = 200;
		this.axisHelper = new THREE.AxisHelper(FAR/2);
		this.scene.add(this.axisHelper);

		// Action!
		// this.volumeGeometry = marchingCubes(10, 10, 10, 1, this.sphereVolume, 5);
		// this.mesh = new THREE.Mesh(
		// 	this.volumeGeometry,
		// 	new THREE.MeshLambertMaterial({color: 0x101010, side: THREE.DoubleSide})
		// );
		// this.scene.add(this.mesh);

		// this.wireframeMesh = new THREE.Mesh(
		// 	this.volumeGeometry,
		// 	new THREE.MeshBasicMaterial({
		// 		color : 0xffffff,
		// 		wireframe : true,
		// 		side: THREE.DoubleSide
		// 	})
		// );
		// this.scene.add(this.wireframeMesh);
		this.scaffoldGeometry = generateScaffold(1, 1, 1, 100);
		this.scaffoldMesh = new THREE.Mesh(
			this.scaffoldGeometry,
			new THREE.MeshBasicMaterial({
				color : 0xf0f0f0,
				opacity : 0.25,
				wireframe : true
			})
		);
		this.scene.add(this.scaffoldMesh);

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
	//
	// @bind
	// handleMouseDown(mouseEvent) {
	// 	this.lastX = mouseEvent.clientX;
	// 	this.lastY = mouseEvent.clientY;
	// 	addEventListener('mousemove', this.handleMouseMove);
	// }
	//
	// @bind
	// handleMouseMove(mouseEvent) {
	// 	mouseEvent.preventDefault();
	// 	let xD = mouseEvent.clientX - this.lastX;
	// 	let yD = this.lastY - mouseEvent.clientY;
	// 	this.xDelta += xD;
	// 	this.yDelta += yD;
	// 	this.lastX = mouseEvent.clientX;
	// 	this.lastY = mouseEvent.clientY;
	// 	this.renderThree();
	// 	console.log("mouse delta: "+xD+","+yD+" mesh delta: "+this.xDelta+","+this.yDelta);
	// }
	//
	// @bind
	// handleMouseUp() {
	// 	removeEventListener('mousemove', this.handleMouseMove);
	// }
}
