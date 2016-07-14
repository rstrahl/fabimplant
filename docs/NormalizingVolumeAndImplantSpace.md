# Normalizing Volume and Implant Coordinate Spaces

The implant data imported from the analysis file sets the position of each
implant within a specific coordinate space. This coordinate space needs to be
normalized with the coordinate space of the generated Volume.

## How is the Implant coordinate space defined?

The Carestream app initially places Implants in the 2d image display view.  When
this data is stored in the analysis file, the position data appears to be
preserved based on that 2d image display coordinate space.

## How do we define the Volume coordinate space?

The marching cubes algorithm function is responsible for generating the vertex
points that comprise the Volume shape. Those points are bound by a cube-grid
that is generated as the first step of the algorithm; it defines the number of
cubes along each axis (size) and the distance between cube vertices (step).

Ideally when rendering a Volume, the cube-grid should be bound by the DICOM
image's dimensions; pixel width, pixel height, and image count depth. The
current implementation conforms to this approach.

## How do we normalize between coordinate spaces?

If the coordinate spaces are already using the image height/width, then they are
already compatible and no projection mapping needs to be performed.

### Matrix4 Values

The matrix values stored in each Implant field of the analysis file appear to
conform to a `Matrix4` style of data structure.  If this is the case we should
be able to apply the values into a `THREE.Matrix4` object and apply that to
each corresponding Implant `Object3d` instance.

### Resampling Effect

Additionally, because we may be resampling the DICOM volume data we must account
for the effect that down-sampling the data has on the pixel data sizing.  When
we down-sample by a factor of two, we also downsize our dimensions by a factor
of two.

This accounting for down-sampling effect on position should be managed by the
same component that manages the down-sampling state to impose on the data.

> **Note:** In the current implementation, this would be the ThreeWindow react
Component.

An initial method of compensation for this effect will be to set the `step`
value used in the marching cubes algorithm equal to the `factor` value.
