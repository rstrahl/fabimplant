# Parallelizing Mesh Generation

The process of generating a `Mesh` from DICOM data is implemented synchronously,
which blocks UI and has the debilitating side-effect of preventing the use of
the Chrome Dev Tools if the process hangs (or crashes) the browser.

The implementation of the process must be made asynchronous and concurrent.

Web Worker threads solve the concurrency problem; functions can be passed into
a worker and be executed in a separate thread, returning data to the main UI thread
upon completion.

## Analysis

There are two modules of functionality in the current implementation involved in
`Mesh` generation: the `Modeler` module and the `MarchingCubes` module.

### Modeler

The `Modeler` module is responsible for coordinating the construction of a `Mesh`
from the data contained in a DICOM file.  It performs the following operations
in sequence:

1. Pad pixel arrays with zero values to support a given factor of downsampling
2. Downsample pixel arrays to a size that does not hang/crash the browser
3. Flatten pixel arrays into single contiguous array
4. Threshold pixel values in array based on WW/WC
5. Generate a `Geometry` object via Marching Cubes
6. (OPTIONAL) Subdivide the `Geometry` surface
7. Generate a `Mesh` object

Steps 1-6 are computationally intensive, and are ideal candidates for assignment
to Workers.  Step 7 is not computationally expensive, and could remain in the
UI thread.

### Marching Cubes Algorithm

The Marching Cubes algorithm itself could be parallelized; while it must iterate
over every vertex that maps to an isovalue, the operations performed on each
iteration can be done without knowledge of the results of any other iteration.

Each iteration consists of the following operations:

1. Find the array indices that compose the cube being evaluated
2. Cache the isovalues at each vertex of the cube
3. Evaluate the isovalue at each vertex against the isolevel and create a lookup bitmask
4. Determine which, if any, edges of the cube are crossed by the isosurface
5. Create an estimated vertex location for each point that crosses an edge
6. Generate a set of triangle facets (vertices + faces) based on the lookup bitmask
7. Add the triangle data to the `Geometry` object.

Once all iterations are complete, the algorithm returns a `Geometry` object
back to the `Modeler` and it generates a `Mesh`.

## Observations

Workers require their own context, so step 7 will require having ThreeJS passed into
it.  Likely not as a module, but as a separate minified file.  Alternatively we
can inline the required functions into the geometry assembly worker; this is less
favourable as it moves away from the coherency of the module dependency graph.

## Conclusions

1. Create a Worker function that coordinates the assembly of a `Geometry` object
2. Refactor marching cubes function to return an array of triangles
3. Refactor out the building of a `Geometry` from triangles array into a separate
	function
4. Refactor the `Mesh` generation code into the `renderingStage` Component
5. Return the `Geometry` from the Worker and pass the `Geometry` to the `renderingStage`
	on completion
