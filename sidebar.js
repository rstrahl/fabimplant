/*
Generates a div with a table containing relevant metadata from a provided
DICOM dataSet.
 */

import dicomParser from 'dicom-parser';
import dictionary from './dataDictionary';
import uids from './uids';

/**
 * Generates the sidebar within a DOM node and populates it with the metadata
 * extracted from the DICOM DataSet object provided.
 *
 * @param  {DataSet} dataSet a dicom-parser DataSet object
 * @return {Node} a DOM node
 */
export function populateSidebar(dataSet) {
  let div = document.createElement('div');
  div.setAttribute('class', 'sidebar');
  div.setAttribute('id', 'sidebar-metadata');
  let table = metadataTable();
  let tbody = metadataTableBody(dataSet);
  table.appendChild(tbody);
  div.appendChild(table);
  return div;
}

function metadataTable() {
  let table = document.createElement('table');
  table.setAttribute('class', 'sidebar-table');
  table.appendChild(metadataTableHeader('Image Metadata'));
  return table;
}

function metadataTableBody(dataSet) {
  let tbody = document.createElement('tbody');
  tbody.setAttribute('class', 'sidebar-table-body');
  let objDataSet = dicomParser.explicitDataSetToJS(dataSet);
  Object.keys(objDataSet).forEach( key => {
    let property = (dictionary[key] != undefined) ? dictionary[key].name : key;
    let value = uids[objDataSet[key]] || objDataSet[key];
    tbody.appendChild(metadataRow(property, value));
  });
  return tbody;
}

function metadataTableHeader(headerName) {
  let header = document.createElement('th');
  header.setAttribute('colspan', '2');
  header.setAttribute('class', 'sidebar-table-header');
  header.appendChild(document.createTextNode(headerName));
  return header;
}

function metadataRow(property, value) {
  let row = document.createElement('tr');
  let propCell = document.createElement('td');
  propCell.setAttribute('class', 'table-column-property');
  let valueCell = document.createElement('td');
  propCell.appendChild(document.createTextNode(property));
  valueCell.appendChild(document.createTextNode(value));
  valueCell.setAttribute('class', 'table-column-value');
  row.appendChild(propCell);
  row.appendChild(valueCell);
  return row;
}
