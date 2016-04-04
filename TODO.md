
# Concurrency Notes

- modeler.js coordinates all the steps in generating a `Geometry`
	1. Flatten pixel arrays into single contiguous array
	2. Threshold pixel values in array based on WW/WC
	3. Generate triangle arrays via Marching Cubes
	4. Generate `Geometry` object from triangle arrays
	5. (OPTIONAL) Subdivide `Geometry`
- each step is performed in sequence, worker passes a message back on completion
	- these steps could use subworkers to report back to modeler.js
- modeler.js will aggregate the results of all steps and produces a final `Geometry` object

## Other Performance Issues

- Considerable performance loss potential during pixel array manipulation
	- `DicomFile` stores an Array of TypedArrays representing pixel data
		- Already stores the data buffer, which can be cast into TypedArray "views"?
	- Each TypedArray must be:
		- Thresholded to a given WW/WC
		- Padded and downsampled (optional)
		- Flattened

## Worker scripts

- marchingCubes.js
	- Needs `THREE/Vector.js`

- buildGeometry.js
	- Needs `THREE/Geometry.js`

- loopSubdivision.js
	- Needs `THREE/Geometry.js`

- will need copies of `THREE` source files

# FLUX Refactor Notes

- Ensure that all JSX components rely on passing props downwards to children and
rendering based on props.

- FileReader -> FileStore
	- Processes DICOM files and maintains File state
- Modeler -> GeometryStore
	- Processes and maintains `Geometry` instances for meshes
	- ThreeWindow+Renderer would generate the THREE.Mesh provided from the Store's Geometry
- Processor -> ImageStore
	- Processes and maintains images from DICOM files (from FileStore?)
- CaseStore
	- Maintains a "project/session" file
	- Serializes info that tracks:
		- DICOM File used
		- Image processor settings last used (WW/WC)
		- Geometry
		- STL outputs
