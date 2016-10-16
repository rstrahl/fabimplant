# TODO

1. Maximize the accuracy of the isosurface
	- [x] ~~Padding the image can result in a "closed" surface? (beneficial)~~
	- [x] Optimize utils methods to use TypedArrays and eliminate castings
		- Also consider moving methods to use a concrete data type for better readability
	- [ ] Implement the thresholding based on HU value ranges?
		- Bone WW/WL is typically 200/250
		- Apply a WW/WL and set the isolevel to a given HU
	- [ ] Remove extraneous/disconnected meshes?
		- Likely a manual process, see: http://threejs.org/examples/#webgl_interactive_cubes

2. Evaluate Ray casting
	- Ray cast DICOM volumetric data into 3d Scene
	- Evaluate exporting/converting ray cast 3d into an STL solid

### Extra fixes:

- Determine how to apply scale to Mesh Group
	- Scale is determined from DICOM metadata
- Correct camera controls
	- Applies rotation transform to Mesh Group, not entire Scene (orbit controls)
- Determine how to store as much geometry information in Session as possible
	- Sessions should be stored in a web service eventually
- Optimize the "re-loading" of the ThreeWindow Scene objects
- Optimize performance of Three rendering; remove animation calls?
	- Shouldn't be required; with closed meshes perf should be excellent?

- Move /test/* files into a mirrored structure to /src

## Future Considerations

- Can we use LUT to eliminate the Window-Level modification steps?
	- CS uses LUT ranges, stored in their analysis files
	- How can we use LUT in the 3d display?
		- Multiple passes generating separate objects for each material?


# LUT Notes

- Modality LUT:
	- Translates the manufacturer pixel values into generic values (HU)
	- Using Rescale Slope/Intercept translates a pixel value into HU value
	- Bone is +700 HU and higher

- VOI LUT:
	- Translates the value from the modality into a basic displayable value
	- Is applied _after_ Modality LUT
