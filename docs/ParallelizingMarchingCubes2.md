# Parallelizing Marching Cubes Part 2

## Observations

The initial implementation of the entire Geometry-building process performs very
poorly for two main reasons:
1. The constant dynamic allocation of Arrays internally - e.g. `Array.prototype.push()`
2. Passing the `Geometry` object back across the Worker boundary to the main
	thread

The second cause impacts application performance the most; the `Geometry` must
be serialized, then copied over the boundary, and deserialized into an _anonymous_
object.  As the `Geometry` loses its typing, it must be re-constructed by the
main thread.  This is very wasteful.

## Conclusions

**Array Optimization**: Optimization of pixel array handling has already been
identified as a major performance problem, and the methods defined in previous
analyses applies; for maximum performance (and portability) the code should be
refined to utilize TypedArray's that are as flat as possible.

**Geometry Object Handling**: In the current state of workers, its unavoidable
that we must construct the `Geometry` on the main UI thread.  Thus the performance
optimizations made should accomplish the following:

- Ensure the geometry data is transmitted to the main UI thread as quickly as possible
- Ensure the geometry is reconstructed as quickly on the main UI thread as quickly as possible

This means changing the implementation of the Worker functions to rely on
sequential TypedArrays.  Note that assembling the `Geometry` on the main thread
includes a call to `mergeVertices()`, which has had blocking effects previously;
its impact will have to be examined after this optimization is made.
