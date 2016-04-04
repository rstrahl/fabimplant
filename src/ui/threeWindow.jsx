// threeWindow.jsx
//
// Displays a threejs scene

import React from 'react';
import { findDOMNode } from 'react-dom';
import { bind } from 'decko';
import { default as RenderingStage, CONTROL_MODE_ORBIT, CONTROL_MODE_MODEL } from '../three/renderingStage';
import { default as volumeMesh, dicomVolume, sphereVolume } from '../three/modeler';
import GeometryWorker from 'worker!../three/geometryWorker';
import Serializer from '../three/STLSerializer';

/**
 * Displays a threejs scene inside a window component.
 */
export default class ThreeWindow extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			width : 0,
			height : 0,
			debugMode : false,
			controlMode: 0
		};
		this.renderingStage = new RenderingStage();
		this.subdivision = 0;
		this.volumeMesh = null;
		this.volume = null;
		this.workerTest = new GeometryWorker();
	}

	componentWillUpdate(nextProps, nextState) {
		let { debugMode, controlMode, width, height } = nextState;
		this.renderingStage.setDebugMode(debugMode);
		this.renderingStage.setControlMode(controlMode);
		if (width !== this.state.width || height !== this.state.height) {
			this.renderingStage.updateSize(width, height);
		}
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
		let { debugMode } = this.state;
		let vertices = (this.volumeMesh !== null) ? this.volumeMesh.geometry.vertices.length : 0;
		let faces = (this.volumeMesh !== null) ? this.volumeMesh.geometry.faces.length : 0;
		return (
			<div className="three-window">
				<div className="three-window-button-panel">
					<button className="three-window-button" type="button"
						onClick={this.handleExportSTL}>Export</button>
					<button className="three-window-button" type="button"
						onClick={this.handleRefresh}>Refresh</button>
					<button className="three-window-button" type="button"
						onClick={this.handleToggleDebug}>Debug {this.state.debugMode}</button>
					<button className="three-window-button" type="button"
						onClick={this.handleIncreaseSubdivision}>Increase</button>
					<button className="three-window-button" type="button"
						onClick={this.handleDecreaseSubdivision}>Decrease</button>
					<button className="three-window-button" type="button"
						onClick={this.handleToggleControlMode}>{this.state.controlMode}</button>
					<button className="three-window-button" type="button"
						onClick={this.handleWorkerTest}>Worker</button>
				</div>
				{ debugMode === true
					? <div className='three-window-debug-panel'>
						Vertices: {vertices}
						Faces: {faces}
						</div>
					: null
				}
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
	handleToggleControlMode() {
		let controlMode = (this.state.controlMode === CONTROL_MODE_ORBIT) ? CONTROL_MODE_MODEL : CONTROL_MODE_ORBIT;
		this.setState({ controlMode });
	}

	@bind
	handleRefresh() {
		// TODO: FLUX refactor
		this.renderingStage.clearStage();
		let { dicomFile } = this.props;
		if (dicomFile !== undefined && dicomFile !== null) {
			this.loadMeshForDicom(dicomFile);
		} else {
			this.loadMeshForDefault();
		}
		this.renderingStage.volumeMesh = this.volumeMesh;
		this.renderingStage.loadStage();
	}

	@bind
	handleExportSTL() {
		// TODO: FLUX refactor
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
		this.handleRefresh();
	}

	@bind
	handleDecreaseSubdivision() {
		this.subdivision -= 1;
		this.handleRefresh();
	}

	@bind
	handleToggleDebug() {
		this.setState({ debugMode: !this.state.debugMode });
	}

	loadMeshForDicom(dicomFile) {
		// TODO: FLUX refactor
		let isolevel = dicomFile.windowCenter - Math.ceil(dicomFile.windowWidth / 2),
			factor = 2,
			step = 1;
		this.volume = dicomVolume(dicomFile, factor);
		this.volumeMesh = volumeMesh(this.volume, step, isolevel, this.subdivision);
	}

	loadMeshForDefault() {
		let size = 10,
			isolevel = 4.5,
			step = 1;
		let volume = sphereVolume(size, size, size, step);
		this.volumeMesh = volumeMesh(volume, step, isolevel);
	}

	@bind
	handleWorkerTest() {
		let {volume} = this;
		let {dicomFile} = this.props;
		let handler = (e) => {
			console.log('Worker replied: '+e.data);
			this.workerTest.removeEventListener('message', handler);
		};
		this.workerTest.addEventListener('message', handler);
		let isolevel = dicomFile.windowCenter - Math.ceil(dicomFile.windowWidth / 2);
		this.workerTest.postMessage({ volume: volume.data, height: volume.height, width: volume.width, depth: volume.depth, step: 1, isolevel});
	}

}
