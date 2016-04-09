# Concurrency

**Next Steps:**
- modeler.js now deprecated
	- Move the mesh generation into renderingStage
	- Move the "volumizer" functions out to another Worker
	- 


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
