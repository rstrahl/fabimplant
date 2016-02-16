import { expect } from 'chai';
import { getAxisRange, flattenPixelArrays, resamplePixelArray,
	normalizeDownPixelArray, normalizeUpPixelArray } from '../src/three/utils';

describe('utils.js', () => {

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

		it('reduces a normalized array size by a factor of 2', () => {
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

		it('reduces a normalized array size by a factor of 4', () => {
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

		it('normalizes and reduces a non-normalized array size by a factor of 4', () => {
			let factor = 4,
				nonNormalWidth = 7,
				nonNormalHeight = 7,
				nonNormalSize = nonNormalWidth * nonNormalHeight,
				newSize = (width/factor) * (height/factor),
				nonNormalArray = [],
				resampledArray;
			for (let i = 0; i < nonNormalSize; i += 1) {
				nonNormalArray.push(i+1);
			}
			resampledArray = resamplePixelArray(nonNormalArray, nonNormalWidth, nonNormalHeight, factor);
			expect(resampledArray.data.length).to.equal(newSize);
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

	describe('normalizeDownPixelArray', () => {
		let oddArray;

		beforeEach( () => {
			oddArray = [1,2,3,4,5,6];
		});

		it('normalizes an uneven height array', () => {
			let normalizedArray = normalizeDownPixelArray(oddArray, 2, 3);
			expect(Array.from(normalizedArray.data)).to.eql([1,2,3,4]);
		});

		it('normalizes an uneven width array', () => {
			let normalizedArray = normalizeDownPixelArray(oddArray, 3, 2);
			expect(Array.from(normalizedArray.data)).to.eql([1,2,4,5]);
		});

		it('normalizes an uneven height and width array', () => {
			let veryOddArray = [1,2,3,4,5,6,7,8,9],
				normalizedArray = normalizeDownPixelArray(veryOddArray, 3, 3);
			expect(Array.from(normalizedArray.data)).to.eql([1,2,4,5]);
		});

		it('reports the correct new height for an normalized array', () => {
			let normalizedArray = normalizeDownPixelArray(oddArray, 2, 3);
			expect(normalizedArray.height).to.equal(2);
		});

		it('reports the correct new width for an normalized array', () => {
			let normalizedArray = normalizeDownPixelArray(oddArray, 3, 2);
			expect(normalizedArray.width).to.equal(2);
		});

		it('does not normalize an already normalized array', () => {
			let normalizedArray = normalizeDownPixelArray([1,2,3,4], 2, 2);
			expect(Array.from(normalizedArray.data)).to.eql([1,2,3,4]);
		});

		it('repots the correct width for an already normalized array', () => {
			let normalizedArray = normalizeDownPixelArray([1,2,3,4], 2, 2);
			expect(normalizedArray.width).to.equal(2);
		});

		it('repots the correct height for an already normalized array', () => {
			let normalizedArray = normalizeDownPixelArray([1,2,3,4], 2, 2);
			expect(normalizedArray.height).to.equal(2);
		});

	});

	describe('normalizeUpPixelArray', () => {

		it('normalizes array width to factor', () => {
			let oddArray = [1,2,3,4,5,6];
			let normalizedArray = normalizeUpPixelArray(oddArray, 3, 2, 2);
			expect(Array.from(normalizedArray.data)).to.eql([1,2,3,0,4,5,6,0]);
		});

		it('reports the correct width for a normalized array', () => {
			let oddArray = [1,2,3,4,5,6];
			let normalizedArray = normalizeUpPixelArray(oddArray, 3, 2, 2);
			expect(normalizedArray.width).to.equal(4);
		});

		it('normalizes array height to factor', () => {
			let oddArray = [1,2,3,4,5,6];
			let normalizedArray = normalizeUpPixelArray(oddArray, 2, 3, 2);
			expect(Array.from(normalizedArray.data)).to.eql([1,2,3,4,5,6,0,0]);
		});

		it('reports the correct height for a normalized array', () => {
			let oddArray = [1,2,3,4,5,6];
			let normalizedArray = normalizeUpPixelArray(oddArray, 2, 3, 2);
			expect(normalizedArray.height).to.equal(4);
		});

		it('does not normalize an already normalized array', () => {
			let normalizedArray = normalizeUpPixelArray([1,2,3,4], 2, 2, 2);
			expect(Array.from(normalizedArray.data)).to.eql([1,2,3,4]);
		});

		it('reports the correct width for an already normalized array', () => {
			let normalizedArray = normalizeUpPixelArray([1,2,3,4], 2, 2, 2);
			expect(normalizedArray.width).to.equal(2);
		});

		it('reports the correct height for an already normalized array', () => {
			let normalizedArray = normalizeUpPixelArray([1,2,3,4], 2, 2, 2);
			expect(normalizedArray.height).to.equal(2);
		});

	});

});
