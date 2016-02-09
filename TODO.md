# TODO

## P1
- Add slider controls:
	- Image selection
	- isolevel
	- Window width/center
	- Resample factor
- Add controls for moving Mesh
	- Controls are toggled between move scene and move mesh?
- Refactor out the THREE.js geometry creation/management code from jsx into module
- Clean up marchingCubes.js and marchingCubesTests.js
- Second draft smoothing
	- Re-implement thresholding to allow wide range of values; allows removal of artifacts

## BACKLOG
- UI Graphics for Camera Mode changing
- Apply proper project structure (ie- js/, vendor/, etc.)
- Refactor into a Flux architecture?
- Add proper logging facility
- Refactor dicomFile out of using `class` and into Factory (constructor style)
- Add unit tests for processor.js

### Serializer
- Add unit tests for STLSerializer
- Set up separate node project
- Package and upload to github
