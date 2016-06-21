# Normalizing Volume and Implant Coordinate Spaces

The implant data imported from the analysis file sets the position of each
implant within a specific coordinate space. This coordinate space needs to be
normalized with the coordinate space of the generated Volume.

## How is the Implant coordinate space defined?

In the Carestream app, implants are initially placed in the 2d image display
view.  When this data is stored in the analysis file, the position data appears
to be preserved based on that 2d image display coordinate space.

It could be reasoned that a preferable approach to coordinate spaces is to
normalize them to the original 2d image.

## How do we define the Volume coordinate space?

The marching cubes algorithm function is responsible for generating the vertex
points that comprise the Volume shape. Those points are bound by a cube-grid
that is generated as the first step of the algorithm; it defines the number of
cubes along each axis (size) and the distance between cube vertices (step).

Ideally when rendering a Volume, the cube-grid should be bound by the DICOM
image's dimensions; pixel width, pixel height, and image count depth. The
current implementation conforms to this approach.
