import React from 'react';
import { findDOMNode } from 'react-dom';
import styles from './style.less';
import THREE from 'three';
import Stats from 'stats.js';
import createOrbitControls from 'three-orbit-controls';
import MeshControl from '../../three/meshControl';
import { loadMeshGroup } from '../../three/mesher';
import { bind } from 'decko';

const NEAR = -5000;
const FAR = 10000;
const DEFAULT_CAMERA_POSITION = new THREE.Vector3(1, 1, 1);
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
			camera
		};

		this.scene = new THREE.Scene();
		this.renderer = new THREE.WebGLRenderer({antialias : true});
		this.renderer.domElement.onmousedown = this.handleMouseDown;
		this.renderer.domElement.onmouseup = this.handleMouseUp;

		let OrbitControls = createOrbitControls(THREE);
		this.orbitControls = new OrbitControls(camera, this.renderer.domElement);
		this.meshControls = new MeshControl((transform) => {
			let { meshGroup } = this.state;
			meshGroup.rotation.x = Math.min(Math.max(meshGroup.rotation.x + transform.rotation.x, -Math.PI/2), Math.PI/2);
			meshGroup.rotation.y = Math.min(Math.max(meshGroup.rotation.y + transform.rotation.y, -Math.PI), Math.PI);
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
		this.updateControls(controlsMode);
		this.initScene(debugMode);
		this.animate();
	}

	componentWillUnmount() {
		this.cancelAnimation();
		this.clearScene();
		findDOMNode(this).removeChild(this.renderer.domElement);
		findDOMNode(this).removeChild(this.stats.domElement);
	}

	componentWillReceiveProps(nextProps) {
		let { width, height, controlsMode } = nextProps;

		if (width !== this.props.width || height !== this.props.height) {
			this.cleanProjection(width, height);
		}

		if (controlsMode !== this.props.controlsMode) {
			this.updateControls(controlsMode);
		}
	}

	shouldComponentUpdate(nextProps, nextState) {
		const { implants, geometryData, debugMode } = nextProps;
		return (implants !== this.props.implants || geometryData !== this.props.geometryData || debugMode !== this.props.debugMode);
	}

	componentDidUpdate(prevProps, prevState) {
		this.cancelAnimation();
		this.clearScene();
		findDOMNode(this).appendChild(this.renderer.domElement);
		findDOMNode(this).appendChild(this.stats.domElement);
		this.initScene(this.props.debugMode);
		this.animate();
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
		const meshGroup = loadMeshGroup(this.props.geometryData, this.props.implants);
		this.scene.add(meshGroup);
		if (debugMode === true) {
			this.initSceneDebug();
			const wireframes = this.loadWireframeMeshes(meshGroup.children);
			this.scene.add(...wireframes);
		}
	}

	@bind
	initSceneDebug() {
		let axisHelper = new THREE.AxisHelper(FAR/2);
		this.scene.add(axisHelper);
		let gridHelper = new THREE.GridHelper(500, 50);
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

	// @bind
	// buildImplantGeometries(implants) {
	// 	let implantGeometries = [];
	// 	for (const implant of implants) {
	// 		const { radiusTop, radiusBottom, length, x, y, z } = implant;
	// 		const implantGeometry = new THREE.CylinderGeometry(radiusTop*10, radiusBottom*10, length*10, DEFAULT_IMPLANT_RADIUS_SEGMENTS);
	// 		let implantMesh = new THREE.Mesh(
	// 			implantGeometry,
	// 			new THREE.MeshPhongMaterial({
	// 				color : 0x009B9B,
	// 				shininess : 100
	// 			})
	// 		);
	// 		implantMesh.position.set(x, y, z);
	// 		implantGeometries.push(implantGeometry);
	// 	}
	// 	return implantGeometries;
	// }

	@bind
	loadWireframeMeshes(meshes) {
		// TODO: Redux refactor
		let wireframes = [];
		for (const mesh of meshes) {
			let wireframeHelper = new THREE.WireframeHelper(mesh, 0x00AA00);
			wireframes.push(wireframeHelper);
		}
		return wireframes;
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
	getCenter(geometry) {
		// TODO: Redux refactor
		geometry.computeBoundingBox();
		const center = new THREE.Vector3();
		center.x = (geometry.boundingBox.min.x + geometry.boundingBox.max.x) / 2;
		center.y = (geometry.boundingBox.min.y + geometry.boundingBox.max.y) / 2;
		center.z = (geometry.boundingBox.min.z + geometry.boundingBox.max.z) / 2;
		return center;
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
	]),
	implants : React.PropTypes.array
};
MeshRenderer.defaultProps = {
	width : 0,
	height : 0,
	debugMode : false,
	controlsMode : CAMERA_CONTROLS_MODE.ORBIT,
	geometryData : null,
	implants : []
};
