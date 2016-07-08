# TODO

## Issue 10: Generate implants

1. Normalize coordinate space between Volume and Implants
2. Determine how to apply scale to Mesh Group
	- Scale is determined from DICOM metadata
3. Correct camera controls
 	- Applies rotation transform to Mesh Group, not entire Scene (orbit controls)

### Progress

1. Normalize coordinate space between Volume and Implants
	- Scaling to restore subject to original sizing should happen at the geometry level
	- Implant positions still appear to be off slightly - why???
		- Carestream validation:
			- What is the cartesian origin?
			- Is the implant matrix based on the center of the implant geometry?
	- Implant sizes still appear to be off significantly - why???

### Extra fixes:

- Determine how to store as much geometry information in Session as possible
- Optimize the "re-loading" of the ThreeWindow Scene objects\
- Optimize performance of Three rendering; remove animation calls?

## Future Considerations

- Can we use LUT to eliminate the Window-Level modification steps?
	- CS uses LUT ranges, stored in their analysis files
	- How can we use LUT in the 3d display?
		- Multiple passes generating separate objects for each material?
