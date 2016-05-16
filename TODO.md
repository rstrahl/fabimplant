# TODO

## ISSUE 9: Analysis File Parsing

- Revise file loading UX; display table with patient info and implants
	- Present option to "add analysis file"
	- Need button to "start over" (garbage can? close/X in corner?)

- Refactor file loading code into FileWindow
	- Sub-components return their "loaded" file back to FileWindow
	- FileWindow should call its own loadDicomFileList() and loadAnalysisFile()

- Implement analysis file Parsing
	- Need XML parse

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
