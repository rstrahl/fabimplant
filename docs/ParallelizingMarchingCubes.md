# Parallelizing the Marching Cubes Algorithm

The marching cubes algorithm, as implemented, runs synchronously, which blocks UI
and also prevents Chrome developer tools from being able to profile the algorithm
should something bad happen (like running out of memory).

## Analysis

The algorithm can be parallelized; while it must iterate over every vertex that
maps over an isovalue, the operation performed on each vertex can be done without
knowledge of any other vertex operation.  The vertex operations are performed
in sets that represent a small "cube" of isovalues (hence the algorithm name).

Each operation consists of the following steps:

1. Find the array indices that compose the cube being evaluated
2. Cache the isovalues at each vertex of the cube
3. Evaluate the isovalue at each vertex against the isolevel and create a lookup bitmask
4. Determine which, if any, edges of the cube are crossed by the isosurface
5. Create an estimated vertex location for each point that crosses an edge
	- outputs: cubeindex, vlist
6. Generate a set of triangle facets (vertices + faces) based on the lookup bitmask
	- inputs: cubeindex, triTable, vlist, vertexIndex
7. Add the triangle facet vertices to a Geometry object

Step 1 is already contained in a single method that can be made to be asynchronous.

Steps 2-6 should be able to be refactored out into one unit of work that outputs
a list of triangles; simple objects that contain three vertex definitions.

Step 7 should be able to be refactored into a separate unit of work that assembles
the ThreeJS Geometry object from the list of triangles.

## Web Workers

Worker threads solve the concurrency problem.  They can be passed data to process and
return data back to the main UI thread, which is exactly what we need; offloading
computationally-intensive work.

For the initial move to concurrency, we have to redesign the algorithm to be as
isolated as possible.  Steps 1-6 can be moved into a single worker thread, and
Step 7 would be a separate worker executed afterwards.  

Workers require their own context, so step 7 will require having ThreeJS passed into
it.  Likely not as a module, but as a separate minified file.  Alternatively we
can inline the required functions into the geometry assembly worker.

1. Refactor marching cubes algo to return just an array of triangles
2. assemble geometry from triangles in modeler.js
3. 
