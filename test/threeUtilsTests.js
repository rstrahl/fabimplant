import { expect } from 'chai';
import {
	getAxisRange,
	flattenPixelArrays,
	padPixelArray,
	resamplePixelArray,
	normalizeUpPixelArray,
	findNextHighestValueForFactor,
	emptyPixelArray
} from '../src/three/utils';

describe('utils.js', () => {

	describe('getAxisRange', () => {

		it('returns the correct min/max for length=1 step=1', () => {
			let range = getAxisRange(1, 1);
			expect(range[0])
				.to.equal(0);
		});

		it('returns the correct min/max for length=4 step=1', () => {
			let range = getAxisRange(4, 1);
			expect(range[0])
				.to.equal(-1.5);
		});

		it('returns the correct min/max for length=4 step=3', () => {
			let range = getAxisRange(4, 3);
			expect(range[0])
				.to.equal(-4.5);
		});

		it('returns the correct min/max for length>1 step=>1', () => {
			let range = getAxisRange(2, 0.5);
			expect(range[0])
				.to.equal(-0.25);
		});

		it('returns the correct min/max for length=4 step<1', () => {
			let range = getAxisRange(4, 0.5);
			expect(range[0])
				.to.equal(-0.75);
		});
	});

	describe('padPixelArray', () => {

		it('pads a 1x1 array with 0s', () => {
			let paddedArray = padPixelArray([99], 1, 1);
			expect(paddedArray)
				.to.eql([0, 0, 0, 0, 99, 0, 0, 0, 0]);
		});

		it('pads a 1x2 array with 0s', () => {
			let paddedArray = padPixelArray([99, 98], 2, 1);
			expect(paddedArray)
				.to.eql([0, 0, 0, 0, 0, 99, 98, 0, 0, 0, 0, 0]);
		});

		it('pads a 2x1 array with 0s', () => {
			let paddedArray = padPixelArray([99, 98], 1, 2);
			expect(paddedArray)
				.to.eql([0, 0, 0, 0, 99, 0, 0, 98, 0, 0, 0, 0]);
		});

		it('pads a 2x2 array with 0s', () => {
			let paddedArray = padPixelArray([99, 98, 1, 2], 2, 2);
			expect(paddedArray)
				.to.eql([0, 0, 0, 0, 0, 99, 98, 0, 0, 1, 2, 0, 0, 0, 0, 0]);
		});

	});

	describe('emptyPixelArray', () => {

		it('returns a zero-filled 1x1 Array', () => {
			let array = emptyPixelArray(1, 1);
			expect(array)
				.to.eql([0]);
		});

		it('returns a zero-filled 1x2 Array', () => {
			let array = emptyPixelArray(1, 2);
			expect(array)
				.to.eql([0, 0]);
		});

		it('returns a zero-filled 2x1 Array', () => {
			let array = emptyPixelArray(2, 1);
			expect(array)
				.to.eql([0, 0]);
		});

		it('returns a zero-filled 3x2 Array', () => {
			let array = emptyPixelArray(3, 2);
			expect(array)
				.to.eql([0, 0, 0, 0, 0, 0]);
		});

	});

	describe('resamplePixelArray', () => {
		let width,
			height,
			size,
			pixelArray;

		beforeEach(() => {
			width = 8;
			height = 8;
			size = width * height;
			pixelArray = new Uint8Array(size);
			for (let i = 0; i < size; i++) {
				pixelArray[i] = i + 1;
			}
		});

		it('reduces a normalized array size by a factor of 2', () => {
			let factor = 2,
				newSize = (width / factor) * (height / factor),
				resampledArray = resamplePixelArray(pixelArray, width, height, factor);
			expect(resampledArray.pixelArray.length)
				.to.equal(newSize);
		});

		it('contains the correct values after resampling by a factor of 2', () => {
			let factor = 2,
				resampledArray = resamplePixelArray(pixelArray, width, height, factor);
			expect(resampledArray.pixelArray)
				.to.eql([1, 3, 5, 7, 17, 19, 21, 23, 33, 35, 37, 39, 49, 51, 53, 55]);
		});

		it('reduces a normalized array size by a factor of 4', () => {
			let factor = 4,
				newSize = (width / factor) * (height / factor),
				resampledArray = resamplePixelArray(pixelArray, width, height, factor);
			expect(resampledArray.pixelArray.length)
				.to.equal(newSize);
		});

		it('contains the correct values after resampling by a factor of 4', () => {
			let factor = 4,
				resampledArray = resamplePixelArray(pixelArray, width, height, factor);
			expect(resampledArray.pixelArray)
				.to.eql([1, 5, 33, 37]);
		});

		it('reports the correct width after resampling by a factor of 4', () => {
			let factor = 4,
				resampledArray = resamplePixelArray(pixelArray, width, height, factor);
			expect(resampledArray.width)
				.to.equal(2);
		});

		it('reports the correct height after resampling by a factor of 4', () => {
			let factor = 4,
				resampledArray = resamplePixelArray(pixelArray, width, height, factor);
			expect(resampledArray.height)
				.to.equal(2);
		});

		it('normalizes and reduces a non-normalized array size by a factor of 4', () => {
			let factor = 4,
				nonNormalWidth = 7,
				nonNormalHeight = 7,
				nonNormalSize = nonNormalWidth * nonNormalHeight,
				newSize = (width / factor) * (width / factor),
				nonNormalArray = new Uint8Array(nonNormalSize),
				resampledArray;
			for (let i = 0; i < size; i++) {
				nonNormalArray[i] = i + 1;
			}
			resampledArray = resamplePixelArray(nonNormalArray, nonNormalWidth, nonNormalHeight, factor);
			expect(resampledArray.pixelArray.length)
				.to.equal(newSize);
		});

		it('implies the array has square dimensions if width and height parameters are missing', () => {
			let factor = 2,
				newSize = (width / factor) * (height / factor),
				resampledArray = resamplePixelArray(pixelArray);
			expect(resampledArray.pixelArray.length)
				.to.equal(newSize);
		});

		it('assumes to resample by a factor of 2 if no factor parameter is provided', () => {
			let resampledArray = resamplePixelArray(pixelArray, width, height);
			expect(resampledArray.pixelArray)
				.to.eql([1, 3, 5, 7, 17, 19, 21, 23, 33, 35, 37, 39, 49, 51, 53, 55]);
		});

	});

	describe('flattenPixelArrays', () => {

		it('converts an Array of Arrays into a one contiguous Array', () => {
			let multiArray = [
					[1, 2, 3, 4, 5, 6],
					[1, 2, 3, 4, 5, 6]
				],
				flatArray = flattenPixelArrays(multiArray, 3, 2);
			expect(flatArray)
				.to.eql([1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6]);
		});

		it('converts an Array of TypedArrays into one contiguous Array', () => {
			let multiTypedArray = [new Uint8Array([1, 2, 3, 4, 5, 6]), new Uint8Array([1, 2, 3, 4, 5, 6])],
				flatArray = flattenPixelArrays(multiTypedArray, 3, 2);
			expect(flatArray)
				.to.eql([1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6]);
		});

	});

	describe('normalizeUpPixelArray', () => {

		it('normalizes array width to factor', () => {
			let oddArray = [1, 2, 3, 4, 5, 6],
				normalizedArray = normalizeUpPixelArray(oddArray, 3, 2, 2);
			expect(normalizedArray.pixelArray)
				.to.eql([1, 2, 3, 0, 4, 5, 6, 0]);
		});

		it('reports the correct width for a normalized array', () => {
			let oddArray = [1, 2, 3, 4, 5, 6],
				normalizedArray = normalizeUpPixelArray(oddArray, 3, 2, 2);
			expect(normalizedArray.width)
				.to.equal(4);
		});

		it('normalizes array height to factor', () => {
			let oddArray = [1, 2, 3, 4, 5, 6],
				normalizedArray = normalizeUpPixelArray(oddArray, 2, 3, 2);
			expect(normalizedArray.pixelArray)
				.to.eql([1, 2, 3, 4, 5, 6, 0, 0]);
		});

		it('reports the correct height for a normalized array', () => {
			let oddArray = [1, 2, 3, 4, 5, 6],
				normalizedArray = normalizeUpPixelArray(oddArray, 2, 3, 2);
			expect(normalizedArray.height)
				.to.equal(4);
		});

		it('does not normalize an already normalized array', () => {
			let normalizedArray = normalizeUpPixelArray([1, 2, 3, 4], 2, 2, 2);
			expect(normalizedArray.pixelArray)
				.to.eql([1, 2, 3, 4]);
		});

		it('reports the correct width for an already normalized array', () => {
			let normalizedArray = normalizeUpPixelArray([1, 2, 3, 4], 2, 2, 2);
			expect(normalizedArray.width)
				.to.equal(2);
		});

		it('reports the correct height for an already normalized array', () => {
			let normalizedArray = normalizeUpPixelArray([1, 2, 3, 4], 2, 2, 2);
			expect(normalizedArray.height)
				.to.equal(2);
		});

	});

	describe('findNextHighestValueForFactor', () => {

		it('finds the next highest factor of 2 from 1', () => {
			let value = 1,
				factor = 2,
				nextValue = findNextHighestValueForFactor(value, factor);
			expect(nextValue)
				.to.equal(2);
		});

		it('finds the next highest factor of 3 from 1', () => {
			let value = 1,
				factor = 3,
				nextValue = findNextHighestValueForFactor(value, factor);
			expect(nextValue)
				.to.equal(3);
		});

		it('finds the next highest factor of 2 from 3', () => {
			let value = 3,
				factor = 2,
				nextValue = findNextHighestValueForFactor(value, factor);
			expect(nextValue)
				.to.equal(4);
		});

		it('finds the next highest factor of 4 from 5', () => {
			let value = 5,
				factor = 4,
				nextValue = findNextHighestValueForFactor(value, factor);
			expect(nextValue)
				.to.equal(8);
		});

	});

});
