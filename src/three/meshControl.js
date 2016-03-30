
import { bind } from 'decko';

/**
 * Provides input control that generates an X/Y rotation for a Mesh.
 *
 * TODO: provide a callback function for "rotationDidChange" instead of a Mesh
 */
export default class MeshControl {

	constructor(mesh, domElement) {
		this.lastX = 0;
		this.lastY = 0;
		this.xDelta = 0;
		this.yDelta = 0;
		this.mesh = mesh;
		this.domElement = domElement;
	}

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
		let rotationX = this.yDelta*0.005 * Math.PI;
		let rotationY = -this.xDelta*0.005 * Math.PI;
		this.mesh.rotation.x = rotationX;
		this.mesh.rotation.y = rotationY;
	}

	@bind
	handleMouseUp() {
		removeEventListener('mousemove', this.handleMouseMove);
	}

}
