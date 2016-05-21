# TODO

## ISSUE 9: Analysis File Parsing

- Add check to compare the SOPInstanceUID with the UID found in the analysis file
	- If they don't match, throw a warning in FileInputResults

## Side project: Atom tweaking

- Look into autocomplete+ providers like atom-ternjs
- Configure beautify rules for HTML, CSS, JS/ES6

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
