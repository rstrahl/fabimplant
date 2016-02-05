import { chai, expect } from 'chai';
import { getAxisRange, resampleVolumeData, generateScaffold } from '../marchingCubes';

describe('getAxisRange', () => {

	it('returns the correct min/max for length=1 step=1', () => {
		let range = getAxisRange(1, 1);
		expect(range[0]).to.equal(0);
	});

	it('returns the correct min/max for length=4 step=1', () => {
		let range = getAxisRange(4, 1);
		expect(range[0]).to.equal(-1.5);
	});

	it('returns the correct min/max for length=4 step=3', () => {
		let range = getAxisRange(4, 3);
		expect(range[0]).to.equal(-4.5);
	});

	it('returns the correct min/max for length>1 step=>1', () => {
		let range = getAxisRange(2, 0.5);
		expect(range[0]).to.equal(-0.25);
	});

	it('returns the correct min/max for length=4 step<1', () => {
		let range = getAxisRange(4, 0.5);
		expect(range[0]).to.equal(-0.75);
	});
});

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

describe('resampleVolumeData', () => {
	let width,
		height,
		depth,
		size,
		data4x4,
		newVolume;

	beforeEach( () => {
		width = 4;
		height = 4;
		depth = 4;
		size = width * height * depth;

		data4x4 = new Uint8Array(size);
		for (let i = 0; i < size; i++) {
			data4x4[i] = i;
		}
		newVolume = resampleVolumeData(data4x4, width, height, depth);
	});

	it('reduces the volume size by half on each dimension', () => {
		let newSize = (width/2) * (height/2) * (depth/2);
		expect(newVolume.data.length).to.equal(newSize);
	});

	it('contains the proper values after reduction', () => {
		expect(Array.from(newVolume.data)).to.eql([0,2,8,10,32,34,40,42]);
	});
});
