import { expect } from 'chai';
import { generateGridCellPoints, lerp, flattenTriangles } from '../src/three/marchingCubes';

describe('marchingCubes.js', () => {

	describe('generateGridCellPoints', () => {

		it('generates a fucking array - suck my dick Chai', () => {
			let scaffold = generateGridCellPoints(3, 3, 3, 1);
			expect(scaffold).to.be.a('array');
		});

		it('generates the correct size for a cube', () => {
			let width = 3,
				height = 3,
				depth = 3,
				scaffold = generateGridCellPoints(width, height, depth, 1);
			expect(scaffold).to.have.length(27);
		});

		it('generates a valid array for a cuboid', () => {
			let width = 3,
				height = 3,
				depth = 4,
				scaffold = generateGridCellPoints(width, height, depth, 1);
			expect(scaffold).to.have.length(36);
		});

	});

	describe('lerp', () => {

		it('calculates an interpolation between 0 and 1 of 0.5', () => {
			let v0 = { x:0, y:0, z:0 },
				v1 = { x:1, y:1, z:1 },
				vl = { x:0.5, y:0.5, z:0.5 },
				result = lerp(v0, v1, 0.5);
			expect(result).to.deep.equal(vl);
		});

	});

	describe('flattenTriangles', () => {

		it('transforms an array of 2 triangles into an array of 18 coordinates', () => {
			let v0 = { x:1, y:2, z:3 },
				v1 = { x:4, y:5, z:6 },
				v2 = { x:7, y:8, z:9 },
				triangles = [ [v0, v1, v2], [v0, v1, v2] ],
				expectedLength = 3 * triangles[0].length * triangles.length;
			let result = flattenTriangles(triangles);
			expect(result).to.have.length(expectedLength);
		});

	});

});
