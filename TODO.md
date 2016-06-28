# TODO

## Issue 10: Generate implants

1. Normalize coordinate space between Volume and Implants
2. Determine how to apply scale to Mesh Group
	- Scale is determined from DICOM metadata
3. Correct camera controls
 	- Applies rotation transform to Mesh Group, not entire Scene (orbit controls)

### Progress

1. Normalize coordinate space between Volume and Implants
	- Update modeling to generate ranges that are not pre-translated and verify results
	- Apply Matrix to Implant object instance and verify results
	- Perform translation on mesh group to center of scene based on Volume center and verify results

### Extra fixes:

- Determine how to store as much geometry information in Session as possible
- Optimize the "re-loading" of the ThreeWindow Scene objects\
- Optimize performance of Three rendering; remove animation calls?

## Future Considerations

- Can we use LUT to eliminate the Window-Level modification steps?
	- CS uses LUT ranges, stored in their analysis files
	- How can we use LUT in the 3d display?
		- Multiple passes generating separate objects for each material?
