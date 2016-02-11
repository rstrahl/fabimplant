// threeWindow.jsx
//
// Displays a threejs scene

import React from 'react';
import { findDOMNode } from 'react-dom';
import { bind } from 'decko';
import THREE from 'three';
import RenderingStage from '../three/renderingStage';
import { default as volumeMesh, dicomVolume, sphereVolume } from '../three/modeler';
import { generateScaffold, generateScaffoldGeometry } from '../three/marchingCubes';
import Serializer from '../three/STLSerializer';

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
		this.renderingStage = new RenderingStage();
		this.subdivision = 0;
	}

	shouldComponentUpdate(nextProps, nextState) {
		// Should only update if the dimensions of the window changes
		// This impacts the renderer canvas and the camera
		return (nextState.width !== this.state.width || nextState.height !== this.state.height);
	}

	componentWillUpdate(nextProps, nextState) {
		this.renderingStage.updateSize(nextState.width, nextState.height);
	}

	componentDidUpdate() {
	}

	componentDidMount() {
		addEventListener('resize', this.updateSize);
		findDOMNode(this).appendChild(this.renderingStage.rendererElement);
		findDOMNode(this).appendChild(this.renderingStage.statsElement);
		this.handleRefresh();
		this.renderingStage.animate();
		this.updateSize();
	}

	componentWillUnmount() {
		removeEventListener('resize', this.updateSize);
	}

	render() {
		return (
			<div className="three-window">
				<div className="three-window-button-panel">
					<button className="three-window-button" type="button"
						onClick={this.handleExportSTL}>Export</button>
					<button className="three-window-button" type="button"
						onClick={this.handleRefresh}>Refresh</button>
					<button className="three-window-button" type="button"
						onClick={this.handleIncreaseSubdivision}>Increase</button>
					<button className="three-window-button" type="button"
						onClick={this.handleDecreaseSubdivision}>Decrease</button>
					<button className="three-window-button" type="button"
						onClick={this.handleToggleCamera}>{this.state.cameraMode}</button>
				</div>
			</div>
		);
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
	handleToggleCamera() {
		// TODO: Load camera and apply
		// this.renderingStage.setCameraMode();
	}

	@bind
	handleRefresh() {
		this.renderingStage.clearStage();
		let { dicomFile } = this.props;
		if (dicomFile !== undefined && dicomFile !== null) {
			this.loadMeshForDicom(dicomFile);
		} else {
			this.loadMeshForDefault();
		}
		this.renderingStage.volumeMesh = this.volumeMesh;
		this.renderingStage.scaffoldMesh = this.scaffoldMesh;
		this.renderingStage.loadStage();
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

	@bind
	handleIncreaseSubdivision() {
		this.subdivision += 1;
		console.log('subdivision: '+ this.subdivision);
		this.handleRefresh();
	}

	@bind
	handleDecreaseSubdivision() {
		this.subdivision -= 1;
		console.log('subdivision: '+ this.subdivision);
		this.handleRefresh();
	}

	// TODO: REFACTOR ALL THIS BELOW

	loadMeshForDicom(dicomFile) {
		let isolevel = 1600,
			factor = 8,
			step = 1;
		let volume = dicomVolume(dicomFile, factor);
		this.volumeMesh = volumeMesh(volume, step, isolevel, this.subdivision);
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

	loadMeshForDefault() {
		let size = 10,
			isolevel = 4.5,
			step = 1;
		let volume = sphereVolume(size, size, size, step);
		this.volumeMesh = volumeMesh(volume, step, isolevel);
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

	// TODO: Refactor this into separate camera class in three/
	@bind
	handleMouseDown(mouseEvent) {
		this.lastX = mouseEvent.clientX;
		this.lastY = mouseEvent.clientY;
		addEventListener('mousemove', this.handleMouseMove);
	}

	@bind
	handleMouseMove(mouseEvent) {
		mouseEvent.preventDefault();
		let xD = mouseEvent.clientX - this.lastX;
		let yD = this.lastY - mouseEvent.clientY;
		this.xDelta += xD;
		this.yDelta += yD;
		this.lastX = mouseEvent.clientX;
		this.lastY = mouseEvent.clientY;
		this.renderThree();
		console.log("mouse delta: "+xD+","+yD+" mesh delta: "+this.xDelta+","+this.yDelta);
	}

	@bind
	handleMouseUp() {
		removeEventListener('mousemove', this.handleMouseMove);
	}

}
