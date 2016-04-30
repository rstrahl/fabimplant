import React from 'react';
import { findDOMNode } from 'react-dom';
import styles from './style.less';
import THREE from 'three';
import Stats from 'stats.js';
import createOrbitControls from 'three-orbit-controls';
import MeshControl from '../../three/meshControl';
import { bind } from 'decko';
import buildGeometry from '../../three/buildGeometry';

const NEAR = -500;
const FAR = 1000;
const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0, 25, 100);
const DEFAULT_CAMERA_PROPS = {
	left : 0,
	right : 0,
	top : 0,
	bottom : 0,
	near : NEAR,
	far : FAR,
	zoom : 1.0,
	position : DEFAULT_CAMERA_POSITION
};

/**
 * Defines the possible modes for interactive manipulating the viewing perspective
 * for the RenderingStage.
 *
 * @type {Object}
 */
export const CAMERA_CONTROLS_MODE = {
	ORBIT : 0,
	MODEL : 1
};

/**
 * A component that presents and manages a THREE.Renderer, and facilitates interaction
 * with its Scene.
 *
 * This implementation is better described as a wrapper around a THREE.Renderer
 * so as to facilitate integration with a React application.  It does not need
 * to re-render, but does rely on props to be passed down that allow React
 * Components to interact with the Scene and its elements.
 *
 * Note that when the geometryData prop is updated, a new THREE.Mesh object will be
 * generated and replace the existing Mesh in the Scene.
 */
export default class MeshRenderer extends React.Component {

	constructor(props) {
		super(props);
		let { left, right, top, bottom, near, far, position } = DEFAULT_CAMERA_PROPS;
		let camera = new THREE.OrthographicCamera(left, right, top, bottom, near, far);
		camera.position.set(position.x, position.y, position.z);
		this.state = {
			camera,
			mesh : null
		};

		this.scene = new THREE.Scene();
		this.renderer = new THREE.WebGLRenderer({antialias : true});
		this.renderer.domElement.onmousedown = this.handleMouseDown;
		this.renderer.domElement.onmouseup = this.handleMouseUp;

		let OrbitControls = createOrbitControls(THREE);
		this.orbitControls = new OrbitControls(camera, this.renderer.domElement);
		this.meshControls = new MeshControl((transform) => {
			let { mesh } = this.state;
			mesh.rotation.x = Math.min(Math.max(mesh.rotation.x + transform.rotation.x, -Math.PI/2), Math.PI/2);
			mesh.rotation.y = Math.min(Math.max(mesh.rotation.y + transform.rotation.y, -Math.PI), Math.PI);
		});

		this.stats = new Stats();
		this.stats.setMode(0);
		this.stats.domElement.className = styles.statsPanel;
	}

	render() {
		return (
			<div className={styles.meshRenderer}>
			</div>
		);
	}

	componentDidMount() {
		let { debugMode, controlsMode } = this.props;
		findDOMNode(this).appendChild(this.renderer.domElement);
		findDOMNode(this).appendChild(this.stats.domElement);
		this.initScene(debugMode);
		this.updateControls(controlsMode);
		this.animate();
	}

	componentWillUnmount() {
		this.cancelAnimation();
		this.clearScene();
		findDOMNode(this).removeChild(this.renderer.domElement);
		findDOMNode(this).removeChild(this.stats.domElement);
	}

	componentWillReceiveProps(nextProps) {
		let { width, height, debugMode, controlsMode, geometryData } = nextProps;

		if (width !== this.props.width || height !== this.props.height) {
			this.cleanProjection(width, height);
		}

		if (debugMode !== this.props.debugMode) {
			this.updateDebugging(debugMode);
		}

		if (controlsMode !== this.props.controlsMode) {
			this.updateControls(controlsMode);
		}

		if (geometryData !== this.props.geometryData) {
			let mesh = this.buildMesh(geometryData);
			this.setState({ mesh });
		}
	}

	shouldComponentUpdate(nextProps, nextState) {
		if (nextState.mesh !== this.state.mesh) {
			this.removeMesh();
			this.loadMesh(nextState.mesh, nextProps.debugMode);
		}
		return false;
	}

