# TODO

## P1
- Fix issue with > 2 downsampling
- Change approach to thresholding:
	- Remove direct thresholding before marching cubes
	- Use window levels as isolevel?

## BACKLOG
- Refactor out the THREE.js geometry creation/management code from jsx into module
- Apply proper project structure (ie- js/, vendor/, etc.)
- Refactor into a Flux architecture?
- Add proper logging facility
- Refactor dicomFile out of using `class` and into Factory (constructor style)
- Add unit tests for processor.js

Serializer
- Add unit tests for STLSerializer
- Set up separate node project
- Package and upload to github
