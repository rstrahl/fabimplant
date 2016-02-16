import { expect } from 'chai';
import { generateScaffold } from '../src/three/marchingCubes';

describe('marchingCubes.js', () => {

	describe('generateScaffold', () => {

		it('generates a fucking array - suck my dick Chai', () => {
			let scaffold = generateScaffold(3, 3, 3, 1);
			expect(scaffold).to.be.a('array');
		});

		it('generates the correct size for a cube', () => {
			let width = 3,
				height = 3,
				depth = 3,
				scaffold = generateScaffold(width, height, depth, 1);
			expect(scaffold).to.have.length(27);
		});

		it('generates a valid array for a cuboid', () => {
			let width = 3,
				height = 3,
				depth = 4,
				scaffold = generateScaffold(width, height, depth, 1);
			expect(scaffold).to.have.length(36);
		});

	});

});
