# TODO

1. Maximize the accuracy of the isosurface
   - Padding the image can result in a "closed" surface? (beneficial)
	   - Add a single pixel of padding with 0 value to "close surface"
		   - must add before and after x, y, z scales
   - Implement the thresholding based on HU value ranges?
	   - Use full spectrum of values, set isolevel to bone values??
   - Remove extraneous/disconnected meshes?
   - May be able to simplify the surfaces: https://github.com/mrdoob/three.js/pull/9159
   - Move to alternate implementation
	   - Naive Surface Nets: https://www.npmjs.com/package/isosurface
	   - Notes: https://0fps.net/2012/07/12/smooth-voxel-terrain-part-2/



2. Determine how to apply scale to Mesh Group
	- Scale is determined from DICOM metadata
3. Correct camera controls
 	- Applies rotation transform to Mesh Group, not entire Scene (orbit controls)

### Extra fixes:

- Determine how to store as much geometry information in Session as possible
	- Sessions should be stored in a web service eventually
- Optimize the "re-loading" of the ThreeWindow Scene objects
- Optimize performance of Three rendering; remove animation calls?
	- Shouldn't be required; with closed meshes perf should be excellent?

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
