# Flux Architecture




## Eligible Candidates

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
