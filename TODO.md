# TODO

- ThreeWindow has the dicomFile reference
	- Handler methods pass the dicomFile data into the appropriate

- #31 Re-implement thresholding to allow wide range of values; windowMin becomes
	isolevel, anything above windowMax is pinned to zero (black)

- Implement componentDidUnmount for ThreeWindow to unload all renderer elements

- Implement asynchronous marching of cubes ;)

- Implement optional transparency for volumeMesh

# Observed issues:

- Apparently the full data set causes a crash - why??
	- Memory usage?
	- CPU usage?



## BACKLOG

- Refactor into a Flux architecture?

### Serializer
- Add unit tests for STLSerializer
- Set up separate node project
- Package and upload to github
