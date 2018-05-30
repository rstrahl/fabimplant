# Analysis File Notes

## Overview

CT scanners ship with software for viewing their output imagery, and that software
typically adds a bundling mechanism to the files.  The initial prototype for
FabImplant relies on a Kodak CT, which ships with a software package called
CareStream.

## Implant Data

CareStream appears to rely on two main files during a user's planning session.

### FilesManager.xml

- Represents the file "manifest", containing the filenames of all associated data files
```xml
<FilesManager Version="1.0" Uid="1.2.250.1.90.1.3734310698.20150820204921.1312.6419">
<Files>
  <File Uid="0" Path="3DSlice1.dcm" Type="Volume"/>
</Files>
</FilesManager>
```
- The DICOM files are stored in a directory named after the `uid` attribute.
- All DICOM filenames associated with the Study are listed in the `Files` element.
- The Analysis file itself is listed in the `Files` collection.

**Notes:**
- Browser cannot "open" files from directory but node can, and this would be a
good way to find all Study collections on a given machine/network.
	1. Search for all FilesManager.xml
	2. Open FilesManager.xml and build DICOM file list
	3. Load DICOM files and metadata into session

### Analyses/<uidNumber>.xml
- Contains all analysis and planning data for the implants
- Elements of interest:
	- `<Implants>`: The collection of planned implants
	```xml
	<Implant id="27" objecttype="e_Implant_Cylinder" pipelinetype="PL_NONE" active="1" visibility="1" R="1" G="0.94902" B="0.0862745" ID="BioHorizons\TLR3812.impl" height="11.99" topradius="1.9" bottomradius="1.4" favorite="0" system="1" withabutment="0" manufacturername="BioHorizons" brandname="Tapered Internal Implant" modelname="TLR3812" manufacturerversion="" implantversion="" status="" cataloglength="11.99" headdiameter="-1" headlength="-1" mat0="0.997556" mat1="-0.00368548" mat2="-0.0697736" mat3="116" mat4="-0.00368548" mat5="0.994442" mat6="-0.105219" mat7="148.737" mat8="0.0697736" mat9="0.105219" mat10="0.991998" mat11="55.8967" mat12="0" mat13="0" mat14="0" mat15="1">
		<Abutment mode="unknow" basediameter="-1" baselength="-1" outputangle="-1" outputlength="-1" outputdiameter="-1" axisangle="0"/>
		<Sleeve internaldiameter="-1" externaldiameter="-1" length="-1" distanceimplant="-1"/>
	</Implant>
	```
	- `<Canals>`: A collection of canal point arrays
	```xml
	<Canal id="23" objecttype="e_RootCanal" pipelinetype="PL_NONE" active="1" visibility="1" R="1" G="0.5" B="0" radius="1.25">
		<Point x="187.922" y="242.153" z="49.9543"/>
		<Point x="179.001" y="227.738" z="39.4602"/>
		<Point x="169.364" y="212.343" z="29.7733"/>
		<Point x="161.371" y="199.728" z="20.8937"/>
		<Point x="153.741" y="187.839" z="14.8394"/>
		<Point x="144.459" y="173.654" z="11.2068"/>
		<Point x="137.253" y="162.935" z="5.55611"/>
		<Point x="124.934" y="144.955" z="3.53801"/>
		<Point x="116.345" y="131.765" z="5.15249"/>
		<Point x="110.335" y="121.256" z="4.74887"/>
		<Point x="106.032" y="112.579" z="3.94163"/>
		<Point x="100.146" y="100.182" z="5.55611"/>
	</Canal>
	```

**Notes:**
- Within each `<Implant>` tag the following data elements can be used:
    - `height` indicates the length/height of the implant in millimeters
    - `topradius` indicates the radius of the top of the implant in millimeters
    - `bottomradius` indicates the radius of the bottom of the implant in millimeters
- The `<Implant>` entries within the analysis file contain a series of values that
appear to be a serialized `Matrix4` data structure. After testing via changing
the position of implants within Carestream, it was observed that indeed in the
values in fields `mat3`, `mat7`, `mat11` are updated to correspond to changes
along the x, y, z axis respectively.
- It would be highly preferable if we could simply utilize the matrix values
directly in a `Matrix4` data structure and applied directly to `THREE.Object3d`
instances for each Implant.
