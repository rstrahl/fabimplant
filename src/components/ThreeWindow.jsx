import React from 'react';
import { findDOMNode } from 'react-dom';
import { bind } from 'decko';
import MeshRenderer, { CAMERA_CONTROLS_MODE } from './MeshRenderer';
import { dicomVolume, sphereVolume } from '../three/modeler';
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
			geometryData : null,
			debugMode : false,
			factor : 2,
			subdivision : 0,
			controlsMode: CAMERA_CONTROLS_MODE.ORBIT
		};
		// this.renderingStage = new RenderingStage();
		this.subdivision = 0;
		this.volume = null;
		this.geometryWorker = new GeometryWorker();
	}

	componentDidMount() {
		addEventListener('resize', this.updateSize);
		this.handleRefresh();
		this.updateSize();
	}

	componentWillUnmount() {
		removeEventListener('resize', this.updateSize);
	}

	render() {
		let { width, height, debugMode, controlsMode, geometryData } = this.state;
		let controlsModeString = (controlsMode === CAMERA_CONTROLS_MODE.ORBIT) ? 'Orbit' : 'Model';
		let debugModeString = (debugMode === true) ? 'On' : 'Off';
		let vertices, faces = 0;
		return (
			<div className="three-window">
				<MeshRenderer width={width} height={height} debugMode={debugMode} controlsMode={controlsMode} geometryData={geometryData} />
				<div className="three-window-button-panel">
					<button className="three-window-button" type="button"
						onClick={this.handleExportSTL}>Export</button>
					<button className="three-window-button" type="button"
						onClick={this.handleRefresh}>Refresh</button>
					<button className="three-window-button" type="button"
						onClick={this.handleToggleDebug}>Debug {debugModeString}</button>
					<button className="three-window-button" type="button"
						onClick={this.handleIncreaseSubdivision}>Increase</button>
					<button className="three-window-button" type="button"
						onClick={this.handleDecreaseSubdivision}>Decrease</button>
					<button className="three-window-button" type="button"
						onClick={this.handleToggleControlsMode}>{controlsModeString}</button>
					<button className="three-window-button" type="button"
						onClick={this.handleGeometryWorker}>Worker</button>
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
	handleToggleControlsMode() {
		let controlsMode = (this.state.controlsMode === CAMERA_CONTROLS_MODE.ORBIT) ? CAMERA_CONTROLS_MODE.MODEL : CAMERA_CONTROLS_MODE.ORBIT;
		this.setState({ controlsMode });
	}

	@bind
	handleRefresh() {
		// TODO: FLUX refactor
		// this.renderingStage.clearStage();
		let { dicomFile } = this.props;
		if (dicomFile !== undefined && dicomFile !== null) {
			this.loadMeshForDicom(dicomFile);
		} else {
			this.loadMeshForDefault();
		}
	}

	@bind
	handleExportSTL() {
		// TODO: FLUX refactor
		// TODO: Fix after MeshRenderer implementation
		// let { volumeMesh } = this.renderingStage;
		// if (volumeMesh !== undefined) {
		// 	let stl = Serializer(volumeMesh);
		// 	let textFile = null,
		// 		makeTextFile = function (text) {
		// 			let data = new Blob([text], {type: '{type: "octet/stream"}'});
		// 			if (textFile !== null) {
		// 				window.URL.revokeObjectURL(textFile);
		// 			}
		// 			textFile = window.URL.createObjectURL(data);
		// 			return textFile;
		// 		  };
		// 	window.open(makeTextFile(stl));
		// }
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

	@bind
	loadMeshForDicom(dicomFile) {
		// TODO: FLUX refactor
		let isolevel = dicomFile.windowCenter - Math.ceil(dicomFile.windowWidth / 2),
			factor = 2;
		let volume = dicomVolume(dicomFile, factor);
		this.buildGeometry(volume, isolevel);
	}

	@bind
	loadMeshForDefault() {
		// TODO: FLUX refactor
		let size = 10,
			isolevel = 4.5,
			step = 1;
		let volume = sphereVolume(size, size, size, step);
		this.buildGeometry(volume, isolevel);
	}

	@bind
	buildGeometry(volume, isolevel) {
		let handler = (e) => {
			this.geometryWorker.removeEventListener('message', handler);
			this.setState({ geometryData : e.data });
		};
		this.geometryWorker.addEventListener('message', handler);
		this.geometryWorker.postMessage({ volume: volume.data, height: volume.height, width: volume.width, depth: volume.depth, step: 1, isolevel});
	}

}

ThreeWindow.propTypes = {
	dicomFile : React.PropTypes.object
};
ThreeWindow.defaultProps = {
	dicomFile : null
};
