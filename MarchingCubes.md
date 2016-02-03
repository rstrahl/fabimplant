# Implementing Marching Cubes

## Creating a 3D Model from Pixel Data

- Pixel data arrays are calculated on the fly as they're being displayed.
- Once a proper WL/WC value is set, the entire dataset is processed and pixelarrays is set
- Pixelarrays will still be in RGB format however; we want it in a flat array?

### Converting imagedata pixel array into a pixel grid

Pixel arrays are RGB format; these need to be translated into a single value (the isovalue)
that will be used in the next step - generating the mesh via the Marching Cubes Algorithm.

```javascript
/**
 * Collapses an array of pixel data arrays of a specified number of color channels,
 * down to an array of true/false values that reflect whether the pixel at the plane
 * location is occupied.
 *
 * @param  {TypedArray} an array of arrays containing pixel colour values
 * @param  {integer} colourChannels the number of colour channels used in the pixel data
 * @return {Array} a flattened array containing all pixel arrays in sequence
 */
function flattenPixelArrays(pixelArrays, colourChannels) {
	let gridArray = [];
	for (let i = 0; i < pixelArrays.length; i += 1) {
		let pixelArray = pixelArrays[i];
		for (let j = 0; j < pixelArray.length; j += colourChannels) {
			// For this purpose we can assume the pixel data is grayscale
			//  and only need to sample one of the colour channels for presence
			let gridValue = (pixelArray[i] > 0) ? true : false;
			gridArray.push[gridValue];
		}
	}
	return gridArray;
}
```

### Marching Cube-ify

Source:
[Paul Bourke's Paper on "Polygonising a scalar field"](http://paulbourke.net/geometry/polygonise)

TL;DR: the Marching Cubes Algorithm accepts a set of scalar values and creates
a set of vertices that represent a 3d model (called an [isosurface](a name="Isosurface").

Our previous step already set the isovalues of our image data.

In order to apply the algorithm, we need to define the grid resolution of the
cube in units, the geometric domain of that grid, the volumetric data, and the isolevel
normalized to the volumetric data domain.

This function accepts a `resolution` and `domain` and creates the cubic grid around
the origin 0,0 for simplicity.

```javascript
/**
 * Generates the vertices of the Cube structure used in the algorithm.
 *
 * @param {number} resolution the resolution of the cube in grid units
 * @param {number} range the geometric coordinate range of the cube; if no value
 * is specified will default to 1.0
 */
export function calculateGridCube(resolution, range) {
	// TODO: REQUIRES UNIT TEST
	let min = -range / 2;
	let cubeVertices = [];
	for (let k = 0; k < resolution; k++) {
		for (let j = 0; j < resolution; j++) {
			for (let i = 0; i < resolution; i++) {
				let x = min + range * i / (resolution - 1);
				let y = min + range * j / (resolution - 1);
				let z = min + range * k / (resolution - 1);
				cubeVertices.push(new THREE.Vector3(x,y,z));
			}
		}
	}
	return cubeVertices;
}

```

This is acceptable as long as the sample data is cubic; that is all dimensions are of
equal length.  But we cannot guarantee that with imaging data.  





**TODO:** (next - marching through the cube sections)

Noteworthy: the threejs examples convert the original multi-dimensional array to
a `TypedArray` for performance reasons. (linkage?)


### Terminology

- <a name="Isosurface"></a>**Isosurface**: A 3D model that represents a set of volumetric data. See https://en.wikipedia.org/wiki/Isosurface for full details.
- <a name="Isolevel"></a>**Isolevel**: Defines a value that indicates whether an isovalue is considered inside
or outside the isosurface.
- <a name="Isovalue"></a>**Isovalue**: The pixel value translated into the domain of the Isolevel.

---

# DEPRECATED

### Voxel Calculation:
We use the PixelSpacing element [00280030] (row,col) in mm to calculate the X,Y spacing of the mesh.
Also use the SliceSpacing element [00180088] in mm to calculate Z spacing (or 0 if element is absent).

```javascript
let voxelspacing = {
	x: dataset.element[00280030][0],
	y: dataset.element[00280030][1],
	z: dataset.element[00180080]
};
```

### Voxel-to-Euclidean Translation:

```javascript
let delta = (pointA - pointB) * voxelspacing;
let distance = sqrt(delta.x^2 + delta.y^2 + delta.z^2);
```
