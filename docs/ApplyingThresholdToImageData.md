# Processing Volumetric Imaging

For introductory reference, please review "The Clinician's Guide to CBCT Volumetric
Imaging" at http://www.ineedce.com/courses/1413/PDF/A_Clin_Gde_ConeBeam.pdf

Sources of Artifacts in CT Images: http://www.edboas.com/science/CT/0012.pdf

## DICOM Parsing

Any DICOM file parsed with the `dicom-parser` library becomes a DataSet object;
a pre-es2016 javascript class that encapsulates a ByteArray data structure and
provides methods for accessing DICOM elements contained within the ByteArray.

Accessing the image data contained in the ByteArray is relatively simple given
the `pixelData()` convenience property of the `DataSet` class definition.  It
returns a TypedArray of pixel values stored by the manufacturer's CBCT machine.

Processing the TypedArray values into usable pixel data requires two steps:

1. Apply Modality LUT
2. Apply Value-of-Interest LUT

The `processor.js` function library provides mechanisms to perform these steps.

## Modality LUT/Transformation

The Modality LUT is the first rescale applied before any others.  It transforms
the pixel values recorded by the CT machine manufacturer into a standard format
such as Hounsfield Units (HU).
The rescale is defined by the Rescale Intercept and Rescale Slope DICOM fields,
applied as expected:

```javascript
var newValue = value * slope + intercept;
```

## Value-of-Interest (VOI) LUT/Transformation

The VOI LUT is applied to pixel values after the Modality LUT is applied.  It
transforms or filters the modality values against a range of values of interest.

In the case of planning implants into bone, the HU scale for bone-density material
is +700 and higher.
