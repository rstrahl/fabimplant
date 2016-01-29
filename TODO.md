# TODO.md

## Creating a 3D Model from Pixel Data

- Pixel data arrays are calculated on the fly as they're being displayed.
- Once a proper WL/WC value is set, the entire dataset is processed and pixelarrays is set
- Pixelarrays will still be in RGB format however; we want it in a flat array?

### Converting imagedata pixel array into a pixel grid

Pixel arrays are RGB format; these need to be translated into a single value (the isovalue)
that will be used in the next step - generating the mesh via the Marching Cubes Algorithm.

```javascript
/**
 * Collapses a pixel array of a specified number of color channels, down to an
 * array of true/false values that reflect whether the pixel at the plane location
 * is occupied.
 */
function pixelArrayToPlaneArray(pixelArray, colourChannels) {
	let gridArray = [];
	for (let i = 0; i < pixelArray.length; i += colourChannels) {
		let gridValue = (pixelArray[i] > 0) ? true : false;
		gridArray.push[gridValue];
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

In order to apply the algorithm, we need to define a cube size in units, and the geometric
domain of the cube vertices.



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
