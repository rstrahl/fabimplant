# Rendering the Marching Cubes




### Rendering DICOM

DICOM images tend to be > 100x100 in pixel size, which creates a problem for rendering
apparently.  Memory consumption for calculating a size of 276x276x179 image breaks a
browser limit it turns out.

One solution is to reduce the level of detail applied to the volume set; define a
resolution that is less than the pixel size, and sub-sample the volume data into
that resolution.

> ie - if the original image slice was 100*100, it can be resampled down to 50*50 by
taking every second value.

Concept:  define a resolution factor (1 = full, 2 = half, 4...), and apply that as
the a sampling step in a method.  

```javascript
function resample(values, dimensions, resolution) {
	let resampledVolume = new UintArray();
	for (let z = 0; z < dimensions[2]; z += resolution) {
		for (let y = 0; y < dimensions[1]; y += resolution) {
			for (let x = 0; x < dimensions[0]; x += resolution) {
				resampledVolume[n] = values[z*y*x + z*y + z];
			}
		}
	}

}
```

Steps:

1. Reduce the size of the input data to something reasonable
2. Flatten the resulting input data into a single contiguous array

### Observations

Downsampling by a factor of 2 is successful; the dimensions are kept and the results
meet expectations in that the surface is less defined.  However downsampling by a
factor of 4 is unsuccessful; the image is off-center as observed due to incorrect
downsampling of an unevenly-dimensioned area.

Theory: If offset is appearing, that may be a result of attempting to downsample
at a factor that is not "evenly" divisible in terms of width and/or height.
(e.g. for a width of 266, dividing it by 4 equals a result of 66.5)

Either we repeatedly normalize+downsample until we hit the factor desired (not performant)
or we permit normalization as a part of the downsampling process.
