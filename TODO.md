# Concurrency

**Next Steps:**
- in `polyonize()` can we remove the dependency on Vector3 and store primitive values?
	- would require manual lerp function
	- returns a typedarray of vertices? (sequenced per coordinate element: x,y,z,x2,y2,z2,...)
- in `default` can we flatten the vertex array?

- How to speed up the data transfer from the worker????

## Other Performance Issues

- Considerable performance loss potential during pixel array manipulation
	- `DicomFile` stores an Array of TypedArrays representing pixel data
		- Already stores the data buffer, which can be cast into TypedArray "views"?
		- Can we simply crunch down the TypedArrays?
	- Each TypedArray must be:
		- Thresholded to a given WW/WC
		- Padded and downsampled (optional)
		- Flattened

## Workers

- geometryWorker.js
	- accepts volume data and parameters
	- returns a `THREE.Geometry` object

- loopSubdivision.js (NEW)
	- Needs `THREE/Geometry.js`
	- Currently a class implementation; needs to be pure functions
	- Should accept a geometry, and return a new geometry

- volumeWorker.js (NEW)
	- Refactor to define anonymous object
	- Offer method to calculate volume from given data and dims
	- Supports

## FUTURE WORKERS

- dicomParsing?
-