	@bind
	animate() {
		let { camera } = this.state;
		if (this.props.debugMode === true) {
			this.stats.update();
		}
		this.controls.update();
		this.renderer.render(this.scene, camera);
		this.animationRequestId = requestAnimationFrame(this.animate);
	}

	@bind
	cancelAnimation() {
		cancelAnimationFrame(this.animationRequestId);
	}

	@bind
	initScene(debugMode) {
		let ambientLight = new THREE.AmbientLight(0x444444);
		let directionalLight = new THREE.DirectionalLight(0xFFFFFF, 0.9);
		directionalLight.position.set(0,250,100);
		this.scene.add(ambientLight);
		this.scene.add(directionalLight);
		if (debugMode === true) {
			this.initSceneDebug();
		}
		if (this.state.mesh !== null) {
			this.loadMesh(this.state.mesh, debugMode);
		}
	}

	@bind
	initSceneDebug() {
		let axisHelper = new THREE.AxisHelper(FAR/2);
		this.scene.add(axisHelper);
		let gridHelper = new THREE.GridHelper(100, 10);
		this.scene.add(gridHelper);
		this.stats.domElement.style.display = 'block';
	}

	@bind
	cleanProjection(width, height) {
		let { camera } = this.state;
		this.renderer.setSize(width, height);
		camera.left = width / -2;
		camera.right = width / 2;
		camera.top = height / 2;
		camera.bottom = height / -2;
		camera.near = camera.near;
		camera.far = camera.far;
		camera.zoom = camera.zoom;
		camera.updateProjectionMatrix();
	}

	@bind
	clearScene() {
		for (let i = this.scene.children.length - 1; i >= 0; i--) {
			this.scene.remove(this.scene.children[i]);
		}
		this.stats.domElement.style.display = 'none';
	}

	@bind
	buildMesh(geometryData) {
		let geometry = buildGeometry(geometryData);
		let mesh = new THREE.Mesh(
			geometry,
			new THREE.MeshLambertMaterial({
				color : 0xF0F0F0,
				side : THREE.DoubleSide
			})
		);
		return mesh;
	}

	@bind
	removeMesh() {
		let { mesh } = this.state;
		if (mesh !== null) {
			this.scene.remove(mesh);
		}
	}

	@bind
	loadMesh(mesh, debugMode) {
		this.scene.add(mesh);
		if (debugMode === true) {
			let wireframeHelper = new THREE.WireframeHelper(mesh, 0x00AA00);
			this.scene.add(wireframeHelper);
		}
	}

	@bind
	handleMouseDown(e) {
		if (this.props.controlsMode === CAMERA_CONTROLS_MODE.MODEL) {
			this.controls.handleMouseDown(e);
		}
	}

	@bind
	handleMouseUp(e) {
		if (this.props.controlsMode === CAMERA_CONTROLS_MODE.MODEL) {
			this.controls.handleMouseUp(e);
		}
	}

	@bind
	updateControls(controlsMode) {
		if (controlsMode === CAMERA_CONTROLS_MODE.MODEL) {
			this.orbitControls.enabled = false;
			this.controls = this.meshControls;
		} else {
			this.orbitControls.enabled = true;
			this.controls = this.orbitControls;
		}
	}

	@bind
	updateDebugging(debugMode) {
		this.clearScene();
		this.initScene(debugMode);
	}

}

MeshRenderer.propTypes = {
	width : React.PropTypes.number,
	height : React.PropTypes.number,
	debugMode : React.PropTypes.bool,
	controlsMode : React.PropTypes.number,
	geometryData : React.PropTypes.oneOfType([
		React.PropTypes.instanceOf(Float32Array),
		React.PropTypes.instanceOf(Float64Array)
	])
};
MeshRenderer.defaultProps = {
	width : 0,
	height : 0,
	debugMode : false,
	controlsMode : CAMERA_CONTROLS_MODE.ORBIT,
	geometryData : null
};
