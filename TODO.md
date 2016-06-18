# TODO

## Issue 10: Generate implants

- Determine how to apply matrix values
- Determine how to apply scale to volume
- Ensure camera controls rotate all objects
	- Object Group?  Rotate group?
- For superior performance, lets ditch animation; will mean ditching orbit control?

### Progress

- Implants are being displayed, but position is incorrect.
	- Likely need to normalize the coordinate space between the generated volume and implant file
	- Will need to do this before applying the matrix (would be totally fucked looking)


### Extra fixes:

- Determine how to store as much geometry information in Session as possible
- Optimize the "re-loading" of the ThreeWindow Scene objects

## Future Considerations

- Can we use LUT to eliminate the Window-Level modification steps?
	- CS uses LUT ranges, stored in their analysis files
	- How can we use LUT in the 3d display?
