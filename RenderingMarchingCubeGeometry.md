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
