
# Concurrency Notes

- modeler.js coordinates all the steps in generating a `Geometry`.
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

- FileReader -> FileStore
	- Processes DICOM files and maintains File state
- Modeler -> GeometryStore
	- Processes and maintains `Geometry` instances for meshes
	- ThreeWindow+Renderer would generate the mesh provided from the Store
- Processor -> ImageStore
	- Processes and maintains images from DICOM files (from FileStore?)
- CaseStore
	- Maintains a "project/session" file
	- Serializes info that tracks:
		- DICOM File used
		- Image processor settings last used (WW/WC)
		- Geometry
		- STL outputs
