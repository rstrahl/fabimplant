# TODO

## BACKLOG
- UI: Add slider controls:
	- Create slider control
	- ImageWindow.jsx:
		- Image selection
		- Window width/center
	- ThreeWindow.jsx:
		- Isolevel
		- Resample factor
- Return controls for moving Mesh
	- Add toggle button to select between move scene and move mesh?
- UI: Create button icons for Camera Mode
- DEBT: Refactor out the THREE.js geometry creation/management code from jsx into module
- DEBT: Clean up marchingCubes.js and marchingCubesTests.js
- DEBT: Apply proper project structure (ie- js/, vendor/, etc.)
- Refactor into a Flux architecture?
- Add proper logging facility
- DEBT: Refactor dicomFile out of using `class` and into Factory (constructor style)
- Add unit tests for processor.js
- UI: Add workflow transitions
- UI: Add activity spinners
- Second draft smoothing (blocked by window width/center controls)
	- Re-implement thresholding to allow wide range of values; windowMin becomes
		isolevel, anything above windowMax is pinned to zero (black)?

### Serializer
- Add unit tests for STLSerializer
- Set up separate node project
- Package and upload to github
