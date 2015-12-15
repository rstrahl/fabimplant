// renderer.js
//
// Manages rendering of a DICOM image set into an HTML canvas.

// import jpeg from 'JPEGLosslessDecoderJS';

/**
 * Attempts to render the image contained in the provided DataSet object into
 * an HTML Canvas element.
 *
 * @param  {Canvas} canvas  an HTML Canvas
 * @param  {DataSet} dataSet a dicom-parser DataSet
 */
// export function render(canvas, dataSet) {
//   let imageMetadata = getImageMetadata(dataSet);
//   let ctx = canvas.getContext('2d'),
//       width = imageMetadata.cols,
//       height = imageMetadata.rows;

//   // resize canvas to match dimensions of image
//   canvas.setAttribute('width', width);
//   canvas.setAttribute('height', height);
//   canvas.style.width = width + 'px';
//   canvas.style.height = height + 'px';

//   let pixelData = processPixelData(dataSet, imageMetadata);
//   let img = prepareImageData(pixelData, width, height);
//   ctx.putImageData(img, 0, 0);
// }

/**
 * Renders the given imageData into the given context.
 * 
 * @param  {Canvas} canvas an HTML5 Canvas element
 * @param  {ImageData} imagedata an HTML ImageData object
 */
export function render(canvas, imageData) {
  let ctx = canvas.getContext('2d'),
      width = imageData.width,
      height = imageData.height;

  // resize canvas to match dimensions of image
  canvas.setAttribute('width', width);
  canvas.setAttribute('height', height);
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';

  ctx.putImageData(imageData, 0, 0);
}