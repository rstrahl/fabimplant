import THREE from 'three';
import buildGeometry from './buildGeometry';

const DEFAULT_IMPLANT_RADIUS_SEGMENTS = 20;

export function buildSubjectMesh(geometryData) {
	// TODO: Redux refactor
	const subjectGeometry = buildGeometry(geometryData);
	const scale = 267/134; // TODO: Hardcoded test values
	subjectGeometry.applyMatrix(new THREE.Matrix4().scale(new THREE.Vector3(scale, scale, scale)));
	let subjectMesh = new THREE.Mesh(
		subjectGeometry,
		new THREE.MeshLambertMaterial({
			color : 0xF0F0F0,
			side : THREE.DoubleSide,
			transparent : true,
			opacity : 0.6
		})
	);
	const center = getCenter(subjectMesh.geometry);
	const translation = new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z);
	subjectMesh.applyMatrix(translation);
	return subjectMesh;
}

export function buildImplantMesh(implant) {
	// TODO: Redux refactor
	const { radiusTop, radiusBottom, length, matrix } = implant;
	const implantGeometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, length, DEFAULT_IMPLANT_RADIUS_SEGMENTS);
	// const implantGeometry = new THREE.SphereGeometry(radiusTop); // Test Object
	implantGeometry.applyMatrix(new THREE.Matrix4().makeRotationX(Math.PI / 2));
	implantGeometry.applyMatrix(new THREE.Matrix4().scale(new THREE.Vector3(5, 5, 5))); // TODO: Hardcoded test values
	const implantMatrix = new THREE.Matrix4();
	implantMatrix.set(...matrix);
	implantGeometry.applyMatrix(implantMatrix);
	let implantMesh = new THREE.Mesh(
		implantGeometry,
		new THREE.MeshPhongMaterial({
			color : 0x009B9B,
			shininess : 100
		})
	);
	return implantMesh;
}

export function getCenter(geometry) {
	// TODO: Redux refactor
	geometry.computeBoundingBox();
	const center = new THREE.Vector3();
	center.x = (geometry.boundingBox.min.x + geometry.boundingBox.max.x) / 2;
	center.y = (geometry.boundingBox.min.y + geometry.boundingBox.max.y) / 2;
	center.z = (geometry.boundingBox.min.z + geometry.boundingBox.max.z) / 2;
	return center;
}

export function loadMeshGroup(geometryData, implants) {
	// TODO: Redux refactor
	const meshGroup = new THREE.Group();

	if (geometryData !== null) {
		const subjectMesh = this.buildSubjectMesh(geometryData);
		meshGroup.add(subjectMesh);
		const center = this.getCenter(subjectMesh.geometry);
		const translation = new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z);
		meshGroup.applyMatrix(translation);
	}

	for (const implant of implants) {
		const implantMesh = this.buildImplantMesh(implant);
		meshGroup.add(implantMesh);
	}

	return meshGroup;
}
