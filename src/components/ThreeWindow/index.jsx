import React from 'react';
import { findDOMNode } from 'react-dom';
import { bind } from 'decko';
import styles from './style.less';
import MeshRenderer, { CAMERA_CONTROLS_MODE } from '../MeshRenderer';
import { dicomVolume, sphereVolume } from '../../three/modeler';
import GeometryWorker from 'worker!../../three/geometryWorker';
import Serializer from '../../three/STLSerializer';

const DEFAULT_DOWNSAMPLE_FACTOR = 2;

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
			factor : DEFAULT_DOWNSAMPLE_FACTOR,
			controlsMode: CAMERA_CONTROLS_MODE.ORBIT
		};
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
		let { implantFile } = this.props.session;
		let implants = implantFile !== null ? implantFile.implants : [];
		let controlsModeString = (controlsMode === CAMERA_CONTROLS_MODE.ORBIT) ? 'Orbit' : 'Model';
		let debugModeString = (debugMode === true) ? 'On' : 'Off';
		return (
			<div className={styles.window}>
				<MeshRenderer width={width} height={height} debugMode={debugMode} controlsMode={controlsMode} geometryData={geometryData} implants={implants} />
				<div className={styles.buttonPanel}>
					<button className={styles.button} type="button"
						onClick={this.handleExportSTL}>STL Export</button>
					<button className={styles.button} type="button"
						onClick={this.handleRefresh}>Refresh</button>
					<button className={styles.button} type="button"
						onClick={this.handleToggleDebug}>Debug {debugModeString}</button>
					<button className={styles.button} type="button"
						onClick={this.handleToggleControlsMode}>{controlsModeString}</button>
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
	handleToggleControlsMode() {
		let controlsMode = (this.state.controlsMode === CAMERA_CONTROLS_MODE.ORBIT) ? CAMERA_CONTROLS_MODE.MODEL : CAMERA_CONTROLS_MODE.ORBIT;
		this.setState({ controlsMode });
	}

	@bind
	handleRefresh() {
		// this.renderingStage.clearStage();
		let { session } = this.props;
		let { dicomFile } = session;
		if (dicomFile !== null) {
			// let isolevel = session.windowCenter - Math.ceil(session.windowWidth / 2);
			this.loadMeshForDicom(dicomFile, 600);
		} else {
			this.loadMeshForDefault();
		}
	}

	@bind
	handleExportSTL() {
		// TODO: Redux refactor
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
	handleToggleDebug() {
		this.setState({ debugMode: !this.state.debugMode });
	}

	@bind
	loadMeshForDicom(dicomFile, isolevel) {
		// TODO: Redux refactor
		let { factor } = this.state;
		let volume = dicomVolume(dicomFile, factor);
		this.buildGeometry(volume, isolevel);
	}

	@bind
	loadMeshForDefault() {
		// TODO: Redux refactor
		let size = 10,
			isolevel = 45,
			step = 10;
		let volume = sphereVolume(size, size, size, step);
		this.buildGeometry(volume, isolevel);
	}

	@bind
	buildGeometry(volume, isolevel) {
		// TODO: Redux refactor
		let handler = (e) => {
			this.geometryWorker.removeEventListener('message', handler);
			this.setState({ geometryData : e.data });
		};
		this.geometryWorker.addEventListener('message', handler);
		this.geometryWorker.postMessage({ volume: volume.data, height: volume.height, width: volume.width, depth: volume.depth, step: volume.step || 1, isolevel});
	}

}

ThreeWindow.propTypes = {
	session: React.PropTypes.object
};
ThreeWindow.defaultProps = {
	session: null
};
