# TODO

- Finish debug button in ImageWindow
	- Toggles display of debug window
- Fix styling/layout for sliders in ImageWindow (use standard size display)
- Re-add camera code to ThreeWindow and hookup to toggle (#16)

- ThreeWindow uses the minWidth as the isolevel, the maxWidth as the maximum pixel value
	- #31 Re-implement thresholding to allow wide range of values; windowMin becomes
		isolevel, anything above windowMax is pinned to zero (black)?



## BACKLOG

- Refactor into a Flux architecture?

### Serializer
- Add unit tests for STLSerializer
- Set up separate node project
- Package and upload to github
