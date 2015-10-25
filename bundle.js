(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (Buffer){
var dicomjs = require('dicomjs');

document.body.addEventListener('load', initDropZone(document.getElementById('dropZone')));

function initDropZone(element) {
	console.log("Called initDropZone");
	if (window.File && window.FileReader && window.FileList && window.Blob) {
    dropZone.addEventListener('dragover', handleDragOver, false);
    dropZone.addEventListener('drop', handleFileSelect, false);
	}
	else {
		alert("File APIs are not supported in this browser.");
	}
}

function handleFileSelect(event) {
	event.stopPropagation();
	event.preventDefault();
	console.log("Loaded files: " + event.dataTransfer.files.length);
	var files = event.dataTransfer.files;
	loadFile(files[0]);
}

function handleDragOver(event) {
	event.stopPropagation();
	event.preventDefault();
	event.dataTransfer.dropEffect = 'copy';
}

function loadFile(file) {
	console.log("loadFile");
	var reader = new FileReader();
	reader.onload = function(file) {
		console.log("onload called");
		var arrayBuffer = reader.result;
		var buffer = toBuffer(arrayBuffer);
		dicomjs.parse(buffer, function (err, dcmData) {
			if (!err) {
					/// Reading patient name
					var patientName = dcmData.dataset['00100010'].value;
					var photometricInterpolation = dcmData.dataset['00280004'].value;
					// var numberOfFrames = dcmData.dataset['00280008'].value;
					var rows = dcmData.dataset['00280010'].value;
					var columns = dcmData.dataset['00280011'].value;
					console.log("Read patient record: "+patientName);
					console.log("Read photometricInterpolation: "+photometricInterpolation);
					// console.log("Read numberOfFrames: "+numberOfFrames);
					console.log("Read rows: "+rows);
					console.log("Read columns: "+columns);
			} else {
					console.log(err);
			}
		});
	};
	reader.readAsArrayBuffer(file);
}

// Refactor this out to actually translate an entire File object
function toBuffer(arrayBuffer) {
    var buffer = new Buffer(arrayBuffer.byteLength);
    var view = new Uint8Array(arrayBuffer);
    for (var i = 0; i < buffer.length; ++i) {
        buffer[i] = view[i];
    }
    return buffer;
}

}).call(this,require("buffer").Buffer)
},{"buffer":15,"dicomjs":2}],2:[function(require,module,exports){
/**
 * Author  : Ramesh R
 * Created : 7/17/2015 12:31 AM
 * ----------------------------------------------------------------------
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 * ----------------------------------------------------------------------
 */

var lib = require('./lib');

module.exports = {
    parse: lib.parse,
    parseFile: lib.parseFile
};
},{"./lib":9}],3:[function(require,module,exports){
/**
 * Author  : Ramesh R
 * Created : 7/19/2015 7:41 PM
 * ----------------------------------------------------------------------
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 * ----------------------------------------------------------------------
 */

module.exports = {

    setOptions: function (options) {
        for (var key in options) {
            if (this.hasOwnProperty(key)) {
                this[key] = options[key];
            }
        }
    }
};
},{}],4:[function(require,module,exports){
/**
 * Author  : Ramesh R
 * Created : 7/13/2015 6:14 PM
 * ----------------------------------------------------------------------
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 * ----------------------------------------------------------------------
 */

module.exports = {

    hexCharacters: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'],

    tagLength: 4,
    vrLength: 2,
    valueLength: 2,

    metaPosition: 132,
    dcmPrefixPosition: 128,

    sequenceVr: 'SQ',

    groupLengthTag: '00080000',
    transferSyntaxTag: '00020010',
    itemStartTag: 'FFFEE000',
    itemDelimiterTag: 'FFFEE00D',
    sequenceDelimiterTag: 'FFFEE0DD',
    delimiterTags: ['FFFEE000', 'FFFEE00D', 'FFFEE0DD'],

    /// Group 0002 is written in Little Endian Explicit
    /// Explicit VR Little Endian
    groupTransferSyntax: '1.2.840.10008.1.2.1',

    dicomDefaultTransferSyntax: '1.2.840.10008.1.2'
};
},{}],5:[function(require,module,exports){
/**
 * Author  : Ramesh R
 * Created : 7/13/2015 6:12 PM
 * ----------------------------------------------------------------------
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 * ----------------------------------------------------------------------
 */

var utils = require('./utils'),
    vr = require('./vr'),
    dataReader = require('./datareader'),
    constants = require('./constants'),
    dataElementsDict = require('./dict').dataElements;

var DataElement = function (txProps) {

    this.txProps = txProps;

    this.id = null;
    this.tag = null;
    this.vr = null;
    this.valueLength = null;
    this.value = null;
};

DataElement.prototype.parse = function (buffer, position, options) {
    var currentPosition = position;
    var parsingDone = false;

    this.id = this.tag = utils.readTag(buffer, currentPosition, this.txProps.isBigEndian);

    /// Moving forward "constants.tagLength" bytes
    currentPosition += constants.tagLength;

    /// Check for Tag delimiters
    if (constants.delimiterTags.indexOf(this.id) > -1) {
        this.vr = null;
        this.valueLength = utils.readInteger(buffer, currentPosition, 4);
        currentPosition += 4;

        if (this.tag === constants.itemStartTag && options && options.searchSeqItem) {
            return currentPosition;
        }

        if (this.tag === constants.itemStartTag && this.valueLength > 0) {
            this.value = dataReader.read(buffer, currentPosition, this.valueLength, this.vr, this.txProps.isBigEndian);
            currentPosition += this.valueLength;
        }

        return currentPosition;
    }

    if (this.txProps.isImplicit) {
        var elementInfo = dataElementsDict[this.tag];

        if (elementInfo) {
            this.vr = elementInfo.vr;
        } else if (this.tag.substring(4, 8) === '0000') {
            this.vr = 'UL';
        } else {
            this.vr = 'UN';
        }

        this.valueLength = utils.readInteger(buffer, currentPosition, 4, this.txProps.isBigEndian);
        currentPosition += 4;
    } else { /// Explicit VRs
        this.vr = utils.readVr(buffer, currentPosition, constants.vrLength);

        /// for VRs of OB, OW, OF, SQ and UN the 16 bits following the two character VR Field are
        /// reserved for use by later versions of the DICOM Standard. These reserved bytes shall be set
        /// to 0000H and shall not be used or decoded (Table 7.1-1).
        /// for VRs of UT the 16 bits following the two character VR Field are reserved for use by later
        /// versions of the DICOM Standard. These reserved bytes shall be set to 0000H and shall not be
        /// used or decoded.
        /// for all other VRs the Value Length Field is the 16-bit unsigned integer following the two
        /// character VR Field (Table 7.1-2)
        /// ... So adding vrLength(2/4) instead of 2(constants.vrLength)
        var vrProps = vr.getLength(this.vr);
        currentPosition += constants.vrLength;
        currentPosition += vrProps.reserved;

        this.valueLength = utils.readInteger(buffer, currentPosition, vrProps.length, this.txProps.isBigEndian);

        currentPosition += vrProps.length;
    }

    if (this.vr == constants.sequenceVr) {
        this.sequenceItems = [];
        this.isSequence = true;

        parsingDone = true;

        var element = new DataElement(this.txProps);
        var currentPositionSeq = element.parse(buffer, currentPosition, {searchSeqItem: true});

        if (element.id == constants.sequenceDelimiterTag) {
            this.valueLength = currentPositionSeq - currentPosition;
        } else {
            var isImplicitVr = element.valueLength == 'FFFFFFFF'; // itemStart.valueLength == FFFFFFFF
            if (isImplicitVr) {
                var items = {};
                element = new DataElement(this.txProps);
                currentPositionSeq = element.parse(buffer, currentPositionSeq, {searchSeqItem: true});

                while (element.id != constants.sequenceDelimiterTag) { /// Sequence delimiter
                    if (element.id == constants.itemDelimiterTag) {
                        this.sequenceItems.push(items);
                        items = {};
                    } else {
                        items[element.id] = element;
                    }

                    element = new DataElement(this.txProps);
                    currentPositionSeq = element.parse(buffer, currentPositionSeq, {searchSeqItem: true});
                }

                this.valueLength = currentPositionSeq - currentPosition;
            } else {
                /// No sequence delimters
                /// TODO: Need to separate elements to their own item
                var items = {};
                while (currentPositionSeq < currentPosition + constants.tagLength) {
                    var element = new DataElement(this.txProps);

                    currentPositionSeq = element.parse(buffer, currentPositionSeq);
                    items[element.id] = element;
                }

                this.sequenceItems.push(items);
            }
        }
    }

    /// Pixel Data in OB
    if (this.vr == 'OB' && this.valueLength <= 0) {
        this.isPixelData = true;

        parsingDone = true;
        var element = new DataElement(this.txProps);
        var currentPositionSeq = element.parse(buffer, currentPosition, {searchSeqItem: true});

        this.pixelDataItems = [];
        if (element.id == constants.itemStartTag) {

            while (element.id != constants.sequenceDelimiterTag) {
                this.pixelDataItems.push(element);

                element = new DataElement(this.txProps);
                currentPositionSeq = element.parse(buffer, currentPositionSeq);
            }

            this.valueLength = currentPositionSeq - currentPosition;
        }
    }

    if (this.valueLength <= 0) {
        this.value = null;
        return currentPosition;
    }

    if (!parsingDone) {
        this.value = dataReader.read(buffer, currentPosition, this.valueLength, this.vr, this.txProps.isBigEndian);
    }

    currentPosition += this.valueLength;

    return currentPosition;
};

module.exports = DataElement;
},{"./constants":4,"./datareader":6,"./dict":8,"./utils":11,"./vr":12}],6:[function(require,module,exports){
/**
 * Author  : Ramesh R
 * Created : 7/14/2015 4:47 PM
 * ----------------------------------------------------------------------
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 * ----------------------------------------------------------------------
 */

var utils = require('./utils');

module.exports = {

    /// Application Entity
    'AE': utils.readStringData,

    /// Age String
    'AS': utils.readStringData,

    /// Attribute Tag
    'AT': utils.readStringData,

    /// Code String
    'CS': utils.readStringData,

    /// Date(YYYYMMDD)
    'DA': utils.readStringData,

    /// Decimal String
    'DS': utils.readFloat,

    /// DateTime(YYYYMMDDHHMMSS.FFFFFF&ZZXX)
    'DT': utils.readStringData,

    /// Floating Point Single
    'FL': utils.readStringData,

    /// Floating Point Double
    'FD': utils.readStringData,

    /// Integer String
    'IS': utils.readInteger,

    /// Long String
    'LO': utils.readStringData,

    /// Long Text
    'LT': utils.readStringData,

    /// Other Byte String
    'OB': utils.readUInt8Array,

    /// Other Double String
    'OD': utils.readStringData,

    /// Other Float String
    'OF': utils.readStringData,

    /// Other word String
    'OW': utils.readUInt16Array,

    /// Person Name
    'PN': utils.readStringData,

    /// Short String
    'SH': utils.readStringData,

    /// Signed Long
    'SL': utils.readInteger,

    /// Sequence of Items
    'SQ': utils.readBinary,

    /// Signed short
    'SS': utils.readInteger,

    /// Short Text
    'ST': utils.readStringData,

    /// Time
    'TM': utils.readStringData,

    /// Unlimited Characters
    'UC': utils.readStringData,

    /// UID-Unique Identifier
    'UI': utils.readStringData,

    /// Unsigned Long
    'UL': utils.readUnsignedInteger,

    /// Unknown
    'UN': utils.readBinary,

    /// URI/URL
    'UR': utils.readStringData,

    /// Unsigned Short
    'US': utils.readUnsignedInteger,

    /// Unlimited Text
    'UT': utils.readStringData,

    read: function (buffer, position, length, vr, isBigEndian) {
        var reader = this[vr] ? this[vr] : utils.readBinary;
        return reader(buffer, position, length, isBigEndian, utils);
    }
};
},{"./utils":11}],7:[function(require,module,exports){
/**
 * Author  : Ramesh R
 * Created : 7/15/2015 12:01 AM
 * ----------------------------------------------------------------------
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 * ----------------------------------------------------------------------
 */

var DcmFile = function () {
    this.metaElements = {};
    this.dataset = {};

    this.pixelData = null;
};

module.exports = DcmFile;
 
},{}],8:[function(require,module,exports){
/**
 * Author  : Ramesh R
 * Created : 7/14/2015 4:46 PM
 * ----------------------------------------------------------------------
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 * ----------------------------------------------------------------------
 */

/// Part 6: Data Dictionary
/// http://medical.nema.org/Dicom/2011/11_06pu.pdf

var dataElements = {
    "00000000": {vr: "UL", vm: "1", name: "CommandGroupLength"},
    "00000001": {vr: "UL", vm: "1", name: "CommandLengthToEnd"},
    "00000002": {vr: "UI", vm: "1", name: "AffectedSOPClassUID"},
    "00000003": {vr: "UI", vm: "1", name: "RequestedSOPClassUID"},
    "00000010": {vr: "SH", vm: "1", name: "CommandRecognitionCode"},
    "00000100": {vr: "US", vm: "1", name: "CommandField"},
    "00000110": {vr: "US", vm: "1", name: "MessageID"},
    "00000120": {vr: "US", vm: "1", name: "MessageIDBeingRespondedTo"},
    "00000200": {vr: "AE", vm: "1", name: "Initiator"},
    "00000300": {vr: "AE", vm: "1", name: "Receiver"},
    "00000400": {vr: "AE", vm: "1", name: "FindLocation"},
    "00000600": {vr: "AE", vm: "1", name: "MoveDestination"},
    "00000700": {vr: "US", vm: "1", name: "Priority"},
    "00000800": {vr: "US", vm: "1", name: "CommandDataSetType"},
    "00000850": {vr: "US", vm: "1", name: "NumberOfMatches"},
    "00000860": {vr: "US", vm: "1", name: "ResponseSequenceNumber"},
    "00000900": {vr: "US", vm: "1", name: "Status"},
    "00000901": {vr: "AT", vm: "1-n", name: "OffendingElement"},
    "00000902": {vr: "LO", vm: "1", name: "ErrorComment"},
    "00000903": {vr: "US", vm: "1", name: "ErrorID"},
    "00001000": {vr: "UI", vm: "1", name: "AffectedSOPInstanceUID"},
    "00001001": {vr: "UI", vm: "1", name: "RequestedSOPInstanceUID"},
    "00001002": {vr: "US", vm: "1", name: "EventTypeID"},
    "00001005": {vr: "AT", vm: "1-n", name: "AttributeIdentifierList"},
    "00001008": {vr: "US", vm: "1", name: "ActionTypeID"},
    "00001020": {vr: "US", vm: "1", name: "NumberOfRemainingSuboperations"},
    "00001021": {vr: "US", vm: "1", name: "NumberOfCompletedSuboperations"},
    "00001022": {vr: "US", vm: "1", name: "NumberOfFailedSuboperations"},
    "00001023": {vr: "US", vm: "1", name: "NumberOfWarningSuboperations"},
    "00001030": {vr: "AE", vm: "1", name: "MoveOriginatorApplicationEntityTitle"},
    "00001031": {vr: "US", vm: "1", name: "MoveOriginatorMessageID"},
    "00004000": {vr: "LT", vm: "1", name: "DialogReceiver"},
    "00004010": {vr: "LT", vm: "1", name: "TerminalType"},
    "00005010": {vr: "SH", vm: "1", name: "MessageSetID"},
    "00005020": {vr: "SH", vm: "1", name: "EndMessageID"},
    "00005110": {vr: "LT", vm: "1", name: "DisplayFormat"},
    "00005120": {vr: "LT", vm: "1", name: "PagePositionID"},
    "00005130": {vr: "CS", vm: "1", name: "TextFormatID"},
    "00005140": {vr: "CS", vm: "1", name: "NormalReverse"},
    "00005150": {vr: "CS", vm: "1", name: "AddGrayScale"},
    "00005160": {vr: "CS", vm: "1", name: "Borders"},
    "00005170": {vr: "IS", vm: "1", name: "Copies"},
    "00005180": {vr: "CS", vm: "1", name: "CommandMagnificationType"},
    "00005190": {vr: "CS", vm: "1", name: "Erase"},
    "000051A0": {vr: "CS", vm: "1", name: "Print"},
    "000051B0": {vr: "US", vm: "1-n", name: "Overlays"},
    "00020000": {vr: "UL", vm: "1", name: "FileMetaInformationGroupLength"},
    "00020001": {vr: "OB", vm: "1", name: "FileMetaInformationVersion"},
    "00020002": {vr: "UI", vm: "1", name: "MediaStorageSOPClassUID"},
    "00020003": {vr: "UI", vm: "1", name: "MediaStorageSOPInstanceUID"},
    "00020010": {vr: "UI", vm: "1", name: "TransferSyntaxUID"},
    "00020012": {vr: "UI", vm: "1", name: "ImplementationClassUID"},
    "00020013": {vr: "SH", vm: "1", name: "ImplementationVersionName"},
    "00020016": {vr: "AE", vm: "1", name: "SourceApplicationEntityTitle"},
    "00020100": {vr: "UI", vm: "1", name: "PrivateInformationCreatorUID"},
    "00020102": {vr: "OB", vm: "1", name: "PrivateInformation"},
    "00041130": {vr: "CS", vm: "1", name: "FileSetID"},
    "00041141": {vr: "CS", vm: "1-8", name: "FileSetDescriptorFileID"},
    "00041142": {vr: "CS", vm: "1", name: "SpecificCharacterSetOfFileSetDescriptorFile"},
    "00041200": {vr: "UL", vm: "1", name: "OffsetOfTheFirstDirectoryRecordOfTheRootDirectoryEntity"},
    "00041202": {vr: "UL", vm: "1", name: "OffsetOfTheLastDirectoryRecordOfTheRootDirectoryEntity"},
    "00041212": {vr: "US", vm: "1", name: "FileSetConsistencyFlag"},
    "00041220": {vr: "SQ", vm: "1", name: "DirectoryRecordSequence"},
    "00041400": {vr: "UL", vm: "1", name: "OffsetOfTheNextDirectoryRecord"},
    "00041410": {vr: "US", vm: "1", name: "RecordInUseFlag"},
    "00041420": {vr: "UL", vm: "1", name: "OffsetOfReferencedLowerLevelDirectoryEntity"},
    "00041430": {vr: "CS", vm: "1", name: "DirectoryRecordType"},
    "00041432": {vr: "UI", vm: "1", name: "PrivateRecordUID"},
    "00041500": {vr: "CS", vm: "1-8", name: "ReferencedFileID"},
    "00041504": {vr: "UL", vm: "1", name: "MRDRDirectoryRecordOffset"},
    "00041510": {vr: "UI", vm: "1", name: "ReferencedSOPClassUIDInFile"},
    "00041511": {vr: "UI", vm: "1", name: "ReferencedSOPInstanceUIDInFile"},
    "00041512": {vr: "UI", vm: "1", name: "ReferencedTransferSyntaxUIDInFile"},
    "0004151A": {vr: "UI", vm: "1-n", name: "ReferencedRelatedGeneralSOPClassUIDInFile"},
    "00041600": {vr: "UL", vm: "1", name: "NumberOfReferences"},
    "00080000": {vr: "UL", vm: "1", name: "GroupLength"},
    "00080001": {vr: "UL", vm: "1", name: "LengthToEnd"},
    "00080005": {vr: "CS", vm: "1-n", name: "SpecificCharacterSet"},
    "00080006": {vr: "SQ", vm: "1", name: "LanguageCodeSequence"},
    "00080008": {vr: "CS", vm: "2-n", name: "ImageType"},
    "00080010": {vr: "SH", vm: "1", name: "RecognitionCode"},
    "00080012": {vr: "DA", vm: "1", name: "InstanceCreationDate"},
    "00080013": {vr: "TM", vm: "1", name: "InstanceCreationTime"},
    "00080014": {vr: "UI", vm: "1", name: "InstanceCreatorUID"},
    "00080016": {vr: "UI", vm: "1", name: "SOPClassUID"},
    "00080018": {vr: "UI", vm: "1", name: "SOPInstanceUID"},
    "0008001A": {vr: "UI", vm: "1-n", name: "RelatedGeneralSOPClassUID"},
    "0008001B": {vr: "UI", vm: "1", name: "OriginalSpecializedSOPClassUID"},
    "00080020": {vr: "DA", vm: "1", name: "StudyDate"},
    "00080021": {vr: "DA", vm: "1", name: "SeriesDate"},
    "00080022": {vr: "DA", vm: "1", name: "AcquisitionDate"},
    "00080023": {vr: "DA", vm: "1", name: "ContentDate"},
    "00080024": {vr: "DA", vm: "1", name: "OverlayDate"},
    "00080025": {vr: "DA", vm: "1", name: "CurveDate"},
    "0008002A": {vr: "DT", vm: "1", name: "AcquisitionDateTime"},
    "00080030": {vr: "TM", vm: "1", name: "StudyTime"},
    "00080031": {vr: "TM", vm: "1", name: "SeriesTime"},
    "00080032": {vr: "TM", vm: "1", name: "AcquisitionTime"},
    "00080033": {vr: "TM", vm: "1", name: "ContentTime"},
    "00080034": {vr: "TM", vm: "1", name: "OverlayTime"},
    "00080035": {vr: "TM", vm: "1", name: "CurveTime"},
    "00080040": {vr: "US", vm: "1", name: "DataSetType"},
    "00080041": {vr: "LO", vm: "1", name: "DataSetSubtype"},
    "00080042": {vr: "CS", vm: "1", name: "NuclearMedicineSeriesType"},
    "00080050": {vr: "SH", vm: "1", name: "AccessionNumber"},
    "00080051": {vr: "SQ", vm: "1", name: "IssuerOfAccessionNumberSequence"},
    "00080052": {vr: "CS", vm: "1", name: "QueryRetrieveLevel"},
    "00080054": {vr: "AE", vm: "1-n", name: "RetrieveAETitle"},
    "00080056": {vr: "CS", vm: "1", name: "InstanceAvailability"},
    "00080058": {vr: "UI", vm: "1-n", name: "FailedSOPInstanceUIDList"},
    "00080060": {vr: "CS", vm: "1", name: "Modality"},
    "00080061": {vr: "CS", vm: "1-n", name: "ModalitiesInStudy"},
    "00080062": {vr: "UI", vm: "1-n", name: "SOPClassesInStudy"},
    "00080064": {vr: "CS", vm: "1", name: "ConversionType"},
    "00080068": {vr: "CS", vm: "1", name: "PresentationIntentType"},
    "00080070": {vr: "LO", vm: "1", name: "Manufacturer"},
    "00080080": {vr: "LO", vm: "1", name: "InstitutionName"},
    "00080081": {vr: "ST", vm: "1", name: "InstitutionAddress"},
    "00080082": {vr: "SQ", vm: "1", name: "InstitutionCodeSequence"},
    "00080090": {vr: "PN", vm: "1", name: "ReferringPhysicianName"},
    "00080092": {vr: "ST", vm: "1", name: "ReferringPhysicianAddress"},
    "00080094": {vr: "SH", vm: "1-n", name: "ReferringPhysicianTelephoneNumbers"},
    "00080096": {vr: "SQ", vm: "1", name: "ReferringPhysicianIdentificationSequence"},
    "00080100": {vr: "SH", vm: "1", name: "CodeValue"},
    "00080102": {vr: "SH", vm: "1", name: "CodingSchemeDesignator"},
    "00080103": {vr: "SH", vm: "1", name: "CodingSchemeVersion"},
    "00080104": {vr: "LO", vm: "1", name: "CodeMeaning"},
    "00080105": {vr: "CS", vm: "1", name: "MappingResource"},
    "00080106": {vr: "DT", vm: "1", name: "ContextGroupVersion"},
    "00080107": {vr: "DT", vm: "1", name: "ContextGroupLocalVersion"},
    "0008010B": {vr: "CS", vm: "1", name: "ContextGroupExtensionFlag"},
    "0008010C": {vr: "UI", vm: "1", name: "CodingSchemeUID"},
    "0008010D": {vr: "UI", vm: "1", name: "ContextGroupExtensionCreatorUID"},
    "0008010F": {vr: "CS", vm: "1", name: "ContextIdentifier"},
    "00080110": {vr: "SQ", vm: "1", name: "CodingSchemeIdentificationSequence"},
    "00080112": {vr: "LO", vm: "1", name: "CodingSchemeRegistry"},
    "00080114": {vr: "ST", vm: "1", name: "CodingSchemeExternalID"},
    "00080115": {vr: "ST", vm: "1", name: "CodingSchemeName"},
    "00080116": {vr: "ST", vm: "1", name: "CodingSchemeResponsibleOrganization"},
    "00080117": {vr: "UI", vm: "1", name: "ContextUID"},
    "00080201": {vr: "SH", vm: "1", name: "TimezoneOffsetFromUTC"},
    "00081000": {vr: "AE", vm: "1", name: "NetworkID"},
    "00081010": {vr: "SH", vm: "1", name: "StationName"},
    "00081030": {vr: "LO", vm: "1", name: "StudyDescription"},
    "00081032": {vr: "SQ", vm: "1", name: "ProcedureCodeSequence"},
    "0008103E": {vr: "LO", vm: "1", name: "SeriesDescription"},
    "0008103F": {vr: "SQ", vm: "1", name: "SeriesDescriptionCodeSequence"},
    "00081040": {vr: "LO", vm: "1", name: "InstitutionalDepartmentName"},
    "00081048": {vr: "PN", vm: "1-n", name: "PhysiciansOfRecord"},
    "00081049": {vr: "SQ", vm: "1", name: "PhysiciansOfRecordIdentificationSequence"},
    "00081050": {vr: "PN", vm: "1-n", name: "PerformingPhysicianName"},
    "00081052": {vr: "SQ", vm: "1", name: "PerformingPhysicianIdentificationSequence"},
    "00081060": {vr: "PN", vm: "1-n", name: "NameOfPhysiciansReadingStudy"},
    "00081062": {vr: "SQ", vm: "1", name: "PhysiciansReadingStudyIdentificationSequence"},
    "00081070": {vr: "PN", vm: "1-n", name: "OperatorsName"},
    "00081072": {vr: "SQ", vm: "1", name: "OperatorIdentificationSequence"},
    "00081080": {vr: "LO", vm: "1-n", name: "AdmittingDiagnosesDescription"},
    "00081084": {vr: "SQ", vm: "1", name: "AdmittingDiagnosesCodeSequence"},
    "00081090": {vr: "LO", vm: "1", name: "ManufacturerModelName"},
    "00081100": {vr: "SQ", vm: "1", name: "ReferencedResultsSequence"},
    "00081110": {vr: "SQ", vm: "1", name: "ReferencedStudySequence"},
    "00081111": {vr: "SQ", vm: "1", name: "ReferencedPerformedProcedureStepSequence"},
    "00081115": {vr: "SQ", vm: "1", name: "ReferencedSeriesSequence"},
    "00081120": {vr: "SQ", vm: "1", name: "ReferencedPatientSequence"},
    "00081125": {vr: "SQ", vm: "1", name: "ReferencedVisitSequence"},
    "00081130": {vr: "SQ", vm: "1", name: "ReferencedOverlaySequence"},
    "00081134": {vr: "SQ", vm: "1", name: "ReferencedStereometricInstanceSequence"},
    "0008113A": {vr: "SQ", vm: "1", name: "ReferencedWaveformSequence"},
    "00081140": {vr: "SQ", vm: "1", name: "ReferencedImageSequence"},
    "00081145": {vr: "SQ", vm: "1", name: "ReferencedCurveSequence"},
    "0008114A": {vr: "SQ", vm: "1", name: "ReferencedInstanceSequence"},
    "0008114B": {vr: "SQ", vm: "1", name: "ReferencedRealWorldValueMappingInstanceSequence"},
    "00081150": {vr: "UI", vm: "1", name: "ReferencedSOPClassUID"},
    "00081155": {vr: "UI", vm: "1", name: "ReferencedSOPInstanceUID"},
    "0008115A": {vr: "UI", vm: "1-n", name: "SOPClassesSupported"},
    "00081160": {vr: "IS", vm: "1-n", name: "ReferencedFrameNumber"},
    "00081161": {vr: "UL", vm: "1-n", name: "SimpleFrameList"},
    "00081162": {vr: "UL", vm: "3-3n", name: "CalculatedFrameList"},
    "00081163": {vr: "FD", vm: "2", name: "TimeRange"},
    "00081164": {vr: "SQ", vm: "1", name: "FrameExtractionSequence"},
    "00081167": {vr: "UI", vm: "1", name: "MultiFrameSourceSOPInstanceUID"},
    "00081195": {vr: "UI", vm: "1", name: "TransactionUID"},
    "00081197": {vr: "US", vm: "1", name: "FailureReason"},
    "00081198": {vr: "SQ", vm: "1", name: "FailedSOPSequence"},
    "00081199": {vr: "SQ", vm: "1", name: "ReferencedSOPSequence"},
    "00081200": {vr: "SQ", vm: "1", name: "StudiesContainingOtherReferencedInstancesSequence"},
    "00081250": {vr: "SQ", vm: "1", name: "RelatedSeriesSequence"},
    "00082110": {vr: "CS", vm: "1", name: "LossyImageCompressionRetired"},
    "00082111": {vr: "ST", vm: "1", name: "DerivationDescription"},
    "00082112": {vr: "SQ", vm: "1", name: "SourceImageSequence"},
    "00082120": {vr: "SH", vm: "1", name: "StageName"},
    "00082122": {vr: "IS", vm: "1", name: "StageNumber"},
    "00082124": {vr: "IS", vm: "1", name: "NumberOfStages"},
    "00082127": {vr: "SH", vm: "1", name: "ViewName"},
    "00082128": {vr: "IS", vm: "1", name: "ViewNumber"},
    "00082129": {vr: "IS", vm: "1", name: "NumberOfEventTimers"},
    "0008212A": {vr: "IS", vm: "1", name: "NumberOfViewsInStage"},
    "00082130": {vr: "DS", vm: "1-n", name: "EventElapsedTimes"},
    "00082132": {vr: "LO", vm: "1-n", name: "EventTimerNames"},
    "00082133": {vr: "SQ", vm: "1", name: "EventTimerSequence"},
    "00082134": {vr: "FD", vm: "1", name: "EventTimeOffset"},
    "00082135": {vr: "SQ", vm: "1", name: "EventCodeSequence"},
    "00082142": {vr: "IS", vm: "1", name: "StartTrim"},
    "00082143": {vr: "IS", vm: "1", name: "StopTrim"},
    "00082144": {vr: "IS", vm: "1", name: "RecommendedDisplayFrameRate"},
    "00082200": {vr: "CS", vm: "1", name: "TransducerPosition"},
    "00082204": {vr: "CS", vm: "1", name: "TransducerOrientation"},
    "00082208": {vr: "CS", vm: "1", name: "AnatomicStructure"},
    "00082218": {vr: "SQ", vm: "1", name: "AnatomicRegionSequence"},
    "00082220": {vr: "SQ", vm: "1", name: "AnatomicRegionModifierSequence"},
    "00082228": {vr: "SQ", vm: "1", name: "PrimaryAnatomicStructureSequence"},
    "00082229": {vr: "SQ", vm: "1", name: "AnatomicStructureSpaceOrRegionSequence"},
    "00082230": {vr: "SQ", vm: "1", name: "PrimaryAnatomicStructureModifierSequence"},
    "00082240": {vr: "SQ", vm: "1", name: "TransducerPositionSequence"},
    "00082242": {vr: "SQ", vm: "1", name: "TransducerPositionModifierSequence"},
    "00082244": {vr: "SQ", vm: "1", name: "TransducerOrientationSequence"},
    "00082246": {vr: "SQ", vm: "1", name: "TransducerOrientationModifierSequence"},
    "00082251": {vr: "SQ", vm: "1", name: "AnatomicStructureSpaceOrRegionCodeSequenceTrial"},
    "00082253": {vr: "SQ", vm: "1", name: "AnatomicPortalOfEntranceCodeSequenceTrial"},
    "00082255": {vr: "SQ", vm: "1", name: "AnatomicApproachDirectionCodeSequenceTrial"},
    "00082256": {vr: "ST", vm: "1", name: "AnatomicPerspectiveDescriptionTrial"},
    "00082257": {vr: "SQ", vm: "1", name: "AnatomicPerspectiveCodeSequenceTrial"},
    "00082258": {vr: "ST", vm: "1", name: "AnatomicLocationOfExaminingInstrumentDescriptionTrial"},
    "00082259": {vr: "SQ", vm: "1", name: "AnatomicLocationOfExaminingInstrumentCodeSequenceTrial"},
    "0008225A": {vr: "SQ", vm: "1", name: "AnatomicStructureSpaceOrRegionModifierCodeSequenceTrial"},
    "0008225C": {vr: "SQ", vm: "1", name: "OnAxisBackgroundAnatomicStructureCodeSequenceTrial"},
    "00083001": {vr: "SQ", vm: "1", name: "AlternateRepresentationSequence"},
    "00083010": {vr: "UI", vm: "1", name: "IrradiationEventUID"},
    "00084000": {vr: "LT", vm: "1", name: "IdentifyingComments"},
    "00089007": {vr: "CS", vm: "4", name: "FrameType"},
    "00089092": {vr: "SQ", vm: "1", name: "ReferencedImageEvidenceSequence"},
    "00089121": {vr: "SQ", vm: "1", name: "ReferencedRawDataSequence"},
    "00089123": {vr: "UI", vm: "1", name: "CreatorVersionUID"},
    "00089124": {vr: "SQ", vm: "1", name: "DerivationImageSequence"},
    "00089154": {vr: "SQ", vm: "1", name: "SourceImageEvidenceSequence"},
    "00089205": {vr: "CS", vm: "1", name: "PixelPresentation"},
    "00089206": {vr: "CS", vm: "1", name: "VolumetricProperties"},
    "00089207": {vr: "CS", vm: "1", name: "VolumeBasedCalculationTechnique"},
    "00089208": {vr: "CS", vm: "1", name: "ComplexImageComponent"},
    "00089209": {vr: "CS", vm: "1", name: "AcquisitionContrast"},
    "00089215": {vr: "SQ", vm: "1", name: "DerivationCodeSequence"},
    "00089237": {vr: "SQ", vm: "1", name: "ReferencedPresentationStateSequence"},
    "00089410": {vr: "SQ", vm: "1", name: "ReferencedOtherPlaneSequence"},
    "00089458": {vr: "SQ", vm: "1", name: "FrameDisplaySequence"},
    "00089459": {vr: "FL", vm: "1", name: "RecommendedDisplayFrameRateInFloat"},
    "00089460": {vr: "CS", vm: "1", name: "SkipFrameRangeFlag"},
    "00100010": {vr: "PN", vm: "1", name: "PatientName"},
    "00100020": {vr: "LO", vm: "1", name: "PatientID"},
    "00100021": {vr: "LO", vm: "1", name: "IssuerOfPatientID"},
    "00100022": {vr: "CS", vm: "1", name: "TypeOfPatientID"},
    "00100024": {vr: "SQ", vm: "1", name: "IssuerOfPatientIDQualifiersSequence"},
    "00100030": {vr: "DA", vm: "1", name: "PatientBirthDate"},
    "00100032": {vr: "TM", vm: "1", name: "PatientBirthTime"},
    "00100040": {vr: "CS", vm: "1", name: "PatientSex"},
    "00100050": {vr: "SQ", vm: "1", name: "PatientInsurancePlanCodeSequence"},
    "00100101": {vr: "SQ", vm: "1", name: "PatientPrimaryLanguageCodeSequence"},
    "00100102": {vr: "SQ", vm: "1", name: "PatientPrimaryLanguageModifierCodeSequence"},
    "00101000": {vr: "LO", vm: "1-n", name: "OtherPatientIDs"},
    "00101001": {vr: "PN", vm: "1-n", name: "OtherPatientNames"},
    "00101002": {vr: "SQ", vm: "1", name: "OtherPatientIDsSequence"},
    "00101005": {vr: "PN", vm: "1", name: "PatientBirthName"},
    "00101010": {vr: "AS", vm: "1", name: "PatientAge"},
    "00101020": {vr: "DS", vm: "1", name: "PatientSize"},
    "00101021": {vr: "SQ", vm: "1", name: "PatientSizeCodeSequence"},
    "00101030": {vr: "DS", vm: "1", name: "PatientWeight"},
    "00101040": {vr: "LO", vm: "1", name: "PatientAddress"},
    "00101050": {vr: "LO", vm: "1-n", name: "InsurancePlanIdentification"},
    "00101060": {vr: "PN", vm: "1", name: "PatientMotherBirthName"},
    "00101080": {vr: "LO", vm: "1", name: "MilitaryRank"},
    "00101081": {vr: "LO", vm: "1", name: "BranchOfService"},
    "00101090": {vr: "LO", vm: "1", name: "MedicalRecordLocator"},
    "00102000": {vr: "LO", vm: "1-n", name: "MedicalAlerts"},
    "00102110": {vr: "LO", vm: "1-n", name: "Allergies"},
    "00102150": {vr: "LO", vm: "1", name: "CountryOfResidence"},
    "00102152": {vr: "LO", vm: "1", name: "RegionOfResidence"},
    "00102154": {vr: "SH", vm: "1-n", name: "PatientTelephoneNumbers"},
    "00102160": {vr: "SH", vm: "1", name: "EthnicGroup"},
    "00102180": {vr: "SH", vm: "1", name: "Occupation"},
    "001021A0": {vr: "CS", vm: "1", name: "SmokingStatus"},
    "001021B0": {vr: "LT", vm: "1", name: "AdditionalPatientHistory"},
    "001021C0": {vr: "US", vm: "1", name: "PregnancyStatus"},
    "001021D0": {vr: "DA", vm: "1", name: "LastMenstrualDate"},
    "001021F0": {vr: "LO", vm: "1", name: "PatientReligiousPreference"},
    "00102201": {vr: "LO", vm: "1", name: "PatientSpeciesDescription"},
    "00102202": {vr: "SQ", vm: "1", name: "PatientSpeciesCodeSequence"},
    "00102203": {vr: "CS", vm: "1", name: "PatientSexNeutered"},
    "00102210": {vr: "CS", vm: "1", name: "AnatomicalOrientationType"},
    "00102292": {vr: "LO", vm: "1", name: "PatientBreedDescription"},
    "00102293": {vr: "SQ", vm: "1", name: "PatientBreedCodeSequence"},
    "00102294": {vr: "SQ", vm: "1", name: "BreedRegistrationSequence"},
    "00102295": {vr: "LO", vm: "1", name: "BreedRegistrationNumber"},
    "00102296": {vr: "SQ", vm: "1", name: "BreedRegistryCodeSequence"},
    "00102297": {vr: "PN", vm: "1", name: "ResponsiblePerson"},
    "00102298": {vr: "CS", vm: "1", name: "ResponsiblePersonRole"},
    "00102299": {vr: "LO", vm: "1", name: "ResponsibleOrganization"},
    "00104000": {vr: "LT", vm: "1", name: "PatientComments"},
    "00109431": {vr: "FL", vm: "1", name: "ExaminedBodyThickness"},
    "00120010": {vr: "LO", vm: "1", name: "ClinicalTrialSponsorName"},
    "00120020": {vr: "LO", vm: "1", name: "ClinicalTrialProtocolID"},
    "00120021": {vr: "LO", vm: "1", name: "ClinicalTrialProtocolName"},
    "00120030": {vr: "LO", vm: "1", name: "ClinicalTrialSiteID"},
    "00120031": {vr: "LO", vm: "1", name: "ClinicalTrialSiteName"},
    "00120040": {vr: "LO", vm: "1", name: "ClinicalTrialSubjectID"},
    "00120042": {vr: "LO", vm: "1", name: "ClinicalTrialSubjectReadingID"},
    "00120050": {vr: "LO", vm: "1", name: "ClinicalTrialTimePointID"},
    "00120051": {vr: "ST", vm: "1", name: "ClinicalTrialTimePointDescription"},
    "00120060": {vr: "LO", vm: "1", name: "ClinicalTrialCoordinatingCenterName"},
    "00120062": {vr: "CS", vm: "1", name: "PatientIdentityRemoved"},
    "00120063": {vr: "LO", vm: "1-n", name: "DeidentificationMethod"},
    "00120064": {vr: "SQ", vm: "1", name: "DeidentificationMethodCodeSequence"},
    "00120071": {vr: "LO", vm: "1", name: "ClinicalTrialSeriesID"},
    "00120072": {vr: "LO", vm: "1", name: "ClinicalTrialSeriesDescription"},
    "00120081": {vr: "LO", vm: "1", name: "ClinicalTrialProtocolEthicsCommitteeName"},
    "00120082": {vr: "LO", vm: "1", name: "ClinicalTrialProtocolEthicsCommitteeApprovalNumber"},
    "00120083": {vr: "SQ", vm: "1", name: "ConsentForClinicalTrialUseSequence"},
    "00120084": {vr: "CS", vm: "1", name: "DistributionType"},
    "00120085": {vr: "CS", vm: "1", name: "ConsentForDistributionFlag"},
    "00140023": {vr: "ST", vm: "1-n", name: "CADFileFormat"},
    "00140024": {vr: "ST", vm: "1-n", name: "ComponentReferenceSystem"},
    "00140025": {vr: "ST", vm: "1-n", name: "ComponentManufacturingProcedure"},
    "00140028": {vr: "ST", vm: "1-n", name: "ComponentManufacturer"},
    "00140030": {vr: "DS", vm: "1-n", name: "MaterialThickness"},
    "00140032": {vr: "DS", vm: "1-n", name: "MaterialPipeDiameter"},
    "00140034": {vr: "DS", vm: "1-n", name: "MaterialIsolationDiameter"},
    "00140042": {vr: "ST", vm: "1-n", name: "MaterialGrade"},
    "00140044": {vr: "ST", vm: "1-n", name: "MaterialPropertiesFileID"},
    "00140045": {vr: "ST", vm: "1-n", name: "MaterialPropertiesFileFormat"},
    "00140046": {vr: "LT", vm: "1", name: "MaterialNotes"},
    "00140050": {vr: "CS", vm: "1", name: "ComponentShape"},
    "00140052": {vr: "CS", vm: "1", name: "CurvatureType"},
    "00140054": {vr: "DS", vm: "1", name: "OuterDiameter"},
    "00140056": {vr: "DS", vm: "1", name: "InnerDiameter"},
    "00141010": {vr: "ST", vm: "1", name: "ActualEnvironmentalConditions"},
    "00141020": {vr: "DA", vm: "1", name: "ExpiryDate"},
    "00141040": {vr: "ST", vm: "1", name: "EnvironmentalConditions"},
    "00142002": {vr: "SQ", vm: "1", name: "EvaluatorSequence"},
    "00142004": {vr: "IS", vm: "1", name: "EvaluatorNumber"},
    "00142006": {vr: "PN", vm: "1", name: "EvaluatorName"},
    "00142008": {vr: "IS", vm: "1", name: "EvaluationAttempt"},
    "00142012": {vr: "SQ", vm: "1", name: "IndicationSequence"},
    "00142014": {vr: "IS", vm: "1", name: "IndicationNumber "},
    "00142016": {vr: "SH", vm: "1", name: "IndicationLabel"},
    "00142018": {vr: "ST", vm: "1", name: "IndicationDescription"},
    "0014201A": {vr: "CS", vm: "1-n", name: "IndicationType"},
    "0014201C": {vr: "CS", vm: "1", name: "IndicationDisposition"},
    "0014201E": {vr: "SQ", vm: "1", name: "IndicationROISequence"},
    "00142030": {vr: "SQ", vm: "1", name: "IndicationPhysicalPropertySequence"},
    "00142032": {vr: "SH", vm: "1", name: "PropertyLabel"},
    "00142202": {vr: "IS", vm: "1", name: "CoordinateSystemNumberOfAxes "},
    "00142204": {vr: "SQ", vm: "1", name: "CoordinateSystemAxesSequence"},
    "00142206": {vr: "ST", vm: "1", name: "CoordinateSystemAxisDescription"},
    "00142208": {vr: "CS", vm: "1", name: "CoordinateSystemDataSetMapping"},
    "0014220A": {vr: "IS", vm: "1", name: "CoordinateSystemAxisNumber"},
    "0014220C": {vr: "CS", vm: "1", name: "CoordinateSystemAxisType"},
    "0014220E": {vr: "CS", vm: "1", name: "CoordinateSystemAxisUnits"},
    "00142210": {vr: "OB", vm: "1", name: "CoordinateSystemAxisValues"},
    "00142220": {vr: "SQ", vm: "1", name: "CoordinateSystemTransformSequence"},
    "00142222": {vr: "ST", vm: "1", name: "TransformDescription"},
    "00142224": {vr: "IS", vm: "1", name: "TransformNumberOfAxes"},
    "00142226": {vr: "IS", vm: "1-n", name: "TransformOrderOfAxes"},
    "00142228": {vr: "CS", vm: "1", name: "TransformedAxisUnits"},
    "0014222A": {vr: "DS", vm: "1-n", name: "CoordinateSystemTransformRotationAndScaleMatrix"},
    "0014222C": {vr: "DS", vm: "1-n", name: "CoordinateSystemTransformTranslationMatrix"},
    "00143011": {vr: "DS", vm: "1", name: "InternalDetectorFrameTime"},
    "00143012": {vr: "DS", vm: "1", name: "NumberOfFramesIntegrated"},
    "00143020": {vr: "SQ", vm: "1", name: "DetectorTemperatureSequence"},
    "00143022": {vr: "DS", vm: "1", name: "SensorName"},
    "00143024": {vr: "DS", vm: "1", name: "HorizontalOffsetOfSensor"},
    "00143026": {vr: "DS", vm: "1", name: "VerticalOffsetOfSensor"},
    "00143028": {vr: "DS", vm: "1", name: "SensorTemperature"},
    "00143040": {vr: "SQ", vm: "1", name: "DarkCurrentSequence"},
    "00143050": {vr: "OB|OW", vm: "1", name: "DarkCurrentCounts"},
    "00143060": {vr: "SQ", vm: "1", name: "GainCorrectionReferenceSequence"},
    "00143070": {vr: "OB|OW", vm: "1", name: "AirCounts"},
    "00143071": {vr: "DS", vm: "1", name: "KVUsedInGainCalibration"},
    "00143072": {vr: "DS", vm: "1", name: "MAUsedInGainCalibration"},
    "00143073": {vr: "DS", vm: "1", name: "NumberOfFramesUsedForIntegration"},
    "00143074": {vr: "LO", vm: "1", name: "FilterMaterialUsedInGainCalibration"},
    "00143075": {vr: "DS", vm: "1", name: "FilterThicknessUsedInGainCalibration"},
    "00143076": {vr: "DA", vm: "1", name: "DateOfGainCalibration"},
    "00143077": {vr: "TM", vm: "1", name: "TimeOfGainCalibration"},
    "00143080": {vr: "OB", vm: "1", name: "BadPixelImage"},
    "00143099": {vr: "LT", vm: "1", name: "CalibrationNotes"},
    "00144002": {vr: "SQ", vm: "1", name: "PulserEquipmentSequence"},
    "00144004": {vr: "CS", vm: "1", name: "PulserType"},
    "00144006": {vr: "LT", vm: "1", name: "PulserNotes"},
    "00144008": {vr: "SQ", vm: "1", name: "ReceiverEquipmentSequence"},
    "0014400A": {vr: "CS", vm: "1", name: "AmplifierType"},
    "0014400C": {vr: "LT", vm: "1", name: "ReceiverNotes"},
    "0014400E": {vr: "SQ", vm: "1", name: "PreAmplifierEquipmentSequence"},
    "0014400F": {vr: "LT", vm: "1", name: "PreAmplifierNotes"},
    "00144010": {vr: "SQ", vm: "1", name: "TransmitTransducerSequence"},
    "00144011": {vr: "SQ", vm: "1", name: "ReceiveTransducerSequence"},
    "00144012": {vr: "US", vm: "1", name: "NumberOfElements"},
    "00144013": {vr: "CS", vm: "1", name: "ElementShape"},
    "00144014": {vr: "DS", vm: "1", name: "ElementDimensionA"},
    "00144015": {vr: "DS", vm: "1", name: "ElementDimensionB"},
    "00144016": {vr: "DS", vm: "1", name: "ElementPitch"},
    "00144017": {vr: "DS", vm: "1", name: "MeasuredBeamDimensionA"},
    "00144018": {vr: "DS", vm: "1", name: "MeasuredBeamDimensionB"},
    "00144019": {vr: "DS", vm: "1", name: "LocationOfMeasuredBeamDiameter"},
    "0014401A": {vr: "DS", vm: "1", name: "NominalFrequency"},
    "0014401B": {vr: "DS", vm: "1", name: "MeasuredCenterFrequency"},
    "0014401C": {vr: "DS", vm: "1", name: "MeasuredBandwidth"},
    "00144020": {vr: "SQ", vm: "1", name: "PulserSettingsSequence"},
    "00144022": {vr: "DS", vm: "1", name: "PulseWidth"},
    "00144024": {vr: "DS", vm: "1", name: "ExcitationFrequency"},
    "00144026": {vr: "CS", vm: "1", name: "ModulationType"},
    "00144028": {vr: "DS", vm: "1", name: "Damping"},
    "00144030": {vr: "SQ", vm: "1", name: "ReceiverSettingsSequence"},
    "00144031": {vr: "DS", vm: "1", name: "AcquiredSoundpathLength"},
    "00144032": {vr: "CS", vm: "1", name: "AcquisitionCompressionType"},
    "00144033": {vr: "IS", vm: "1", name: "AcquisitionSampleSize"},
    "00144034": {vr: "DS", vm: "1", name: "RectifierSmoothing"},
    "00144035": {vr: "SQ", vm: "1", name: "DACSequence"},
    "00144036": {vr: "CS", vm: "1", name: "DACType"},
    "00144038": {vr: "DS", vm: "1-n", name: "DACGainPoints"},
    "0014403A": {vr: "DS", vm: "1-n", name: "DACTimePoints"},
    "0014403C": {vr: "DS", vm: "1-n", name: "DACAmplitude"},
    "00144040": {vr: "SQ", vm: "1", name: "PreAmplifierSettingsSequence"},
    "00144050": {vr: "SQ", vm: "1", name: "TransmitTransducerSettingsSequence"},
    "00144051": {vr: "SQ", vm: "1", name: "ReceiveTransducerSettingsSequence"},
    "00144052": {vr: "DS", vm: "1", name: "IncidentAngle"},
    "00144054": {vr: "ST", vm: "1", name: "CouplingTechnique"},
    "00144056": {vr: "ST", vm: "1", name: "CouplingMedium"},
    "00144057": {vr: "DS", vm: "1", name: "CouplingVelocity"},
    "00144058": {vr: "DS", vm: "1", name: "CrystalCenterLocationX"},
    "00144059": {vr: "DS", vm: "1", name: "CrystalCenterLocationZ"},
    "0014405A": {vr: "DS", vm: "1", name: "SoundPathLength"},
    "0014405C": {vr: "ST", vm: "1", name: "DelayLawIdentifier"},
    "00144060": {vr: "SQ", vm: "1", name: "GateSettingsSequence"},
    "00144062": {vr: "DS", vm: "1", name: "GateThreshold"},
    "00144064": {vr: "DS", vm: "1", name: "VelocityOfSound"},
    "00144070": {vr: "SQ", vm: "1", name: "CalibrationSettingsSequence"},
    "00144072": {vr: "ST", vm: "1", name: "CalibrationProcedure"},
    "00144074": {vr: "SH", vm: "1", name: "ProcedureVersion"},
    "00144076": {vr: "DA", vm: "1", name: "ProcedureCreationDate"},
    "00144078": {vr: "DA", vm: "1", name: "ProcedureExpirationDate"},
    "0014407A": {vr: "DA", vm: "1", name: "ProcedureLastModifiedDate"},
    "0014407C": {vr: "TM", vm: "1-n", name: "CalibrationTime"},
    "0014407E": {vr: "DA", vm: "1-n", name: "CalibrationDate"},
    "00145002": {vr: "IS", vm: "1", name: "LINACEnergy"},
    "00145004": {vr: "IS", vm: "1", name: "LINACOutput"},
    "00180010": {vr: "LO", vm: "1", name: "ContrastBolusAgent"},
    "00180012": {vr: "SQ", vm: "1", name: "ContrastBolusAgentSequence"},
    "00180014": {vr: "SQ", vm: "1", name: "ContrastBolusAdministrationRouteSequence"},
    "00180015": {vr: "CS", vm: "1", name: "BodyPartExamined"},
    "00180020": {vr: "CS", vm: "1-n", name: "ScanningSequence"},
    "00180021": {vr: "CS", vm: "1-n", name: "SequenceVariant"},
    "00180022": {vr: "CS", vm: "1-n", name: "ScanOptions"},
    "00180023": {vr: "CS", vm: "1", name: "MRAcquisitionType"},
    "00180024": {vr: "SH", vm: "1", name: "SequenceName"},
    "00180025": {vr: "CS", vm: "1", name: "AngioFlag"},
    "00180026": {vr: "SQ", vm: "1", name: "InterventionDrugInformationSequence"},
    "00180027": {vr: "TM", vm: "1", name: "InterventionDrugStopTime"},
    "00180028": {vr: "DS", vm: "1", name: "InterventionDrugDose"},
    "00180029": {vr: "SQ", vm: "1", name: "InterventionDrugCodeSequence"},
    "0018002A": {vr: "SQ", vm: "1", name: "AdditionalDrugSequence"},
    "00180030": {vr: "LO", vm: "1-n", name: "Radionuclide"},
    "00180031": {vr: "LO", vm: "1", name: "Radiopharmaceutical"},
    "00180032": {vr: "DS", vm: "1", name: "EnergyWindowCenterline"},
    "00180033": {vr: "DS", vm: "1-n", name: "EnergyWindowTotalWidth"},
    "00180034": {vr: "LO", vm: "1", name: "InterventionDrugName"},
    "00180035": {vr: "TM", vm: "1", name: "InterventionDrugStartTime"},
    "00180036": {vr: "SQ", vm: "1", name: "InterventionSequence"},
    "00180037": {vr: "CS", vm: "1", name: "TherapyType"},
    "00180038": {vr: "CS", vm: "1", name: "InterventionStatus"},
    "00180039": {vr: "CS", vm: "1", name: "TherapyDescription"},
    "0018003A": {vr: "ST", vm: "1", name: "InterventionDescription"},
    "00180040": {vr: "IS", vm: "1", name: "CineRate"},
    "00180042": {vr: "CS", vm: "1", name: "InitialCineRunState"},
    "00180050": {vr: "DS", vm: "1", name: "SliceThickness"},
    "00180060": {vr: "DS", vm: "1", name: "KVP"},
    "00180070": {vr: "IS", vm: "1", name: "CountsAccumulated"},
    "00180071": {vr: "CS", vm: "1", name: "AcquisitionTerminationCondition"},
    "00180072": {vr: "DS", vm: "1", name: "EffectiveDuration"},
    "00180073": {vr: "CS", vm: "1", name: "AcquisitionStartCondition"},
    "00180074": {vr: "IS", vm: "1", name: "AcquisitionStartConditionData"},
    "00180075": {vr: "IS", vm: "1", name: "AcquisitionTerminationConditionData"},
    "00180080": {vr: "DS", vm: "1", name: "RepetitionTime"},
    "00180081": {vr: "DS", vm: "1", name: "EchoTime"},
    "00180082": {vr: "DS", vm: "1", name: "InversionTime"},
    "00180083": {vr: "DS", vm: "1", name: "NumberOfAverages"},
    "00180084": {vr: "DS", vm: "1", name: "ImagingFrequency"},
    "00180085": {vr: "SH", vm: "1", name: "ImagedNucleus"},
    "00180086": {vr: "IS", vm: "1-n", name: "EchoNumbers"},
    "00180087": {vr: "DS", vm: "1", name: "MagneticFieldStrength"},
    "00180088": {vr: "DS", vm: "1", name: "SpacingBetweenSlices"},
    "00180089": {vr: "IS", vm: "1", name: "NumberOfPhaseEncodingSteps"},
    "00180090": {vr: "DS", vm: "1", name: "DataCollectionDiameter"},
    "00180091": {vr: "IS", vm: "1", name: "EchoTrainLength"},
    "00180093": {vr: "DS", vm: "1", name: "PercentSampling"},
    "00180094": {vr: "DS", vm: "1", name: "PercentPhaseFieldOfView"},
    "00180095": {vr: "DS", vm: "1", name: "PixelBandwidth"},
    "00181000": {vr: "LO", vm: "1", name: "DeviceSerialNumber"},
    "00181002": {vr: "UI", vm: "1", name: "DeviceUID"},
    "00181003": {vr: "LO", vm: "1", name: "DeviceID"},
    "00181004": {vr: "LO", vm: "1", name: "PlateID"},
    "00181005": {vr: "LO", vm: "1", name: "GeneratorID"},
    "00181006": {vr: "LO", vm: "1", name: "GridID"},
    "00181007": {vr: "LO", vm: "1", name: "CassetteID"},
    "00181008": {vr: "LO", vm: "1", name: "GantryID"},
    "00181010": {vr: "LO", vm: "1", name: "SecondaryCaptureDeviceID"},
    "00181011": {vr: "LO", vm: "1", name: "HardcopyCreationDeviceID"},
    "00181012": {vr: "DA", vm: "1", name: "DateOfSecondaryCapture"},
    "00181014": {vr: "TM", vm: "1", name: "TimeOfSecondaryCapture"},
    "00181016": {vr: "LO", vm: "1", name: "SecondaryCaptureDeviceManufacturer"},
    "00181017": {vr: "LO", vm: "1", name: "HardcopyDeviceManufacturer"},
    "00181018": {vr: "LO", vm: "1", name: "SecondaryCaptureDeviceManufacturerModelName"},
    "00181019": {vr: "LO", vm: "1-n", name: "SecondaryCaptureDeviceSoftwareVersions"},
    "0018101A": {vr: "LO", vm: "1-n", name: "HardcopyDeviceSoftwareVersion"},
    "0018101B": {vr: "LO", vm: "1", name: "HardcopyDeviceManufacturerModelName"},
    "00181020": {vr: "LO", vm: "1-n", name: "SoftwareVersions"},
    "00181022": {vr: "SH", vm: "1", name: "VideoImageFormatAcquired"},
    "00181023": {vr: "LO", vm: "1", name: "DigitalImageFormatAcquired"},
    "00181030": {vr: "LO", vm: "1", name: "ProtocolName"},
    "00181040": {vr: "LO", vm: "1", name: "ContrastBolusRoute"},
    "00181041": {vr: "DS", vm: "1", name: "ContrastBolusVolume"},
    "00181042": {vr: "TM", vm: "1", name: "ContrastBolusStartTime"},
    "00181043": {vr: "TM", vm: "1", name: "ContrastBolusStopTime"},
    "00181044": {vr: "DS", vm: "1", name: "ContrastBolusTotalDose"},
    "00181045": {vr: "IS", vm: "1", name: "SyringeCounts"},
    "00181046": {vr: "DS", vm: "1-n", name: "ContrastFlowRate"},
    "00181047": {vr: "DS", vm: "1-n", name: "ContrastFlowDuration"},
    "00181048": {vr: "CS", vm: "1", name: "ContrastBolusIngredient"},
    "00181049": {vr: "DS", vm: "1", name: "ContrastBolusIngredientConcentration"},
    "00181050": {vr: "DS", vm: "1", name: "SpatialResolution"},
    "00181060": {vr: "DS", vm: "1", name: "TriggerTime"},
    "00181061": {vr: "LO", vm: "1", name: "TriggerSourceOrType"},
    "00181062": {vr: "IS", vm: "1", name: "NominalInterval"},
    "00181063": {vr: "DS", vm: "1", name: "FrameTime"},
    "00181064": {vr: "LO", vm: "1", name: "CardiacFramingType"},
    "00181065": {vr: "DS", vm: "1-n", name: "FrameTimeVector"},
    "00181066": {vr: "DS", vm: "1", name: "FrameDelay"},
    "00181067": {vr: "DS", vm: "1", name: "ImageTriggerDelay"},
    "00181068": {vr: "DS", vm: "1", name: "MultiplexGroupTimeOffset"},
    "00181069": {vr: "DS", vm: "1", name: "TriggerTimeOffset"},
    "0018106A": {vr: "CS", vm: "1", name: "SynchronizationTrigger"},
    "0018106C": {vr: "US", vm: "2", name: "SynchronizationChannel"},
    "0018106E": {vr: "UL", vm: "1", name: "TriggerSamplePosition"},
    "00181070": {vr: "LO", vm: "1", name: "RadiopharmaceuticalRoute"},
    "00181071": {vr: "DS", vm: "1", name: "RadiopharmaceuticalVolume"},
    "00181072": {vr: "TM", vm: "1", name: "RadiopharmaceuticalStartTime"},
    "00181073": {vr: "TM", vm: "1", name: "RadiopharmaceuticalStopTime"},
    "00181074": {vr: "DS", vm: "1", name: "RadionuclideTotalDose"},
    "00181075": {vr: "DS", vm: "1", name: "RadionuclideHalfLife"},
    "00181076": {vr: "DS", vm: "1", name: "RadionuclidePositronFraction"},
    "00181077": {vr: "DS", vm: "1", name: "RadiopharmaceuticalSpecificActivity"},
    "00181078": {vr: "DT", vm: "1", name: "RadiopharmaceuticalStartDateTime"},
    "00181079": {vr: "DT", vm: "1", name: "RadiopharmaceuticalStopDateTime"},
    "00181080": {vr: "CS", vm: "1", name: "BeatRejectionFlag"},
    "00181081": {vr: "IS", vm: "1", name: "LowRRValue"},
    "00181082": {vr: "IS", vm: "1", name: "HighRRValue"},
    "00181083": {vr: "IS", vm: "1", name: "IntervalsAcquired"},
    "00181084": {vr: "IS", vm: "1", name: "IntervalsRejected"},
    "00181085": {vr: "LO", vm: "1", name: "PVCRejection"},
    "00181086": {vr: "IS", vm: "1", name: "SkipBeats"},
    "00181088": {vr: "IS", vm: "1", name: "HeartRate"},
    "00181090": {vr: "IS", vm: "1", name: "CardiacNumberOfImages"},
    "00181094": {vr: "IS", vm: "1", name: "TriggerWindow"},
    "00181100": {vr: "DS", vm: "1", name: "ReconstructionDiameter"},
    "00181110": {vr: "DS", vm: "1", name: "DistanceSourceToDetector"},
    "00181111": {vr: "DS", vm: "1", name: "DistanceSourceToPatient"},
    "00181114": {vr: "DS", vm: "1", name: "EstimatedRadiographicMagnificationFactor"},
    "00181120": {vr: "DS", vm: "1", name: "GantryDetectorTilt"},
    "00181121": {vr: "DS", vm: "1", name: "GantryDetectorSlew"},
    "00181130": {vr: "DS", vm: "1", name: "TableHeight"},
    "00181131": {vr: "DS", vm: "1", name: "TableTraverse"},
    "00181134": {vr: "CS", vm: "1", name: "TableMotion"},
    "00181135": {vr: "DS", vm: "1-n", name: "TableVerticalIncrement"},
    "00181136": {vr: "DS", vm: "1-n", name: "TableLateralIncrement"},
    "00181137": {vr: "DS", vm: "1-n", name: "TableLongitudinalIncrement"},
    "00181138": {vr: "DS", vm: "1", name: "TableAngle"},
    "0018113A": {vr: "CS", vm: "1", name: "TableType"},
    "00181140": {vr: "CS", vm: "1", name: "RotationDirection"},
    "00181141": {vr: "DS", vm: "1", name: "AngularPosition"},
    "00181142": {vr: "DS", vm: "1-n", name: "RadialPosition"},
    "00181143": {vr: "DS", vm: "1", name: "ScanArc"},
    "00181144": {vr: "DS", vm: "1", name: "AngularStep"},
    "00181145": {vr: "DS", vm: "1", name: "CenterOfRotationOffset"},
    "00181146": {vr: "DS", vm: "1-n", name: "RotationOffset"},
    "00181147": {vr: "CS", vm: "1", name: "FieldOfViewShape"},
    "00181149": {vr: "IS", vm: "1-2", name: "FieldOfViewDimensions"},
    "00181150": {vr: "IS", vm: "1", name: "ExposureTime"},
    "00181151": {vr: "IS", vm: "1", name: "XRayTubeCurrent"},
    "00181152": {vr: "IS", vm: "1", name: "Exposure"},
    "00181153": {vr: "IS", vm: "1", name: "ExposureInuAs"},
    "00181154": {vr: "DS", vm: "1", name: "AveragePulseWidth"},
    "00181155": {vr: "CS", vm: "1", name: "RadiationSetting"},
    "00181156": {vr: "CS", vm: "1", name: "RectificationType"},
    "0018115A": {vr: "CS", vm: "1", name: "RadiationMode"},
    "0018115E": {vr: "DS", vm: "1", name: "ImageAndFluoroscopyAreaDoseProduct"},
    "00181160": {vr: "SH", vm: "1", name: "FilterType"},
    "00181161": {vr: "LO", vm: "1-n", name: "TypeOfFilters"},
    "00181162": {vr: "DS", vm: "1", name: "IntensifierSize"},
    "00181164": {vr: "DS", vm: "2", name: "ImagerPixelSpacing"},
    "00181166": {vr: "CS", vm: "1-n", name: "Grid"},
    "00181170": {vr: "IS", vm: "1", name: "GeneratorPower"},
    "00181180": {vr: "SH", vm: "1", name: "CollimatorGridName"},
    "00181181": {vr: "CS", vm: "1", name: "CollimatorType"},
    "00181182": {vr: "IS", vm: "1-2", name: "FocalDistance"},
    "00181183": {vr: "DS", vm: "1-2", name: "XFocusCenter"},
    "00181184": {vr: "DS", vm: "1-2", name: "YFocusCenter"},
    "00181190": {vr: "DS", vm: "1-n", name: "FocalSpots"},
    "00181191": {vr: "CS", vm: "1", name: "AnodeTargetMaterial"},
    "001811A0": {vr: "DS", vm: "1", name: "BodyPartThickness"},
    "001811A2": {vr: "DS", vm: "1", name: "CompressionForce"},
    "00181200": {vr: "DA", vm: "1-n", name: "DateOfLastCalibration"},
    "00181201": {vr: "TM", vm: "1-n", name: "TimeOfLastCalibration"},
    "00181210": {vr: "SH", vm: "1-n", name: "ConvolutionKernel"},
    "00181240": {vr: "IS", vm: "1-n", name: "UpperLowerPixelValues"},
    "00181242": {vr: "IS", vm: "1", name: "ActualFrameDuration"},
    "00181243": {vr: "IS", vm: "1", name: "CountRate"},
    "00181244": {vr: "US", vm: "1", name: "PreferredPlaybackSequencing"},
    "00181250": {vr: "SH", vm: "1", name: "ReceiveCoilName"},
    "00181251": {vr: "SH", vm: "1", name: "TransmitCoilName"},
    "00181260": {vr: "SH", vm: "1", name: "PlateType"},
    "00181261": {vr: "LO", vm: "1", name: "PhosphorType"},
    "00181300": {vr: "DS", vm: "1", name: "ScanVelocity"},
    "00181301": {vr: "CS", vm: "1-n", name: "WholeBodyTechnique"},
    "00181302": {vr: "IS", vm: "1", name: "ScanLength"},
    "00181310": {vr: "US", vm: "4", name: "AcquisitionMatrix"},
    "00181312": {vr: "CS", vm: "1", name: "InPlanePhaseEncodingDirection"},
    "00181314": {vr: "DS", vm: "1", name: "FlipAngle"},
    "00181315": {vr: "CS", vm: "1", name: "VariableFlipAngleFlag"},
    "00181316": {vr: "DS", vm: "1", name: "SAR"},
    "00181318": {vr: "DS", vm: "1", name: "dBdt"},
    "00181400": {vr: "LO", vm: "1", name: "AcquisitionDeviceProcessingDescription"},
    "00181401": {vr: "LO", vm: "1", name: "AcquisitionDeviceProcessingCode"},
    "00181402": {vr: "CS", vm: "1", name: "CassetteOrientation"},
    "00181403": {vr: "CS", vm: "1", name: "CassetteSize"},
    "00181404": {vr: "US", vm: "1", name: "ExposuresOnPlate"},
    "00181405": {vr: "IS", vm: "1", name: "RelativeXRayExposure"},
    "00181411": {vr: "DS", vm: "1", name: "ExposureIndex"},
    "00181412": {vr: "DS", vm: "1", name: "TargetExposureIndex"},
    "00181413": {vr: "DS", vm: "1", name: "DeviationIndex"},
    "00181450": {vr: "DS", vm: "1", name: "ColumnAngulation"},
    "00181460": {vr: "DS", vm: "1", name: "TomoLayerHeight"},
    "00181470": {vr: "DS", vm: "1", name: "TomoAngle"},
    "00181480": {vr: "DS", vm: "1", name: "TomoTime"},
    "00181490": {vr: "CS", vm: "1", name: "TomoType"},
    "00181491": {vr: "CS", vm: "1", name: "TomoClass"},
    "00181495": {vr: "IS", vm: "1", name: "NumberOfTomosynthesisSourceImages"},
    "00181500": {vr: "CS", vm: "1", name: "PositionerMotion"},
    "00181508": {vr: "CS", vm: "1", name: "PositionerType"},
    "00181510": {vr: "DS", vm: "1", name: "PositionerPrimaryAngle"},
    "00181511": {vr: "DS", vm: "1", name: "PositionerSecondaryAngle"},
    "00181520": {vr: "DS", vm: "1-n", name: "PositionerPrimaryAngleIncrement"},
    "00181521": {vr: "DS", vm: "1-n", name: "PositionerSecondaryAngleIncrement"},
    "00181530": {vr: "DS", vm: "1", name: "DetectorPrimaryAngle"},
    "00181531": {vr: "DS", vm: "1", name: "DetectorSecondaryAngle"},
    "00181600": {vr: "CS", vm: "1-3", name: "ShutterShape"},
    "00181602": {vr: "IS", vm: "1", name: "ShutterLeftVerticalEdge"},
    "00181604": {vr: "IS", vm: "1", name: "ShutterRightVerticalEdge"},
    "00181606": {vr: "IS", vm: "1", name: "ShutterUpperHorizontalEdge"},
    "00181608": {vr: "IS", vm: "1", name: "ShutterLowerHorizontalEdge"},
    "00181610": {vr: "IS", vm: "2", name: "CenterOfCircularShutter"},
    "00181612": {vr: "IS", vm: "1", name: "RadiusOfCircularShutter"},
    "00181620": {vr: "IS", vm: "2-2n", name: "VerticesOfThePolygonalShutter"},
    "00181622": {vr: "US", vm: "1", name: "ShutterPresentationValue"},
    "00181623": {vr: "US", vm: "1", name: "ShutterOverlayGroup"},
    "00181624": {vr: "US", vm: "3", name: "ShutterPresentationColorCIELabValue"},
    "00181700": {vr: "CS", vm: "1-3", name: "CollimatorShape"},
    "00181702": {vr: "IS", vm: "1", name: "CollimatorLeftVerticalEdge"},
    "00181704": {vr: "IS", vm: "1", name: "CollimatorRightVerticalEdge"},
    "00181706": {vr: "IS", vm: "1", name: "CollimatorUpperHorizontalEdge"},
    "00181708": {vr: "IS", vm: "1", name: "CollimatorLowerHorizontalEdge"},
    "00181710": {vr: "IS", vm: "2", name: "CenterOfCircularCollimator"},
    "00181712": {vr: "IS", vm: "1", name: "RadiusOfCircularCollimator"},
    "00181720": {vr: "IS", vm: "2-2n", name: "VerticesOfThePolygonalCollimator"},
    "00181800": {vr: "CS", vm: "1", name: "AcquisitionTimeSynchronized"},
    "00181801": {vr: "SH", vm: "1", name: "TimeSource"},
    "00181802": {vr: "CS", vm: "1", name: "TimeDistributionProtocol"},
    "00181803": {vr: "LO", vm: "1", name: "NTPSourceAddress"},
    "00182001": {vr: "IS", vm: "1-n", name: "PageNumberVector"},
    "00182002": {vr: "SH", vm: "1-n", name: "FrameLabelVector"},
    "00182003": {vr: "DS", vm: "1-n", name: "FramePrimaryAngleVector"},
    "00182004": {vr: "DS", vm: "1-n", name: "FrameSecondaryAngleVector"},
    "00182005": {vr: "DS", vm: "1-n", name: "SliceLocationVector"},
    "00182006": {vr: "SH", vm: "1-n", name: "DisplayWindowLabelVector"},
    "00182010": {vr: "DS", vm: "2", name: "NominalScannedPixelSpacing"},
    "00182020": {vr: "CS", vm: "1", name: "DigitizingDeviceTransportDirection"},
    "00182030": {vr: "DS", vm: "1", name: "RotationOfScannedFilm"},
    "00183100": {vr: "CS", vm: "1", name: "IVUSAcquisition"},
    "00183101": {vr: "DS", vm: "1", name: "IVUSPullbackRate"},
    "00183102": {vr: "DS", vm: "1", name: "IVUSGatedRate"},
    "00183103": {vr: "IS", vm: "1", name: "IVUSPullbackStartFrameNumber"},
    "00183104": {vr: "IS", vm: "1", name: "IVUSPullbackStopFrameNumber"},
    "00183105": {vr: "IS", vm: "1-n", name: "LesionNumber"},
    "00184000": {vr: "LT", vm: "1", name: "AcquisitionComments"},
    "00185000": {vr: "SH", vm: "1-n", name: "OutputPower"},
    "00185010": {vr: "LO", vm: "1-n", name: "TransducerData"},
    "00185012": {vr: "DS", vm: "1", name: "FocusDepth"},
    "00185020": {vr: "LO", vm: "1", name: "ProcessingFunction"},
    "00185021": {vr: "LO", vm: "1", name: "PostprocessingFunction"},
    "00185022": {vr: "DS", vm: "1", name: "MechanicalIndex"},
    "00185024": {vr: "DS", vm: "1", name: "BoneThermalIndex"},
    "00185026": {vr: "DS", vm: "1", name: "CranialThermalIndex"},
    "00185027": {vr: "DS", vm: "1", name: "SoftTissueThermalIndex"},
    "00185028": {vr: "DS", vm: "1", name: "SoftTissueFocusThermalIndex"},
    "00185029": {vr: "DS", vm: "1", name: "SoftTissueSurfaceThermalIndex"},
    "00185030": {vr: "DS", vm: "1", name: "DynamicRange"},
    "00185040": {vr: "DS", vm: "1", name: "TotalGain"},
    "00185050": {vr: "IS", vm: "1", name: "DepthOfScanField"},
    "00185100": {vr: "CS", vm: "1", name: "PatientPosition"},
    "00185101": {vr: "CS", vm: "1", name: "ViewPosition"},
    "00185104": {vr: "SQ", vm: "1", name: "ProjectionEponymousNameCodeSequence"},
    "00185210": {vr: "DS", vm: "6", name: "ImageTransformationMatrix"},
    "00185212": {vr: "DS", vm: "3", name: "ImageTranslationVector"},
    "00186000": {vr: "DS", vm: "1", name: "Sensitivity"},
    "00186011": {vr: "SQ", vm: "1", name: "SequenceOfUltrasoundRegions"},
    "00186012": {vr: "US", vm: "1", name: "RegionSpatialFormat"},
    "00186014": {vr: "US", vm: "1", name: "RegionDataType"},
    "00186016": {vr: "UL", vm: "1", name: "RegionFlags"},
    "00186018": {vr: "UL", vm: "1", name: "RegionLocationMinX0"},
    "0018601A": {vr: "UL", vm: "1", name: "RegionLocationMinY0"},
    "0018601C": {vr: "UL", vm: "1", name: "RegionLocationMaxX1"},
    "0018601E": {vr: "UL", vm: "1", name: "RegionLocationMaxY1"},
    "00186020": {vr: "SL", vm: "1", name: "ReferencePixelX0"},
    "00186022": {vr: "SL", vm: "1", name: "ReferencePixelY0"},
    "00186024": {vr: "US", vm: "1", name: "PhysicalUnitsXDirection"},
    "00186026": {vr: "US", vm: "1", name: "PhysicalUnitsYDirection"},
    "00186028": {vr: "FD", vm: "1", name: "ReferencePixelPhysicalValueX"},
    "0018602A": {vr: "FD", vm: "1", name: "ReferencePixelPhysicalValueY"},
    "0018602C": {vr: "FD", vm: "1", name: "PhysicalDeltaX"},
    "0018602E": {vr: "FD", vm: "1", name: "PhysicalDeltaY"},
    "00186030": {vr: "UL", vm: "1", name: "TransducerFrequency"},
    "00186031": {vr: "CS", vm: "1", name: "TransducerType"},
    "00186032": {vr: "UL", vm: "1", name: "PulseRepetitionFrequency"},
    "00186034": {vr: "FD", vm: "1", name: "DopplerCorrectionAngle"},
    "00186036": {vr: "FD", vm: "1", name: "SteeringAngle"},
    "00186038": {vr: "UL", vm: "1", name: "DopplerSampleVolumeXPositionRetired"},
    "00186039": {vr: "SL", vm: "1", name: "DopplerSampleVolumeXPosition"},
    "0018603A": {vr: "UL", vm: "1", name: "DopplerSampleVolumeYPositionRetired"},
    "0018603B": {vr: "SL", vm: "1", name: "DopplerSampleVolumeYPosition"},
    "0018603C": {vr: "UL", vm: "1", name: "TMLinePositionX0Retired"},
    "0018603D": {vr: "SL", vm: "1", name: "TMLinePositionX0"},
    "0018603E": {vr: "UL", vm: "1", name: "TMLinePositionY0Retired"},
    "0018603F": {vr: "SL", vm: "1", name: "TMLinePositionY0"},
    "00186040": {vr: "UL", vm: "1", name: "TMLinePositionX1Retired"},
    "00186041": {vr: "SL", vm: "1", name: "TMLinePositionX1"},
    "00186042": {vr: "UL", vm: "1", name: "TMLinePositionY1Retired"},
    "00186043": {vr: "SL", vm: "1", name: "TMLinePositionY1"},
    "00186044": {vr: "US", vm: "1", name: "PixelComponentOrganization"},
    "00186046": {vr: "UL", vm: "1", name: "PixelComponentMask"},
    "00186048": {vr: "UL", vm: "1", name: "PixelComponentRangeStart"},
    "0018604A": {vr: "UL", vm: "1", name: "PixelComponentRangeStop"},
    "0018604C": {vr: "US", vm: "1", name: "PixelComponentPhysicalUnits"},
    "0018604E": {vr: "US", vm: "1", name: "PixelComponentDataType"},
    "00186050": {vr: "UL", vm: "1", name: "NumberOfTableBreakPoints"},
    "00186052": {vr: "UL", vm: "1-n", name: "TableOfXBreakPoints"},
    "00186054": {vr: "FD", vm: "1-n", name: "TableOfYBreakPoints"},
    "00186056": {vr: "UL", vm: "1", name: "NumberOfTableEntries"},
    "00186058": {vr: "UL", vm: "1-n", name: "TableOfPixelValues"},
    "0018605A": {vr: "FL", vm: "1-n", name: "TableOfParameterValues"},
    "00186060": {vr: "FL", vm: "1-n", name: "RWaveTimeVector"},
    "00187000": {vr: "CS", vm: "1", name: "DetectorConditionsNominalFlag"},
    "00187001": {vr: "DS", vm: "1", name: "DetectorTemperature"},
    "00187004": {vr: "CS", vm: "1", name: "DetectorType"},
    "00187005": {vr: "CS", vm: "1", name: "DetectorConfiguration"},
    "00187006": {vr: "LT", vm: "1", name: "DetectorDescription"},
    "00187008": {vr: "LT", vm: "1", name: "DetectorMode"},
    "0018700A": {vr: "SH", vm: "1", name: "DetectorID"},
    "0018700C": {vr: "DA", vm: "1", name: "DateOfLastDetectorCalibration"},
    "0018700E": {vr: "TM", vm: "1", name: "TimeOfLastDetectorCalibration"},
    "00187010": {vr: "IS", vm: "1", name: "ExposuresOnDetectorSinceLastCalibration"},
    "00187011": {vr: "IS", vm: "1", name: "ExposuresOnDetectorSinceManufactured"},
    "00187012": {vr: "DS", vm: "1", name: "DetectorTimeSinceLastExposure"},
    "00187014": {vr: "DS", vm: "1", name: "DetectorActiveTime"},
    "00187016": {vr: "DS", vm: "1", name: "DetectorActivationOffsetFromExposure"},
    "0018701A": {vr: "DS", vm: "2", name: "DetectorBinning"},
    "00187020": {vr: "DS", vm: "2", name: "DetectorElementPhysicalSize"},
    "00187022": {vr: "DS", vm: "2", name: "DetectorElementSpacing"},
    "00187024": {vr: "CS", vm: "1", name: "DetectorActiveShape"},
    "00187026": {vr: "DS", vm: "1-2", name: "DetectorActiveDimensions"},
    "00187028": {vr: "DS", vm: "2", name: "DetectorActiveOrigin"},
    "0018702A": {vr: "LO", vm: "1", name: "DetectorManufacturerName"},
    "0018702B": {vr: "LO", vm: "1", name: "DetectorManufacturerModelName"},
    "00187030": {vr: "DS", vm: "2", name: "FieldOfViewOrigin"},
    "00187032": {vr: "DS", vm: "1", name: "FieldOfViewRotation"},
    "00187034": {vr: "CS", vm: "1", name: "FieldOfViewHorizontalFlip"},
    "00187036": {vr: "FL", vm: "2", name: "PixelDataAreaOriginRelativeToFOV"},
    "00187038": {vr: "FL", vm: "1", name: "PixelDataAreaRotationAngleRelativeToFOV"},
    "00187040": {vr: "LT", vm: "1", name: "GridAbsorbingMaterial"},
    "00187041": {vr: "LT", vm: "1", name: "GridSpacingMaterial"},
    "00187042": {vr: "DS", vm: "1", name: "GridThickness"},
    "00187044": {vr: "DS", vm: "1", name: "GridPitch"},
    "00187046": {vr: "IS", vm: "2", name: "GridAspectRatio"},
    "00187048": {vr: "DS", vm: "1", name: "GridPeriod"},
    "0018704C": {vr: "DS", vm: "1", name: "GridFocalDistance"},
    "00187050": {vr: "CS", vm: "1-n", name: "FilterMaterial"},
    "00187052": {vr: "DS", vm: "1-n", name: "FilterThicknessMinimum"},
    "00187054": {vr: "DS", vm: "1-n", name: "FilterThicknessMaximum"},
    "00187056": {vr: "FL", vm: "1-n", name: "FilterBeamPathLengthMinimum"},
    "00187058": {vr: "FL", vm: "1-n", name: "FilterBeamPathLengthMaximum"},
    "00187060": {vr: "CS", vm: "1", name: "ExposureControlMode"},
    "00187062": {vr: "LT", vm: "1", name: "ExposureControlModeDescription"},
    "00187064": {vr: "CS", vm: "1", name: "ExposureStatus"},
    "00187065": {vr: "DS", vm: "1", name: "PhototimerSetting"},
    "00188150": {vr: "DS", vm: "1", name: "ExposureTimeInuS"},
    "00188151": {vr: "DS", vm: "1", name: "XRayTubeCurrentInuA"},
    "00189004": {vr: "CS", vm: "1", name: "ContentQualification"},
    "00189005": {vr: "SH", vm: "1", name: "PulseSequenceName"},
    "00189006": {vr: "SQ", vm: "1", name: "MRImagingModifierSequence"},
    "00189008": {vr: "CS", vm: "1", name: "EchoPulseSequence"},
    "00189009": {vr: "CS", vm: "1", name: "InversionRecovery"},
    "00189010": {vr: "CS", vm: "1", name: "FlowCompensation"},
    "00189011": {vr: "CS", vm: "1", name: "MultipleSpinEcho"},
    "00189012": {vr: "CS", vm: "1", name: "MultiPlanarExcitation"},
    "00189014": {vr: "CS", vm: "1", name: "PhaseContrast"},
    "00189015": {vr: "CS", vm: "1", name: "TimeOfFlightContrast"},
    "00189016": {vr: "CS", vm: "1", name: "Spoiling"},
    "00189017": {vr: "CS", vm: "1", name: "SteadyStatePulseSequence"},
    "00189018": {vr: "CS", vm: "1", name: "EchoPlanarPulseSequence"},
    "00189019": {vr: "FD", vm: "1", name: "TagAngleFirstAxis"},
    "00189020": {vr: "CS", vm: "1", name: "MagnetizationTransfer"},
    "00189021": {vr: "CS", vm: "1", name: "T2Preparation"},
    "00189022": {vr: "CS", vm: "1", name: "BloodSignalNulling"},
    "00189024": {vr: "CS", vm: "1", name: "SaturationRecovery"},
    "00189025": {vr: "CS", vm: "1", name: "SpectrallySelectedSuppression"},
    "00189026": {vr: "CS", vm: "1", name: "SpectrallySelectedExcitation"},
    "00189027": {vr: "CS", vm: "1", name: "SpatialPresaturation"},
    "00189028": {vr: "CS", vm: "1", name: "Tagging"},
    "00189029": {vr: "CS", vm: "1", name: "OversamplingPhase"},
    "00189030": {vr: "FD", vm: "1", name: "TagSpacingFirstDimension"},
    "00189032": {vr: "CS", vm: "1", name: "GeometryOfKSpaceTraversal"},
    "00189033": {vr: "CS", vm: "1", name: "SegmentedKSpaceTraversal"},
    "00189034": {vr: "CS", vm: "1", name: "RectilinearPhaseEncodeReordering"},
    "00189035": {vr: "FD", vm: "1", name: "TagThickness"},
    "00189036": {vr: "CS", vm: "1", name: "PartialFourierDirection"},
    "00189037": {vr: "CS", vm: "1", name: "CardiacSynchronizationTechnique"},
    "00189041": {vr: "LO", vm: "1", name: "ReceiveCoilManufacturerName"},
    "00189042": {vr: "SQ", vm: "1", name: "MRReceiveCoilSequence"},
    "00189043": {vr: "CS", vm: "1", name: "ReceiveCoilType"},
    "00189044": {vr: "CS", vm: "1", name: "QuadratureReceiveCoil"},
    "00189045": {vr: "SQ", vm: "1", name: "MultiCoilDefinitionSequence"},
    "00189046": {vr: "LO", vm: "1", name: "MultiCoilConfiguration"},
    "00189047": {vr: "SH", vm: "1", name: "MultiCoilElementName"},
    "00189048": {vr: "CS", vm: "1", name: "MultiCoilElementUsed"},
    "00189049": {vr: "SQ", vm: "1", name: "MRTransmitCoilSequence"},
    "00189050": {vr: "LO", vm: "1", name: "TransmitCoilManufacturerName"},
    "00189051": {vr: "CS", vm: "1", name: "TransmitCoilType"},
    "00189052": {vr: "FD", vm: "1-2", name: "SpectralWidth"},
    "00189053": {vr: "FD", vm: "1-2", name: "ChemicalShiftReference"},
    "00189054": {vr: "CS", vm: "1", name: "VolumeLocalizationTechnique"},
    "00189058": {vr: "US", vm: "1", name: "MRAcquisitionFrequencyEncodingSteps"},
    "00189059": {vr: "CS", vm: "1", name: "Decoupling"},
    "00189060": {vr: "CS", vm: "1-2", name: "DecoupledNucleus"},
    "00189061": {vr: "FD", vm: "1-2", name: "DecouplingFrequency"},
    "00189062": {vr: "CS", vm: "1", name: "DecouplingMethod"},
    "00189063": {vr: "FD", vm: "1-2", name: "DecouplingChemicalShiftReference"},
    "00189064": {vr: "CS", vm: "1", name: "KSpaceFiltering"},
    "00189065": {vr: "CS", vm: "1-2", name: "TimeDomainFiltering"},
    "00189066": {vr: "US", vm: "1-2", name: "NumberOfZeroFills"},
    "00189067": {vr: "CS", vm: "1", name: "BaselineCorrection"},
    "00189069": {vr: "FD", vm: "1", name: "ParallelReductionFactorInPlane"},
    "00189070": {vr: "FD", vm: "1", name: "CardiacRRIntervalSpecified"},
    "00189073": {vr: "FD", vm: "1", name: "AcquisitionDuration"},
    "00189074": {vr: "DT", vm: "1", name: "FrameAcquisitionDateTime"},
    "00189075": {vr: "CS", vm: "1", name: "DiffusionDirectionality"},
    "00189076": {vr: "SQ", vm: "1", name: "DiffusionGradientDirectionSequence"},
    "00189077": {vr: "CS", vm: "1", name: "ParallelAcquisition"},
    "00189078": {vr: "CS", vm: "1", name: "ParallelAcquisitionTechnique"},
    "00189079": {vr: "FD", vm: "1-n", name: "InversionTimes"},
    "00189080": {vr: "ST", vm: "1", name: "MetaboliteMapDescription"},
    "00189081": {vr: "CS", vm: "1", name: "PartialFourier"},
    "00189082": {vr: "FD", vm: "1", name: "EffectiveEchoTime"},
    "00189083": {vr: "SQ", vm: "1", name: "MetaboliteMapCodeSequence"},
    "00189084": {vr: "SQ", vm: "1", name: "ChemicalShiftSequence"},
    "00189085": {vr: "CS", vm: "1", name: "CardiacSignalSource"},
    "00189087": {vr: "FD", vm: "1", name: "DiffusionBValue"},
    "00189089": {vr: "FD", vm: "3", name: "DiffusionGradientOrientation"},
    "00189090": {vr: "FD", vm: "3", name: "VelocityEncodingDirection"},
    "00189091": {vr: "FD", vm: "1", name: "VelocityEncodingMinimumValue"},
    "00189092": {vr: "SQ", vm: "1", name: "VelocityEncodingAcquisitionSequence"},
    "00189093": {vr: "US", vm: "1", name: "NumberOfKSpaceTrajectories"},
    "00189094": {vr: "CS", vm: "1", name: "CoverageOfKSpace"},
    "00189095": {vr: "UL", vm: "1", name: "SpectroscopyAcquisitionPhaseRows"},
    "00189096": {vr: "FD", vm: "1", name: "ParallelReductionFactorInPlaneRetired"},
    "00189098": {vr: "FD", vm: "1-2", name: "TransmitterFrequency"},
    "00189100": {vr: "CS", vm: "1-2", name: "ResonantNucleus"},
    "00189101": {vr: "CS", vm: "1", name: "FrequencyCorrection"},
    "00189103": {vr: "SQ", vm: "1", name: "MRSpectroscopyFOVGeometrySequence"},
    "00189104": {vr: "FD", vm: "1", name: "SlabThickness"},
    "00189105": {vr: "FD", vm: "3", name: "SlabOrientation"},
    "00189106": {vr: "FD", vm: "3", name: "MidSlabPosition"},
    "00189107": {vr: "SQ", vm: "1", name: "MRSpatialSaturationSequence"},
    "00189112": {vr: "SQ", vm: "1", name: "MRTimingAndRelatedParametersSequence"},
    "00189114": {vr: "SQ", vm: "1", name: "MREchoSequence"},
    "00189115": {vr: "SQ", vm: "1", name: "MRModifierSequence"},
    "00189117": {vr: "SQ", vm: "1", name: "MRDiffusionSequence"},
    "00189118": {vr: "SQ", vm: "1", name: "CardiacSynchronizationSequence"},
    "00189119": {vr: "SQ", vm: "1", name: "MRAveragesSequence"},
    "00189125": {vr: "SQ", vm: "1", name: "MRFOVGeometrySequence"},
    "00189126": {vr: "SQ", vm: "1", name: "VolumeLocalizationSequence"},
    "00189127": {vr: "UL", vm: "1", name: "SpectroscopyAcquisitionDataColumns"},
    "00189147": {vr: "CS", vm: "1", name: "DiffusionAnisotropyType"},
    "00189151": {vr: "DT", vm: "1", name: "FrameReferenceDateTime"},
    "00189152": {vr: "SQ", vm: "1", name: "MRMetaboliteMapSequence"},
    "00189155": {vr: "FD", vm: "1", name: "ParallelReductionFactorOutOfPlane"},
    "00189159": {vr: "UL", vm: "1", name: "SpectroscopyAcquisitionOutOfPlanePhaseSteps"},
    "00189166": {vr: "CS", vm: "1", name: "BulkMotionStatus"},
    "00189168": {vr: "FD", vm: "1", name: "ParallelReductionFactorSecondInPlane"},
    "00189169": {vr: "CS", vm: "1", name: "CardiacBeatRejectionTechnique"},
    "00189170": {vr: "CS", vm: "1", name: "RespiratoryMotionCompensationTechnique"},
    "00189171": {vr: "CS", vm: "1", name: "RespiratorySignalSource"},
    "00189172": {vr: "CS", vm: "1", name: "BulkMotionCompensationTechnique"},
    "00189173": {vr: "CS", vm: "1", name: "BulkMotionSignalSource"},
    "00189174": {vr: "CS", vm: "1", name: "ApplicableSafetyStandardAgency"},
    "00189175": {vr: "LO", vm: "1", name: "ApplicableSafetyStandardDescription"},
    "00189176": {vr: "SQ", vm: "1", name: "OperatingModeSequence"},
    "00189177": {vr: "CS", vm: "1", name: "OperatingModeType"},
    "00189178": {vr: "CS", vm: "1", name: "OperatingMode"},
    "00189179": {vr: "CS", vm: "1", name: "SpecificAbsorptionRateDefinition"},
    "00189180": {vr: "CS", vm: "1", name: "GradientOutputType"},
    "00189181": {vr: "FD", vm: "1", name: "SpecificAbsorptionRateValue"},
    "00189182": {vr: "FD", vm: "1", name: "GradientOutput"},
    "00189183": {vr: "CS", vm: "1", name: "FlowCompensationDirection"},
    "00189184": {vr: "FD", vm: "1", name: "TaggingDelay"},
    "00189185": {vr: "ST", vm: "1", name: "RespiratoryMotionCompensationTechniqueDescription"},
    "00189186": {vr: "SH", vm: "1", name: "RespiratorySignalSourceID"},
    "00189195": {vr: "FD", vm: "1", name: "ChemicalShiftMinimumIntegrationLimitInHz"},
    "00189196": {vr: "FD", vm: "1", name: "ChemicalShiftMaximumIntegrationLimitInHz"},
    "00189197": {vr: "SQ", vm: "1", name: "MRVelocityEncodingSequence"},
    "00189198": {vr: "CS", vm: "1", name: "FirstOrderPhaseCorrection"},
    "00189199": {vr: "CS", vm: "1", name: "WaterReferencedPhaseCorrection"},
    "00189200": {vr: "CS", vm: "1", name: "MRSpectroscopyAcquisitionType"},
    "00189214": {vr: "CS", vm: "1", name: "RespiratoryCyclePosition"},
    "00189217": {vr: "FD", vm: "1", name: "VelocityEncodingMaximumValue"},
    "00189218": {vr: "FD", vm: "1", name: "TagSpacingSecondDimension"},
    "00189219": {vr: "SS", vm: "1", name: "TagAngleSecondAxis"},
    "00189220": {vr: "FD", vm: "1", name: "FrameAcquisitionDuration"},
    "00189226": {vr: "SQ", vm: "1", name: "MRImageFrameTypeSequence"},
    "00189227": {vr: "SQ", vm: "1", name: "MRSpectroscopyFrameTypeSequence"},
    "00189231": {vr: "US", vm: "1", name: "MRAcquisitionPhaseEncodingStepsInPlane"},
    "00189232": {vr: "US", vm: "1", name: "MRAcquisitionPhaseEncodingStepsOutOfPlane"},
    "00189234": {vr: "UL", vm: "1", name: "SpectroscopyAcquisitionPhaseColumns"},
    "00189236": {vr: "CS", vm: "1", name: "CardiacCyclePosition"},
    "00189239": {vr: "SQ", vm: "1", name: "SpecificAbsorptionRateSequence"},
    "00189240": {vr: "US", vm: "1", name: "RFEchoTrainLength"},
    "00189241": {vr: "US", vm: "1", name: "GradientEchoTrainLength"},
    "00189250": {vr: "CS", vm: "1", name: "ArterialSpinLabelingContrast"},
    "00189251": {vr: "SQ", vm: "1", name: "MRArterialSpinLabelingSequence"},
    "00189252": {vr: "LO", vm: "1", name: "ASLTechniqueDescription"},
    "00189253": {vr: "US", vm: "1", name: "ASLSlabNumber"},
    "00189254": {vr: "FD", vm: "1 ", name: "ASLSlabThickness"},
    "00189255": {vr: "FD", vm: "3 ", name: "ASLSlabOrientation"},
    "00189256": {vr: "FD", vm: "3", name: "ASLMidSlabPosition"},
    "00189257": {vr: "CS", vm: "1 ", name: "ASLContext"},
    "00189258": {vr: "UL", vm: "1", name: "ASLPulseTrainDuration"},
    "00189259": {vr: "CS", vm: "1 ", name: "ASLCrusherFlag"},
    "0018925A": {vr: "FD", vm: "1", name: "ASLCrusherFlow"},
    "0018925B": {vr: "LO", vm: "1", name: "ASLCrusherDescription"},
    "0018925C": {vr: "CS", vm: "1 ", name: "ASLBolusCutoffFlag"},
    "0018925D": {vr: "SQ", vm: "1", name: "ASLBolusCutoffTimingSequence"},
    "0018925E": {vr: "LO", vm: "1", name: "ASLBolusCutoffTechnique"},
    "0018925F": {vr: "UL", vm: "1", name: "ASLBolusCutoffDelayTime"},
    "00189260": {vr: "SQ", vm: "1", name: "ASLSlabSequence"},
    "00189295": {vr: "FD", vm: "1", name: "ChemicalShiftMinimumIntegrationLimitInppm"},
    "00189296": {vr: "FD", vm: "1", name: "ChemicalShiftMaximumIntegrationLimitInppm"},
    "00189301": {vr: "SQ", vm: "1", name: "CTAcquisitionTypeSequence"},
    "00189302": {vr: "CS", vm: "1", name: "AcquisitionType"},
    "00189303": {vr: "FD", vm: "1", name: "TubeAngle"},
    "00189304": {vr: "SQ", vm: "1", name: "CTAcquisitionDetailsSequence"},
    "00189305": {vr: "FD", vm: "1", name: "RevolutionTime"},
    "00189306": {vr: "FD", vm: "1", name: "SingleCollimationWidth"},
    "00189307": {vr: "FD", vm: "1", name: "TotalCollimationWidth"},
    "00189308": {vr: "SQ", vm: "1", name: "CTTableDynamicsSequence"},
    "00189309": {vr: "FD", vm: "1", name: "TableSpeed"},
    "00189310": {vr: "FD", vm: "1", name: "TableFeedPerRotation"},
    "00189311": {vr: "FD", vm: "1", name: "SpiralPitchFactor"},
    "00189312": {vr: "SQ", vm: "1", name: "CTGeometrySequence"},
    "00189313": {vr: "FD", vm: "3", name: "DataCollectionCenterPatient"},
    "00189314": {vr: "SQ", vm: "1", name: "CTReconstructionSequence"},
    "00189315": {vr: "CS", vm: "1", name: "ReconstructionAlgorithm"},
    "00189316": {vr: "CS", vm: "1", name: "ConvolutionKernelGroup"},
    "00189317": {vr: "FD", vm: "2", name: "ReconstructionFieldOfView"},
    "00189318": {vr: "FD", vm: "3", name: "ReconstructionTargetCenterPatient"},
    "00189319": {vr: "FD", vm: "1", name: "ReconstructionAngle"},
    "00189320": {vr: "SH", vm: "1", name: "ImageFilter"},
    "00189321": {vr: "SQ", vm: "1", name: "CTExposureSequence"},
    "00189322": {vr: "FD", vm: "2", name: "ReconstructionPixelSpacing"},
    "00189323": {vr: "CS", vm: "1", name: "ExposureModulationType"},
    "00189324": {vr: "FD", vm: "1", name: "EstimatedDoseSaving"},
    "00189325": {vr: "SQ", vm: "1", name: "CTXRayDetailsSequence"},
    "00189326": {vr: "SQ", vm: "1", name: "CTPositionSequence"},
    "00189327": {vr: "FD", vm: "1", name: "TablePosition"},
    "00189328": {vr: "FD", vm: "1", name: "ExposureTimeInms"},
    "00189329": {vr: "SQ", vm: "1", name: "CTImageFrameTypeSequence"},
    "00189330": {vr: "FD", vm: "1", name: "XRayTubeCurrentInmA"},
    "00189332": {vr: "FD", vm: "1", name: "ExposureInmAs"},
    "00189333": {vr: "CS", vm: "1", name: "ConstantVolumeFlag"},
    "00189334": {vr: "CS", vm: "1", name: "FluoroscopyFlag"},
    "00189335": {vr: "FD", vm: "1", name: "DistanceSourceToDataCollectionCenter"},
    "00189337": {vr: "US", vm: "1", name: "ContrastBolusAgentNumber"},
    "00189338": {vr: "SQ", vm: "1", name: "ContrastBolusIngredientCodeSequence"},
    "00189340": {vr: "SQ", vm: "1", name: "ContrastAdministrationProfileSequence"},
    "00189341": {vr: "SQ", vm: "1", name: "ContrastBolusUsageSequence"},
    "00189342": {vr: "CS", vm: "1", name: "ContrastBolusAgentAdministered"},
    "00189343": {vr: "CS", vm: "1", name: "ContrastBolusAgentDetected"},
    "00189344": {vr: "CS", vm: "1", name: "ContrastBolusAgentPhase"},
    "00189345": {vr: "FD", vm: "1", name: "CTDIvol"},
    "00189346": {vr: "SQ", vm: "1", name: "CTDIPhantomTypeCodeSequence"},
    "00189351": {vr: "FL", vm: "1", name: "CalciumScoringMassFactorPatient"},
    "00189352": {vr: "FL", vm: "3", name: "CalciumScoringMassFactorDevice"},
    "00189353": {vr: "FL", vm: "1", name: "EnergyWeightingFactor"},
    "00189360": {vr: "SQ", vm: "1", name: "CTAdditionalXRaySourceSequence"},
    "00189401": {vr: "SQ", vm: "1", name: "ProjectionPixelCalibrationSequence"},
    "00189402": {vr: "FL", vm: "1", name: "DistanceSourceToIsocenter"},
    "00189403": {vr: "FL", vm: "1", name: "DistanceObjectToTableTop"},
    "00189404": {vr: "FL", vm: "2", name: "ObjectPixelSpacingInCenterOfBeam"},
    "00189405": {vr: "SQ", vm: "1", name: "PositionerPositionSequence"},
    "00189406": {vr: "SQ", vm: "1", name: "TablePositionSequence"},
    "00189407": {vr: "SQ", vm: "1", name: "CollimatorShapeSequence"},
    "00189410": {vr: "CS", vm: "1", name: "PlanesInAcquisition"},
    "00189412": {vr: "SQ", vm: "1", name: "XAXRFFrameCharacteristicsSequence"},
    "00189417": {vr: "SQ", vm: "1", name: "FrameAcquisitionSequence"},
    "00189420": {vr: "CS", vm: "1", name: "XRayReceptorType"},
    "00189423": {vr: "LO", vm: "1", name: "AcquisitionProtocolName"},
    "00189424": {vr: "LT", vm: "1", name: "AcquisitionProtocolDescription"},
    "00189425": {vr: "CS", vm: "1", name: "ContrastBolusIngredientOpaque"},
    "00189426": {vr: "FL", vm: "1", name: "DistanceReceptorPlaneToDetectorHousing"},
    "00189427": {vr: "CS", vm: "1", name: "IntensifierActiveShape"},
    "00189428": {vr: "FL", vm: "1-2", name: "IntensifierActiveDimensions"},
    "00189429": {vr: "FL", vm: "2", name: "PhysicalDetectorSize"},
    "00189430": {vr: "FL", vm: "2", name: "PositionOfIsocenterProjection"},
    "00189432": {vr: "SQ", vm: "1", name: "FieldOfViewSequence"},
    "00189433": {vr: "LO", vm: "1", name: "FieldOfViewDescription"},
    "00189434": {vr: "SQ", vm: "1", name: "ExposureControlSensingRegionsSequence"},
    "00189435": {vr: "CS", vm: "1", name: "ExposureControlSensingRegionShape"},
    "00189436": {vr: "SS", vm: "1", name: "ExposureControlSensingRegionLeftVerticalEdge"},
    "00189437": {vr: "SS", vm: "1", name: "ExposureControlSensingRegionRightVerticalEdge"},
    "00189438": {vr: "SS", vm: "1", name: "ExposureControlSensingRegionUpperHorizontalEdge"},
    "00189439": {vr: "SS", vm: "1", name: "ExposureControlSensingRegionLowerHorizontalEdge"},
    "00189440": {vr: "SS", vm: "2", name: "CenterOfCircularExposureControlSensingRegion"},
    "00189441": {vr: "US", vm: "1", name: "RadiusOfCircularExposureControlSensingRegion"},
    "00189442": {vr: "SS", vm: "2-n", name: "VerticesOfThePolygonalExposureControlSensingRegion"},
    "00189447": {vr: "FL", vm: "1", name: "ColumnAngulationPatient"},
    "00189449": {vr: "FL", vm: "1", name: "BeamAngle"},
    "00189451": {vr: "SQ", vm: "1", name: "FrameDetectorParametersSequence"},
    "00189452": {vr: "FL", vm: "1", name: "CalculatedAnatomyThickness"},
    "00189455": {vr: "SQ", vm: "1", name: "CalibrationSequence"},
    "00189456": {vr: "SQ", vm: "1", name: "ObjectThicknessSequence"},
    "00189457": {vr: "CS", vm: "1", name: "PlaneIdentification"},
    "00189461": {vr: "FL", vm: "1-2", name: "FieldOfViewDimensionsInFloat"},
    "00189462": {vr: "SQ", vm: "1", name: "IsocenterReferenceSystemSequence"},
    "00189463": {vr: "FL", vm: "1", name: "PositionerIsocenterPrimaryAngle"},
    "00189464": {vr: "FL", vm: "1", name: "PositionerIsocenterSecondaryAngle"},
    "00189465": {vr: "FL", vm: "1", name: "PositionerIsocenterDetectorRotationAngle"},
    "00189466": {vr: "FL", vm: "1", name: "TableXPositionToIsocenter"},
    "00189467": {vr: "FL", vm: "1", name: "TableYPositionToIsocenter"},
    "00189468": {vr: "FL", vm: "1", name: "TableZPositionToIsocenter"},
    "00189469": {vr: "FL", vm: "1", name: "TableHorizontalRotationAngle"},
    "00189470": {vr: "FL", vm: "1", name: "TableHeadTiltAngle"},
    "00189471": {vr: "FL", vm: "1", name: "TableCradleTiltAngle"},
    "00189472": {vr: "SQ", vm: "1", name: "FrameDisplayShutterSequence"},
    "00189473": {vr: "FL", vm: "1", name: "AcquiredImageAreaDoseProduct"},
    "00189474": {vr: "CS", vm: "1", name: "CArmPositionerTabletopRelationship"},
    "00189476": {vr: "SQ", vm: "1", name: "XRayGeometrySequence"},
    "00189477": {vr: "SQ", vm: "1", name: "IrradiationEventIdentificationSequence"},
    "00189504": {vr: "SQ", vm: "1", name: "XRay3DFrameTypeSequence"},
    "00189506": {vr: "SQ", vm: "1", name: "ContributingSourcesSequence"},
    "00189507": {vr: "SQ", vm: "1", name: "XRay3DAcquisitionSequence"},
    "00189508": {vr: "FL", vm: "1", name: "PrimaryPositionerScanArc"},
    "00189509": {vr: "FL", vm: "1", name: "SecondaryPositionerScanArc"},
    "00189510": {vr: "FL", vm: "1", name: "PrimaryPositionerScanStartAngle"},
    "00189511": {vr: "FL", vm: "1", name: "SecondaryPositionerScanStartAngle"},
    "00189514": {vr: "FL", vm: "1", name: "PrimaryPositionerIncrement"},
    "00189515": {vr: "FL", vm: "1", name: "SecondaryPositionerIncrement"},
    "00189516": {vr: "DT", vm: "1", name: "StartAcquisitionDateTime"},
    "00189517": {vr: "DT", vm: "1", name: "EndAcquisitionDateTime"},
    "00189524": {vr: "LO", vm: "1", name: "ApplicationName"},
    "00189525": {vr: "LO", vm: "1", name: "ApplicationVersion"},
    "00189526": {vr: "LO", vm: "1", name: "ApplicationManufacturer"},
    "00189527": {vr: "CS", vm: "1", name: "AlgorithmType"},
    "00189528": {vr: "LO", vm: "1", name: "AlgorithmDescription"},
    "00189530": {vr: "SQ", vm: "1", name: "XRay3DReconstructionSequence"},
    "00189531": {vr: "LO", vm: "1", name: "ReconstructionDescription"},
    "00189538": {vr: "SQ", vm: "1", name: "PerProjectionAcquisitionSequence"},
    "00189601": {vr: "SQ", vm: "1", name: "DiffusionBMatrixSequence"},
    "00189602": {vr: "FD", vm: "1", name: "DiffusionBValueXX"},
    "00189603": {vr: "FD", vm: "1", name: "DiffusionBValueXY"},
    "00189604": {vr: "FD", vm: "1", name: "DiffusionBValueXZ"},
    "00189605": {vr: "FD", vm: "1", name: "DiffusionBValueYY"},
    "00189606": {vr: "FD", vm: "1", name: "DiffusionBValueYZ"},
    "00189607": {vr: "FD", vm: "1", name: "DiffusionBValueZZ"},
    "00189701": {vr: "DT", vm: "1", name: "DecayCorrectionDateTime"},
    "00189715": {vr: "FD", vm: "1", name: "StartDensityThreshold"},
    "00189716": {vr: "FD", vm: "1", name: "StartRelativeDensityDifferenceThreshold"},
    "00189717": {vr: "FD", vm: "1", name: "StartCardiacTriggerCountThreshold"},
    "00189718": {vr: "FD", vm: "1", name: "StartRespiratoryTriggerCountThreshold"},
    "00189719": {vr: "FD", vm: "1", name: "TerminationCountsThreshold"},
    "00189720": {vr: "FD", vm: "1", name: "TerminationDensityThreshold"},
    "00189721": {vr: "FD", vm: "1", name: "TerminationRelativeDensityThreshold"},
    "00189722": {vr: "FD", vm: "1", name: "TerminationTimeThreshold"},
    "00189723": {vr: "FD", vm: "1", name: "TerminationCardiacTriggerCountThreshold"},
    "00189724": {vr: "FD", vm: "1", name: "TerminationRespiratoryTriggerCountThreshold"},
    "00189725": {vr: "CS", vm: "1", name: "DetectorGeometry"},
    "00189726": {vr: "FD", vm: "1", name: "TransverseDetectorSeparation"},
    "00189727": {vr: "FD", vm: "1", name: "AxialDetectorDimension"},
    "00189729": {vr: "US", vm: "1", name: "RadiopharmaceuticalAgentNumber"},
    "00189732": {vr: "SQ", vm: "1", name: "PETFrameAcquisitionSequence"},
    "00189733": {vr: "SQ", vm: "1", name: "PETDetectorMotionDetailsSequence"},
    "00189734": {vr: "SQ", vm: "1", name: "PETTableDynamicsSequence"},
    "00189735": {vr: "SQ", vm: "1", name: "PETPositionSequence"},
    "00189736": {vr: "SQ", vm: "1", name: "PETFrameCorrectionFactorsSequence"},
    "00189737": {vr: "SQ", vm: "1", name: "RadiopharmaceuticalUsageSequence"},
    "00189738": {vr: "CS", vm: "1", name: "AttenuationCorrectionSource"},
    "00189739": {vr: "US", vm: "1", name: "NumberOfIterations"},
    "00189740": {vr: "US", vm: "1", name: "NumberOfSubsets"},
    "00189749": {vr: "SQ", vm: "1", name: "PETReconstructionSequence"},
    "00189751": {vr: "SQ", vm: "1", name: "PETFrameTypeSequence"},
    "00189755": {vr: "CS", vm: "1", name: "TimeOfFlightInformationUsed"},
    "00189756": {vr: "CS", vm: "1", name: "ReconstructionType"},
    "00189758": {vr: "CS", vm: "1", name: "DecayCorrected"},
    "00189759": {vr: "CS", vm: "1", name: "AttenuationCorrected"},
    "00189760": {vr: "CS", vm: "1", name: "ScatterCorrected"},
    "00189761": {vr: "CS", vm: "1", name: "DeadTimeCorrected"},
    "00189762": {vr: "CS", vm: "1", name: "GantryMotionCorrected"},
    "00189763": {vr: "CS", vm: "1", name: "PatientMotionCorrected"},
    "00189764": {vr: "CS", vm: "1", name: "CountLossNormalizationCorrected"},
    "00189765": {vr: "CS", vm: "1", name: "RandomsCorrected"},
    "00189766": {vr: "CS", vm: "1", name: "NonUniformRadialSamplingCorrected"},
    "00189767": {vr: "CS", vm: "1", name: "SensitivityCalibrated"},
    "00189768": {vr: "CS", vm: "1", name: "DetectorNormalizationCorrection"},
    "00189769": {vr: "CS", vm: "1", name: "IterativeReconstructionMethod"},
    "00189770": {vr: "CS", vm: "1", name: "AttenuationCorrectionTemporalRelationship"},
    "00189771": {vr: "SQ", vm: "1", name: "PatientPhysiologicalStateSequence"},
    "00189772": {vr: "SQ", vm: "1", name: "PatientPhysiologicalStateCodeSequence"},
    "00189801": {vr: "FD", vm: "1-n", name: "DepthsOfFocus"},
    "00189803": {vr: "SQ", vm: "1", name: "ExcludedIntervalsSequence"},
    "00189804": {vr: "DT", vm: "1", name: "ExclusionStartDatetime"},
    "00189805": {vr: "FD", vm: "1", name: "ExclusionDuration"},
    "00189806": {vr: "SQ", vm: "1", name: "USImageDescriptionSequence"},
    "00189807": {vr: "SQ", vm: "1", name: "ImageDataTypeSequence"},
    "00189808": {vr: "CS", vm: "1", name: "DataType"},
    "00189809": {vr: "SQ", vm: "1", name: "TransducerScanPatternCodeSequence"},
    "0018980B": {vr: "CS", vm: "1", name: "AliasedDataType"},
    "0018980C": {vr: "CS", vm: "1", name: "PositionMeasuringDeviceUsed"},
    "0018980D": {vr: "SQ", vm: "1", name: "TransducerGeometryCodeSequence"},
    "0018980E": {vr: "SQ", vm: "1", name: "TransducerBeamSteeringCodeSequence"},
    "0018980F": {vr: "SQ", vm: "1", name: "TransducerApplicationCodeSequence"},
    "0018A001": {vr: "SQ", vm: "1", name: "ContributingEquipmentSequence"},
    "0018A002": {vr: "DT", vm: "1", name: "ContributionDateTime"},
    "0018A003": {vr: "ST", vm: "1", name: "ContributionDescription"},
    "0020000D": {vr: "UI", vm: "1", name: "StudyInstanceUID"},
    "0020000E": {vr: "UI", vm: "1", name: "SeriesInstanceUID"},
    "00200010": {vr: "SH", vm: "1", name: "StudyID"},
    "00200011": {vr: "IS", vm: "1", name: "SeriesNumber"},
    "00200012": {vr: "IS", vm: "1", name: "AcquisitionNumber"},
    "00200013": {vr: "IS", vm: "1", name: "InstanceNumber"},
    "00200014": {vr: "IS", vm: "1", name: "IsotopeNumber"},
    "00200015": {vr: "IS", vm: "1", name: "PhaseNumber"},
    "00200016": {vr: "IS", vm: "1", name: "IntervalNumber"},
    "00200017": {vr: "IS", vm: "1", name: "TimeSlotNumber"},
    "00200018": {vr: "IS", vm: "1", name: "AngleNumber"},
    "00200019": {vr: "IS", vm: "1", name: "ItemNumber"},
    "00200020": {vr: "CS", vm: "2", name: "PatientOrientation"},
    "00200022": {vr: "IS", vm: "1", name: "OverlayNumber"},
    "00200024": {vr: "IS", vm: "1", name: "CurveNumber"},
    "00200026": {vr: "IS", vm: "1", name: "LUTNumber"},
    "00200030": {vr: "DS", vm: "3", name: "ImagePosition"},
    "00200032": {vr: "DS", vm: "3", name: "ImagePositionPatient"},
    "00200035": {vr: "DS", vm: "6", name: "ImageOrientation"},
    "00200037": {vr: "DS", vm: "6", name: "ImageOrientationPatient"},
    "00200050": {vr: "DS", vm: "1", name: "Location"},
    "00200052": {vr: "UI", vm: "1", name: "FrameOfReferenceUID"},
    "00200060": {vr: "CS", vm: "1", name: "Laterality"},
    "00200062": {vr: "CS", vm: "1", name: "ImageLaterality"},
    "00200070": {vr: "LO", vm: "1", name: "ImageGeometryType"},
    "00200080": {vr: "CS", vm: "1-n", name: "MaskingImage"},
    "002000AA": {vr: "IS", vm: "1", name: "ReportNumber"},
    "00200100": {vr: "IS", vm: "1", name: "TemporalPositionIdentifier"},
    "00200105": {vr: "IS", vm: "1", name: "NumberOfTemporalPositions"},
    "00200110": {vr: "DS", vm: "1", name: "TemporalResolution"},
    "00200200": {vr: "UI", vm: "1", name: "SynchronizationFrameOfReferenceUID"},
    "00200242": {vr: "UI", vm: "1", name: "SOPInstanceUIDOfConcatenationSource"},
    "00201000": {vr: "IS", vm: "1", name: "SeriesInStudy"},
    "00201001": {vr: "IS", vm: "1", name: "AcquisitionsInSeries"},
    "00201002": {vr: "IS", vm: "1", name: "ImagesInAcquisition"},
    "00201003": {vr: "IS", vm: "1", name: "ImagesInSeries"},
    "00201004": {vr: "IS", vm: "1", name: "AcquisitionsInStudy"},
    "00201005": {vr: "IS", vm: "1", name: "ImagesInStudy"},
    "00201020": {vr: "LO", vm: "1-n", name: "Reference"},
    "00201040": {vr: "LO", vm: "1", name: "PositionReferenceIndicator"},
    "00201041": {vr: "DS", vm: "1", name: "SliceLocation"},
    "00201070": {vr: "IS", vm: "1-n", name: "OtherStudyNumbers"},
    "00201200": {vr: "IS", vm: "1", name: "NumberOfPatientRelatedStudies"},
    "00201202": {vr: "IS", vm: "1", name: "NumberOfPatientRelatedSeries"},
    "00201204": {vr: "IS", vm: "1", name: "NumberOfPatientRelatedInstances"},
    "00201206": {vr: "IS", vm: "1", name: "NumberOfStudyRelatedSeries"},
    "00201208": {vr: "IS", vm: "1", name: "NumberOfStudyRelatedInstances"},
    "00201209": {vr: "IS", vm: "1", name: "NumberOfSeriesRelatedInstances"},
    "002031xx": {vr: "CS", vm: "1-n", name: "SourceImageIDs"},
    "00203401": {vr: "CS", vm: "1", name: "ModifyingDeviceID"},
    "00203402": {vr: "CS", vm: "1", name: "ModifiedImageID"},
    "00203403": {vr: "DA", vm: "1", name: "ModifiedImageDate"},
    "00203404": {vr: "LO", vm: "1", name: "ModifyingDeviceManufacturer"},
    "00203405": {vr: "TM", vm: "1", name: "ModifiedImageTime"},
    "00203406": {vr: "LO", vm: "1", name: "ModifiedImageDescription"},
    "00204000": {vr: "LT", vm: "1", name: "ImageComments"},
    "00205000": {vr: "AT", vm: "1-n", name: "OriginalImageIdentification"},
    "00205002": {vr: "LO", vm: "1-n", name: "OriginalImageIdentificationNomenclature"},
    "00209056": {vr: "SH", vm: "1", name: "StackID"},
    "00209057": {vr: "UL", vm: "1", name: "InStackPositionNumber"},
    "00209071": {vr: "SQ", vm: "1", name: "FrameAnatomySequence"},
    "00209072": {vr: "CS", vm: "1", name: "FrameLaterality"},
    "00209111": {vr: "SQ", vm: "1", name: "FrameContentSequence"},
    "00209113": {vr: "SQ", vm: "1", name: "PlanePositionSequence"},
    "00209116": {vr: "SQ", vm: "1", name: "PlaneOrientationSequence"},
    "00209128": {vr: "UL", vm: "1", name: "TemporalPositionIndex"},
    "00209153": {vr: "FD", vm: "1", name: "NominalCardiacTriggerDelayTime"},
    "00209154": {vr: "FL", vm: "1", name: "NominalCardiacTriggerTimePriorToRPeak"},
    "00209155": {vr: "FL", vm: "1", name: "ActualCardiacTriggerTimePriorToRPeak"},
    "00209156": {vr: "US", vm: "1", name: "FrameAcquisitionNumber"},
    "00209157": {vr: "UL", vm: "1-n", name: "DimensionIndexValues"},
    "00209158": {vr: "LT", vm: "1", name: "FrameComments"},
    "00209161": {vr: "UI", vm: "1", name: "ConcatenationUID"},
    "00209162": {vr: "US", vm: "1", name: "InConcatenationNumber"},
    "00209163": {vr: "US", vm: "1", name: "InConcatenationTotalNumber"},
    "00209164": {vr: "UI", vm: "1", name: "DimensionOrganizationUID"},
    "00209165": {vr: "AT", vm: "1", name: "DimensionIndexPointer"},
    "00209167": {vr: "AT", vm: "1", name: "FunctionalGroupPointer"},
    "00209213": {vr: "LO", vm: "1", name: "DimensionIndexPrivateCreator"},
    "00209221": {vr: "SQ", vm: "1", name: "DimensionOrganizationSequence"},
    "00209222": {vr: "SQ", vm: "1", name: "DimensionIndexSequence"},
    "00209228": {vr: "UL", vm: "1", name: "ConcatenationFrameOffsetNumber"},
    "00209238": {vr: "LO", vm: "1", name: "FunctionalGroupPrivateCreator"},
    "00209241": {vr: "FL", vm: "1", name: "NominalPercentageOfCardiacPhase"},
    "00209245": {vr: "FL", vm: "1", name: "NominalPercentageOfRespiratoryPhase"},
    "00209246": {vr: "FL", vm: "1", name: "StartingRespiratoryAmplitude"},
    "00209247": {vr: "CS", vm: "1", name: "StartingRespiratoryPhase"},
    "00209248": {vr: "FL", vm: "1", name: "EndingRespiratoryAmplitude"},
    "00209249": {vr: "CS", vm: "1", name: "EndingRespiratoryPhase"},
    "00209250": {vr: "CS", vm: "1", name: "RespiratoryTriggerType"},
    "00209251": {vr: "FD", vm: "1", name: "RRIntervalTimeNominal"},
    "00209252": {vr: "FD", vm: "1", name: "ActualCardiacTriggerDelayTime"},
    "00209253": {vr: "SQ", vm: "1", name: "RespiratorySynchronizationSequence"},
    "00209254": {vr: "FD", vm: "1", name: "RespiratoryIntervalTime"},
    "00209255": {vr: "FD", vm: "1", name: "NominalRespiratoryTriggerDelayTime"},
    "00209256": {vr: "FD", vm: "1", name: "RespiratoryTriggerDelayThreshold"},
    "00209257": {vr: "FD", vm: "1", name: "ActualRespiratoryTriggerDelayTime"},
    "00209301": {vr: "FD", vm: "3", name: "ImagePositionVolume"},
    "00209302": {vr: "FD", vm: "6", name: "ImageOrientationVolume"},
    "00209307": {vr: "CS", vm: "1", name: "UltrasoundAcquisitionGeometry"},
    "00209308": {vr: "FD", vm: "3", name: "ApexPosition"},
    "00209309": {vr: "FD", vm: "16", name: "VolumeToTransducerMappingMatrix"},
    "0020930A": {vr: "FD", vm: "16", name: "VolumeToTableMappingMatrix"},
    "0020930C": {vr: "CS", vm: "1", name: "PatientFrameOfReferenceSource"},
    "0020930D": {vr: "FD", vm: "1", name: "TemporalPositionTimeOffset"},
    "0020930E": {vr: "SQ", vm: "1", name: "PlanePositionVolumeSequence"},
    "0020930F": {vr: "SQ", vm: "1", name: "PlaneOrientationVolumeSequence"},
    "00209310": {vr: "SQ", vm: "1", name: "TemporalPositionSequence"},
    "00209311": {vr: "CS", vm: "1", name: "DimensionOrganizationType"},
    "00209312": {vr: "UI", vm: "1", name: "VolumeFrameOfReferenceUID"},
    "00209313": {vr: "UI", vm: "1", name: "TableFrameOfReferenceUID"},
    "00209421": {vr: "LO", vm: "1", name: "DimensionDescriptionLabel"},
    "00209450": {vr: "SQ", vm: "1", name: "PatientOrientationInFrameSequence"},
    "00209453": {vr: "LO", vm: "1", name: "FrameLabel"},
    "00209518": {vr: "US", vm: "1-n", name: "AcquisitionIndex"},
    "00209529": {vr: "SQ", vm: "1", name: "ContributingSOPInstancesReferenceSequence"},
    "00209536": {vr: "US", vm: "1", name: "ReconstructionIndex"},
    "00220001": {vr: "US", vm: "1", name: "LightPathFilterPassThroughWavelength"},
    "00220002": {vr: "US", vm: "2", name: "LightPathFilterPassBand"},
    "00220003": {vr: "US", vm: "1", name: "ImagePathFilterPassThroughWavelength"},
    "00220004": {vr: "US", vm: "2", name: "ImagePathFilterPassBand"},
    "00220005": {vr: "CS", vm: "1", name: "PatientEyeMovementCommanded"},
    "00220006": {vr: "SQ", vm: "1", name: "PatientEyeMovementCommandCodeSequence"},
    "00220007": {vr: "FL", vm: "1", name: "SphericalLensPower"},
    "00220008": {vr: "FL", vm: "1", name: "CylinderLensPower"},
    "00220009": {vr: "FL", vm: "1", name: "CylinderAxis"},
    "0022000A": {vr: "FL", vm: "1", name: "EmmetropicMagnification"},
    "0022000B": {vr: "FL", vm: "1", name: "IntraOcularPressure"},
    "0022000C": {vr: "FL", vm: "1", name: "HorizontalFieldOfView"},
    "0022000D": {vr: "CS", vm: "1", name: "PupilDilated"},
    "0022000E": {vr: "FL", vm: "1", name: "DegreeOfDilation"},
    "00220010": {vr: "FL", vm: "1", name: "StereoBaselineAngle"},
    "00220011": {vr: "FL", vm: "1", name: "StereoBaselineDisplacement"},
    "00220012": {vr: "FL", vm: "1", name: "StereoHorizontalPixelOffset"},
    "00220013": {vr: "FL", vm: "1", name: "StereoVerticalPixelOffset"},
    "00220014": {vr: "FL", vm: "1", name: "StereoRotation"},
    "00220015": {vr: "SQ", vm: "1", name: "AcquisitionDeviceTypeCodeSequence"},
    "00220016": {vr: "SQ", vm: "1", name: "IlluminationTypeCodeSequence"},
    "00220017": {vr: "SQ", vm: "1", name: "LightPathFilterTypeStackCodeSequence"},
    "00220018": {vr: "SQ", vm: "1", name: "ImagePathFilterTypeStackCodeSequence"},
    "00220019": {vr: "SQ", vm: "1", name: "LensesCodeSequence"},
    "0022001A": {vr: "SQ", vm: "1", name: "ChannelDescriptionCodeSequence"},
    "0022001B": {vr: "SQ", vm: "1", name: "RefractiveStateSequence"},
    "0022001C": {vr: "SQ", vm: "1", name: "MydriaticAgentCodeSequence"},
    "0022001D": {vr: "SQ", vm: "1", name: "RelativeImagePositionCodeSequence"},
    "0022001E": {vr: "FL", vm: "1", name: "CameraAngleOfView"},
    "00220020": {vr: "SQ", vm: "1", name: "StereoPairsSequence"},
    "00220021": {vr: "SQ", vm: "1", name: "LeftImageSequence"},
    "00220022": {vr: "SQ", vm: "1", name: "RightImageSequence"},
    "00220030": {vr: "FL", vm: "1", name: "AxialLengthOfTheEye"},
    "00220031": {vr: "SQ", vm: "1", name: "OphthalmicFrameLocationSequence"},
    "00220032": {vr: "FL", vm: "2-2n", name: "ReferenceCoordinates"},
    "00220035": {vr: "FL", vm: "1", name: "DepthSpatialResolution"},
    "00220036": {vr: "FL", vm: "1", name: "MaximumDepthDistortion"},
    "00220037": {vr: "FL", vm: "1", name: "AlongScanSpatialResolution"},
    "00220038": {vr: "FL", vm: "1", name: "MaximumAlongScanDistortion"},
    "00220039": {vr: "CS", vm: "1", name: "OphthalmicImageOrientation"},
    "00220041": {vr: "FL", vm: "1", name: "DepthOfTransverseImage"},
    "00220042": {vr: "SQ", vm: "1", name: "MydriaticAgentConcentrationUnitsSequence"},
    "00220048": {vr: "FL", vm: "1", name: "AcrossScanSpatialResolution"},
    "00220049": {vr: "FL", vm: "1", name: "MaximumAcrossScanDistortion"},
    "0022004E": {vr: "DS", vm: "1", name: "MydriaticAgentConcentration"},
    "00220055": {vr: "FL", vm: "1", name: "IlluminationWaveLength"},
    "00220056": {vr: "FL", vm: "1", name: "IlluminationPower"},
    "00220057": {vr: "FL", vm: "1", name: "IlluminationBandwidth"},
    "00220058": {vr: "SQ", vm: "1", name: "MydriaticAgentSequence"},
    "00221007": {vr: "SQ", vm: "1", name: "OphthalmicAxialMeasurementsRightEyeSequence"},
    "00221008": {vr: "SQ", vm: "1", name: "OphthalmicAxialMeasurementsLeftEyeSequence"},
    "00221010": {vr: "CS", vm: "1", name: "OphthalmicAxialLengthMeasurementsType"},
    "00221019": {vr: "FL", vm: "1", name: "OphthalmicAxialLength"},
    "00221024": {vr: "SQ", vm: "1", name: "LensStatusCodeSequence"},
    "00221025": {vr: "SQ", vm: "1", name: "VitreousStatusCodeSequence"},
    "00221028": {vr: "SQ", vm: "1", name: "IOLFormulaCodeSequence"},
    "00221029": {vr: "LO", vm: "1", name: "IOLFormulaDetail"},
    "00221033": {vr: "FL", vm: "1", name: "KeratometerIndex"},
    "00221035": {vr: "SQ", vm: "1", name: "SourceOfOphthalmicAxialLengthCodeSequence"},
    "00221037": {vr: "FL", vm: "1", name: "TargetRefraction"},
    "00221039": {vr: "CS", vm: "1", name: "RefractiveProcedureOccurred"},
    "00221040": {vr: "SQ", vm: "1", name: "RefractiveSurgeryTypeCodeSequence"},
    "00221044": {vr: "SQ", vm: "1", name: "OphthalmicUltrasoundAxialMeasurementsTypeCodeSequence"},
    "00221050": {vr: "SQ", vm: "1", name: "OphthalmicAxialLengthMeasurementsSequence"},
    "00221053": {vr: "FL", vm: "1", name: "IOLPower"},
    "00221054": {vr: "FL", vm: "1", name: "PredictedRefractiveError"},
    "00221059": {vr: "FL", vm: "1", name: "OphthalmicAxialLengthVelocity"},
    "00221065": {vr: "LO", vm: "1", name: "LensStatusDescription"},
    "00221066": {vr: "LO", vm: "1", name: "VitreousStatusDescription"},
    "00221090": {vr: "SQ", vm: "1", name: "IOLPowerSequence"},
    "00221092": {vr: "SQ", vm: "1", name: "LensConstantSequence"},
    "00221093": {vr: "LO", vm: "1", name: "IOLManufacturer"},
    "00221094": {vr: "LO", vm: "1", name: "LensConstantDescription"},
    "00221096": {vr: "SQ", vm: "1", name: "KeratometryMeasurementTypeCodeSequence"},
    "00221100": {vr: "SQ", vm: "1", name: "ReferencedOphthalmicAxialMeasurementsSequence"},
    "00221101": {vr: "SQ", vm: "1", name: "OphthalmicAxialLengthMeasurementsSegmentNameCodeSequence"},
    "00221103": {vr: "SQ", vm: "1", name: "RefractiveErrorBeforeRefractiveSurgeryCodeSequence"},
    "00221121": {vr: "FL", vm: "1", name: "IOLPowerForExactEmmetropia"},
    "00221122": {vr: "FL", vm: "1", name: "IOLPowerForExactTargetRefraction"},
    "00221125": {vr: "SQ", vm: "1", name: "AnteriorChamberDepthDefinitionCodeSequence"},
    "00221130": {vr: "FL", vm: "1", name: "LensThickness"},
    "00221131": {vr: "FL", vm: "1", name: "AnteriorChamberDepth"},
    "00221132": {vr: "SQ", vm: "1", name: "SourceOfLensThicknessDataCodeSequence"},
    "00221133": {vr: "SQ", vm: "1", name: "SourceOfAnteriorChamberDepthDataCodeSequence"},
    "00221135": {vr: "SQ", vm: "1", name: "SourceOfRefractiveErrorDataCodeSequence"},
    "00221140": {vr: "CS", vm: "1", name: "OphthalmicAxialLengthMeasurementModified"},
    "00221150": {vr: "SQ", vm: "1", name: "OphthalmicAxialLengthDataSourceCodeSequence"},
    "00221153": {vr: "SQ", vm: "1", name: "OphthalmicAxialLengthAcquisitionMethodCodeSequence"},
    "00221155": {vr: "FL", vm: "1", name: "SignalToNoiseRatio"},
    "00221159": {vr: "LO", vm: "1", name: "OphthalmicAxialLengthDataSourceDescription"},
    "00221210": {vr: "SQ", vm: "1", name: "OphthalmicAxialLengthMeasurementsTotalLengthSequence"},
    "00221211": {vr: "SQ", vm: "1", name: "OphthalmicAxialLengthMeasurementsSegmentalLengthSequence"},
    "00221212": {vr: "SQ", vm: "1", name: "OphthalmicAxialLengthMeasurementsLengthSummationSequence"},
    "00221220": {vr: "SQ", vm: "1", name: "UltrasoundOphthalmicAxialLengthMeasurementsSequence"},
    "00221225": {vr: "SQ", vm: "1", name: "OpticalOphthalmicAxialLengthMeasurementsSequence"},
    "00221230": {vr: "SQ", vm: "1", name: "UltrasoundSelectedOphthalmicAxialLengthSequence"},
    "00221250": {vr: "SQ", vm: "1", name: "OphthalmicAxialLengthSelectionMethodCodeSequence"},
    "00221255": {vr: "SQ", vm: "1", name: "OpticalSelectedOphthalmicAxialLengthSequence"},
    "00221257": {vr: "SQ", vm: "1", name: "SelectedSegmentalOphthalmicAxialLengthSequence"},
    "00221260": {vr: "SQ", vm: "1", name: "SelectedTotalOphthalmicAxialLengthSequence"},
    "00221262": {vr: "SQ", vm: "1", name: "OphthalmicAxialLengthQualityMetricSequence"},
    "00221273": {vr: "LO", vm: "1", name: "OphthalmicAxialLengthQualityMetricTypeDescription"},
    "00221300": {vr: "SQ", vm: "1", name: "IntraocularLensCalculationsRightEyeSequence"},
    "00221310": {vr: "SQ", vm: "1", name: "IntraocularLensCalculationsLeftEyeSequence"},
    "00221330": {vr: "SQ", vm: "1", name: "ReferencedOphthalmicAxialLengthMeasurementQCImageSequence"},
    "00240010": {vr: "FL", vm: "1", name: "VisualFieldHorizontalExtent"},
    "00240011": {vr: "FL", vm: "1", name: "VisualFieldVerticalExtent"},
    "00240012": {vr: "CS", vm: "1", name: "VisualFieldShape"},
    "00240016": {vr: "SQ", vm: "1", name: "ScreeningTestModeCodeSequence"},
    "00240018": {vr: "FL", vm: "1", name: "MaximumStimulusLuminance"},
    "00240020": {vr: "FL", vm: "1", name: "BackgroundLuminance"},
    "00240021": {vr: "SQ", vm: "1", name: "StimulusColorCodeSequence"},
    "00240024": {vr: "SQ", vm: "1", name: "BackgroundIlluminationColorCodeSequence"},
    "00240025": {vr: "FL", vm: "1", name: "StimulusArea"},
    "00240028": {vr: "FL", vm: "1", name: "StimulusPresentationTime"},
    "00240032": {vr: "SQ", vm: "1", name: "FixationSequence"},
    "00240033": {vr: "SQ", vm: "1", name: "FixationMonitoringCodeSequence"},
    "00240034": {vr: "SQ", vm: "1", name: "VisualFieldCatchTrialSequence"},
    "00240035": {vr: "US", vm: "1", name: "FixationCheckedQuantity"},
    "00240036": {vr: "US", vm: "1", name: "PatientNotProperlyFixatedQuantity"},
    "00240037": {vr: "CS", vm: "1", name: "PresentedVisualStimuliDataFlag"},
    "00240038": {vr: "US", vm: "1", name: "NumberOfVisualStimuli"},
    "00240039": {vr: "CS", vm: "1", name: "ExcessiveFixationLossesDataFlag"},
    "00240040": {vr: "CS", vm: "1", name: "ExcessiveFixationLosses"},
    "00240042": {vr: "US", vm: "1", name: "StimuliRetestingQuantity"},
    "00240044": {vr: "LT", vm: "1", name: "CommentsOnPatientPerformanceOfVisualField"},
    "00240045": {vr: "CS", vm: "1", name: "FalseNegativesEstimateFlag"},
    "00240046": {vr: "FL", vm: "1", name: "FalseNegativesEstimate"},
    "00240048": {vr: "US", vm: "1", name: "NegativeCatchTrialsQuantity"},
    "00240050": {vr: "US", vm: "1", name: "FalseNegativesQuantity"},
    "00240051": {vr: "CS", vm: "1", name: "ExcessiveFalseNegativesDataFlag"},
    "00240052": {vr: "CS", vm: "1", name: "ExcessiveFalseNegatives"},
    "00240053": {vr: "CS", vm: "1", name: "FalsePositivesEstimateFlag"},
    "00240054": {vr: "FL", vm: "1", name: "FalsePositivesEstimate"},
    "00240055": {vr: "CS", vm: "1", name: "CatchTrialsDataFlag"},
    "00240056": {vr: "US", vm: "1", name: "PositiveCatchTrialsQuantity"},
    "00240057": {vr: "CS", vm: "1", name: "TestPointNormalsDataFlag"},
    "00240058": {vr: "SQ", vm: "1", name: "TestPointNormalsSequence"},
    "00240059": {vr: "CS", vm: "1", name: "GlobalDeviationProbabilityNormalsFlag"},
    "00240060": {vr: "US", vm: "1", name: "FalsePositivesQuantity"},
    "00240061": {vr: "CS", vm: "1", name: "ExcessiveFalsePositivesDataFlag"},
    "00240062": {vr: "CS", vm: "1", name: "ExcessiveFalsePositives"},
    "00240063": {vr: "CS", vm: "1", name: "VisualFieldTestNormalsFlag"},
    "00240064": {vr: "SQ", vm: "1", name: "ResultsNormalsSequence"},
    "00240065": {vr: "SQ", vm: "1", name: "AgeCorrectedSensitivityDeviationAlgorithmSequence"},
    "00240066": {vr: "FL", vm: "1", name: "GlobalDeviationFromNormal"},
    "00240067": {vr: "SQ", vm: "1", name: "GeneralizedDefectSensitivityDeviationAlgorithmSequence"},
    "00240068": {vr: "FL", vm: "1", name: "LocalizedDeviationfromNormal"},
    "00240069": {vr: "LO", vm: "1", name: "PatientReliabilityIndicator"},
    "00240070": {vr: "FL", vm: "1", name: "VisualFieldMeanSensitivity"},
    "00240071": {vr: "FL", vm: "1", name: "GlobalDeviationProbability"},
    "00240072": {vr: "CS", vm: "1", name: "LocalDeviationProbabilityNormalsFlag"},
    "00240073": {vr: "FL", vm: "1", name: "LocalizedDeviationProbability"},
    "00240074": {vr: "CS", vm: "1", name: "ShortTermFluctuationCalculated"},
    "00240075": {vr: "FL", vm: "1", name: "ShortTermFluctuation"},
    "00240076": {vr: "CS", vm: "1", name: "ShortTermFluctuationProbabilityCalculated"},
    "00240077": {vr: "FL", vm: "1", name: "ShortTermFluctuationProbability"},
    "00240078": {vr: "CS", vm: "1", name: "CorrectedLocalizedDeviationFromNormalCalculated"},
    "00240079": {vr: "FL", vm: "1", name: "CorrectedLocalizedDeviationFromNormal"},
    "00240080": {vr: "CS", vm: "1", name: "CorrectedLocalizedDeviationFromNormalProbabilityCalculated"},
    "00240081": {vr: "FL", vm: "1", name: "CorrectedLocalizedDeviationFromNormalProbability"},
    "00240083": {vr: "SQ", vm: "1", name: "GlobalDeviationProbabilitySequence"},
    "00240085": {vr: "SQ", vm: "1", name: "LocalizedDeviationProbabilitySequence"},
    "00240086": {vr: "CS", vm: "1", name: "FovealSensitivityMeasured"},
    "00240087": {vr: "FL", vm: "1", name: "FovealSensitivity"},
    "00240088": {vr: "FL", vm: "1", name: "VisualFieldTestDuration"},
    "00240089": {vr: "SQ", vm: "1", name: "VisualFieldTestPointSequence"},
    "00240090": {vr: "FL", vm: "1", name: "VisualFieldTestPointXCoordinate"},
    "00240091": {vr: "FL", vm: "1", name: "VisualFieldTestPointYCoordinate"},
    "00240092": {vr: "FL", vm: "1", name: "AgeCorrectedSensitivityDeviationValue"},
    "00240093": {vr: "CS", vm: "1", name: "StimulusResults"},
    "00240094": {vr: "FL", vm: "1", name: "SensitivityValue"},
    "00240095": {vr: "CS", vm: "1", name: "RetestStimulusSeen"},
    "00240096": {vr: "FL", vm: "1", name: "RetestSensitivityValue"},
    "00240097": {vr: "SQ", vm: "1", name: "VisualFieldTestPointNormalsSequence"},
    "00240098": {vr: "FL", vm: "1", name: "QuantifiedDefect"},
    "00240100": {vr: "FL", vm: "1", name: "AgeCorrectedSensitivityDeviationProbabilityValue"},
    "00240102": {vr: "CS", vm: "1", name: "GeneralizedDefectCorrectedSensitivityDeviationFlag "},
    "00240103": {vr: "FL", vm: "1", name: "GeneralizedDefectCorrectedSensitivityDeviationValue "},
    "00240104": {vr: "FL", vm: "1", name: "GeneralizedDefectCorrectedSensitivityDeviationProbabilityValue"},
    "00240105": {vr: "FL", vm: "1", name: "MinimumSensitivityValue"},
    "00240106": {vr: "CS", vm: "1", name: "BlindSpotLocalized"},
    "00240107": {vr: "FL", vm: "1", name: "BlindSpotXCoordinate"},
    "00240108": {vr: "FL", vm: "1", name: "BlindSpotYCoordinate "},
    "00240110": {vr: "SQ", vm: "1", name: "VisualAcuityMeasurementSequence"},
    "00240112": {vr: "SQ", vm: "1", name: "RefractiveParametersUsedOnPatientSequence"},
    "00240113": {vr: "CS", vm: "1", name: "MeasurementLaterality"},
    "00240114": {vr: "SQ", vm: "1", name: "OphthalmicPatientClinicalInformationLeftEyeSequence"},
    "00240115": {vr: "SQ", vm: "1", name: "OphthalmicPatientClinicalInformationRightEyeSequence"},
    "00240117": {vr: "CS", vm: "1", name: "FovealPointNormativeDataFlag"},
    "00240118": {vr: "FL", vm: "1", name: "FovealPointProbabilityValue"},
    "00240120": {vr: "CS", vm: "1", name: "ScreeningBaselineMeasured"},
    "00240122": {vr: "SQ", vm: "1", name: "ScreeningBaselineMeasuredSequence"},
    "00240124": {vr: "CS", vm: "1", name: "ScreeningBaselineType"},
    "00240126": {vr: "FL", vm: "1", name: "ScreeningBaselineValue"},
    "00240202": {vr: "LO", vm: "1", name: "AlgorithmSource"},
    "00240306": {vr: "LO", vm: "1", name: "DataSetName"},
    "00240307": {vr: "LO", vm: "1", name: "DataSetVersion"},
    "00240308": {vr: "LO", vm: "1", name: "DataSetSource"},
    "00240309": {vr: "LO", vm: "1", name: "DataSetDescription"},
    "00240317": {vr: "SQ", vm: "1", name: "VisualFieldTestReliabilityGlobalIndexSequence"},
    "00240320": {vr: "SQ", vm: "1", name: "VisualFieldGlobalResultsIndexSequence"},
    "00240325": {vr: "SQ", vm: "1", name: "DataObservationSequence"},
    "00240338": {vr: "CS", vm: "1", name: "IndexNormalsFlag"},
    "00240341": {vr: "FL", vm: "1", name: "IndexProbability"},
    "00240344": {vr: "SQ", vm: "1", name: "IndexProbabilitySequence"},
    "00280002": {vr: "US", vm: "1", name: "SamplesPerPixel"},
    "00280003": {vr: "US", vm: "1", name: "SamplesPerPixelUsed"},
    "00280004": {vr: "CS", vm: "1", name: "PhotometricInterpretation"},
    "00280005": {vr: "US", vm: "1", name: "ImageDimensions"},
    "00280006": {vr: "US", vm: "1", name: "PlanarConfiguration"},
    "00280008": {vr: "IS", vm: "1", name: "NumberOfFrames"},
    "00280009": {vr: "AT", vm: "1-n", name: "FrameIncrementPointer"},
    "0028000A": {vr: "AT", vm: "1-n", name: "FrameDimensionPointer"},
    "00280010": {vr: "US", vm: "1", name: "Rows"},
    "00280011": {vr: "US", vm: "1", name: "Columns"},
    "00280012": {vr: "US", vm: "1", name: "Planes"},
    "00280014": {vr: "US", vm: "1", name: "UltrasoundColorDataPresent"},
    "00280030": {vr: "DS", vm: "2", name: "PixelSpacing"},
    "00280031": {vr: "DS", vm: "2", name: "ZoomFactor"},
    "00280032": {vr: "DS", vm: "2", name: "ZoomCenter"},
    "00280034": {vr: "IS", vm: "2", name: "PixelAspectRatio"},
    "00280040": {vr: "CS", vm: "1", name: "ImageFormat"},
    "00280050": {vr: "LO", vm: "1-n", name: "ManipulatedImage"},
    "00280051": {vr: "CS", vm: "1-n", name: "CorrectedImage"},
    "0028005F": {vr: "LO", vm: "1", name: "CompressionRecognitionCode"},
    "00280060": {vr: "CS", vm: "1", name: "CompressionCode"},
    "00280061": {vr: "SH", vm: "1", name: "CompressionOriginator"},
    "00280062": {vr: "LO", vm: "1", name: "CompressionLabel"},
    "00280063": {vr: "SH", vm: "1", name: "CompressionDescription"},
    "00280065": {vr: "CS", vm: "1-n", name: "CompressionSequence"},
    "00280066": {vr: "AT", vm: "1-n", name: "CompressionStepPointers"},
    "00280068": {vr: "US", vm: "1", name: "RepeatInterval"},
    "00280069": {vr: "US", vm: "1", name: "BitsGrouped"},
    "00280070": {vr: "US", vm: "1-n", name: "PerimeterTable"},
    "00280071": {vr: "US|SS", vm: "1", name: "PerimeterValue"},
    "00280080": {vr: "US", vm: "1", name: "PredictorRows"},
    "00280081": {vr: "US", vm: "1", name: "PredictorColumns"},
    "00280082": {vr: "US", vm: "1-n", name: "PredictorConstants"},
    "00280090": {vr: "CS", vm: "1", name: "BlockedPixels"},
    "00280091": {vr: "US", vm: "1", name: "BlockRows"},
    "00280092": {vr: "US", vm: "1", name: "BlockColumns"},
    "00280093": {vr: "US", vm: "1", name: "RowOverlap"},
    "00280094": {vr: "US", vm: "1", name: "ColumnOverlap"},
    "00280100": {vr: "US", vm: "1", name: "BitsAllocated"},
    "00280101": {vr: "US", vm: "1", name: "BitsStored"},
    "00280102": {vr: "US", vm: "1", name: "HighBit"},
    "00280103": {vr: "US", vm: "1", name: "PixelRepresentation"},
    "00280104": {vr: "US|SS", vm: "1", name: "SmallestValidPixelValue"},
    "00280105": {vr: "US|SS", vm: "1", name: "LargestValidPixelValue"},
    "00280106": {vr: "US|SS", vm: "1", name: "SmallestImagePixelValue"},
    "00280107": {vr: "US|SS", vm: "1", name: "LargestImagePixelValue"},
    "00280108": {vr: "US|SS", vm: "1", name: "SmallestPixelValueInSeries"},
    "00280109": {vr: "US|SS", vm: "1", name: "LargestPixelValueInSeries"},
    "00280110": {vr: "US|SS", vm: "1", name: "SmallestImagePixelValueInPlane"},
    "00280111": {vr: "US|SS", vm: "1", name: "LargestImagePixelValueInPlane"},
    "00280120": {vr: "US|SS", vm: "1", name: "PixelPaddingValue"},
    "00280121": {vr: "US|SS", vm: "1", name: "PixelPaddingRangeLimit"},
    "00280200": {vr: "US", vm: "1", name: "ImageLocation"},
    "00280300": {vr: "CS", vm: "1", name: "QualityControlImage"},
    "00280301": {vr: "CS", vm: "1", name: "BurnedInAnnotation"},
    "00280302": {vr: "CS", vm: "1", name: "RecognizableVisualFeatures"},
    "00280303": {vr: "CS", vm: "1", name: "LongitudinalTemporalInformationModified"},
    "00280400": {vr: "LO", vm: "1", name: "TransformLabel"},
    "00280401": {vr: "LO", vm: "1", name: "TransformVersionNumber"},
    "00280402": {vr: "US", vm: "1", name: "NumberOfTransformSteps"},
    "00280403": {vr: "LO", vm: "1-n", name: "SequenceOfCompressedData"},
    "00280404": {vr: "AT", vm: "1-n", name: "DetailsOfCoefficients"},
    "002804x0": {vr: "US", vm: "1", name: "RowsForNthOrderCoefficients"},
    "002804x1": {vr: "US", vm: "1", name: "ColumnsForNthOrderCoefficients"},
    "002804x2": {vr: "LO", vm: "1-n", name: "CoefficientCoding"},
    "002804x3": {vr: "AT", vm: "1-n", name: "CoefficientCodingPointers"},
    "00280700": {vr: "LO", vm: "1", name: "DCTLabel"},
    "00280701": {vr: "CS", vm: "1-n", name: "DataBlockDescription"},
    "00280702": {vr: "AT", vm: "1-n", name: "DataBlock"},
    "00280710": {vr: "US", vm: "1", name: "NormalizationFactorFormat"},
    "00280720": {vr: "US", vm: "1", name: "ZonalMapNumberFormat"},
    "00280721": {vr: "AT", vm: "1-n", name: "ZonalMapLocation"},
    "00280722": {vr: "US", vm: "1", name: "ZonalMapFormat"},
    "00280730": {vr: "US", vm: "1", name: "AdaptiveMapFormat"},
    "00280740": {vr: "US", vm: "1", name: "CodeNumberFormat"},
    "002808x0": {vr: "CS", vm: "1-n", name: "CodeLabel"},
    "002808x2": {vr: "US", vm: "1", name: "NumberOfTables"},
    "002808x3": {vr: "AT", vm: "1-n", name: "CodeTableLocation"},
    "002808x4": {vr: "US", vm: "1", name: "BitsForCodeWord"},
    "002808x8": {vr: "AT", vm: "1-n", name: "ImageDataLocation"},
    "00280A02": {vr: "CS", vm: "1", name: "PixelSpacingCalibrationType"},
    "00280A04": {vr: "LO", vm: "1", name: "PixelSpacingCalibrationDescription"},
    "00281040": {vr: "CS", vm: "1", name: "PixelIntensityRelationship"},
    "00281041": {vr: "SS", vm: "1", name: "PixelIntensityRelationshipSign"},
    "00281050": {vr: "DS", vm: "1-n", name: "WindowCenter"},
    "00281051": {vr: "DS", vm: "1-n", name: "WindowWidth"},
    "00281052": {vr: "DS", vm: "1", name: "RescaleIntercept"},
    "00281053": {vr: "DS", vm: "1", name: "RescaleSlope"},
    "00281054": {vr: "LO", vm: "1", name: "RescaleType"},
    "00281055": {vr: "LO", vm: "1-n", name: "WindowCenterWidthExplanation"},
    "00281056": {vr: "CS", vm: "1", name: "VOILUTFunction"},
    "00281080": {vr: "CS", vm: "1", name: "GrayScale"},
    "00281090": {vr: "CS", vm: "1", name: "RecommendedViewingMode"},
    "00281100": {vr: "US|SS", vm: "3", name: "GrayLookupTableDescriptor"},
    "00281101": {vr: "US|SS", vm: "3", name: "RedPaletteColorLookupTableDescriptor"},
    "00281102": {vr: "US|SS", vm: "3", name: "GreenPaletteColorLookupTableDescriptor"},
    "00281103": {vr: "US|SS", vm: "3", name: "BluePaletteColorLookupTableDescriptor"},
    "00281104": {vr: "US", vm: "3", name: "AlphaPaletteColorLookupTableDescriptor"},
    "00281111": {vr: "US|SS", vm: "4", name: "LargeRedPaletteColorLookupTableDescriptor"},
    "00281112": {vr: "US|SS", vm: "4", name: "LargeGreenPaletteColorLookupTableDescriptor"},
    "00281113": {vr: "US|SS", vm: "4", name: "LargeBluePaletteColorLookupTableDescriptor"},
    "00281199": {vr: "UI", vm: "1", name: "PaletteColorLookupTableUID"},
    "00281200": {vr: "US|SS|OW", vm: "1-n1", name: "GrayLookupTableData"},
    "00281201": {vr: "OW", vm: "1", name: "RedPaletteColorLookupTableData"},
    "00281202": {vr: "OW", vm: "1", name: "GreenPaletteColorLookupTableData"},
    "00281203": {vr: "OW", vm: "1", name: "BluePaletteColorLookupTableData"},
    "00281204": {vr: "OW", vm: "1", name: "AlphaPaletteColorLookupTableData"},
    "00281211": {vr: "OW", vm: "1", name: "LargeRedPaletteColorLookupTableData"},
    "00281212": {vr: "OW", vm: "1", name: "LargeGreenPaletteColorLookupTableData"},
    "00281213": {vr: "OW", vm: "1", name: "LargeBluePaletteColorLookupTableData"},
    "00281214": {vr: "UI", vm: "1", name: "LargePaletteColorLookupTableUID"},
    "00281221": {vr: "OW", vm: "1", name: "SegmentedRedPaletteColorLookupTableData"},
    "00281222": {vr: "OW", vm: "1", name: "SegmentedGreenPaletteColorLookupTableData"},
    "00281223": {vr: "OW", vm: "1", name: "SegmentedBluePaletteColorLookupTableData"},
    "00281300": {vr: "CS", vm: "1", name: "BreastImplantPresent"},
    "00281350": {vr: "CS", vm: "1", name: "PartialView"},
    "00281351": {vr: "ST", vm: "1", name: "PartialViewDescription"},
    "00281352": {vr: "SQ", vm: "1", name: "PartialViewCodeSequence"},
    "0028135A": {vr: "CS", vm: "1", name: "SpatialLocationsPreserved"},
    "00281401": {vr: "SQ", vm: "1", name: "DataFrameAssignmentSequence"},
    "00281402": {vr: "CS", vm: "1", name: "DataPathAssignment"},
    "00281403": {vr: "US", vm: "1", name: "BitsMappedToColorLookupTable"},
    "00281404": {vr: "SQ", vm: "1", name: "BlendingLUT1Sequence"},
    "00281405": {vr: "CS", vm: "1", name: "BlendingLUT1TransferFunction"},
    "00281406": {vr: "FD", vm: "1", name: "BlendingWeightConstant"},
    "00281407": {vr: "US", vm: "3", name: "BlendingLookupTableDescriptor"},
    "00281408": {vr: "OW", vm: "1", name: "BlendingLookupTableData"},
    "0028140B": {vr: "SQ", vm: "1", name: "EnhancedPaletteColorLookupTableSequence"},
    "0028140C": {vr: "SQ", vm: "1", name: "BlendingLUT2Sequence"},
    "0028140D": {vr: "CS", vm: "1", name: "BlendingLUT2TransferFunction"},
    "0028140E": {vr: "CS", vm: "1", name: "DataPathID"},
    "0028140F": {vr: "CS", vm: "1", name: "RGBLUTTransferFunction"},
    "00281410": {vr: "CS", vm: "1", name: "AlphaLUTTransferFunction"},
    "00282000": {vr: "OB", vm: "1", name: "ICCProfile"},
    "00282110": {vr: "CS", vm: "1", name: "LossyImageCompression"},
    "00282112": {vr: "DS", vm: "1-n", name: "LossyImageCompressionRatio"},
    "00282114": {vr: "CS", vm: "1-n", name: "LossyImageCompressionMethod"},
    "00283000": {vr: "SQ", vm: "1", name: "ModalityLUTSequence"},
    "00283002": {vr: "US|SS", vm: "3", name: "LUTDescriptor"},
    "00283003": {vr: "LO", vm: "1", name: "LUTExplanation"},
    "00283004": {vr: "LO", vm: "1", name: "ModalityLUTType"},
    "00283006": {vr: "US|OW", vm: "1-n1", name: "LUTData"},
    "00283010": {vr: "SQ", vm: "1", name: "VOILUTSequence"},
    "00283110": {vr: "SQ", vm: "1", name: "SoftcopyVOILUTSequence"},
    "00284000": {vr: "LT", vm: "1", name: "ImagePresentationComments"},
    "00285000": {vr: "SQ", vm: "1", name: "BiPlaneAcquisitionSequence"},
    "00286010": {vr: "US", vm: "1", name: "RepresentativeFrameNumber"},
    "00286020": {vr: "US", vm: "1-n", name: "FrameNumbersOfInterest"},
    "00286022": {vr: "LO", vm: "1-n", name: "FrameOfInterestDescription"},
    "00286023": {vr: "CS", vm: "1-n", name: "FrameOfInterestType"},
    "00286030": {vr: "US", vm: "1-n", name: "MaskPointers"},
    "00286040": {vr: "US", vm: "1-n", name: "RWavePointer"},
    "00286100": {vr: "SQ", vm: "1", name: "MaskSubtractionSequence"},
    "00286101": {vr: "CS", vm: "1", name: "MaskOperation"},
    "00286102": {vr: "US", vm: "2-2n", name: "ApplicableFrameRange"},
    "00286110": {vr: "US", vm: "1-n", name: "MaskFrameNumbers"},
    "00286112": {vr: "US", vm: "1", name: "ContrastFrameAveraging"},
    "00286114": {vr: "FL", vm: "2", name: "MaskSubPixelShift"},
    "00286120": {vr: "SS", vm: "1", name: "TIDOffset"},
    "00286190": {vr: "ST", vm: "1", name: "MaskOperationExplanation"},
    "00287FE0": {vr: "UT", vm: "1", name: "PixelDataProviderURL"},
    "00289001": {vr: "UL", vm: "1", name: "DataPointRows"},
    "00289002": {vr: "UL", vm: "1", name: "DataPointColumns"},
    "00289003": {vr: "CS", vm: "1", name: "SignalDomainColumns"},
    "00289099": {vr: "US", vm: "1", name: "LargestMonochromePixelValue"},
    "00289108": {vr: "CS", vm: "1", name: "DataRepresentation"},
    "00289110": {vr: "SQ", vm: "1", name: "PixelMeasuresSequence"},
    "00289132": {vr: "SQ", vm: "1", name: "FrameVOILUTSequence"},
    "00289145": {vr: "SQ", vm: "1", name: "PixelValueTransformationSequence"},
    "00289235": {vr: "CS", vm: "1", name: "SignalDomainRows"},
    "00289411": {vr: "FL", vm: "1", name: "DisplayFilterPercentage"},
    "00289415": {vr: "SQ", vm: "1", name: "FramePixelShiftSequence"},
    "00289416": {vr: "US", vm: "1", name: "SubtractionItemID"},
    "00289422": {vr: "SQ", vm: "1", name: "PixelIntensityRelationshipLUTSequence"},
    "00289443": {vr: "SQ", vm: "1", name: "FramePixelDataPropertiesSequence"},
    "00289444": {vr: "CS", vm: "1", name: "GeometricalProperties"},
    "00289445": {vr: "FL", vm: "1", name: "GeometricMaximumDistortion"},
    "00289446": {vr: "CS", vm: "1-n", name: "ImageProcessingApplied"},
    "00289454": {vr: "CS", vm: "1", name: "MaskSelectionMode"},
    "00289474": {vr: "CS", vm: "1", name: "LUTFunction"},
    "00289478": {vr: "FL", vm: "1", name: "MaskVisibilityPercentage"},
    "00289501": {vr: "SQ", vm: "1", name: "PixelShiftSequence"},
    "00289502": {vr: "SQ", vm: "1", name: "RegionPixelShiftSequence"},
    "00289503": {vr: "SS", vm: "2-2n", name: "VerticesOfTheRegion"},
    "00289505": {vr: "SQ", vm: "1", name: "MultiFramePresentationSequence"},
    "00289506": {vr: "US", vm: "2-2n", name: "PixelShiftFrameRange"},
    "00289507": {vr: "US", vm: "2-2n", name: "LUTFrameRange"},
    "00289520": {vr: "DS", vm: "16", name: "ImageToEquipmentMappingMatrix"},
    "00289537": {vr: "CS", vm: "1", name: "EquipmentCoordinateSystemIdentification"},
    "0032000A": {vr: "CS", vm: "1", name: "StudyStatusID"},
    "0032000C": {vr: "CS", vm: "1", name: "StudyPriorityID"},
    "00320012": {vr: "LO", vm: "1", name: "StudyIDIssuer"},
    "00320032": {vr: "DA", vm: "1", name: "StudyVerifiedDate"},
    "00320033": {vr: "TM", vm: "1", name: "StudyVerifiedTime"},
    "00320034": {vr: "DA", vm: "1", name: "StudyReadDate"},
    "00320035": {vr: "TM", vm: "1", name: "StudyReadTime"},
    "00321000": {vr: "DA", vm: "1", name: "ScheduledStudyStartDate"},
    "00321001": {vr: "TM", vm: "1", name: "ScheduledStudyStartTime"},
    "00321010": {vr: "DA", vm: "1", name: "ScheduledStudyStopDate"},
    "00321011": {vr: "TM", vm: "1", name: "ScheduledStudyStopTime"},
    "00321020": {vr: "LO", vm: "1", name: "ScheduledStudyLocation"},
    "00321021": {vr: "AE", vm: "1-n", name: "ScheduledStudyLocationAETitle"},
    "00321030": {vr: "LO", vm: "1", name: "ReasonForStudy"},
    "00321031": {vr: "SQ", vm: "1", name: "RequestingPhysicianIdentificationSequence"},
    "00321032": {vr: "PN", vm: "1", name: "RequestingPhysician"},
    "00321033": {vr: "LO", vm: "1", name: "RequestingService"},
    "00321034": {vr: "SQ", vm: "1", name: "RequestingServiceCodeSequence"},
    "00321040": {vr: "DA", vm: "1", name: "StudyArrivalDate"},
    "00321041": {vr: "TM", vm: "1", name: "StudyArrivalTime"},
    "00321050": {vr: "DA", vm: "1", name: "StudyCompletionDate"},
    "00321051": {vr: "TM", vm: "1", name: "StudyCompletionTime"},
    "00321055": {vr: "CS", vm: "1", name: "StudyComponentStatusID"},
    "00321060": {vr: "LO", vm: "1", name: "RequestedProcedureDescription"},
    "00321064": {vr: "SQ", vm: "1", name: "RequestedProcedureCodeSequence"},
    "00321070": {vr: "LO", vm: "1", name: "RequestedContrastAgent"},
    "00324000": {vr: "LT", vm: "1", name: "StudyComments"},
    "00380004": {vr: "SQ", vm: "1", name: "ReferencedPatientAliasSequence"},
    "00380008": {vr: "CS", vm: "1", name: "VisitStatusID"},
    "00380010": {vr: "LO", vm: "1", name: "AdmissionID"},
    "00380011": {vr: "LO", vm: "1", name: "IssuerOfAdmissionID"},
    "00380014": {vr: "SQ", vm: "1", name: "IssuerOfAdmissionIDSequence"},
    "00380016": {vr: "LO", vm: "1", name: "RouteOfAdmissions"},
    "0038001A": {vr: "DA", vm: "1", name: "ScheduledAdmissionDate"},
    "0038001B": {vr: "TM", vm: "1", name: "ScheduledAdmissionTime"},
    "0038001C": {vr: "DA", vm: "1", name: "ScheduledDischargeDate"},
    "0038001D": {vr: "TM", vm: "1", name: "ScheduledDischargeTime"},
    "0038001E": {vr: "LO", vm: "1", name: "ScheduledPatientInstitutionResidence"},
    "00380020": {vr: "DA", vm: "1", name: "AdmittingDate"},
    "00380021": {vr: "TM", vm: "1", name: "AdmittingTime"},
    "00380030": {vr: "DA", vm: "1", name: "DischargeDate"},
    "00380032": {vr: "TM", vm: "1", name: "DischargeTime"},
    "00380040": {vr: "LO", vm: "1", name: "DischargeDiagnosisDescription"},
    "00380044": {vr: "SQ", vm: "1", name: "DischargeDiagnosisCodeSequence"},
    "00380050": {vr: "LO", vm: "1", name: "SpecialNeeds"},
    "00380060": {vr: "LO", vm: "1", name: "ServiceEpisodeID"},
    "00380061": {vr: "LO", vm: "1", name: "IssuerOfServiceEpisodeID"},
    "00380062": {vr: "LO", vm: "1", name: "ServiceEpisodeDescription"},
    "00380064": {vr: "SQ", vm: "1", name: "IssuerOfServiceEpisodeIDSequence"},
    "00380100": {vr: "SQ", vm: "1", name: "PertinentDocumentsSequence"},
    "00380300": {vr: "LO", vm: "1", name: "CurrentPatientLocation"},
    "00380400": {vr: "LO", vm: "1", name: "PatientInstitutionResidence"},
    "00380500": {vr: "LO", vm: "1", name: "PatientState"},
    "00380502": {vr: "SQ", vm: "1", name: "PatientClinicalTrialParticipationSequence"},
    "00384000": {vr: "LT", vm: "1", name: "VisitComments"},
    "003A0004": {vr: "CS", vm: "1", name: "WaveformOriginality"},
    "003A0005": {vr: "US", vm: "1", name: "NumberOfWaveformChannels"},
    "003A0010": {vr: "UL", vm: "1", name: "NumberOfWaveformSamples"},
    "003A001A": {vr: "DS", vm: "1", name: "SamplingFrequency"},
    "003A0020": {vr: "SH", vm: "1", name: "MultiplexGroupLabel"},
    "003A0200": {vr: "SQ", vm: "1", name: "ChannelDefinitionSequence"},
    "003A0202": {vr: "IS", vm: "1", name: "WaveformChannelNumber"},
    "003A0203": {vr: "SH", vm: "1", name: "ChannelLabel"},
    "003A0205": {vr: "CS", vm: "1-n", name: "ChannelStatus"},
    "003A0208": {vr: "SQ", vm: "1", name: "ChannelSourceSequence"},
    "003A0209": {vr: "SQ", vm: "1", name: "ChannelSourceModifiersSequence"},
    "003A020A": {vr: "SQ", vm: "1", name: "SourceWaveformSequence"},
    "003A020C": {vr: "LO", vm: "1", name: "ChannelDerivationDescription"},
    "003A0210": {vr: "DS", vm: "1", name: "ChannelSensitivity"},
    "003A0211": {vr: "SQ", vm: "1", name: "ChannelSensitivityUnitsSequence"},
    "003A0212": {vr: "DS", vm: "1", name: "ChannelSensitivityCorrectionFactor"},
    "003A0213": {vr: "DS", vm: "1", name: "ChannelBaseline"},
    "003A0214": {vr: "DS", vm: "1", name: "ChannelTimeSkew"},
    "003A0215": {vr: "DS", vm: "1", name: "ChannelSampleSkew"},
    "003A0218": {vr: "DS", vm: "1", name: "ChannelOffset"},
    "003A021A": {vr: "US", vm: "1", name: "WaveformBitsStored"},
    "003A0220": {vr: "DS", vm: "1", name: "FilterLowFrequency"},
    "003A0221": {vr: "DS", vm: "1", name: "FilterHighFrequency"},
    "003A0222": {vr: "DS", vm: "1", name: "NotchFilterFrequency"},
    "003A0223": {vr: "DS", vm: "1", name: "NotchFilterBandwidth"},
    "003A0230": {vr: "FL", vm: "1", name: "WaveformDataDisplayScale"},
    "003A0231": {vr: "US", vm: "3", name: "WaveformDisplayBackgroundCIELabValue"},
    "003A0240": {vr: "SQ", vm: "1", name: "WaveformPresentationGroupSequence"},
    "003A0241": {vr: "US", vm: "1", name: "PresentationGroupNumber"},
    "003A0242": {vr: "SQ", vm: "1", name: "ChannelDisplaySequence"},
    "003A0244": {vr: "US", vm: "3", name: "ChannelRecommendedDisplayCIELabValue"},
    "003A0245": {vr: "FL", vm: "1", name: "ChannelPosition"},
    "003A0246": {vr: "CS", vm: "1", name: "DisplayShadingFlag"},
    "003A0247": {vr: "FL", vm: "1", name: "FractionalChannelDisplayScale"},
    "003A0248": {vr: "FL", vm: "1", name: "AbsoluteChannelDisplayScale"},
    "003A0300": {vr: "SQ", vm: "1", name: "MultiplexedAudioChannelsDescriptionCodeSequence"},
    "003A0301": {vr: "IS", vm: "1", name: "ChannelIdentificationCode"},
    "003A0302": {vr: "CS", vm: "1", name: "ChannelMode"},
    "00400001": {vr: "AE", vm: "1-n", name: "ScheduledStationAETitle"},
    "00400002": {vr: "DA", vm: "1", name: "ScheduledProcedureStepStartDate"},
    "00400003": {vr: "TM", vm: "1", name: "ScheduledProcedureStepStartTime"},
    "00400004": {vr: "DA", vm: "1", name: "ScheduledProcedureStepEndDate"},
    "00400005": {vr: "TM", vm: "1", name: "ScheduledProcedureStepEndTime"},
    "00400006": {vr: "PN", vm: "1", name: "ScheduledPerformingPhysicianName"},
    "00400007": {vr: "LO", vm: "1", name: "ScheduledProcedureStepDescription"},
    "00400008": {vr: "SQ", vm: "1", name: "ScheduledProtocolCodeSequence"},
    "00400009": {vr: "SH", vm: "1", name: "ScheduledProcedureStepID"},
    "0040000A": {vr: "SQ", vm: "1", name: "StageCodeSequence"},
    "0040000B": {vr: "SQ", vm: "1", name: "ScheduledPerformingPhysicianIdentificationSequence"},
    "00400010": {vr: "SH", vm: "1-n", name: "ScheduledStationName"},
    "00400011": {vr: "SH", vm: "1", name: "ScheduledProcedureStepLocation"},
    "00400012": {vr: "LO", vm: "1", name: "PreMedication"},
    "00400020": {vr: "CS", vm: "1", name: "ScheduledProcedureStepStatus"},
    "00400026": {vr: "SQ", vm: "1", name: "OrderPlacerIdentifierSequence"},
    "00400027": {vr: "SQ", vm: "1", name: "OrderFillerIdentifierSequence"},
    "00400031": {vr: "UT", vm: "1", name: "LocalNamespaceEntityID"},
    "00400032": {vr: "UT", vm: "1", name: "UniversalEntityID"},
    "00400033": {vr: "CS", vm: "1", name: "UniversalEntityIDType"},
    "00400035": {vr: "CS", vm: "1", name: "IdentifierTypeCode"},
    "00400036": {vr: "SQ", vm: "1", name: "AssigningFacilitySequence"},
    "00400039": {vr: "SQ", vm: "1", name: "AssigningJurisdictionCodeSequence"},
    "0040003A": {vr: "SQ", vm: "1", name: "AssigningAgencyOrDepartmentCodeSequence"},
    "00400100": {vr: "SQ", vm: "1", name: "ScheduledProcedureStepSequence"},
    "00400220": {vr: "SQ", vm: "1", name: "ReferencedNonImageCompositeSOPInstanceSequence"},
    "00400241": {vr: "AE", vm: "1", name: "PerformedStationAETitle"},
    "00400242": {vr: "SH", vm: "1", name: "PerformedStationName"},
    "00400243": {vr: "SH", vm: "1", name: "PerformedLocation"},
    "00400244": {vr: "DA", vm: "1", name: "PerformedProcedureStepStartDate"},
    "00400245": {vr: "TM", vm: "1", name: "PerformedProcedureStepStartTime"},
    "00400250": {vr: "DA", vm: "1", name: "PerformedProcedureStepEndDate"},
    "00400251": {vr: "TM", vm: "1", name: "PerformedProcedureStepEndTime"},
    "00400252": {vr: "CS", vm: "1", name: "PerformedProcedureStepStatus"},
    "00400253": {vr: "SH", vm: "1", name: "PerformedProcedureStepID"},
    "00400254": {vr: "LO", vm: "1", name: "PerformedProcedureStepDescription"},
    "00400255": {vr: "LO", vm: "1", name: "PerformedProcedureTypeDescription"},
    "00400260": {vr: "SQ", vm: "1", name: "PerformedProtocolCodeSequence"},
    "00400261": {vr: "CS", vm: "1", name: "PerformedProtocolType"},
    "00400270": {vr: "SQ", vm: "1", name: "ScheduledStepAttributesSequence"},
    "00400275": {vr: "SQ", vm: "1", name: "RequestAttributesSequence"},
    "00400280": {vr: "ST", vm: "1", name: "CommentsOnThePerformedProcedureStep"},
    "00400281": {vr: "SQ", vm: "1", name: "PerformedProcedureStepDiscontinuationReasonCodeSequence"},
    "00400293": {vr: "SQ", vm: "1", name: "QuantitySequence"},
    "00400294": {vr: "DS", vm: "1", name: "Quantity"},
    "00400295": {vr: "SQ", vm: "1", name: "MeasuringUnitsSequence"},
    "00400296": {vr: "SQ", vm: "1", name: "BillingItemSequence"},
    "00400300": {vr: "US", vm: "1", name: "TotalTimeOfFluoroscopy"},
    "00400301": {vr: "US", vm: "1", name: "TotalNumberOfExposures"},
    "00400302": {vr: "US", vm: "1", name: "EntranceDose"},
    "00400303": {vr: "US", vm: "1-2", name: "ExposedArea"},
    "00400306": {vr: "DS", vm: "1", name: "DistanceSourceToEntrance"},
    "00400307": {vr: "DS", vm: "1", name: "DistanceSourceToSupport"},
    "0040030E": {vr: "SQ", vm: "1", name: "ExposureDoseSequence"},
    "00400310": {vr: "ST", vm: "1", name: "CommentsOnRadiationDose"},
    "00400312": {vr: "DS", vm: "1", name: "XRayOutput"},
    "00400314": {vr: "DS", vm: "1", name: "HalfValueLayer"},
    "00400316": {vr: "DS", vm: "1", name: "OrganDose"},
    "00400318": {vr: "CS", vm: "1", name: "OrganExposed"},
    "00400320": {vr: "SQ", vm: "1", name: "BillingProcedureStepSequence"},
    "00400321": {vr: "SQ", vm: "1", name: "FilmConsumptionSequence"},
    "00400324": {vr: "SQ", vm: "1", name: "BillingSuppliesAndDevicesSequence"},
    "00400330": {vr: "SQ", vm: "1", name: "ReferencedProcedureStepSequence"},
    "00400340": {vr: "SQ", vm: "1", name: "PerformedSeriesSequence"},
    "00400400": {vr: "LT", vm: "1", name: "CommentsOnTheScheduledProcedureStep"},
    "00400440": {vr: "SQ", vm: "1", name: "ProtocolContextSequence"},
    "00400441": {vr: "SQ", vm: "1", name: "ContentItemModifierSequence"},
    "00400500": {vr: "SQ", vm: "1", name: "ScheduledSpecimenSequence"},
    "0040050A": {vr: "LO", vm: "1", name: "SpecimenAccessionNumber"},
    "00400512": {vr: "LO", vm: "1", name: "ContainerIdentifier"},
    "00400513": {vr: "SQ", vm: "1", name: "IssuerOfTheContainerIdentifierSequence"},
    "00400515": {vr: "SQ", vm: "1", name: "AlternateContainerIdentifierSequence"},
    "00400518": {vr: "SQ", vm: "1", name: "ContainerTypeCodeSequence"},
    "0040051A": {vr: "LO", vm: "1", name: "ContainerDescription"},
    "00400520": {vr: "SQ", vm: "1", name: "ContainerComponentSequence"},
    "00400550": {vr: "SQ", vm: "1", name: "SpecimenSequence"},
    "00400551": {vr: "LO", vm: "1", name: "SpecimenIdentifier"},
    "00400552": {vr: "SQ", vm: "1", name: "SpecimenDescriptionSequenceTrial"},
    "00400553": {vr: "ST", vm: "1", name: "SpecimenDescriptionTrial"},
    "00400554": {vr: "UI", vm: "1", name: "SpecimenUID"},
    "00400555": {vr: "SQ", vm: "1", name: "AcquisitionContextSequence"},
    "00400556": {vr: "ST", vm: "1", name: "AcquisitionContextDescription"},
    "00400560": {vr: "SQ", vm: "1", name: "SpecimenDescriptionSequence"},
    "00400562": {vr: "SQ", vm: "1", name: "IssuerOfTheSpecimenIdentifierSequence"},
    "0040059A": {vr: "SQ", vm: "1", name: "SpecimenTypeCodeSequence"},
    "00400600": {vr: "LO", vm: "1", name: "SpecimenShortDescription"},
    "00400602": {vr: "UT", vm: "1", name: "SpecimenDetailedDescription"},
    "00400610": {vr: "SQ", vm: "1", name: "SpecimenPreparationSequence"},
    "00400612": {vr: "SQ", vm: "1", name: "SpecimenPreparationStepContentItemSequence"},
    "00400620": {vr: "SQ", vm: "1", name: "SpecimenLocalizationContentItemSequence"},
    "004006FA": {vr: "LO", vm: "1", name: "SlideIdentifier"},
    "0040071A": {vr: "SQ", vm: "1", name: "ImageCenterPointCoordinatesSequence"},
    "0040072A": {vr: "DS", vm: "1", name: "XOffsetInSlideCoordinateSystem"},
    "0040073A": {vr: "DS", vm: "1", name: "YOffsetInSlideCoordinateSystem"},
    "0040074A": {vr: "DS", vm: "1", name: "ZOffsetInSlideCoordinateSystem"},
    "004008D8": {vr: "SQ", vm: "1", name: "PixelSpacingSequence"},
    "004008DA": {vr: "SQ", vm: "1", name: "CoordinateSystemAxisCodeSequence"},
    "004008EA": {vr: "SQ", vm: "1", name: "MeasurementUnitsCodeSequence"},
    "004009F8": {vr: "SQ", vm: "1", name: "VitalStainCodeSequenceTrial"},
    "00401001": {vr: "SH", vm: "1", name: "RequestedProcedureID"},
    "00401002": {vr: "LO", vm: "1", name: "ReasonForTheRequestedProcedure"},
    "00401003": {vr: "SH", vm: "1", name: "RequestedProcedurePriority"},
    "00401004": {vr: "LO", vm: "1", name: "PatientTransportArrangements"},
    "00401005": {vr: "LO", vm: "1", name: "RequestedProcedureLocation"},
    "00401006": {vr: "SH", vm: "1", name: "PlacerOrderNumberProcedure"},
    "00401007": {vr: "SH", vm: "1", name: "FillerOrderNumberProcedure"},
    "00401008": {vr: "LO", vm: "1", name: "ConfidentialityCode"},
    "00401009": {vr: "SH", vm: "1", name: "ReportingPriority"},
    "0040100A": {vr: "SQ", vm: "1", name: "ReasonForRequestedProcedureCodeSequence"},
    "00401010": {vr: "PN", vm: "1-n", name: "NamesOfIntendedRecipientsOfResults"},
    "00401011": {vr: "SQ", vm: "1", name: "IntendedRecipientsOfResultsIdentificationSequence"},
    "00401012": {vr: "SQ", vm: "1", name: "ReasonForPerformedProcedureCodeSequence"},
    "00401060": {vr: "LO", vm: "1", name: "RequestedProcedureDescriptionTrial"},
    "00401101": {vr: "SQ", vm: "1", name: "PersonIdentificationCodeSequence"},
    "00401102": {vr: "ST", vm: "1", name: "PersonAddress"},
    "00401103": {vr: "LO", vm: "1-n", name: "PersonTelephoneNumbers"},
    "00401400": {vr: "LT", vm: "1", name: "RequestedProcedureComments"},
    "00402001": {vr: "LO", vm: "1", name: "ReasonForTheImagingServiceRequest"},
    "00402004": {vr: "DA", vm: "1", name: "IssueDateOfImagingServiceRequest"},
    "00402005": {vr: "TM", vm: "1", name: "IssueTimeOfImagingServiceRequest"},
    "00402006": {vr: "SH", vm: "1", name: "PlacerOrderNumberImagingServiceRequestRetired"},
    "00402007": {vr: "SH", vm: "1", name: "FillerOrderNumberImagingServiceRequestRetired"},
    "00402008": {vr: "PN", vm: "1", name: "OrderEnteredBy"},
    "00402009": {vr: "SH", vm: "1", name: "OrderEntererLocation"},
    "00402010": {vr: "SH", vm: "1", name: "OrderCallbackPhoneNumber"},
    "00402016": {vr: "LO", vm: "1", name: "PlacerOrderNumberImagingServiceRequest"},
    "00402017": {vr: "LO", vm: "1", name: "FillerOrderNumberImagingServiceRequest"},
    "00402400": {vr: "LT", vm: "1", name: "ImagingServiceRequestComments"},
    "00403001": {vr: "LO", vm: "1", name: "ConfidentialityConstraintOnPatientDataDescription"},
    "00404001": {vr: "CS", vm: "1", name: "GeneralPurposeScheduledProcedureStepStatus"},
    "00404002": {vr: "CS", vm: "1", name: "GeneralPurposePerformedProcedureStepStatus"},
    "00404003": {vr: "CS", vm: "1", name: "GeneralPurposeScheduledProcedureStepPriority"},
    "00404004": {vr: "SQ", vm: "1", name: "ScheduledProcessingApplicationsCodeSequence"},
    "00404005": {vr: "DT", vm: "1", name: "ScheduledProcedureStepStartDateTime"},
    "00404006": {vr: "CS", vm: "1", name: "MultipleCopiesFlag"},
    "00404007": {vr: "SQ", vm: "1", name: "PerformedProcessingApplicationsCodeSequence"},
    "00404009": {vr: "SQ", vm: "1", name: "HumanPerformerCodeSequence"},
    "00404010": {vr: "DT", vm: "1", name: "ScheduledProcedureStepModificationDateTime"},
    "00404011": {vr: "DT", vm: "1", name: "ExpectedCompletionDateTime"},
    "00404015": {vr: "SQ", vm: "1", name: "ResultingGeneralPurposePerformedProcedureStepsSequence"},
    "00404016": {vr: "SQ", vm: "1", name: "ReferencedGeneralPurposeScheduledProcedureStepSequence"},
    "00404018": {vr: "SQ", vm: "1", name: "ScheduledWorkitemCodeSequence"},
    "00404019": {vr: "SQ", vm: "1", name: "PerformedWorkitemCodeSequence"},
    "00404020": {vr: "CS", vm: "1", name: "InputAvailabilityFlag"},
    "00404021": {vr: "SQ", vm: "1", name: "InputInformationSequence"},
    "00404022": {vr: "SQ", vm: "1", name: "RelevantInformationSequence"},
    "00404023": {vr: "UI", vm: "1", name: "ReferencedGeneralPurposeScheduledProcedureStepTransactionUID"},
    "00404025": {vr: "SQ", vm: "1", name: "ScheduledStationNameCodeSequence"},
    "00404026": {vr: "SQ", vm: "1", name: "ScheduledStationClassCodeSequence"},
    "00404027": {vr: "SQ", vm: "1", name: "ScheduledStationGeographicLocationCodeSequence"},
    "00404028": {vr: "SQ", vm: "1", name: "PerformedStationNameCodeSequence"},
    "00404029": {vr: "SQ", vm: "1", name: "PerformedStationClassCodeSequence"},
    "00404030": {vr: "SQ", vm: "1", name: "PerformedStationGeographicLocationCodeSequence"},
    "00404031": {vr: "SQ", vm: "1", name: "RequestedSubsequentWorkitemCodeSequence"},
    "00404032": {vr: "SQ", vm: "1", name: "NonDICOMOutputCodeSequence"},
    "00404033": {vr: "SQ", vm: "1", name: "OutputInformationSequence"},
    "00404034": {vr: "SQ", vm: "1", name: "ScheduledHumanPerformersSequence"},
    "00404035": {vr: "SQ", vm: "1", name: "ActualHumanPerformersSequence"},
    "00404036": {vr: "LO", vm: "1", name: "HumanPerformerOrganization"},
    "00404037": {vr: "PN", vm: "1", name: "HumanPerformerName"},
    "00404040": {vr: "CS", vm: "1", name: "RawDataHandling"},
    "00404041": {vr: "CS", vm: "1", name: "InputReadinessState"},
    "00404050": {vr: "DT", vm: "1", name: "PerformedProcedureStepStartDateTime"},
    "00404051": {vr: "DT", vm: "1", name: "PerformedProcedureStepEndDateTime"},
    "00404052": {vr: "DT", vm: "1", name: "ProcedureStepCancellationDateTime"},
    "00408302": {vr: "DS", vm: "1", name: "EntranceDoseInmGy"},
    "00409094": {vr: "SQ", vm: "1", name: "ReferencedImageRealWorldValueMappingSequence"},
    "00409096": {vr: "SQ", vm: "1", name: "RealWorldValueMappingSequence"},
    "00409098": {vr: "SQ", vm: "1", name: "PixelValueMappingCodeSequence"},
    "00409210": {vr: "SH", vm: "1", name: "LUTLabel"},
    "00409211": {vr: "US|SS", vm: "1", name: "RealWorldValueLastValueMapped"},
    "00409212": {vr: "FD", vm: "1-n", name: "RealWorldValueLUTData"},
    "00409216": {vr: "US|SS", vm: "1", name: "RealWorldValueFirstValueMapped"},
    "00409224": {vr: "FD", vm: "1", name: "RealWorldValueIntercept"},
    "00409225": {vr: "FD", vm: "1", name: "RealWorldValueSlope"},
    "0040A007": {vr: "CS", vm: "1", name: "FindingsFlagTrial"},
    "0040A010": {vr: "CS", vm: "1", name: "RelationshipType"},
    "0040A020": {vr: "SQ", vm: "1", name: "FindingsSequenceTrial"},
    "0040A021": {vr: "UI", vm: "1", name: "FindingsGroupUIDTrial"},
    "0040A022": {vr: "UI", vm: "1", name: "ReferencedFindingsGroupUIDTrial"},
    "0040A023": {vr: "DA", vm: "1", name: "FindingsGroupRecordingDateTrial"},
    "0040A024": {vr: "TM", vm: "1", name: "FindingsGroupRecordingTimeTrial"},
    "0040A026": {vr: "SQ", vm: "1", name: "FindingsSourceCategoryCodeSequenceTrial"},
    "0040A027": {vr: "LO", vm: "1", name: "VerifyingOrganization"},
    "0040A028": {vr: "SQ", vm: "1", name: "DocumentingOrganizationIdentifierCodeSequenceTrial"},
    "0040A030": {vr: "DT", vm: "1", name: "VerificationDateTime"},
    "0040A032": {vr: "DT", vm: "1", name: "ObservationDateTime"},
    "0040A040": {vr: "CS", vm: "1", name: "ValueType"},
    "0040A043": {vr: "SQ", vm: "1", name: "ConceptNameCodeSequence"},
    "0040A047": {vr: "LO", vm: "1", name: "MeasurementPrecisionDescriptionTrial"},
    "0040A050": {vr: "CS", vm: "1", name: "ContinuityOfContent"},
    "0040A057": {vr: "CS", vm: "1-n", name: "UrgencyOrPriorityAlertsTrial"},
    "0040A060": {vr: "LO", vm: "1", name: "SequencingIndicatorTrial"},
    "0040A066": {vr: "SQ", vm: "1", name: "DocumentIdentifierCodeSequenceTrial"},
    "0040A067": {vr: "PN", vm: "1", name: "DocumentAuthorTrial"},
    "0040A068": {vr: "SQ", vm: "1", name: "DocumentAuthorIdentifierCodeSequenceTrial"},
    "0040A070": {vr: "SQ", vm: "1", name: "IdentifierCodeSequenceTrial"},
    "0040A073": {vr: "SQ", vm: "1", name: "VerifyingObserverSequence"},
    "0040A074": {vr: "OB", vm: "1", name: "ObjectBinaryIdentifierTrial"},
    "0040A075": {vr: "PN", vm: "1", name: "VerifyingObserverName"},
    "0040A076": {vr: "SQ", vm: "1", name: "DocumentingObserverIdentifierCodeSequenceTrial"},
    "0040A078": {vr: "SQ", vm: "1", name: "AuthorObserverSequence"},
    "0040A07A": {vr: "SQ", vm: "1", name: "ParticipantSequence"},
    "0040A07C": {vr: "SQ", vm: "1", name: "CustodialOrganizationSequence"},
    "0040A080": {vr: "CS", vm: "1", name: "ParticipationType"},
    "0040A082": {vr: "DT", vm: "1", name: "ParticipationDateTime"},
    "0040A084": {vr: "CS", vm: "1", name: "ObserverType"},
    "0040A085": {vr: "SQ", vm: "1", name: "ProcedureIdentifierCodeSequenceTrial"},
    "0040A088": {vr: "SQ", vm: "1", name: "VerifyingObserverIdentificationCodeSequence"},
    "0040A089": {vr: "OB", vm: "1", name: "ObjectDirectoryBinaryIdentifierTrial"},
    "0040A090": {vr: "SQ", vm: "1", name: "EquivalentCDADocumentSequence"},
    "0040A0B0": {vr: "US", vm: "2-2n", name: "ReferencedWaveformChannels"},
    "0040A110": {vr: "DA", vm: "1", name: "DateOfDocumentOrVerbalTransactionTrial"},
    "0040A112": {vr: "TM", vm: "1", name: "TimeOfDocumentCreationOrVerbalTransactionTrial"},
    "0040A120": {vr: "DT", vm: "1", name: "DateTime"},
    "0040A121": {vr: "DA", vm: "1", name: "Date"},
    "0040A122": {vr: "TM", vm: "1", name: "Time"},
    "0040A123": {vr: "PN", vm: "1", name: "PersonName"},
    "0040A124": {vr: "UI", vm: "1", name: "UID"},
    "0040A125": {vr: "CS", vm: "2", name: "ReportStatusIDTrial"},
    "0040A130": {vr: "CS", vm: "1", name: "TemporalRangeType"},
    "0040A132": {vr: "UL", vm: "1-n", name: "ReferencedSamplePositions"},
    "0040A136": {vr: "US", vm: "1-n", name: "ReferencedFrameNumbers"},
    "0040A138": {vr: "DS", vm: "1-n", name: "ReferencedTimeOffsets"},
    "0040A13A": {vr: "DT", vm: "1-n", name: "ReferencedDateTime"},
    "0040A160": {vr: "UT", vm: "1", name: "TextValue"},
    "0040A167": {vr: "SQ", vm: "1", name: "ObservationCategoryCodeSequenceTrial"},
    "0040A168": {vr: "SQ", vm: "1", name: "ConceptCodeSequence"},
    "0040A16A": {vr: "ST", vm: "1", name: "BibliographicCitationTrial"},
    "0040A170": {vr: "SQ", vm: "1", name: "PurposeOfReferenceCodeSequence"},
    "0040A171": {vr: "UI", vm: "1", name: "ObservationUIDTrial"},
    "0040A172": {vr: "UI", vm: "1", name: "ReferencedObservationUIDTrial"},
    "0040A173": {vr: "CS", vm: "1", name: "ReferencedObservationClassTrial"},
    "0040A174": {vr: "CS", vm: "1", name: "ReferencedObjectObservationClassTrial"},
    "0040A180": {vr: "US", vm: "1", name: "AnnotationGroupNumber"},
    "0040A192": {vr: "DA", vm: "1", name: "ObservationDateTrial"},
    "0040A193": {vr: "TM", vm: "1", name: "ObservationTimeTrial"},
    "0040A194": {vr: "CS", vm: "1", name: "MeasurementAutomationTrial"},
    "0040A195": {vr: "SQ", vm: "1", name: "ModifierCodeSequence"},
    "0040A224": {vr: "ST", vm: "1", name: "IdentificationDescriptionTrial"},
    "0040A290": {vr: "CS", vm: "1", name: "CoordinatesSetGeometricTypeTrial"},
    "0040A296": {vr: "SQ", vm: "1", name: "AlgorithmCodeSequenceTrial"},
    "0040A297": {vr: "ST", vm: "1", name: "AlgorithmDescriptionTrial"},
    "0040A29A": {vr: "SL", vm: "2-2n", name: "PixelCoordinatesSetTrial"},
    "0040A300": {vr: "SQ", vm: "1", name: "MeasuredValueSequence"},
    "0040A301": {vr: "SQ", vm: "1", name: "NumericValueQualifierCodeSequence"},
    "0040A307": {vr: "PN", vm: "1", name: "CurrentObserverTrial"},
    "0040A30A": {vr: "DS", vm: "1-n", name: "NumericValue"},
    "0040A313": {vr: "SQ", vm: "1", name: "ReferencedAccessionSequenceTrial"},
    "0040A33A": {vr: "ST", vm: "1", name: "ReportStatusCommentTrial"},
    "0040A340": {vr: "SQ", vm: "1", name: "ProcedureContextSequenceTrial"},
    "0040A352": {vr: "PN", vm: "1", name: "VerbalSourceTrial"},
    "0040A353": {vr: "ST", vm: "1", name: "AddressTrial"},
    "0040A354": {vr: "LO", vm: "1", name: "TelephoneNumberTrial"},
    "0040A358": {vr: "SQ", vm: "1", name: "VerbalSourceIdentifierCodeSequenceTrial"},
    "0040A360": {vr: "SQ", vm: "1", name: "PredecessorDocumentsSequence"},
    "0040A370": {vr: "SQ", vm: "1", name: "ReferencedRequestSequence"},
    "0040A372": {vr: "SQ", vm: "1", name: "PerformedProcedureCodeSequence"},
    "0040A375": {vr: "SQ", vm: "1", name: "CurrentRequestedProcedureEvidenceSequence"},
    "0040A380": {vr: "SQ", vm: "1", name: "ReportDetailSequenceTrial"},
    "0040A385": {vr: "SQ", vm: "1", name: "PertinentOtherEvidenceSequence"},
    "0040A390": {vr: "SQ", vm: "1", name: "HL7StructuredDocumentReferenceSequence"},
    "0040A402": {vr: "UI", vm: "1", name: "ObservationSubjectUIDTrial"},
    "0040A403": {vr: "CS", vm: "1", name: "ObservationSubjectClassTrial"},
    "0040A404": {vr: "SQ", vm: "1", name: "ObservationSubjectTypeCodeSequenceTrial"},
    "0040A491": {vr: "CS", vm: "1", name: "CompletionFlag"},
    "0040A492": {vr: "LO", vm: "1", name: "CompletionFlagDescription"},
    "0040A493": {vr: "CS", vm: "1", name: "VerificationFlag"},
    "0040A494": {vr: "CS", vm: "1", name: "ArchiveRequested"},
    "0040A496": {vr: "CS", vm: "1", name: "PreliminaryFlag"},
    "0040A504": {vr: "SQ", vm: "1", name: "ContentTemplateSequence"},
    "0040A525": {vr: "SQ", vm: "1", name: "IdenticalDocumentsSequence"},
    "0040A600": {vr: "CS", vm: "1", name: "ObservationSubjectContextFlagTrial"},
    "0040A601": {vr: "CS", vm: "1", name: "ObserverContextFlagTrial"},
    "0040A603": {vr: "CS", vm: "1", name: "ProcedureContextFlagTrial"},
    "0040A730": {vr: "SQ", vm: "1", name: "ContentSequence"},
    "0040A731": {vr: "SQ", vm: "1", name: "RelationshipSequenceTrial"},
    "0040A732": {vr: "SQ", vm: "1", name: "RelationshipTypeCodeSequenceTrial"},
    "0040A744": {vr: "SQ", vm: "1", name: "LanguageCodeSequenceTrial"},
    "0040A992": {vr: "ST", vm: "1", name: "UniformResourceLocatorTrial"},
    "0040B020": {vr: "SQ", vm: "1", name: "WaveformAnnotationSequence"},
    "0040DB00": {vr: "CS", vm: "1", name: "TemplateIdentifier"},
    "0040DB06": {vr: "DT", vm: "1", name: "TemplateVersion"},
    "0040DB07": {vr: "DT", vm: "1", name: "TemplateLocalVersion"},
    "0040DB0B": {vr: "CS", vm: "1", name: "TemplateExtensionFlag"},
    "0040DB0C": {vr: "UI", vm: "1", name: "TemplateExtensionOrganizationUID"},
    "0040DB0D": {vr: "UI", vm: "1", name: "TemplateExtensionCreatorUID"},
    "0040DB73": {vr: "UL", vm: "1-n", name: "ReferencedContentItemIdentifier"},
    "0040E001": {vr: "ST", vm: "1", name: "HL7InstanceIdentifier"},
    "0040E004": {vr: "DT", vm: "1", name: "HL7DocumentEffectiveTime"},
    "0040E006": {vr: "SQ", vm: "1", name: "HL7DocumentTypeCodeSequence"},
    "0040E008": {vr: "SQ", vm: "1", name: "DocumentClassCodeSequence"},
    "0040E010": {vr: "UT", vm: "1", name: "RetrieveURI"},
    "0040E011": {vr: "UI", vm: "1", name: "RetrieveLocationUID"},
    "0040E020": {vr: "CS", vm: "1", name: "TypeOfInstances"},
    "0040E021": {vr: "SQ", vm: "1", name: "DICOMRetrievalSequence"},
    "0040E022": {vr: "SQ", vm: "1", name: "DICOMMediaRetrievalSequence"},
    "0040E023": {vr: "SQ", vm: "1", name: "WADORetrievalSequence"},
    "0040E024": {vr: "SQ", vm: "1", name: "XDSRetrievalSequence"},
    "0040E030": {vr: "UI", vm: "1", name: "RepositoryUniqueID"},
    "0040E031": {vr: "UI", vm: "1", name: "HomeCommunityID"},
    "00420010": {vr: "ST", vm: "1", name: "DocumentTitle"},
    "00420011": {vr: "OB", vm: "1", name: "EncapsulatedDocument"},
    "00420012": {vr: "LO", vm: "1", name: "MIMETypeOfEncapsulatedDocument"},
    "00420013": {vr: "SQ", vm: "1", name: "SourceInstanceSequence"},
    "00420014": {vr: "LO", vm: "1-n", name: "ListOfMIMETypes"},
    "00440001": {vr: "ST", vm: "1", name: "ProductPackageIdentifier"},
    "00440002": {vr: "CS", vm: "1", name: "SubstanceAdministrationApproval"},
    "00440003": {vr: "LT", vm: "1", name: "ApprovalStatusFurtherDescription"},
    "00440004": {vr: "DT", vm: "1", name: "ApprovalStatusDateTime"},
    "00440007": {vr: "SQ", vm: "1", name: "ProductTypeCodeSequence"},
    "00440008": {vr: "LO", vm: "1-n", name: "ProductName"},
    "00440009": {vr: "LT", vm: "1", name: "ProductDescription"},
    "0044000A": {vr: "LO", vm: "1", name: "ProductLotIdentifier"},
    "0044000B": {vr: "DT", vm: "1", name: "ProductExpirationDateTime"},
    "00440010": {vr: "DT", vm: "1", name: "SubstanceAdministrationDateTime"},
    "00440011": {vr: "LO", vm: "1", name: "SubstanceAdministrationNotes"},
    "00440012": {vr: "LO", vm: "1", name: "SubstanceAdministrationDeviceID"},
    "00440013": {vr: "SQ", vm: "1", name: "ProductParameterSequence"},
    "00440019": {vr: "SQ", vm: "1", name: "SubstanceAdministrationParameterSequence"},
    "00460012": {vr: "LO", vm: "1", name: "LensDescription"},
    "00460014": {vr: "SQ", vm: "1", name: "RightLensSequence"},
    "00460015": {vr: "SQ", vm: "1", name: "LeftLensSequence"},
    "00460016": {vr: "SQ", vm: "1", name: "UnspecifiedLateralityLensSequence"},
    "00460018": {vr: "SQ", vm: "1", name: "CylinderSequence"},
    "00460028": {vr: "SQ", vm: "1", name: "PrismSequence"},
    "00460030": {vr: "FD", vm: "1", name: "HorizontalPrismPower"},
    "00460032": {vr: "CS", vm: "1", name: "HorizontalPrismBase"},
    "00460034": {vr: "FD", vm: "1", name: "VerticalPrismPower"},
    "00460036": {vr: "CS", vm: "1", name: "VerticalPrismBase"},
    "00460038": {vr: "CS", vm: "1", name: "LensSegmentType"},
    "00460040": {vr: "FD", vm: "1", name: "OpticalTransmittance"},
    "00460042": {vr: "FD", vm: "1", name: "ChannelWidth"},
    "00460044": {vr: "FD", vm: "1", name: "PupilSize"},
    "00460046": {vr: "FD", vm: "1", name: "CornealSize"},
    "00460050": {vr: "SQ", vm: "1", name: "AutorefractionRightEyeSequence"},
    "00460052": {vr: "SQ", vm: "1", name: "AutorefractionLeftEyeSequence"},
    "00460060": {vr: "FD", vm: "1", name: "DistancePupillaryDistance"},
    "00460062": {vr: "FD", vm: "1", name: "NearPupillaryDistance"},
    "00460063": {vr: "FD", vm: "1", name: "IntermediatePupillaryDistance"},
    "00460064": {vr: "FD", vm: "1", name: "OtherPupillaryDistance"},
    "00460070": {vr: "SQ", vm: "1", name: "KeratometryRightEyeSequence"},
    "00460071": {vr: "SQ", vm: "1", name: "KeratometryLeftEyeSequence"},
    "00460074": {vr: "SQ", vm: "1", name: "SteepKeratometricAxisSequence"},
    "00460075": {vr: "FD", vm: "1", name: "RadiusOfCurvature"},
    "00460076": {vr: "FD", vm: "1", name: "KeratometricPower"},
    "00460077": {vr: "FD", vm: "1", name: "KeratometricAxis"},
    "00460080": {vr: "SQ", vm: "1", name: "FlatKeratometricAxisSequence"},
    "00460092": {vr: "CS", vm: "1", name: "BackgroundColor"},
    "00460094": {vr: "CS", vm: "1", name: "Optotype"},
    "00460095": {vr: "CS", vm: "1", name: "OptotypePresentation"},
    "00460097": {vr: "SQ", vm: "1", name: "SubjectiveRefractionRightEyeSequence"},
    "00460098": {vr: "SQ", vm: "1", name: "SubjectiveRefractionLeftEyeSequence"},
    "00460100": {vr: "SQ", vm: "1", name: "AddNearSequence"},
    "00460101": {vr: "SQ", vm: "1", name: "AddIntermediateSequence"},
    "00460102": {vr: "SQ", vm: "1", name: "AddOtherSequence"},
    "00460104": {vr: "FD", vm: "1", name: "AddPower"},
    "00460106": {vr: "FD", vm: "1", name: "ViewingDistance"},
    "00460121": {vr: "SQ", vm: "1", name: "VisualAcuityTypeCodeSequence"},
    "00460122": {vr: "SQ", vm: "1", name: "VisualAcuityRightEyeSequence"},
    "00460123": {vr: "SQ", vm: "1", name: "VisualAcuityLeftEyeSequence"},
    "00460124": {vr: "SQ", vm: "1", name: "VisualAcuityBothEyesOpenSequence"},
    "00460125": {vr: "CS", vm: "1", name: "ViewingDistanceType"},
    "00460135": {vr: "SS", vm: "2", name: "VisualAcuityModifiers"},
    "00460137": {vr: "FD", vm: "1", name: "DecimalVisualAcuity"},
    "00460139": {vr: "LO", vm: "1", name: "OptotypeDetailedDefinition"},
    "00460145": {vr: "SQ", vm: "1", name: "ReferencedRefractiveMeasurementsSequence"},
    "00460146": {vr: "FD", vm: "1", name: "SpherePower"},
    "00460147": {vr: "FD", vm: "1", name: "CylinderPower"},
    "00480001": {vr: "FL", vm: "1", name: "ImagedVolumeWidth"},
    "00480002": {vr: "FL", vm: "1", name: "ImagedVolumeHeight"},
    "00480003": {vr: "FL", vm: "1", name: "ImagedVolumeDepth"},
    "00480006": {vr: "UL", vm: "1", name: "TotalPixelMatrixColumns"},
    "00480007": {vr: "UL", vm: "1", name: "TotalPixelMatrixRows"},
    "00480008": {vr: "SQ", vm: "1", name: "TotalPixelMatrixOriginSequence"},
    "00480010": {vr: "CS", vm: "1", name: "SpecimenLabelInImage"},
    "00480011": {vr: "CS", vm: "1", name: "FocusMethod"},
    "00480012": {vr: "CS", vm: "1", name: "ExtendedDepthOfField"},
    "00480013": {vr: "US", vm: "1", name: "NumberOfFocalPlanes"},
    "00480014": {vr: "FL", vm: "1", name: "DistanceBetweenFocalPlanes"},
    "00480015": {vr: "US", vm: "3", name: "RecommendedAbsentPixelCIELabValue"},
    "00480100": {vr: "SQ", vm: "1", name: "IlluminatorTypeCodeSequence"},
    "00480102": {vr: "DS", vm: "6", name: "ImageOrientationSlide"},
    "00480105": {vr: "SQ", vm: "1", name: "OpticalPathSequence"},
    "00480106": {vr: "SH", vm: "1", name: "OpticalPathIdentifier"},
    "00480107": {vr: "ST", vm: "1", name: "OpticalPathDescription"},
    "00480108": {vr: "SQ", vm: "1", name: "IlluminationColorCodeSequence"},
    "00480110": {vr: "SQ", vm: "1", name: "SpecimenReferenceSequence"},
    "00480111": {vr: "DS", vm: "1", name: "CondenserLensPower"},
    "00480112": {vr: "DS", vm: "1", name: "ObjectiveLensPower"},
    "00480113": {vr: "DS", vm: "1", name: "ObjectiveLensNumericalAperture"},
    "00480120": {vr: "SQ", vm: "1", name: "PaletteColorLookupTableSequence"},
    "00480200": {vr: "SQ", vm: "1", name: "ReferencedImageNavigationSequence"},
    "00480201": {vr: "US", vm: "2", name: "TopLeftHandCornerOfLocalizerArea"},
    "00480202": {vr: "US", vm: "2", name: "BottomRightHandCornerOfLocalizerArea"},
    "00480207": {vr: "SQ", vm: "1", name: "OpticalPathIdentificationSequence"},
    "0048021A": {vr: "SQ", vm: "1", name: "PlanePositionSlideSequence"},
    "0048021E": {vr: "SL", vm: "1", name: "RowPositionInTotalImagePixelMatrix"},
    "0048021F": {vr: "SL", vm: "1", name: "ColumnPositionInTotalImagePixelMatrix"},
    "00480301": {vr: "CS", vm: "1", name: "PixelOriginInterpretation"},
    "00500004": {vr: "CS", vm: "1", name: "CalibrationImage"},
    "00500010": {vr: "SQ", vm: "1", name: "DeviceSequence"},
    "00500012": {vr: "SQ", vm: "1", name: "ContainerComponentTypeCodeSequence"},
    "00500013": {vr: "FD", vm: "1", name: "ContainerComponentThickness"},
    "00500014": {vr: "DS", vm: "1", name: "DeviceLength"},
    "00500015": {vr: "FD", vm: "1", name: "ContainerComponentWidth"},
    "00500016": {vr: "DS", vm: "1", name: "DeviceDiameter"},
    "00500017": {vr: "CS", vm: "1", name: "DeviceDiameterUnits"},
    "00500018": {vr: "DS", vm: "1", name: "DeviceVolume"},
    "00500019": {vr: "DS", vm: "1", name: "InterMarkerDistance"},
    "0050001A": {vr: "CS", vm: "1", name: "ContainerComponentMaterial"},
    "0050001B": {vr: "LO", vm: "1", name: "ContainerComponentID"},
    "0050001C": {vr: "FD", vm: "1", name: "ContainerComponentLength"},
    "0050001D": {vr: "FD", vm: "1", name: "ContainerComponentDiameter"},
    "0050001E": {vr: "LO", vm: "1", name: "ContainerComponentDescription"},
    "00500020": {vr: "LO", vm: "1", name: "DeviceDescription"},
    "00520001": {vr: "FL", vm: "1", name: "ContrastBolusIngredientPercentByVolume"},
    "00520002": {vr: "FD", vm: "1", name: "OCTFocalDistance"},
    "00520003": {vr: "FD", vm: "1", name: "BeamSpotSize"},
    "00520004": {vr: "FD", vm: "1", name: "EffectiveRefractiveIndex"},
    "00520006": {vr: "CS", vm: "1", name: "OCTAcquisitionDomain"},
    "00520007": {vr: "FD", vm: "1", name: "OCTOpticalCenterWavelength"},
    "00520008": {vr: "FD", vm: "1", name: "AxialResolution"},
    "00520009": {vr: "FD", vm: "1", name: "RangingDepth"},
    "00520011": {vr: "FD", vm: "1", name: "ALineRate"},
    "00520012": {vr: "US", vm: "1", name: "ALinesPerFrame"},
    "00520013": {vr: "FD", vm: "1", name: "CatheterRotationalRate"},
    "00520014": {vr: "FD", vm: "1", name: "ALinePixelSpacing"},
    "00520016": {vr: "SQ", vm: "1", name: "ModeOfPercutaneousAccessSequence"},
    "00520025": {vr: "SQ", vm: "1", name: "IntravascularOCTFrameTypeSequence"},
    "00520026": {vr: "CS", vm: "1", name: "OCTZOffsetApplied"},
    "00520027": {vr: "SQ", vm: "1", name: "IntravascularFrameContentSequence"},
    "00520028": {vr: "FD", vm: "1", name: "IntravascularLongitudinalDistance"},
    "00520029": {vr: "SQ", vm: "1", name: "IntravascularOCTFrameContentSequence"},
    "00520030": {vr: "SS", vm: "1", name: "OCTZOffsetCorrection"},
    "00520031": {vr: "CS", vm: "1", name: "CatheterDirectionOfRotation"},
    "00520033": {vr: "FD", vm: "1", name: "SeamLineLocation"},
    "00520034": {vr: "FD", vm: "1", name: "FirstALineLocation"},
    "00520036": {vr: "US", vm: "1", name: "SeamLineIndex"},
    "00520038": {vr: "US", vm: "1", name: "NumberOfPaddedAlines"},
    "00520039": {vr: "CS", vm: "1", name: "InterpolationType"},
    "0052003A": {vr: "CS", vm: "1", name: "RefractiveIndexApplied"},
    "00540011": {vr: "US", vm: "1", name: "NumberOfEnergyWindows"},
    "00540012": {vr: "SQ", vm: "1", name: "EnergyWindowInformationSequence"},
    "00540013": {vr: "SQ", vm: "1", name: "EnergyWindowRangeSequence"},
    "00540014": {vr: "DS", vm: "1", name: "EnergyWindowLowerLimit"},
    "00540015": {vr: "DS", vm: "1", name: "EnergyWindowUpperLimit"},
    "00540016": {vr: "SQ", vm: "1", name: "RadiopharmaceuticalInformationSequence"},
    "00540017": {vr: "IS", vm: "1", name: "ResidualSyringeCounts"},
    "00540018": {vr: "SH", vm: "1", name: "EnergyWindowName"},
    "00540020": {vr: "US", vm: "1-n", name: "DetectorVector"},
    "00540021": {vr: "US", vm: "1", name: "NumberOfDetectors"},
    "00540022": {vr: "SQ", vm: "1", name: "DetectorInformationSequence"},
    "00540030": {vr: "US", vm: "1-n", name: "PhaseVector"},
    "00540031": {vr: "US", vm: "1", name: "NumberOfPhases"},
    "00540032": {vr: "SQ", vm: "1", name: "PhaseInformationSequence"},
    "00540033": {vr: "US", vm: "1", name: "NumberOfFramesInPhase"},
    "00540036": {vr: "IS", vm: "1", name: "PhaseDelay"},
    "00540038": {vr: "IS", vm: "1", name: "PauseBetweenFrames"},
    "00540039": {vr: "CS", vm: "1", name: "PhaseDescription"},
    "00540050": {vr: "US", vm: "1-n", name: "RotationVector"},
    "00540051": {vr: "US", vm: "1", name: "NumberOfRotations"},
    "00540052": {vr: "SQ", vm: "1", name: "RotationInformationSequence"},
    "00540053": {vr: "US", vm: "1", name: "NumberOfFramesInRotation"},
    "00540060": {vr: "US", vm: "1-n", name: "RRIntervalVector"},
    "00540061": {vr: "US", vm: "1", name: "NumberOfRRIntervals"},
    "00540062": {vr: "SQ", vm: "1", name: "GatedInformationSequence"},
    "00540063": {vr: "SQ", vm: "1", name: "DataInformationSequence"},
    "00540070": {vr: "US", vm: "1-n", name: "TimeSlotVector"},
    "00540071": {vr: "US", vm: "1", name: "NumberOfTimeSlots"},
    "00540072": {vr: "SQ", vm: "1", name: "TimeSlotInformationSequence"},
    "00540073": {vr: "DS", vm: "1", name: "TimeSlotTime"},
    "00540080": {vr: "US", vm: "1-n", name: "SliceVector"},
    "00540081": {vr: "US", vm: "1", name: "NumberOfSlices"},
    "00540090": {vr: "US", vm: "1-n", name: "AngularViewVector"},
    "00540100": {vr: "US", vm: "1-n", name: "TimeSliceVector"},
    "00540101": {vr: "US", vm: "1", name: "NumberOfTimeSlices"},
    "00540200": {vr: "DS", vm: "1", name: "StartAngle"},
    "00540202": {vr: "CS", vm: "1", name: "TypeOfDetectorMotion"},
    "00540210": {vr: "IS", vm: "1-n", name: "TriggerVector"},
    "00540211": {vr: "US", vm: "1", name: "NumberOfTriggersInPhase"},
    "00540220": {vr: "SQ", vm: "1", name: "ViewCodeSequence"},
    "00540222": {vr: "SQ", vm: "1", name: "ViewModifierCodeSequence"},
    "00540300": {vr: "SQ", vm: "1", name: "RadionuclideCodeSequence"},
    "00540302": {vr: "SQ", vm: "1", name: "AdministrationRouteCodeSequence"},
    "00540304": {vr: "SQ", vm: "1", name: "RadiopharmaceuticalCodeSequence"},
    "00540306": {vr: "SQ", vm: "1", name: "CalibrationDataSequence"},
    "00540308": {vr: "US", vm: "1", name: "EnergyWindowNumber"},
    "00540400": {vr: "SH", vm: "1", name: "ImageID"},
    "00540410": {vr: "SQ", vm: "1", name: "PatientOrientationCodeSequence"},
    "00540412": {vr: "SQ", vm: "1", name: "PatientOrientationModifierCodeSequence"},
    "00540414": {vr: "SQ", vm: "1", name: "PatientGantryRelationshipCodeSequence"},
    "00540500": {vr: "CS", vm: "1", name: "SliceProgressionDirection"},
    "00541000": {vr: "CS", vm: "2", name: "SeriesType"},
    "00541001": {vr: "CS", vm: "1", name: "Units"},
    "00541002": {vr: "CS", vm: "1", name: "CountsSource"},
    "00541004": {vr: "CS", vm: "1", name: "ReprojectionMethod"},
    "00541006": {vr: "CS", vm: "1", name: "SUVType"},
    "00541100": {vr: "CS", vm: "1", name: "RandomsCorrectionMethod"},
    "00541101": {vr: "LO", vm: "1", name: "AttenuationCorrectionMethod"},
    "00541102": {vr: "CS", vm: "1", name: "DecayCorrection"},
    "00541103": {vr: "LO", vm: "1", name: "ReconstructionMethod"},
    "00541104": {vr: "LO", vm: "1", name: "DetectorLinesOfResponseUsed"},
    "00541105": {vr: "LO", vm: "1", name: "ScatterCorrectionMethod"},
    "00541200": {vr: "DS", vm: "1", name: "AxialAcceptance"},
    "00541201": {vr: "IS", vm: "2", name: "AxialMash"},
    "00541202": {vr: "IS", vm: "1", name: "TransverseMash"},
    "00541203": {vr: "DS", vm: "2", name: "DetectorElementSize"},
    "00541210": {vr: "DS", vm: "1", name: "CoincidenceWindowWidth"},
    "00541220": {vr: "CS", vm: "1-n", name: "SecondaryCountsType"},
    "00541300": {vr: "DS", vm: "1", name: "FrameReferenceTime"},
    "00541310": {vr: "IS", vm: "1", name: "PrimaryPromptsCountsAccumulated"},
    "00541311": {vr: "IS", vm: "1-n", name: "SecondaryCountsAccumulated"},
    "00541320": {vr: "DS", vm: "1", name: "SliceSensitivityFactor"},
    "00541321": {vr: "DS", vm: "1", name: "DecayFactor"},
    "00541322": {vr: "DS", vm: "1", name: "DoseCalibrationFactor"},
    "00541323": {vr: "DS", vm: "1", name: "ScatterFractionFactor"},
    "00541324": {vr: "DS", vm: "1", name: "DeadTimeFactor"},
    "00541330": {vr: "US", vm: "1", name: "ImageIndex"},
    "00541400": {vr: "CS", vm: "1-n", name: "CountsIncluded"},
    "00541401": {vr: "CS", vm: "1", name: "DeadTimeCorrectionFlag"},
    "00603000": {vr: "SQ", vm: "1", name: "HistogramSequence"},
    "00603002": {vr: "US", vm: "1", name: "HistogramNumberOfBins"},
    "00603004": {vr: "US|SS", vm: "1", name: "HistogramFirstBinValue"},
    "00603006": {vr: "US|SS", vm: "1", name: "HistogramLastBinValue"},
    "00603008": {vr: "US", vm: "1", name: "HistogramBinWidth"},
    "00603010": {vr: "LO", vm: "1", name: "HistogramExplanation"},
    "00603020": {vr: "UL", vm: "1-n", name: "HistogramData"},
    "00620001": {vr: "CS", vm: "1", name: "SegmentationType"},
    "00620002": {vr: "SQ", vm: "1", name: "SegmentSequence"},
    "00620003": {vr: "SQ", vm: "1", name: "SegmentedPropertyCategoryCodeSequence"},
    "00620004": {vr: "US", vm: "1", name: "SegmentNumber"},
    "00620005": {vr: "LO", vm: "1", name: "SegmentLabel"},
    "00620006": {vr: "ST", vm: "1", name: "SegmentDescription"},
    "00620008": {vr: "CS", vm: "1", name: "SegmentAlgorithmType"},
    "00620009": {vr: "LO", vm: "1", name: "SegmentAlgorithmName"},
    "0062000A": {vr: "SQ", vm: "1", name: "SegmentIdentificationSequence"},
    "0062000B": {vr: "US", vm: "1-n", name: "ReferencedSegmentNumber"},
    "0062000C": {vr: "US", vm: "1", name: "RecommendedDisplayGrayscaleValue"},
    "0062000D": {vr: "US", vm: "3", name: "RecommendedDisplayCIELabValue"},
    "0062000E": {vr: "US", vm: "1", name: "MaximumFractionalValue"},
    "0062000F": {vr: "SQ", vm: "1", name: "SegmentedPropertyTypeCodeSequence"},
    "00620010": {vr: "CS", vm: "1", name: "SegmentationFractionalType"},
    "00640002": {vr: "SQ", vm: "1", name: "DeformableRegistrationSequence"},
    "00640003": {vr: "UI", vm: "1", name: "SourceFrameOfReferenceUID"},
    "00640005": {vr: "SQ", vm: "1", name: "DeformableRegistrationGridSequence"},
    "00640007": {vr: "UL", vm: "3", name: "GridDimensions"},
    "00640008": {vr: "FD", vm: "3", name: "GridResolution"},
    "00640009": {vr: "OF", vm: "1", name: "VectorGridData"},
    "0064000F": {vr: "SQ", vm: "1", name: "PreDeformationMatrixRegistrationSequence"},
    "00640010": {vr: "SQ", vm: "1", name: "PostDeformationMatrixRegistrationSequence"},
    "00660001": {vr: "UL", vm: "1", name: "NumberOfSurfaces"},
    "00660002": {vr: "SQ", vm: "1", name: "SurfaceSequence"},
    "00660003": {vr: "UL", vm: "1", name: "SurfaceNumber"},
    "00660004": {vr: "LT", vm: "1", name: "SurfaceComments"},
    "00660009": {vr: "CS", vm: "1", name: "SurfaceProcessing"},
    "0066000A": {vr: "FL", vm: "1", name: "SurfaceProcessingRatio"},
    "0066000B": {vr: "LO", vm: "1", name: "SurfaceProcessingDescription"},
    "0066000C": {vr: "FL", vm: "1", name: "RecommendedPresentationOpacity"},
    "0066000D": {vr: "CS", vm: "1", name: "RecommendedPresentationType"},
    "0066000E": {vr: "CS", vm: "1", name: "FiniteVolume"},
    "00660010": {vr: "CS", vm: "1", name: "Manifold"},
    "00660011": {vr: "SQ", vm: "1", name: "SurfacePointsSequence"},
    "00660012": {vr: "SQ", vm: "1", name: "SurfacePointsNormalsSequence"},
    "00660013": {vr: "SQ", vm: "1", name: "SurfaceMeshPrimitivesSequence"},
    "00660015": {vr: "UL", vm: "1", name: "NumberOfSurfacePoints"},
    "00660016": {vr: "OF", vm: "1", name: "PointCoordinatesData"},
    "00660017": {vr: "FL", vm: "3", name: "PointPositionAccuracy"},
    "00660018": {vr: "FL", vm: "1", name: "MeanPointDistance"},
    "00660019": {vr: "FL", vm: "1", name: "MaximumPointDistance"},
    "0066001A": {vr: "FL", vm: "6", name: "PointsBoundingBoxCoordinates"},
    "0066001B": {vr: "FL", vm: "3", name: "AxisOfRotation"},
    "0066001C": {vr: "FL", vm: "3", name: "CenterOfRotation"},
    "0066001E": {vr: "UL", vm: "1", name: "NumberOfVectors"},
    "0066001F": {vr: "US", vm: "1", name: "VectorDimensionality"},
    "00660020": {vr: "FL", vm: "1-n", name: "VectorAccuracy"},
    "00660021": {vr: "OF", vm: "1", name: "VectorCoordinateData"},
    "00660023": {vr: "OW", vm: "1", name: "TrianglePointIndexList"},
    "00660024": {vr: "OW", vm: "1", name: "EdgePointIndexList"},
    "00660025": {vr: "OW", vm: "1", name: "VertexPointIndexList"},
    "00660026": {vr: "SQ", vm: "1", name: "TriangleStripSequence"},
    "00660027": {vr: "SQ", vm: "1", name: "TriangleFanSequence"},
    "00660028": {vr: "SQ", vm: "1", name: "LineSequence"},
    "00660029": {vr: "OW", vm: "1", name: "PrimitivePointIndexList"},
    "0066002A": {vr: "UL", vm: "1", name: "SurfaceCount"},
    "0066002B": {vr: "SQ", vm: "1", name: "ReferencedSurfaceSequence"},
    "0066002C": {vr: "UL", vm: "1", name: "ReferencedSurfaceNumber"},
    "0066002D": {vr: "SQ", vm: "1", name: "SegmentSurfaceGenerationAlgorithmIdentificationSequence"},
    "0066002E": {vr: "SQ", vm: "1", name: "SegmentSurfaceSourceInstanceSequence"},
    "0066002F": {vr: "SQ", vm: "1", name: "AlgorithmFamilyCodeSequence"},
    "00660030": {vr: "SQ", vm: "1", name: "AlgorithmNameCodeSequence"},
    "00660031": {vr: "LO", vm: "1", name: "AlgorithmVersion"},
    "00660032": {vr: "LT", vm: "1", name: "AlgorithmParameters"},
    "00660034": {vr: "SQ", vm: "1", name: "FacetSequence"},
    "00660035": {vr: "SQ", vm: "1", name: "SurfaceProcessingAlgorithmIdentificationSequence"},
    "00660036": {vr: "LO", vm: "1", name: "AlgorithmName"},
    "00686210": {vr: "LO", vm: "1", name: "ImplantSize"},
    "00686221": {vr: "LO", vm: "1", name: "ImplantTemplateVersion"},
    "00686222": {vr: "SQ", vm: "1", name: "ReplacedImplantTemplateSequence"},
    "00686223": {vr: "CS", vm: "1", name: "ImplantType"},
    "00686224": {vr: "SQ", vm: "1", name: "DerivationImplantTemplateSequence"},
    "00686225": {vr: "SQ", vm: "1", name: "OriginalImplantTemplateSequence"},
    "00686226": {vr: "DT", vm: "1", name: "EffectiveDateTime"},
    "00686230": {vr: "SQ", vm: "1", name: "ImplantTargetAnatomySequence"},
    "00686260": {vr: "SQ", vm: "1", name: "InformationFromManufacturerSequence"},
    "00686265": {vr: "SQ", vm: "1", name: "NotificationFromManufacturerSequence"},
    "00686270": {vr: "DT", vm: "1", name: "InformationIssueDateTime"},
    "00686280": {vr: "ST", vm: "1", name: "InformationSummary"},
    "006862A0": {vr: "SQ", vm: "1", name: "ImplantRegulatoryDisapprovalCodeSequence"},
    "006862A5": {vr: "FD", vm: "1", name: "OverallTemplateSpatialTolerance"},
    "006862C0": {vr: "SQ", vm: "1", name: "HPGLDocumentSequence"},
    "006862D0": {vr: "US", vm: "1", name: "HPGLDocumentID"},
    "006862D5": {vr: "LO", vm: "1", name: "HPGLDocumentLabel"},
    "006862E0": {vr: "SQ", vm: "1", name: "ViewOrientationCodeSequence"},
    "006862F0": {vr: "FD", vm: "9", name: "ViewOrientationModifier"},
    "006862F2": {vr: "FD", vm: "1", name: "HPGLDocumentScaling"},
    "00686300": {vr: "OB", vm: "1", name: "HPGLDocument"},
    "00686310": {vr: "US", vm: "1", name: "HPGLContourPenNumber"},
    "00686320": {vr: "SQ", vm: "1", name: "HPGLPenSequence"},
    "00686330": {vr: "US", vm: "1", name: "HPGLPenNumber"},
    "00686340": {vr: "LO", vm: "1", name: "HPGLPenLabel"},
    "00686345": {vr: "ST", vm: "1", name: "HPGLPenDescription"},
    "00686346": {vr: "FD", vm: "2", name: "RecommendedRotationPoint"},
    "00686347": {vr: "FD", vm: "4", name: "BoundingRectangle"},
    "00686350": {vr: "US", vm: "1-n", name: "ImplantTemplate3DModelSurfaceNumber"},
    "00686360": {vr: "SQ", vm: "1", name: "SurfaceModelDescriptionSequence"},
    "00686380": {vr: "LO", vm: "1", name: "SurfaceModelLabel"},
    "00686390": {vr: "FD", vm: "1", name: "SurfaceModelScalingFactor"},
    "006863A0": {vr: "SQ", vm: "1", name: "MaterialsCodeSequence"},
    "006863A4": {vr: "SQ", vm: "1", name: "CoatingMaterialsCodeSequence"},
    "006863A8": {vr: "SQ", vm: "1", name: "ImplantTypeCodeSequence"},
    "006863AC": {vr: "SQ", vm: "1", name: "FixationMethodCodeSequence"},
    "006863B0": {vr: "SQ", vm: "1", name: "MatingFeatureSetsSequence"},
    "006863C0": {vr: "US", vm: "1", name: "MatingFeatureSetID"},
    "006863D0": {vr: "LO", vm: "1", name: "MatingFeatureSetLabel"},
    "006863E0": {vr: "SQ", vm: "1", name: "MatingFeatureSequence"},
    "006863F0": {vr: "US", vm: "1", name: "MatingFeatureID"},
    "00686400": {vr: "SQ", vm: "1", name: "MatingFeatureDegreeOfFreedomSequence"},
    "00686410": {vr: "US", vm: "1", name: "DegreeOfFreedomID"},
    "00686420": {vr: "CS", vm: "1", name: "DegreeOfFreedomType"},
    "00686430": {vr: "SQ", vm: "1", name: "TwoDMatingFeatureCoordinatesSequence"},
    "00686440": {vr: "US", vm: "1", name: "ReferencedHPGLDocumentID"},
    "00686450": {vr: "FD", vm: "2", name: "TwoDMatingPoint"},
    "00686460": {vr: "FD", vm: "4", name: "TwoDMatingAxes"},
    "00686470": {vr: "SQ", vm: "1", name: "TwoDDegreeOfFreedomSequence"},
    "00686490": {vr: "FD", vm: "3", name: "ThreeDDegreeOfFreedomAxis"},
    "006864A0": {vr: "FD", vm: "2", name: "RangeOfFreedom"},
    "006864C0": {vr: "FD", vm: "3", name: "ThreeDMatingPoint"},
    "006864D0": {vr: "FD", vm: "9", name: "ThreeDMatingAxes"},
    "006864F0": {vr: "FD", vm: "3", name: "TwoDDegreeOfFreedomAxis"},
    "00686500": {vr: "SQ", vm: "1", name: "PlanningLandmarkPointSequence"},
    "00686510": {vr: "SQ", vm: "1", name: "PlanningLandmarkLineSequence"},
    "00686520": {vr: "SQ", vm: "1", name: "PlanningLandmarkPlaneSequence"},
    "00686530": {vr: "US", vm: "1", name: "PlanningLandmarkID"},
    "00686540": {vr: "LO", vm: "1", name: "PlanningLandmarkDescription"},
    "00686545": {vr: "SQ", vm: "1", name: "PlanningLandmarkIdentificationCodeSequence"},
    "00686550": {vr: "SQ", vm: "1", name: "TwoDPointCoordinatesSequence"},
    "00686560": {vr: "FD", vm: "2", name: "TwoDPointCoordinates"},
    "00686590": {vr: "FD", vm: "3", name: "ThreeDPointCoordinates"},
    "006865A0": {vr: "SQ", vm: "1", name: "TwoDLineCoordinatesSequence"},
    "006865B0": {vr: "FD", vm: "4", name: "TwoDLineCoordinates"},
    "006865D0": {vr: "FD", vm: "6", name: "ThreeDLineCoordinates"},
    "006865E0": {vr: "SQ", vm: "1", name: "TwoDPlaneCoordinatesSequence"},
    "006865F0": {vr: "FD", vm: "4", name: "TwoDPlaneIntersection"},
    "00686610": {vr: "FD", vm: "3", name: "ThreeDPlaneOrigin"},
    "00686620": {vr: "FD", vm: "3", name: "ThreeDPlaneNormal"},
    "00700001": {vr: "SQ", vm: "1", name: "GraphicAnnotationSequence"},
    "00700002": {vr: "CS", vm: "1", name: "GraphicLayer"},
    "00700003": {vr: "CS", vm: "1", name: "BoundingBoxAnnotationUnits"},
    "00700004": {vr: "CS", vm: "1", name: "AnchorPointAnnotationUnits"},
    "00700005": {vr: "CS", vm: "1", name: "GraphicAnnotationUnits"},
    "00700006": {vr: "ST", vm: "1", name: "UnformattedTextValue"},
    "00700008": {vr: "SQ", vm: "1", name: "TextObjectSequence"},
    "00700009": {vr: "SQ", vm: "1", name: "GraphicObjectSequence"},
    "00700010": {vr: "FL", vm: "2", name: "BoundingBoxTopLeftHandCorner"},
    "00700011": {vr: "FL", vm: "2", name: "BoundingBoxBottomRightHandCorner"},
    "00700012": {vr: "CS", vm: "1", name: "BoundingBoxTextHorizontalJustification"},
    "00700014": {vr: "FL", vm: "2", name: "AnchorPoint"},
    "00700015": {vr: "CS", vm: "1", name: "AnchorPointVisibility"},
    "00700020": {vr: "US", vm: "1", name: "GraphicDimensions"},
    "00700021": {vr: "US", vm: "1", name: "NumberOfGraphicPoints"},
    "00700022": {vr: "FL", vm: "2-n", name: "GraphicData"},
    "00700023": {vr: "CS", vm: "1", name: "GraphicType"},
    "00700024": {vr: "CS", vm: "1", name: "GraphicFilled"},
    "00700040": {vr: "IS", vm: "1", name: "ImageRotationRetired"},
    "00700041": {vr: "CS", vm: "1", name: "ImageHorizontalFlip"},
    "00700042": {vr: "US", vm: "1", name: "ImageRotation"},
    "00700050": {vr: "US", vm: "2", name: "DisplayedAreaTopLeftHandCornerTrial"},
    "00700051": {vr: "US", vm: "2", name: "DisplayedAreaBottomRightHandCornerTrial"},
    "00700052": {vr: "SL", vm: "2", name: "DisplayedAreaTopLeftHandCorner"},
    "00700053": {vr: "SL", vm: "2", name: "DisplayedAreaBottomRightHandCorner"},
    "0070005A": {vr: "SQ", vm: "1", name: "DisplayedAreaSelectionSequence"},
    "00700060": {vr: "SQ", vm: "1", name: "GraphicLayerSequence"},
    "00700062": {vr: "IS", vm: "1", name: "GraphicLayerOrder"},
    "00700066": {vr: "US", vm: "1", name: "GraphicLayerRecommendedDisplayGrayscaleValue"},
    "00700067": {vr: "US", vm: "3", name: "GraphicLayerRecommendedDisplayRGBValue"},
    "00700068": {vr: "LO", vm: "1", name: "GraphicLayerDescription"},
    "00700080": {vr: "CS", vm: "1", name: "ContentLabel"},
    "00700081": {vr: "LO", vm: "1", name: "ContentDescription"},
    "00700082": {vr: "DA", vm: "1", name: "PresentationCreationDate"},
    "00700083": {vr: "TM", vm: "1", name: "PresentationCreationTime"},
    "00700084": {vr: "PN", vm: "1", name: "ContentCreatorName"},
    "00700086": {vr: "SQ", vm: "1", name: "ContentCreatorIdentificationCodeSequence"},
    "00700087": {vr: "SQ", vm: "1", name: "AlternateContentDescriptionSequence"},
    "00700100": {vr: "CS", vm: "1", name: "PresentationSizeMode"},
    "00700101": {vr: "DS", vm: "2", name: "PresentationPixelSpacing"},
    "00700102": {vr: "IS", vm: "2", name: "PresentationPixelAspectRatio"},
    "00700103": {vr: "FL", vm: "1", name: "PresentationPixelMagnificationRatio"},
    "00700207": {vr: "LO", vm: "1", name: "GraphicGroupLabel"},
    "00700208": {vr: "ST", vm: "1", name: "GraphicGroupDescription"},
    "00700209": {vr: "SQ", vm: "1", name: "CompoundGraphicSequence"},
    "00700226": {vr: "UL", vm: "1", name: "CompoundGraphicInstanceID"},
    "00700227": {vr: "LO", vm: "1", name: "FontName"},
    "00700228": {vr: "CS", vm: "1", name: "FontNameType"},
    "00700229": {vr: "LO", vm: "1", name: "CSSFontName"},
    "00700230": {vr: "FD", vm: "1", name: "RotationAngle"},
    "00700231": {vr: "SQ", vm: "1", name: "TextStyleSequence"},
    "00700232": {vr: "SQ", vm: "1", name: "LineStyleSequence"},
    "00700233": {vr: "SQ", vm: "1", name: "FillStyleSequence"},
    "00700234": {vr: "SQ", vm: "1", name: "GraphicGroupSequence"},
    "00700241": {vr: "US", vm: "3", name: "TextColorCIELabValue"},
    "00700242": {vr: "CS", vm: "1", name: "HorizontalAlignment"},
    "00700243": {vr: "CS", vm: "1", name: "VerticalAlignment"},
    "00700244": {vr: "CS", vm: "1", name: "ShadowStyle"},
    "00700245": {vr: "FL", vm: "1", name: "ShadowOffsetX"},
    "00700246": {vr: "FL", vm: "1", name: "ShadowOffsetY"},
    "00700247": {vr: "US", vm: "3", name: "ShadowColorCIELabValue"},
    "00700248": {vr: "CS", vm: "1", name: "Underlined"},
    "00700249": {vr: "CS", vm: "1", name: "Bold"},
    "00700250": {vr: "CS", vm: "1", name: "Italic"},
    "00700251": {vr: "US", vm: "3", name: "PatternOnColorCIELabValue"},
    "00700252": {vr: "US", vm: "3", name: "PatternOffColorCIELabValue"},
    "00700253": {vr: "FL", vm: "1", name: "LineThickness"},
    "00700254": {vr: "CS", vm: "1", name: "LineDashingStyle"},
    "00700255": {vr: "UL", vm: "1", name: "LinePattern"},
    "00700256": {vr: "OB", vm: "1", name: "FillPattern"},
    "00700257": {vr: "CS", vm: "1", name: "FillMode"},
    "00700258": {vr: "FL", vm: "1", name: "ShadowOpacity"},
    "00700261": {vr: "FL", vm: "1", name: "GapLength"},
    "00700262": {vr: "FL", vm: "1", name: "DiameterOfVisibility"},
    "00700273": {vr: "FL", vm: "2", name: "RotationPoint"},
    "00700274": {vr: "CS", vm: "1", name: "TickAlignment"},
    "00700278": {vr: "CS", vm: "1", name: "ShowTickLabel"},
    "00700279": {vr: "CS", vm: "1", name: "TickLabelAlignment"},
    "00700282": {vr: "CS", vm: "1", name: "CompoundGraphicUnits"},
    "00700284": {vr: "FL", vm: "1", name: "PatternOnOpacity"},
    "00700285": {vr: "FL", vm: "1", name: "PatternOffOpacity"},
    "00700287": {vr: "SQ", vm: "1", name: "MajorTicksSequence"},
    "00700288": {vr: "FL", vm: "1", name: "TickPosition"},
    "00700289": {vr: "SH", vm: "1", name: "TickLabel"},
    "00700294": {vr: "CS", vm: "1", name: "CompoundGraphicType"},
    "00700295": {vr: "UL", vm: "1", name: "GraphicGroupID"},
    "00700306": {vr: "CS", vm: "1", name: "ShapeType"},
    "00700308": {vr: "SQ", vm: "1", name: "RegistrationSequence"},
    "00700309": {vr: "SQ", vm: "1", name: "MatrixRegistrationSequence"},
    "0070030A": {vr: "SQ", vm: "1", name: "MatrixSequence"},
    "0070030C": {vr: "CS", vm: "1", name: "FrameOfReferenceTransformationMatrixType"},
    "0070030D": {vr: "SQ", vm: "1", name: "RegistrationTypeCodeSequence"},
    "0070030F": {vr: "ST", vm: "1", name: "FiducialDescription"},
    "00700310": {vr: "SH", vm: "1", name: "FiducialIdentifier"},
    "00700311": {vr: "SQ", vm: "1", name: "FiducialIdentifierCodeSequence"},
    "00700312": {vr: "FD", vm: "1", name: "ContourUncertaintyRadius"},
    "00700314": {vr: "SQ", vm: "1", name: "UsedFiducialsSequence"},
    "00700318": {vr: "SQ", vm: "1", name: "GraphicCoordinatesDataSequence"},
    "0070031A": {vr: "UI", vm: "1", name: "FiducialUID"},
    "0070031C": {vr: "SQ", vm: "1", name: "FiducialSetSequence"},
    "0070031E": {vr: "SQ", vm: "1", name: "FiducialSequence"},
    "00700401": {vr: "US", vm: "3", name: "GraphicLayerRecommendedDisplayCIELabValue"},
    "00700402": {vr: "SQ", vm: "1", name: "BlendingSequence"},
    "00700403": {vr: "FL", vm: "1", name: "RelativeOpacity"},
    "00700404": {vr: "SQ", vm: "1", name: "ReferencedSpatialRegistrationSequence"},
    "00700405": {vr: "CS", vm: "1", name: "BlendingPosition"},
    "00720002": {vr: "SH", vm: "1", name: "HangingProtocolName"},
    "00720004": {vr: "LO", vm: "1", name: "HangingProtocolDescription"},
    "00720006": {vr: "CS", vm: "1", name: "HangingProtocolLevel"},
    "00720008": {vr: "LO", vm: "1", name: "HangingProtocolCreator"},
    "0072000A": {vr: "DT", vm: "1", name: "HangingProtocolCreationDateTime"},
    "0072000C": {vr: "SQ", vm: "1", name: "HangingProtocolDefinitionSequence"},
    "0072000E": {vr: "SQ", vm: "1", name: "HangingProtocolUserIdentificationCodeSequence"},
    "00720010": {vr: "LO", vm: "1", name: "HangingProtocolUserGroupName"},
    "00720012": {vr: "SQ", vm: "1", name: "SourceHangingProtocolSequence"},
    "00720014": {vr: "US", vm: "1", name: "NumberOfPriorsReferenced"},
    "00720020": {vr: "SQ", vm: "1", name: "ImageSetsSequence"},
    "00720022": {vr: "SQ", vm: "1", name: "ImageSetSelectorSequence"},
    "00720024": {vr: "CS", vm: "1", name: "ImageSetSelectorUsageFlag"},
    "00720026": {vr: "AT", vm: "1", name: "SelectorAttribute"},
    "00720028": {vr: "US", vm: "1", name: "SelectorValueNumber"},
    "00720030": {vr: "SQ", vm: "1", name: "TimeBasedImageSetsSequence"},
    "00720032": {vr: "US", vm: "1", name: "ImageSetNumber"},
    "00720034": {vr: "CS", vm: "1", name: "ImageSetSelectorCategory"},
    "00720038": {vr: "US", vm: "2", name: "RelativeTime"},
    "0072003A": {vr: "CS", vm: "1", name: "RelativeTimeUnits"},
    "0072003C": {vr: "SS", vm: "2", name: "AbstractPriorValue"},
    "0072003E": {vr: "SQ", vm: "1", name: "AbstractPriorCodeSequence"},
    "00720040": {vr: "LO", vm: "1", name: "ImageSetLabel"},
    "00720050": {vr: "CS", vm: "1", name: "SelectorAttributeVR"},
    "00720052": {vr: "AT", vm: "1-n", name: "SelectorSequencePointer"},
    "00720054": {vr: "LO", vm: "1-n", name: "SelectorSequencePointerPrivateCreator"},
    "00720056": {vr: "LO", vm: "1", name: "SelectorAttributePrivateCreator"},
    "00720060": {vr: "AT", vm: "1-n", name: "SelectorATValue"},
    "00720062": {vr: "CS", vm: "1-n", name: "SelectorCSValue"},
    "00720064": {vr: "IS", vm: "1-n", name: "SelectorISValue"},
    "00720066": {vr: "LO", vm: "1-n", name: "SelectorLOValue"},
    "00720068": {vr: "LT", vm: "1", name: "SelectorLTValue"},
    "0072006A": {vr: "PN", vm: "1-n", name: "SelectorPNValue"},
    "0072006C": {vr: "SH", vm: "1-n", name: "SelectorSHValue"},
    "0072006E": {vr: "ST", vm: "1", name: "SelectorSTValue"},
    "00720070": {vr: "UT", vm: "1", name: "SelectorUTValue"},
    "00720072": {vr: "DS", vm: "1-n", name: "SelectorDSValue"},
    "00720074": {vr: "FD", vm: "1-n", name: "SelectorFDValue"},
    "00720076": {vr: "FL", vm: "1-n", name: "SelectorFLValue"},
    "00720078": {vr: "UL", vm: "1-n", name: "SelectorULValue"},
    "0072007A": {vr: "US", vm: "1-n", name: "SelectorUSValue"},
    "0072007C": {vr: "SL", vm: "1-n", name: "SelectorSLValue"},
    "0072007E": {vr: "SS", vm: "1-n", name: "SelectorSSValue"},
    "00720080": {vr: "SQ", vm: "1", name: "SelectorCodeSequenceValue"},
    "00720100": {vr: "US", vm: "1", name: "NumberOfScreens"},
    "00720102": {vr: "SQ", vm: "1", name: "NominalScreenDefinitionSequence"},
    "00720104": {vr: "US", vm: "1", name: "NumberOfVerticalPixels"},
    "00720106": {vr: "US", vm: "1", name: "NumberOfHorizontalPixels"},
    "00720108": {vr: "FD", vm: "4", name: "DisplayEnvironmentSpatialPosition"},
    "0072010A": {vr: "US", vm: "1", name: "ScreenMinimumGrayscaleBitDepth"},
    "0072010C": {vr: "US", vm: "1", name: "ScreenMinimumColorBitDepth"},
    "0072010E": {vr: "US", vm: "1", name: "ApplicationMaximumRepaintTime"},
    "00720200": {vr: "SQ", vm: "1", name: "DisplaySetsSequence"},
    "00720202": {vr: "US", vm: "1", name: "DisplaySetNumber"},
    "00720203": {vr: "LO", vm: "1", name: "DisplaySetLabel"},
    "00720204": {vr: "US", vm: "1", name: "DisplaySetPresentationGroup"},
    "00720206": {vr: "LO", vm: "1", name: "DisplaySetPresentationGroupDescription"},
    "00720208": {vr: "CS", vm: "1", name: "PartialDataDisplayHandling"},
    "00720210": {vr: "SQ", vm: "1", name: "SynchronizedScrollingSequence"},
    "00720212": {vr: "US", vm: "2-n", name: "DisplaySetScrollingGroup"},
    "00720214": {vr: "SQ", vm: "1", name: "NavigationIndicatorSequence"},
    "00720216": {vr: "US", vm: "1", name: "NavigationDisplaySet"},
    "00720218": {vr: "US", vm: "1-n", name: "ReferenceDisplaySets"},
    "00720300": {vr: "SQ", vm: "1", name: "ImageBoxesSequence"},
    "00720302": {vr: "US", vm: "1", name: "ImageBoxNumber"},
    "00720304": {vr: "CS", vm: "1", name: "ImageBoxLayoutType"},
    "00720306": {vr: "US", vm: "1", name: "ImageBoxTileHorizontalDimension"},
    "00720308": {vr: "US", vm: "1", name: "ImageBoxTileVerticalDimension"},
    "00720310": {vr: "CS", vm: "1", name: "ImageBoxScrollDirection"},
    "00720312": {vr: "CS", vm: "1", name: "ImageBoxSmallScrollType"},
    "00720314": {vr: "US", vm: "1", name: "ImageBoxSmallScrollAmount"},
    "00720316": {vr: "CS", vm: "1", name: "ImageBoxLargeScrollType"},
    "00720318": {vr: "US", vm: "1", name: "ImageBoxLargeScrollAmount"},
    "00720320": {vr: "US", vm: "1", name: "ImageBoxOverlapPriority"},
    "00720330": {vr: "FD", vm: "1", name: "CineRelativeToRealTime"},
    "00720400": {vr: "SQ", vm: "1", name: "FilterOperationsSequence"},
    "00720402": {vr: "CS", vm: "1", name: "FilterByCategory"},
    "00720404": {vr: "CS", vm: "1", name: "FilterByAttributePresence"},
    "00720406": {vr: "CS", vm: "1", name: "FilterByOperator"},
    "00720420": {vr: "US", vm: "3", name: "StructuredDisplayBackgroundCIELabValue"},
    "00720421": {vr: "US", vm: "3", name: "EmptyImageBoxCIELabValue"},
    "00720422": {vr: "SQ", vm: "1", name: "StructuredDisplayImageBoxSequence"},
    "00720424": {vr: "SQ", vm: "1", name: "StructuredDisplayTextBoxSequence"},
    "00720427": {vr: "SQ", vm: "1", name: "ReferencedFirstFrameSequence"},
    "00720430": {vr: "SQ", vm: "1", name: "ImageBoxSynchronizationSequence"},
    "00720432": {vr: "US", vm: "2-n", name: "SynchronizedImageBoxList"},
    "00720434": {vr: "CS", vm: "1", name: "TypeOfSynchronization"},
    "00720500": {vr: "CS", vm: "1", name: "BlendingOperationType"},
    "00720510": {vr: "CS", vm: "1", name: "ReformattingOperationType"},
    "00720512": {vr: "FD", vm: "1", name: "ReformattingThickness"},
    "00720514": {vr: "FD", vm: "1", name: "ReformattingInterval"},
    "00720516": {vr: "CS", vm: "1", name: "ReformattingOperationInitialViewDirection"},
    "00720520": {vr: "CS", vm: "1-n", name: "ThreeDRenderingType"},
    "00720600": {vr: "SQ", vm: "1", name: "SortingOperationsSequence"},
    "00720602": {vr: "CS", vm: "1", name: "SortByCategory"},
    "00720604": {vr: "CS", vm: "1", name: "SortingDirection"},
    "00720700": {vr: "CS", vm: "2", name: "DisplaySetPatientOrientation"},
    "00720702": {vr: "CS", vm: "1", name: "VOIType"},
    "00720704": {vr: "CS", vm: "1", name: "PseudoColorType"},
    "00720705": {vr: "SQ", vm: "1", name: "PseudoColorPaletteInstanceReferenceSequence"},
    "00720706": {vr: "CS", vm: "1", name: "ShowGrayscaleInverted"},
    "00720710": {vr: "CS", vm: "1", name: "ShowImageTrueSizeFlag"},
    "00720712": {vr: "CS", vm: "1", name: "ShowGraphicAnnotationFlag"},
    "00720714": {vr: "CS", vm: "1", name: "ShowPatientDemographicsFlag"},
    "00720716": {vr: "CS", vm: "1", name: "ShowAcquisitionTechniquesFlag"},
    "00720717": {vr: "CS", vm: "1", name: "DisplaySetHorizontalJustification"},
    "00720718": {vr: "CS", vm: "1", name: "DisplaySetVerticalJustification"},
    "00740120": {vr: "FD", vm: "1", name: "ContinuationStartMeterset"},
    "00740121": {vr: "FD", vm: "1", name: "ContinuationEndMeterset"},
    "00741000": {vr: "CS", vm: "1", name: "ProcedureStepState"},
    "00741002": {vr: "SQ", vm: "1", name: "ProcedureStepProgressInformationSequence"},
    "00741004": {vr: "DS", vm: "1", name: "ProcedureStepProgress"},
    "00741006": {vr: "ST", vm: "1", name: "ProcedureStepProgressDescription"},
    "00741008": {vr: "SQ", vm: "1", name: "ProcedureStepCommunicationsURISequence"},
    "0074100a": {vr: "ST", vm: "1", name: "ContactURI"},
    "0074100c": {vr: "LO", vm: "1", name: "ContactDisplayName"},
    "0074100e": {vr: "SQ", vm: "1", name: "ProcedureStepDiscontinuationReasonCodeSequence"},
    "00741020": {vr: "SQ", vm: "1", name: "BeamTaskSequence"},
    "00741022": {vr: "CS", vm: "1", name: "BeamTaskType"},
    "00741024": {vr: "IS", vm: "1", name: "BeamOrderIndexTrial"},
    "00741026": {vr: "FD", vm: "1", name: "TableTopVerticalAdjustedPosition"},
    "00741027": {vr: "FD", vm: "1", name: "TableTopLongitudinalAdjustedPosition"},
    "00741028": {vr: "FD", vm: "1", name: "TableTopLateralAdjustedPosition"},
    "0074102A": {vr: "FD", vm: "1", name: "PatientSupportAdjustedAngle"},
    "0074102B": {vr: "FD", vm: "1", name: "TableTopEccentricAdjustedAngle"},
    "0074102C": {vr: "FD", vm: "1", name: "TableTopPitchAdjustedAngle"},
    "0074102D": {vr: "FD", vm: "1", name: "TableTopRollAdjustedAngle"},
    "00741030": {vr: "SQ", vm: "1", name: "DeliveryVerificationImageSequence"},
    "00741032": {vr: "CS", vm: "1", name: "VerificationImageTiming"},
    "00741034": {vr: "CS", vm: "1", name: "DoubleExposureFlag"},
    "00741036": {vr: "CS", vm: "1", name: "DoubleExposureOrdering"},
    "00741038": {vr: "DS", vm: "1", name: "DoubleExposureMetersetTrial"},
    "0074103A": {vr: "DS", vm: "4", name: "DoubleExposureFieldDeltaTrial"},
    "00741040": {vr: "SQ", vm: "1", name: "RelatedReferenceRTImageSequence"},
    "00741042": {vr: "SQ", vm: "1", name: "GeneralMachineVerificationSequence"},
    "00741044": {vr: "SQ", vm: "1", name: "ConventionalMachineVerificationSequence"},
    "00741046": {vr: "SQ", vm: "1", name: "IonMachineVerificationSequence"},
    "00741048": {vr: "SQ", vm: "1", name: "FailedAttributesSequence"},
    "0074104A": {vr: "SQ", vm: "1", name: "OverriddenAttributesSequence"},
    "0074104C": {vr: "SQ", vm: "1", name: "ConventionalControlPointVerificationSequence"},
    "0074104E": {vr: "SQ", vm: "1", name: "IonControlPointVerificationSequence"},
    "00741050": {vr: "SQ", vm: "1", name: "AttributeOccurrenceSequence"},
    "00741052": {vr: "AT", vm: "1", name: "AttributeOccurrencePointer"},
    "00741054": {vr: "UL", vm: "1", name: "AttributeItemSelector"},
    "00741056": {vr: "LO", vm: "1", name: "AttributeOccurrencePrivateCreator"},
    "00741057": {vr: "IS", vm: "1-n", name: "SelectorSequencePointerItems"},
    "00741200": {vr: "CS", vm: "1", name: "ScheduledProcedureStepPriority"},
    "00741202": {vr: "LO", vm: "1", name: "WorklistLabel"},
    "00741204": {vr: "LO", vm: "1", name: "ProcedureStepLabel"},
    "00741210": {vr: "SQ", vm: "1", name: "ScheduledProcessingParametersSequence"},
    "00741212": {vr: "SQ", vm: "1", name: "PerformedProcessingParametersSequence"},
    "00741216": {vr: "SQ", vm: "1", name: "UnifiedProcedureStepPerformedProcedureSequence"},
    "00741220": {vr: "SQ", vm: "1", name: "RelatedProcedureStepSequence"},
    "00741222": {vr: "LO", vm: "1", name: "ProcedureStepRelationshipType"},
    "00741224": {vr: "SQ", vm: "1", name: "ReplacedProcedureStepSequence"},
    "00741230": {vr: "LO", vm: "1", name: "DeletionLock"},
    "00741234": {vr: "AE", vm: "1", name: "ReceivingAE"},
    "00741236": {vr: "AE", vm: "1", name: "RequestingAE"},
    "00741238": {vr: "LT", vm: "1", name: "ReasonForCancellation"},
    "00741242": {vr: "CS", vm: "1", name: "SCPStatus"},
    "00741244": {vr: "CS", vm: "1", name: "SubscriptionListStatus"},
    "00741246": {vr: "CS", vm: "1", name: "UnifiedProcedureStepListStatus"},
    "00741324": {vr: "UL", vm: "1", name: "BeamOrderIndex"},
    "00741338": {vr: "FD", vm: "1", name: "DoubleExposureMeterset"},
    "0074133A": {vr: "FD", vm: "4", name: "DoubleExposureFieldDelta"},
    "00760001": {vr: "LO", vm: "1", name: "ImplantAssemblyTemplateName"},
    "00760003": {vr: "LO", vm: "1", name: "ImplantAssemblyTemplateIssuer"},
    "00760006": {vr: "LO", vm: "1", name: "ImplantAssemblyTemplateVersion"},
    "00760008": {vr: "SQ", vm: "1", name: "ReplacedImplantAssemblyTemplateSequence"},
    "0076000A": {vr: "CS", vm: "1", name: "ImplantAssemblyTemplateType"},
    "0076000C": {vr: "SQ", vm: "1", name: "OriginalImplantAssemblyTemplateSequence"},
    "0076000E": {vr: "SQ", vm: "1", name: "DerivationImplantAssemblyTemplateSequence"},
    "00760010": {vr: "SQ", vm: "1", name: "ImplantAssemblyTemplateTargetAnatomySequence"},
    "00760020": {vr: "SQ", vm: "1", name: "ProcedureTypeCodeSequence"},
    "00760030": {vr: "LO", vm: "1", name: "SurgicalTechnique"},
    "00760032": {vr: "SQ", vm: "1", name: "ComponentTypesSequence"},
    "00760034": {vr: "CS", vm: "1", name: "ComponentTypeCodeSequence"},
    "00760036": {vr: "CS", vm: "1", name: "ExclusiveComponentType"},
    "00760038": {vr: "CS", vm: "1", name: "MandatoryComponentType"},
    "00760040": {vr: "SQ", vm: "1", name: "ComponentSequence"},
    "00760055": {vr: "US", vm: "1", name: "ComponentID"},
    "00760060": {vr: "SQ", vm: "1", name: "ComponentAssemblySequence"},
    "00760070": {vr: "US", vm: "1", name: "Component1ReferencedID"},
    "00760080": {vr: "US", vm: "1", name: "Component1ReferencedMatingFeatureSetID"},
    "00760090": {vr: "US", vm: "1", name: "Component1ReferencedMatingFeatureID"},
    "007600A0": {vr: "US", vm: "1", name: "Component2ReferencedID"},
    "007600B0": {vr: "US", vm: "1", name: "Component2ReferencedMatingFeatureSetID"},
    "007600C0": {vr: "US", vm: "1", name: "Component2ReferencedMatingFeatureID"},
    "00780001": {vr: "LO", vm: "1", name: "ImplantTemplateGroupName"},
    "00780010": {vr: "ST", vm: "1", name: "ImplantTemplateGroupDescription"},
    "00780020": {vr: "LO", vm: "1", name: "ImplantTemplateGroupIssuer"},
    "00780024": {vr: "LO", vm: "1", name: "ImplantTemplateGroupVersion"},
    "00780026": {vr: "SQ", vm: "1", name: "ReplacedImplantTemplateGroupSequence"},
    "00780028": {vr: "SQ", vm: "1", name: "ImplantTemplateGroupTargetAnatomySequence"},
    "0078002A": {vr: "SQ", vm: "1", name: "ImplantTemplateGroupMembersSequence"},
    "0078002E": {vr: "US", vm: "1", name: "ImplantTemplateGroupMemberID"},
    "00780050": {vr: "FD", vm: "3", name: "ThreeDImplantTemplateGroupMemberMatchingPoint"},
    "00780060": {vr: "FD", vm: "9", name: "ThreeDImplantTemplateGroupMemberMatchingAxes"},
    "00780070": {vr: "SQ", vm: "1", name: "ImplantTemplateGroupMemberMatching2DCoordinatesSequence"},
    "00780090": {vr: "FD", vm: "2", name: "TwoDImplantTemplateGroupMemberMatchingPoint"},
    "007800A0": {vr: "FD", vm: "4", name: "TwoDImplantTemplateGroupMemberMatchingAxes"},
    "007800B0": {vr: "SQ", vm: "1", name: "ImplantTemplateGroupVariationDimensionSequence"},
    "007800B2": {vr: "LO", vm: "1", name: "ImplantTemplateGroupVariationDimensionName"},
    "007800B4": {vr: "SQ", vm: "1", name: "ImplantTemplateGroupVariationDimensionRankSequence"},
    "007800B6": {vr: "US", vm: "1", name: "ReferencedImplantTemplateGroupMemberID"},
    "007800B8": {vr: "US", vm: "1", name: "ImplantTemplateGroupVariationDimensionRank"},
    "00880130": {vr: "SH", vm: "1", name: "StorageMediaFileSetID"},
    "00880140": {vr: "UI", vm: "1", name: "StorageMediaFileSetUID"},
    "00880200": {vr: "SQ", vm: "1", name: "IconImageSequence"},
    "00880904": {vr: "LO", vm: "1", name: "TopicTitle"},
    "00880906": {vr: "ST", vm: "1", name: "TopicSubject"},
    "00880910": {vr: "LO", vm: "1", name: "TopicAuthor"},
    "00880912": {vr: "LO", vm: "1-32", name: "TopicKeywords"},
    "01000410": {vr: "CS", vm: "1", name: "SOPInstanceStatus"},
    "01000420": {vr: "DT", vm: "1", name: "SOPAuthorizationDateTime"},
    "01000424": {vr: "LT", vm: "1", name: "SOPAuthorizationComment"},
    "01000426": {vr: "LO", vm: "1", name: "AuthorizationEquipmentCertificationNumber"},
    "04000005": {vr: "US", vm: "1", name: "MACIDNumber"},
    "04000010": {vr: "UI", vm: "1", name: "MACCalculationTransferSyntaxUID"},
    "04000015": {vr: "CS", vm: "1", name: "MACAlgorithm"},
    "04000020": {vr: "AT", vm: "1-n", name: "DataElementsSigned"},
    "04000100": {vr: "UI", vm: "1", name: "DigitalSignatureUID"},
    "04000105": {vr: "DT", vm: "1", name: "DigitalSignatureDateTime"},
    "04000110": {vr: "CS", vm: "1", name: "CertificateType"},
    "04000115": {vr: "OB", vm: "1", name: "CertificateOfSigner"},
    "04000120": {vr: "OB", vm: "1", name: "Signature"},
    "04000305": {vr: "CS", vm: "1", name: "CertifiedTimestampType"},
    "04000310": {vr: "OB", vm: "1", name: "CertifiedTimestamp"},
    "04000401": {vr: "SQ", vm: "1", name: "DigitalSignaturePurposeCodeSequence"},
    "04000402": {vr: "SQ", vm: "1", name: "ReferencedDigitalSignatureSequence"},
    "04000403": {vr: "SQ", vm: "1", name: "ReferencedSOPInstanceMACSequence"},
    "04000404": {vr: "OB", vm: "1", name: "MAC"},
    "04000500": {vr: "SQ", vm: "1", name: "EncryptedAttributesSequence"},
    "04000510": {vr: "UI", vm: "1", name: "EncryptedContentTransferSyntaxUID"},
    "04000520": {vr: "OB", vm: "1", name: "EncryptedContent"},
    "04000550": {vr: "SQ", vm: "1", name: "ModifiedAttributesSequence"},
    "04000561": {vr: "SQ", vm: "1", name: "OriginalAttributesSequence"},
    "04000562": {vr: "DT", vm: "1", name: "AttributeModificationDateTime"},
    "04000563": {vr: "LO", vm: "1", name: "ModifyingSystem"},
    "04000564": {vr: "LO", vm: "1", name: "SourceOfPreviousValues"},
    "04000565": {vr: "CS", vm: "1", name: "ReasonForTheAttributeModification"},
    "1000xxx0": {vr: "US", vm: "3", name: "EscapeTriplet"},
    "1000xxx1": {vr: "US", vm: "3", name: "RunLengthTriplet"},
    "1000xxx2": {vr: "US", vm: "1", name: "HuffmanTableSize"},
    "1000xxx3": {vr: "US", vm: "3", name: "HuffmanTableTriplet"},
    "1000xxx4": {vr: "US", vm: "1", name: "ShiftTableSize"},
    "1000xxx5": {vr: "US", vm: "3", name: "ShiftTableTriplet"},
    "1010xxxx": {vr: "US", vm: "1-n", name: "ZonalMap"},
    "20000010": {vr: "IS", vm: "1", name: "NumberOfCopies"},
    "2000001E": {vr: "SQ", vm: "1", name: "PrinterConfigurationSequence"},
    "20000020": {vr: "CS", vm: "1", name: "PrintPriority"},
    "20000030": {vr: "CS", vm: "1", name: "MediumType"},
    "20000040": {vr: "CS", vm: "1", name: "FilmDestination"},
    "20000050": {vr: "LO", vm: "1", name: "FilmSessionLabel"},
    "20000060": {vr: "IS", vm: "1", name: "MemoryAllocation"},
    "20000061": {vr: "IS", vm: "1", name: "MaximumMemoryAllocation"},
    "20000062": {vr: "CS", vm: "1", name: "ColorImagePrintingFlag"},
    "20000063": {vr: "CS", vm: "1", name: "CollationFlag"},
    "20000065": {vr: "CS", vm: "1", name: "AnnotationFlag"},
    "20000067": {vr: "CS", vm: "1", name: "ImageOverlayFlag"},
    "20000069": {vr: "CS", vm: "1", name: "PresentationLUTFlag"},
    "2000006A": {vr: "CS", vm: "1", name: "ImageBoxPresentationLUTFlag"},
    "200000A0": {vr: "US", vm: "1", name: "MemoryBitDepth"},
    "200000A1": {vr: "US", vm: "1", name: "PrintingBitDepth"},
    "200000A2": {vr: "SQ", vm: "1", name: "MediaInstalledSequence"},
    "200000A4": {vr: "SQ", vm: "1", name: "OtherMediaAvailableSequence"},
    "200000A8": {vr: "SQ", vm: "1", name: "SupportedImageDisplayFormatsSequence"},
    "20000500": {vr: "SQ", vm: "1", name: "ReferencedFilmBoxSequence"},
    "20000510": {vr: "SQ", vm: "1", name: "ReferencedStoredPrintSequence"},
    "20100010": {vr: "ST", vm: "1", name: "ImageDisplayFormat"},
    "20100030": {vr: "CS", vm: "1", name: "AnnotationDisplayFormatID"},
    "20100040": {vr: "CS", vm: "1", name: "FilmOrientation"},
    "20100050": {vr: "CS", vm: "1", name: "FilmSizeID"},
    "20100052": {vr: "CS", vm: "1", name: "PrinterResolutionID"},
    "20100054": {vr: "CS", vm: "1", name: "DefaultPrinterResolutionID"},
    "20100060": {vr: "CS", vm: "1", name: "MagnificationType"},
    "20100080": {vr: "CS", vm: "1", name: "SmoothingType"},
    "201000A6": {vr: "CS", vm: "1", name: "DefaultMagnificationType"},
    "201000A7": {vr: "CS", vm: "1-n", name: "OtherMagnificationTypesAvailable"},
    "201000A8": {vr: "CS", vm: "1", name: "DefaultSmoothingType"},
    "201000A9": {vr: "CS", vm: "1-n", name: "OtherSmoothingTypesAvailable"},
    "20100100": {vr: "CS", vm: "1", name: "BorderDensity"},
    "20100110": {vr: "CS", vm: "1", name: "EmptyImageDensity"},
    "20100120": {vr: "US", vm: "1", name: "MinDensity"},
    "20100130": {vr: "US", vm: "1", name: "MaxDensity"},
    "20100140": {vr: "CS", vm: "1", name: "Trim"},
    "20100150": {vr: "ST", vm: "1", name: "ConfigurationInformation"},
    "20100152": {vr: "LT", vm: "1", name: "ConfigurationInformationDescription"},
    "20100154": {vr: "IS", vm: "1", name: "MaximumCollatedFilms"},
    "2010015E": {vr: "US", vm: "1", name: "Illumination"},
    "20100160": {vr: "US", vm: "1", name: "ReflectedAmbientLight"},
    "20100376": {vr: "DS", vm: "2", name: "PrinterPixelSpacing"},
    "20100500": {vr: "SQ", vm: "1", name: "ReferencedFilmSessionSequence"},
    "20100510": {vr: "SQ", vm: "1", name: "ReferencedImageBoxSequence"},
    "20100520": {vr: "SQ", vm: "1", name: "ReferencedBasicAnnotationBoxSequence"},
    "20200010": {vr: "US", vm: "1", name: "ImageBoxPosition"},
    "20200020": {vr: "CS", vm: "1", name: "Polarity"},
    "20200030": {vr: "DS", vm: "1", name: "RequestedImageSize"},
    "20200040": {vr: "CS", vm: "1", name: "RequestedDecimateCropBehavior"},
    "20200050": {vr: "CS", vm: "1", name: "RequestedResolutionID"},
    "202000A0": {vr: "CS", vm: "1", name: "RequestedImageSizeFlag"},
    "202000A2": {vr: "CS", vm: "1", name: "DecimateCropResult"},
    "20200110": {vr: "SQ", vm: "1", name: "BasicGrayscaleImageSequence"},
    "20200111": {vr: "SQ", vm: "1", name: "BasicColorImageSequence"},
    "20200130": {vr: "SQ", vm: "1", name: "ReferencedImageOverlayBoxSequence"},
    "20200140": {vr: "SQ", vm: "1", name: "ReferencedVOILUTBoxSequence"},
    "20300010": {vr: "US", vm: "1", name: "AnnotationPosition"},
    "20300020": {vr: "LO", vm: "1", name: "TextString"},
    "20400010": {vr: "SQ", vm: "1", name: "ReferencedOverlayPlaneSequence"},
    "20400011": {vr: "US", vm: "1-99", name: "ReferencedOverlayPlaneGroups"},
    "20400020": {vr: "SQ", vm: "1", name: "OverlayPixelDataSequence"},
    "20400060": {vr: "CS", vm: "1", name: "OverlayMagnificationType"},
    "20400070": {vr: "CS", vm: "1", name: "OverlaySmoothingType"},
    "20400072": {vr: "CS", vm: "1", name: "OverlayOrImageMagnification"},
    "20400074": {vr: "US", vm: "1", name: "MagnifyToNumberOfColumns"},
    "20400080": {vr: "CS", vm: "1", name: "OverlayForegroundDensity"},
    "20400082": {vr: "CS", vm: "1", name: "OverlayBackgroundDensity"},
    "20400090": {vr: "CS", vm: "1", name: "OverlayMode"},
    "20400100": {vr: "CS", vm: "1", name: "ThresholdDensity"},
    "20400500": {vr: "SQ", vm: "1", name: "ReferencedImageBoxSequenceRetired"},
    "20500010": {vr: "SQ", vm: "1", name: "PresentationLUTSequence"},
    "20500020": {vr: "CS", vm: "1", name: "PresentationLUTShape"},
    "20500500": {vr: "SQ", vm: "1", name: "ReferencedPresentationLUTSequence"},
    "21000010": {vr: "SH", vm: "1", name: "PrintJobID"},
    "21000020": {vr: "CS", vm: "1", name: "ExecutionStatus"},
    "21000030": {vr: "CS", vm: "1", name: "ExecutionStatusInfo"},
    "21000040": {vr: "DA", vm: "1", name: "CreationDate"},
    "21000050": {vr: "TM", vm: "1", name: "CreationTime"},
    "21000070": {vr: "AE", vm: "1", name: "Originator"},
    "21000140": {vr: "AE", vm: "1", name: "DestinationAE"},
    "21000160": {vr: "SH", vm: "1", name: "OwnerID"},
    "21000170": {vr: "IS", vm: "1", name: "NumberOfFilms"},
    "21000500": {vr: "SQ", vm: "1", name: "ReferencedPrintJobSequencePullStoredPrint"},
    "21100010": {vr: "CS", vm: "1", name: "PrinterStatus"},
    "21100020": {vr: "CS", vm: "1", name: "PrinterStatusInfo"},
    "21100030": {vr: "LO", vm: "1", name: "PrinterName"},
    "21100099": {vr: "SH", vm: "1", name: "PrintQueueID"},
    "21200010": {vr: "CS", vm: "1", name: "QueueStatus"},
    "21200050": {vr: "SQ", vm: "1", name: "PrintJobDescriptionSequence"},
    "21200070": {vr: "SQ", vm: "1", name: "ReferencedPrintJobSequence"},
    "21300010": {vr: "SQ", vm: "1", name: "PrintManagementCapabilitiesSequence"},
    "21300015": {vr: "SQ", vm: "1", name: "PrinterCharacteristicsSequence"},
    "21300030": {vr: "SQ", vm: "1", name: "FilmBoxContentSequence"},
    "21300040": {vr: "SQ", vm: "1", name: "ImageBoxContentSequence"},
    "21300050": {vr: "SQ", vm: "1", name: "AnnotationContentSequence"},
    "21300060": {vr: "SQ", vm: "1", name: "ImageOverlayBoxContentSequence"},
    "21300080": {vr: "SQ", vm: "1", name: "PresentationLUTContentSequence"},
    "213000A0": {vr: "SQ", vm: "1", name: "ProposedStudySequence"},
    "213000C0": {vr: "SQ", vm: "1", name: "OriginalImageSequence"},
    "22000001": {vr: "CS", vm: "1", name: "LabelUsingInformationExtractedFromInstances"},
    "22000002": {vr: "UT", vm: "1", name: "LabelText"},
    "22000003": {vr: "CS", vm: "1", name: "LabelStyleSelection"},
    "22000004": {vr: "LT", vm: "1", name: "MediaDisposition"},
    "22000005": {vr: "LT", vm: "1", name: "BarcodeValue"},
    "22000006": {vr: "CS", vm: "1", name: "BarcodeSymbology"},
    "22000007": {vr: "CS", vm: "1", name: "AllowMediaSplitting"},
    "22000008": {vr: "CS", vm: "1", name: "IncludeNonDICOMObjects"},
    "22000009": {vr: "CS", vm: "1", name: "IncludeDisplayApplication"},
    "2200000A": {vr: "CS", vm: "1", name: "PreserveCompositeInstancesAfterMediaCreation"},
    "2200000B": {vr: "US", vm: "1", name: "TotalNumberOfPiecesOfMediaCreated"},
    "2200000C": {vr: "LO", vm: "1", name: "RequestedMediaApplicationProfile"},
    "2200000D": {vr: "SQ", vm: "1", name: "ReferencedStorageMediaSequence"},
    "2200000E": {vr: "AT", vm: "1-n", name: "FailureAttributes"},
    "2200000F": {vr: "CS", vm: "1", name: "AllowLossyCompression"},
    "22000020": {vr: "CS", vm: "1", name: "RequestPriority"},
    "30020002": {vr: "SH", vm: "1", name: "RTImageLabel"},
    "30020003": {vr: "LO", vm: "1", name: "RTImageName"},
    "30020004": {vr: "ST", vm: "1", name: "RTImageDescription"},
    "3002000A": {vr: "CS", vm: "1", name: "ReportedValuesOrigin"},
    "3002000C": {vr: "CS", vm: "1", name: "RTImagePlane"},
    "3002000D": {vr: "DS", vm: "3", name: "XRayImageReceptorTranslation"},
    "3002000E": {vr: "DS", vm: "1", name: "XRayImageReceptorAngle"},
    "30020010": {vr: "DS", vm: "6", name: "RTImageOrientation"},
    "30020011": {vr: "DS", vm: "2", name: "ImagePlanePixelSpacing"},
    "30020012": {vr: "DS", vm: "2", name: "RTImagePosition"},
    "30020020": {vr: "SH", vm: "1", name: "RadiationMachineName"},
    "30020022": {vr: "DS", vm: "1", name: "RadiationMachineSAD"},
    "30020024": {vr: "DS", vm: "1", name: "RadiationMachineSSD"},
    "30020026": {vr: "DS", vm: "1", name: "RTImageSID"},
    "30020028": {vr: "DS", vm: "1", name: "SourceToReferenceObjectDistance"},
    "30020029": {vr: "IS", vm: "1", name: "FractionNumber"},
    "30020030": {vr: "SQ", vm: "1", name: "ExposureSequence"},
    "30020032": {vr: "DS", vm: "1", name: "MetersetExposure"},
    "30020034": {vr: "DS", vm: "4", name: "DiaphragmPosition"},
    "30020040": {vr: "SQ", vm: "1", name: "FluenceMapSequence"},
    "30020041": {vr: "CS", vm: "1", name: "FluenceDataSource"},
    "30020042": {vr: "DS", vm: "1", name: "FluenceDataScale"},
    "30020050": {vr: "SQ", vm: "1", name: "PrimaryFluenceModeSequence"},
    "30020051": {vr: "CS", vm: "1", name: "FluenceMode"},
    "30020052": {vr: "SH", vm: "1", name: "FluenceModeID"},
    "30040001": {vr: "CS", vm: "1", name: "DVHType"},
    "30040002": {vr: "CS", vm: "1", name: "DoseUnits"},
    "30040004": {vr: "CS", vm: "1", name: "DoseType"},
    "30040006": {vr: "LO", vm: "1", name: "DoseComment"},
    "30040008": {vr: "DS", vm: "3", name: "NormalizationPoint"},
    "3004000A": {vr: "CS", vm: "1", name: "DoseSummationType"},
    "3004000C": {vr: "DS", vm: "2-n", name: "GridFrameOffsetVector"},
    "3004000E": {vr: "DS", vm: "1", name: "DoseGridScaling"},
    "30040010": {vr: "SQ", vm: "1", name: "RTDoseROISequence"},
    "30040012": {vr: "DS", vm: "1", name: "DoseValue"},
    "30040014": {vr: "CS", vm: "1-3", name: "TissueHeterogeneityCorrection"},
    "30040040": {vr: "DS", vm: "3", name: "DVHNormalizationPoint"},
    "30040042": {vr: "DS", vm: "1", name: "DVHNormalizationDoseValue"},
    "30040050": {vr: "SQ", vm: "1", name: "DVHSequence"},
    "30040052": {vr: "DS", vm: "1", name: "DVHDoseScaling"},
    "30040054": {vr: "CS", vm: "1", name: "DVHVolumeUnits"},
    "30040056": {vr: "IS", vm: "1", name: "DVHNumberOfBins"},
    "30040058": {vr: "DS", vm: "2-2n", name: "DVHData"},
    "30040060": {vr: "SQ", vm: "1", name: "DVHReferencedROISequence"},
    "30040062": {vr: "CS", vm: "1", name: "DVHROIContributionType"},
    "30040070": {vr: "DS", vm: "1", name: "DVHMinimumDose"},
    "30040072": {vr: "DS", vm: "1", name: "DVHMaximumDose"},
    "30040074": {vr: "DS", vm: "1", name: "DVHMeanDose"},
    "30060002": {vr: "SH", vm: "1", name: "StructureSetLabel"},
    "30060004": {vr: "LO", vm: "1", name: "StructureSetName"},
    "30060006": {vr: "ST", vm: "1", name: "StructureSetDescription"},
    "30060008": {vr: "DA", vm: "1", name: "StructureSetDate"},
    "30060009": {vr: "TM", vm: "1", name: "StructureSetTime"},
    "30060010": {vr: "SQ", vm: "1", name: "ReferencedFrameOfReferenceSequence"},
    "30060012": {vr: "SQ", vm: "1", name: "RTReferencedStudySequence"},
    "30060014": {vr: "SQ", vm: "1", name: "RTReferencedSeriesSequence"},
    "30060016": {vr: "SQ", vm: "1", name: "ContourImageSequence"},
    "30060020": {vr: "SQ", vm: "1", name: "StructureSetROISequence"},
    "30060022": {vr: "IS", vm: "1", name: "ROINumber"},
    "30060024": {vr: "UI", vm: "1", name: "ReferencedFrameOfReferenceUID"},
    "30060026": {vr: "LO", vm: "1", name: "ROIName"},
    "30060028": {vr: "ST", vm: "1", name: "ROIDescription"},
    "3006002A": {vr: "IS", vm: "3", name: "ROIDisplayColor"},
    "3006002C": {vr: "DS", vm: "1", name: "ROIVolume"},
    "30060030": {vr: "SQ", vm: "1", name: "RTRelatedROISequence"},
    "30060033": {vr: "CS", vm: "1", name: "RTROIRelationship"},
    "30060036": {vr: "CS", vm: "1", name: "ROIGenerationAlgorithm"},
    "30060038": {vr: "LO", vm: "1", name: "ROIGenerationDescription"},
    "30060039": {vr: "SQ", vm: "1", name: "ROIContourSequence"},
    "30060040": {vr: "SQ", vm: "1", name: "ContourSequence"},
    "30060042": {vr: "CS", vm: "1", name: "ContourGeometricType"},
    "30060044": {vr: "DS", vm: "1", name: "ContourSlabThickness"},
    "30060045": {vr: "DS", vm: "3", name: "ContourOffsetVector"},
    "30060046": {vr: "IS", vm: "1", name: "NumberOfContourPoints"},
    "30060048": {vr: "IS", vm: "1", name: "ContourNumber"},
    "30060049": {vr: "IS", vm: "1-n", name: "AttachedContours"},
    "30060050": {vr: "DS", vm: "3-3n", name: "ContourData"},
    "30060080": {vr: "SQ", vm: "1", name: "RTROIObservationsSequence"},
    "30060082": {vr: "IS", vm: "1", name: "ObservationNumber"},
    "30060084": {vr: "IS", vm: "1", name: "ReferencedROINumber"},
    "30060085": {vr: "SH", vm: "1", name: "ROIObservationLabel"},
    "30060086": {vr: "SQ", vm: "1", name: "RTROIIdentificationCodeSequence"},
    "30060088": {vr: "ST", vm: "1", name: "ROIObservationDescription"},
    "300600A0": {vr: "SQ", vm: "1", name: "RelatedRTROIObservationsSequence"},
    "300600A4": {vr: "CS", vm: "1", name: "RTROIInterpretedType"},
    "300600A6": {vr: "PN", vm: "1", name: "ROIInterpreter"},
    "300600B0": {vr: "SQ", vm: "1", name: "ROIPhysicalPropertiesSequence"},
    "300600B2": {vr: "CS", vm: "1", name: "ROIPhysicalProperty"},
    "300600B4": {vr: "DS", vm: "1", name: "ROIPhysicalPropertyValue"},
    "300600B6": {vr: "SQ", vm: "1", name: "ROIElementalCompositionSequence"},
    "300600B7": {vr: "US", vm: "1", name: "ROIElementalCompositionAtomicNumber"},
    "300600B8": {vr: "FL", vm: "1", name: "ROIElementalCompositionAtomicMassFraction"},
    "300600C0": {vr: "SQ", vm: "1", name: "FrameOfReferenceRelationshipSequence"},
    "300600C2": {vr: "UI", vm: "1", name: "RelatedFrameOfReferenceUID"},
    "300600C4": {vr: "CS", vm: "1", name: "FrameOfReferenceTransformationType"},
    "300600C6": {vr: "DS", vm: "16", name: "FrameOfReferenceTransformationMatrix"},
    "300600C8": {vr: "LO", vm: "1", name: "FrameOfReferenceTransformationComment"},
    "30080010": {vr: "SQ", vm: "1", name: "MeasuredDoseReferenceSequence"},
    "30080012": {vr: "ST", vm: "1", name: "MeasuredDoseDescription"},
    "30080014": {vr: "CS", vm: "1", name: "MeasuredDoseType"},
    "30080016": {vr: "DS", vm: "1", name: "MeasuredDoseValue"},
    "30080020": {vr: "SQ", vm: "1", name: "TreatmentSessionBeamSequence"},
    "30080021": {vr: "SQ", vm: "1", name: "TreatmentSessionIonBeamSequence"},
    "30080022": {vr: "IS", vm: "1", name: "CurrentFractionNumber"},
    "30080024": {vr: "DA", vm: "1", name: "TreatmentControlPointDate"},
    "30080025": {vr: "TM", vm: "1", name: "TreatmentControlPointTime"},
    "3008002A": {vr: "CS", vm: "1", name: "TreatmentTerminationStatus"},
    "3008002B": {vr: "SH", vm: "1", name: "TreatmentTerminationCode"},
    "3008002C": {vr: "CS", vm: "1", name: "TreatmentVerificationStatus"},
    "30080030": {vr: "SQ", vm: "1", name: "ReferencedTreatmentRecordSequence"},
    "30080032": {vr: "DS", vm: "1", name: "SpecifiedPrimaryMeterset"},
    "30080033": {vr: "DS", vm: "1", name: "SpecifiedSecondaryMeterset"},
    "30080036": {vr: "DS", vm: "1", name: "DeliveredPrimaryMeterset"},
    "30080037": {vr: "DS", vm: "1", name: "DeliveredSecondaryMeterset"},
    "3008003A": {vr: "DS", vm: "1", name: "SpecifiedTreatmentTime"},
    "3008003B": {vr: "DS", vm: "1", name: "DeliveredTreatmentTime"},
    "30080040": {vr: "SQ", vm: "1", name: "ControlPointDeliverySequence"},
    "30080041": {vr: "SQ", vm: "1", name: "IonControlPointDeliverySequence"},
    "30080042": {vr: "DS", vm: "1", name: "SpecifiedMeterset"},
    "30080044": {vr: "DS", vm: "1", name: "DeliveredMeterset"},
    "30080045": {vr: "FL", vm: "1", name: "MetersetRateSet"},
    "30080046": {vr: "FL", vm: "1", name: "MetersetRateDelivered"},
    "30080047": {vr: "FL", vm: "1-n", name: "ScanSpotMetersetsDelivered"},
    "30080048": {vr: "DS", vm: "1", name: "DoseRateDelivered"},
    "30080050": {vr: "SQ", vm: "1", name: "TreatmentSummaryCalculatedDoseReferenceSequence"},
    "30080052": {vr: "DS", vm: "1", name: "CumulativeDoseToDoseReference"},
    "30080054": {vr: "DA", vm: "1", name: "FirstTreatmentDate"},
    "30080056": {vr: "DA", vm: "1", name: "MostRecentTreatmentDate"},
    "3008005A": {vr: "IS", vm: "1", name: "NumberOfFractionsDelivered"},
    "30080060": {vr: "SQ", vm: "1", name: "OverrideSequence"},
    "30080061": {vr: "AT", vm: "1", name: "ParameterSequencePointer"},
    "30080062": {vr: "AT", vm: "1", name: "OverrideParameterPointer"},
    "30080063": {vr: "IS", vm: "1", name: "ParameterItemIndex"},
    "30080064": {vr: "IS", vm: "1", name: "MeasuredDoseReferenceNumber"},
    "30080065": {vr: "AT", vm: "1", name: "ParameterPointer"},
    "30080066": {vr: "ST", vm: "1", name: "OverrideReason"},
    "30080068": {vr: "SQ", vm: "1", name: "CorrectedParameterSequence"},
    "3008006A": {vr: "FL", vm: "1", name: "CorrectionValue"},
    "30080070": {vr: "SQ", vm: "1", name: "CalculatedDoseReferenceSequence"},
    "30080072": {vr: "IS", vm: "1", name: "CalculatedDoseReferenceNumber"},
    "30080074": {vr: "ST", vm: "1", name: "CalculatedDoseReferenceDescription"},
    "30080076": {vr: "DS", vm: "1", name: "CalculatedDoseReferenceDoseValue"},
    "30080078": {vr: "DS", vm: "1", name: "StartMeterset"},
    "3008007A": {vr: "DS", vm: "1", name: "EndMeterset"},
    "30080080": {vr: "SQ", vm: "1", name: "ReferencedMeasuredDoseReferenceSequence"},
    "30080082": {vr: "IS", vm: "1", name: "ReferencedMeasuredDoseReferenceNumber"},
    "30080090": {vr: "SQ", vm: "1", name: "ReferencedCalculatedDoseReferenceSequence"},
    "30080092": {vr: "IS", vm: "1", name: "ReferencedCalculatedDoseReferenceNumber"},
    "300800A0": {vr: "SQ", vm: "1", name: "BeamLimitingDeviceLeafPairsSequence"},
    "300800B0": {vr: "SQ", vm: "1", name: "RecordedWedgeSequence"},
    "300800C0": {vr: "SQ", vm: "1", name: "RecordedCompensatorSequence"},
    "300800D0": {vr: "SQ", vm: "1", name: "RecordedBlockSequence"},
    "300800E0": {vr: "SQ", vm: "1", name: "TreatmentSummaryMeasuredDoseReferenceSequence"},
    "300800F0": {vr: "SQ", vm: "1", name: "RecordedSnoutSequence"},
    "300800F2": {vr: "SQ", vm: "1", name: "RecordedRangeShifterSequence"},
    "300800F4": {vr: "SQ", vm: "1", name: "RecordedLateralSpreadingDeviceSequence"},
    "300800F6": {vr: "SQ", vm: "1", name: "RecordedRangeModulatorSequence"},
    "30080100": {vr: "SQ", vm: "1", name: "RecordedSourceSequence"},
    "30080105": {vr: "LO", vm: "1", name: "SourceSerialNumber"},
    "30080110": {vr: "SQ", vm: "1", name: "TreatmentSessionApplicationSetupSequence"},
    "30080116": {vr: "CS", vm: "1", name: "ApplicationSetupCheck"},
    "30080120": {vr: "SQ", vm: "1", name: "RecordedBrachyAccessoryDeviceSequence"},
    "30080122": {vr: "IS", vm: "1", name: "ReferencedBrachyAccessoryDeviceNumber"},
    "30080130": {vr: "SQ", vm: "1", name: "RecordedChannelSequence"},
    "30080132": {vr: "DS", vm: "1", name: "SpecifiedChannelTotalTime"},
    "30080134": {vr: "DS", vm: "1", name: "DeliveredChannelTotalTime"},
    "30080136": {vr: "IS", vm: "1", name: "SpecifiedNumberOfPulses"},
    "30080138": {vr: "IS", vm: "1", name: "DeliveredNumberOfPulses"},
    "3008013A": {vr: "DS", vm: "1", name: "SpecifiedPulseRepetitionInterval"},
    "3008013C": {vr: "DS", vm: "1", name: "DeliveredPulseRepetitionInterval"},
    "30080140": {vr: "SQ", vm: "1", name: "RecordedSourceApplicatorSequence"},
    "30080142": {vr: "IS", vm: "1", name: "ReferencedSourceApplicatorNumber"},
    "30080150": {vr: "SQ", vm: "1", name: "RecordedChannelShieldSequence"},
    "30080152": {vr: "IS", vm: "1", name: "ReferencedChannelShieldNumber"},
    "30080160": {vr: "SQ", vm: "1", name: "BrachyControlPointDeliveredSequence"},
    "30080162": {vr: "DA", vm: "1", name: "SafePositionExitDate"},
    "30080164": {vr: "TM", vm: "1", name: "SafePositionExitTime"},
    "30080166": {vr: "DA", vm: "1", name: "SafePositionReturnDate"},
    "30080168": {vr: "TM", vm: "1", name: "SafePositionReturnTime"},
    "30080200": {vr: "CS", vm: "1", name: "CurrentTreatmentStatus"},
    "30080202": {vr: "ST", vm: "1", name: "TreatmentStatusComment"},
    "30080220": {vr: "SQ", vm: "1", name: "FractionGroupSummarySequence"},
    "30080223": {vr: "IS", vm: "1", name: "ReferencedFractionNumber"},
    "30080224": {vr: "CS", vm: "1", name: "FractionGroupType"},
    "30080230": {vr: "CS", vm: "1", name: "BeamStopperPosition"},
    "30080240": {vr: "SQ", vm: "1", name: "FractionStatusSummarySequence"},
    "30080250": {vr: "DA", vm: "1", name: "TreatmentDate"},
    "30080251": {vr: "TM", vm: "1", name: "TreatmentTime"},
    "300A0002": {vr: "SH", vm: "1", name: "RTPlanLabel"},
    "300A0003": {vr: "LO", vm: "1", name: "RTPlanName"},
    "300A0004": {vr: "ST", vm: "1", name: "RTPlanDescription"},
    "300A0006": {vr: "DA", vm: "1", name: "RTPlanDate"},
    "300A0007": {vr: "TM", vm: "1", name: "RTPlanTime"},
    "300A0009": {vr: "LO", vm: "1-n", name: "TreatmentProtocols"},
    "300A000A": {vr: "CS", vm: "1", name: "PlanIntent"},
    "300A000B": {vr: "LO", vm: "1-n", name: "TreatmentSites"},
    "300A000C": {vr: "CS", vm: "1", name: "RTPlanGeometry"},
    "300A000E": {vr: "ST", vm: "1", name: "PrescriptionDescription"},
    "300A0010": {vr: "SQ", vm: "1", name: "DoseReferenceSequence"},
    "300A0012": {vr: "IS", vm: "1", name: "DoseReferenceNumber"},
    "300A0013": {vr: "UI", vm: "1", name: "DoseReferenceUID"},
    "300A0014": {vr: "CS", vm: "1", name: "DoseReferenceStructureType"},
    "300A0015": {vr: "CS", vm: "1", name: "NominalBeamEnergyUnit"},
    "300A0016": {vr: "LO", vm: "1", name: "DoseReferenceDescription"},
    "300A0018": {vr: "DS", vm: "3", name: "DoseReferencePointCoordinates"},
    "300A001A": {vr: "DS", vm: "1", name: "NominalPriorDose"},
    "300A0020": {vr: "CS", vm: "1", name: "DoseReferenceType"},
    "300A0021": {vr: "DS", vm: "1", name: "ConstraintWeight"},
    "300A0022": {vr: "DS", vm: "1", name: "DeliveryWarningDose"},
    "300A0023": {vr: "DS", vm: "1", name: "DeliveryMaximumDose"},
    "300A0025": {vr: "DS", vm: "1", name: "TargetMinimumDose"},
    "300A0026": {vr: "DS", vm: "1", name: "TargetPrescriptionDose"},
    "300A0027": {vr: "DS", vm: "1", name: "TargetMaximumDose"},
    "300A0028": {vr: "DS", vm: "1", name: "TargetUnderdoseVolumeFraction"},
    "300A002A": {vr: "DS", vm: "1", name: "OrganAtRiskFullVolumeDose"},
    "300A002B": {vr: "DS", vm: "1", name: "OrganAtRiskLimitDose"},
    "300A002C": {vr: "DS", vm: "1", name: "OrganAtRiskMaximumDose"},
    "300A002D": {vr: "DS", vm: "1", name: "OrganAtRiskOverdoseVolumeFraction"},
    "300A0040": {vr: "SQ", vm: "1", name: "ToleranceTableSequence"},
    "300A0042": {vr: "IS", vm: "1", name: "ToleranceTableNumber"},
    "300A0043": {vr: "SH", vm: "1", name: "ToleranceTableLabel"},
    "300A0044": {vr: "DS", vm: "1", name: "GantryAngleTolerance"},
    "300A0046": {vr: "DS", vm: "1", name: "BeamLimitingDeviceAngleTolerance"},
    "300A0048": {vr: "SQ", vm: "1", name: "BeamLimitingDeviceToleranceSequence"},
    "300A004A": {vr: "DS", vm: "1", name: "BeamLimitingDevicePositionTolerance"},
    "300A004B": {vr: "FL", vm: "1", name: "SnoutPositionTolerance"},
    "300A004C": {vr: "DS", vm: "1", name: "PatientSupportAngleTolerance"},
    "300A004E": {vr: "DS", vm: "1", name: "TableTopEccentricAngleTolerance"},
    "300A004F": {vr: "FL", vm: "1", name: "TableTopPitchAngleTolerance"},
    "300A0050": {vr: "FL", vm: "1", name: "TableTopRollAngleTolerance"},
    "300A0051": {vr: "DS", vm: "1", name: "TableTopVerticalPositionTolerance"},
    "300A0052": {vr: "DS", vm: "1", name: "TableTopLongitudinalPositionTolerance"},
    "300A0053": {vr: "DS", vm: "1", name: "TableTopLateralPositionTolerance"},
    "300A0055": {vr: "CS", vm: "1", name: "RTPlanRelationship"},
    "300A0070": {vr: "SQ", vm: "1", name: "FractionGroupSequence"},
    "300A0071": {vr: "IS", vm: "1", name: "FractionGroupNumber"},
    "300A0072": {vr: "LO", vm: "1", name: "FractionGroupDescription"},
    "300A0078": {vr: "IS", vm: "1", name: "NumberOfFractionsPlanned"},
    "300A0079": {vr: "IS", vm: "1", name: "NumberOfFractionPatternDigitsPerDay"},
    "300A007A": {vr: "IS", vm: "1", name: "RepeatFractionCycleLength"},
    "300A007B": {vr: "LT", vm: "1", name: "FractionPattern"},
    "300A0080": {vr: "IS", vm: "1", name: "NumberOfBeams"},
    "300A0082": {vr: "DS", vm: "3", name: "BeamDoseSpecificationPoint"},
    "300A0084": {vr: "DS", vm: "1", name: "BeamDose"},
    "300A0086": {vr: "DS", vm: "1", name: "BeamMeterset"},
    "300A0088": {vr: "FL", vm: "1", name: "BeamDosePointDepth"},
    "300A0089": {vr: "FL", vm: "1", name: "BeamDosePointEquivalentDepth"},
    "300A008A": {vr: "FL", vm: "1", name: "BeamDosePointSSD"},
    "300A00A0": {vr: "IS", vm: "1", name: "NumberOfBrachyApplicationSetups"},
    "300A00A2": {vr: "DS", vm: "3", name: "BrachyApplicationSetupDoseSpecificationPoint"},
    "300A00A4": {vr: "DS", vm: "1", name: "BrachyApplicationSetupDose"},
    "300A00B0": {vr: "SQ", vm: "1", name: "BeamSequence"},
    "300A00B2": {vr: "SH", vm: "1", name: "TreatmentMachineName"},
    "300A00B3": {vr: "CS", vm: "1", name: "PrimaryDosimeterUnit"},
    "300A00B4": {vr: "DS", vm: "1", name: "SourceAxisDistance"},
    "300A00B6": {vr: "SQ", vm: "1", name: "BeamLimitingDeviceSequence"},
    "300A00B8": {vr: "CS", vm: "1", name: "RTBeamLimitingDeviceType"},
    "300A00BA": {vr: "DS", vm: "1", name: "SourceToBeamLimitingDeviceDistance"},
    "300A00BB": {vr: "FL", vm: "1", name: "IsocenterToBeamLimitingDeviceDistance"},
    "300A00BC": {vr: "IS", vm: "1", name: "NumberOfLeafJawPairs"},
    "300A00BE": {vr: "DS", vm: "3-n", name: "LeafPositionBoundaries"},
    "300A00C0": {vr: "IS", vm: "1", name: "BeamNumber"},
    "300A00C2": {vr: "LO", vm: "1", name: "BeamName"},
    "300A00C3": {vr: "ST", vm: "1", name: "BeamDescription"},
    "300A00C4": {vr: "CS", vm: "1", name: "BeamType"},
    "300A00C6": {vr: "CS", vm: "1", name: "RadiationType"},
    "300A00C7": {vr: "CS", vm: "1", name: "HighDoseTechniqueType"},
    "300A00C8": {vr: "IS", vm: "1", name: "ReferenceImageNumber"},
    "300A00CA": {vr: "SQ", vm: "1", name: "PlannedVerificationImageSequence"},
    "300A00CC": {vr: "LO", vm: "1-n", name: "ImagingDeviceSpecificAcquisitionParameters"},
    "300A00CE": {vr: "CS", vm: "1", name: "TreatmentDeliveryType"},
    "300A00D0": {vr: "IS", vm: "1", name: "NumberOfWedges"},
    "300A00D1": {vr: "SQ", vm: "1", name: "WedgeSequence"},
    "300A00D2": {vr: "IS", vm: "1", name: "WedgeNumber"},
    "300A00D3": {vr: "CS", vm: "1", name: "WedgeType"},
    "300A00D4": {vr: "SH", vm: "1", name: "WedgeID"},
    "300A00D5": {vr: "IS", vm: "1", name: "WedgeAngle"},
    "300A00D6": {vr: "DS", vm: "1", name: "WedgeFactor"},
    "300A00D7": {vr: "FL", vm: "1", name: "TotalWedgeTrayWaterEquivalentThickness"},
    "300A00D8": {vr: "DS", vm: "1", name: "WedgeOrientation"},
    "300A00D9": {vr: "FL", vm: "1", name: "IsocenterToWedgeTrayDistance"},
    "300A00DA": {vr: "DS", vm: "1", name: "SourceToWedgeTrayDistance"},
    "300A00DB": {vr: "FL", vm: "1", name: "WedgeThinEdgePosition"},
    "300A00DC": {vr: "SH", vm: "1", name: "BolusID"},
    "300A00DD": {vr: "ST", vm: "1", name: "BolusDescription"},
    "300A00E0": {vr: "IS", vm: "1", name: "NumberOfCompensators"},
    "300A00E1": {vr: "SH", vm: "1", name: "MaterialID"},
    "300A00E2": {vr: "DS", vm: "1", name: "TotalCompensatorTrayFactor"},
    "300A00E3": {vr: "SQ", vm: "1", name: "CompensatorSequence"},
    "300A00E4": {vr: "IS", vm: "1", name: "CompensatorNumber"},
    "300A00E5": {vr: "SH", vm: "1", name: "CompensatorID"},
    "300A00E6": {vr: "DS", vm: "1", name: "SourceToCompensatorTrayDistance"},
    "300A00E7": {vr: "IS", vm: "1", name: "CompensatorRows"},
    "300A00E8": {vr: "IS", vm: "1", name: "CompensatorColumns"},
    "300A00E9": {vr: "DS", vm: "2", name: "CompensatorPixelSpacing"},
    "300A00EA": {vr: "DS", vm: "2", name: "CompensatorPosition"},
    "300A00EB": {vr: "DS", vm: "1-n", name: "CompensatorTransmissionData"},
    "300A00EC": {vr: "DS", vm: "1-n", name: "CompensatorThicknessData"},
    "300A00ED": {vr: "IS", vm: "1", name: "NumberOfBoli"},
    "300A00EE": {vr: "CS", vm: "1", name: "CompensatorType"},
    "300A00F0": {vr: "IS", vm: "1", name: "NumberOfBlocks"},
    "300A00F2": {vr: "DS", vm: "1", name: "TotalBlockTrayFactor"},
    "300A00F3": {vr: "FL", vm: "1", name: "TotalBlockTrayWaterEquivalentThickness"},
    "300A00F4": {vr: "SQ", vm: "1", name: "BlockSequence"},
    "300A00F5": {vr: "SH", vm: "1", name: "BlockTrayID"},
    "300A00F6": {vr: "DS", vm: "1", name: "SourceToBlockTrayDistance"},
    "300A00F7": {vr: "FL", vm: "1", name: "IsocenterToBlockTrayDistance"},
    "300A00F8": {vr: "CS", vm: "1", name: "BlockType"},
    "300A00F9": {vr: "LO", vm: "1", name: "AccessoryCode"},
    "300A00FA": {vr: "CS", vm: "1", name: "BlockDivergence"},
    "300A00FB": {vr: "CS", vm: "1", name: "BlockMountingPosition"},
    "300A00FC": {vr: "IS", vm: "1", name: "BlockNumber"},
    "300A00FE": {vr: "LO", vm: "1", name: "BlockName"},
    "300A0100": {vr: "DS", vm: "1", name: "BlockThickness"},
    "300A0102": {vr: "DS", vm: "1", name: "BlockTransmission"},
    "300A0104": {vr: "IS", vm: "1", name: "BlockNumberOfPoints"},
    "300A0106": {vr: "DS", vm: "2-2n", name: "BlockData"},
    "300A0107": {vr: "SQ", vm: "1", name: "ApplicatorSequence"},
    "300A0108": {vr: "SH", vm: "1", name: "ApplicatorID"},
    "300A0109": {vr: "CS", vm: "1", name: "ApplicatorType"},
    "300A010A": {vr: "LO", vm: "1", name: "ApplicatorDescription"},
    "300A010C": {vr: "DS", vm: "1", name: "CumulativeDoseReferenceCoefficient"},
    "300A010E": {vr: "DS", vm: "1", name: "FinalCumulativeMetersetWeight"},
    "300A0110": {vr: "IS", vm: "1", name: "NumberOfControlPoints"},
    "300A0111": {vr: "SQ", vm: "1", name: "ControlPointSequence"},
    "300A0112": {vr: "IS", vm: "1", name: "ControlPointIndex"},
    "300A0114": {vr: "DS", vm: "1", name: "NominalBeamEnergy"},
    "300A0115": {vr: "DS", vm: "1", name: "DoseRateSet"},
    "300A0116": {vr: "SQ", vm: "1", name: "WedgePositionSequence"},
    "300A0118": {vr: "CS", vm: "1", name: "WedgePosition"},
    "300A011A": {vr: "SQ", vm: "1", name: "BeamLimitingDevicePositionSequence"},
    "300A011C": {vr: "DS", vm: "2-2n", name: "LeafJawPositions"},
    "300A011E": {vr: "DS", vm: "1", name: "GantryAngle"},
    "300A011F": {vr: "CS", vm: "1", name: "GantryRotationDirection"},
    "300A0120": {vr: "DS", vm: "1", name: "BeamLimitingDeviceAngle"},
    "300A0121": {vr: "CS", vm: "1", name: "BeamLimitingDeviceRotationDirection"},
    "300A0122": {vr: "DS", vm: "1", name: "PatientSupportAngle"},
    "300A0123": {vr: "CS", vm: "1", name: "PatientSupportRotationDirection"},
    "300A0124": {vr: "DS", vm: "1", name: "TableTopEccentricAxisDistance"},
    "300A0125": {vr: "DS", vm: "1", name: "TableTopEccentricAngle"},
    "300A0126": {vr: "CS", vm: "1", name: "TableTopEccentricRotationDirection"},
    "300A0128": {vr: "DS", vm: "1", name: "TableTopVerticalPosition"},
    "300A0129": {vr: "DS", vm: "1", name: "TableTopLongitudinalPosition"},
    "300A012A": {vr: "DS", vm: "1", name: "TableTopLateralPosition"},
    "300A012C": {vr: "DS", vm: "3", name: "IsocenterPosition"},
    "300A012E": {vr: "DS", vm: "3", name: "SurfaceEntryPoint"},
    "300A0130": {vr: "DS", vm: "1", name: "SourceToSurfaceDistance"},
    "300A0134": {vr: "DS", vm: "1", name: "CumulativeMetersetWeight"},
    "300A0140": {vr: "FL", vm: "1", name: "TableTopPitchAngle"},
    "300A0142": {vr: "CS", vm: "1", name: "TableTopPitchRotationDirection"},
    "300A0144": {vr: "FL", vm: "1", name: "TableTopRollAngle"},
    "300A0146": {vr: "CS", vm: "1", name: "TableTopRollRotationDirection"},
    "300A0148": {vr: "FL", vm: "1", name: "HeadFixationAngle"},
    "300A014A": {vr: "FL", vm: "1", name: "GantryPitchAngle"},
    "300A014C": {vr: "CS", vm: "1", name: "GantryPitchRotationDirection"},
    "300A014E": {vr: "FL", vm: "1", name: "GantryPitchAngleTolerance"},
    "300A0180": {vr: "SQ", vm: "1", name: "PatientSetupSequence"},
    "300A0182": {vr: "IS", vm: "1", name: "PatientSetupNumber"},
    "300A0183": {vr: "LO", vm: "1", name: "PatientSetupLabel"},
    "300A0184": {vr: "LO", vm: "1", name: "PatientAdditionalPosition"},
    "300A0190": {vr: "SQ", vm: "1", name: "FixationDeviceSequence"},
    "300A0192": {vr: "CS", vm: "1", name: "FixationDeviceType"},
    "300A0194": {vr: "SH", vm: "1", name: "FixationDeviceLabel"},
    "300A0196": {vr: "ST", vm: "1", name: "FixationDeviceDescription"},
    "300A0198": {vr: "SH", vm: "1", name: "FixationDevicePosition"},
    "300A0199": {vr: "FL", vm: "1", name: "FixationDevicePitchAngle"},
    "300A019A": {vr: "FL", vm: "1", name: "FixationDeviceRollAngle"},
    "300A01A0": {vr: "SQ", vm: "1", name: "ShieldingDeviceSequence"},
    "300A01A2": {vr: "CS", vm: "1", name: "ShieldingDeviceType"},
    "300A01A4": {vr: "SH", vm: "1", name: "ShieldingDeviceLabel"},
    "300A01A6": {vr: "ST", vm: "1", name: "ShieldingDeviceDescription"},
    "300A01A8": {vr: "SH", vm: "1", name: "ShieldingDevicePosition"},
    "300A01B0": {vr: "CS", vm: "1", name: "SetupTechnique"},
    "300A01B2": {vr: "ST", vm: "1", name: "SetupTechniqueDescription"},
    "300A01B4": {vr: "SQ", vm: "1", name: "SetupDeviceSequence"},
    "300A01B6": {vr: "CS", vm: "1", name: "SetupDeviceType"},
    "300A01B8": {vr: "SH", vm: "1", name: "SetupDeviceLabel"},
    "300A01BA": {vr: "ST", vm: "1", name: "SetupDeviceDescription"},
    "300A01BC": {vr: "DS", vm: "1", name: "SetupDeviceParameter"},
    "300A01D0": {vr: "ST", vm: "1", name: "SetupReferenceDescription"},
    "300A01D2": {vr: "DS", vm: "1", name: "TableTopVerticalSetupDisplacement"},
    "300A01D4": {vr: "DS", vm: "1", name: "TableTopLongitudinalSetupDisplacement"},
    "300A01D6": {vr: "DS", vm: "1", name: "TableTopLateralSetupDisplacement"},
    "300A0200": {vr: "CS", vm: "1", name: "BrachyTreatmentTechnique"},
    "300A0202": {vr: "CS", vm: "1", name: "BrachyTreatmentType"},
    "300A0206": {vr: "SQ", vm: "1", name: "TreatmentMachineSequence"},
    "300A0210": {vr: "SQ", vm: "1", name: "SourceSequence"},
    "300A0212": {vr: "IS", vm: "1", name: "SourceNumber"},
    "300A0214": {vr: "CS", vm: "1", name: "SourceType"},
    "300A0216": {vr: "LO", vm: "1", name: "SourceManufacturer"},
    "300A0218": {vr: "DS", vm: "1", name: "ActiveSourceDiameter"},
    "300A021A": {vr: "DS", vm: "1", name: "ActiveSourceLength"},
    "300A0222": {vr: "DS", vm: "1", name: "SourceEncapsulationNominalThickness"},
    "300A0224": {vr: "DS", vm: "1", name: "SourceEncapsulationNominalTransmission"},
    "300A0226": {vr: "LO", vm: "1", name: "SourceIsotopeName"},
    "300A0228": {vr: "DS", vm: "1", name: "SourceIsotopeHalfLife"},
    "300A0229": {vr: "CS", vm: "1", name: "SourceStrengthUnits"},
    "300A022A": {vr: "DS", vm: "1", name: "ReferenceAirKermaRate"},
    "300A022B": {vr: "DS", vm: "1", name: "SourceStrength"},
    "300A022C": {vr: "DA", vm: "1", name: "SourceStrengthReferenceDate"},
    "300A022E": {vr: "TM", vm: "1", name: "SourceStrengthReferenceTime"},
    "300A0230": {vr: "SQ", vm: "1", name: "ApplicationSetupSequence"},
    "300A0232": {vr: "CS", vm: "1", name: "ApplicationSetupType"},
    "300A0234": {vr: "IS", vm: "1", name: "ApplicationSetupNumber"},
    "300A0236": {vr: "LO", vm: "1", name: "ApplicationSetupName"},
    "300A0238": {vr: "LO", vm: "1", name: "ApplicationSetupManufacturer"},
    "300A0240": {vr: "IS", vm: "1", name: "TemplateNumber"},
    "300A0242": {vr: "SH", vm: "1", name: "TemplateType"},
    "300A0244": {vr: "LO", vm: "1", name: "TemplateName"},
    "300A0250": {vr: "DS", vm: "1", name: "TotalReferenceAirKerma"},
    "300A0260": {vr: "SQ", vm: "1", name: "BrachyAccessoryDeviceSequence"},
    "300A0262": {vr: "IS", vm: "1", name: "BrachyAccessoryDeviceNumber"},
    "300A0263": {vr: "SH", vm: "1", name: "BrachyAccessoryDeviceID"},
    "300A0264": {vr: "CS", vm: "1", name: "BrachyAccessoryDeviceType"},
    "300A0266": {vr: "LO", vm: "1", name: "BrachyAccessoryDeviceName"},
    "300A026A": {vr: "DS", vm: "1", name: "BrachyAccessoryDeviceNominalThickness"},
    "300A026C": {vr: "DS", vm: "1", name: "BrachyAccessoryDeviceNominalTransmission"},
    "300A0280": {vr: "SQ", vm: "1", name: "ChannelSequence"},
    "300A0282": {vr: "IS", vm: "1", name: "ChannelNumber"},
    "300A0284": {vr: "DS", vm: "1", name: "ChannelLength"},
    "300A0286": {vr: "DS", vm: "1", name: "ChannelTotalTime"},
    "300A0288": {vr: "CS", vm: "1", name: "SourceMovementType"},
    "300A028A": {vr: "IS", vm: "1", name: "NumberOfPulses"},
    "300A028C": {vr: "DS", vm: "1", name: "PulseRepetitionInterval"},
    "300A0290": {vr: "IS", vm: "1", name: "SourceApplicatorNumber"},
    "300A0291": {vr: "SH", vm: "1", name: "SourceApplicatorID"},
    "300A0292": {vr: "CS", vm: "1", name: "SourceApplicatorType"},
    "300A0294": {vr: "LO", vm: "1", name: "SourceApplicatorName"},
    "300A0296": {vr: "DS", vm: "1", name: "SourceApplicatorLength"},
    "300A0298": {vr: "LO", vm: "1", name: "SourceApplicatorManufacturer"},
    "300A029C": {vr: "DS", vm: "1", name: "SourceApplicatorWallNominalThickness"},
    "300A029E": {vr: "DS", vm: "1", name: "SourceApplicatorWallNominalTransmission"},
    "300A02A0": {vr: "DS", vm: "1", name: "SourceApplicatorStepSize"},
    "300A02A2": {vr: "IS", vm: "1", name: "TransferTubeNumber"},
    "300A02A4": {vr: "DS", vm: "1", name: "TransferTubeLength"},
    "300A02B0": {vr: "SQ", vm: "1", name: "ChannelShieldSequence"},
    "300A02B2": {vr: "IS", vm: "1", name: "ChannelShieldNumber"},
    "300A02B3": {vr: "SH", vm: "1", name: "ChannelShieldID"},
    "300A02B4": {vr: "LO", vm: "1", name: "ChannelShieldName"},
    "300A02B8": {vr: "DS", vm: "1", name: "ChannelShieldNominalThickness"},
    "300A02BA": {vr: "DS", vm: "1", name: "ChannelShieldNominalTransmission"},
    "300A02C8": {vr: "DS", vm: "1", name: "FinalCumulativeTimeWeight"},
    "300A02D0": {vr: "SQ", vm: "1", name: "BrachyControlPointSequence"},
    "300A02D2": {vr: "DS", vm: "1", name: "ControlPointRelativePosition"},
    "300A02D4": {vr: "DS", vm: "3", name: "ControlPoint3DPosition"},
    "300A02D6": {vr: "DS", vm: "1", name: "CumulativeTimeWeight"},
    "300A02E0": {vr: "CS", vm: "1", name: "CompensatorDivergence"},
    "300A02E1": {vr: "CS", vm: "1", name: "CompensatorMountingPosition"},
    "300A02E2": {vr: "DS", vm: "1-n", name: "SourceToCompensatorDistance"},
    "300A02E3": {vr: "FL", vm: "1", name: "TotalCompensatorTrayWaterEquivalentThickness"},
    "300A02E4": {vr: "FL", vm: "1", name: "IsocenterToCompensatorTrayDistance"},
    "300A02E5": {vr: "FL", vm: "1", name: "CompensatorColumnOffset"},
    "300A02E6": {vr: "FL", vm: "1-n", name: "IsocenterToCompensatorDistances"},
    "300A02E7": {vr: "FL", vm: "1", name: "CompensatorRelativeStoppingPowerRatio"},
    "300A02E8": {vr: "FL", vm: "1", name: "CompensatorMillingToolDiameter"},
    "300A02EA": {vr: "SQ", vm: "1", name: "IonRangeCompensatorSequence"},
    "300A02EB": {vr: "LT", vm: "1", name: "CompensatorDescription"},
    "300A0302": {vr: "IS", vm: "1", name: "RadiationMassNumber"},
    "300A0304": {vr: "IS", vm: "1", name: "RadiationAtomicNumber"},
    "300A0306": {vr: "SS", vm: "1", name: "RadiationChargeState"},
    "300A0308": {vr: "CS", vm: "1", name: "ScanMode"},
    "300A030A": {vr: "FL", vm: "2", name: "VirtualSourceAxisDistances"},
    "300A030C": {vr: "SQ", vm: "1", name: "SnoutSequence"},
    "300A030D": {vr: "FL", vm: "1", name: "SnoutPosition"},
    "300A030F": {vr: "SH", vm: "1", name: "SnoutID"},
    "300A0312": {vr: "IS", vm: "1", name: "NumberOfRangeShifters"},
    "300A0314": {vr: "SQ", vm: "1", name: "RangeShifterSequence"},
    "300A0316": {vr: "IS", vm: "1", name: "RangeShifterNumber"},
    "300A0318": {vr: "SH", vm: "1", name: "RangeShifterID"},
    "300A0320": {vr: "CS", vm: "1", name: "RangeShifterType"},
    "300A0322": {vr: "LO", vm: "1", name: "RangeShifterDescription"},
    "300A0330": {vr: "IS", vm: "1", name: "NumberOfLateralSpreadingDevices"},
    "300A0332": {vr: "SQ", vm: "1", name: "LateralSpreadingDeviceSequence"},
    "300A0334": {vr: "IS", vm: "1", name: "LateralSpreadingDeviceNumber"},
    "300A0336": {vr: "SH", vm: "1", name: "LateralSpreadingDeviceID"},
    "300A0338": {vr: "CS", vm: "1", name: "LateralSpreadingDeviceType"},
    "300A033A": {vr: "LO", vm: "1", name: "LateralSpreadingDeviceDescription"},
    "300A033C": {vr: "FL", vm: "1", name: "LateralSpreadingDeviceWaterEquivalentThickness"},
    "300A0340": {vr: "IS", vm: "1", name: "NumberOfRangeModulators"},
    "300A0342": {vr: "SQ", vm: "1", name: "RangeModulatorSequence"},
    "300A0344": {vr: "IS", vm: "1", name: "RangeModulatorNumber"},
    "300A0346": {vr: "SH", vm: "1", name: "RangeModulatorID"},
    "300A0348": {vr: "CS", vm: "1", name: "RangeModulatorType"},
    "300A034A": {vr: "LO", vm: "1", name: "RangeModulatorDescription"},
    "300A034C": {vr: "SH", vm: "1", name: "BeamCurrentModulationID"},
    "300A0350": {vr: "CS", vm: "1", name: "PatientSupportType"},
    "300A0352": {vr: "SH", vm: "1", name: "PatientSupportID"},
    "300A0354": {vr: "LO", vm: "1", name: "PatientSupportAccessoryCode"},
    "300A0356": {vr: "FL", vm: "1", name: "FixationLightAzimuthalAngle"},
    "300A0358": {vr: "FL", vm: "1", name: "FixationLightPolarAngle"},
    "300A035A": {vr: "FL", vm: "1", name: "MetersetRate"},
    "300A0360": {vr: "SQ", vm: "1", name: "RangeShifterSettingsSequence"},
    "300A0362": {vr: "LO", vm: "1", name: "RangeShifterSetting"},
    "300A0364": {vr: "FL", vm: "1", name: "IsocenterToRangeShifterDistance"},
    "300A0366": {vr: "FL", vm: "1", name: "RangeShifterWaterEquivalentThickness"},
    "300A0370": {vr: "SQ", vm: "1", name: "LateralSpreadingDeviceSettingsSequence"},
    "300A0372": {vr: "LO", vm: "1", name: "LateralSpreadingDeviceSetting"},
    "300A0374": {vr: "FL", vm: "1", name: "IsocenterToLateralSpreadingDeviceDistance"},
    "300A0380": {vr: "SQ", vm: "1", name: "RangeModulatorSettingsSequence"},
    "300A0382": {vr: "FL", vm: "1", name: "RangeModulatorGatingStartValue"},
    "300A0384": {vr: "FL", vm: "1", name: "RangeModulatorGatingStopValue"},
    "300A0386": {vr: "FL", vm: "1", name: "RangeModulatorGatingStartWaterEquivalentThickness"},
    "300A0388": {vr: "FL", vm: "1", name: "RangeModulatorGatingStopWaterEquivalentThickness"},
    "300A038A": {vr: "FL", vm: "1", name: "IsocenterToRangeModulatorDistance"},
    "300A0390": {vr: "SH", vm: "1", name: "ScanSpotTuneID"},
    "300A0392": {vr: "IS", vm: "1", name: "NumberOfScanSpotPositions"},
    "300A0394": {vr: "FL", vm: "1-n", name: "ScanSpotPositionMap"},
    "300A0396": {vr: "FL", vm: "1-n", name: "ScanSpotMetersetWeights"},
    "300A0398": {vr: "FL", vm: "2", name: "ScanningSpotSize"},
    "300A039A": {vr: "IS", vm: "1", name: "NumberOfPaintings"},
    "300A03A0": {vr: "SQ", vm: "1", name: "IonToleranceTableSequence"},
    "300A03A2": {vr: "SQ", vm: "1", name: "IonBeamSequence"},
    "300A03A4": {vr: "SQ", vm: "1", name: "IonBeamLimitingDeviceSequence"},
    "300A03A6": {vr: "SQ", vm: "1", name: "IonBlockSequence"},
    "300A03A8": {vr: "SQ", vm: "1", name: "IonControlPointSequence"},
    "300A03AA": {vr: "SQ", vm: "1", name: "IonWedgeSequence"},
    "300A03AC": {vr: "SQ", vm: "1", name: "IonWedgePositionSequence"},
    "300A0401": {vr: "SQ", vm: "1", name: "ReferencedSetupImageSequence"},
    "300A0402": {vr: "ST", vm: "1", name: "SetupImageComment"},
    "300A0410": {vr: "SQ", vm: "1", name: "MotionSynchronizationSequence"},
    "300A0412": {vr: "FL", vm: "3", name: "ControlPointOrientation"},
    "300A0420": {vr: "SQ", vm: "1", name: "GeneralAccessorySequence"},
    "300A0421": {vr: "SH", vm: "1", name: "GeneralAccessoryID"},
    "300A0422": {vr: "ST", vm: "1", name: "GeneralAccessoryDescription"},
    "300A0423": {vr: "CS", vm: "1", name: "GeneralAccessoryType"},
    "300A0424": {vr: "IS", vm: "1", name: "GeneralAccessoryNumber"},
    "300A0431": {vr: "SQ", vm: "1", name: "ApplicatorGeometrySequence"},
    "300A0432": {vr: "CS", vm: "1", name: "ApplicatorApertureShape"},
    "300A0433": {vr: "FL", vm: "1", name: "ApplicatorOpening"},
    "300A0434": {vr: "FL", vm: "1", name: "ApplicatorOpeningX"},
    "300A0435": {vr: "FL", vm: "1", name: "ApplicatorOpeningY"},
    "300A0436": {vr: "FL", vm: "1", name: "SourceToApplicatorMountingPositionDistance"},
    "300C0002": {vr: "SQ", vm: "1", name: "ReferencedRTPlanSequence"},
    "300C0004": {vr: "SQ", vm: "1", name: "ReferencedBeamSequence"},
    "300C0006": {vr: "IS", vm: "1", name: "ReferencedBeamNumber"},
    "300C0007": {vr: "IS", vm: "1", name: "ReferencedReferenceImageNumber"},
    "300C0008": {vr: "DS", vm: "1", name: "StartCumulativeMetersetWeight"},
    "300C0009": {vr: "DS", vm: "1", name: "EndCumulativeMetersetWeight"},
    "300C000A": {vr: "SQ", vm: "1", name: "ReferencedBrachyApplicationSetupSequence"},
    "300C000C": {vr: "IS", vm: "1", name: "ReferencedBrachyApplicationSetupNumber"},
    "300C000E": {vr: "IS", vm: "1", name: "ReferencedSourceNumber"},
    "300C0020": {vr: "SQ", vm: "1", name: "ReferencedFractionGroupSequence"},
    "300C0022": {vr: "IS", vm: "1", name: "ReferencedFractionGroupNumber"},
    "300C0040": {vr: "SQ", vm: "1", name: "ReferencedVerificationImageSequence"},
    "300C0042": {vr: "SQ", vm: "1", name: "ReferencedReferenceImageSequence"},
    "300C0050": {vr: "SQ", vm: "1", name: "ReferencedDoseReferenceSequence"},
    "300C0051": {vr: "IS", vm: "1", name: "ReferencedDoseReferenceNumber"},
    "300C0055": {vr: "SQ", vm: "1", name: "BrachyReferencedDoseReferenceSequence"},
    "300C0060": {vr: "SQ", vm: "1", name: "ReferencedStructureSetSequence"},
    "300C006A": {vr: "IS", vm: "1", name: "ReferencedPatientSetupNumber"},
    "300C0080": {vr: "SQ", vm: "1", name: "ReferencedDoseSequence"},
    "300C00A0": {vr: "IS", vm: "1", name: "ReferencedToleranceTableNumber"},
    "300C00B0": {vr: "SQ", vm: "1", name: "ReferencedBolusSequence"},
    "300C00C0": {vr: "IS", vm: "1", name: "ReferencedWedgeNumber"},
    "300C00D0": {vr: "IS", vm: "1", name: "ReferencedCompensatorNumber"},
    "300C00E0": {vr: "IS", vm: "1", name: "ReferencedBlockNumber"},
    "300C00F0": {vr: "IS", vm: "1", name: "ReferencedControlPointIndex"},
    "300C00F2": {vr: "SQ", vm: "1", name: "ReferencedControlPointSequence"},
    "300C00F4": {vr: "IS", vm: "1", name: "ReferencedStartControlPointIndex"},
    "300C00F6": {vr: "IS", vm: "1", name: "ReferencedStopControlPointIndex"},
    "300C0100": {vr: "IS", vm: "1", name: "ReferencedRangeShifterNumber"},
    "300C0102": {vr: "IS", vm: "1", name: "ReferencedLateralSpreadingDeviceNumber"},
    "300C0104": {vr: "IS", vm: "1", name: "ReferencedRangeModulatorNumber"},
    "300E0002": {vr: "CS", vm: "1", name: "ApprovalStatus"},
    "300E0004": {vr: "DA", vm: "1", name: "ReviewDate"},
    "300E0005": {vr: "TM", vm: "1", name: "ReviewTime"},
    "300E0008": {vr: "PN", vm: "1", name: "ReviewerName"},
    "40000010": {vr: "LT", vm: "1", name: "Arbitrary"},
    "40004000": {vr: "LT", vm: "1", name: "TextComments"},
    "40080040": {vr: "SH", vm: "1", name: "ResultsID"},
    "40080042": {vr: "LO", vm: "1", name: "ResultsIDIssuer"},
    "40080050": {vr: "SQ", vm: "1", name: "ReferencedInterpretationSequence"},
    "400800FF": {vr: "CS", vm: "1", name: "ReportProductionStatusTrial"},
    "40080100": {vr: "DA", vm: "1", name: "InterpretationRecordedDate"},
    "40080101": {vr: "TM", vm: "1", name: "InterpretationRecordedTime"},
    "40080102": {vr: "PN", vm: "1", name: "InterpretationRecorder"},
    "40080103": {vr: "LO", vm: "1", name: "ReferenceToRecordedSound"},
    "40080108": {vr: "DA", vm: "1", name: "InterpretationTranscriptionDate"},
    "40080109": {vr: "TM", vm: "1", name: "InterpretationTranscriptionTime"},
    "4008010A": {vr: "PN", vm: "1", name: "InterpretationTranscriber"},
    "4008010B": {vr: "ST", vm: "1", name: "InterpretationText"},
    "4008010C": {vr: "PN", vm: "1", name: "InterpretationAuthor"},
    "40080111": {vr: "SQ", vm: "1", name: "InterpretationApproverSequence"},
    "40080112": {vr: "DA", vm: "1", name: "InterpretationApprovalDate"},
    "40080113": {vr: "TM", vm: "1", name: "InterpretationApprovalTime"},
    "40080114": {vr: "PN", vm: "1", name: "PhysicianApprovingInterpretation"},
    "40080115": {vr: "LT", vm: "1", name: "InterpretationDiagnosisDescription"},
    "40080117": {vr: "SQ", vm: "1", name: "InterpretationDiagnosisCodeSequence"},
    "40080118": {vr: "SQ", vm: "1", name: "ResultsDistributionListSequence"},
    "40080119": {vr: "PN", vm: "1", name: "DistributionName"},
    "4008011A": {vr: "LO", vm: "1", name: "DistributionAddress"},
    "40080200": {vr: "SH", vm: "1", name: "InterpretationID"},
    "40080202": {vr: "LO", vm: "1", name: "InterpretationIDIssuer"},
    "40080210": {vr: "CS", vm: "1", name: "InterpretationTypeID"},
    "40080212": {vr: "CS", vm: "1", name: "InterpretationStatusID"},
    "40080300": {vr: "ST", vm: "1", name: "Impressions"},
    "40084000": {vr: "ST", vm: "1 ", name: "ResultsComments"},
    "40100001": {vr: "CS", vm: "1", name: "LowEnergyDetectors"},
    "40100002": {vr: "CS", vm: "1", name: "HighEnergyDetectors"},
    "40100004": {vr: "SQ", vm: "1", name: "DetectorGeometrySequence"},
    "40101001": {vr: "SQ", vm: "1", name: "ThreatROIVoxelSequence"},
    "40101004": {vr: "FL", vm: "3", name: "ThreatROIBase"},
    "40101005": {vr: "FL", vm: "3", name: "ThreatROIExtents"},
    "40101006": {vr: "OB", vm: "1", name: "ThreatROIBitmap"},
    "40101007": {vr: "SH", vm: "1", name: "RouteSegmentID"},
    "40101008": {vr: "CS", vm: "1", name: "GantryType"},
    "40101009": {vr: "CS", vm: "1", name: "OOIOwnerType"},
    "4010100A": {vr: "SQ", vm: "1", name: "RouteSegmentSequence"},
    "40101010": {vr: "US", vm: "1", name: "PotentialThreatObjectID"},
    "40101011": {vr: "SQ", vm: "1", name: "ThreatSequence"},
    "40101012": {vr: "CS", vm: "1", name: "ThreatCategory"},
    "40101013": {vr: "LT", vm: "1", name: "ThreatCategoryDescription"},
    "40101014": {vr: "CS", vm: "1", name: "ATDAbilityAssessment"},
    "40101015": {vr: "CS", vm: "1", name: "ATDAssessmentFlag"},
    "40101016": {vr: "FL", vm: "1", name: "ATDAssessmentProbability"},
    "40101017": {vr: "FL", vm: "1", name: "Mass"},
    "40101018": {vr: "FL", vm: "1", name: "Density"},
    "40101019": {vr: "FL", vm: "1", name: "ZEffective"},
    "4010101A": {vr: "SH", vm: "1", name: "BoardingPassID"},
    "4010101B": {vr: "FL", vm: "3", name: "CenterOfMass"},
    "4010101C": {vr: "FL", vm: "3", name: "CenterOfPTO"},
    "4010101D": {vr: "FL", vm: "6-n", name: "BoundingPolygon"},
    "4010101E": {vr: "SH", vm: "1", name: "RouteSegmentStartLocationID"},
    "4010101F": {vr: "SH", vm: "1", name: "RouteSegmentEndLocationID"},
    "40101020": {vr: "CS", vm: "1", name: "RouteSegmentLocationIDType"},
    "40101021": {vr: "CS", vm: "1-n", name: "AbortReason"},
    "40101023": {vr: "FL", vm: "1", name: "VolumeOfPTO"},
    "40101024": {vr: "CS", vm: "1", name: "AbortFlag"},
    "40101025": {vr: "DT", vm: "1", name: "RouteSegmentStartTime"},
    "40101026": {vr: "DT", vm: "1", name: "RouteSegmentEndTime"},
    "40101027": {vr: "CS", vm: "1", name: "TDRType"},
    "40101028": {vr: "CS", vm: "1", name: "InternationalRouteSegment"},
    "40101029": {vr: "LO", vm: "1-n", name: "ThreatDetectionAlgorithmandVersion"},
    "4010102A": {vr: "SH", vm: "1", name: "AssignedLocation"},
    "4010102B": {vr: "DT", vm: "1", name: "AlarmDecisionTime"},
    "40101031": {vr: "CS", vm: "1", name: "AlarmDecision"},
    "40101033": {vr: "US", vm: "1", name: "NumberOfTotalObjects"},
    "40101034": {vr: "US", vm: "1", name: "NumberOfAlarmObjects"},
    "40101037": {vr: "SQ", vm: "1", name: "PTORepresentationSequence"},
    "40101038": {vr: "SQ", vm: "1", name: "ATDAssessmentSequence"},
    "40101039": {vr: "CS", vm: "1", name: "TIPType"},
    "4010103A": {vr: "CS", vm: "1", name: "DICOSVersion"},
    "40101041": {vr: "DT", vm: "1", name: "OOIOwnerCreationTime"},
    "40101042": {vr: "CS", vm: "1", name: "OOIType"},
    "40101043": {vr: "FL", vm: "3", name: "OOISize"},
    "40101044": {vr: "CS", vm: "1", name: "AcquisitionStatus"},
    "40101045": {vr: "SQ", vm: "1", name: "BasisMaterialsCodeSequence"},
    "40101046": {vr: "CS", vm: "1", name: "PhantomType"},
    "40101047": {vr: "SQ", vm: "1", name: "OOIOwnerSequence"},
    "40101048": {vr: "CS", vm: "1", name: "ScanType"},
    "40101051": {vr: "LO", vm: "1", name: "ItineraryID"},
    "40101052": {vr: "SH", vm: "1", name: "ItineraryIDType"},
    "40101053": {vr: "LO", vm: "1", name: "ItineraryIDAssigningAuthority"},
    "40101054": {vr: "SH", vm: "1", name: "RouteID"},
    "40101055": {vr: "SH", vm: "1", name: "RouteIDAssigningAuthority"},
    "40101056": {vr: "CS", vm: "1", name: "InboundArrivalType"},
    "40101058": {vr: "SH", vm: "1", name: "CarrierID"},
    "40101059": {vr: "CS", vm: "1", name: "CarrierIDAssigningAuthority"},
    "40101060": {vr: "FL", vm: "3", name: "SourceOrientation"},
    "40101061": {vr: "FL", vm: "3", name: "SourcePosition"},
    "40101062": {vr: "FL", vm: "1", name: "BeltHeight"},
    "40101064": {vr: "SQ", vm: "1", name: "AlgorithmRoutingCodeSequence"},
    "40101067": {vr: "CS", vm: "1", name: "TransportClassification"},
    "40101068": {vr: "LT", vm: "1", name: "OOITypeDescriptor"},
    "40101069": {vr: "FL", vm: "1", name: "TotalProcessingTime"},
    "4010106C": {vr: "OB", vm: "1", name: "DetectorCalibrationData"},
    "4FFE0001": {vr: "SQ", vm: "1", name: "MACParametersSequence"},
    "50xx0005": {vr: "US", vm: "1", name: "CurveDimensions"},
    "50xx0010": {vr: "US", vm: "1", name: "NumberOfPoints"},
    "50xx0020": {vr: "CS", vm: "1", name: "TypeOfData"},
    "50xx0022": {vr: "LO", vm: "1", name: "CurveDescription"},
    "50xx0030": {vr: "SH", vm: "1-n", name: "AxisUnits"},
    "50xx0040": {vr: "SH", vm: "1-n", name: "AxisLabels"},
    "50xx0103": {vr: "US", vm: "1", name: "DataValueRepresentation"},
    "50xx0104": {vr: "US", vm: "1-n", name: "MinimumCoordinateValue"},
    "50xx0105": {vr: "US", vm: "1-n", name: "MaximumCoordinateValue"},
    "50xx0106": {vr: "SH", vm: "1-n", name: "CurveRange"},
    "50xx0110": {vr: "US", vm: "1-n", name: "CurveDataDescriptor"},
    "50xx0112": {vr: "US", vm: "1-n", name: "CoordinateStartValue"},
    "50xx0114": {vr: "US", vm: "1-n", name: "CoordinateStepValue"},
    "50xx1001": {vr: "CS", vm: "1", name: "CurveActivationLayer"},
    "50xx2000": {vr: "US", vm: "1", name: "AudioType"},
    "50xx2002": {vr: "US", vm: "1", name: "AudioSampleFormat"},
    "50xx2004": {vr: "US", vm: "1", name: "NumberOfChannels"},
    "50xx2006": {vr: "UL", vm: "1", name: "NumberOfSamples"},
    "50xx2008": {vr: "UL", vm: "1", name: "SampleRate"},
    "50xx200A": {vr: "UL", vm: "1", name: "TotalTime"},
    "50xx200C": {vr: "OW|OB", vm: "1", name: "AudioSampleData"},
    "50xx200E": {vr: "LT", vm: "1 ", name: "AudioComments"},
    "50xx2500": {vr: "LO", vm: "1", name: "CurveLabel"},
    "50xx2600": {vr: "SQ", vm: "1", name: "CurveReferencedOverlaySequence"},
    "50xx2610": {vr: "US", vm: "1", name: "CurveReferencedOverlayGroup"},
    "50xx3000": {vr: "OW|OB", vm: "1", name: "CurveData"},
    "52009229": {vr: "SQ", vm: "1", name: "SharedFunctionalGroupsSequence"},
    "52009230": {vr: "SQ", vm: "1", name: "PerFrameFunctionalGroupsSequence"},
    "54000100": {vr: "SQ", vm: "1", name: "WaveformSequence"},
    "54000110": {vr: "OB|OW", vm: "1", name: "ChannelMinimumValue"},
    "54000112": {vr: "OB|OW", vm: "1", name: "ChannelMaximumValue"},
    "54001004": {vr: "US", vm: "1", name: "WaveformBitsAllocated"},
    "54001006": {vr: "CS", vm: "1", name: "WaveformSampleInterpretation"},
    "5400100A": {vr: "OB|OW", vm: "1", name: "WaveformPaddingValue"},
    "54001010": {vr: "OB|OW", vm: "1", name: "WaveformData"},
    "56000010": {vr: "OF", vm: "1", name: "FirstOrderPhaseCorrectionAngle"},
    "56000020": {vr: "OF", vm: "1", name: "SpectroscopyData"},
    "60xx0010": {vr: "US", vm: "1", name: "OverlayRows"},
    "60xx0011": {vr: "US", vm: "1", name: "OverlayColumns"},
    "60xx0012": {vr: "US", vm: "1", name: "OverlayPlanes"},
    "60xx0015": {vr: "IS", vm: "1", name: "NumberOfFramesInOverlay"},
    "60xx0022": {vr: "LO", vm: "1", name: "OverlayDescription"},
    "60xx0040": {vr: "CS", vm: "1", name: "OverlayType"},
    "60xx0045": {vr: "LO", vm: "1", name: "OverlaySubtype"},
    "60xx0050": {vr: "SS", vm: "2", name: "OverlayOrigin"},
    "60xx0051": {vr: "US", vm: "1", name: "ImageFrameOrigin"},
    "60xx0052": {vr: "US", vm: "1", name: "OverlayPlaneOrigin"},
    "60xx0060": {vr: "CS", vm: "1", name: "OverlayCompressionCode"},
    "60xx0061": {vr: "SH", vm: "1", name: "OverlayCompressionOriginator"},
    "60xx0062": {vr: "SH", vm: "1", name: "OverlayCompressionLabel"},
    "60xx0063": {vr: "CS", vm: "1", name: "OverlayCompressionDescription"},
    "60xx0066": {vr: "AT", vm: "1-n", name: "OverlayCompressionStepPointers"},
    "60xx0068": {vr: "US", vm: "1", name: "OverlayRepeatInterval"},
    "60xx0069": {vr: "US", vm: "1", name: "OverlayBitsGrouped"},
    "60xx0100": {vr: "US", vm: "1", name: "OverlayBitsAllocated"},
    "60xx0102": {vr: "US", vm: "1", name: "OverlayBitPosition"},
    "60xx0110": {vr: "CS", vm: "1", name: "OverlayFormat"},
    "60xx0200": {vr: "US", vm: "1", name: "OverlayLocation"},
    "60xx0800": {vr: "CS", vm: "1-n", name: "OverlayCodeLabel"},
    "60xx0802": {vr: "US", vm: "1", name: "OverlayNumberOfTables"},
    "60xx0803": {vr: "AT", vm: "1-n", name: "OverlayCodeTableLocation"},
    "60xx0804": {vr: "US", vm: "1", name: "OverlayBitsForCodeWord"},
    "60xx1001": {vr: "CS", vm: "1", name: "OverlayActivationLayer"},
    "60xx1100": {vr: "US", vm: "1", name: "OverlayDescriptorGray"},
    "60xx1101": {vr: "US", vm: "1", name: "OverlayDescriptorRed"},
    "60xx1102": {vr: "US", vm: "1", name: "OverlayDescriptorGreen"},
    "60xx1103": {vr: "US", vm: "1", name: "OverlayDescriptorBlue"},
    "60xx1200": {vr: "US", vm: "1-n", name: "OverlaysGray"},
    "60xx1201": {vr: "US", vm: "1-n", name: "OverlaysRed"},
    "60xx1202": {vr: "US", vm: "1-n", name: "OverlaysGreen"},
    "60xx1203": {vr: "US", vm: "1-n", name: "OverlaysBlue"},
    "60xx1301": {vr: "IS", vm: "1", name: "ROIArea"},
    "60xx1302": {vr: "DS", vm: "1", name: "ROIMean"},
    "60xx1303": {vr: "DS", vm: "1", name: "ROIStandardDeviation"},
    "60xx1500": {vr: "LO", vm: "1", name: "OverlayLabel"},
    "60xx3000": {vr: "OB|OW", vm: "1", name: "OverlayData"},
    "60xx4000": {vr: "LT", vm: "1", name: "OverlayComments"},
    "7FE00010": {vr: "OW|OB", vm: "1", name: "PixelData"},
    "7FE00020": {vr: "OW", vm: "1", name: "CoefficientsSDVN"},
    "7FE00030": {vr: "OW", vm: "1", name: "CoefficientsSDHN"},
    "7FE00040": {vr: "OW", vm: "1", name: "CoefficientsSDDN"},
    "7Fxx0010": {vr: "OW|OB", vm: "1", name: "VariablePixelData"},
    "7Fxx0011": {vr: "US", vm: "1", name: "VariableNextDataGroup"},
    "7Fxx0020": {vr: "OW", vm: "1", name: "VariableCoefficientsSDVN"},
    "7Fxx0030": {vr: "OW", vm: "1", name: "VariableCoefficientsSDHN"},
    "7Fxx0040": {vr: "OW", vm: "1", name: "VariableCoefficientsSDDN"},
    "FFFAFFFA": {vr: "SQ", vm: "1", name: "DigitalSignaturesSequence"},
    "FFFCFFFC": {vr: "OB", vm: "1", name: "DataSetTrailingPadding"},
    "FFFEE000": {vr: "", vm: "1", name: "Item"},
    "FFFEE00D": {vr: "", vm: "1", name: "ItemDelimitationItem"},
    "FFFEE0DD": {vr: "", vm: "1", name: "SequenceDelimitationItem"}
};

module.exports = {
    dataElements: dataElements
};
},{}],9:[function(require,module,exports){
(function (process){
/**
 * Author  : Ramesh R
 * Created : 7/12/2015 2:34 PM
 * ----------------------------------------------------------------------
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 * ----------------------------------------------------------------------
 */

var fs = require('fs'),
    utils = require('./utils'),
    constants = require('./constants'),
    DcmFile = require('./dcmfile'),
    DataElement = require('./dataelement'),
    transferSyntax = require('./transfersyntax'),
    config = require('./config')
    ;

var parseBuffer = function (buffer, options, callback) {

    var filePreamble = utils.readString(buffer, 0, constants.dcmPrefixPosition);
    var dicomPrefix = utils.readString(buffer, constants.dcmPrefixPosition, 4);

    if (typeof options == 'function') {
        callback = options;
        options = {};
    }

    /// Set User config
    config.setOptions(options);

    var defaultTxProps = null;
    var metaPosition = 0;

    if (dicomPrefix === 'DICM') {
        defaultTxProps = transferSyntax.readProps(constants.groupTransferSyntax);
        metaPosition = constants.metaPosition;
    } else {

        defaultTxProps = transferSyntax.readProps(constants.dicomDefaultTransferSyntax);

        /// Checking for group element
        var groupElement = new DataElement(defaultTxProps);
        groupElement.parse(buffer, metaPosition);

        if (groupElement.tag === constants.groupLengthTag) {
            metaPosition = 0;
        } else {
            console.log('Invalid DICOM data');
            return callback({err: 'Invalid DICOM data'});
        }
    }


    var file = new DcmFile();

    /// Parse meta information
    var groupElement = new DataElement(defaultTxProps);
    var currentPosition = groupElement.parse(buffer, metaPosition);

    var metaEnd = currentPosition + groupElement.value;
    while (currentPosition < metaEnd) {
        var element = new DataElement(defaultTxProps);

        currentPosition = element.parse(buffer, currentPosition);
        file.metaElements[element.id] = element;
    }

    var txProps = null;
    if (file.metaElements[constants.transferSyntaxTag]) {
        var currentTransferSyntax = file.metaElements[constants.transferSyntaxTag].value;
        txProps = transferSyntax[currentTransferSyntax];
    } else {
        txProps = transferSyntax[constants.dicomDefaultTransferSyntax];
    }

    if (!txProps) {
        return callback({err: 'Not supported'});
    }

    (function processElements(innerCallback) {
        (function parseNext(currentPosition) {
            return process.nextTick(function () {
                if (currentPosition + 6 < buffer.length) {
                    var element = new DataElement(txProps);
                    currentPosition = element.parse(buffer, currentPosition);
                    file.dataset[element.id] = element;

                    parseNext(currentPosition);
                } else {
                    innerCallback();
                }
            });
        })(currentPosition);
    })(function (err) {

        if (file.dataset['7FE00010']) {
            var pixelData = file.dataset['7FE00010'];

            if (pixelData.vr == 'OW') {
                file.pixelData = file.dataset['7FE00010'].value;
            } else {
                file.pixelData = file.dataset['7FE00010'].pixelDataItems;
            }
        }

        callback(null, file);
    });
};

var parseFile = function (filePath, options, callback) {

    if (typeof options == 'function') {
        callback = options;
        options = {};
    }

    if (!filePath) {
        return callback({err: 'Invalid arguments for parseFile'});
    }

    fs.readFile(filePath, function (err, buffer) {
        if (err) {
            return callback(err);
        } else {
            parseBuffer(buffer, options, callback);
        }
    });
};

module.exports = {
    parse: parseBuffer,
    parseFile: parseFile
};

}).call(this,require('_process'))
},{"./config":3,"./constants":4,"./dataelement":5,"./dcmfile":7,"./transfersyntax":10,"./utils":11,"_process":18,"fs":13}],10:[function(require,module,exports){
/**
 * Author  : Ramesh R
 * Created : 7/14/2015 10:48 PM
 * ----------------------------------------------------------------------
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 * ----------------------------------------------------------------------
 */

var bindProps = function (name, props) {
    var tx = {
        name: name,
        isBigEndian: false,
        isImplicit: false,
        isAlive: true
    };

    for (var key in props) {
        if (tx.hasOwnProperty(key)) {
            tx[key] = props[key];
        }
    }

    return tx;
};

module.exports = {

    '1.2.840.10008.1.2': bindProps('Implicit VR Endian', {isImplicit: true}),
    '1.2.840.10008.1.2.1': bindProps('Explicit VR Little Endian'),
    '1.2.840.10008.1.2.1.99': bindProps('Deflated Explicit VR Big Endian', {isBigEndian: true}),
    '1.2.840.10008.1.2.2': bindProps('Explicit VR Big Endian', {isBigEndian: true}),
    '1.2.840.10008.1.2.4.50': bindProps('JPEG Baseline (Process 1)'),
    '1.2.840.10008.1.2.4.51': bindProps('JPEG Baseline (Processes 2 & 4)'),
    '1.2.840.10008.1.2.4.57': bindProps('JPEG Lossless, Nonhierarchical (Processes 14)'),
    '1.2.840.10008.1.2.4.70': bindProps('JPEG Lossless, Nonhierarchical, First- Order Prediction (Processes 14 [Selection Value 1])'),
    '1.2.840.10008.1.2.4.80': bindProps('JPEG-LS Lossless Image Compression'),
    '1.2.840.10008.1.2.4.81': bindProps('JPEG-LS Lossy (Near- Lossless) Image Compression'),
    '1.2.840.10008.1.2.4.90': bindProps('JPEG 2000 Image Compression (Lossless Only)'),
    '1.2.840.10008.1.2.4.91': bindProps('JPEG 2000 Image Compression'),
    '1.2.840.10008.1.2.4.92': bindProps('JPEG 2000 Part 2 Multicomponent Image Compression (Lossless Only)'),
    '1.2.840.10008.1.2.4.93': bindProps('JPEG 2000 Part 2 Multicomponent Image Compression'),

    readProps: function (transferSyntax) {
        return this[transferSyntax] ? this[transferSyntax] : this['1.2.840.10008.1.2'];
    }
};
},{}],11:[function(require,module,exports){
/**
 * Author  : Ramesh R
 * Created : 7/13/2015 5:26 PM
 * ----------------------------------------------------------------------
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 * ----------------------------------------------------------------------
 */

var constants = require('./constants');

module.exports = {

    byteToHex: function (byteValue) {
        return constants.hexCharacters[(byteValue >> 4) & 0x0f] + constants.hexCharacters[byteValue & 0x0f];
    },

    readString: function (buffer, position, length) {
        //if (!buffer || length == 0) {
        //    /// TODO: Throw err
        //    return '';
        //}
        //
        //if (position + length > buffer.length) {
        //    /// TODO: Throw err
        //    return '';
        //}

        var data = '';

        for (var i = position; i < position + length; i++) {
            data += String.fromCharCode(buffer[i]);
        }

        return data;
    },

    readBinary: function (buffer, position, length) {
        return buffer.slice(position, position + length);
    },

    readHex: function (buffer, position, isBigEndian) {
        /// First 2 bytes for Group No and second 2 for Element No.
        if (isBigEndian) {
            return this.byteToHex(buffer[position]) + this.byteToHex(buffer[position + 1]) + this.byteToHex(buffer[position + 2]) + this.byteToHex(buffer[position + 3]);
        } else {
            return this.byteToHex(buffer[position + 1]) + this.byteToHex(buffer[position]) + this.byteToHex(buffer[position + 3]) + this.byteToHex(buffer[position + 2]);
        }
    },

    readTag: function (buffer, position, isBigEndian) {
        return this.readHex(buffer, position, isBigEndian);
    },

    readVr: function (buffer, position) {
        //return this.readString(buffer, position, 2);
        return String.fromCharCode(buffer[position]) + String.fromCharCode(buffer[position + 1]);
    },

    readStringData: function (buffer, position, length) {
        var data = '';

        for (var i = position; i < position + length; i++) {
            if (buffer[i] === 0) {
                break;
            }

            data += String.fromCharCode(buffer[i]);
        }

        return data;
    },

    readFloat: function (buffer, position, length, isBigEndian, utils) {
        if (length > 65534) {
            /// Data Elements with multiple values using this VR may not be properly encoded
            /// if Explicit-VR transfer syntax is used and the VL of this attribute exceeds 65534 bytes.
        }

        var stringData = utils.readStringData(buffer, position, length);

        if (stringData.indexOf('\\') > -1) {
            return stringData.split('\\').map(parseFloat);
        } else {
            return parseFloat(stringData);
        }
    },

    readInteger: function (buffer, position, length, isBigEndian) {
        return isBigEndian ? buffer.readIntBE(position, length) : buffer.readIntLE(position, length);

        //var n = 0;
        //if (isBigEndian) {
        //    for (var i = position; i < position + length; i++) {
        //        n = n * 256 + buffer[i];
        //    }
        //} else {
        //    for (var i = position + length - 1; i >= position; i--) {
        //        n = n * 256 + buffer[i];
        //    }
        //}
        //
        //return n;
    },

    readUnsignedInteger: function (buffer, position, length, isBigEndian) {
        return isBigEndian ? buffer.readUIntBE(position, length) : buffer.readUIntLE(position, length);
    },

    readUInt8Array: function (buffer, position, length, isBigEndian, utils) {
        //return new Uint8Array(buffer, position, length);
        return utils.readBinary(buffer, position, length);
    },

    readUInt16Array: function (buffer, position, length, isBigEndian, utils) {
        //return new Uint16Array(buffer.buffer, position, length/2);
        return utils.readBinary(buffer, position, length);
    }
};
},{"./constants":4}],12:[function(require,module,exports){
/**
 * Author  : Ramesh R
 * Created : 7/14/2015 10:57 AM
 * ----------------------------------------------------------------------
 * This file is subject to the terms and conditions defined in
 * file 'LICENSE', which is part of this source code package.
 * ----------------------------------------------------------------------
 */

module.exports = {
    /// Table 7.1-1. Page 38: --> ftp://medical.nema.org/medical/dicom/2011/11_05pu.pdf
    _4byteVrs: ['SQ', 'UN', 'OW', 'OB', 'OF', 'UT', 'UN'],

    getLength: function (vr) {
        if (this._4byteVrs.indexOf(vr) > -1) {
            return {length: 4, reserved: 2};
        }

        return {length: 2, reserved: 0};
    }
};
},{}],13:[function(require,module,exports){

},{}],14:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)
	var PLUS_URL_SAFE = '-'.charCodeAt(0)
	var SLASH_URL_SAFE = '_'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS ||
		    code === PLUS_URL_SAFE)
			return 62 // '+'
		if (code === SLASH ||
		    code === SLASH_URL_SAFE)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

},{}],15:[function(require,module,exports){
(function (global){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('is-array')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var rootParent = {}

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Safari 5-7 lacks support for changing the `Object.prototype.constructor` property
 *     on objects.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
  ? global.TYPED_ARRAY_SUPPORT
  : typedArraySupport()

function typedArraySupport () {
  function Bar () {}
  try {
    var arr = new Uint8Array(1)
    arr.foo = function () { return 42 }
    arr.constructor = Bar
    return arr.foo() === 42 && // typed array instances can be augmented
        arr.constructor === Bar && // constructor can be set
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
}

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (arg) {
  if (!(this instanceof Buffer)) {
    // Avoid going through an ArgumentsAdaptorTrampoline in the common case.
    if (arguments.length > 1) return new Buffer(arg, arguments[1])
    return new Buffer(arg)
  }

  this.length = 0
  this.parent = undefined

  // Common case.
  if (typeof arg === 'number') {
    return fromNumber(this, arg)
  }

  // Slightly less common case.
  if (typeof arg === 'string') {
    return fromString(this, arg, arguments.length > 1 ? arguments[1] : 'utf8')
  }

  // Unusual.
  return fromObject(this, arg)
}

function fromNumber (that, length) {
  that = allocate(that, length < 0 ? 0 : checked(length) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < length; i++) {
      that[i] = 0
    }
  }
  return that
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') encoding = 'utf8'

  // Assumption: byteLength() return value is always < kMaxLength.
  var length = byteLength(string, encoding) | 0
  that = allocate(that, length)

  that.write(string, encoding)
  return that
}

function fromObject (that, object) {
  if (Buffer.isBuffer(object)) return fromBuffer(that, object)

  if (isArray(object)) return fromArray(that, object)

  if (object == null) {
    throw new TypeError('must start with number, buffer, array or string')
  }

  if (typeof ArrayBuffer !== 'undefined') {
    if (object.buffer instanceof ArrayBuffer) {
      return fromTypedArray(that, object)
    }
    if (object instanceof ArrayBuffer) {
      return fromArrayBuffer(that, object)
    }
  }

  if (object.length) return fromArrayLike(that, object)

  return fromJsonObject(that, object)
}

function fromBuffer (that, buffer) {
  var length = checked(buffer.length) | 0
  that = allocate(that, length)
  buffer.copy(that, 0, 0, length)
  return that
}

function fromArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Duplicate of fromArray() to keep fromArray() monomorphic.
function fromTypedArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  // Truncating the elements is probably not what people expect from typed
  // arrays with BYTES_PER_ELEMENT > 1 but it's compatible with the behavior
  // of the old Buffer constructor.
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayBuffer (that, array) {
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    array.byteLength
    that = Buffer._augment(new Uint8Array(array))
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromTypedArray(that, new Uint8Array(array))
  }
  return that
}

function fromArrayLike (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Deserialize { type: 'Buffer', data: [1,2,3,...] } into a Buffer object.
// Returns a zero-length buffer for inputs that don't conform to the spec.
function fromJsonObject (that, object) {
  var array
  var length = 0

  if (object.type === 'Buffer' && isArray(object.data)) {
    array = object.data
    length = checked(array.length) | 0
  }
  that = allocate(that, length)

  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype
  Buffer.__proto__ = Uint8Array
}

function allocate (that, length) {
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = Buffer._augment(new Uint8Array(length))
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that.length = length
    that._isBuffer = true
  }

  var fromPool = length !== 0 && length <= Buffer.poolSize >>> 1
  if (fromPool) that.parent = rootParent

  return that
}

function checked (length) {
  // Note: cannot use `length < kMaxLength` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (subject, encoding) {
  if (!(this instanceof SlowBuffer)) return new SlowBuffer(subject, encoding)

  var buf = new Buffer(subject, encoding)
  delete buf.parent
  return buf
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  var i = 0
  var len = Math.min(x, y)
  while (i < len) {
    if (a[i] !== b[i]) break

    ++i
  }

  if (i !== len) {
    x = a[i]
    y = b[i]
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) throw new TypeError('list argument must be an Array of Buffers.')

  if (list.length === 0) {
    return new Buffer(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; i++) {
      length += list[i].length
    }
  }

  var buf = new Buffer(length)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

function byteLength (string, encoding) {
  if (typeof string !== 'string') string = '' + string

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'binary':
      // Deprecated
      case 'raw':
      case 'raws':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

// pre-set for values that may exist in the future
Buffer.prototype.length = undefined
Buffer.prototype.parent = undefined

function slowToString (encoding, start, end) {
  var loweredCase = false

  start = start | 0
  end = end === undefined || end === Infinity ? this.length : end | 0

  if (!encoding) encoding = 'utf8'
  if (start < 0) start = 0
  if (end > this.length) end = this.length
  if (end <= start) return ''

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return 0
  return Buffer.compare(this, b)
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset) {
  if (byteOffset > 0x7fffffff) byteOffset = 0x7fffffff
  else if (byteOffset < -0x80000000) byteOffset = -0x80000000
  byteOffset >>= 0

  if (this.length === 0) return -1
  if (byteOffset >= this.length) return -1

  // Negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = Math.max(this.length + byteOffset, 0)

  if (typeof val === 'string') {
    if (val.length === 0) return -1 // special case: looking for empty string always fails
    return String.prototype.indexOf.call(this, val, byteOffset)
  }
  if (Buffer.isBuffer(val)) {
    return arrayIndexOf(this, val, byteOffset)
  }
  if (typeof val === 'number') {
    if (Buffer.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === 'function') {
      return Uint8Array.prototype.indexOf.call(this, val, byteOffset)
    }
    return arrayIndexOf(this, [ val ], byteOffset)
  }

  function arrayIndexOf (arr, val, byteOffset) {
    var foundIndex = -1
    for (var i = 0; byteOffset + i < arr.length; i++) {
      if (arr[byteOffset + i] === val[foundIndex === -1 ? 0 : i - foundIndex]) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === val.length) return byteOffset + foundIndex
      } else {
        foundIndex = -1
      }
    }
    return -1
  }

  throw new TypeError('val must be string, number or Buffer')
}

// `get` is deprecated
Buffer.prototype.get = function get (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` is deprecated
Buffer.prototype.set = function set (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) throw new Error('Invalid hex string')
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    var swap = encoding
    encoding = offset
    offset = length | 0
    length = swap
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'binary':
        return binaryWrite(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function binarySlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
  }

  if (newBuf.length) newBuf.parent = this.parent || this

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = (value & 0xff)
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
  if (offset < 0) throw new RangeError('index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; i--) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; i++) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    target._set(this.subarray(start, start + len), targetStart)
  }

  return len
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new RangeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new RangeError('start out of bounds')
  if (end < 0 || end > this.length) throw new RangeError('end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function toArrayBuffer () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1) {
        buf[i] = this[i]
      }
      return buf.buffer
    }
  } else {
    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function _augment (arr) {
  arr.constructor = Buffer
  arr._isBuffer = true

  // save reference to original Uint8Array set method before overwriting
  arr._set = arr.set

  // deprecated
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.equals = BP.equals
  arr.compare = BP.compare
  arr.indexOf = BP.indexOf
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUIntLE = BP.readUIntLE
  arr.readUIntBE = BP.readUIntBE
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readIntLE = BP.readIntLE
  arr.readIntBE = BP.readIntBE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUIntLE = BP.writeUIntLE
  arr.writeUIntBE = BP.writeUIntBE
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeIntLE = BP.writeIntLE
  arr.writeIntBE = BP.writeIntBE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; i++) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00 | 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"base64-js":14,"ieee754":16,"is-array":17}],16:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],17:[function(require,module,exports){

/**
 * isArray
 */

var isArray = Array.isArray;

/**
 * toString
 */

var str = Object.prototype.toString;

/**
 * Whether or not the given `val`
 * is an array.
 *
 * example:
 *
 *        isArray([]);
 *        // > true
 *        isArray(arguments);
 *        // > false
 *        isArray('');
 *        // > false
 *
 * @param {mixed} val
 * @return {bool}
 */

module.exports = isArray || function (val) {
  return !! val && '[object Array]' == str.call(val);
};

},{}],18:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[1]);
