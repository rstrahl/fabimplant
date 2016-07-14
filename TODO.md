# TODO

## Issue 10: Generate implants

1. Normalize coordinate space between Volume and Implants (relational scale and position)
	- DONE?
2. Determine how to apply scale to Mesh Group
	- Scale is determined from DICOM metadata
3. Correct camera controls
 	- Applies rotation transform to Mesh Group, not entire Scene (orbit controls)

### Extra fixes:

- Determine how to store as much geometry information in Session as possible
- Optimize the "re-loading" of the ThreeWindow Scene objects
- Optimize performance of Three rendering; remove animation calls?

## Future Considerations

- Can we use LUT to eliminate the Window-Level modification steps?
	- CS uses LUT ranges, stored in their analysis files
	- How can we use LUT in the 3d display?
		- Multiple passes generating separate objects for each material?
