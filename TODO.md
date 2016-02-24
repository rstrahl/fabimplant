# TODO

- modeler default function needs renaming
	- isosurface(): accepts a thresholded volume, step, isolevel and provides a Mesh
	- consider using "Transparent" mesh

- ThreeWindow has the dicomFile reference
	- Handler methods pass the dicomFile data into the appropriate
	- Add vertex and faces display to threewindow

- Implement componentDidUnmount for ThreeWindow to unload all renderer elements
- Implement asynchronous marching of cubes ;)

# Observed issues:
- Apparently the full data set causes a crash - why??
	- Memory usage?
	- CPU usage?

- ThreeWindow uses the minWidth as the isolevel, the maxWidth as the maximum pixel value
	- #31 Re-implement thresholding to allow wide range of values; windowMin becomes
		isolevel, anything above windowMax is pinned to zero (black)



## BACKLOG

- Refactor into a Flux architecture?

### Serializer
- Add unit tests for STLSerializer
- Set up separate node project
- Package and upload to github
