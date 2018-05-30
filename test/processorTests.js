import { expect } from 'chai';
import { rescalePixelValueByModality } from '../src/lib/dicom/processor';

describe('processor.js', () => {

	describe('rescalePixelValueByModality', () => {

		it('successfully tests a slope and intercept of 1,0 (identity)', () => {
			let slope = 1,
				intercept = 0,
				value = 2;
			let rescaleValue = rescalePixelValueByModality(value, slope, intercept);
			expect(rescaleValue).to.equal(2);
		});

		it('successfully tests a positive slope of 1,1', () => {
			let slope = 1,
				intercept = 1,
				value = 2;
			let rescaleValue = rescalePixelValueByModality(value, slope, intercept);
			expect(rescaleValue).to.equal(3);
		});

		it('successfully tests a negative slope of -1,1', () => {
			let slope = -1,
				intercept = 1,
				value = 2;
			let rescaleValue = rescalePixelValueByModality(value, slope, intercept);
			expect(rescaleValue).to.equal(-1);
		});

	});

});
