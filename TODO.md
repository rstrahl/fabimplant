# TODO

Start with UI cleanup and readiness

- Issue #26
- Issue #29
- Issue #25

Then move to analysis file parsing

## Analysis File Parsing

- Strategy pattern?
	- Loader for dicom
	- Loader for Analysis
		- XML based?
		- Implementation based on machine?
		- What if other formats are not XML?
			- This is an internal implementation detail

## Next Steps

Two major design components that need to be implemented

1. Pub/Sub stores architecture
	- Lightweight, open-source flux-y style of store that isn't religiously rigid
	- Pub/Sub design, event-driven, pluggable from the app.js
	- Drives state change back into UI

2. Analysis File Loading
	- New File Loader stage window
		- Two drag-n-drop regions
		- Two information panes
		- "Next" moves to image stage
	- Will be deprecated during electron by "study browser" (file browser component)
