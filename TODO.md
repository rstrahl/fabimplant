# TODO

## Concurrency

1. Optimize the code within the Geometry Worker
	- in `polygonize()` can we remove the dependency on Vector3 and store primitive values?
		- would require manual lerp function
		- returns a TypedArray of vertices? (sequenced per coordinate element: x,y,z,x2,y2,z2,...)
	- in `default` can we flatten the vertex array?
		- yes: i % 3 = a single vertex, i % 9 = a single triangle

2. Optimize the passing of Geometry data from the Worker back to Main
	- Refactor the BuildGeometry code back to the main thread for now
	- Worker should return a sequence TypedArray rather than an object
	- OPTIONAL: Consider returning incremental pieces of data from Worker in a progress handler
		- Speed difference betwen `mergeGeometry` on chunks vs. just building the
			geometry in one single pass on the main thread

## Other Performance Issues

- Considerable performance loss potential during pixel array manipulation
	- `DicomFile` stores an Array of TypedArrays representing pixel data
		- Already stores the data buffer, which can be cast into TypedArray "views"?
		- Can we simply crunch down the TypedArrays?
	- Each TypedArray wpuld be:
		- Thresholded to a given WW/WC
		- Padded and downsampled (optional)
		- Flattened into a sequence

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
- imageLoading?
