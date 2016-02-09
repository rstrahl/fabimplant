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
import { default as marchingCubes, flattenPixelArrays, resamplePixelArray, normalizeUpPixelArray,
	generateScaffold, generateScaffoldGeometry, makeSphere } from '../marchingCubes';
import Serializer from '../STLSerializer';

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
		// STATS - TODO: Refactor this out of the jsx
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

		// TODO: Refactor all this shit out of the jsx and into a functional helper
		let { dicomFile } = this.props;
		if (dicomFile !== undefined && dicomFile !== null) {
			let width = dicomFile.getImageWidth(),
				height = dicomFile.getImageHeight(),
				isolevel = 50,
				step = 0.25,
				factor = 8;

			let pixelArrays = getThresholdPixelArray(dicomFile, 1500, 1);
			// let pixelArrays = [];
			// dicomFile.pixelArrays.forEach( (value) => {
			// 	pixelArrays.push(Array.from(value));
			// });

			let downsampledArrays = {
				data : []
			};
			for (let i = 0; pixelArrays.length - i >= factor; i += factor) {
				let normalizedArray = normalizeUpPixelArray(pixelArrays[i], width, height, factor);
				let array = resamplePixelArray(normalizedArray.data, normalizedArray.width, normalizedArray.height, factor);
				downsampledArrays.data.push(array.data);
				if (downsampledArrays.width === undefined) downsampledArrays.width = array.width;
				if (downsampledArrays.height === undefined) downsampledArrays.height = array.height;
			}
			let volume = flattenPixelArrays(downsampledArrays.data, downsampledArrays.width, downsampledArrays.height);
			let volumeGeometry = marchingCubes(volume.width, volume.height, volume.depth, step, volume.data, isolevel);
			this.volumeMesh = new THREE.Mesh(
				volumeGeometry,
				new THREE.MeshLambertMaterial({
					color : 0xF0F0F0,
					side : THREE.DoubleSide
				})
			);
			let scaffold = generateScaffold(volume.width, volume.height, volume.depth, step);
			this.scaffoldMesh = new THREE.Mesh(
				generateScaffoldGeometry(scaffold, volume.width, volume.height, volume.depth),
				new THREE.MeshBasicMaterial({
					color : 0xAAAAFF,
					transparent : true,
					opacity : 0.5,
					wireframe : true
				})
			);

		} else {
			let step = 10;
			let volume = makeSphere(10, 10, 10, step);
			let volumeGeometry = marchingCubes(volume.width, volume.height, volume.depth, step, volume.data, 45);
			this.volumeMesh = new THREE.Mesh(
				volumeGeometry,
				new THREE.MeshLambertMaterial({
					color : 0xFFFFFF,
					side : THREE.DoubleSide
				})
			);
			let scaffold = generateScaffold(volume.width, volume.height, volume.depth, step);
			this.scaffoldMesh = new THREE.Mesh(
				generateScaffoldGeometry(scaffold, volume.width, volume.height, volume.depth),
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
				<button className="three-window-button-export" type="button"
					onClick={this.handleExportSTL}>Export</button>
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
		this.directionalLight = new THREE.DirectionalLight(0xFFFFFF, 0.8);
		this.directionalLight.position.set(500,500,50);
		this.scene.add(this.directionalLight);
		this.directionalLight2 = new THREE.DirectionalLight(0xFFFFFF, 0.6);
		this.directionalLight2.position.set(-500,500,50);
		this.scene.add(this.directionalLight2);
		this.directionalLight3 = new THREE.DirectionalLight(0xF0F0F0, 1);
		this.directionalLight3.position.set(0,-500,50);
		this.scene.add(this.directionalLight3);

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

	@bind
	handleExportSTL() {
		if (this.volumeMesh !== undefined) {
			let stl = Serializer(this.volumeMesh);
			let textFile = null,
				makeTextFile = function (text) {
					let data = new Blob([text], {type: '{type: "octet/stream"}'});
					if (textFile !== null) {
						window.URL.revokeObjectURL(textFile);
					}
					textFile = window.URL.createObjectURL(data);
					return textFile;
				  };
			window.open(makeTextFile(stl));
		}
	}

}
