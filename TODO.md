# TODO

## Issue 10: Generate implants

- Create geometry from implants
	- cylinder geometries based on length, radius top/bottom
- Add meshes from geometry to ThreeJS scene
- Determine how to apply matrix values
- Ensure placement of implants is correct
- Ensure camera controls rotate all objects
	- Object Group?  Rotate group?

### Extra fixes:

- Determine how to store as much geometry information in Session as possible
- Optimize the "re-loading" of the ThreeWindow Scene objects

## Future Considerations

- Can we use LUT to eliminate the Window-Level modification steps?
	- CS uses LUT ranges, stored in their analysis files
	- How can we use LUT in the 3d display?
