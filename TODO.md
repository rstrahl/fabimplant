# TODO

current task: get sliders on image window working for WW/WC

- Add sliders
- Integrate sliders with modifying WW/WC
- Updates WW/WC numbers accurately
- Updates WW/WC value on DicomFile



- Second draft smoothing (blocked by window width/center controls)
	- Re-implement thresholding to allow wide range of values; windowMin becomes
		isolevel, anything above windowMax is pinned to zero (black)?

## BACKLOG

- Refactor into a Flux architecture?

### Serializer
- Add unit tests for STLSerializer
- Set up separate node project
- Package and upload to github
