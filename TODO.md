# TODO

## Issue 10: Generate implants

- Ensure scale for implants and volume is normalized
- Determine how to apply scale to volume
- Determine how to apply matrix values
- Ensure camera controls rotate all objects
	- Object Group?  Rotate group?
- For superior performance, lets ditch animation; will mean ditching orbit control?

### Progress

- Implants are being displayed, but position and/or rotation angle is incorrect
	- Likely need to normalize the coordinate space between the generated volume and implant file
	- Will need to do this before applying the matrix (would be totally fucked looking)

- Carestream app sets initial implant position looking at image slices (y-axis = image slice index)
	- Implant positions appear to be pixel values on image?



### Extra fixes:

- Determine how to store as much geometry information in Session as possible
- Optimize the "re-loading" of the ThreeWindow Scene objects

## Future Considerations

- Can we use LUT to eliminate the Window-Level modification steps?
	- CS uses LUT ranges, stored in their analysis files
	- How can we use LUT in the 3d display?
