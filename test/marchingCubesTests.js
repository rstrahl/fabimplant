import { expect } from 'chai';
import { getAxisRange, flattenPixelArrays, resampleVolumeData, resamplePixelArray,
	normalizePixelArray, generateScaffold } from '../marchingCubes';

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
		volume;

	before( () => {
		width = 4;
		height = 4;
		depth = 4;
		size = width * height * depth;

		data4x4 = new Uint8Array(size);
		for (let i = 0; i < size; i++) {
			data4x4[i] = i;
		}
		volume = resampleVolumeData(data4x4, width, height, depth);
	});

	it('reduces the volume size by half on each dimension', () => {
		let newSize = (width/2) * (height/2) * (depth/2);

		expect(volume.data.length).to.equal(newSize);
	});

	it('contains the proper values after reduction', () => {
		expect(Array.from(volume.data)).to.eql([0,2,8,10,32,34,40,42]);
	});

});

describe('resamplePixelArray', () => {
	let width,
		height,
		size,
		pixelArray;

	beforeEach( () => {
		width = 8;
		height = 8;
		size = width * height;
		pixelArray = new Uint8Array(size);
		for (let i = 0; i < size; i++) {
			pixelArray[i] = i+1;
		}
	});

	it('reduces the volume size by a factor of 2', () => {
		let factor = 2,
			newSize = (width/factor) * (height/factor),
			resampledArray = resamplePixelArray(pixelArray, width, height, factor);
		expect(resampledArray.data.length).to.equal(newSize);
	});

	it('contains the correct values after resampling by a factor of 2', () => {
		let factor = 2,
			resampledArray = resamplePixelArray(pixelArray, width, height, factor);
		expect(Array.from(resampledArray.data)).to.eql([1,3,5,7,17,19,21,23,33,35,37,39,49,51,53,55]);
	});

	it('reduces the volume size by a factor of 4', () => {
		let factor = 4,
			newSize = (width/factor) * (height/factor),
			resampledArray = resamplePixelArray(pixelArray, width, height, factor);
		expect(resampledArray.data.length).to.equal(newSize);
	});

	it('contains the correct values after resampling by a factor of 4', () => {
		let factor = 4,
			resampledArray = resamplePixelArray(pixelArray, width, height, factor);
		expect(Array.from(resampledArray.data)).to.eql([1,5,33,37]);
	});

	it('reports the correct width after resampling by a factor of 4', () => {
		let factor = 4,
			resampledArray = resamplePixelArray(pixelArray, width, height, factor);
		expect(resampledArray.width).to.equal(2);
	});

	it('reports the correct height after resampling by a factor of 4', () => {
		let factor = 4,
			resampledArray = resamplePixelArray(pixelArray, width, height, factor);
		expect(resampledArray.height).to.equal(2);
	});

	it('implies the array has square dimensions if width and height parameters are missing', () => {
		let factor = 2,
			newSize = (width/factor) * (height/factor),
			resampledArray = resamplePixelArray(pixelArray);
		expect(resampledArray.data.length).to.equal(newSize);
	});

	it('assumes to resample by a factor of 2 if no factor parameter is provided', () => {
		let resampledArray = resamplePixelArray(pixelArray, width, height);
		expect(Array.from(resampledArray.data)).to.eql([1,3,5,7,17,19,21,23,33,35,37,39,49,51,53,55]);
	});

	it('returns an empty array if the factor exceeds its square root', () => {
		let factor = Math.sqrt(pixelArray.length)+1,
			resampledArray = resamplePixelArray(pixelArray, width, height, factor);
		expect(Array.from(resampledArray.data)).to.eql([]);
	});

});

describe('flattenPixelArrays', () => {

	it('converts an Array of Arrays into a one contiguous Array', () => {
		let multiArray = [[1,2,3],[4,5]];
		let volume = flattenPixelArrays(multiArray, 3, 2);
		expect(Array.from(volume.data)).to.eql([1,2,3,4,5]);
	});

	it('converts an Array of TypedArrays into one contiguous Array', () => {
		let multiTypedArray = [new Uint8Array([1, 2, 3]), new Uint8Array([4,5])];
		let volume = flattenPixelArrays(multiTypedArray, 3, 2);
		expect(Array.from(volume.data)).to.eql([1,2,3,4,5]);
	});
});

describe('normalizePixelArray', () => {
	let oddArray;

	beforeEach( () => {
		oddArray = [1,2,3,4,5,6];
	});

	it('normalizes an uneven height array', () => {
		let normalizedArray = normalizePixelArray(oddArray, 2, 3);
		expect(Array.from(normalizedArray.data)).to.eql([1,2,3,4]);
	});

	it('normalizes an uneven width array', () => {
		let normalizedArray = normalizePixelArray(oddArray, 3, 2);
		expect(Array.from(normalizedArray.data)).to.eql([1,2,4,5]);
	});

	it('normalizes an uneven height and width array', () => {
		let veryOddArray = [1,2,3,4,5,6,7,8,9],
			normalizedArray = normalizePixelArray(veryOddArray, 3, 3);
		expect(Array.from(normalizedArray.data)).to.eql([1,2,4,5]);
	});

	it('reports the correct new height for an normalized array', () => {
		let normalizedArray = normalizePixelArray(oddArray, 2, 3);
		expect(normalizedArray.height).to.equal(2);
	});

	it('reports the correct new width for an normalized array', () => {
		let normalizedArray = normalizePixelArray(oddArray, 3, 2);
		expect(normalizedArray.width).to.equal(2);
	});

	it('does not normalize an already normalized array', () => {
		let normalizedArray = normalizePixelArray([1,2,3,4], 2, 2);
		expect(Array.from(normalizedArray.data)).to.eql([1,2,3,4]);
	});

	it('repots the correct width for an already normalized array', () => {
		let normalizedArray = normalizePixelArray([1,2,3,4], 2, 2);
		expect(normalizedArray.width).to.equal(2);
	});

	it('repots the correct height for an already normalized array', () => {
		let normalizedArray = normalizePixelArray([1,2,3,4], 2, 2);
		expect(normalizedArray.height).to.equal(2);
	});

});
