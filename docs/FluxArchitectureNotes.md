# Flux Architecture

## Overview

In flux, views submit Action object, which is received by a dispatcher, which
routes the action to a Store.

Our needs:
- a Component calls an Action, which directs a Store to do processing
- a Store completes the Action, announces that completion and updates the app state
- a Store may need to invoke a change in another Store
- Must fully support UI testing, unit testing, and integration testing

## Evaluation

The Flux architecture as designed by Facebook presents Stores, Actions, and a Dispatcher.
Components (or Stores) can call Actions, which are routed through the Dispatcher
and distributed by the handling Store; once completed the Store emits an event thats
received either at the root Component and propagated downwards (pure) or received
at the calling-Component level (a "violation" of the design principle).

Redux is an alternative implementation that relies on functional composition rather than
callback function registration.  It relies on reducer functions that are assembled in a
tree, and rather than maintain state in any number of singleton Store objects it maintains
state in a single tree-structure object.  Actions are called that lead to reducer functions
being executed that update the state tree.  The state tree is then applied through the
entire Component hierarchy and the UI is updated.

## Considerations

Both architectures achieve the same primary goals, though there is a long-term benefit
to considering a functionally-driven approach like Redux.  If the goal of FabImplant is
to eventually drive a platform that may support other subject domains, then the app
itself is simply a view to the data and platform services.  Being able to store a state
tree remotely and "hydrate" the app state instantly from a single server request is
highly appealing.  In addition, Redux is well-known for having extensive testing support
due to its preference for "pure" functions; where the output of a function is 100% predictable
given specific input.

## Eligible Candidates

- FileReader -> FileStore
	- Processes DICOM files and maintains File state
- Modeler -> GeometryStore
	- Processes and maintains `Geometry` instances for meshes
	- ThreeWindow+Renderer would generate the THREE.Mesh provided from the Store's Geometry
- Processor -> ImageStore
	- Processes and maintains images from DICOM files (from FileStore?)
- CaseStore
	- Maintains a "project/session" file
	- Serializes info that tracks:
		- DICOM File used
		- Image processor settings last used (WW/WC)
		- Geometry
		- STL outputs
