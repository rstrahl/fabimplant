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
				console.log(dcmData);
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

},{"buffer":14,"dicomjs":2}],2:[function(require,module,exports){
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

},{"base64-js":15,"ieee754":16,"is-array":17}],15:[function(require,module,exports){
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

},{}],16:[function(require,module,exports){
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

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiZmlsZUxvYWRlci5qcyIsIm5vZGVfbW9kdWxlcy9kaWNvbWpzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2RpY29tanMvbGliL2NvbmZpZy5qcyIsIm5vZGVfbW9kdWxlcy9kaWNvbWpzL2xpYi9jb25zdGFudHMuanMiLCJub2RlX21vZHVsZXMvZGljb21qcy9saWIvZGF0YWVsZW1lbnQuanMiLCJub2RlX21vZHVsZXMvZGljb21qcy9saWIvZGF0YXJlYWRlci5qcyIsIm5vZGVfbW9kdWxlcy9kaWNvbWpzL2xpYi9kY21maWxlLmpzIiwibm9kZV9tb2R1bGVzL2RpY29tanMvbGliL2RpY3QuanMiLCJub2RlX21vZHVsZXMvZGljb21qcy9saWIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZGljb21qcy9saWIvdHJhbnNmZXJzeW50YXguanMiLCJub2RlX21vZHVsZXMvZGljb21qcy9saWIvdXRpbHMuanMiLCJub2RlX21vZHVsZXMvZGljb21qcy9saWIvdnIuanMiLCJub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbGliL19lbXB0eS5qcyIsIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnVmZmVyL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvbm9kZV9tb2R1bGVzL2Jhc2U2NC1qcy9saWIvYjY0LmpzIiwibm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvbm9kZV9tb2R1bGVzL2llZWU3NTQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9ub2RlX21vZHVsZXMvaXMtYXJyYXkvaW5kZXguanMiLCJub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUM5a0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3RJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBOzs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUN4Z0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgZGljb21qcyA9IHJlcXVpcmUoJ2RpY29tanMnKTtcblxuZG9jdW1lbnQuYm9keS5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgaW5pdERyb3Bab25lKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdkcm9wWm9uZScpKSk7XG5cbmZ1bmN0aW9uIGluaXREcm9wWm9uZShlbGVtZW50KSB7XG5cdGNvbnNvbGUubG9nKFwiQ2FsbGVkIGluaXREcm9wWm9uZVwiKTtcblx0aWYgKHdpbmRvdy5GaWxlICYmIHdpbmRvdy5GaWxlUmVhZGVyICYmIHdpbmRvdy5GaWxlTGlzdCAmJiB3aW5kb3cuQmxvYikge1xuICAgIGRyb3Bab25lLmFkZEV2ZW50TGlzdGVuZXIoJ2RyYWdvdmVyJywgaGFuZGxlRHJhZ092ZXIsIGZhbHNlKTtcbiAgICBkcm9wWm9uZS5hZGRFdmVudExpc3RlbmVyKCdkcm9wJywgaGFuZGxlRmlsZVNlbGVjdCwgZmFsc2UpO1xuXHR9XG5cdGVsc2Uge1xuXHRcdGFsZXJ0KFwiRmlsZSBBUElzIGFyZSBub3Qgc3VwcG9ydGVkIGluIHRoaXMgYnJvd3Nlci5cIik7XG5cdH1cbn1cblxuZnVuY3Rpb24gaGFuZGxlRmlsZVNlbGVjdChldmVudCkge1xuXHRldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0Y29uc29sZS5sb2coXCJMb2FkZWQgZmlsZXM6IFwiICsgZXZlbnQuZGF0YVRyYW5zZmVyLmZpbGVzLmxlbmd0aCk7XG5cdHZhciBmaWxlcyA9IGV2ZW50LmRhdGFUcmFuc2Zlci5maWxlcztcblx0bG9hZEZpbGUoZmlsZXNbMF0pO1xufVxuXG5mdW5jdGlvbiBoYW5kbGVEcmFnT3ZlcihldmVudCkge1xuXHRldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0ZXZlbnQuZGF0YVRyYW5zZmVyLmRyb3BFZmZlY3QgPSAnY29weSc7XG59XG5cbmZ1bmN0aW9uIGxvYWRGaWxlKGZpbGUpIHtcblx0Y29uc29sZS5sb2coXCJsb2FkRmlsZVwiKTtcblx0dmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG5cdHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbihmaWxlKSB7XG5cdFx0Y29uc29sZS5sb2coXCJvbmxvYWQgY2FsbGVkXCIpO1xuXHRcdHZhciBhcnJheUJ1ZmZlciA9IHJlYWRlci5yZXN1bHQ7XG5cdFx0dmFyIGJ1ZmZlciA9IHRvQnVmZmVyKGFycmF5QnVmZmVyKTtcblx0XHRkaWNvbWpzLnBhcnNlKGJ1ZmZlciwgZnVuY3Rpb24gKGVyciwgZGNtRGF0YSkge1xuXHRcdFx0aWYgKCFlcnIpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coZGNtRGF0YSk7XG5cdFx0XHRcdFx0Ly8vIFJlYWRpbmcgcGF0aWVudCBuYW1lXG5cdFx0XHRcdFx0dmFyIHBhdGllbnROYW1lID0gZGNtRGF0YS5kYXRhc2V0WycwMDEwMDAxMCddLnZhbHVlO1xuXHRcdFx0XHRcdHZhciBwaG90b21ldHJpY0ludGVycG9sYXRpb24gPSBkY21EYXRhLmRhdGFzZXRbJzAwMjgwMDA0J10udmFsdWU7XG5cdFx0XHRcdFx0Ly8gdmFyIG51bWJlck9mRnJhbWVzID0gZGNtRGF0YS5kYXRhc2V0WycwMDI4MDAwOCddLnZhbHVlO1xuXHRcdFx0XHRcdHZhciByb3dzID0gZGNtRGF0YS5kYXRhc2V0WycwMDI4MDAxMCddLnZhbHVlO1xuXHRcdFx0XHRcdHZhciBjb2x1bW5zID0gZGNtRGF0YS5kYXRhc2V0WycwMDI4MDAxMSddLnZhbHVlO1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFwiUmVhZCBwYXRpZW50IHJlY29yZDogXCIrcGF0aWVudE5hbWUpO1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFwiUmVhZCBwaG90b21ldHJpY0ludGVycG9sYXRpb246IFwiK3Bob3RvbWV0cmljSW50ZXJwb2xhdGlvbik7XG5cdFx0XHRcdFx0Ly8gY29uc29sZS5sb2coXCJSZWFkIG51bWJlck9mRnJhbWVzOiBcIitudW1iZXJPZkZyYW1lcyk7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coXCJSZWFkIHJvd3M6IFwiK3Jvd3MpO1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFwiUmVhZCBjb2x1bW5zOiBcIitjb2x1bW5zKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coZXJyKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fTtcblx0cmVhZGVyLnJlYWRBc0FycmF5QnVmZmVyKGZpbGUpO1xufVxuXG4vLyBSZWZhY3RvciB0aGlzIG91dCB0byBhY3R1YWxseSB0cmFuc2xhdGUgYW4gZW50aXJlIEZpbGUgb2JqZWN0XG5mdW5jdGlvbiB0b0J1ZmZlcihhcnJheUJ1ZmZlcikge1xuICAgIHZhciBidWZmZXIgPSBuZXcgQnVmZmVyKGFycmF5QnVmZmVyLmJ5dGVMZW5ndGgpO1xuICAgIHZhciB2aWV3ID0gbmV3IFVpbnQ4QXJyYXkoYXJyYXlCdWZmZXIpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYnVmZmVyLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIGJ1ZmZlcltpXSA9IHZpZXdbaV07XG4gICAgfVxuICAgIHJldHVybiBidWZmZXI7XG59XG4iLCIvKipcbiAqIEF1dGhvciAgOiBSYW1lc2ggUlxuICogQ3JlYXRlZCA6IDcvMTcvMjAxNSAxMjozMSBBTVxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICogVGhpcyBmaWxlIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIGFuZCBjb25kaXRpb25zIGRlZmluZWQgaW5cbiAqIGZpbGUgJ0xJQ0VOU0UnLCB3aGljaCBpcyBwYXJ0IG9mIHRoaXMgc291cmNlIGNvZGUgcGFja2FnZS5cbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqL1xuXG52YXIgbGliID0gcmVxdWlyZSgnLi9saWInKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgcGFyc2U6IGxpYi5wYXJzZSxcbiAgICBwYXJzZUZpbGU6IGxpYi5wYXJzZUZpbGVcbn07IiwiLyoqXG4gKiBBdXRob3IgIDogUmFtZXNoIFJcbiAqIENyZWF0ZWQgOiA3LzE5LzIwMTUgNzo0MSBQTVxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICogVGhpcyBmaWxlIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIGFuZCBjb25kaXRpb25zIGRlZmluZWQgaW5cbiAqIGZpbGUgJ0xJQ0VOU0UnLCB3aGljaCBpcyBwYXJ0IG9mIHRoaXMgc291cmNlIGNvZGUgcGFja2FnZS5cbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIHNldE9wdGlvbnM6IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBvcHRpb25zKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICAgICAgdGhpc1trZXldID0gb3B0aW9uc1trZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTsiLCIvKipcbiAqIEF1dGhvciAgOiBSYW1lc2ggUlxuICogQ3JlYXRlZCA6IDcvMTMvMjAxNSA2OjE0IFBNXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKiBUaGlzIGZpbGUgaXMgc3ViamVjdCB0byB0aGUgdGVybXMgYW5kIGNvbmRpdGlvbnMgZGVmaW5lZCBpblxuICogZmlsZSAnTElDRU5TRScsIHdoaWNoIGlzIHBhcnQgb2YgdGhpcyBzb3VyY2UgY29kZSBwYWNrYWdlLlxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICovXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgaGV4Q2hhcmFjdGVyczogWycwJywgJzEnLCAnMicsICczJywgJzQnLCAnNScsICc2JywgJzcnLCAnOCcsICc5JywgJ0EnLCAnQicsICdDJywgJ0QnLCAnRScsICdGJ10sXG5cbiAgICB0YWdMZW5ndGg6IDQsXG4gICAgdnJMZW5ndGg6IDIsXG4gICAgdmFsdWVMZW5ndGg6IDIsXG5cbiAgICBtZXRhUG9zaXRpb246IDEzMixcbiAgICBkY21QcmVmaXhQb3NpdGlvbjogMTI4LFxuXG4gICAgc2VxdWVuY2VWcjogJ1NRJyxcblxuICAgIGdyb3VwTGVuZ3RoVGFnOiAnMDAwODAwMDAnLFxuICAgIHRyYW5zZmVyU3ludGF4VGFnOiAnMDAwMjAwMTAnLFxuICAgIGl0ZW1TdGFydFRhZzogJ0ZGRkVFMDAwJyxcbiAgICBpdGVtRGVsaW1pdGVyVGFnOiAnRkZGRUUwMEQnLFxuICAgIHNlcXVlbmNlRGVsaW1pdGVyVGFnOiAnRkZGRUUwREQnLFxuICAgIGRlbGltaXRlclRhZ3M6IFsnRkZGRUUwMDAnLCAnRkZGRUUwMEQnLCAnRkZGRUUwREQnXSxcblxuICAgIC8vLyBHcm91cCAwMDAyIGlzIHdyaXR0ZW4gaW4gTGl0dGxlIEVuZGlhbiBFeHBsaWNpdFxuICAgIC8vLyBFeHBsaWNpdCBWUiBMaXR0bGUgRW5kaWFuXG4gICAgZ3JvdXBUcmFuc2ZlclN5bnRheDogJzEuMi44NDAuMTAwMDguMS4yLjEnLFxuXG4gICAgZGljb21EZWZhdWx0VHJhbnNmZXJTeW50YXg6ICcxLjIuODQwLjEwMDA4LjEuMidcbn07IiwiLyoqXG4gKiBBdXRob3IgIDogUmFtZXNoIFJcbiAqIENyZWF0ZWQgOiA3LzEzLzIwMTUgNjoxMiBQTVxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICogVGhpcyBmaWxlIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIGFuZCBjb25kaXRpb25zIGRlZmluZWQgaW5cbiAqIGZpbGUgJ0xJQ0VOU0UnLCB3aGljaCBpcyBwYXJ0IG9mIHRoaXMgc291cmNlIGNvZGUgcGFja2FnZS5cbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqL1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyksXG4gICAgdnIgPSByZXF1aXJlKCcuL3ZyJyksXG4gICAgZGF0YVJlYWRlciA9IHJlcXVpcmUoJy4vZGF0YXJlYWRlcicpLFxuICAgIGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyksXG4gICAgZGF0YUVsZW1lbnRzRGljdCA9IHJlcXVpcmUoJy4vZGljdCcpLmRhdGFFbGVtZW50cztcblxudmFyIERhdGFFbGVtZW50ID0gZnVuY3Rpb24gKHR4UHJvcHMpIHtcblxuICAgIHRoaXMudHhQcm9wcyA9IHR4UHJvcHM7XG5cbiAgICB0aGlzLmlkID0gbnVsbDtcbiAgICB0aGlzLnRhZyA9IG51bGw7XG4gICAgdGhpcy52ciA9IG51bGw7XG4gICAgdGhpcy52YWx1ZUxlbmd0aCA9IG51bGw7XG4gICAgdGhpcy52YWx1ZSA9IG51bGw7XG59O1xuXG5EYXRhRWxlbWVudC5wcm90b3R5cGUucGFyc2UgPSBmdW5jdGlvbiAoYnVmZmVyLCBwb3NpdGlvbiwgb3B0aW9ucykge1xuICAgIHZhciBjdXJyZW50UG9zaXRpb24gPSBwb3NpdGlvbjtcbiAgICB2YXIgcGFyc2luZ0RvbmUgPSBmYWxzZTtcblxuICAgIHRoaXMuaWQgPSB0aGlzLnRhZyA9IHV0aWxzLnJlYWRUYWcoYnVmZmVyLCBjdXJyZW50UG9zaXRpb24sIHRoaXMudHhQcm9wcy5pc0JpZ0VuZGlhbik7XG5cbiAgICAvLy8gTW92aW5nIGZvcndhcmQgXCJjb25zdGFudHMudGFnTGVuZ3RoXCIgYnl0ZXNcbiAgICBjdXJyZW50UG9zaXRpb24gKz0gY29uc3RhbnRzLnRhZ0xlbmd0aDtcblxuICAgIC8vLyBDaGVjayBmb3IgVGFnIGRlbGltaXRlcnNcbiAgICBpZiAoY29uc3RhbnRzLmRlbGltaXRlclRhZ3MuaW5kZXhPZih0aGlzLmlkKSA+IC0xKSB7XG4gICAgICAgIHRoaXMudnIgPSBudWxsO1xuICAgICAgICB0aGlzLnZhbHVlTGVuZ3RoID0gdXRpbHMucmVhZEludGVnZXIoYnVmZmVyLCBjdXJyZW50UG9zaXRpb24sIDQpO1xuICAgICAgICBjdXJyZW50UG9zaXRpb24gKz0gNDtcblxuICAgICAgICBpZiAodGhpcy50YWcgPT09IGNvbnN0YW50cy5pdGVtU3RhcnRUYWcgJiYgb3B0aW9ucyAmJiBvcHRpb25zLnNlYXJjaFNlcUl0ZW0pIHtcbiAgICAgICAgICAgIHJldHVybiBjdXJyZW50UG9zaXRpb247XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy50YWcgPT09IGNvbnN0YW50cy5pdGVtU3RhcnRUYWcgJiYgdGhpcy52YWx1ZUxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHRoaXMudmFsdWUgPSBkYXRhUmVhZGVyLnJlYWQoYnVmZmVyLCBjdXJyZW50UG9zaXRpb24sIHRoaXMudmFsdWVMZW5ndGgsIHRoaXMudnIsIHRoaXMudHhQcm9wcy5pc0JpZ0VuZGlhbik7XG4gICAgICAgICAgICBjdXJyZW50UG9zaXRpb24gKz0gdGhpcy52YWx1ZUxlbmd0aDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjdXJyZW50UG9zaXRpb247XG4gICAgfVxuXG4gICAgaWYgKHRoaXMudHhQcm9wcy5pc0ltcGxpY2l0KSB7XG4gICAgICAgIHZhciBlbGVtZW50SW5mbyA9IGRhdGFFbGVtZW50c0RpY3RbdGhpcy50YWddO1xuXG4gICAgICAgIGlmIChlbGVtZW50SW5mbykge1xuICAgICAgICAgICAgdGhpcy52ciA9IGVsZW1lbnRJbmZvLnZyO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMudGFnLnN1YnN0cmluZyg0LCA4KSA9PT0gJzAwMDAnKSB7XG4gICAgICAgICAgICB0aGlzLnZyID0gJ1VMJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMudnIgPSAnVU4nO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy52YWx1ZUxlbmd0aCA9IHV0aWxzLnJlYWRJbnRlZ2VyKGJ1ZmZlciwgY3VycmVudFBvc2l0aW9uLCA0LCB0aGlzLnR4UHJvcHMuaXNCaWdFbmRpYW4pO1xuICAgICAgICBjdXJyZW50UG9zaXRpb24gKz0gNDtcbiAgICB9IGVsc2UgeyAvLy8gRXhwbGljaXQgVlJzXG4gICAgICAgIHRoaXMudnIgPSB1dGlscy5yZWFkVnIoYnVmZmVyLCBjdXJyZW50UG9zaXRpb24sIGNvbnN0YW50cy52ckxlbmd0aCk7XG5cbiAgICAgICAgLy8vIGZvciBWUnMgb2YgT0IsIE9XLCBPRiwgU1EgYW5kIFVOIHRoZSAxNiBiaXRzIGZvbGxvd2luZyB0aGUgdHdvIGNoYXJhY3RlciBWUiBGaWVsZCBhcmVcbiAgICAgICAgLy8vIHJlc2VydmVkIGZvciB1c2UgYnkgbGF0ZXIgdmVyc2lvbnMgb2YgdGhlIERJQ09NIFN0YW5kYXJkLiBUaGVzZSByZXNlcnZlZCBieXRlcyBzaGFsbCBiZSBzZXRcbiAgICAgICAgLy8vIHRvIDAwMDBIIGFuZCBzaGFsbCBub3QgYmUgdXNlZCBvciBkZWNvZGVkIChUYWJsZSA3LjEtMSkuXG4gICAgICAgIC8vLyBmb3IgVlJzIG9mIFVUIHRoZSAxNiBiaXRzIGZvbGxvd2luZyB0aGUgdHdvIGNoYXJhY3RlciBWUiBGaWVsZCBhcmUgcmVzZXJ2ZWQgZm9yIHVzZSBieSBsYXRlclxuICAgICAgICAvLy8gdmVyc2lvbnMgb2YgdGhlIERJQ09NIFN0YW5kYXJkLiBUaGVzZSByZXNlcnZlZCBieXRlcyBzaGFsbCBiZSBzZXQgdG8gMDAwMEggYW5kIHNoYWxsIG5vdCBiZVxuICAgICAgICAvLy8gdXNlZCBvciBkZWNvZGVkLlxuICAgICAgICAvLy8gZm9yIGFsbCBvdGhlciBWUnMgdGhlIFZhbHVlIExlbmd0aCBGaWVsZCBpcyB0aGUgMTYtYml0IHVuc2lnbmVkIGludGVnZXIgZm9sbG93aW5nIHRoZSB0d29cbiAgICAgICAgLy8vIGNoYXJhY3RlciBWUiBGaWVsZCAoVGFibGUgNy4xLTIpXG4gICAgICAgIC8vLyAuLi4gU28gYWRkaW5nIHZyTGVuZ3RoKDIvNCkgaW5zdGVhZCBvZiAyKGNvbnN0YW50cy52ckxlbmd0aClcbiAgICAgICAgdmFyIHZyUHJvcHMgPSB2ci5nZXRMZW5ndGgodGhpcy52cik7XG4gICAgICAgIGN1cnJlbnRQb3NpdGlvbiArPSBjb25zdGFudHMudnJMZW5ndGg7XG4gICAgICAgIGN1cnJlbnRQb3NpdGlvbiArPSB2clByb3BzLnJlc2VydmVkO1xuXG4gICAgICAgIHRoaXMudmFsdWVMZW5ndGggPSB1dGlscy5yZWFkSW50ZWdlcihidWZmZXIsIGN1cnJlbnRQb3NpdGlvbiwgdnJQcm9wcy5sZW5ndGgsIHRoaXMudHhQcm9wcy5pc0JpZ0VuZGlhbik7XG5cbiAgICAgICAgY3VycmVudFBvc2l0aW9uICs9IHZyUHJvcHMubGVuZ3RoO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnZyID09IGNvbnN0YW50cy5zZXF1ZW5jZVZyKSB7XG4gICAgICAgIHRoaXMuc2VxdWVuY2VJdGVtcyA9IFtdO1xuICAgICAgICB0aGlzLmlzU2VxdWVuY2UgPSB0cnVlO1xuXG4gICAgICAgIHBhcnNpbmdEb25lID0gdHJ1ZTtcblxuICAgICAgICB2YXIgZWxlbWVudCA9IG5ldyBEYXRhRWxlbWVudCh0aGlzLnR4UHJvcHMpO1xuICAgICAgICB2YXIgY3VycmVudFBvc2l0aW9uU2VxID0gZWxlbWVudC5wYXJzZShidWZmZXIsIGN1cnJlbnRQb3NpdGlvbiwge3NlYXJjaFNlcUl0ZW06IHRydWV9KTtcblxuICAgICAgICBpZiAoZWxlbWVudC5pZCA9PSBjb25zdGFudHMuc2VxdWVuY2VEZWxpbWl0ZXJUYWcpIHtcbiAgICAgICAgICAgIHRoaXMudmFsdWVMZW5ndGggPSBjdXJyZW50UG9zaXRpb25TZXEgLSBjdXJyZW50UG9zaXRpb247XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgaXNJbXBsaWNpdFZyID0gZWxlbWVudC52YWx1ZUxlbmd0aCA9PSAnRkZGRkZGRkYnOyAvLyBpdGVtU3RhcnQudmFsdWVMZW5ndGggPT0gRkZGRkZGRkZcbiAgICAgICAgICAgIGlmIChpc0ltcGxpY2l0VnIpIHtcbiAgICAgICAgICAgICAgICB2YXIgaXRlbXMgPSB7fTtcbiAgICAgICAgICAgICAgICBlbGVtZW50ID0gbmV3IERhdGFFbGVtZW50KHRoaXMudHhQcm9wcyk7XG4gICAgICAgICAgICAgICAgY3VycmVudFBvc2l0aW9uU2VxID0gZWxlbWVudC5wYXJzZShidWZmZXIsIGN1cnJlbnRQb3NpdGlvblNlcSwge3NlYXJjaFNlcUl0ZW06IHRydWV9KTtcblxuICAgICAgICAgICAgICAgIHdoaWxlIChlbGVtZW50LmlkICE9IGNvbnN0YW50cy5zZXF1ZW5jZURlbGltaXRlclRhZykgeyAvLy8gU2VxdWVuY2UgZGVsaW1pdGVyXG4gICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LmlkID09IGNvbnN0YW50cy5pdGVtRGVsaW1pdGVyVGFnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNlcXVlbmNlSXRlbXMucHVzaChpdGVtcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtcyA9IHt9O1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXNbZWxlbWVudC5pZF0gPSBlbGVtZW50O1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudCA9IG5ldyBEYXRhRWxlbWVudCh0aGlzLnR4UHJvcHMpO1xuICAgICAgICAgICAgICAgICAgICBjdXJyZW50UG9zaXRpb25TZXEgPSBlbGVtZW50LnBhcnNlKGJ1ZmZlciwgY3VycmVudFBvc2l0aW9uU2VxLCB7c2VhcmNoU2VxSXRlbTogdHJ1ZX0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHRoaXMudmFsdWVMZW5ndGggPSBjdXJyZW50UG9zaXRpb25TZXEgLSBjdXJyZW50UG9zaXRpb247XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vLyBObyBzZXF1ZW5jZSBkZWxpbXRlcnNcbiAgICAgICAgICAgICAgICAvLy8gVE9ETzogTmVlZCB0byBzZXBhcmF0ZSBlbGVtZW50cyB0byB0aGVpciBvd24gaXRlbVxuICAgICAgICAgICAgICAgIHZhciBpdGVtcyA9IHt9O1xuICAgICAgICAgICAgICAgIHdoaWxlIChjdXJyZW50UG9zaXRpb25TZXEgPCBjdXJyZW50UG9zaXRpb24gKyBjb25zdGFudHMudGFnTGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBlbGVtZW50ID0gbmV3IERhdGFFbGVtZW50KHRoaXMudHhQcm9wcyk7XG5cbiAgICAgICAgICAgICAgICAgICAgY3VycmVudFBvc2l0aW9uU2VxID0gZWxlbWVudC5wYXJzZShidWZmZXIsIGN1cnJlbnRQb3NpdGlvblNlcSk7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW1zW2VsZW1lbnQuaWRdID0gZWxlbWVudDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aGlzLnNlcXVlbmNlSXRlbXMucHVzaChpdGVtcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLy8gUGl4ZWwgRGF0YSBpbiBPQlxuICAgIGlmICh0aGlzLnZyID09ICdPQicgJiYgdGhpcy52YWx1ZUxlbmd0aCA8PSAwKSB7XG4gICAgICAgIHRoaXMuaXNQaXhlbERhdGEgPSB0cnVlO1xuXG4gICAgICAgIHBhcnNpbmdEb25lID0gdHJ1ZTtcbiAgICAgICAgdmFyIGVsZW1lbnQgPSBuZXcgRGF0YUVsZW1lbnQodGhpcy50eFByb3BzKTtcbiAgICAgICAgdmFyIGN1cnJlbnRQb3NpdGlvblNlcSA9IGVsZW1lbnQucGFyc2UoYnVmZmVyLCBjdXJyZW50UG9zaXRpb24sIHtzZWFyY2hTZXFJdGVtOiB0cnVlfSk7XG5cbiAgICAgICAgdGhpcy5waXhlbERhdGFJdGVtcyA9IFtdO1xuICAgICAgICBpZiAoZWxlbWVudC5pZCA9PSBjb25zdGFudHMuaXRlbVN0YXJ0VGFnKSB7XG5cbiAgICAgICAgICAgIHdoaWxlIChlbGVtZW50LmlkICE9IGNvbnN0YW50cy5zZXF1ZW5jZURlbGltaXRlclRhZykge1xuICAgICAgICAgICAgICAgIHRoaXMucGl4ZWxEYXRhSXRlbXMucHVzaChlbGVtZW50KTtcblxuICAgICAgICAgICAgICAgIGVsZW1lbnQgPSBuZXcgRGF0YUVsZW1lbnQodGhpcy50eFByb3BzKTtcbiAgICAgICAgICAgICAgICBjdXJyZW50UG9zaXRpb25TZXEgPSBlbGVtZW50LnBhcnNlKGJ1ZmZlciwgY3VycmVudFBvc2l0aW9uU2VxKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy52YWx1ZUxlbmd0aCA9IGN1cnJlbnRQb3NpdGlvblNlcSAtIGN1cnJlbnRQb3NpdGlvbjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0aGlzLnZhbHVlTGVuZ3RoIDw9IDApIHtcbiAgICAgICAgdGhpcy52YWx1ZSA9IG51bGw7XG4gICAgICAgIHJldHVybiBjdXJyZW50UG9zaXRpb247XG4gICAgfVxuXG4gICAgaWYgKCFwYXJzaW5nRG9uZSkge1xuICAgICAgICB0aGlzLnZhbHVlID0gZGF0YVJlYWRlci5yZWFkKGJ1ZmZlciwgY3VycmVudFBvc2l0aW9uLCB0aGlzLnZhbHVlTGVuZ3RoLCB0aGlzLnZyLCB0aGlzLnR4UHJvcHMuaXNCaWdFbmRpYW4pO1xuICAgIH1cblxuICAgIGN1cnJlbnRQb3NpdGlvbiArPSB0aGlzLnZhbHVlTGVuZ3RoO1xuXG4gICAgcmV0dXJuIGN1cnJlbnRQb3NpdGlvbjtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRGF0YUVsZW1lbnQ7IiwiLyoqXG4gKiBBdXRob3IgIDogUmFtZXNoIFJcbiAqIENyZWF0ZWQgOiA3LzE0LzIwMTUgNDo0NyBQTVxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICogVGhpcyBmaWxlIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIGFuZCBjb25kaXRpb25zIGRlZmluZWQgaW5cbiAqIGZpbGUgJ0xJQ0VOU0UnLCB3aGljaCBpcyBwYXJ0IG9mIHRoaXMgc291cmNlIGNvZGUgcGFja2FnZS5cbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqL1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgLy8vIEFwcGxpY2F0aW9uIEVudGl0eVxuICAgICdBRSc6IHV0aWxzLnJlYWRTdHJpbmdEYXRhLFxuXG4gICAgLy8vIEFnZSBTdHJpbmdcbiAgICAnQVMnOiB1dGlscy5yZWFkU3RyaW5nRGF0YSxcblxuICAgIC8vLyBBdHRyaWJ1dGUgVGFnXG4gICAgJ0FUJzogdXRpbHMucmVhZFN0cmluZ0RhdGEsXG5cbiAgICAvLy8gQ29kZSBTdHJpbmdcbiAgICAnQ1MnOiB1dGlscy5yZWFkU3RyaW5nRGF0YSxcblxuICAgIC8vLyBEYXRlKFlZWVlNTUREKVxuICAgICdEQSc6IHV0aWxzLnJlYWRTdHJpbmdEYXRhLFxuXG4gICAgLy8vIERlY2ltYWwgU3RyaW5nXG4gICAgJ0RTJzogdXRpbHMucmVhZEZsb2F0LFxuXG4gICAgLy8vIERhdGVUaW1lKFlZWVlNTURESEhNTVNTLkZGRkZGRiZaWlhYKVxuICAgICdEVCc6IHV0aWxzLnJlYWRTdHJpbmdEYXRhLFxuXG4gICAgLy8vIEZsb2F0aW5nIFBvaW50IFNpbmdsZVxuICAgICdGTCc6IHV0aWxzLnJlYWRTdHJpbmdEYXRhLFxuXG4gICAgLy8vIEZsb2F0aW5nIFBvaW50IERvdWJsZVxuICAgICdGRCc6IHV0aWxzLnJlYWRTdHJpbmdEYXRhLFxuXG4gICAgLy8vIEludGVnZXIgU3RyaW5nXG4gICAgJ0lTJzogdXRpbHMucmVhZEludGVnZXIsXG5cbiAgICAvLy8gTG9uZyBTdHJpbmdcbiAgICAnTE8nOiB1dGlscy5yZWFkU3RyaW5nRGF0YSxcblxuICAgIC8vLyBMb25nIFRleHRcbiAgICAnTFQnOiB1dGlscy5yZWFkU3RyaW5nRGF0YSxcblxuICAgIC8vLyBPdGhlciBCeXRlIFN0cmluZ1xuICAgICdPQic6IHV0aWxzLnJlYWRVSW50OEFycmF5LFxuXG4gICAgLy8vIE90aGVyIERvdWJsZSBTdHJpbmdcbiAgICAnT0QnOiB1dGlscy5yZWFkU3RyaW5nRGF0YSxcblxuICAgIC8vLyBPdGhlciBGbG9hdCBTdHJpbmdcbiAgICAnT0YnOiB1dGlscy5yZWFkU3RyaW5nRGF0YSxcblxuICAgIC8vLyBPdGhlciB3b3JkIFN0cmluZ1xuICAgICdPVyc6IHV0aWxzLnJlYWRVSW50MTZBcnJheSxcblxuICAgIC8vLyBQZXJzb24gTmFtZVxuICAgICdQTic6IHV0aWxzLnJlYWRTdHJpbmdEYXRhLFxuXG4gICAgLy8vIFNob3J0IFN0cmluZ1xuICAgICdTSCc6IHV0aWxzLnJlYWRTdHJpbmdEYXRhLFxuXG4gICAgLy8vIFNpZ25lZCBMb25nXG4gICAgJ1NMJzogdXRpbHMucmVhZEludGVnZXIsXG5cbiAgICAvLy8gU2VxdWVuY2Ugb2YgSXRlbXNcbiAgICAnU1EnOiB1dGlscy5yZWFkQmluYXJ5LFxuXG4gICAgLy8vIFNpZ25lZCBzaG9ydFxuICAgICdTUyc6IHV0aWxzLnJlYWRJbnRlZ2VyLFxuXG4gICAgLy8vIFNob3J0IFRleHRcbiAgICAnU1QnOiB1dGlscy5yZWFkU3RyaW5nRGF0YSxcblxuICAgIC8vLyBUaW1lXG4gICAgJ1RNJzogdXRpbHMucmVhZFN0cmluZ0RhdGEsXG5cbiAgICAvLy8gVW5saW1pdGVkIENoYXJhY3RlcnNcbiAgICAnVUMnOiB1dGlscy5yZWFkU3RyaW5nRGF0YSxcblxuICAgIC8vLyBVSUQtVW5pcXVlIElkZW50aWZpZXJcbiAgICAnVUknOiB1dGlscy5yZWFkU3RyaW5nRGF0YSxcblxuICAgIC8vLyBVbnNpZ25lZCBMb25nXG4gICAgJ1VMJzogdXRpbHMucmVhZFVuc2lnbmVkSW50ZWdlcixcblxuICAgIC8vLyBVbmtub3duXG4gICAgJ1VOJzogdXRpbHMucmVhZEJpbmFyeSxcblxuICAgIC8vLyBVUkkvVVJMXG4gICAgJ1VSJzogdXRpbHMucmVhZFN0cmluZ0RhdGEsXG5cbiAgICAvLy8gVW5zaWduZWQgU2hvcnRcbiAgICAnVVMnOiB1dGlscy5yZWFkVW5zaWduZWRJbnRlZ2VyLFxuXG4gICAgLy8vIFVubGltaXRlZCBUZXh0XG4gICAgJ1VUJzogdXRpbHMucmVhZFN0cmluZ0RhdGEsXG5cbiAgICByZWFkOiBmdW5jdGlvbiAoYnVmZmVyLCBwb3NpdGlvbiwgbGVuZ3RoLCB2ciwgaXNCaWdFbmRpYW4pIHtcbiAgICAgICAgdmFyIHJlYWRlciA9IHRoaXNbdnJdID8gdGhpc1t2cl0gOiB1dGlscy5yZWFkQmluYXJ5O1xuICAgICAgICByZXR1cm4gcmVhZGVyKGJ1ZmZlciwgcG9zaXRpb24sIGxlbmd0aCwgaXNCaWdFbmRpYW4sIHV0aWxzKTtcbiAgICB9XG59OyIsIi8qKlxuICogQXV0aG9yICA6IFJhbWVzaCBSXG4gKiBDcmVhdGVkIDogNy8xNS8yMDE1IDEyOjAxIEFNXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKiBUaGlzIGZpbGUgaXMgc3ViamVjdCB0byB0aGUgdGVybXMgYW5kIGNvbmRpdGlvbnMgZGVmaW5lZCBpblxuICogZmlsZSAnTElDRU5TRScsIHdoaWNoIGlzIHBhcnQgb2YgdGhpcyBzb3VyY2UgY29kZSBwYWNrYWdlLlxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICovXG5cbnZhciBEY21GaWxlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMubWV0YUVsZW1lbnRzID0ge307XG4gICAgdGhpcy5kYXRhc2V0ID0ge307XG5cbiAgICB0aGlzLnBpeGVsRGF0YSA9IG51bGw7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IERjbUZpbGU7XG4gIiwiLyoqXG4gKiBBdXRob3IgIDogUmFtZXNoIFJcbiAqIENyZWF0ZWQgOiA3LzE0LzIwMTUgNDo0NiBQTVxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICogVGhpcyBmaWxlIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIGFuZCBjb25kaXRpb25zIGRlZmluZWQgaW5cbiAqIGZpbGUgJ0xJQ0VOU0UnLCB3aGljaCBpcyBwYXJ0IG9mIHRoaXMgc291cmNlIGNvZGUgcGFja2FnZS5cbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqL1xuXG4vLy8gUGFydCA2OiBEYXRhIERpY3Rpb25hcnlcbi8vLyBodHRwOi8vbWVkaWNhbC5uZW1hLm9yZy9EaWNvbS8yMDExLzExXzA2cHUucGRmXG5cbnZhciBkYXRhRWxlbWVudHMgPSB7XG4gICAgXCIwMDAwMDAwMFwiOiB7dnI6IFwiVUxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvbW1hbmRHcm91cExlbmd0aFwifSxcbiAgICBcIjAwMDAwMDAxXCI6IHt2cjogXCJVTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29tbWFuZExlbmd0aFRvRW5kXCJ9LFxuICAgIFwiMDAwMDAwMDJcIjoge3ZyOiBcIlVJXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBZmZlY3RlZFNPUENsYXNzVUlEXCJ9LFxuICAgIFwiMDAwMDAwMDNcIjoge3ZyOiBcIlVJXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZXF1ZXN0ZWRTT1BDbGFzc1VJRFwifSxcbiAgICBcIjAwMDAwMDEwXCI6IHt2cjogXCJTSFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29tbWFuZFJlY29nbml0aW9uQ29kZVwifSxcbiAgICBcIjAwMDAwMTAwXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29tbWFuZEZpZWxkXCJ9LFxuICAgIFwiMDAwMDAxMTBcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNZXNzYWdlSURcIn0sXG4gICAgXCIwMDAwMDEyMFwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk1lc3NhZ2VJREJlaW5nUmVzcG9uZGVkVG9cIn0sXG4gICAgXCIwMDAwMDIwMFwiOiB7dnI6IFwiQUVcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkluaXRpYXRvclwifSxcbiAgICBcIjAwMDAwMzAwXCI6IHt2cjogXCJBRVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVjZWl2ZXJcIn0sXG4gICAgXCIwMDAwMDQwMFwiOiB7dnI6IFwiQUVcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkZpbmRMb2NhdGlvblwifSxcbiAgICBcIjAwMDAwNjAwXCI6IHt2cjogXCJBRVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTW92ZURlc3RpbmF0aW9uXCJ9LFxuICAgIFwiMDAwMDA3MDBcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQcmlvcml0eVwifSxcbiAgICBcIjAwMDAwODAwXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29tbWFuZERhdGFTZXRUeXBlXCJ9LFxuICAgIFwiMDAwMDA4NTBcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJOdW1iZXJPZk1hdGNoZXNcIn0sXG4gICAgXCIwMDAwMDg2MFwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlc3BvbnNlU2VxdWVuY2VOdW1iZXJcIn0sXG4gICAgXCIwMDAwMDkwMFwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlN0YXR1c1wifSxcbiAgICBcIjAwMDAwOTAxXCI6IHt2cjogXCJBVFwiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJPZmZlbmRpbmdFbGVtZW50XCJ9LFxuICAgIFwiMDAwMDA5MDJcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJFcnJvckNvbW1lbnRcIn0sXG4gICAgXCIwMDAwMDkwM1wiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkVycm9ySURcIn0sXG4gICAgXCIwMDAwMTAwMFwiOiB7dnI6IFwiVUlcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFmZmVjdGVkU09QSW5zdGFuY2VVSURcIn0sXG4gICAgXCIwMDAwMTAwMVwiOiB7dnI6IFwiVUlcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlcXVlc3RlZFNPUEluc3RhbmNlVUlEXCJ9LFxuICAgIFwiMDAwMDEwMDJcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJFdmVudFR5cGVJRFwifSxcbiAgICBcIjAwMDAxMDA1XCI6IHt2cjogXCJBVFwiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJBdHRyaWJ1dGVJZGVudGlmaWVyTGlzdFwifSxcbiAgICBcIjAwMDAxMDA4XCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQWN0aW9uVHlwZUlEXCJ9LFxuICAgIFwiMDAwMDEwMjBcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJOdW1iZXJPZlJlbWFpbmluZ1N1Ym9wZXJhdGlvbnNcIn0sXG4gICAgXCIwMDAwMTAyMVwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk51bWJlck9mQ29tcGxldGVkU3Vib3BlcmF0aW9uc1wifSxcbiAgICBcIjAwMDAxMDIyXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTnVtYmVyT2ZGYWlsZWRTdWJvcGVyYXRpb25zXCJ9LFxuICAgIFwiMDAwMDEwMjNcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJOdW1iZXJPZldhcm5pbmdTdWJvcGVyYXRpb25zXCJ9LFxuICAgIFwiMDAwMDEwMzBcIjoge3ZyOiBcIkFFXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNb3ZlT3JpZ2luYXRvckFwcGxpY2F0aW9uRW50aXR5VGl0bGVcIn0sXG4gICAgXCIwMDAwMTAzMVwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk1vdmVPcmlnaW5hdG9yTWVzc2FnZUlEXCJ9LFxuICAgIFwiMDAwMDQwMDBcIjoge3ZyOiBcIkxUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEaWFsb2dSZWNlaXZlclwifSxcbiAgICBcIjAwMDA0MDEwXCI6IHt2cjogXCJMVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVGVybWluYWxUeXBlXCJ9LFxuICAgIFwiMDAwMDUwMTBcIjoge3ZyOiBcIlNIXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNZXNzYWdlU2V0SURcIn0sXG4gICAgXCIwMDAwNTAyMFwiOiB7dnI6IFwiU0hcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkVuZE1lc3NhZ2VJRFwifSxcbiAgICBcIjAwMDA1MTEwXCI6IHt2cjogXCJMVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGlzcGxheUZvcm1hdFwifSxcbiAgICBcIjAwMDA1MTIwXCI6IHt2cjogXCJMVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGFnZVBvc2l0aW9uSURcIn0sXG4gICAgXCIwMDAwNTEzMFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRleHRGb3JtYXRJRFwifSxcbiAgICBcIjAwMDA1MTQwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTm9ybWFsUmV2ZXJzZVwifSxcbiAgICBcIjAwMDA1MTUwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQWRkR3JheVNjYWxlXCJ9LFxuICAgIFwiMDAwMDUxNjBcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJCb3JkZXJzXCJ9LFxuICAgIFwiMDAwMDUxNzBcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb3BpZXNcIn0sXG4gICAgXCIwMDAwNTE4MFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvbW1hbmRNYWduaWZpY2F0aW9uVHlwZVwifSxcbiAgICBcIjAwMDA1MTkwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRXJhc2VcIn0sXG4gICAgXCIwMDAwNTFBMFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlByaW50XCJ9LFxuICAgIFwiMDAwMDUxQjBcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIk92ZXJsYXlzXCJ9LFxuICAgIFwiMDAwMjAwMDBcIjoge3ZyOiBcIlVMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJGaWxlTWV0YUluZm9ybWF0aW9uR3JvdXBMZW5ndGhcIn0sXG4gICAgXCIwMDAyMDAwMVwiOiB7dnI6IFwiT0JcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkZpbGVNZXRhSW5mb3JtYXRpb25WZXJzaW9uXCJ9LFxuICAgIFwiMDAwMjAwMDJcIjoge3ZyOiBcIlVJXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNZWRpYVN0b3JhZ2VTT1BDbGFzc1VJRFwifSxcbiAgICBcIjAwMDIwMDAzXCI6IHt2cjogXCJVSVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTWVkaWFTdG9yYWdlU09QSW5zdGFuY2VVSURcIn0sXG4gICAgXCIwMDAyMDAxMFwiOiB7dnI6IFwiVUlcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRyYW5zZmVyU3ludGF4VUlEXCJ9LFxuICAgIFwiMDAwMjAwMTJcIjoge3ZyOiBcIlVJXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbXBsZW1lbnRhdGlvbkNsYXNzVUlEXCJ9LFxuICAgIFwiMDAwMjAwMTNcIjoge3ZyOiBcIlNIXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbXBsZW1lbnRhdGlvblZlcnNpb25OYW1lXCJ9LFxuICAgIFwiMDAwMjAwMTZcIjoge3ZyOiBcIkFFXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTb3VyY2VBcHBsaWNhdGlvbkVudGl0eVRpdGxlXCJ9LFxuICAgIFwiMDAwMjAxMDBcIjoge3ZyOiBcIlVJXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQcml2YXRlSW5mb3JtYXRpb25DcmVhdG9yVUlEXCJ9LFxuICAgIFwiMDAwMjAxMDJcIjoge3ZyOiBcIk9CXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQcml2YXRlSW5mb3JtYXRpb25cIn0sXG4gICAgXCIwMDA0MTEzMFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkZpbGVTZXRJRFwifSxcbiAgICBcIjAwMDQxMTQxXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxLThcIiwgbmFtZTogXCJGaWxlU2V0RGVzY3JpcHRvckZpbGVJRFwifSxcbiAgICBcIjAwMDQxMTQyXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3BlY2lmaWNDaGFyYWN0ZXJTZXRPZkZpbGVTZXREZXNjcmlwdG9yRmlsZVwifSxcbiAgICBcIjAwMDQxMjAwXCI6IHt2cjogXCJVTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiT2Zmc2V0T2ZUaGVGaXJzdERpcmVjdG9yeVJlY29yZE9mVGhlUm9vdERpcmVjdG9yeUVudGl0eVwifSxcbiAgICBcIjAwMDQxMjAyXCI6IHt2cjogXCJVTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiT2Zmc2V0T2ZUaGVMYXN0RGlyZWN0b3J5UmVjb3JkT2ZUaGVSb290RGlyZWN0b3J5RW50aXR5XCJ9LFxuICAgIFwiMDAwNDEyMTJcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJGaWxlU2V0Q29uc2lzdGVuY3lGbGFnXCJ9LFxuICAgIFwiMDAwNDEyMjBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEaXJlY3RvcnlSZWNvcmRTZXF1ZW5jZVwifSxcbiAgICBcIjAwMDQxNDAwXCI6IHt2cjogXCJVTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiT2Zmc2V0T2ZUaGVOZXh0RGlyZWN0b3J5UmVjb3JkXCJ9LFxuICAgIFwiMDAwNDE0MTBcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWNvcmRJblVzZUZsYWdcIn0sXG4gICAgXCIwMDA0MTQyMFwiOiB7dnI6IFwiVUxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk9mZnNldE9mUmVmZXJlbmNlZExvd2VyTGV2ZWxEaXJlY3RvcnlFbnRpdHlcIn0sXG4gICAgXCIwMDA0MTQzMFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRpcmVjdG9yeVJlY29yZFR5cGVcIn0sXG4gICAgXCIwMDA0MTQzMlwiOiB7dnI6IFwiVUlcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlByaXZhdGVSZWNvcmRVSURcIn0sXG4gICAgXCIwMDA0MTUwMFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMS04XCIsIG5hbWU6IFwiUmVmZXJlbmNlZEZpbGVJRFwifSxcbiAgICBcIjAwMDQxNTA0XCI6IHt2cjogXCJVTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTVJEUkRpcmVjdG9yeVJlY29yZE9mZnNldFwifSxcbiAgICBcIjAwMDQxNTEwXCI6IHt2cjogXCJVSVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJlbmNlZFNPUENsYXNzVUlESW5GaWxlXCJ9LFxuICAgIFwiMDAwNDE1MTFcIjoge3ZyOiBcIlVJXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWZlcmVuY2VkU09QSW5zdGFuY2VVSURJbkZpbGVcIn0sXG4gICAgXCIwMDA0MTUxMlwiOiB7dnI6IFwiVUlcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZmVyZW5jZWRUcmFuc2ZlclN5bnRheFVJREluRmlsZVwifSxcbiAgICBcIjAwMDQxNTFBXCI6IHt2cjogXCJVSVwiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJSZWZlcmVuY2VkUmVsYXRlZEdlbmVyYWxTT1BDbGFzc1VJREluRmlsZVwifSxcbiAgICBcIjAwMDQxNjAwXCI6IHt2cjogXCJVTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTnVtYmVyT2ZSZWZlcmVuY2VzXCJ9LFxuICAgIFwiMDAwODAwMDBcIjoge3ZyOiBcIlVMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJHcm91cExlbmd0aFwifSxcbiAgICBcIjAwMDgwMDAxXCI6IHt2cjogXCJVTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTGVuZ3RoVG9FbmRcIn0sXG4gICAgXCIwMDA4MDAwNVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiU3BlY2lmaWNDaGFyYWN0ZXJTZXRcIn0sXG4gICAgXCIwMDA4MDAwNlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkxhbmd1YWdlQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDAwODAwMDhcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjItblwiLCBuYW1lOiBcIkltYWdlVHlwZVwifSxcbiAgICBcIjAwMDgwMDEwXCI6IHt2cjogXCJTSFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVjb2duaXRpb25Db2RlXCJ9LFxuICAgIFwiMDAwODAwMTJcIjoge3ZyOiBcIkRBXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbnN0YW5jZUNyZWF0aW9uRGF0ZVwifSxcbiAgICBcIjAwMDgwMDEzXCI6IHt2cjogXCJUTVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW5zdGFuY2VDcmVhdGlvblRpbWVcIn0sXG4gICAgXCIwMDA4MDAxNFwiOiB7dnI6IFwiVUlcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkluc3RhbmNlQ3JlYXRvclVJRFwifSxcbiAgICBcIjAwMDgwMDE2XCI6IHt2cjogXCJVSVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU09QQ2xhc3NVSURcIn0sXG4gICAgXCIwMDA4MDAxOFwiOiB7dnI6IFwiVUlcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNPUEluc3RhbmNlVUlEXCJ9LFxuICAgIFwiMDAwODAwMUFcIjoge3ZyOiBcIlVJXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIlJlbGF0ZWRHZW5lcmFsU09QQ2xhc3NVSURcIn0sXG4gICAgXCIwMDA4MDAxQlwiOiB7dnI6IFwiVUlcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk9yaWdpbmFsU3BlY2lhbGl6ZWRTT1BDbGFzc1VJRFwifSxcbiAgICBcIjAwMDgwMDIwXCI6IHt2cjogXCJEQVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3R1ZHlEYXRlXCJ9LFxuICAgIFwiMDAwODAwMjFcIjoge3ZyOiBcIkRBXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTZXJpZXNEYXRlXCJ9LFxuICAgIFwiMDAwODAwMjJcIjoge3ZyOiBcIkRBXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBY3F1aXNpdGlvbkRhdGVcIn0sXG4gICAgXCIwMDA4MDAyM1wiOiB7dnI6IFwiREFcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvbnRlbnREYXRlXCJ9LFxuICAgIFwiMDAwODAwMjRcIjoge3ZyOiBcIkRBXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJPdmVybGF5RGF0ZVwifSxcbiAgICBcIjAwMDgwMDI1XCI6IHt2cjogXCJEQVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ3VydmVEYXRlXCJ9LFxuICAgIFwiMDAwODAwMkFcIjoge3ZyOiBcIkRUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBY3F1aXNpdGlvbkRhdGVUaW1lXCJ9LFxuICAgIFwiMDAwODAwMzBcIjoge3ZyOiBcIlRNXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTdHVkeVRpbWVcIn0sXG4gICAgXCIwMDA4MDAzMVwiOiB7dnI6IFwiVE1cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNlcmllc1RpbWVcIn0sXG4gICAgXCIwMDA4MDAzMlwiOiB7dnI6IFwiVE1cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFjcXVpc2l0aW9uVGltZVwifSxcbiAgICBcIjAwMDgwMDMzXCI6IHt2cjogXCJUTVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29udGVudFRpbWVcIn0sXG4gICAgXCIwMDA4MDAzNFwiOiB7dnI6IFwiVE1cIiwgdm06IFwiMVwiLCBuYW1lOiBcIk92ZXJsYXlUaW1lXCJ9LFxuICAgIFwiMDAwODAwMzVcIjoge3ZyOiBcIlRNXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDdXJ2ZVRpbWVcIn0sXG4gICAgXCIwMDA4MDA0MFwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRhdGFTZXRUeXBlXCJ9LFxuICAgIFwiMDAwODAwNDFcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEYXRhU2V0U3VidHlwZVwifSxcbiAgICBcIjAwMDgwMDQyXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTnVjbGVhck1lZGljaW5lU2VyaWVzVHlwZVwifSxcbiAgICBcIjAwMDgwMDUwXCI6IHt2cjogXCJTSFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQWNjZXNzaW9uTnVtYmVyXCJ9LFxuICAgIFwiMDAwODAwNTFcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJc3N1ZXJPZkFjY2Vzc2lvbk51bWJlclNlcXVlbmNlXCJ9LFxuICAgIFwiMDAwODAwNTJcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJRdWVyeVJldHJpZXZlTGV2ZWxcIn0sXG4gICAgXCIwMDA4MDA1NFwiOiB7dnI6IFwiQUVcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiUmV0cmlldmVBRVRpdGxlXCJ9LFxuICAgIFwiMDAwODAwNTZcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbnN0YW5jZUF2YWlsYWJpbGl0eVwifSxcbiAgICBcIjAwMDgwMDU4XCI6IHt2cjogXCJVSVwiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJGYWlsZWRTT1BJbnN0YW5jZVVJRExpc3RcIn0sXG4gICAgXCIwMDA4MDA2MFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk1vZGFsaXR5XCJ9LFxuICAgIFwiMDAwODAwNjFcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIk1vZGFsaXRpZXNJblN0dWR5XCJ9LFxuICAgIFwiMDAwODAwNjJcIjoge3ZyOiBcIlVJXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIlNPUENsYXNzZXNJblN0dWR5XCJ9LFxuICAgIFwiMDAwODAwNjRcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb252ZXJzaW9uVHlwZVwifSxcbiAgICBcIjAwMDgwMDY4XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUHJlc2VudGF0aW9uSW50ZW50VHlwZVwifSxcbiAgICBcIjAwMDgwMDcwXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTWFudWZhY3R1cmVyXCJ9LFxuICAgIFwiMDAwODAwODBcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbnN0aXR1dGlvbk5hbWVcIn0sXG4gICAgXCIwMDA4MDA4MVwiOiB7dnI6IFwiU1RcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkluc3RpdHV0aW9uQWRkcmVzc1wifSxcbiAgICBcIjAwMDgwMDgyXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW5zdGl0dXRpb25Db2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDA4MDA5MFwiOiB7dnI6IFwiUE5cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZmVycmluZ1BoeXNpY2lhbk5hbWVcIn0sXG4gICAgXCIwMDA4MDA5MlwiOiB7dnI6IFwiU1RcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZmVycmluZ1BoeXNpY2lhbkFkZHJlc3NcIn0sXG4gICAgXCIwMDA4MDA5NFwiOiB7dnI6IFwiU0hcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiUmVmZXJyaW5nUGh5c2ljaWFuVGVsZXBob25lTnVtYmVyc1wifSxcbiAgICBcIjAwMDgwMDk2XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJyaW5nUGh5c2ljaWFuSWRlbnRpZmljYXRpb25TZXF1ZW5jZVwifSxcbiAgICBcIjAwMDgwMTAwXCI6IHt2cjogXCJTSFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29kZVZhbHVlXCJ9LFxuICAgIFwiMDAwODAxMDJcIjoge3ZyOiBcIlNIXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb2RpbmdTY2hlbWVEZXNpZ25hdG9yXCJ9LFxuICAgIFwiMDAwODAxMDNcIjoge3ZyOiBcIlNIXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb2RpbmdTY2hlbWVWZXJzaW9uXCJ9LFxuICAgIFwiMDAwODAxMDRcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb2RlTWVhbmluZ1wifSxcbiAgICBcIjAwMDgwMTA1XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTWFwcGluZ1Jlc291cmNlXCJ9LFxuICAgIFwiMDAwODAxMDZcIjoge3ZyOiBcIkRUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb250ZXh0R3JvdXBWZXJzaW9uXCJ9LFxuICAgIFwiMDAwODAxMDdcIjoge3ZyOiBcIkRUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb250ZXh0R3JvdXBMb2NhbFZlcnNpb25cIn0sXG4gICAgXCIwMDA4MDEwQlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvbnRleHRHcm91cEV4dGVuc2lvbkZsYWdcIn0sXG4gICAgXCIwMDA4MDEwQ1wiOiB7dnI6IFwiVUlcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvZGluZ1NjaGVtZVVJRFwifSxcbiAgICBcIjAwMDgwMTBEXCI6IHt2cjogXCJVSVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29udGV4dEdyb3VwRXh0ZW5zaW9uQ3JlYXRvclVJRFwifSxcbiAgICBcIjAwMDgwMTBGXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29udGV4dElkZW50aWZpZXJcIn0sXG4gICAgXCIwMDA4MDExMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvZGluZ1NjaGVtZUlkZW50aWZpY2F0aW9uU2VxdWVuY2VcIn0sXG4gICAgXCIwMDA4MDExMlwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvZGluZ1NjaGVtZVJlZ2lzdHJ5XCJ9LFxuICAgIFwiMDAwODAxMTRcIjoge3ZyOiBcIlNUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb2RpbmdTY2hlbWVFeHRlcm5hbElEXCJ9LFxuICAgIFwiMDAwODAxMTVcIjoge3ZyOiBcIlNUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb2RpbmdTY2hlbWVOYW1lXCJ9LFxuICAgIFwiMDAwODAxMTZcIjoge3ZyOiBcIlNUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb2RpbmdTY2hlbWVSZXNwb25zaWJsZU9yZ2FuaXphdGlvblwifSxcbiAgICBcIjAwMDgwMTE3XCI6IHt2cjogXCJVSVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29udGV4dFVJRFwifSxcbiAgICBcIjAwMDgwMjAxXCI6IHt2cjogXCJTSFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVGltZXpvbmVPZmZzZXRGcm9tVVRDXCJ9LFxuICAgIFwiMDAwODEwMDBcIjoge3ZyOiBcIkFFXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJOZXR3b3JrSURcIn0sXG4gICAgXCIwMDA4MTAxMFwiOiB7dnI6IFwiU0hcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlN0YXRpb25OYW1lXCJ9LFxuICAgIFwiMDAwODEwMzBcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTdHVkeURlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMDAwODEwMzJcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQcm9jZWR1cmVDb2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDA4MTAzRVwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNlcmllc0Rlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMDAwODEwM0ZcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTZXJpZXNEZXNjcmlwdGlvbkNvZGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwMDgxMDQwXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW5zdGl0dXRpb25hbERlcGFydG1lbnROYW1lXCJ9LFxuICAgIFwiMDAwODEwNDhcIjoge3ZyOiBcIlBOXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIlBoeXNpY2lhbnNPZlJlY29yZFwifSxcbiAgICBcIjAwMDgxMDQ5XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGh5c2ljaWFuc09mUmVjb3JkSWRlbnRpZmljYXRpb25TZXF1ZW5jZVwifSxcbiAgICBcIjAwMDgxMDUwXCI6IHt2cjogXCJQTlwiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJQZXJmb3JtaW5nUGh5c2ljaWFuTmFtZVwifSxcbiAgICBcIjAwMDgxMDUyXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGVyZm9ybWluZ1BoeXNpY2lhbklkZW50aWZpY2F0aW9uU2VxdWVuY2VcIn0sXG4gICAgXCIwMDA4MTA2MFwiOiB7dnI6IFwiUE5cIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiTmFtZU9mUGh5c2ljaWFuc1JlYWRpbmdTdHVkeVwifSxcbiAgICBcIjAwMDgxMDYyXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGh5c2ljaWFuc1JlYWRpbmdTdHVkeUlkZW50aWZpY2F0aW9uU2VxdWVuY2VcIn0sXG4gICAgXCIwMDA4MTA3MFwiOiB7dnI6IFwiUE5cIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiT3BlcmF0b3JzTmFtZVwifSxcbiAgICBcIjAwMDgxMDcyXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiT3BlcmF0b3JJZGVudGlmaWNhdGlvblNlcXVlbmNlXCJ9LFxuICAgIFwiMDAwODEwODBcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIkFkbWl0dGluZ0RpYWdub3Nlc0Rlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMDAwODEwODRcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBZG1pdHRpbmdEaWFnbm9zZXNDb2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDA4MTA5MFwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIk1hbnVmYWN0dXJlck1vZGVsTmFtZVwifSxcbiAgICBcIjAwMDgxMTAwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJlbmNlZFJlc3VsdHNTZXF1ZW5jZVwifSxcbiAgICBcIjAwMDgxMTEwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJlbmNlZFN0dWR5U2VxdWVuY2VcIn0sXG4gICAgXCIwMDA4MTExMVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZmVyZW5jZWRQZXJmb3JtZWRQcm9jZWR1cmVTdGVwU2VxdWVuY2VcIn0sXG4gICAgXCIwMDA4MTExNVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZmVyZW5jZWRTZXJpZXNTZXF1ZW5jZVwifSxcbiAgICBcIjAwMDgxMTIwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJlbmNlZFBhdGllbnRTZXF1ZW5jZVwifSxcbiAgICBcIjAwMDgxMTI1XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJlbmNlZFZpc2l0U2VxdWVuY2VcIn0sXG4gICAgXCIwMDA4MTEzMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZmVyZW5jZWRPdmVybGF5U2VxdWVuY2VcIn0sXG4gICAgXCIwMDA4MTEzNFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZmVyZW5jZWRTdGVyZW9tZXRyaWNJbnN0YW5jZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDAwODExM0FcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWZlcmVuY2VkV2F2ZWZvcm1TZXF1ZW5jZVwifSxcbiAgICBcIjAwMDgxMTQwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJlbmNlZEltYWdlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDA4MTE0NVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZmVyZW5jZWRDdXJ2ZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDAwODExNEFcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWZlcmVuY2VkSW5zdGFuY2VTZXF1ZW5jZVwifSxcbiAgICBcIjAwMDgxMTRCXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJlbmNlZFJlYWxXb3JsZFZhbHVlTWFwcGluZ0luc3RhbmNlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDA4MTE1MFwiOiB7dnI6IFwiVUlcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZmVyZW5jZWRTT1BDbGFzc1VJRFwifSxcbiAgICBcIjAwMDgxMTU1XCI6IHt2cjogXCJVSVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJlbmNlZFNPUEluc3RhbmNlVUlEXCJ9LFxuICAgIFwiMDAwODExNUFcIjoge3ZyOiBcIlVJXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIlNPUENsYXNzZXNTdXBwb3J0ZWRcIn0sXG4gICAgXCIwMDA4MTE2MFwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiUmVmZXJlbmNlZEZyYW1lTnVtYmVyXCJ9LFxuICAgIFwiMDAwODExNjFcIjoge3ZyOiBcIlVMXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIlNpbXBsZUZyYW1lTGlzdFwifSxcbiAgICBcIjAwMDgxMTYyXCI6IHt2cjogXCJVTFwiLCB2bTogXCIzLTNuXCIsIG5hbWU6IFwiQ2FsY3VsYXRlZEZyYW1lTGlzdFwifSxcbiAgICBcIjAwMDgxMTYzXCI6IHt2cjogXCJGRFwiLCB2bTogXCIyXCIsIG5hbWU6IFwiVGltZVJhbmdlXCJ9LFxuICAgIFwiMDAwODExNjRcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJGcmFtZUV4dHJhY3Rpb25TZXF1ZW5jZVwifSxcbiAgICBcIjAwMDgxMTY3XCI6IHt2cjogXCJVSVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTXVsdGlGcmFtZVNvdXJjZVNPUEluc3RhbmNlVUlEXCJ9LFxuICAgIFwiMDAwODExOTVcIjoge3ZyOiBcIlVJXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUcmFuc2FjdGlvblVJRFwifSxcbiAgICBcIjAwMDgxMTk3XCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRmFpbHVyZVJlYXNvblwifSxcbiAgICBcIjAwMDgxMTk4XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRmFpbGVkU09QU2VxdWVuY2VcIn0sXG4gICAgXCIwMDA4MTE5OVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZmVyZW5jZWRTT1BTZXF1ZW5jZVwifSxcbiAgICBcIjAwMDgxMjAwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3R1ZGllc0NvbnRhaW5pbmdPdGhlclJlZmVyZW5jZWRJbnN0YW5jZXNTZXF1ZW5jZVwifSxcbiAgICBcIjAwMDgxMjUwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVsYXRlZFNlcmllc1NlcXVlbmNlXCJ9LFxuICAgIFwiMDAwODIxMTBcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJMb3NzeUltYWdlQ29tcHJlc3Npb25SZXRpcmVkXCJ9LFxuICAgIFwiMDAwODIxMTFcIjoge3ZyOiBcIlNUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEZXJpdmF0aW9uRGVzY3JpcHRpb25cIn0sXG4gICAgXCIwMDA4MjExMlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNvdXJjZUltYWdlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDA4MjEyMFwiOiB7dnI6IFwiU0hcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlN0YWdlTmFtZVwifSxcbiAgICBcIjAwMDgyMTIyXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3RhZ2VOdW1iZXJcIn0sXG4gICAgXCIwMDA4MjEyNFwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk51bWJlck9mU3RhZ2VzXCJ9LFxuICAgIFwiMDAwODIxMjdcIjoge3ZyOiBcIlNIXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJWaWV3TmFtZVwifSxcbiAgICBcIjAwMDgyMTI4XCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiVmlld051bWJlclwifSxcbiAgICBcIjAwMDgyMTI5XCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTnVtYmVyT2ZFdmVudFRpbWVyc1wifSxcbiAgICBcIjAwMDgyMTJBXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTnVtYmVyT2ZWaWV3c0luU3RhZ2VcIn0sXG4gICAgXCIwMDA4MjEzMFwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiRXZlbnRFbGFwc2VkVGltZXNcIn0sXG4gICAgXCIwMDA4MjEzMlwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiRXZlbnRUaW1lck5hbWVzXCJ9LFxuICAgIFwiMDAwODIxMzNcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJFdmVudFRpbWVyU2VxdWVuY2VcIn0sXG4gICAgXCIwMDA4MjEzNFwiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkV2ZW50VGltZU9mZnNldFwifSxcbiAgICBcIjAwMDgyMTM1XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRXZlbnRDb2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDA4MjE0MlwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlN0YXJ0VHJpbVwifSxcbiAgICBcIjAwMDgyMTQzXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3RvcFRyaW1cIn0sXG4gICAgXCIwMDA4MjE0NFwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlY29tbWVuZGVkRGlzcGxheUZyYW1lUmF0ZVwifSxcbiAgICBcIjAwMDgyMjAwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiVHJhbnNkdWNlclBvc2l0aW9uXCJ9LFxuICAgIFwiMDAwODIyMDRcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUcmFuc2R1Y2VyT3JpZW50YXRpb25cIn0sXG4gICAgXCIwMDA4MjIwOFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFuYXRvbWljU3RydWN0dXJlXCJ9LFxuICAgIFwiMDAwODIyMThcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBbmF0b21pY1JlZ2lvblNlcXVlbmNlXCJ9LFxuICAgIFwiMDAwODIyMjBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBbmF0b21pY1JlZ2lvbk1vZGlmaWVyU2VxdWVuY2VcIn0sXG4gICAgXCIwMDA4MjIyOFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlByaW1hcnlBbmF0b21pY1N0cnVjdHVyZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDAwODIyMjlcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBbmF0b21pY1N0cnVjdHVyZVNwYWNlT3JSZWdpb25TZXF1ZW5jZVwifSxcbiAgICBcIjAwMDgyMjMwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUHJpbWFyeUFuYXRvbWljU3RydWN0dXJlTW9kaWZpZXJTZXF1ZW5jZVwifSxcbiAgICBcIjAwMDgyMjQwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVHJhbnNkdWNlclBvc2l0aW9uU2VxdWVuY2VcIn0sXG4gICAgXCIwMDA4MjI0MlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRyYW5zZHVjZXJQb3NpdGlvbk1vZGlmaWVyU2VxdWVuY2VcIn0sXG4gICAgXCIwMDA4MjI0NFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRyYW5zZHVjZXJPcmllbnRhdGlvblNlcXVlbmNlXCJ9LFxuICAgIFwiMDAwODIyNDZcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUcmFuc2R1Y2VyT3JpZW50YXRpb25Nb2RpZmllclNlcXVlbmNlXCJ9LFxuICAgIFwiMDAwODIyNTFcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBbmF0b21pY1N0cnVjdHVyZVNwYWNlT3JSZWdpb25Db2RlU2VxdWVuY2VUcmlhbFwifSxcbiAgICBcIjAwMDgyMjUzXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQW5hdG9taWNQb3J0YWxPZkVudHJhbmNlQ29kZVNlcXVlbmNlVHJpYWxcIn0sXG4gICAgXCIwMDA4MjI1NVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFuYXRvbWljQXBwcm9hY2hEaXJlY3Rpb25Db2RlU2VxdWVuY2VUcmlhbFwifSxcbiAgICBcIjAwMDgyMjU2XCI6IHt2cjogXCJTVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQW5hdG9taWNQZXJzcGVjdGl2ZURlc2NyaXB0aW9uVHJpYWxcIn0sXG4gICAgXCIwMDA4MjI1N1wiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFuYXRvbWljUGVyc3BlY3RpdmVDb2RlU2VxdWVuY2VUcmlhbFwifSxcbiAgICBcIjAwMDgyMjU4XCI6IHt2cjogXCJTVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQW5hdG9taWNMb2NhdGlvbk9mRXhhbWluaW5nSW5zdHJ1bWVudERlc2NyaXB0aW9uVHJpYWxcIn0sXG4gICAgXCIwMDA4MjI1OVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFuYXRvbWljTG9jYXRpb25PZkV4YW1pbmluZ0luc3RydW1lbnRDb2RlU2VxdWVuY2VUcmlhbFwifSxcbiAgICBcIjAwMDgyMjVBXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQW5hdG9taWNTdHJ1Y3R1cmVTcGFjZU9yUmVnaW9uTW9kaWZpZXJDb2RlU2VxdWVuY2VUcmlhbFwifSxcbiAgICBcIjAwMDgyMjVDXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiT25BeGlzQmFja2dyb3VuZEFuYXRvbWljU3RydWN0dXJlQ29kZVNlcXVlbmNlVHJpYWxcIn0sXG4gICAgXCIwMDA4MzAwMVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFsdGVybmF0ZVJlcHJlc2VudGF0aW9uU2VxdWVuY2VcIn0sXG4gICAgXCIwMDA4MzAxMFwiOiB7dnI6IFwiVUlcIiwgdm06IFwiMVwiLCBuYW1lOiBcIklycmFkaWF0aW9uRXZlbnRVSURcIn0sXG4gICAgXCIwMDA4NDAwMFwiOiB7dnI6IFwiTFRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIklkZW50aWZ5aW5nQ29tbWVudHNcIn0sXG4gICAgXCIwMDA4OTAwN1wiOiB7dnI6IFwiQ1NcIiwgdm06IFwiNFwiLCBuYW1lOiBcIkZyYW1lVHlwZVwifSxcbiAgICBcIjAwMDg5MDkyXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJlbmNlZEltYWdlRXZpZGVuY2VTZXF1ZW5jZVwifSxcbiAgICBcIjAwMDg5MTIxXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJlbmNlZFJhd0RhdGFTZXF1ZW5jZVwifSxcbiAgICBcIjAwMDg5MTIzXCI6IHt2cjogXCJVSVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ3JlYXRvclZlcnNpb25VSURcIn0sXG4gICAgXCIwMDA4OTEyNFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRlcml2YXRpb25JbWFnZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDAwODkxNTRcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTb3VyY2VJbWFnZUV2aWRlbmNlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDA4OTIwNVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBpeGVsUHJlc2VudGF0aW9uXCJ9LFxuICAgIFwiMDAwODkyMDZcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJWb2x1bWV0cmljUHJvcGVydGllc1wifSxcbiAgICBcIjAwMDg5MjA3XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiVm9sdW1lQmFzZWRDYWxjdWxhdGlvblRlY2huaXF1ZVwifSxcbiAgICBcIjAwMDg5MjA4XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29tcGxleEltYWdlQ29tcG9uZW50XCJ9LFxuICAgIFwiMDAwODkyMDlcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBY3F1aXNpdGlvbkNvbnRyYXN0XCJ9LFxuICAgIFwiMDAwODkyMTVcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEZXJpdmF0aW9uQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDAwODkyMzdcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWZlcmVuY2VkUHJlc2VudGF0aW9uU3RhdGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwMDg5NDEwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJlbmNlZE90aGVyUGxhbmVTZXF1ZW5jZVwifSxcbiAgICBcIjAwMDg5NDU4XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRnJhbWVEaXNwbGF5U2VxdWVuY2VcIn0sXG4gICAgXCIwMDA4OTQ1OVwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlY29tbWVuZGVkRGlzcGxheUZyYW1lUmF0ZUluRmxvYXRcIn0sXG4gICAgXCIwMDA4OTQ2MFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNraXBGcmFtZVJhbmdlRmxhZ1wifSxcbiAgICBcIjAwMTAwMDEwXCI6IHt2cjogXCJQTlwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGF0aWVudE5hbWVcIn0sXG4gICAgXCIwMDEwMDAyMFwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBhdGllbnRJRFwifSxcbiAgICBcIjAwMTAwMDIxXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiSXNzdWVyT2ZQYXRpZW50SURcIn0sXG4gICAgXCIwMDEwMDAyMlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlR5cGVPZlBhdGllbnRJRFwifSxcbiAgICBcIjAwMTAwMDI0XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiSXNzdWVyT2ZQYXRpZW50SURRdWFsaWZpZXJzU2VxdWVuY2VcIn0sXG4gICAgXCIwMDEwMDAzMFwiOiB7dnI6IFwiREFcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBhdGllbnRCaXJ0aERhdGVcIn0sXG4gICAgXCIwMDEwMDAzMlwiOiB7dnI6IFwiVE1cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBhdGllbnRCaXJ0aFRpbWVcIn0sXG4gICAgXCIwMDEwMDA0MFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBhdGllbnRTZXhcIn0sXG4gICAgXCIwMDEwMDA1MFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBhdGllbnRJbnN1cmFuY2VQbGFuQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDAxMDAxMDFcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQYXRpZW50UHJpbWFyeUxhbmd1YWdlQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDAxMDAxMDJcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQYXRpZW50UHJpbWFyeUxhbmd1YWdlTW9kaWZpZXJDb2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDEwMTAwMFwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiT3RoZXJQYXRpZW50SURzXCJ9LFxuICAgIFwiMDAxMDEwMDFcIjoge3ZyOiBcIlBOXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIk90aGVyUGF0aWVudE5hbWVzXCJ9LFxuICAgIFwiMDAxMDEwMDJcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJPdGhlclBhdGllbnRJRHNTZXF1ZW5jZVwifSxcbiAgICBcIjAwMTAxMDA1XCI6IHt2cjogXCJQTlwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGF0aWVudEJpcnRoTmFtZVwifSxcbiAgICBcIjAwMTAxMDEwXCI6IHt2cjogXCJBU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGF0aWVudEFnZVwifSxcbiAgICBcIjAwMTAxMDIwXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGF0aWVudFNpemVcIn0sXG4gICAgXCIwMDEwMTAyMVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBhdGllbnRTaXplQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDAxMDEwMzBcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQYXRpZW50V2VpZ2h0XCJ9LFxuICAgIFwiMDAxMDEwNDBcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQYXRpZW50QWRkcmVzc1wifSxcbiAgICBcIjAwMTAxMDUwXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJJbnN1cmFuY2VQbGFuSWRlbnRpZmljYXRpb25cIn0sXG4gICAgXCIwMDEwMTA2MFwiOiB7dnI6IFwiUE5cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBhdGllbnRNb3RoZXJCaXJ0aE5hbWVcIn0sXG4gICAgXCIwMDEwMTA4MFwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIk1pbGl0YXJ5UmFua1wifSxcbiAgICBcIjAwMTAxMDgxXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQnJhbmNoT2ZTZXJ2aWNlXCJ9LFxuICAgIFwiMDAxMDEwOTBcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNZWRpY2FsUmVjb3JkTG9jYXRvclwifSxcbiAgICBcIjAwMTAyMDAwXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJNZWRpY2FsQWxlcnRzXCJ9LFxuICAgIFwiMDAxMDIxMTBcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIkFsbGVyZ2llc1wifSxcbiAgICBcIjAwMTAyMTUwXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ291bnRyeU9mUmVzaWRlbmNlXCJ9LFxuICAgIFwiMDAxMDIxNTJcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWdpb25PZlJlc2lkZW5jZVwifSxcbiAgICBcIjAwMTAyMTU0XCI6IHt2cjogXCJTSFwiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJQYXRpZW50VGVsZXBob25lTnVtYmVyc1wifSxcbiAgICBcIjAwMTAyMTYwXCI6IHt2cjogXCJTSFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRXRobmljR3JvdXBcIn0sXG4gICAgXCIwMDEwMjE4MFwiOiB7dnI6IFwiU0hcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk9jY3VwYXRpb25cIn0sXG4gICAgXCIwMDEwMjFBMFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNtb2tpbmdTdGF0dXNcIn0sXG4gICAgXCIwMDEwMjFCMFwiOiB7dnI6IFwiTFRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFkZGl0aW9uYWxQYXRpZW50SGlzdG9yeVwifSxcbiAgICBcIjAwMTAyMUMwXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUHJlZ25hbmN5U3RhdHVzXCJ9LFxuICAgIFwiMDAxMDIxRDBcIjoge3ZyOiBcIkRBXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJMYXN0TWVuc3RydWFsRGF0ZVwifSxcbiAgICBcIjAwMTAyMUYwXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGF0aWVudFJlbGlnaW91c1ByZWZlcmVuY2VcIn0sXG4gICAgXCIwMDEwMjIwMVwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBhdGllbnRTcGVjaWVzRGVzY3JpcHRpb25cIn0sXG4gICAgXCIwMDEwMjIwMlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBhdGllbnRTcGVjaWVzQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDAxMDIyMDNcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQYXRpZW50U2V4TmV1dGVyZWRcIn0sXG4gICAgXCIwMDEwMjIxMFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFuYXRvbWljYWxPcmllbnRhdGlvblR5cGVcIn0sXG4gICAgXCIwMDEwMjI5MlwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBhdGllbnRCcmVlZERlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMDAxMDIyOTNcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQYXRpZW50QnJlZWRDb2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDEwMjI5NFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkJyZWVkUmVnaXN0cmF0aW9uU2VxdWVuY2VcIn0sXG4gICAgXCIwMDEwMjI5NVwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkJyZWVkUmVnaXN0cmF0aW9uTnVtYmVyXCJ9LFxuICAgIFwiMDAxMDIyOTZcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJCcmVlZFJlZ2lzdHJ5Q29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDAxMDIyOTdcIjoge3ZyOiBcIlBOXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZXNwb25zaWJsZVBlcnNvblwifSxcbiAgICBcIjAwMTAyMjk4XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVzcG9uc2libGVQZXJzb25Sb2xlXCJ9LFxuICAgIFwiMDAxMDIyOTlcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZXNwb25zaWJsZU9yZ2FuaXphdGlvblwifSxcbiAgICBcIjAwMTA0MDAwXCI6IHt2cjogXCJMVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGF0aWVudENvbW1lbnRzXCJ9LFxuICAgIFwiMDAxMDk0MzFcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJFeGFtaW5lZEJvZHlUaGlja25lc3NcIn0sXG4gICAgXCIwMDEyMDAxMFwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNsaW5pY2FsVHJpYWxTcG9uc29yTmFtZVwifSxcbiAgICBcIjAwMTIwMDIwXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ2xpbmljYWxUcmlhbFByb3RvY29sSURcIn0sXG4gICAgXCIwMDEyMDAyMVwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNsaW5pY2FsVHJpYWxQcm90b2NvbE5hbWVcIn0sXG4gICAgXCIwMDEyMDAzMFwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNsaW5pY2FsVHJpYWxTaXRlSURcIn0sXG4gICAgXCIwMDEyMDAzMVwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNsaW5pY2FsVHJpYWxTaXRlTmFtZVwifSxcbiAgICBcIjAwMTIwMDQwXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ2xpbmljYWxUcmlhbFN1YmplY3RJRFwifSxcbiAgICBcIjAwMTIwMDQyXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ2xpbmljYWxUcmlhbFN1YmplY3RSZWFkaW5nSURcIn0sXG4gICAgXCIwMDEyMDA1MFwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNsaW5pY2FsVHJpYWxUaW1lUG9pbnRJRFwifSxcbiAgICBcIjAwMTIwMDUxXCI6IHt2cjogXCJTVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ2xpbmljYWxUcmlhbFRpbWVQb2ludERlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMDAxMjAwNjBcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDbGluaWNhbFRyaWFsQ29vcmRpbmF0aW5nQ2VudGVyTmFtZVwifSxcbiAgICBcIjAwMTIwMDYyXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGF0aWVudElkZW50aXR5UmVtb3ZlZFwifSxcbiAgICBcIjAwMTIwMDYzXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJEZWlkZW50aWZpY2F0aW9uTWV0aG9kXCJ9LFxuICAgIFwiMDAxMjAwNjRcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEZWlkZW50aWZpY2F0aW9uTWV0aG9kQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDAxMjAwNzFcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDbGluaWNhbFRyaWFsU2VyaWVzSURcIn0sXG4gICAgXCIwMDEyMDA3MlwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNsaW5pY2FsVHJpYWxTZXJpZXNEZXNjcmlwdGlvblwifSxcbiAgICBcIjAwMTIwMDgxXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ2xpbmljYWxUcmlhbFByb3RvY29sRXRoaWNzQ29tbWl0dGVlTmFtZVwifSxcbiAgICBcIjAwMTIwMDgyXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ2xpbmljYWxUcmlhbFByb3RvY29sRXRoaWNzQ29tbWl0dGVlQXBwcm92YWxOdW1iZXJcIn0sXG4gICAgXCIwMDEyMDA4M1wiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvbnNlbnRGb3JDbGluaWNhbFRyaWFsVXNlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDEyMDA4NFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRpc3RyaWJ1dGlvblR5cGVcIn0sXG4gICAgXCIwMDEyMDA4NVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvbnNlbnRGb3JEaXN0cmlidXRpb25GbGFnXCJ9LFxuICAgIFwiMDAxNDAwMjNcIjoge3ZyOiBcIlNUXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIkNBREZpbGVGb3JtYXRcIn0sXG4gICAgXCIwMDE0MDAyNFwiOiB7dnI6IFwiU1RcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiQ29tcG9uZW50UmVmZXJlbmNlU3lzdGVtXCJ9LFxuICAgIFwiMDAxNDAwMjVcIjoge3ZyOiBcIlNUXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIkNvbXBvbmVudE1hbnVmYWN0dXJpbmdQcm9jZWR1cmVcIn0sXG4gICAgXCIwMDE0MDAyOFwiOiB7dnI6IFwiU1RcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiQ29tcG9uZW50TWFudWZhY3R1cmVyXCJ9LFxuICAgIFwiMDAxNDAwMzBcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIk1hdGVyaWFsVGhpY2tuZXNzXCJ9LFxuICAgIFwiMDAxNDAwMzJcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIk1hdGVyaWFsUGlwZURpYW1ldGVyXCJ9LFxuICAgIFwiMDAxNDAwMzRcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIk1hdGVyaWFsSXNvbGF0aW9uRGlhbWV0ZXJcIn0sXG4gICAgXCIwMDE0MDA0MlwiOiB7dnI6IFwiU1RcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiTWF0ZXJpYWxHcmFkZVwifSxcbiAgICBcIjAwMTQwMDQ0XCI6IHt2cjogXCJTVFwiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJNYXRlcmlhbFByb3BlcnRpZXNGaWxlSURcIn0sXG4gICAgXCIwMDE0MDA0NVwiOiB7dnI6IFwiU1RcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiTWF0ZXJpYWxQcm9wZXJ0aWVzRmlsZUZvcm1hdFwifSxcbiAgICBcIjAwMTQwMDQ2XCI6IHt2cjogXCJMVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTWF0ZXJpYWxOb3Rlc1wifSxcbiAgICBcIjAwMTQwMDUwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29tcG9uZW50U2hhcGVcIn0sXG4gICAgXCIwMDE0MDA1MlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkN1cnZhdHVyZVR5cGVcIn0sXG4gICAgXCIwMDE0MDA1NFwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk91dGVyRGlhbWV0ZXJcIn0sXG4gICAgXCIwMDE0MDA1NlwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIklubmVyRGlhbWV0ZXJcIn0sXG4gICAgXCIwMDE0MTAxMFwiOiB7dnI6IFwiU1RcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFjdHVhbEVudmlyb25tZW50YWxDb25kaXRpb25zXCJ9LFxuICAgIFwiMDAxNDEwMjBcIjoge3ZyOiBcIkRBXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJFeHBpcnlEYXRlXCJ9LFxuICAgIFwiMDAxNDEwNDBcIjoge3ZyOiBcIlNUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJFbnZpcm9ubWVudGFsQ29uZGl0aW9uc1wifSxcbiAgICBcIjAwMTQyMDAyXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRXZhbHVhdG9yU2VxdWVuY2VcIn0sXG4gICAgXCIwMDE0MjAwNFwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkV2YWx1YXRvck51bWJlclwifSxcbiAgICBcIjAwMTQyMDA2XCI6IHt2cjogXCJQTlwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRXZhbHVhdG9yTmFtZVwifSxcbiAgICBcIjAwMTQyMDA4XCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRXZhbHVhdGlvbkF0dGVtcHRcIn0sXG4gICAgXCIwMDE0MjAxMlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkluZGljYXRpb25TZXF1ZW5jZVwifSxcbiAgICBcIjAwMTQyMDE0XCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW5kaWNhdGlvbk51bWJlciBcIn0sXG4gICAgXCIwMDE0MjAxNlwiOiB7dnI6IFwiU0hcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkluZGljYXRpb25MYWJlbFwifSxcbiAgICBcIjAwMTQyMDE4XCI6IHt2cjogXCJTVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW5kaWNhdGlvbkRlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMDAxNDIwMUFcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIkluZGljYXRpb25UeXBlXCJ9LFxuICAgIFwiMDAxNDIwMUNcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbmRpY2F0aW9uRGlzcG9zaXRpb25cIn0sXG4gICAgXCIwMDE0MjAxRVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkluZGljYXRpb25ST0lTZXF1ZW5jZVwifSxcbiAgICBcIjAwMTQyMDMwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW5kaWNhdGlvblBoeXNpY2FsUHJvcGVydHlTZXF1ZW5jZVwifSxcbiAgICBcIjAwMTQyMDMyXCI6IHt2cjogXCJTSFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUHJvcGVydHlMYWJlbFwifSxcbiAgICBcIjAwMTQyMjAyXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29vcmRpbmF0ZVN5c3RlbU51bWJlck9mQXhlcyBcIn0sXG4gICAgXCIwMDE0MjIwNFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvb3JkaW5hdGVTeXN0ZW1BeGVzU2VxdWVuY2VcIn0sXG4gICAgXCIwMDE0MjIwNlwiOiB7dnI6IFwiU1RcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvb3JkaW5hdGVTeXN0ZW1BeGlzRGVzY3JpcHRpb25cIn0sXG4gICAgXCIwMDE0MjIwOFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvb3JkaW5hdGVTeXN0ZW1EYXRhU2V0TWFwcGluZ1wifSxcbiAgICBcIjAwMTQyMjBBXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29vcmRpbmF0ZVN5c3RlbUF4aXNOdW1iZXJcIn0sXG4gICAgXCIwMDE0MjIwQ1wiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvb3JkaW5hdGVTeXN0ZW1BeGlzVHlwZVwifSxcbiAgICBcIjAwMTQyMjBFXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29vcmRpbmF0ZVN5c3RlbUF4aXNVbml0c1wifSxcbiAgICBcIjAwMTQyMjEwXCI6IHt2cjogXCJPQlwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29vcmRpbmF0ZVN5c3RlbUF4aXNWYWx1ZXNcIn0sXG4gICAgXCIwMDE0MjIyMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvb3JkaW5hdGVTeXN0ZW1UcmFuc2Zvcm1TZXF1ZW5jZVwifSxcbiAgICBcIjAwMTQyMjIyXCI6IHt2cjogXCJTVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVHJhbnNmb3JtRGVzY3JpcHRpb25cIn0sXG4gICAgXCIwMDE0MjIyNFwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRyYW5zZm9ybU51bWJlck9mQXhlc1wifSxcbiAgICBcIjAwMTQyMjI2XCI6IHt2cjogXCJJU1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJUcmFuc2Zvcm1PcmRlck9mQXhlc1wifSxcbiAgICBcIjAwMTQyMjI4XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiVHJhbnNmb3JtZWRBeGlzVW5pdHNcIn0sXG4gICAgXCIwMDE0MjIyQVwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiQ29vcmRpbmF0ZVN5c3RlbVRyYW5zZm9ybVJvdGF0aW9uQW5kU2NhbGVNYXRyaXhcIn0sXG4gICAgXCIwMDE0MjIyQ1wiOiB7dnI6IFwiRFNcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiQ29vcmRpbmF0ZVN5c3RlbVRyYW5zZm9ybVRyYW5zbGF0aW9uTWF0cml4XCJ9LFxuICAgIFwiMDAxNDMwMTFcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbnRlcm5hbERldGVjdG9yRnJhbWVUaW1lXCJ9LFxuICAgIFwiMDAxNDMwMTJcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJOdW1iZXJPZkZyYW1lc0ludGVncmF0ZWRcIn0sXG4gICAgXCIwMDE0MzAyMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRldGVjdG9yVGVtcGVyYXR1cmVTZXF1ZW5jZVwifSxcbiAgICBcIjAwMTQzMDIyXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2Vuc29yTmFtZVwifSxcbiAgICBcIjAwMTQzMDI0XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiSG9yaXpvbnRhbE9mZnNldE9mU2Vuc29yXCJ9LFxuICAgIFwiMDAxNDMwMjZcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJWZXJ0aWNhbE9mZnNldE9mU2Vuc29yXCJ9LFxuICAgIFwiMDAxNDMwMjhcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTZW5zb3JUZW1wZXJhdHVyZVwifSxcbiAgICBcIjAwMTQzMDQwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGFya0N1cnJlbnRTZXF1ZW5jZVwifSxcbiAgICBcIjAwMTQzMDUwXCI6IHt2cjogXCJPQnxPV1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGFya0N1cnJlbnRDb3VudHNcIn0sXG4gICAgXCIwMDE0MzA2MFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkdhaW5Db3JyZWN0aW9uUmVmZXJlbmNlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDE0MzA3MFwiOiB7dnI6IFwiT0J8T1dcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFpckNvdW50c1wifSxcbiAgICBcIjAwMTQzMDcxXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiS1ZVc2VkSW5HYWluQ2FsaWJyYXRpb25cIn0sXG4gICAgXCIwMDE0MzA3MlwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk1BVXNlZEluR2FpbkNhbGlicmF0aW9uXCJ9LFxuICAgIFwiMDAxNDMwNzNcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJOdW1iZXJPZkZyYW1lc1VzZWRGb3JJbnRlZ3JhdGlvblwifSxcbiAgICBcIjAwMTQzMDc0XCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRmlsdGVyTWF0ZXJpYWxVc2VkSW5HYWluQ2FsaWJyYXRpb25cIn0sXG4gICAgXCIwMDE0MzA3NVwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkZpbHRlclRoaWNrbmVzc1VzZWRJbkdhaW5DYWxpYnJhdGlvblwifSxcbiAgICBcIjAwMTQzMDc2XCI6IHt2cjogXCJEQVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGF0ZU9mR2FpbkNhbGlicmF0aW9uXCJ9LFxuICAgIFwiMDAxNDMwNzdcIjoge3ZyOiBcIlRNXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUaW1lT2ZHYWluQ2FsaWJyYXRpb25cIn0sXG4gICAgXCIwMDE0MzA4MFwiOiB7dnI6IFwiT0JcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkJhZFBpeGVsSW1hZ2VcIn0sXG4gICAgXCIwMDE0MzA5OVwiOiB7dnI6IFwiTFRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNhbGlicmF0aW9uTm90ZXNcIn0sXG4gICAgXCIwMDE0NDAwMlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlB1bHNlckVxdWlwbWVudFNlcXVlbmNlXCJ9LFxuICAgIFwiMDAxNDQwMDRcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQdWxzZXJUeXBlXCJ9LFxuICAgIFwiMDAxNDQwMDZcIjoge3ZyOiBcIkxUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQdWxzZXJOb3Rlc1wifSxcbiAgICBcIjAwMTQ0MDA4XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVjZWl2ZXJFcXVpcG1lbnRTZXF1ZW5jZVwifSxcbiAgICBcIjAwMTQ0MDBBXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQW1wbGlmaWVyVHlwZVwifSxcbiAgICBcIjAwMTQ0MDBDXCI6IHt2cjogXCJMVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVjZWl2ZXJOb3Rlc1wifSxcbiAgICBcIjAwMTQ0MDBFXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUHJlQW1wbGlmaWVyRXF1aXBtZW50U2VxdWVuY2VcIn0sXG4gICAgXCIwMDE0NDAwRlwiOiB7dnI6IFwiTFRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlByZUFtcGxpZmllck5vdGVzXCJ9LFxuICAgIFwiMDAxNDQwMTBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUcmFuc21pdFRyYW5zZHVjZXJTZXF1ZW5jZVwifSxcbiAgICBcIjAwMTQ0MDExXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVjZWl2ZVRyYW5zZHVjZXJTZXF1ZW5jZVwifSxcbiAgICBcIjAwMTQ0MDEyXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTnVtYmVyT2ZFbGVtZW50c1wifSxcbiAgICBcIjAwMTQ0MDEzXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRWxlbWVudFNoYXBlXCJ9LFxuICAgIFwiMDAxNDQwMTRcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJFbGVtZW50RGltZW5zaW9uQVwifSxcbiAgICBcIjAwMTQ0MDE1XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRWxlbWVudERpbWVuc2lvbkJcIn0sXG4gICAgXCIwMDE0NDAxNlwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkVsZW1lbnRQaXRjaFwifSxcbiAgICBcIjAwMTQ0MDE3XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTWVhc3VyZWRCZWFtRGltZW5zaW9uQVwifSxcbiAgICBcIjAwMTQ0MDE4XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTWVhc3VyZWRCZWFtRGltZW5zaW9uQlwifSxcbiAgICBcIjAwMTQ0MDE5XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTG9jYXRpb25PZk1lYXN1cmVkQmVhbURpYW1ldGVyXCJ9LFxuICAgIFwiMDAxNDQwMUFcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJOb21pbmFsRnJlcXVlbmN5XCJ9LFxuICAgIFwiMDAxNDQwMUJcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNZWFzdXJlZENlbnRlckZyZXF1ZW5jeVwifSxcbiAgICBcIjAwMTQ0MDFDXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTWVhc3VyZWRCYW5kd2lkdGhcIn0sXG4gICAgXCIwMDE0NDAyMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlB1bHNlclNldHRpbmdzU2VxdWVuY2VcIn0sXG4gICAgXCIwMDE0NDAyMlwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlB1bHNlV2lkdGhcIn0sXG4gICAgXCIwMDE0NDAyNFwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkV4Y2l0YXRpb25GcmVxdWVuY3lcIn0sXG4gICAgXCIwMDE0NDAyNlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk1vZHVsYXRpb25UeXBlXCJ9LFxuICAgIFwiMDAxNDQwMjhcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEYW1waW5nXCJ9LFxuICAgIFwiMDAxNDQwMzBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWNlaXZlclNldHRpbmdzU2VxdWVuY2VcIn0sXG4gICAgXCIwMDE0NDAzMVwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFjcXVpcmVkU291bmRwYXRoTGVuZ3RoXCJ9LFxuICAgIFwiMDAxNDQwMzJcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBY3F1aXNpdGlvbkNvbXByZXNzaW9uVHlwZVwifSxcbiAgICBcIjAwMTQ0MDMzXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQWNxdWlzaXRpb25TYW1wbGVTaXplXCJ9LFxuICAgIFwiMDAxNDQwMzRcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWN0aWZpZXJTbW9vdGhpbmdcIn0sXG4gICAgXCIwMDE0NDAzNVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRBQ1NlcXVlbmNlXCJ9LFxuICAgIFwiMDAxNDQwMzZcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEQUNUeXBlXCJ9LFxuICAgIFwiMDAxNDQwMzhcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIkRBQ0dhaW5Qb2ludHNcIn0sXG4gICAgXCIwMDE0NDAzQVwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiREFDVGltZVBvaW50c1wifSxcbiAgICBcIjAwMTQ0MDNDXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJEQUNBbXBsaXR1ZGVcIn0sXG4gICAgXCIwMDE0NDA0MFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlByZUFtcGxpZmllclNldHRpbmdzU2VxdWVuY2VcIn0sXG4gICAgXCIwMDE0NDA1MFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRyYW5zbWl0VHJhbnNkdWNlclNldHRpbmdzU2VxdWVuY2VcIn0sXG4gICAgXCIwMDE0NDA1MVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlY2VpdmVUcmFuc2R1Y2VyU2V0dGluZ3NTZXF1ZW5jZVwifSxcbiAgICBcIjAwMTQ0MDUyXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW5jaWRlbnRBbmdsZVwifSxcbiAgICBcIjAwMTQ0MDU0XCI6IHt2cjogXCJTVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ291cGxpbmdUZWNobmlxdWVcIn0sXG4gICAgXCIwMDE0NDA1NlwiOiB7dnI6IFwiU1RcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvdXBsaW5nTWVkaXVtXCJ9LFxuICAgIFwiMDAxNDQwNTdcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb3VwbGluZ1ZlbG9jaXR5XCJ9LFxuICAgIFwiMDAxNDQwNThcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDcnlzdGFsQ2VudGVyTG9jYXRpb25YXCJ9LFxuICAgIFwiMDAxNDQwNTlcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDcnlzdGFsQ2VudGVyTG9jYXRpb25aXCJ9LFxuICAgIFwiMDAxNDQwNUFcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTb3VuZFBhdGhMZW5ndGhcIn0sXG4gICAgXCIwMDE0NDA1Q1wiOiB7dnI6IFwiU1RcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRlbGF5TGF3SWRlbnRpZmllclwifSxcbiAgICBcIjAwMTQ0MDYwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiR2F0ZVNldHRpbmdzU2VxdWVuY2VcIn0sXG4gICAgXCIwMDE0NDA2MlwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkdhdGVUaHJlc2hvbGRcIn0sXG4gICAgXCIwMDE0NDA2NFwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlZlbG9jaXR5T2ZTb3VuZFwifSxcbiAgICBcIjAwMTQ0MDcwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ2FsaWJyYXRpb25TZXR0aW5nc1NlcXVlbmNlXCJ9LFxuICAgIFwiMDAxNDQwNzJcIjoge3ZyOiBcIlNUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDYWxpYnJhdGlvblByb2NlZHVyZVwifSxcbiAgICBcIjAwMTQ0MDc0XCI6IHt2cjogXCJTSFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUHJvY2VkdXJlVmVyc2lvblwifSxcbiAgICBcIjAwMTQ0MDc2XCI6IHt2cjogXCJEQVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUHJvY2VkdXJlQ3JlYXRpb25EYXRlXCJ9LFxuICAgIFwiMDAxNDQwNzhcIjoge3ZyOiBcIkRBXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQcm9jZWR1cmVFeHBpcmF0aW9uRGF0ZVwifSxcbiAgICBcIjAwMTQ0MDdBXCI6IHt2cjogXCJEQVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUHJvY2VkdXJlTGFzdE1vZGlmaWVkRGF0ZVwifSxcbiAgICBcIjAwMTQ0MDdDXCI6IHt2cjogXCJUTVwiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJDYWxpYnJhdGlvblRpbWVcIn0sXG4gICAgXCIwMDE0NDA3RVwiOiB7dnI6IFwiREFcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiQ2FsaWJyYXRpb25EYXRlXCJ9LFxuICAgIFwiMDAxNDUwMDJcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJMSU5BQ0VuZXJneVwifSxcbiAgICBcIjAwMTQ1MDA0XCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTElOQUNPdXRwdXRcIn0sXG4gICAgXCIwMDE4MDAxMFwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvbnRyYXN0Qm9sdXNBZ2VudFwifSxcbiAgICBcIjAwMTgwMDEyXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29udHJhc3RCb2x1c0FnZW50U2VxdWVuY2VcIn0sXG4gICAgXCIwMDE4MDAxNFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvbnRyYXN0Qm9sdXNBZG1pbmlzdHJhdGlvblJvdXRlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDE4MDAxNVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkJvZHlQYXJ0RXhhbWluZWRcIn0sXG4gICAgXCIwMDE4MDAyMFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiU2Nhbm5pbmdTZXF1ZW5jZVwifSxcbiAgICBcIjAwMTgwMDIxXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJTZXF1ZW5jZVZhcmlhbnRcIn0sXG4gICAgXCIwMDE4MDAyMlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiU2Nhbk9wdGlvbnNcIn0sXG4gICAgXCIwMDE4MDAyM1wiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk1SQWNxdWlzaXRpb25UeXBlXCJ9LFxuICAgIFwiMDAxODAwMjRcIjoge3ZyOiBcIlNIXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTZXF1ZW5jZU5hbWVcIn0sXG4gICAgXCIwMDE4MDAyNVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFuZ2lvRmxhZ1wifSxcbiAgICBcIjAwMTgwMDI2XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW50ZXJ2ZW50aW9uRHJ1Z0luZm9ybWF0aW9uU2VxdWVuY2VcIn0sXG4gICAgXCIwMDE4MDAyN1wiOiB7dnI6IFwiVE1cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkludGVydmVudGlvbkRydWdTdG9wVGltZVwifSxcbiAgICBcIjAwMTgwMDI4XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW50ZXJ2ZW50aW9uRHJ1Z0Rvc2VcIn0sXG4gICAgXCIwMDE4MDAyOVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkludGVydmVudGlvbkRydWdDb2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDE4MDAyQVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFkZGl0aW9uYWxEcnVnU2VxdWVuY2VcIn0sXG4gICAgXCIwMDE4MDAzMFwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiUmFkaW9udWNsaWRlXCJ9LFxuICAgIFwiMDAxODAwMzFcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSYWRpb3BoYXJtYWNldXRpY2FsXCJ9LFxuICAgIFwiMDAxODAwMzJcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJFbmVyZ3lXaW5kb3dDZW50ZXJsaW5lXCJ9LFxuICAgIFwiMDAxODAwMzNcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIkVuZXJneVdpbmRvd1RvdGFsV2lkdGhcIn0sXG4gICAgXCIwMDE4MDAzNFwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkludGVydmVudGlvbkRydWdOYW1lXCJ9LFxuICAgIFwiMDAxODAwMzVcIjoge3ZyOiBcIlRNXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbnRlcnZlbnRpb25EcnVnU3RhcnRUaW1lXCJ9LFxuICAgIFwiMDAxODAwMzZcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbnRlcnZlbnRpb25TZXF1ZW5jZVwifSxcbiAgICBcIjAwMTgwMDM3XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiVGhlcmFweVR5cGVcIn0sXG4gICAgXCIwMDE4MDAzOFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkludGVydmVudGlvblN0YXR1c1wifSxcbiAgICBcIjAwMTgwMDM5XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiVGhlcmFweURlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMDAxODAwM0FcIjoge3ZyOiBcIlNUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbnRlcnZlbnRpb25EZXNjcmlwdGlvblwifSxcbiAgICBcIjAwMTgwMDQwXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ2luZVJhdGVcIn0sXG4gICAgXCIwMDE4MDA0MlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkluaXRpYWxDaW5lUnVuU3RhdGVcIn0sXG4gICAgXCIwMDE4MDA1MFwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNsaWNlVGhpY2tuZXNzXCJ9LFxuICAgIFwiMDAxODAwNjBcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJLVlBcIn0sXG4gICAgXCIwMDE4MDA3MFwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvdW50c0FjY3VtdWxhdGVkXCJ9LFxuICAgIFwiMDAxODAwNzFcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBY3F1aXNpdGlvblRlcm1pbmF0aW9uQ29uZGl0aW9uXCJ9LFxuICAgIFwiMDAxODAwNzJcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJFZmZlY3RpdmVEdXJhdGlvblwifSxcbiAgICBcIjAwMTgwMDczXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQWNxdWlzaXRpb25TdGFydENvbmRpdGlvblwifSxcbiAgICBcIjAwMTgwMDc0XCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQWNxdWlzaXRpb25TdGFydENvbmRpdGlvbkRhdGFcIn0sXG4gICAgXCIwMDE4MDA3NVwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFjcXVpc2l0aW9uVGVybWluYXRpb25Db25kaXRpb25EYXRhXCJ9LFxuICAgIFwiMDAxODAwODBcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZXBldGl0aW9uVGltZVwifSxcbiAgICBcIjAwMTgwMDgxXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRWNob1RpbWVcIn0sXG4gICAgXCIwMDE4MDA4MlwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkludmVyc2lvblRpbWVcIn0sXG4gICAgXCIwMDE4MDA4M1wiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk51bWJlck9mQXZlcmFnZXNcIn0sXG4gICAgXCIwMDE4MDA4NFwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkltYWdpbmdGcmVxdWVuY3lcIn0sXG4gICAgXCIwMDE4MDA4NVwiOiB7dnI6IFwiU0hcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkltYWdlZE51Y2xldXNcIn0sXG4gICAgXCIwMDE4MDA4NlwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiRWNob051bWJlcnNcIn0sXG4gICAgXCIwMDE4MDA4N1wiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk1hZ25ldGljRmllbGRTdHJlbmd0aFwifSxcbiAgICBcIjAwMTgwMDg4XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3BhY2luZ0JldHdlZW5TbGljZXNcIn0sXG4gICAgXCIwMDE4MDA4OVwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk51bWJlck9mUGhhc2VFbmNvZGluZ1N0ZXBzXCJ9LFxuICAgIFwiMDAxODAwOTBcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEYXRhQ29sbGVjdGlvbkRpYW1ldGVyXCJ9LFxuICAgIFwiMDAxODAwOTFcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJFY2hvVHJhaW5MZW5ndGhcIn0sXG4gICAgXCIwMDE4MDA5M1wiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBlcmNlbnRTYW1wbGluZ1wifSxcbiAgICBcIjAwMTgwMDk0XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGVyY2VudFBoYXNlRmllbGRPZlZpZXdcIn0sXG4gICAgXCIwMDE4MDA5NVwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBpeGVsQmFuZHdpZHRoXCJ9LFxuICAgIFwiMDAxODEwMDBcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEZXZpY2VTZXJpYWxOdW1iZXJcIn0sXG4gICAgXCIwMDE4MTAwMlwiOiB7dnI6IFwiVUlcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRldmljZVVJRFwifSxcbiAgICBcIjAwMTgxMDAzXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGV2aWNlSURcIn0sXG4gICAgXCIwMDE4MTAwNFwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBsYXRlSURcIn0sXG4gICAgXCIwMDE4MTAwNVwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkdlbmVyYXRvcklEXCJ9LFxuICAgIFwiMDAxODEwMDZcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJHcmlkSURcIn0sXG4gICAgXCIwMDE4MTAwN1wiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNhc3NldHRlSURcIn0sXG4gICAgXCIwMDE4MTAwOFwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkdhbnRyeUlEXCJ9LFxuICAgIFwiMDAxODEwMTBcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTZWNvbmRhcnlDYXB0dXJlRGV2aWNlSURcIn0sXG4gICAgXCIwMDE4MTAxMVwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkhhcmRjb3B5Q3JlYXRpb25EZXZpY2VJRFwifSxcbiAgICBcIjAwMTgxMDEyXCI6IHt2cjogXCJEQVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGF0ZU9mU2Vjb25kYXJ5Q2FwdHVyZVwifSxcbiAgICBcIjAwMTgxMDE0XCI6IHt2cjogXCJUTVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVGltZU9mU2Vjb25kYXJ5Q2FwdHVyZVwifSxcbiAgICBcIjAwMTgxMDE2XCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2Vjb25kYXJ5Q2FwdHVyZURldmljZU1hbnVmYWN0dXJlclwifSxcbiAgICBcIjAwMTgxMDE3XCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiSGFyZGNvcHlEZXZpY2VNYW51ZmFjdHVyZXJcIn0sXG4gICAgXCIwMDE4MTAxOFwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNlY29uZGFyeUNhcHR1cmVEZXZpY2VNYW51ZmFjdHVyZXJNb2RlbE5hbWVcIn0sXG4gICAgXCIwMDE4MTAxOVwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiU2Vjb25kYXJ5Q2FwdHVyZURldmljZVNvZnR3YXJlVmVyc2lvbnNcIn0sXG4gICAgXCIwMDE4MTAxQVwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiSGFyZGNvcHlEZXZpY2VTb2Z0d2FyZVZlcnNpb25cIn0sXG4gICAgXCIwMDE4MTAxQlwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkhhcmRjb3B5RGV2aWNlTWFudWZhY3R1cmVyTW9kZWxOYW1lXCJ9LFxuICAgIFwiMDAxODEwMjBcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIlNvZnR3YXJlVmVyc2lvbnNcIn0sXG4gICAgXCIwMDE4MTAyMlwiOiB7dnI6IFwiU0hcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlZpZGVvSW1hZ2VGb3JtYXRBY3F1aXJlZFwifSxcbiAgICBcIjAwMTgxMDIzXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGlnaXRhbEltYWdlRm9ybWF0QWNxdWlyZWRcIn0sXG4gICAgXCIwMDE4MTAzMFwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlByb3RvY29sTmFtZVwifSxcbiAgICBcIjAwMTgxMDQwXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29udHJhc3RCb2x1c1JvdXRlXCJ9LFxuICAgIFwiMDAxODEwNDFcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb250cmFzdEJvbHVzVm9sdW1lXCJ9LFxuICAgIFwiMDAxODEwNDJcIjoge3ZyOiBcIlRNXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb250cmFzdEJvbHVzU3RhcnRUaW1lXCJ9LFxuICAgIFwiMDAxODEwNDNcIjoge3ZyOiBcIlRNXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb250cmFzdEJvbHVzU3RvcFRpbWVcIn0sXG4gICAgXCIwMDE4MTA0NFwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvbnRyYXN0Qm9sdXNUb3RhbERvc2VcIn0sXG4gICAgXCIwMDE4MTA0NVwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlN5cmluZ2VDb3VudHNcIn0sXG4gICAgXCIwMDE4MTA0NlwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiQ29udHJhc3RGbG93UmF0ZVwifSxcbiAgICBcIjAwMTgxMDQ3XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJDb250cmFzdEZsb3dEdXJhdGlvblwifSxcbiAgICBcIjAwMTgxMDQ4XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29udHJhc3RCb2x1c0luZ3JlZGllbnRcIn0sXG4gICAgXCIwMDE4MTA0OVwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvbnRyYXN0Qm9sdXNJbmdyZWRpZW50Q29uY2VudHJhdGlvblwifSxcbiAgICBcIjAwMTgxMDUwXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3BhdGlhbFJlc29sdXRpb25cIn0sXG4gICAgXCIwMDE4MTA2MFwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRyaWdnZXJUaW1lXCJ9LFxuICAgIFwiMDAxODEwNjFcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUcmlnZ2VyU291cmNlT3JUeXBlXCJ9LFxuICAgIFwiMDAxODEwNjJcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJOb21pbmFsSW50ZXJ2YWxcIn0sXG4gICAgXCIwMDE4MTA2M1wiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkZyYW1lVGltZVwifSxcbiAgICBcIjAwMTgxMDY0XCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ2FyZGlhY0ZyYW1pbmdUeXBlXCJ9LFxuICAgIFwiMDAxODEwNjVcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIkZyYW1lVGltZVZlY3RvclwifSxcbiAgICBcIjAwMTgxMDY2XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRnJhbWVEZWxheVwifSxcbiAgICBcIjAwMTgxMDY3XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW1hZ2VUcmlnZ2VyRGVsYXlcIn0sXG4gICAgXCIwMDE4MTA2OFwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk11bHRpcGxleEdyb3VwVGltZU9mZnNldFwifSxcbiAgICBcIjAwMTgxMDY5XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiVHJpZ2dlclRpbWVPZmZzZXRcIn0sXG4gICAgXCIwMDE4MTA2QVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlN5bmNocm9uaXphdGlvblRyaWdnZXJcIn0sXG4gICAgXCIwMDE4MTA2Q1wiOiB7dnI6IFwiVVNcIiwgdm06IFwiMlwiLCBuYW1lOiBcIlN5bmNocm9uaXphdGlvbkNoYW5uZWxcIn0sXG4gICAgXCIwMDE4MTA2RVwiOiB7dnI6IFwiVUxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRyaWdnZXJTYW1wbGVQb3NpdGlvblwifSxcbiAgICBcIjAwMTgxMDcwXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmFkaW9waGFybWFjZXV0aWNhbFJvdXRlXCJ9LFxuICAgIFwiMDAxODEwNzFcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSYWRpb3BoYXJtYWNldXRpY2FsVm9sdW1lXCJ9LFxuICAgIFwiMDAxODEwNzJcIjoge3ZyOiBcIlRNXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSYWRpb3BoYXJtYWNldXRpY2FsU3RhcnRUaW1lXCJ9LFxuICAgIFwiMDAxODEwNzNcIjoge3ZyOiBcIlRNXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSYWRpb3BoYXJtYWNldXRpY2FsU3RvcFRpbWVcIn0sXG4gICAgXCIwMDE4MTA3NFwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJhZGlvbnVjbGlkZVRvdGFsRG9zZVwifSxcbiAgICBcIjAwMTgxMDc1XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmFkaW9udWNsaWRlSGFsZkxpZmVcIn0sXG4gICAgXCIwMDE4MTA3NlwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJhZGlvbnVjbGlkZVBvc2l0cm9uRnJhY3Rpb25cIn0sXG4gICAgXCIwMDE4MTA3N1wiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJhZGlvcGhhcm1hY2V1dGljYWxTcGVjaWZpY0FjdGl2aXR5XCJ9LFxuICAgIFwiMDAxODEwNzhcIjoge3ZyOiBcIkRUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSYWRpb3BoYXJtYWNldXRpY2FsU3RhcnREYXRlVGltZVwifSxcbiAgICBcIjAwMTgxMDc5XCI6IHt2cjogXCJEVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmFkaW9waGFybWFjZXV0aWNhbFN0b3BEYXRlVGltZVwifSxcbiAgICBcIjAwMTgxMDgwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQmVhdFJlamVjdGlvbkZsYWdcIn0sXG4gICAgXCIwMDE4MTA4MVwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkxvd1JSVmFsdWVcIn0sXG4gICAgXCIwMDE4MTA4MlwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkhpZ2hSUlZhbHVlXCJ9LFxuICAgIFwiMDAxODEwODNcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbnRlcnZhbHNBY3F1aXJlZFwifSxcbiAgICBcIjAwMTgxMDg0XCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW50ZXJ2YWxzUmVqZWN0ZWRcIn0sXG4gICAgXCIwMDE4MTA4NVwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBWQ1JlamVjdGlvblwifSxcbiAgICBcIjAwMTgxMDg2XCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2tpcEJlYXRzXCJ9LFxuICAgIFwiMDAxODEwODhcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJIZWFydFJhdGVcIn0sXG4gICAgXCIwMDE4MTA5MFwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNhcmRpYWNOdW1iZXJPZkltYWdlc1wifSxcbiAgICBcIjAwMTgxMDk0XCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiVHJpZ2dlcldpbmRvd1wifSxcbiAgICBcIjAwMTgxMTAwXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVjb25zdHJ1Y3Rpb25EaWFtZXRlclwifSxcbiAgICBcIjAwMTgxMTEwXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGlzdGFuY2VTb3VyY2VUb0RldGVjdG9yXCJ9LFxuICAgIFwiMDAxODExMTFcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEaXN0YW5jZVNvdXJjZVRvUGF0aWVudFwifSxcbiAgICBcIjAwMTgxMTE0XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRXN0aW1hdGVkUmFkaW9ncmFwaGljTWFnbmlmaWNhdGlvbkZhY3RvclwifSxcbiAgICBcIjAwMTgxMTIwXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiR2FudHJ5RGV0ZWN0b3JUaWx0XCJ9LFxuICAgIFwiMDAxODExMjFcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJHYW50cnlEZXRlY3RvclNsZXdcIn0sXG4gICAgXCIwMDE4MTEzMFwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRhYmxlSGVpZ2h0XCJ9LFxuICAgIFwiMDAxODExMzFcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUYWJsZVRyYXZlcnNlXCJ9LFxuICAgIFwiMDAxODExMzRcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUYWJsZU1vdGlvblwifSxcbiAgICBcIjAwMTgxMTM1XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJUYWJsZVZlcnRpY2FsSW5jcmVtZW50XCJ9LFxuICAgIFwiMDAxODExMzZcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIlRhYmxlTGF0ZXJhbEluY3JlbWVudFwifSxcbiAgICBcIjAwMTgxMTM3XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJUYWJsZUxvbmdpdHVkaW5hbEluY3JlbWVudFwifSxcbiAgICBcIjAwMTgxMTM4XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiVGFibGVBbmdsZVwifSxcbiAgICBcIjAwMTgxMTNBXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiVGFibGVUeXBlXCJ9LFxuICAgIFwiMDAxODExNDBcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSb3RhdGlvbkRpcmVjdGlvblwifSxcbiAgICBcIjAwMTgxMTQxXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQW5ndWxhclBvc2l0aW9uXCJ9LFxuICAgIFwiMDAxODExNDJcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIlJhZGlhbFBvc2l0aW9uXCJ9LFxuICAgIFwiMDAxODExNDNcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTY2FuQXJjXCJ9LFxuICAgIFwiMDAxODExNDRcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBbmd1bGFyU3RlcFwifSxcbiAgICBcIjAwMTgxMTQ1XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ2VudGVyT2ZSb3RhdGlvbk9mZnNldFwifSxcbiAgICBcIjAwMTgxMTQ2XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJSb3RhdGlvbk9mZnNldFwifSxcbiAgICBcIjAwMTgxMTQ3XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRmllbGRPZlZpZXdTaGFwZVwifSxcbiAgICBcIjAwMTgxMTQ5XCI6IHt2cjogXCJJU1wiLCB2bTogXCIxLTJcIiwgbmFtZTogXCJGaWVsZE9mVmlld0RpbWVuc2lvbnNcIn0sXG4gICAgXCIwMDE4MTE1MFwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkV4cG9zdXJlVGltZVwifSxcbiAgICBcIjAwMTgxMTUxXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiWFJheVR1YmVDdXJyZW50XCJ9LFxuICAgIFwiMDAxODExNTJcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJFeHBvc3VyZVwifSxcbiAgICBcIjAwMTgxMTUzXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRXhwb3N1cmVJbnVBc1wifSxcbiAgICBcIjAwMTgxMTU0XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQXZlcmFnZVB1bHNlV2lkdGhcIn0sXG4gICAgXCIwMDE4MTE1NVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJhZGlhdGlvblNldHRpbmdcIn0sXG4gICAgXCIwMDE4MTE1NlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlY3RpZmljYXRpb25UeXBlXCJ9LFxuICAgIFwiMDAxODExNUFcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSYWRpYXRpb25Nb2RlXCJ9LFxuICAgIFwiMDAxODExNUVcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbWFnZUFuZEZsdW9yb3Njb3B5QXJlYURvc2VQcm9kdWN0XCJ9LFxuICAgIFwiMDAxODExNjBcIjoge3ZyOiBcIlNIXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJGaWx0ZXJUeXBlXCJ9LFxuICAgIFwiMDAxODExNjFcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIlR5cGVPZkZpbHRlcnNcIn0sXG4gICAgXCIwMDE4MTE2MlwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkludGVuc2lmaWVyU2l6ZVwifSxcbiAgICBcIjAwMTgxMTY0XCI6IHt2cjogXCJEU1wiLCB2bTogXCIyXCIsIG5hbWU6IFwiSW1hZ2VyUGl4ZWxTcGFjaW5nXCJ9LFxuICAgIFwiMDAxODExNjZcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIkdyaWRcIn0sXG4gICAgXCIwMDE4MTE3MFwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkdlbmVyYXRvclBvd2VyXCJ9LFxuICAgIFwiMDAxODExODBcIjoge3ZyOiBcIlNIXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb2xsaW1hdG9yR3JpZE5hbWVcIn0sXG4gICAgXCIwMDE4MTE4MVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvbGxpbWF0b3JUeXBlXCJ9LFxuICAgIFwiMDAxODExODJcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjEtMlwiLCBuYW1lOiBcIkZvY2FsRGlzdGFuY2VcIn0sXG4gICAgXCIwMDE4MTE4M1wiOiB7dnI6IFwiRFNcIiwgdm06IFwiMS0yXCIsIG5hbWU6IFwiWEZvY3VzQ2VudGVyXCJ9LFxuICAgIFwiMDAxODExODRcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjEtMlwiLCBuYW1lOiBcIllGb2N1c0NlbnRlclwifSxcbiAgICBcIjAwMTgxMTkwXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJGb2NhbFNwb3RzXCJ9LFxuICAgIFwiMDAxODExOTFcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBbm9kZVRhcmdldE1hdGVyaWFsXCJ9LFxuICAgIFwiMDAxODExQTBcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJCb2R5UGFydFRoaWNrbmVzc1wifSxcbiAgICBcIjAwMTgxMUEyXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29tcHJlc3Npb25Gb3JjZVwifSxcbiAgICBcIjAwMTgxMjAwXCI6IHt2cjogXCJEQVwiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJEYXRlT2ZMYXN0Q2FsaWJyYXRpb25cIn0sXG4gICAgXCIwMDE4MTIwMVwiOiB7dnI6IFwiVE1cIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiVGltZU9mTGFzdENhbGlicmF0aW9uXCJ9LFxuICAgIFwiMDAxODEyMTBcIjoge3ZyOiBcIlNIXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIkNvbnZvbHV0aW9uS2VybmVsXCJ9LFxuICAgIFwiMDAxODEyNDBcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIlVwcGVyTG93ZXJQaXhlbFZhbHVlc1wifSxcbiAgICBcIjAwMTgxMjQyXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQWN0dWFsRnJhbWVEdXJhdGlvblwifSxcbiAgICBcIjAwMTgxMjQzXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ291bnRSYXRlXCJ9LFxuICAgIFwiMDAxODEyNDRcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQcmVmZXJyZWRQbGF5YmFja1NlcXVlbmNpbmdcIn0sXG4gICAgXCIwMDE4MTI1MFwiOiB7dnI6IFwiU0hcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlY2VpdmVDb2lsTmFtZVwifSxcbiAgICBcIjAwMTgxMjUxXCI6IHt2cjogXCJTSFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVHJhbnNtaXRDb2lsTmFtZVwifSxcbiAgICBcIjAwMTgxMjYwXCI6IHt2cjogXCJTSFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGxhdGVUeXBlXCJ9LFxuICAgIFwiMDAxODEyNjFcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQaG9zcGhvclR5cGVcIn0sXG4gICAgXCIwMDE4MTMwMFwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNjYW5WZWxvY2l0eVwifSxcbiAgICBcIjAwMTgxMzAxXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJXaG9sZUJvZHlUZWNobmlxdWVcIn0sXG4gICAgXCIwMDE4MTMwMlwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNjYW5MZW5ndGhcIn0sXG4gICAgXCIwMDE4MTMxMFwiOiB7dnI6IFwiVVNcIiwgdm06IFwiNFwiLCBuYW1lOiBcIkFjcXVpc2l0aW9uTWF0cml4XCJ9LFxuICAgIFwiMDAxODEzMTJcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJblBsYW5lUGhhc2VFbmNvZGluZ0RpcmVjdGlvblwifSxcbiAgICBcIjAwMTgxMzE0XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRmxpcEFuZ2xlXCJ9LFxuICAgIFwiMDAxODEzMTVcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJWYXJpYWJsZUZsaXBBbmdsZUZsYWdcIn0sXG4gICAgXCIwMDE4MTMxNlwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNBUlwifSxcbiAgICBcIjAwMTgxMzE4XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiZEJkdFwifSxcbiAgICBcIjAwMTgxNDAwXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQWNxdWlzaXRpb25EZXZpY2VQcm9jZXNzaW5nRGVzY3JpcHRpb25cIn0sXG4gICAgXCIwMDE4MTQwMVwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFjcXVpc2l0aW9uRGV2aWNlUHJvY2Vzc2luZ0NvZGVcIn0sXG4gICAgXCIwMDE4MTQwMlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNhc3NldHRlT3JpZW50YXRpb25cIn0sXG4gICAgXCIwMDE4MTQwM1wiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNhc3NldHRlU2l6ZVwifSxcbiAgICBcIjAwMTgxNDA0XCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRXhwb3N1cmVzT25QbGF0ZVwifSxcbiAgICBcIjAwMTgxNDA1XCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVsYXRpdmVYUmF5RXhwb3N1cmVcIn0sXG4gICAgXCIwMDE4MTQxMVwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkV4cG9zdXJlSW5kZXhcIn0sXG4gICAgXCIwMDE4MTQxMlwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRhcmdldEV4cG9zdXJlSW5kZXhcIn0sXG4gICAgXCIwMDE4MTQxM1wiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRldmlhdGlvbkluZGV4XCJ9LFxuICAgIFwiMDAxODE0NTBcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb2x1bW5Bbmd1bGF0aW9uXCJ9LFxuICAgIFwiMDAxODE0NjBcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUb21vTGF5ZXJIZWlnaHRcIn0sXG4gICAgXCIwMDE4MTQ3MFwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRvbW9BbmdsZVwifSxcbiAgICBcIjAwMTgxNDgwXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiVG9tb1RpbWVcIn0sXG4gICAgXCIwMDE4MTQ5MFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRvbW9UeXBlXCJ9LFxuICAgIFwiMDAxODE0OTFcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUb21vQ2xhc3NcIn0sXG4gICAgXCIwMDE4MTQ5NVwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk51bWJlck9mVG9tb3N5bnRoZXNpc1NvdXJjZUltYWdlc1wifSxcbiAgICBcIjAwMTgxNTAwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUG9zaXRpb25lck1vdGlvblwifSxcbiAgICBcIjAwMTgxNTA4XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUG9zaXRpb25lclR5cGVcIn0sXG4gICAgXCIwMDE4MTUxMFwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBvc2l0aW9uZXJQcmltYXJ5QW5nbGVcIn0sXG4gICAgXCIwMDE4MTUxMVwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBvc2l0aW9uZXJTZWNvbmRhcnlBbmdsZVwifSxcbiAgICBcIjAwMTgxNTIwXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJQb3NpdGlvbmVyUHJpbWFyeUFuZ2xlSW5jcmVtZW50XCJ9LFxuICAgIFwiMDAxODE1MjFcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIlBvc2l0aW9uZXJTZWNvbmRhcnlBbmdsZUluY3JlbWVudFwifSxcbiAgICBcIjAwMTgxNTMwXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGV0ZWN0b3JQcmltYXJ5QW5nbGVcIn0sXG4gICAgXCIwMDE4MTUzMVwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRldGVjdG9yU2Vjb25kYXJ5QW5nbGVcIn0sXG4gICAgXCIwMDE4MTYwMFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMS0zXCIsIG5hbWU6IFwiU2h1dHRlclNoYXBlXCJ9LFxuICAgIFwiMDAxODE2MDJcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTaHV0dGVyTGVmdFZlcnRpY2FsRWRnZVwifSxcbiAgICBcIjAwMTgxNjA0XCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2h1dHRlclJpZ2h0VmVydGljYWxFZGdlXCJ9LFxuICAgIFwiMDAxODE2MDZcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTaHV0dGVyVXBwZXJIb3Jpem9udGFsRWRnZVwifSxcbiAgICBcIjAwMTgxNjA4XCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2h1dHRlckxvd2VySG9yaXpvbnRhbEVkZ2VcIn0sXG4gICAgXCIwMDE4MTYxMFwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMlwiLCBuYW1lOiBcIkNlbnRlck9mQ2lyY3VsYXJTaHV0dGVyXCJ9LFxuICAgIFwiMDAxODE2MTJcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSYWRpdXNPZkNpcmN1bGFyU2h1dHRlclwifSxcbiAgICBcIjAwMTgxNjIwXCI6IHt2cjogXCJJU1wiLCB2bTogXCIyLTJuXCIsIG5hbWU6IFwiVmVydGljZXNPZlRoZVBvbHlnb25hbFNodXR0ZXJcIn0sXG4gICAgXCIwMDE4MTYyMlwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNodXR0ZXJQcmVzZW50YXRpb25WYWx1ZVwifSxcbiAgICBcIjAwMTgxNjIzXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2h1dHRlck92ZXJsYXlHcm91cFwifSxcbiAgICBcIjAwMTgxNjI0XCI6IHt2cjogXCJVU1wiLCB2bTogXCIzXCIsIG5hbWU6IFwiU2h1dHRlclByZXNlbnRhdGlvbkNvbG9yQ0lFTGFiVmFsdWVcIn0sXG4gICAgXCIwMDE4MTcwMFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMS0zXCIsIG5hbWU6IFwiQ29sbGltYXRvclNoYXBlXCJ9LFxuICAgIFwiMDAxODE3MDJcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb2xsaW1hdG9yTGVmdFZlcnRpY2FsRWRnZVwifSxcbiAgICBcIjAwMTgxNzA0XCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29sbGltYXRvclJpZ2h0VmVydGljYWxFZGdlXCJ9LFxuICAgIFwiMDAxODE3MDZcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb2xsaW1hdG9yVXBwZXJIb3Jpem9udGFsRWRnZVwifSxcbiAgICBcIjAwMTgxNzA4XCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29sbGltYXRvckxvd2VySG9yaXpvbnRhbEVkZ2VcIn0sXG4gICAgXCIwMDE4MTcxMFwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMlwiLCBuYW1lOiBcIkNlbnRlck9mQ2lyY3VsYXJDb2xsaW1hdG9yXCJ9LFxuICAgIFwiMDAxODE3MTJcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSYWRpdXNPZkNpcmN1bGFyQ29sbGltYXRvclwifSxcbiAgICBcIjAwMTgxNzIwXCI6IHt2cjogXCJJU1wiLCB2bTogXCIyLTJuXCIsIG5hbWU6IFwiVmVydGljZXNPZlRoZVBvbHlnb25hbENvbGxpbWF0b3JcIn0sXG4gICAgXCIwMDE4MTgwMFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFjcXVpc2l0aW9uVGltZVN5bmNocm9uaXplZFwifSxcbiAgICBcIjAwMTgxODAxXCI6IHt2cjogXCJTSFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVGltZVNvdXJjZVwifSxcbiAgICBcIjAwMTgxODAyXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiVGltZURpc3RyaWJ1dGlvblByb3RvY29sXCJ9LFxuICAgIFwiMDAxODE4MDNcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJOVFBTb3VyY2VBZGRyZXNzXCJ9LFxuICAgIFwiMDAxODIwMDFcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIlBhZ2VOdW1iZXJWZWN0b3JcIn0sXG4gICAgXCIwMDE4MjAwMlwiOiB7dnI6IFwiU0hcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiRnJhbWVMYWJlbFZlY3RvclwifSxcbiAgICBcIjAwMTgyMDAzXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJGcmFtZVByaW1hcnlBbmdsZVZlY3RvclwifSxcbiAgICBcIjAwMTgyMDA0XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJGcmFtZVNlY29uZGFyeUFuZ2xlVmVjdG9yXCJ9LFxuICAgIFwiMDAxODIwMDVcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIlNsaWNlTG9jYXRpb25WZWN0b3JcIn0sXG4gICAgXCIwMDE4MjAwNlwiOiB7dnI6IFwiU0hcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiRGlzcGxheVdpbmRvd0xhYmVsVmVjdG9yXCJ9LFxuICAgIFwiMDAxODIwMTBcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjJcIiwgbmFtZTogXCJOb21pbmFsU2Nhbm5lZFBpeGVsU3BhY2luZ1wifSxcbiAgICBcIjAwMTgyMDIwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGlnaXRpemluZ0RldmljZVRyYW5zcG9ydERpcmVjdGlvblwifSxcbiAgICBcIjAwMTgyMDMwXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUm90YXRpb25PZlNjYW5uZWRGaWxtXCJ9LFxuICAgIFwiMDAxODMxMDBcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJVlVTQWNxdWlzaXRpb25cIn0sXG4gICAgXCIwMDE4MzEwMVwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIklWVVNQdWxsYmFja1JhdGVcIn0sXG4gICAgXCIwMDE4MzEwMlwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIklWVVNHYXRlZFJhdGVcIn0sXG4gICAgXCIwMDE4MzEwM1wiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIklWVVNQdWxsYmFja1N0YXJ0RnJhbWVOdW1iZXJcIn0sXG4gICAgXCIwMDE4MzEwNFwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIklWVVNQdWxsYmFja1N0b3BGcmFtZU51bWJlclwifSxcbiAgICBcIjAwMTgzMTA1XCI6IHt2cjogXCJJU1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJMZXNpb25OdW1iZXJcIn0sXG4gICAgXCIwMDE4NDAwMFwiOiB7dnI6IFwiTFRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFjcXVpc2l0aW9uQ29tbWVudHNcIn0sXG4gICAgXCIwMDE4NTAwMFwiOiB7dnI6IFwiU0hcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiT3V0cHV0UG93ZXJcIn0sXG4gICAgXCIwMDE4NTAxMFwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiVHJhbnNkdWNlckRhdGFcIn0sXG4gICAgXCIwMDE4NTAxMlwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkZvY3VzRGVwdGhcIn0sXG4gICAgXCIwMDE4NTAyMFwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlByb2Nlc3NpbmdGdW5jdGlvblwifSxcbiAgICBcIjAwMTg1MDIxXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUG9zdHByb2Nlc3NpbmdGdW5jdGlvblwifSxcbiAgICBcIjAwMTg1MDIyXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTWVjaGFuaWNhbEluZGV4XCJ9LFxuICAgIFwiMDAxODUwMjRcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJCb25lVGhlcm1hbEluZGV4XCJ9LFxuICAgIFwiMDAxODUwMjZcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDcmFuaWFsVGhlcm1hbEluZGV4XCJ9LFxuICAgIFwiMDAxODUwMjdcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTb2Z0VGlzc3VlVGhlcm1hbEluZGV4XCJ9LFxuICAgIFwiMDAxODUwMjhcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTb2Z0VGlzc3VlRm9jdXNUaGVybWFsSW5kZXhcIn0sXG4gICAgXCIwMDE4NTAyOVwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNvZnRUaXNzdWVTdXJmYWNlVGhlcm1hbEluZGV4XCJ9LFxuICAgIFwiMDAxODUwMzBcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEeW5hbWljUmFuZ2VcIn0sXG4gICAgXCIwMDE4NTA0MFwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRvdGFsR2FpblwifSxcbiAgICBcIjAwMTg1MDUwXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGVwdGhPZlNjYW5GaWVsZFwifSxcbiAgICBcIjAwMTg1MTAwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGF0aWVudFBvc2l0aW9uXCJ9LFxuICAgIFwiMDAxODUxMDFcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJWaWV3UG9zaXRpb25cIn0sXG4gICAgXCIwMDE4NTEwNFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlByb2plY3Rpb25FcG9ueW1vdXNOYW1lQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDAxODUyMTBcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjZcIiwgbmFtZTogXCJJbWFnZVRyYW5zZm9ybWF0aW9uTWF0cml4XCJ9LFxuICAgIFwiMDAxODUyMTJcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjNcIiwgbmFtZTogXCJJbWFnZVRyYW5zbGF0aW9uVmVjdG9yXCJ9LFxuICAgIFwiMDAxODYwMDBcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTZW5zaXRpdml0eVwifSxcbiAgICBcIjAwMTg2MDExXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2VxdWVuY2VPZlVsdHJhc291bmRSZWdpb25zXCJ9LFxuICAgIFwiMDAxODYwMTJcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWdpb25TcGF0aWFsRm9ybWF0XCJ9LFxuICAgIFwiMDAxODYwMTRcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWdpb25EYXRhVHlwZVwifSxcbiAgICBcIjAwMTg2MDE2XCI6IHt2cjogXCJVTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVnaW9uRmxhZ3NcIn0sXG4gICAgXCIwMDE4NjAxOFwiOiB7dnI6IFwiVUxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZ2lvbkxvY2F0aW9uTWluWDBcIn0sXG4gICAgXCIwMDE4NjAxQVwiOiB7dnI6IFwiVUxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZ2lvbkxvY2F0aW9uTWluWTBcIn0sXG4gICAgXCIwMDE4NjAxQ1wiOiB7dnI6IFwiVUxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZ2lvbkxvY2F0aW9uTWF4WDFcIn0sXG4gICAgXCIwMDE4NjAxRVwiOiB7dnI6IFwiVUxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZ2lvbkxvY2F0aW9uTWF4WTFcIn0sXG4gICAgXCIwMDE4NjAyMFwiOiB7dnI6IFwiU0xcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZmVyZW5jZVBpeGVsWDBcIn0sXG4gICAgXCIwMDE4NjAyMlwiOiB7dnI6IFwiU0xcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZmVyZW5jZVBpeGVsWTBcIn0sXG4gICAgXCIwMDE4NjAyNFwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBoeXNpY2FsVW5pdHNYRGlyZWN0aW9uXCJ9LFxuICAgIFwiMDAxODYwMjZcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQaHlzaWNhbFVuaXRzWURpcmVjdGlvblwifSxcbiAgICBcIjAwMTg2MDI4XCI6IHt2cjogXCJGRFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJlbmNlUGl4ZWxQaHlzaWNhbFZhbHVlWFwifSxcbiAgICBcIjAwMTg2MDJBXCI6IHt2cjogXCJGRFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJlbmNlUGl4ZWxQaHlzaWNhbFZhbHVlWVwifSxcbiAgICBcIjAwMTg2MDJDXCI6IHt2cjogXCJGRFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGh5c2ljYWxEZWx0YVhcIn0sXG4gICAgXCIwMDE4NjAyRVwiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBoeXNpY2FsRGVsdGFZXCJ9LFxuICAgIFwiMDAxODYwMzBcIjoge3ZyOiBcIlVMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUcmFuc2R1Y2VyRnJlcXVlbmN5XCJ9LFxuICAgIFwiMDAxODYwMzFcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUcmFuc2R1Y2VyVHlwZVwifSxcbiAgICBcIjAwMTg2MDMyXCI6IHt2cjogXCJVTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUHVsc2VSZXBldGl0aW9uRnJlcXVlbmN5XCJ9LFxuICAgIFwiMDAxODYwMzRcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEb3BwbGVyQ29ycmVjdGlvbkFuZ2xlXCJ9LFxuICAgIFwiMDAxODYwMzZcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTdGVlcmluZ0FuZ2xlXCJ9LFxuICAgIFwiMDAxODYwMzhcIjoge3ZyOiBcIlVMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEb3BwbGVyU2FtcGxlVm9sdW1lWFBvc2l0aW9uUmV0aXJlZFwifSxcbiAgICBcIjAwMTg2MDM5XCI6IHt2cjogXCJTTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRG9wcGxlclNhbXBsZVZvbHVtZVhQb3NpdGlvblwifSxcbiAgICBcIjAwMTg2MDNBXCI6IHt2cjogXCJVTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRG9wcGxlclNhbXBsZVZvbHVtZVlQb3NpdGlvblJldGlyZWRcIn0sXG4gICAgXCIwMDE4NjAzQlwiOiB7dnI6IFwiU0xcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRvcHBsZXJTYW1wbGVWb2x1bWVZUG9zaXRpb25cIn0sXG4gICAgXCIwMDE4NjAzQ1wiOiB7dnI6IFwiVUxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRNTGluZVBvc2l0aW9uWDBSZXRpcmVkXCJ9LFxuICAgIFwiMDAxODYwM0RcIjoge3ZyOiBcIlNMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUTUxpbmVQb3NpdGlvblgwXCJ9LFxuICAgIFwiMDAxODYwM0VcIjoge3ZyOiBcIlVMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUTUxpbmVQb3NpdGlvblkwUmV0aXJlZFwifSxcbiAgICBcIjAwMTg2MDNGXCI6IHt2cjogXCJTTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVE1MaW5lUG9zaXRpb25ZMFwifSxcbiAgICBcIjAwMTg2MDQwXCI6IHt2cjogXCJVTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVE1MaW5lUG9zaXRpb25YMVJldGlyZWRcIn0sXG4gICAgXCIwMDE4NjA0MVwiOiB7dnI6IFwiU0xcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRNTGluZVBvc2l0aW9uWDFcIn0sXG4gICAgXCIwMDE4NjA0MlwiOiB7dnI6IFwiVUxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRNTGluZVBvc2l0aW9uWTFSZXRpcmVkXCJ9LFxuICAgIFwiMDAxODYwNDNcIjoge3ZyOiBcIlNMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUTUxpbmVQb3NpdGlvblkxXCJ9LFxuICAgIFwiMDAxODYwNDRcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQaXhlbENvbXBvbmVudE9yZ2FuaXphdGlvblwifSxcbiAgICBcIjAwMTg2MDQ2XCI6IHt2cjogXCJVTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGl4ZWxDb21wb25lbnRNYXNrXCJ9LFxuICAgIFwiMDAxODYwNDhcIjoge3ZyOiBcIlVMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQaXhlbENvbXBvbmVudFJhbmdlU3RhcnRcIn0sXG4gICAgXCIwMDE4NjA0QVwiOiB7dnI6IFwiVUxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBpeGVsQ29tcG9uZW50UmFuZ2VTdG9wXCJ9LFxuICAgIFwiMDAxODYwNENcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQaXhlbENvbXBvbmVudFBoeXNpY2FsVW5pdHNcIn0sXG4gICAgXCIwMDE4NjA0RVwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBpeGVsQ29tcG9uZW50RGF0YVR5cGVcIn0sXG4gICAgXCIwMDE4NjA1MFwiOiB7dnI6IFwiVUxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk51bWJlck9mVGFibGVCcmVha1BvaW50c1wifSxcbiAgICBcIjAwMTg2MDUyXCI6IHt2cjogXCJVTFwiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJUYWJsZU9mWEJyZWFrUG9pbnRzXCJ9LFxuICAgIFwiMDAxODYwNTRcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIlRhYmxlT2ZZQnJlYWtQb2ludHNcIn0sXG4gICAgXCIwMDE4NjA1NlwiOiB7dnI6IFwiVUxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk51bWJlck9mVGFibGVFbnRyaWVzXCJ9LFxuICAgIFwiMDAxODYwNThcIjoge3ZyOiBcIlVMXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIlRhYmxlT2ZQaXhlbFZhbHVlc1wifSxcbiAgICBcIjAwMTg2MDVBXCI6IHt2cjogXCJGTFwiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJUYWJsZU9mUGFyYW1ldGVyVmFsdWVzXCJ9LFxuICAgIFwiMDAxODYwNjBcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIlJXYXZlVGltZVZlY3RvclwifSxcbiAgICBcIjAwMTg3MDAwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGV0ZWN0b3JDb25kaXRpb25zTm9taW5hbEZsYWdcIn0sXG4gICAgXCIwMDE4NzAwMVwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRldGVjdG9yVGVtcGVyYXR1cmVcIn0sXG4gICAgXCIwMDE4NzAwNFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRldGVjdG9yVHlwZVwifSxcbiAgICBcIjAwMTg3MDA1XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGV0ZWN0b3JDb25maWd1cmF0aW9uXCJ9LFxuICAgIFwiMDAxODcwMDZcIjoge3ZyOiBcIkxUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEZXRlY3RvckRlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMDAxODcwMDhcIjoge3ZyOiBcIkxUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEZXRlY3Rvck1vZGVcIn0sXG4gICAgXCIwMDE4NzAwQVwiOiB7dnI6IFwiU0hcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRldGVjdG9ySURcIn0sXG4gICAgXCIwMDE4NzAwQ1wiOiB7dnI6IFwiREFcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRhdGVPZkxhc3REZXRlY3RvckNhbGlicmF0aW9uXCJ9LFxuICAgIFwiMDAxODcwMEVcIjoge3ZyOiBcIlRNXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUaW1lT2ZMYXN0RGV0ZWN0b3JDYWxpYnJhdGlvblwifSxcbiAgICBcIjAwMTg3MDEwXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRXhwb3N1cmVzT25EZXRlY3RvclNpbmNlTGFzdENhbGlicmF0aW9uXCJ9LFxuICAgIFwiMDAxODcwMTFcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJFeHBvc3VyZXNPbkRldGVjdG9yU2luY2VNYW51ZmFjdHVyZWRcIn0sXG4gICAgXCIwMDE4NzAxMlwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRldGVjdG9yVGltZVNpbmNlTGFzdEV4cG9zdXJlXCJ9LFxuICAgIFwiMDAxODcwMTRcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEZXRlY3RvckFjdGl2ZVRpbWVcIn0sXG4gICAgXCIwMDE4NzAxNlwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRldGVjdG9yQWN0aXZhdGlvbk9mZnNldEZyb21FeHBvc3VyZVwifSxcbiAgICBcIjAwMTg3MDFBXCI6IHt2cjogXCJEU1wiLCB2bTogXCIyXCIsIG5hbWU6IFwiRGV0ZWN0b3JCaW5uaW5nXCJ9LFxuICAgIFwiMDAxODcwMjBcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjJcIiwgbmFtZTogXCJEZXRlY3RvckVsZW1lbnRQaHlzaWNhbFNpemVcIn0sXG4gICAgXCIwMDE4NzAyMlwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMlwiLCBuYW1lOiBcIkRldGVjdG9yRWxlbWVudFNwYWNpbmdcIn0sXG4gICAgXCIwMDE4NzAyNFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRldGVjdG9yQWN0aXZlU2hhcGVcIn0sXG4gICAgXCIwMDE4NzAyNlwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMS0yXCIsIG5hbWU6IFwiRGV0ZWN0b3JBY3RpdmVEaW1lbnNpb25zXCJ9LFxuICAgIFwiMDAxODcwMjhcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjJcIiwgbmFtZTogXCJEZXRlY3RvckFjdGl2ZU9yaWdpblwifSxcbiAgICBcIjAwMTg3MDJBXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGV0ZWN0b3JNYW51ZmFjdHVyZXJOYW1lXCJ9LFxuICAgIFwiMDAxODcwMkJcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEZXRlY3Rvck1hbnVmYWN0dXJlck1vZGVsTmFtZVwifSxcbiAgICBcIjAwMTg3MDMwXCI6IHt2cjogXCJEU1wiLCB2bTogXCIyXCIsIG5hbWU6IFwiRmllbGRPZlZpZXdPcmlnaW5cIn0sXG4gICAgXCIwMDE4NzAzMlwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkZpZWxkT2ZWaWV3Um90YXRpb25cIn0sXG4gICAgXCIwMDE4NzAzNFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkZpZWxkT2ZWaWV3SG9yaXpvbnRhbEZsaXBcIn0sXG4gICAgXCIwMDE4NzAzNlwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMlwiLCBuYW1lOiBcIlBpeGVsRGF0YUFyZWFPcmlnaW5SZWxhdGl2ZVRvRk9WXCJ9LFxuICAgIFwiMDAxODcwMzhcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQaXhlbERhdGFBcmVhUm90YXRpb25BbmdsZVJlbGF0aXZlVG9GT1ZcIn0sXG4gICAgXCIwMDE4NzA0MFwiOiB7dnI6IFwiTFRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkdyaWRBYnNvcmJpbmdNYXRlcmlhbFwifSxcbiAgICBcIjAwMTg3MDQxXCI6IHt2cjogXCJMVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiR3JpZFNwYWNpbmdNYXRlcmlhbFwifSxcbiAgICBcIjAwMTg3MDQyXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiR3JpZFRoaWNrbmVzc1wifSxcbiAgICBcIjAwMTg3MDQ0XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiR3JpZFBpdGNoXCJ9LFxuICAgIFwiMDAxODcwNDZcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjJcIiwgbmFtZTogXCJHcmlkQXNwZWN0UmF0aW9cIn0sXG4gICAgXCIwMDE4NzA0OFwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkdyaWRQZXJpb2RcIn0sXG4gICAgXCIwMDE4NzA0Q1wiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkdyaWRGb2NhbERpc3RhbmNlXCJ9LFxuICAgIFwiMDAxODcwNTBcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIkZpbHRlck1hdGVyaWFsXCJ9LFxuICAgIFwiMDAxODcwNTJcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIkZpbHRlclRoaWNrbmVzc01pbmltdW1cIn0sXG4gICAgXCIwMDE4NzA1NFwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiRmlsdGVyVGhpY2tuZXNzTWF4aW11bVwifSxcbiAgICBcIjAwMTg3MDU2XCI6IHt2cjogXCJGTFwiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJGaWx0ZXJCZWFtUGF0aExlbmd0aE1pbmltdW1cIn0sXG4gICAgXCIwMDE4NzA1OFwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiRmlsdGVyQmVhbVBhdGhMZW5ndGhNYXhpbXVtXCJ9LFxuICAgIFwiMDAxODcwNjBcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJFeHBvc3VyZUNvbnRyb2xNb2RlXCJ9LFxuICAgIFwiMDAxODcwNjJcIjoge3ZyOiBcIkxUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJFeHBvc3VyZUNvbnRyb2xNb2RlRGVzY3JpcHRpb25cIn0sXG4gICAgXCIwMDE4NzA2NFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkV4cG9zdXJlU3RhdHVzXCJ9LFxuICAgIFwiMDAxODcwNjVcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQaG90b3RpbWVyU2V0dGluZ1wifSxcbiAgICBcIjAwMTg4MTUwXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRXhwb3N1cmVUaW1lSW51U1wifSxcbiAgICBcIjAwMTg4MTUxXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiWFJheVR1YmVDdXJyZW50SW51QVwifSxcbiAgICBcIjAwMTg5MDA0XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29udGVudFF1YWxpZmljYXRpb25cIn0sXG4gICAgXCIwMDE4OTAwNVwiOiB7dnI6IFwiU0hcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlB1bHNlU2VxdWVuY2VOYW1lXCJ9LFxuICAgIFwiMDAxODkwMDZcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNUkltYWdpbmdNb2RpZmllclNlcXVlbmNlXCJ9LFxuICAgIFwiMDAxODkwMDhcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJFY2hvUHVsc2VTZXF1ZW5jZVwifSxcbiAgICBcIjAwMTg5MDA5XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW52ZXJzaW9uUmVjb3ZlcnlcIn0sXG4gICAgXCIwMDE4OTAxMFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkZsb3dDb21wZW5zYXRpb25cIn0sXG4gICAgXCIwMDE4OTAxMVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk11bHRpcGxlU3BpbkVjaG9cIn0sXG4gICAgXCIwMDE4OTAxMlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk11bHRpUGxhbmFyRXhjaXRhdGlvblwifSxcbiAgICBcIjAwMTg5MDE0XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGhhc2VDb250cmFzdFwifSxcbiAgICBcIjAwMTg5MDE1XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiVGltZU9mRmxpZ2h0Q29udHJhc3RcIn0sXG4gICAgXCIwMDE4OTAxNlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNwb2lsaW5nXCJ9LFxuICAgIFwiMDAxODkwMTdcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTdGVhZHlTdGF0ZVB1bHNlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDE4OTAxOFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkVjaG9QbGFuYXJQdWxzZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDAxODkwMTlcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUYWdBbmdsZUZpcnN0QXhpc1wifSxcbiAgICBcIjAwMTg5MDIwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTWFnbmV0aXphdGlvblRyYW5zZmVyXCJ9LFxuICAgIFwiMDAxODkwMjFcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUMlByZXBhcmF0aW9uXCJ9LFxuICAgIFwiMDAxODkwMjJcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJCbG9vZFNpZ25hbE51bGxpbmdcIn0sXG4gICAgXCIwMDE4OTAyNFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNhdHVyYXRpb25SZWNvdmVyeVwifSxcbiAgICBcIjAwMTg5MDI1XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3BlY3RyYWxseVNlbGVjdGVkU3VwcHJlc3Npb25cIn0sXG4gICAgXCIwMDE4OTAyNlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNwZWN0cmFsbHlTZWxlY3RlZEV4Y2l0YXRpb25cIn0sXG4gICAgXCIwMDE4OTAyN1wiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNwYXRpYWxQcmVzYXR1cmF0aW9uXCJ9LFxuICAgIFwiMDAxODkwMjhcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUYWdnaW5nXCJ9LFxuICAgIFwiMDAxODkwMjlcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJPdmVyc2FtcGxpbmdQaGFzZVwifSxcbiAgICBcIjAwMTg5MDMwXCI6IHt2cjogXCJGRFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVGFnU3BhY2luZ0ZpcnN0RGltZW5zaW9uXCJ9LFxuICAgIFwiMDAxODkwMzJcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJHZW9tZXRyeU9mS1NwYWNlVHJhdmVyc2FsXCJ9LFxuICAgIFwiMDAxODkwMzNcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTZWdtZW50ZWRLU3BhY2VUcmF2ZXJzYWxcIn0sXG4gICAgXCIwMDE4OTAzNFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlY3RpbGluZWFyUGhhc2VFbmNvZGVSZW9yZGVyaW5nXCJ9LFxuICAgIFwiMDAxODkwMzVcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUYWdUaGlja25lc3NcIn0sXG4gICAgXCIwMDE4OTAzNlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBhcnRpYWxGb3VyaWVyRGlyZWN0aW9uXCJ9LFxuICAgIFwiMDAxODkwMzdcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDYXJkaWFjU3luY2hyb25pemF0aW9uVGVjaG5pcXVlXCJ9LFxuICAgIFwiMDAxODkwNDFcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWNlaXZlQ29pbE1hbnVmYWN0dXJlck5hbWVcIn0sXG4gICAgXCIwMDE4OTA0MlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk1SUmVjZWl2ZUNvaWxTZXF1ZW5jZVwifSxcbiAgICBcIjAwMTg5MDQzXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVjZWl2ZUNvaWxUeXBlXCJ9LFxuICAgIFwiMDAxODkwNDRcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJRdWFkcmF0dXJlUmVjZWl2ZUNvaWxcIn0sXG4gICAgXCIwMDE4OTA0NVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk11bHRpQ29pbERlZmluaXRpb25TZXF1ZW5jZVwifSxcbiAgICBcIjAwMTg5MDQ2XCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTXVsdGlDb2lsQ29uZmlndXJhdGlvblwifSxcbiAgICBcIjAwMTg5MDQ3XCI6IHt2cjogXCJTSFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTXVsdGlDb2lsRWxlbWVudE5hbWVcIn0sXG4gICAgXCIwMDE4OTA0OFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk11bHRpQ29pbEVsZW1lbnRVc2VkXCJ9LFxuICAgIFwiMDAxODkwNDlcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNUlRyYW5zbWl0Q29pbFNlcXVlbmNlXCJ9LFxuICAgIFwiMDAxODkwNTBcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUcmFuc21pdENvaWxNYW51ZmFjdHVyZXJOYW1lXCJ9LFxuICAgIFwiMDAxODkwNTFcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUcmFuc21pdENvaWxUeXBlXCJ9LFxuICAgIFwiMDAxODkwNTJcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjEtMlwiLCBuYW1lOiBcIlNwZWN0cmFsV2lkdGhcIn0sXG4gICAgXCIwMDE4OTA1M1wiOiB7dnI6IFwiRkRcIiwgdm06IFwiMS0yXCIsIG5hbWU6IFwiQ2hlbWljYWxTaGlmdFJlZmVyZW5jZVwifSxcbiAgICBcIjAwMTg5MDU0XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiVm9sdW1lTG9jYWxpemF0aW9uVGVjaG5pcXVlXCJ9LFxuICAgIFwiMDAxODkwNThcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNUkFjcXVpc2l0aW9uRnJlcXVlbmN5RW5jb2RpbmdTdGVwc1wifSxcbiAgICBcIjAwMTg5MDU5XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGVjb3VwbGluZ1wifSxcbiAgICBcIjAwMTg5MDYwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxLTJcIiwgbmFtZTogXCJEZWNvdXBsZWROdWNsZXVzXCJ9LFxuICAgIFwiMDAxODkwNjFcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjEtMlwiLCBuYW1lOiBcIkRlY291cGxpbmdGcmVxdWVuY3lcIn0sXG4gICAgXCIwMDE4OTA2MlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRlY291cGxpbmdNZXRob2RcIn0sXG4gICAgXCIwMDE4OTA2M1wiOiB7dnI6IFwiRkRcIiwgdm06IFwiMS0yXCIsIG5hbWU6IFwiRGVjb3VwbGluZ0NoZW1pY2FsU2hpZnRSZWZlcmVuY2VcIn0sXG4gICAgXCIwMDE4OTA2NFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIktTcGFjZUZpbHRlcmluZ1wifSxcbiAgICBcIjAwMTg5MDY1XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxLTJcIiwgbmFtZTogXCJUaW1lRG9tYWluRmlsdGVyaW5nXCJ9LFxuICAgIFwiMDAxODkwNjZcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjEtMlwiLCBuYW1lOiBcIk51bWJlck9mWmVyb0ZpbGxzXCJ9LFxuICAgIFwiMDAxODkwNjdcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJCYXNlbGluZUNvcnJlY3Rpb25cIn0sXG4gICAgXCIwMDE4OTA2OVwiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBhcmFsbGVsUmVkdWN0aW9uRmFjdG9ySW5QbGFuZVwifSxcbiAgICBcIjAwMTg5MDcwXCI6IHt2cjogXCJGRFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ2FyZGlhY1JSSW50ZXJ2YWxTcGVjaWZpZWRcIn0sXG4gICAgXCIwMDE4OTA3M1wiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFjcXVpc2l0aW9uRHVyYXRpb25cIn0sXG4gICAgXCIwMDE4OTA3NFwiOiB7dnI6IFwiRFRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkZyYW1lQWNxdWlzaXRpb25EYXRlVGltZVwifSxcbiAgICBcIjAwMTg5MDc1XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGlmZnVzaW9uRGlyZWN0aW9uYWxpdHlcIn0sXG4gICAgXCIwMDE4OTA3NlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRpZmZ1c2lvbkdyYWRpZW50RGlyZWN0aW9uU2VxdWVuY2VcIn0sXG4gICAgXCIwMDE4OTA3N1wiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBhcmFsbGVsQWNxdWlzaXRpb25cIn0sXG4gICAgXCIwMDE4OTA3OFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBhcmFsbGVsQWNxdWlzaXRpb25UZWNobmlxdWVcIn0sXG4gICAgXCIwMDE4OTA3OVwiOiB7dnI6IFwiRkRcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiSW52ZXJzaW9uVGltZXNcIn0sXG4gICAgXCIwMDE4OTA4MFwiOiB7dnI6IFwiU1RcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk1ldGFib2xpdGVNYXBEZXNjcmlwdGlvblwifSxcbiAgICBcIjAwMTg5MDgxXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGFydGlhbEZvdXJpZXJcIn0sXG4gICAgXCIwMDE4OTA4MlwiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkVmZmVjdGl2ZUVjaG9UaW1lXCJ9LFxuICAgIFwiMDAxODkwODNcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNZXRhYm9saXRlTWFwQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDAxODkwODRcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDaGVtaWNhbFNoaWZ0U2VxdWVuY2VcIn0sXG4gICAgXCIwMDE4OTA4NVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNhcmRpYWNTaWduYWxTb3VyY2VcIn0sXG4gICAgXCIwMDE4OTA4N1wiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRpZmZ1c2lvbkJWYWx1ZVwifSxcbiAgICBcIjAwMTg5MDg5XCI6IHt2cjogXCJGRFwiLCB2bTogXCIzXCIsIG5hbWU6IFwiRGlmZnVzaW9uR3JhZGllbnRPcmllbnRhdGlvblwifSxcbiAgICBcIjAwMTg5MDkwXCI6IHt2cjogXCJGRFwiLCB2bTogXCIzXCIsIG5hbWU6IFwiVmVsb2NpdHlFbmNvZGluZ0RpcmVjdGlvblwifSxcbiAgICBcIjAwMTg5MDkxXCI6IHt2cjogXCJGRFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVmVsb2NpdHlFbmNvZGluZ01pbmltdW1WYWx1ZVwifSxcbiAgICBcIjAwMTg5MDkyXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVmVsb2NpdHlFbmNvZGluZ0FjcXVpc2l0aW9uU2VxdWVuY2VcIn0sXG4gICAgXCIwMDE4OTA5M1wiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk51bWJlck9mS1NwYWNlVHJhamVjdG9yaWVzXCJ9LFxuICAgIFwiMDAxODkwOTRcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb3ZlcmFnZU9mS1NwYWNlXCJ9LFxuICAgIFwiMDAxODkwOTVcIjoge3ZyOiBcIlVMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTcGVjdHJvc2NvcHlBY3F1aXNpdGlvblBoYXNlUm93c1wifSxcbiAgICBcIjAwMTg5MDk2XCI6IHt2cjogXCJGRFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGFyYWxsZWxSZWR1Y3Rpb25GYWN0b3JJblBsYW5lUmV0aXJlZFwifSxcbiAgICBcIjAwMTg5MDk4XCI6IHt2cjogXCJGRFwiLCB2bTogXCIxLTJcIiwgbmFtZTogXCJUcmFuc21pdHRlckZyZXF1ZW5jeVwifSxcbiAgICBcIjAwMTg5MTAwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxLTJcIiwgbmFtZTogXCJSZXNvbmFudE51Y2xldXNcIn0sXG4gICAgXCIwMDE4OTEwMVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkZyZXF1ZW5jeUNvcnJlY3Rpb25cIn0sXG4gICAgXCIwMDE4OTEwM1wiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk1SU3BlY3Ryb3Njb3B5Rk9WR2VvbWV0cnlTZXF1ZW5jZVwifSxcbiAgICBcIjAwMTg5MTA0XCI6IHt2cjogXCJGRFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2xhYlRoaWNrbmVzc1wifSxcbiAgICBcIjAwMTg5MTA1XCI6IHt2cjogXCJGRFwiLCB2bTogXCIzXCIsIG5hbWU6IFwiU2xhYk9yaWVudGF0aW9uXCJ9LFxuICAgIFwiMDAxODkxMDZcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjNcIiwgbmFtZTogXCJNaWRTbGFiUG9zaXRpb25cIn0sXG4gICAgXCIwMDE4OTEwN1wiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk1SU3BhdGlhbFNhdHVyYXRpb25TZXF1ZW5jZVwifSxcbiAgICBcIjAwMTg5MTEyXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTVJUaW1pbmdBbmRSZWxhdGVkUGFyYW1ldGVyc1NlcXVlbmNlXCJ9LFxuICAgIFwiMDAxODkxMTRcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNUkVjaG9TZXF1ZW5jZVwifSxcbiAgICBcIjAwMTg5MTE1XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTVJNb2RpZmllclNlcXVlbmNlXCJ9LFxuICAgIFwiMDAxODkxMTdcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNUkRpZmZ1c2lvblNlcXVlbmNlXCJ9LFxuICAgIFwiMDAxODkxMThcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDYXJkaWFjU3luY2hyb25pemF0aW9uU2VxdWVuY2VcIn0sXG4gICAgXCIwMDE4OTExOVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk1SQXZlcmFnZXNTZXF1ZW5jZVwifSxcbiAgICBcIjAwMTg5MTI1XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTVJGT1ZHZW9tZXRyeVNlcXVlbmNlXCJ9LFxuICAgIFwiMDAxODkxMjZcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJWb2x1bWVMb2NhbGl6YXRpb25TZXF1ZW5jZVwifSxcbiAgICBcIjAwMTg5MTI3XCI6IHt2cjogXCJVTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3BlY3Ryb3Njb3B5QWNxdWlzaXRpb25EYXRhQ29sdW1uc1wifSxcbiAgICBcIjAwMTg5MTQ3XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGlmZnVzaW9uQW5pc290cm9weVR5cGVcIn0sXG4gICAgXCIwMDE4OTE1MVwiOiB7dnI6IFwiRFRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkZyYW1lUmVmZXJlbmNlRGF0ZVRpbWVcIn0sXG4gICAgXCIwMDE4OTE1MlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk1STWV0YWJvbGl0ZU1hcFNlcXVlbmNlXCJ9LFxuICAgIFwiMDAxODkxNTVcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQYXJhbGxlbFJlZHVjdGlvbkZhY3Rvck91dE9mUGxhbmVcIn0sXG4gICAgXCIwMDE4OTE1OVwiOiB7dnI6IFwiVUxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNwZWN0cm9zY29weUFjcXVpc2l0aW9uT3V0T2ZQbGFuZVBoYXNlU3RlcHNcIn0sXG4gICAgXCIwMDE4OTE2NlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkJ1bGtNb3Rpb25TdGF0dXNcIn0sXG4gICAgXCIwMDE4OTE2OFwiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBhcmFsbGVsUmVkdWN0aW9uRmFjdG9yU2Vjb25kSW5QbGFuZVwifSxcbiAgICBcIjAwMTg5MTY5XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ2FyZGlhY0JlYXRSZWplY3Rpb25UZWNobmlxdWVcIn0sXG4gICAgXCIwMDE4OTE3MFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlc3BpcmF0b3J5TW90aW9uQ29tcGVuc2F0aW9uVGVjaG5pcXVlXCJ9LFxuICAgIFwiMDAxODkxNzFcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZXNwaXJhdG9yeVNpZ25hbFNvdXJjZVwifSxcbiAgICBcIjAwMTg5MTcyXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQnVsa01vdGlvbkNvbXBlbnNhdGlvblRlY2huaXF1ZVwifSxcbiAgICBcIjAwMTg5MTczXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQnVsa01vdGlvblNpZ25hbFNvdXJjZVwifSxcbiAgICBcIjAwMTg5MTc0XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQXBwbGljYWJsZVNhZmV0eVN0YW5kYXJkQWdlbmN5XCJ9LFxuICAgIFwiMDAxODkxNzVcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBcHBsaWNhYmxlU2FmZXR5U3RhbmRhcmREZXNjcmlwdGlvblwifSxcbiAgICBcIjAwMTg5MTc2XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiT3BlcmF0aW5nTW9kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDAxODkxNzdcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJPcGVyYXRpbmdNb2RlVHlwZVwifSxcbiAgICBcIjAwMTg5MTc4XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiT3BlcmF0aW5nTW9kZVwifSxcbiAgICBcIjAwMTg5MTc5XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3BlY2lmaWNBYnNvcnB0aW9uUmF0ZURlZmluaXRpb25cIn0sXG4gICAgXCIwMDE4OTE4MFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkdyYWRpZW50T3V0cHV0VHlwZVwifSxcbiAgICBcIjAwMTg5MTgxXCI6IHt2cjogXCJGRFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3BlY2lmaWNBYnNvcnB0aW9uUmF0ZVZhbHVlXCJ9LFxuICAgIFwiMDAxODkxODJcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJHcmFkaWVudE91dHB1dFwifSxcbiAgICBcIjAwMTg5MTgzXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRmxvd0NvbXBlbnNhdGlvbkRpcmVjdGlvblwifSxcbiAgICBcIjAwMTg5MTg0XCI6IHt2cjogXCJGRFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVGFnZ2luZ0RlbGF5XCJ9LFxuICAgIFwiMDAxODkxODVcIjoge3ZyOiBcIlNUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZXNwaXJhdG9yeU1vdGlvbkNvbXBlbnNhdGlvblRlY2huaXF1ZURlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMDAxODkxODZcIjoge3ZyOiBcIlNIXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZXNwaXJhdG9yeVNpZ25hbFNvdXJjZUlEXCJ9LFxuICAgIFwiMDAxODkxOTVcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDaGVtaWNhbFNoaWZ0TWluaW11bUludGVncmF0aW9uTGltaXRJbkh6XCJ9LFxuICAgIFwiMDAxODkxOTZcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDaGVtaWNhbFNoaWZ0TWF4aW11bUludGVncmF0aW9uTGltaXRJbkh6XCJ9LFxuICAgIFwiMDAxODkxOTdcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNUlZlbG9jaXR5RW5jb2RpbmdTZXF1ZW5jZVwifSxcbiAgICBcIjAwMTg5MTk4XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRmlyc3RPcmRlclBoYXNlQ29ycmVjdGlvblwifSxcbiAgICBcIjAwMTg5MTk5XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiV2F0ZXJSZWZlcmVuY2VkUGhhc2VDb3JyZWN0aW9uXCJ9LFxuICAgIFwiMDAxODkyMDBcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNUlNwZWN0cm9zY29weUFjcXVpc2l0aW9uVHlwZVwifSxcbiAgICBcIjAwMTg5MjE0XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVzcGlyYXRvcnlDeWNsZVBvc2l0aW9uXCJ9LFxuICAgIFwiMDAxODkyMTdcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJWZWxvY2l0eUVuY29kaW5nTWF4aW11bVZhbHVlXCJ9LFxuICAgIFwiMDAxODkyMThcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUYWdTcGFjaW5nU2Vjb25kRGltZW5zaW9uXCJ9LFxuICAgIFwiMDAxODkyMTlcIjoge3ZyOiBcIlNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUYWdBbmdsZVNlY29uZEF4aXNcIn0sXG4gICAgXCIwMDE4OTIyMFwiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkZyYW1lQWNxdWlzaXRpb25EdXJhdGlvblwifSxcbiAgICBcIjAwMTg5MjI2XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTVJJbWFnZUZyYW1lVHlwZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDAxODkyMjdcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNUlNwZWN0cm9zY29weUZyYW1lVHlwZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDAxODkyMzFcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNUkFjcXVpc2l0aW9uUGhhc2VFbmNvZGluZ1N0ZXBzSW5QbGFuZVwifSxcbiAgICBcIjAwMTg5MjMyXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTVJBY3F1aXNpdGlvblBoYXNlRW5jb2RpbmdTdGVwc091dE9mUGxhbmVcIn0sXG4gICAgXCIwMDE4OTIzNFwiOiB7dnI6IFwiVUxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNwZWN0cm9zY29weUFjcXVpc2l0aW9uUGhhc2VDb2x1bW5zXCJ9LFxuICAgIFwiMDAxODkyMzZcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDYXJkaWFjQ3ljbGVQb3NpdGlvblwifSxcbiAgICBcIjAwMTg5MjM5XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3BlY2lmaWNBYnNvcnB0aW9uUmF0ZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDAxODkyNDBcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSRkVjaG9UcmFpbkxlbmd0aFwifSxcbiAgICBcIjAwMTg5MjQxXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiR3JhZGllbnRFY2hvVHJhaW5MZW5ndGhcIn0sXG4gICAgXCIwMDE4OTI1MFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFydGVyaWFsU3BpbkxhYmVsaW5nQ29udHJhc3RcIn0sXG4gICAgXCIwMDE4OTI1MVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk1SQXJ0ZXJpYWxTcGluTGFiZWxpbmdTZXF1ZW5jZVwifSxcbiAgICBcIjAwMTg5MjUyXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQVNMVGVjaG5pcXVlRGVzY3JpcHRpb25cIn0sXG4gICAgXCIwMDE4OTI1M1wiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFTTFNsYWJOdW1iZXJcIn0sXG4gICAgXCIwMDE4OTI1NFwiOiB7dnI6IFwiRkRcIiwgdm06IFwiMSBcIiwgbmFtZTogXCJBU0xTbGFiVGhpY2tuZXNzXCJ9LFxuICAgIFwiMDAxODkyNTVcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjMgXCIsIG5hbWU6IFwiQVNMU2xhYk9yaWVudGF0aW9uXCJ9LFxuICAgIFwiMDAxODkyNTZcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjNcIiwgbmFtZTogXCJBU0xNaWRTbGFiUG9zaXRpb25cIn0sXG4gICAgXCIwMDE4OTI1N1wiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMSBcIiwgbmFtZTogXCJBU0xDb250ZXh0XCJ9LFxuICAgIFwiMDAxODkyNThcIjoge3ZyOiBcIlVMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBU0xQdWxzZVRyYWluRHVyYXRpb25cIn0sXG4gICAgXCIwMDE4OTI1OVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMSBcIiwgbmFtZTogXCJBU0xDcnVzaGVyRmxhZ1wifSxcbiAgICBcIjAwMTg5MjVBXCI6IHt2cjogXCJGRFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQVNMQ3J1c2hlckZsb3dcIn0sXG4gICAgXCIwMDE4OTI1QlwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFTTENydXNoZXJEZXNjcmlwdGlvblwifSxcbiAgICBcIjAwMTg5MjVDXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxIFwiLCBuYW1lOiBcIkFTTEJvbHVzQ3V0b2ZmRmxhZ1wifSxcbiAgICBcIjAwMTg5MjVEXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQVNMQm9sdXNDdXRvZmZUaW1pbmdTZXF1ZW5jZVwifSxcbiAgICBcIjAwMTg5MjVFXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQVNMQm9sdXNDdXRvZmZUZWNobmlxdWVcIn0sXG4gICAgXCIwMDE4OTI1RlwiOiB7dnI6IFwiVUxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFTTEJvbHVzQ3V0b2ZmRGVsYXlUaW1lXCJ9LFxuICAgIFwiMDAxODkyNjBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBU0xTbGFiU2VxdWVuY2VcIn0sXG4gICAgXCIwMDE4OTI5NVwiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNoZW1pY2FsU2hpZnRNaW5pbXVtSW50ZWdyYXRpb25MaW1pdElucHBtXCJ9LFxuICAgIFwiMDAxODkyOTZcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDaGVtaWNhbFNoaWZ0TWF4aW11bUludGVncmF0aW9uTGltaXRJbnBwbVwifSxcbiAgICBcIjAwMTg5MzAxXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ1RBY3F1aXNpdGlvblR5cGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwMTg5MzAyXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQWNxdWlzaXRpb25UeXBlXCJ9LFxuICAgIFwiMDAxODkzMDNcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUdWJlQW5nbGVcIn0sXG4gICAgXCIwMDE4OTMwNFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNUQWNxdWlzaXRpb25EZXRhaWxzU2VxdWVuY2VcIn0sXG4gICAgXCIwMDE4OTMwNVwiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJldm9sdXRpb25UaW1lXCJ9LFxuICAgIFwiMDAxODkzMDZcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTaW5nbGVDb2xsaW1hdGlvbldpZHRoXCJ9LFxuICAgIFwiMDAxODkzMDdcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUb3RhbENvbGxpbWF0aW9uV2lkdGhcIn0sXG4gICAgXCIwMDE4OTMwOFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNUVGFibGVEeW5hbWljc1NlcXVlbmNlXCJ9LFxuICAgIFwiMDAxODkzMDlcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUYWJsZVNwZWVkXCJ9LFxuICAgIFwiMDAxODkzMTBcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUYWJsZUZlZWRQZXJSb3RhdGlvblwifSxcbiAgICBcIjAwMTg5MzExXCI6IHt2cjogXCJGRFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3BpcmFsUGl0Y2hGYWN0b3JcIn0sXG4gICAgXCIwMDE4OTMxMlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNUR2VvbWV0cnlTZXF1ZW5jZVwifSxcbiAgICBcIjAwMTg5MzEzXCI6IHt2cjogXCJGRFwiLCB2bTogXCIzXCIsIG5hbWU6IFwiRGF0YUNvbGxlY3Rpb25DZW50ZXJQYXRpZW50XCJ9LFxuICAgIFwiMDAxODkzMTRcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDVFJlY29uc3RydWN0aW9uU2VxdWVuY2VcIn0sXG4gICAgXCIwMDE4OTMxNVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlY29uc3RydWN0aW9uQWxnb3JpdGhtXCJ9LFxuICAgIFwiMDAxODkzMTZcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb252b2x1dGlvbktlcm5lbEdyb3VwXCJ9LFxuICAgIFwiMDAxODkzMTdcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjJcIiwgbmFtZTogXCJSZWNvbnN0cnVjdGlvbkZpZWxkT2ZWaWV3XCJ9LFxuICAgIFwiMDAxODkzMThcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjNcIiwgbmFtZTogXCJSZWNvbnN0cnVjdGlvblRhcmdldENlbnRlclBhdGllbnRcIn0sXG4gICAgXCIwMDE4OTMxOVwiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlY29uc3RydWN0aW9uQW5nbGVcIn0sXG4gICAgXCIwMDE4OTMyMFwiOiB7dnI6IFwiU0hcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkltYWdlRmlsdGVyXCJ9LFxuICAgIFwiMDAxODkzMjFcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDVEV4cG9zdXJlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDE4OTMyMlwiOiB7dnI6IFwiRkRcIiwgdm06IFwiMlwiLCBuYW1lOiBcIlJlY29uc3RydWN0aW9uUGl4ZWxTcGFjaW5nXCJ9LFxuICAgIFwiMDAxODkzMjNcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJFeHBvc3VyZU1vZHVsYXRpb25UeXBlXCJ9LFxuICAgIFwiMDAxODkzMjRcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJFc3RpbWF0ZWREb3NlU2F2aW5nXCJ9LFxuICAgIFwiMDAxODkzMjVcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDVFhSYXlEZXRhaWxzU2VxdWVuY2VcIn0sXG4gICAgXCIwMDE4OTMyNlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNUUG9zaXRpb25TZXF1ZW5jZVwifSxcbiAgICBcIjAwMTg5MzI3XCI6IHt2cjogXCJGRFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVGFibGVQb3NpdGlvblwifSxcbiAgICBcIjAwMTg5MzI4XCI6IHt2cjogXCJGRFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRXhwb3N1cmVUaW1lSW5tc1wifSxcbiAgICBcIjAwMTg5MzI5XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ1RJbWFnZUZyYW1lVHlwZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDAxODkzMzBcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJYUmF5VHViZUN1cnJlbnRJbm1BXCJ9LFxuICAgIFwiMDAxODkzMzJcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJFeHBvc3VyZUlubUFzXCJ9LFxuICAgIFwiMDAxODkzMzNcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb25zdGFudFZvbHVtZUZsYWdcIn0sXG4gICAgXCIwMDE4OTMzNFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkZsdW9yb3Njb3B5RmxhZ1wifSxcbiAgICBcIjAwMTg5MzM1XCI6IHt2cjogXCJGRFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGlzdGFuY2VTb3VyY2VUb0RhdGFDb2xsZWN0aW9uQ2VudGVyXCJ9LFxuICAgIFwiMDAxODkzMzdcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb250cmFzdEJvbHVzQWdlbnROdW1iZXJcIn0sXG4gICAgXCIwMDE4OTMzOFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvbnRyYXN0Qm9sdXNJbmdyZWRpZW50Q29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDAxODkzNDBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb250cmFzdEFkbWluaXN0cmF0aW9uUHJvZmlsZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDAxODkzNDFcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb250cmFzdEJvbHVzVXNhZ2VTZXF1ZW5jZVwifSxcbiAgICBcIjAwMTg5MzQyXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29udHJhc3RCb2x1c0FnZW50QWRtaW5pc3RlcmVkXCJ9LFxuICAgIFwiMDAxODkzNDNcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb250cmFzdEJvbHVzQWdlbnREZXRlY3RlZFwifSxcbiAgICBcIjAwMTg5MzQ0XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29udHJhc3RCb2x1c0FnZW50UGhhc2VcIn0sXG4gICAgXCIwMDE4OTM0NVwiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNUREl2b2xcIn0sXG4gICAgXCIwMDE4OTM0NlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNURElQaGFudG9tVHlwZUNvZGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwMTg5MzUxXCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ2FsY2l1bVNjb3JpbmdNYXNzRmFjdG9yUGF0aWVudFwifSxcbiAgICBcIjAwMTg5MzUyXCI6IHt2cjogXCJGTFwiLCB2bTogXCIzXCIsIG5hbWU6IFwiQ2FsY2l1bVNjb3JpbmdNYXNzRmFjdG9yRGV2aWNlXCJ9LFxuICAgIFwiMDAxODkzNTNcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJFbmVyZ3lXZWlnaHRpbmdGYWN0b3JcIn0sXG4gICAgXCIwMDE4OTM2MFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNUQWRkaXRpb25hbFhSYXlTb3VyY2VTZXF1ZW5jZVwifSxcbiAgICBcIjAwMTg5NDAxXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUHJvamVjdGlvblBpeGVsQ2FsaWJyYXRpb25TZXF1ZW5jZVwifSxcbiAgICBcIjAwMTg5NDAyXCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGlzdGFuY2VTb3VyY2VUb0lzb2NlbnRlclwifSxcbiAgICBcIjAwMTg5NDAzXCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGlzdGFuY2VPYmplY3RUb1RhYmxlVG9wXCJ9LFxuICAgIFwiMDAxODk0MDRcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjJcIiwgbmFtZTogXCJPYmplY3RQaXhlbFNwYWNpbmdJbkNlbnRlck9mQmVhbVwifSxcbiAgICBcIjAwMTg5NDA1XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUG9zaXRpb25lclBvc2l0aW9uU2VxdWVuY2VcIn0sXG4gICAgXCIwMDE4OTQwNlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRhYmxlUG9zaXRpb25TZXF1ZW5jZVwifSxcbiAgICBcIjAwMTg5NDA3XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29sbGltYXRvclNoYXBlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDE4OTQxMFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBsYW5lc0luQWNxdWlzaXRpb25cIn0sXG4gICAgXCIwMDE4OTQxMlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlhBWFJGRnJhbWVDaGFyYWN0ZXJpc3RpY3NTZXF1ZW5jZVwifSxcbiAgICBcIjAwMTg5NDE3XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRnJhbWVBY3F1aXNpdGlvblNlcXVlbmNlXCJ9LFxuICAgIFwiMDAxODk0MjBcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJYUmF5UmVjZXB0b3JUeXBlXCJ9LFxuICAgIFwiMDAxODk0MjNcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBY3F1aXNpdGlvblByb3RvY29sTmFtZVwifSxcbiAgICBcIjAwMTg5NDI0XCI6IHt2cjogXCJMVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQWNxdWlzaXRpb25Qcm90b2NvbERlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMDAxODk0MjVcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb250cmFzdEJvbHVzSW5ncmVkaWVudE9wYXF1ZVwifSxcbiAgICBcIjAwMTg5NDI2XCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGlzdGFuY2VSZWNlcHRvclBsYW5lVG9EZXRlY3RvckhvdXNpbmdcIn0sXG4gICAgXCIwMDE4OTQyN1wiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkludGVuc2lmaWVyQWN0aXZlU2hhcGVcIn0sXG4gICAgXCIwMDE4OTQyOFwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMS0yXCIsIG5hbWU6IFwiSW50ZW5zaWZpZXJBY3RpdmVEaW1lbnNpb25zXCJ9LFxuICAgIFwiMDAxODk0MjlcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjJcIiwgbmFtZTogXCJQaHlzaWNhbERldGVjdG9yU2l6ZVwifSxcbiAgICBcIjAwMTg5NDMwXCI6IHt2cjogXCJGTFwiLCB2bTogXCIyXCIsIG5hbWU6IFwiUG9zaXRpb25PZklzb2NlbnRlclByb2plY3Rpb25cIn0sXG4gICAgXCIwMDE4OTQzMlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkZpZWxkT2ZWaWV3U2VxdWVuY2VcIn0sXG4gICAgXCIwMDE4OTQzM1wiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkZpZWxkT2ZWaWV3RGVzY3JpcHRpb25cIn0sXG4gICAgXCIwMDE4OTQzNFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkV4cG9zdXJlQ29udHJvbFNlbnNpbmdSZWdpb25zU2VxdWVuY2VcIn0sXG4gICAgXCIwMDE4OTQzNVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkV4cG9zdXJlQ29udHJvbFNlbnNpbmdSZWdpb25TaGFwZVwifSxcbiAgICBcIjAwMTg5NDM2XCI6IHt2cjogXCJTU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRXhwb3N1cmVDb250cm9sU2Vuc2luZ1JlZ2lvbkxlZnRWZXJ0aWNhbEVkZ2VcIn0sXG4gICAgXCIwMDE4OTQzN1wiOiB7dnI6IFwiU1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkV4cG9zdXJlQ29udHJvbFNlbnNpbmdSZWdpb25SaWdodFZlcnRpY2FsRWRnZVwifSxcbiAgICBcIjAwMTg5NDM4XCI6IHt2cjogXCJTU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRXhwb3N1cmVDb250cm9sU2Vuc2luZ1JlZ2lvblVwcGVySG9yaXpvbnRhbEVkZ2VcIn0sXG4gICAgXCIwMDE4OTQzOVwiOiB7dnI6IFwiU1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkV4cG9zdXJlQ29udHJvbFNlbnNpbmdSZWdpb25Mb3dlckhvcml6b250YWxFZGdlXCJ9LFxuICAgIFwiMDAxODk0NDBcIjoge3ZyOiBcIlNTXCIsIHZtOiBcIjJcIiwgbmFtZTogXCJDZW50ZXJPZkNpcmN1bGFyRXhwb3N1cmVDb250cm9sU2Vuc2luZ1JlZ2lvblwifSxcbiAgICBcIjAwMTg5NDQxXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmFkaXVzT2ZDaXJjdWxhckV4cG9zdXJlQ29udHJvbFNlbnNpbmdSZWdpb25cIn0sXG4gICAgXCIwMDE4OTQ0MlwiOiB7dnI6IFwiU1NcIiwgdm06IFwiMi1uXCIsIG5hbWU6IFwiVmVydGljZXNPZlRoZVBvbHlnb25hbEV4cG9zdXJlQ29udHJvbFNlbnNpbmdSZWdpb25cIn0sXG4gICAgXCIwMDE4OTQ0N1wiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvbHVtbkFuZ3VsYXRpb25QYXRpZW50XCJ9LFxuICAgIFwiMDAxODk0NDlcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJCZWFtQW5nbGVcIn0sXG4gICAgXCIwMDE4OTQ1MVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkZyYW1lRGV0ZWN0b3JQYXJhbWV0ZXJzU2VxdWVuY2VcIn0sXG4gICAgXCIwMDE4OTQ1MlwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNhbGN1bGF0ZWRBbmF0b215VGhpY2tuZXNzXCJ9LFxuICAgIFwiMDAxODk0NTVcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDYWxpYnJhdGlvblNlcXVlbmNlXCJ9LFxuICAgIFwiMDAxODk0NTZcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJPYmplY3RUaGlja25lc3NTZXF1ZW5jZVwifSxcbiAgICBcIjAwMTg5NDU3XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGxhbmVJZGVudGlmaWNhdGlvblwifSxcbiAgICBcIjAwMTg5NDYxXCI6IHt2cjogXCJGTFwiLCB2bTogXCIxLTJcIiwgbmFtZTogXCJGaWVsZE9mVmlld0RpbWVuc2lvbnNJbkZsb2F0XCJ9LFxuICAgIFwiMDAxODk0NjJcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJc29jZW50ZXJSZWZlcmVuY2VTeXN0ZW1TZXF1ZW5jZVwifSxcbiAgICBcIjAwMTg5NDYzXCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUG9zaXRpb25lcklzb2NlbnRlclByaW1hcnlBbmdsZVwifSxcbiAgICBcIjAwMTg5NDY0XCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUG9zaXRpb25lcklzb2NlbnRlclNlY29uZGFyeUFuZ2xlXCJ9LFxuICAgIFwiMDAxODk0NjVcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQb3NpdGlvbmVySXNvY2VudGVyRGV0ZWN0b3JSb3RhdGlvbkFuZ2xlXCJ9LFxuICAgIFwiMDAxODk0NjZcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUYWJsZVhQb3NpdGlvblRvSXNvY2VudGVyXCJ9LFxuICAgIFwiMDAxODk0NjdcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUYWJsZVlQb3NpdGlvblRvSXNvY2VudGVyXCJ9LFxuICAgIFwiMDAxODk0NjhcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUYWJsZVpQb3NpdGlvblRvSXNvY2VudGVyXCJ9LFxuICAgIFwiMDAxODk0NjlcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUYWJsZUhvcml6b250YWxSb3RhdGlvbkFuZ2xlXCJ9LFxuICAgIFwiMDAxODk0NzBcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUYWJsZUhlYWRUaWx0QW5nbGVcIn0sXG4gICAgXCIwMDE4OTQ3MVwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRhYmxlQ3JhZGxlVGlsdEFuZ2xlXCJ9LFxuICAgIFwiMDAxODk0NzJcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJGcmFtZURpc3BsYXlTaHV0dGVyU2VxdWVuY2VcIn0sXG4gICAgXCIwMDE4OTQ3M1wiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFjcXVpcmVkSW1hZ2VBcmVhRG9zZVByb2R1Y3RcIn0sXG4gICAgXCIwMDE4OTQ3NFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNBcm1Qb3NpdGlvbmVyVGFibGV0b3BSZWxhdGlvbnNoaXBcIn0sXG4gICAgXCIwMDE4OTQ3NlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlhSYXlHZW9tZXRyeVNlcXVlbmNlXCJ9LFxuICAgIFwiMDAxODk0NzdcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJcnJhZGlhdGlvbkV2ZW50SWRlbnRpZmljYXRpb25TZXF1ZW5jZVwifSxcbiAgICBcIjAwMTg5NTA0XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiWFJheTNERnJhbWVUeXBlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDE4OTUwNlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvbnRyaWJ1dGluZ1NvdXJjZXNTZXF1ZW5jZVwifSxcbiAgICBcIjAwMTg5NTA3XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiWFJheTNEQWNxdWlzaXRpb25TZXF1ZW5jZVwifSxcbiAgICBcIjAwMTg5NTA4XCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUHJpbWFyeVBvc2l0aW9uZXJTY2FuQXJjXCJ9LFxuICAgIFwiMDAxODk1MDlcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTZWNvbmRhcnlQb3NpdGlvbmVyU2NhbkFyY1wifSxcbiAgICBcIjAwMTg5NTEwXCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUHJpbWFyeVBvc2l0aW9uZXJTY2FuU3RhcnRBbmdsZVwifSxcbiAgICBcIjAwMTg5NTExXCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2Vjb25kYXJ5UG9zaXRpb25lclNjYW5TdGFydEFuZ2xlXCJ9LFxuICAgIFwiMDAxODk1MTRcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQcmltYXJ5UG9zaXRpb25lckluY3JlbWVudFwifSxcbiAgICBcIjAwMTg5NTE1XCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2Vjb25kYXJ5UG9zaXRpb25lckluY3JlbWVudFwifSxcbiAgICBcIjAwMTg5NTE2XCI6IHt2cjogXCJEVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3RhcnRBY3F1aXNpdGlvbkRhdGVUaW1lXCJ9LFxuICAgIFwiMDAxODk1MTdcIjoge3ZyOiBcIkRUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJFbmRBY3F1aXNpdGlvbkRhdGVUaW1lXCJ9LFxuICAgIFwiMDAxODk1MjRcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBcHBsaWNhdGlvbk5hbWVcIn0sXG4gICAgXCIwMDE4OTUyNVwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFwcGxpY2F0aW9uVmVyc2lvblwifSxcbiAgICBcIjAwMTg5NTI2XCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQXBwbGljYXRpb25NYW51ZmFjdHVyZXJcIn0sXG4gICAgXCIwMDE4OTUyN1wiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFsZ29yaXRobVR5cGVcIn0sXG4gICAgXCIwMDE4OTUyOFwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFsZ29yaXRobURlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMDAxODk1MzBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJYUmF5M0RSZWNvbnN0cnVjdGlvblNlcXVlbmNlXCJ9LFxuICAgIFwiMDAxODk1MzFcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWNvbnN0cnVjdGlvbkRlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMDAxODk1MzhcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQZXJQcm9qZWN0aW9uQWNxdWlzaXRpb25TZXF1ZW5jZVwifSxcbiAgICBcIjAwMTg5NjAxXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGlmZnVzaW9uQk1hdHJpeFNlcXVlbmNlXCJ9LFxuICAgIFwiMDAxODk2MDJcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEaWZmdXNpb25CVmFsdWVYWFwifSxcbiAgICBcIjAwMTg5NjAzXCI6IHt2cjogXCJGRFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGlmZnVzaW9uQlZhbHVlWFlcIn0sXG4gICAgXCIwMDE4OTYwNFwiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRpZmZ1c2lvbkJWYWx1ZVhaXCJ9LFxuICAgIFwiMDAxODk2MDVcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEaWZmdXNpb25CVmFsdWVZWVwifSxcbiAgICBcIjAwMTg5NjA2XCI6IHt2cjogXCJGRFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGlmZnVzaW9uQlZhbHVlWVpcIn0sXG4gICAgXCIwMDE4OTYwN1wiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRpZmZ1c2lvbkJWYWx1ZVpaXCJ9LFxuICAgIFwiMDAxODk3MDFcIjoge3ZyOiBcIkRUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEZWNheUNvcnJlY3Rpb25EYXRlVGltZVwifSxcbiAgICBcIjAwMTg5NzE1XCI6IHt2cjogXCJGRFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3RhcnREZW5zaXR5VGhyZXNob2xkXCJ9LFxuICAgIFwiMDAxODk3MTZcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTdGFydFJlbGF0aXZlRGVuc2l0eURpZmZlcmVuY2VUaHJlc2hvbGRcIn0sXG4gICAgXCIwMDE4OTcxN1wiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlN0YXJ0Q2FyZGlhY1RyaWdnZXJDb3VudFRocmVzaG9sZFwifSxcbiAgICBcIjAwMTg5NzE4XCI6IHt2cjogXCJGRFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3RhcnRSZXNwaXJhdG9yeVRyaWdnZXJDb3VudFRocmVzaG9sZFwifSxcbiAgICBcIjAwMTg5NzE5XCI6IHt2cjogXCJGRFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVGVybWluYXRpb25Db3VudHNUaHJlc2hvbGRcIn0sXG4gICAgXCIwMDE4OTcyMFwiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRlcm1pbmF0aW9uRGVuc2l0eVRocmVzaG9sZFwifSxcbiAgICBcIjAwMTg5NzIxXCI6IHt2cjogXCJGRFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVGVybWluYXRpb25SZWxhdGl2ZURlbnNpdHlUaHJlc2hvbGRcIn0sXG4gICAgXCIwMDE4OTcyMlwiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRlcm1pbmF0aW9uVGltZVRocmVzaG9sZFwifSxcbiAgICBcIjAwMTg5NzIzXCI6IHt2cjogXCJGRFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVGVybWluYXRpb25DYXJkaWFjVHJpZ2dlckNvdW50VGhyZXNob2xkXCJ9LFxuICAgIFwiMDAxODk3MjRcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUZXJtaW5hdGlvblJlc3BpcmF0b3J5VHJpZ2dlckNvdW50VGhyZXNob2xkXCJ9LFxuICAgIFwiMDAxODk3MjVcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEZXRlY3Rvckdlb21ldHJ5XCJ9LFxuICAgIFwiMDAxODk3MjZcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUcmFuc3ZlcnNlRGV0ZWN0b3JTZXBhcmF0aW9uXCJ9LFxuICAgIFwiMDAxODk3MjdcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBeGlhbERldGVjdG9yRGltZW5zaW9uXCJ9LFxuICAgIFwiMDAxODk3MjlcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSYWRpb3BoYXJtYWNldXRpY2FsQWdlbnROdW1iZXJcIn0sXG4gICAgXCIwMDE4OTczMlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBFVEZyYW1lQWNxdWlzaXRpb25TZXF1ZW5jZVwifSxcbiAgICBcIjAwMTg5NzMzXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUEVURGV0ZWN0b3JNb3Rpb25EZXRhaWxzU2VxdWVuY2VcIn0sXG4gICAgXCIwMDE4OTczNFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBFVFRhYmxlRHluYW1pY3NTZXF1ZW5jZVwifSxcbiAgICBcIjAwMTg5NzM1XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUEVUUG9zaXRpb25TZXF1ZW5jZVwifSxcbiAgICBcIjAwMTg5NzM2XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUEVURnJhbWVDb3JyZWN0aW9uRmFjdG9yc1NlcXVlbmNlXCJ9LFxuICAgIFwiMDAxODk3MzdcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSYWRpb3BoYXJtYWNldXRpY2FsVXNhZ2VTZXF1ZW5jZVwifSxcbiAgICBcIjAwMTg5NzM4XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQXR0ZW51YXRpb25Db3JyZWN0aW9uU291cmNlXCJ9LFxuICAgIFwiMDAxODk3MzlcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJOdW1iZXJPZkl0ZXJhdGlvbnNcIn0sXG4gICAgXCIwMDE4OTc0MFwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk51bWJlck9mU3Vic2V0c1wifSxcbiAgICBcIjAwMTg5NzQ5XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUEVUUmVjb25zdHJ1Y3Rpb25TZXF1ZW5jZVwifSxcbiAgICBcIjAwMTg5NzUxXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUEVURnJhbWVUeXBlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDE4OTc1NVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRpbWVPZkZsaWdodEluZm9ybWF0aW9uVXNlZFwifSxcbiAgICBcIjAwMTg5NzU2XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVjb25zdHJ1Y3Rpb25UeXBlXCJ9LFxuICAgIFwiMDAxODk3NThcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEZWNheUNvcnJlY3RlZFwifSxcbiAgICBcIjAwMTg5NzU5XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQXR0ZW51YXRpb25Db3JyZWN0ZWRcIn0sXG4gICAgXCIwMDE4OTc2MFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNjYXR0ZXJDb3JyZWN0ZWRcIn0sXG4gICAgXCIwMDE4OTc2MVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRlYWRUaW1lQ29ycmVjdGVkXCJ9LFxuICAgIFwiMDAxODk3NjJcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJHYW50cnlNb3Rpb25Db3JyZWN0ZWRcIn0sXG4gICAgXCIwMDE4OTc2M1wiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBhdGllbnRNb3Rpb25Db3JyZWN0ZWRcIn0sXG4gICAgXCIwMDE4OTc2NFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvdW50TG9zc05vcm1hbGl6YXRpb25Db3JyZWN0ZWRcIn0sXG4gICAgXCIwMDE4OTc2NVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJhbmRvbXNDb3JyZWN0ZWRcIn0sXG4gICAgXCIwMDE4OTc2NlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk5vblVuaWZvcm1SYWRpYWxTYW1wbGluZ0NvcnJlY3RlZFwifSxcbiAgICBcIjAwMTg5NzY3XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2Vuc2l0aXZpdHlDYWxpYnJhdGVkXCJ9LFxuICAgIFwiMDAxODk3NjhcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEZXRlY3Rvck5vcm1hbGl6YXRpb25Db3JyZWN0aW9uXCJ9LFxuICAgIFwiMDAxODk3NjlcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJdGVyYXRpdmVSZWNvbnN0cnVjdGlvbk1ldGhvZFwifSxcbiAgICBcIjAwMTg5NzcwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQXR0ZW51YXRpb25Db3JyZWN0aW9uVGVtcG9yYWxSZWxhdGlvbnNoaXBcIn0sXG4gICAgXCIwMDE4OTc3MVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBhdGllbnRQaHlzaW9sb2dpY2FsU3RhdGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwMTg5NzcyXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGF0aWVudFBoeXNpb2xvZ2ljYWxTdGF0ZUNvZGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwMTg5ODAxXCI6IHt2cjogXCJGRFwiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJEZXB0aHNPZkZvY3VzXCJ9LFxuICAgIFwiMDAxODk4MDNcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJFeGNsdWRlZEludGVydmFsc1NlcXVlbmNlXCJ9LFxuICAgIFwiMDAxODk4MDRcIjoge3ZyOiBcIkRUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJFeGNsdXNpb25TdGFydERhdGV0aW1lXCJ9LFxuICAgIFwiMDAxODk4MDVcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJFeGNsdXNpb25EdXJhdGlvblwifSxcbiAgICBcIjAwMTg5ODA2XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVVNJbWFnZURlc2NyaXB0aW9uU2VxdWVuY2VcIn0sXG4gICAgXCIwMDE4OTgwN1wiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkltYWdlRGF0YVR5cGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwMTg5ODA4XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGF0YVR5cGVcIn0sXG4gICAgXCIwMDE4OTgwOVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRyYW5zZHVjZXJTY2FuUGF0dGVybkNvZGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwMTg5ODBCXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQWxpYXNlZERhdGFUeXBlXCJ9LFxuICAgIFwiMDAxODk4MENcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQb3NpdGlvbk1lYXN1cmluZ0RldmljZVVzZWRcIn0sXG4gICAgXCIwMDE4OTgwRFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRyYW5zZHVjZXJHZW9tZXRyeUNvZGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwMTg5ODBFXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVHJhbnNkdWNlckJlYW1TdGVlcmluZ0NvZGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwMTg5ODBGXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVHJhbnNkdWNlckFwcGxpY2F0aW9uQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDAxOEEwMDFcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb250cmlidXRpbmdFcXVpcG1lbnRTZXF1ZW5jZVwifSxcbiAgICBcIjAwMThBMDAyXCI6IHt2cjogXCJEVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29udHJpYnV0aW9uRGF0ZVRpbWVcIn0sXG4gICAgXCIwMDE4QTAwM1wiOiB7dnI6IFwiU1RcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvbnRyaWJ1dGlvbkRlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMDAyMDAwMERcIjoge3ZyOiBcIlVJXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTdHVkeUluc3RhbmNlVUlEXCJ9LFxuICAgIFwiMDAyMDAwMEVcIjoge3ZyOiBcIlVJXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTZXJpZXNJbnN0YW5jZVVJRFwifSxcbiAgICBcIjAwMjAwMDEwXCI6IHt2cjogXCJTSFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3R1ZHlJRFwifSxcbiAgICBcIjAwMjAwMDExXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2VyaWVzTnVtYmVyXCJ9LFxuICAgIFwiMDAyMDAwMTJcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBY3F1aXNpdGlvbk51bWJlclwifSxcbiAgICBcIjAwMjAwMDEzXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW5zdGFuY2VOdW1iZXJcIn0sXG4gICAgXCIwMDIwMDAxNFwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIklzb3RvcGVOdW1iZXJcIn0sXG4gICAgXCIwMDIwMDAxNVwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBoYXNlTnVtYmVyXCJ9LFxuICAgIFwiMDAyMDAwMTZcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbnRlcnZhbE51bWJlclwifSxcbiAgICBcIjAwMjAwMDE3XCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiVGltZVNsb3ROdW1iZXJcIn0sXG4gICAgXCIwMDIwMDAxOFwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFuZ2xlTnVtYmVyXCJ9LFxuICAgIFwiMDAyMDAwMTlcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJdGVtTnVtYmVyXCJ9LFxuICAgIFwiMDAyMDAwMjBcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjJcIiwgbmFtZTogXCJQYXRpZW50T3JpZW50YXRpb25cIn0sXG4gICAgXCIwMDIwMDAyMlwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk92ZXJsYXlOdW1iZXJcIn0sXG4gICAgXCIwMDIwMDAyNFwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkN1cnZlTnVtYmVyXCJ9LFxuICAgIFwiMDAyMDAwMjZcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJMVVROdW1iZXJcIn0sXG4gICAgXCIwMDIwMDAzMFwiOiB7dnI6IFwiRFNcIiwgdm06IFwiM1wiLCBuYW1lOiBcIkltYWdlUG9zaXRpb25cIn0sXG4gICAgXCIwMDIwMDAzMlwiOiB7dnI6IFwiRFNcIiwgdm06IFwiM1wiLCBuYW1lOiBcIkltYWdlUG9zaXRpb25QYXRpZW50XCJ9LFxuICAgIFwiMDAyMDAwMzVcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjZcIiwgbmFtZTogXCJJbWFnZU9yaWVudGF0aW9uXCJ9LFxuICAgIFwiMDAyMDAwMzdcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjZcIiwgbmFtZTogXCJJbWFnZU9yaWVudGF0aW9uUGF0aWVudFwifSxcbiAgICBcIjAwMjAwMDUwXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTG9jYXRpb25cIn0sXG4gICAgXCIwMDIwMDA1MlwiOiB7dnI6IFwiVUlcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkZyYW1lT2ZSZWZlcmVuY2VVSURcIn0sXG4gICAgXCIwMDIwMDA2MFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkxhdGVyYWxpdHlcIn0sXG4gICAgXCIwMDIwMDA2MlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkltYWdlTGF0ZXJhbGl0eVwifSxcbiAgICBcIjAwMjAwMDcwXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW1hZ2VHZW9tZXRyeVR5cGVcIn0sXG4gICAgXCIwMDIwMDA4MFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiTWFza2luZ0ltYWdlXCJ9LFxuICAgIFwiMDAyMDAwQUFcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZXBvcnROdW1iZXJcIn0sXG4gICAgXCIwMDIwMDEwMFwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRlbXBvcmFsUG9zaXRpb25JZGVudGlmaWVyXCJ9LFxuICAgIFwiMDAyMDAxMDVcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJOdW1iZXJPZlRlbXBvcmFsUG9zaXRpb25zXCJ9LFxuICAgIFwiMDAyMDAxMTBcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUZW1wb3JhbFJlc29sdXRpb25cIn0sXG4gICAgXCIwMDIwMDIwMFwiOiB7dnI6IFwiVUlcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlN5bmNocm9uaXphdGlvbkZyYW1lT2ZSZWZlcmVuY2VVSURcIn0sXG4gICAgXCIwMDIwMDI0MlwiOiB7dnI6IFwiVUlcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNPUEluc3RhbmNlVUlET2ZDb25jYXRlbmF0aW9uU291cmNlXCJ9LFxuICAgIFwiMDAyMDEwMDBcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTZXJpZXNJblN0dWR5XCJ9LFxuICAgIFwiMDAyMDEwMDFcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBY3F1aXNpdGlvbnNJblNlcmllc1wifSxcbiAgICBcIjAwMjAxMDAyXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW1hZ2VzSW5BY3F1aXNpdGlvblwifSxcbiAgICBcIjAwMjAxMDAzXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW1hZ2VzSW5TZXJpZXNcIn0sXG4gICAgXCIwMDIwMTAwNFwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFjcXVpc2l0aW9uc0luU3R1ZHlcIn0sXG4gICAgXCIwMDIwMTAwNVwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkltYWdlc0luU3R1ZHlcIn0sXG4gICAgXCIwMDIwMTAyMFwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiUmVmZXJlbmNlXCJ9LFxuICAgIFwiMDAyMDEwNDBcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQb3NpdGlvblJlZmVyZW5jZUluZGljYXRvclwifSxcbiAgICBcIjAwMjAxMDQxXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2xpY2VMb2NhdGlvblwifSxcbiAgICBcIjAwMjAxMDcwXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJPdGhlclN0dWR5TnVtYmVyc1wifSxcbiAgICBcIjAwMjAxMjAwXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTnVtYmVyT2ZQYXRpZW50UmVsYXRlZFN0dWRpZXNcIn0sXG4gICAgXCIwMDIwMTIwMlwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk51bWJlck9mUGF0aWVudFJlbGF0ZWRTZXJpZXNcIn0sXG4gICAgXCIwMDIwMTIwNFwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk51bWJlck9mUGF0aWVudFJlbGF0ZWRJbnN0YW5jZXNcIn0sXG4gICAgXCIwMDIwMTIwNlwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk51bWJlck9mU3R1ZHlSZWxhdGVkU2VyaWVzXCJ9LFxuICAgIFwiMDAyMDEyMDhcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJOdW1iZXJPZlN0dWR5UmVsYXRlZEluc3RhbmNlc1wifSxcbiAgICBcIjAwMjAxMjA5XCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTnVtYmVyT2ZTZXJpZXNSZWxhdGVkSW5zdGFuY2VzXCJ9LFxuICAgIFwiMDAyMDMxeHhcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIlNvdXJjZUltYWdlSURzXCJ9LFxuICAgIFwiMDAyMDM0MDFcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNb2RpZnlpbmdEZXZpY2VJRFwifSxcbiAgICBcIjAwMjAzNDAyXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTW9kaWZpZWRJbWFnZUlEXCJ9LFxuICAgIFwiMDAyMDM0MDNcIjoge3ZyOiBcIkRBXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNb2RpZmllZEltYWdlRGF0ZVwifSxcbiAgICBcIjAwMjAzNDA0XCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTW9kaWZ5aW5nRGV2aWNlTWFudWZhY3R1cmVyXCJ9LFxuICAgIFwiMDAyMDM0MDVcIjoge3ZyOiBcIlRNXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNb2RpZmllZEltYWdlVGltZVwifSxcbiAgICBcIjAwMjAzNDA2XCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTW9kaWZpZWRJbWFnZURlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMDAyMDQwMDBcIjoge3ZyOiBcIkxUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbWFnZUNvbW1lbnRzXCJ9LFxuICAgIFwiMDAyMDUwMDBcIjoge3ZyOiBcIkFUXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIk9yaWdpbmFsSW1hZ2VJZGVudGlmaWNhdGlvblwifSxcbiAgICBcIjAwMjA1MDAyXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJPcmlnaW5hbEltYWdlSWRlbnRpZmljYXRpb25Ob21lbmNsYXR1cmVcIn0sXG4gICAgXCIwMDIwOTA1NlwiOiB7dnI6IFwiU0hcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlN0YWNrSURcIn0sXG4gICAgXCIwMDIwOTA1N1wiOiB7dnI6IFwiVUxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkluU3RhY2tQb3NpdGlvbk51bWJlclwifSxcbiAgICBcIjAwMjA5MDcxXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRnJhbWVBbmF0b215U2VxdWVuY2VcIn0sXG4gICAgXCIwMDIwOTA3MlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkZyYW1lTGF0ZXJhbGl0eVwifSxcbiAgICBcIjAwMjA5MTExXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRnJhbWVDb250ZW50U2VxdWVuY2VcIn0sXG4gICAgXCIwMDIwOTExM1wiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBsYW5lUG9zaXRpb25TZXF1ZW5jZVwifSxcbiAgICBcIjAwMjA5MTE2XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGxhbmVPcmllbnRhdGlvblNlcXVlbmNlXCJ9LFxuICAgIFwiMDAyMDkxMjhcIjoge3ZyOiBcIlVMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUZW1wb3JhbFBvc2l0aW9uSW5kZXhcIn0sXG4gICAgXCIwMDIwOTE1M1wiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk5vbWluYWxDYXJkaWFjVHJpZ2dlckRlbGF5VGltZVwifSxcbiAgICBcIjAwMjA5MTU0XCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTm9taW5hbENhcmRpYWNUcmlnZ2VyVGltZVByaW9yVG9SUGVha1wifSxcbiAgICBcIjAwMjA5MTU1XCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQWN0dWFsQ2FyZGlhY1RyaWdnZXJUaW1lUHJpb3JUb1JQZWFrXCJ9LFxuICAgIFwiMDAyMDkxNTZcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJGcmFtZUFjcXVpc2l0aW9uTnVtYmVyXCJ9LFxuICAgIFwiMDAyMDkxNTdcIjoge3ZyOiBcIlVMXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIkRpbWVuc2lvbkluZGV4VmFsdWVzXCJ9LFxuICAgIFwiMDAyMDkxNThcIjoge3ZyOiBcIkxUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJGcmFtZUNvbW1lbnRzXCJ9LFxuICAgIFwiMDAyMDkxNjFcIjoge3ZyOiBcIlVJXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb25jYXRlbmF0aW9uVUlEXCJ9LFxuICAgIFwiMDAyMDkxNjJcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbkNvbmNhdGVuYXRpb25OdW1iZXJcIn0sXG4gICAgXCIwMDIwOTE2M1wiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkluQ29uY2F0ZW5hdGlvblRvdGFsTnVtYmVyXCJ9LFxuICAgIFwiMDAyMDkxNjRcIjoge3ZyOiBcIlVJXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEaW1lbnNpb25Pcmdhbml6YXRpb25VSURcIn0sXG4gICAgXCIwMDIwOTE2NVwiOiB7dnI6IFwiQVRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRpbWVuc2lvbkluZGV4UG9pbnRlclwifSxcbiAgICBcIjAwMjA5MTY3XCI6IHt2cjogXCJBVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRnVuY3Rpb25hbEdyb3VwUG9pbnRlclwifSxcbiAgICBcIjAwMjA5MjEzXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGltZW5zaW9uSW5kZXhQcml2YXRlQ3JlYXRvclwifSxcbiAgICBcIjAwMjA5MjIxXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGltZW5zaW9uT3JnYW5pemF0aW9uU2VxdWVuY2VcIn0sXG4gICAgXCIwMDIwOTIyMlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRpbWVuc2lvbkluZGV4U2VxdWVuY2VcIn0sXG4gICAgXCIwMDIwOTIyOFwiOiB7dnI6IFwiVUxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvbmNhdGVuYXRpb25GcmFtZU9mZnNldE51bWJlclwifSxcbiAgICBcIjAwMjA5MjM4XCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRnVuY3Rpb25hbEdyb3VwUHJpdmF0ZUNyZWF0b3JcIn0sXG4gICAgXCIwMDIwOTI0MVwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk5vbWluYWxQZXJjZW50YWdlT2ZDYXJkaWFjUGhhc2VcIn0sXG4gICAgXCIwMDIwOTI0NVwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk5vbWluYWxQZXJjZW50YWdlT2ZSZXNwaXJhdG9yeVBoYXNlXCJ9LFxuICAgIFwiMDAyMDkyNDZcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTdGFydGluZ1Jlc3BpcmF0b3J5QW1wbGl0dWRlXCJ9LFxuICAgIFwiMDAyMDkyNDdcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTdGFydGluZ1Jlc3BpcmF0b3J5UGhhc2VcIn0sXG4gICAgXCIwMDIwOTI0OFwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkVuZGluZ1Jlc3BpcmF0b3J5QW1wbGl0dWRlXCJ9LFxuICAgIFwiMDAyMDkyNDlcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJFbmRpbmdSZXNwaXJhdG9yeVBoYXNlXCJ9LFxuICAgIFwiMDAyMDkyNTBcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZXNwaXJhdG9yeVRyaWdnZXJUeXBlXCJ9LFxuICAgIFwiMDAyMDkyNTFcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSUkludGVydmFsVGltZU5vbWluYWxcIn0sXG4gICAgXCIwMDIwOTI1MlwiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFjdHVhbENhcmRpYWNUcmlnZ2VyRGVsYXlUaW1lXCJ9LFxuICAgIFwiMDAyMDkyNTNcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZXNwaXJhdG9yeVN5bmNocm9uaXphdGlvblNlcXVlbmNlXCJ9LFxuICAgIFwiMDAyMDkyNTRcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZXNwaXJhdG9yeUludGVydmFsVGltZVwifSxcbiAgICBcIjAwMjA5MjU1XCI6IHt2cjogXCJGRFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTm9taW5hbFJlc3BpcmF0b3J5VHJpZ2dlckRlbGF5VGltZVwifSxcbiAgICBcIjAwMjA5MjU2XCI6IHt2cjogXCJGRFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVzcGlyYXRvcnlUcmlnZ2VyRGVsYXlUaHJlc2hvbGRcIn0sXG4gICAgXCIwMDIwOTI1N1wiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFjdHVhbFJlc3BpcmF0b3J5VHJpZ2dlckRlbGF5VGltZVwifSxcbiAgICBcIjAwMjA5MzAxXCI6IHt2cjogXCJGRFwiLCB2bTogXCIzXCIsIG5hbWU6IFwiSW1hZ2VQb3NpdGlvblZvbHVtZVwifSxcbiAgICBcIjAwMjA5MzAyXCI6IHt2cjogXCJGRFwiLCB2bTogXCI2XCIsIG5hbWU6IFwiSW1hZ2VPcmllbnRhdGlvblZvbHVtZVwifSxcbiAgICBcIjAwMjA5MzA3XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiVWx0cmFzb3VuZEFjcXVpc2l0aW9uR2VvbWV0cnlcIn0sXG4gICAgXCIwMDIwOTMwOFwiOiB7dnI6IFwiRkRcIiwgdm06IFwiM1wiLCBuYW1lOiBcIkFwZXhQb3NpdGlvblwifSxcbiAgICBcIjAwMjA5MzA5XCI6IHt2cjogXCJGRFwiLCB2bTogXCIxNlwiLCBuYW1lOiBcIlZvbHVtZVRvVHJhbnNkdWNlck1hcHBpbmdNYXRyaXhcIn0sXG4gICAgXCIwMDIwOTMwQVwiOiB7dnI6IFwiRkRcIiwgdm06IFwiMTZcIiwgbmFtZTogXCJWb2x1bWVUb1RhYmxlTWFwcGluZ01hdHJpeFwifSxcbiAgICBcIjAwMjA5MzBDXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGF0aWVudEZyYW1lT2ZSZWZlcmVuY2VTb3VyY2VcIn0sXG4gICAgXCIwMDIwOTMwRFwiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRlbXBvcmFsUG9zaXRpb25UaW1lT2Zmc2V0XCJ9LFxuICAgIFwiMDAyMDkzMEVcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQbGFuZVBvc2l0aW9uVm9sdW1lU2VxdWVuY2VcIn0sXG4gICAgXCIwMDIwOTMwRlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBsYW5lT3JpZW50YXRpb25Wb2x1bWVTZXF1ZW5jZVwifSxcbiAgICBcIjAwMjA5MzEwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVGVtcG9yYWxQb3NpdGlvblNlcXVlbmNlXCJ9LFxuICAgIFwiMDAyMDkzMTFcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEaW1lbnNpb25Pcmdhbml6YXRpb25UeXBlXCJ9LFxuICAgIFwiMDAyMDkzMTJcIjoge3ZyOiBcIlVJXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJWb2x1bWVGcmFtZU9mUmVmZXJlbmNlVUlEXCJ9LFxuICAgIFwiMDAyMDkzMTNcIjoge3ZyOiBcIlVJXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUYWJsZUZyYW1lT2ZSZWZlcmVuY2VVSURcIn0sXG4gICAgXCIwMDIwOTQyMVwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRpbWVuc2lvbkRlc2NyaXB0aW9uTGFiZWxcIn0sXG4gICAgXCIwMDIwOTQ1MFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBhdGllbnRPcmllbnRhdGlvbkluRnJhbWVTZXF1ZW5jZVwifSxcbiAgICBcIjAwMjA5NDUzXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRnJhbWVMYWJlbFwifSxcbiAgICBcIjAwMjA5NTE4XCI6IHt2cjogXCJVU1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJBY3F1aXNpdGlvbkluZGV4XCJ9LFxuICAgIFwiMDAyMDk1MjlcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb250cmlidXRpbmdTT1BJbnN0YW5jZXNSZWZlcmVuY2VTZXF1ZW5jZVwifSxcbiAgICBcIjAwMjA5NTM2XCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVjb25zdHJ1Y3Rpb25JbmRleFwifSxcbiAgICBcIjAwMjIwMDAxXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTGlnaHRQYXRoRmlsdGVyUGFzc1Rocm91Z2hXYXZlbGVuZ3RoXCJ9LFxuICAgIFwiMDAyMjAwMDJcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjJcIiwgbmFtZTogXCJMaWdodFBhdGhGaWx0ZXJQYXNzQmFuZFwifSxcbiAgICBcIjAwMjIwMDAzXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW1hZ2VQYXRoRmlsdGVyUGFzc1Rocm91Z2hXYXZlbGVuZ3RoXCJ9LFxuICAgIFwiMDAyMjAwMDRcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjJcIiwgbmFtZTogXCJJbWFnZVBhdGhGaWx0ZXJQYXNzQmFuZFwifSxcbiAgICBcIjAwMjIwMDA1XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGF0aWVudEV5ZU1vdmVtZW50Q29tbWFuZGVkXCJ9LFxuICAgIFwiMDAyMjAwMDZcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQYXRpZW50RXllTW92ZW1lbnRDb21tYW5kQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDAyMjAwMDdcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTcGhlcmljYWxMZW5zUG93ZXJcIn0sXG4gICAgXCIwMDIyMDAwOFwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkN5bGluZGVyTGVuc1Bvd2VyXCJ9LFxuICAgIFwiMDAyMjAwMDlcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDeWxpbmRlckF4aXNcIn0sXG4gICAgXCIwMDIyMDAwQVwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkVtbWV0cm9waWNNYWduaWZpY2F0aW9uXCJ9LFxuICAgIFwiMDAyMjAwMEJcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbnRyYU9jdWxhclByZXNzdXJlXCJ9LFxuICAgIFwiMDAyMjAwMENcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJIb3Jpem9udGFsRmllbGRPZlZpZXdcIn0sXG4gICAgXCIwMDIyMDAwRFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlB1cGlsRGlsYXRlZFwifSxcbiAgICBcIjAwMjIwMDBFXCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGVncmVlT2ZEaWxhdGlvblwifSxcbiAgICBcIjAwMjIwMDEwXCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3RlcmVvQmFzZWxpbmVBbmdsZVwifSxcbiAgICBcIjAwMjIwMDExXCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3RlcmVvQmFzZWxpbmVEaXNwbGFjZW1lbnRcIn0sXG4gICAgXCIwMDIyMDAxMlwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlN0ZXJlb0hvcml6b250YWxQaXhlbE9mZnNldFwifSxcbiAgICBcIjAwMjIwMDEzXCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3RlcmVvVmVydGljYWxQaXhlbE9mZnNldFwifSxcbiAgICBcIjAwMjIwMDE0XCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3RlcmVvUm90YXRpb25cIn0sXG4gICAgXCIwMDIyMDAxNVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFjcXVpc2l0aW9uRGV2aWNlVHlwZUNvZGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwMjIwMDE2XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiSWxsdW1pbmF0aW9uVHlwZUNvZGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwMjIwMDE3XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTGlnaHRQYXRoRmlsdGVyVHlwZVN0YWNrQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDAyMjAwMThcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbWFnZVBhdGhGaWx0ZXJUeXBlU3RhY2tDb2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDIyMDAxOVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkxlbnNlc0NvZGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwMjIwMDFBXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ2hhbm5lbERlc2NyaXB0aW9uQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDAyMjAwMUJcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWZyYWN0aXZlU3RhdGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwMjIwMDFDXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTXlkcmlhdGljQWdlbnRDb2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDIyMDAxRFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlbGF0aXZlSW1hZ2VQb3NpdGlvbkNvZGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwMjIwMDFFXCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ2FtZXJhQW5nbGVPZlZpZXdcIn0sXG4gICAgXCIwMDIyMDAyMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlN0ZXJlb1BhaXJzU2VxdWVuY2VcIn0sXG4gICAgXCIwMDIyMDAyMVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkxlZnRJbWFnZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDAyMjAwMjJcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSaWdodEltYWdlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDIyMDAzMFwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkF4aWFsTGVuZ3RoT2ZUaGVFeWVcIn0sXG4gICAgXCIwMDIyMDAzMVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk9waHRoYWxtaWNGcmFtZUxvY2F0aW9uU2VxdWVuY2VcIn0sXG4gICAgXCIwMDIyMDAzMlwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMi0yblwiLCBuYW1lOiBcIlJlZmVyZW5jZUNvb3JkaW5hdGVzXCJ9LFxuICAgIFwiMDAyMjAwMzVcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEZXB0aFNwYXRpYWxSZXNvbHV0aW9uXCJ9LFxuICAgIFwiMDAyMjAwMzZcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNYXhpbXVtRGVwdGhEaXN0b3J0aW9uXCJ9LFxuICAgIFwiMDAyMjAwMzdcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBbG9uZ1NjYW5TcGF0aWFsUmVzb2x1dGlvblwifSxcbiAgICBcIjAwMjIwMDM4XCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTWF4aW11bUFsb25nU2NhbkRpc3RvcnRpb25cIn0sXG4gICAgXCIwMDIyMDAzOVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk9waHRoYWxtaWNJbWFnZU9yaWVudGF0aW9uXCJ9LFxuICAgIFwiMDAyMjAwNDFcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEZXB0aE9mVHJhbnN2ZXJzZUltYWdlXCJ9LFxuICAgIFwiMDAyMjAwNDJcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNeWRyaWF0aWNBZ2VudENvbmNlbnRyYXRpb25Vbml0c1NlcXVlbmNlXCJ9LFxuICAgIFwiMDAyMjAwNDhcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBY3Jvc3NTY2FuU3BhdGlhbFJlc29sdXRpb25cIn0sXG4gICAgXCIwMDIyMDA0OVwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk1heGltdW1BY3Jvc3NTY2FuRGlzdG9ydGlvblwifSxcbiAgICBcIjAwMjIwMDRFXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTXlkcmlhdGljQWdlbnRDb25jZW50cmF0aW9uXCJ9LFxuICAgIFwiMDAyMjAwNTVcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbGx1bWluYXRpb25XYXZlTGVuZ3RoXCJ9LFxuICAgIFwiMDAyMjAwNTZcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbGx1bWluYXRpb25Qb3dlclwifSxcbiAgICBcIjAwMjIwMDU3XCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiSWxsdW1pbmF0aW9uQmFuZHdpZHRoXCJ9LFxuICAgIFwiMDAyMjAwNThcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNeWRyaWF0aWNBZ2VudFNlcXVlbmNlXCJ9LFxuICAgIFwiMDAyMjEwMDdcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJPcGh0aGFsbWljQXhpYWxNZWFzdXJlbWVudHNSaWdodEV5ZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDAyMjEwMDhcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJPcGh0aGFsbWljQXhpYWxNZWFzdXJlbWVudHNMZWZ0RXllU2VxdWVuY2VcIn0sXG4gICAgXCIwMDIyMTAxMFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk9waHRoYWxtaWNBeGlhbExlbmd0aE1lYXN1cmVtZW50c1R5cGVcIn0sXG4gICAgXCIwMDIyMTAxOVwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk9waHRoYWxtaWNBeGlhbExlbmd0aFwifSxcbiAgICBcIjAwMjIxMDI0XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTGVuc1N0YXR1c0NvZGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwMjIxMDI1XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVml0cmVvdXNTdGF0dXNDb2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDIyMTAyOFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIklPTEZvcm11bGFDb2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDIyMTAyOVwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIklPTEZvcm11bGFEZXRhaWxcIn0sXG4gICAgXCIwMDIyMTAzM1wiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIktlcmF0b21ldGVySW5kZXhcIn0sXG4gICAgXCIwMDIyMTAzNVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNvdXJjZU9mT3BodGhhbG1pY0F4aWFsTGVuZ3RoQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDAyMjEwMzdcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUYXJnZXRSZWZyYWN0aW9uXCJ9LFxuICAgIFwiMDAyMjEwMzlcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWZyYWN0aXZlUHJvY2VkdXJlT2NjdXJyZWRcIn0sXG4gICAgXCIwMDIyMTA0MFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZnJhY3RpdmVTdXJnZXJ5VHlwZUNvZGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwMjIxMDQ0XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiT3BodGhhbG1pY1VsdHJhc291bmRBeGlhbE1lYXN1cmVtZW50c1R5cGVDb2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDIyMTA1MFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk9waHRoYWxtaWNBeGlhbExlbmd0aE1lYXN1cmVtZW50c1NlcXVlbmNlXCJ9LFxuICAgIFwiMDAyMjEwNTNcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJT0xQb3dlclwifSxcbiAgICBcIjAwMjIxMDU0XCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUHJlZGljdGVkUmVmcmFjdGl2ZUVycm9yXCJ9LFxuICAgIFwiMDAyMjEwNTlcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJPcGh0aGFsbWljQXhpYWxMZW5ndGhWZWxvY2l0eVwifSxcbiAgICBcIjAwMjIxMDY1XCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTGVuc1N0YXR1c0Rlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMDAyMjEwNjZcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJWaXRyZW91c1N0YXR1c0Rlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMDAyMjEwOTBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJT0xQb3dlclNlcXVlbmNlXCJ9LFxuICAgIFwiMDAyMjEwOTJcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJMZW5zQ29uc3RhbnRTZXF1ZW5jZVwifSxcbiAgICBcIjAwMjIxMDkzXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiSU9MTWFudWZhY3R1cmVyXCJ9LFxuICAgIFwiMDAyMjEwOTRcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJMZW5zQ29uc3RhbnREZXNjcmlwdGlvblwifSxcbiAgICBcIjAwMjIxMDk2XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiS2VyYXRvbWV0cnlNZWFzdXJlbWVudFR5cGVDb2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDIyMTEwMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZmVyZW5jZWRPcGh0aGFsbWljQXhpYWxNZWFzdXJlbWVudHNTZXF1ZW5jZVwifSxcbiAgICBcIjAwMjIxMTAxXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiT3BodGhhbG1pY0F4aWFsTGVuZ3RoTWVhc3VyZW1lbnRzU2VnbWVudE5hbWVDb2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDIyMTEwM1wiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZnJhY3RpdmVFcnJvckJlZm9yZVJlZnJhY3RpdmVTdXJnZXJ5Q29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDAyMjExMjFcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJT0xQb3dlckZvckV4YWN0RW1tZXRyb3BpYVwifSxcbiAgICBcIjAwMjIxMTIyXCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiSU9MUG93ZXJGb3JFeGFjdFRhcmdldFJlZnJhY3Rpb25cIn0sXG4gICAgXCIwMDIyMTEyNVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFudGVyaW9yQ2hhbWJlckRlcHRoRGVmaW5pdGlvbkNvZGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwMjIxMTMwXCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTGVuc1RoaWNrbmVzc1wifSxcbiAgICBcIjAwMjIxMTMxXCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQW50ZXJpb3JDaGFtYmVyRGVwdGhcIn0sXG4gICAgXCIwMDIyMTEzMlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNvdXJjZU9mTGVuc1RoaWNrbmVzc0RhdGFDb2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDIyMTEzM1wiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNvdXJjZU9mQW50ZXJpb3JDaGFtYmVyRGVwdGhEYXRhQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDAyMjExMzVcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTb3VyY2VPZlJlZnJhY3RpdmVFcnJvckRhdGFDb2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDIyMTE0MFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk9waHRoYWxtaWNBeGlhbExlbmd0aE1lYXN1cmVtZW50TW9kaWZpZWRcIn0sXG4gICAgXCIwMDIyMTE1MFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk9waHRoYWxtaWNBeGlhbExlbmd0aERhdGFTb3VyY2VDb2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDIyMTE1M1wiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk9waHRoYWxtaWNBeGlhbExlbmd0aEFjcXVpc2l0aW9uTWV0aG9kQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDAyMjExNTVcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTaWduYWxUb05vaXNlUmF0aW9cIn0sXG4gICAgXCIwMDIyMTE1OVwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIk9waHRoYWxtaWNBeGlhbExlbmd0aERhdGFTb3VyY2VEZXNjcmlwdGlvblwifSxcbiAgICBcIjAwMjIxMjEwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiT3BodGhhbG1pY0F4aWFsTGVuZ3RoTWVhc3VyZW1lbnRzVG90YWxMZW5ndGhTZXF1ZW5jZVwifSxcbiAgICBcIjAwMjIxMjExXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiT3BodGhhbG1pY0F4aWFsTGVuZ3RoTWVhc3VyZW1lbnRzU2VnbWVudGFsTGVuZ3RoU2VxdWVuY2VcIn0sXG4gICAgXCIwMDIyMTIxMlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk9waHRoYWxtaWNBeGlhbExlbmd0aE1lYXN1cmVtZW50c0xlbmd0aFN1bW1hdGlvblNlcXVlbmNlXCJ9LFxuICAgIFwiMDAyMjEyMjBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJVbHRyYXNvdW5kT3BodGhhbG1pY0F4aWFsTGVuZ3RoTWVhc3VyZW1lbnRzU2VxdWVuY2VcIn0sXG4gICAgXCIwMDIyMTIyNVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk9wdGljYWxPcGh0aGFsbWljQXhpYWxMZW5ndGhNZWFzdXJlbWVudHNTZXF1ZW5jZVwifSxcbiAgICBcIjAwMjIxMjMwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVWx0cmFzb3VuZFNlbGVjdGVkT3BodGhhbG1pY0F4aWFsTGVuZ3RoU2VxdWVuY2VcIn0sXG4gICAgXCIwMDIyMTI1MFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk9waHRoYWxtaWNBeGlhbExlbmd0aFNlbGVjdGlvbk1ldGhvZENvZGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwMjIxMjU1XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiT3B0aWNhbFNlbGVjdGVkT3BodGhhbG1pY0F4aWFsTGVuZ3RoU2VxdWVuY2VcIn0sXG4gICAgXCIwMDIyMTI1N1wiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNlbGVjdGVkU2VnbWVudGFsT3BodGhhbG1pY0F4aWFsTGVuZ3RoU2VxdWVuY2VcIn0sXG4gICAgXCIwMDIyMTI2MFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNlbGVjdGVkVG90YWxPcGh0aGFsbWljQXhpYWxMZW5ndGhTZXF1ZW5jZVwifSxcbiAgICBcIjAwMjIxMjYyXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiT3BodGhhbG1pY0F4aWFsTGVuZ3RoUXVhbGl0eU1ldHJpY1NlcXVlbmNlXCJ9LFxuICAgIFwiMDAyMjEyNzNcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJPcGh0aGFsbWljQXhpYWxMZW5ndGhRdWFsaXR5TWV0cmljVHlwZURlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMDAyMjEzMDBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbnRyYW9jdWxhckxlbnNDYWxjdWxhdGlvbnNSaWdodEV5ZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDAyMjEzMTBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbnRyYW9jdWxhckxlbnNDYWxjdWxhdGlvbnNMZWZ0RXllU2VxdWVuY2VcIn0sXG4gICAgXCIwMDIyMTMzMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZmVyZW5jZWRPcGh0aGFsbWljQXhpYWxMZW5ndGhNZWFzdXJlbWVudFFDSW1hZ2VTZXF1ZW5jZVwifSxcbiAgICBcIjAwMjQwMDEwXCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVmlzdWFsRmllbGRIb3Jpem9udGFsRXh0ZW50XCJ9LFxuICAgIFwiMDAyNDAwMTFcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJWaXN1YWxGaWVsZFZlcnRpY2FsRXh0ZW50XCJ9LFxuICAgIFwiMDAyNDAwMTJcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJWaXN1YWxGaWVsZFNoYXBlXCJ9LFxuICAgIFwiMDAyNDAwMTZcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTY3JlZW5pbmdUZXN0TW9kZUNvZGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwMjQwMDE4XCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTWF4aW11bVN0aW11bHVzTHVtaW5hbmNlXCJ9LFxuICAgIFwiMDAyNDAwMjBcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJCYWNrZ3JvdW5kTHVtaW5hbmNlXCJ9LFxuICAgIFwiMDAyNDAwMjFcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTdGltdWx1c0NvbG9yQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDAyNDAwMjRcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJCYWNrZ3JvdW5kSWxsdW1pbmF0aW9uQ29sb3JDb2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDI0MDAyNVwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlN0aW11bHVzQXJlYVwifSxcbiAgICBcIjAwMjQwMDI4XCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3RpbXVsdXNQcmVzZW50YXRpb25UaW1lXCJ9LFxuICAgIFwiMDAyNDAwMzJcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJGaXhhdGlvblNlcXVlbmNlXCJ9LFxuICAgIFwiMDAyNDAwMzNcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJGaXhhdGlvbk1vbml0b3JpbmdDb2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDI0MDAzNFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlZpc3VhbEZpZWxkQ2F0Y2hUcmlhbFNlcXVlbmNlXCJ9LFxuICAgIFwiMDAyNDAwMzVcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJGaXhhdGlvbkNoZWNrZWRRdWFudGl0eVwifSxcbiAgICBcIjAwMjQwMDM2XCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGF0aWVudE5vdFByb3Blcmx5Rml4YXRlZFF1YW50aXR5XCJ9LFxuICAgIFwiMDAyNDAwMzdcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQcmVzZW50ZWRWaXN1YWxTdGltdWxpRGF0YUZsYWdcIn0sXG4gICAgXCIwMDI0MDAzOFwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk51bWJlck9mVmlzdWFsU3RpbXVsaVwifSxcbiAgICBcIjAwMjQwMDM5XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRXhjZXNzaXZlRml4YXRpb25Mb3NzZXNEYXRhRmxhZ1wifSxcbiAgICBcIjAwMjQwMDQwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRXhjZXNzaXZlRml4YXRpb25Mb3NzZXNcIn0sXG4gICAgXCIwMDI0MDA0MlwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlN0aW11bGlSZXRlc3RpbmdRdWFudGl0eVwifSxcbiAgICBcIjAwMjQwMDQ0XCI6IHt2cjogXCJMVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29tbWVudHNPblBhdGllbnRQZXJmb3JtYW5jZU9mVmlzdWFsRmllbGRcIn0sXG4gICAgXCIwMDI0MDA0NVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkZhbHNlTmVnYXRpdmVzRXN0aW1hdGVGbGFnXCJ9LFxuICAgIFwiMDAyNDAwNDZcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJGYWxzZU5lZ2F0aXZlc0VzdGltYXRlXCJ9LFxuICAgIFwiMDAyNDAwNDhcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJOZWdhdGl2ZUNhdGNoVHJpYWxzUXVhbnRpdHlcIn0sXG4gICAgXCIwMDI0MDA1MFwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkZhbHNlTmVnYXRpdmVzUXVhbnRpdHlcIn0sXG4gICAgXCIwMDI0MDA1MVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkV4Y2Vzc2l2ZUZhbHNlTmVnYXRpdmVzRGF0YUZsYWdcIn0sXG4gICAgXCIwMDI0MDA1MlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkV4Y2Vzc2l2ZUZhbHNlTmVnYXRpdmVzXCJ9LFxuICAgIFwiMDAyNDAwNTNcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJGYWxzZVBvc2l0aXZlc0VzdGltYXRlRmxhZ1wifSxcbiAgICBcIjAwMjQwMDU0XCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRmFsc2VQb3NpdGl2ZXNFc3RpbWF0ZVwifSxcbiAgICBcIjAwMjQwMDU1XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ2F0Y2hUcmlhbHNEYXRhRmxhZ1wifSxcbiAgICBcIjAwMjQwMDU2XCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUG9zaXRpdmVDYXRjaFRyaWFsc1F1YW50aXR5XCJ9LFxuICAgIFwiMDAyNDAwNTdcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUZXN0UG9pbnROb3JtYWxzRGF0YUZsYWdcIn0sXG4gICAgXCIwMDI0MDA1OFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRlc3RQb2ludE5vcm1hbHNTZXF1ZW5jZVwifSxcbiAgICBcIjAwMjQwMDU5XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiR2xvYmFsRGV2aWF0aW9uUHJvYmFiaWxpdHlOb3JtYWxzRmxhZ1wifSxcbiAgICBcIjAwMjQwMDYwXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRmFsc2VQb3NpdGl2ZXNRdWFudGl0eVwifSxcbiAgICBcIjAwMjQwMDYxXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRXhjZXNzaXZlRmFsc2VQb3NpdGl2ZXNEYXRhRmxhZ1wifSxcbiAgICBcIjAwMjQwMDYyXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRXhjZXNzaXZlRmFsc2VQb3NpdGl2ZXNcIn0sXG4gICAgXCIwMDI0MDA2M1wiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlZpc3VhbEZpZWxkVGVzdE5vcm1hbHNGbGFnXCJ9LFxuICAgIFwiMDAyNDAwNjRcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZXN1bHRzTm9ybWFsc1NlcXVlbmNlXCJ9LFxuICAgIFwiMDAyNDAwNjVcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBZ2VDb3JyZWN0ZWRTZW5zaXRpdml0eURldmlhdGlvbkFsZ29yaXRobVNlcXVlbmNlXCJ9LFxuICAgIFwiMDAyNDAwNjZcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJHbG9iYWxEZXZpYXRpb25Gcm9tTm9ybWFsXCJ9LFxuICAgIFwiMDAyNDAwNjdcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJHZW5lcmFsaXplZERlZmVjdFNlbnNpdGl2aXR5RGV2aWF0aW9uQWxnb3JpdGhtU2VxdWVuY2VcIn0sXG4gICAgXCIwMDI0MDA2OFwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkxvY2FsaXplZERldmlhdGlvbmZyb21Ob3JtYWxcIn0sXG4gICAgXCIwMDI0MDA2OVwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBhdGllbnRSZWxpYWJpbGl0eUluZGljYXRvclwifSxcbiAgICBcIjAwMjQwMDcwXCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVmlzdWFsRmllbGRNZWFuU2Vuc2l0aXZpdHlcIn0sXG4gICAgXCIwMDI0MDA3MVwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkdsb2JhbERldmlhdGlvblByb2JhYmlsaXR5XCJ9LFxuICAgIFwiMDAyNDAwNzJcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJMb2NhbERldmlhdGlvblByb2JhYmlsaXR5Tm9ybWFsc0ZsYWdcIn0sXG4gICAgXCIwMDI0MDA3M1wiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkxvY2FsaXplZERldmlhdGlvblByb2JhYmlsaXR5XCJ9LFxuICAgIFwiMDAyNDAwNzRcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTaG9ydFRlcm1GbHVjdHVhdGlvbkNhbGN1bGF0ZWRcIn0sXG4gICAgXCIwMDI0MDA3NVwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNob3J0VGVybUZsdWN0dWF0aW9uXCJ9LFxuICAgIFwiMDAyNDAwNzZcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTaG9ydFRlcm1GbHVjdHVhdGlvblByb2JhYmlsaXR5Q2FsY3VsYXRlZFwifSxcbiAgICBcIjAwMjQwMDc3XCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2hvcnRUZXJtRmx1Y3R1YXRpb25Qcm9iYWJpbGl0eVwifSxcbiAgICBcIjAwMjQwMDc4XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29ycmVjdGVkTG9jYWxpemVkRGV2aWF0aW9uRnJvbU5vcm1hbENhbGN1bGF0ZWRcIn0sXG4gICAgXCIwMDI0MDA3OVwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvcnJlY3RlZExvY2FsaXplZERldmlhdGlvbkZyb21Ob3JtYWxcIn0sXG4gICAgXCIwMDI0MDA4MFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvcnJlY3RlZExvY2FsaXplZERldmlhdGlvbkZyb21Ob3JtYWxQcm9iYWJpbGl0eUNhbGN1bGF0ZWRcIn0sXG4gICAgXCIwMDI0MDA4MVwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvcnJlY3RlZExvY2FsaXplZERldmlhdGlvbkZyb21Ob3JtYWxQcm9iYWJpbGl0eVwifSxcbiAgICBcIjAwMjQwMDgzXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiR2xvYmFsRGV2aWF0aW9uUHJvYmFiaWxpdHlTZXF1ZW5jZVwifSxcbiAgICBcIjAwMjQwMDg1XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTG9jYWxpemVkRGV2aWF0aW9uUHJvYmFiaWxpdHlTZXF1ZW5jZVwifSxcbiAgICBcIjAwMjQwMDg2XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRm92ZWFsU2Vuc2l0aXZpdHlNZWFzdXJlZFwifSxcbiAgICBcIjAwMjQwMDg3XCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRm92ZWFsU2Vuc2l0aXZpdHlcIn0sXG4gICAgXCIwMDI0MDA4OFwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlZpc3VhbEZpZWxkVGVzdER1cmF0aW9uXCJ9LFxuICAgIFwiMDAyNDAwODlcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJWaXN1YWxGaWVsZFRlc3RQb2ludFNlcXVlbmNlXCJ9LFxuICAgIFwiMDAyNDAwOTBcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJWaXN1YWxGaWVsZFRlc3RQb2ludFhDb29yZGluYXRlXCJ9LFxuICAgIFwiMDAyNDAwOTFcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJWaXN1YWxGaWVsZFRlc3RQb2ludFlDb29yZGluYXRlXCJ9LFxuICAgIFwiMDAyNDAwOTJcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBZ2VDb3JyZWN0ZWRTZW5zaXRpdml0eURldmlhdGlvblZhbHVlXCJ9LFxuICAgIFwiMDAyNDAwOTNcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTdGltdWx1c1Jlc3VsdHNcIn0sXG4gICAgXCIwMDI0MDA5NFwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNlbnNpdGl2aXR5VmFsdWVcIn0sXG4gICAgXCIwMDI0MDA5NVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJldGVzdFN0aW11bHVzU2VlblwifSxcbiAgICBcIjAwMjQwMDk2XCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmV0ZXN0U2Vuc2l0aXZpdHlWYWx1ZVwifSxcbiAgICBcIjAwMjQwMDk3XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVmlzdWFsRmllbGRUZXN0UG9pbnROb3JtYWxzU2VxdWVuY2VcIn0sXG4gICAgXCIwMDI0MDA5OFwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlF1YW50aWZpZWREZWZlY3RcIn0sXG4gICAgXCIwMDI0MDEwMFwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFnZUNvcnJlY3RlZFNlbnNpdGl2aXR5RGV2aWF0aW9uUHJvYmFiaWxpdHlWYWx1ZVwifSxcbiAgICBcIjAwMjQwMTAyXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiR2VuZXJhbGl6ZWREZWZlY3RDb3JyZWN0ZWRTZW5zaXRpdml0eURldmlhdGlvbkZsYWcgXCJ9LFxuICAgIFwiMDAyNDAxMDNcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJHZW5lcmFsaXplZERlZmVjdENvcnJlY3RlZFNlbnNpdGl2aXR5RGV2aWF0aW9uVmFsdWUgXCJ9LFxuICAgIFwiMDAyNDAxMDRcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJHZW5lcmFsaXplZERlZmVjdENvcnJlY3RlZFNlbnNpdGl2aXR5RGV2aWF0aW9uUHJvYmFiaWxpdHlWYWx1ZVwifSxcbiAgICBcIjAwMjQwMTA1XCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTWluaW11bVNlbnNpdGl2aXR5VmFsdWVcIn0sXG4gICAgXCIwMDI0MDEwNlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkJsaW5kU3BvdExvY2FsaXplZFwifSxcbiAgICBcIjAwMjQwMTA3XCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQmxpbmRTcG90WENvb3JkaW5hdGVcIn0sXG4gICAgXCIwMDI0MDEwOFwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkJsaW5kU3BvdFlDb29yZGluYXRlIFwifSxcbiAgICBcIjAwMjQwMTEwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVmlzdWFsQWN1aXR5TWVhc3VyZW1lbnRTZXF1ZW5jZVwifSxcbiAgICBcIjAwMjQwMTEyXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmcmFjdGl2ZVBhcmFtZXRlcnNVc2VkT25QYXRpZW50U2VxdWVuY2VcIn0sXG4gICAgXCIwMDI0MDExM1wiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk1lYXN1cmVtZW50TGF0ZXJhbGl0eVwifSxcbiAgICBcIjAwMjQwMTE0XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiT3BodGhhbG1pY1BhdGllbnRDbGluaWNhbEluZm9ybWF0aW9uTGVmdEV5ZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDAyNDAxMTVcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJPcGh0aGFsbWljUGF0aWVudENsaW5pY2FsSW5mb3JtYXRpb25SaWdodEV5ZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDAyNDAxMTdcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJGb3ZlYWxQb2ludE5vcm1hdGl2ZURhdGFGbGFnXCJ9LFxuICAgIFwiMDAyNDAxMThcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJGb3ZlYWxQb2ludFByb2JhYmlsaXR5VmFsdWVcIn0sXG4gICAgXCIwMDI0MDEyMFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNjcmVlbmluZ0Jhc2VsaW5lTWVhc3VyZWRcIn0sXG4gICAgXCIwMDI0MDEyMlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNjcmVlbmluZ0Jhc2VsaW5lTWVhc3VyZWRTZXF1ZW5jZVwifSxcbiAgICBcIjAwMjQwMTI0XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2NyZWVuaW5nQmFzZWxpbmVUeXBlXCJ9LFxuICAgIFwiMDAyNDAxMjZcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTY3JlZW5pbmdCYXNlbGluZVZhbHVlXCJ9LFxuICAgIFwiMDAyNDAyMDJcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBbGdvcml0aG1Tb3VyY2VcIn0sXG4gICAgXCIwMDI0MDMwNlwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRhdGFTZXROYW1lXCJ9LFxuICAgIFwiMDAyNDAzMDdcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEYXRhU2V0VmVyc2lvblwifSxcbiAgICBcIjAwMjQwMzA4XCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGF0YVNldFNvdXJjZVwifSxcbiAgICBcIjAwMjQwMzA5XCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGF0YVNldERlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMDAyNDAzMTdcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJWaXN1YWxGaWVsZFRlc3RSZWxpYWJpbGl0eUdsb2JhbEluZGV4U2VxdWVuY2VcIn0sXG4gICAgXCIwMDI0MDMyMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlZpc3VhbEZpZWxkR2xvYmFsUmVzdWx0c0luZGV4U2VxdWVuY2VcIn0sXG4gICAgXCIwMDI0MDMyNVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRhdGFPYnNlcnZhdGlvblNlcXVlbmNlXCJ9LFxuICAgIFwiMDAyNDAzMzhcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbmRleE5vcm1hbHNGbGFnXCJ9LFxuICAgIFwiMDAyNDAzNDFcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbmRleFByb2JhYmlsaXR5XCJ9LFxuICAgIFwiMDAyNDAzNDRcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbmRleFByb2JhYmlsaXR5U2VxdWVuY2VcIn0sXG4gICAgXCIwMDI4MDAwMlwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNhbXBsZXNQZXJQaXhlbFwifSxcbiAgICBcIjAwMjgwMDAzXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2FtcGxlc1BlclBpeGVsVXNlZFwifSxcbiAgICBcIjAwMjgwMDA0XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGhvdG9tZXRyaWNJbnRlcnByZXRhdGlvblwifSxcbiAgICBcIjAwMjgwMDA1XCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW1hZ2VEaW1lbnNpb25zXCJ9LFxuICAgIFwiMDAyODAwMDZcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQbGFuYXJDb25maWd1cmF0aW9uXCJ9LFxuICAgIFwiMDAyODAwMDhcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJOdW1iZXJPZkZyYW1lc1wifSxcbiAgICBcIjAwMjgwMDA5XCI6IHt2cjogXCJBVFwiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJGcmFtZUluY3JlbWVudFBvaW50ZXJcIn0sXG4gICAgXCIwMDI4MDAwQVwiOiB7dnI6IFwiQVRcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiRnJhbWVEaW1lbnNpb25Qb2ludGVyXCJ9LFxuICAgIFwiMDAyODAwMTBcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSb3dzXCJ9LFxuICAgIFwiMDAyODAwMTFcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb2x1bW5zXCJ9LFxuICAgIFwiMDAyODAwMTJcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQbGFuZXNcIn0sXG4gICAgXCIwMDI4MDAxNFwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlVsdHJhc291bmRDb2xvckRhdGFQcmVzZW50XCJ9LFxuICAgIFwiMDAyODAwMzBcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjJcIiwgbmFtZTogXCJQaXhlbFNwYWNpbmdcIn0sXG4gICAgXCIwMDI4MDAzMVwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMlwiLCBuYW1lOiBcIlpvb21GYWN0b3JcIn0sXG4gICAgXCIwMDI4MDAzMlwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMlwiLCBuYW1lOiBcIlpvb21DZW50ZXJcIn0sXG4gICAgXCIwMDI4MDAzNFwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMlwiLCBuYW1lOiBcIlBpeGVsQXNwZWN0UmF0aW9cIn0sXG4gICAgXCIwMDI4MDA0MFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkltYWdlRm9ybWF0XCJ9LFxuICAgIFwiMDAyODAwNTBcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIk1hbmlwdWxhdGVkSW1hZ2VcIn0sXG4gICAgXCIwMDI4MDA1MVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiQ29ycmVjdGVkSW1hZ2VcIn0sXG4gICAgXCIwMDI4MDA1RlwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvbXByZXNzaW9uUmVjb2duaXRpb25Db2RlXCJ9LFxuICAgIFwiMDAyODAwNjBcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb21wcmVzc2lvbkNvZGVcIn0sXG4gICAgXCIwMDI4MDA2MVwiOiB7dnI6IFwiU0hcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvbXByZXNzaW9uT3JpZ2luYXRvclwifSxcbiAgICBcIjAwMjgwMDYyXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29tcHJlc3Npb25MYWJlbFwifSxcbiAgICBcIjAwMjgwMDYzXCI6IHt2cjogXCJTSFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29tcHJlc3Npb25EZXNjcmlwdGlvblwifSxcbiAgICBcIjAwMjgwMDY1XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJDb21wcmVzc2lvblNlcXVlbmNlXCJ9LFxuICAgIFwiMDAyODAwNjZcIjoge3ZyOiBcIkFUXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIkNvbXByZXNzaW9uU3RlcFBvaW50ZXJzXCJ9LFxuICAgIFwiMDAyODAwNjhcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZXBlYXRJbnRlcnZhbFwifSxcbiAgICBcIjAwMjgwMDY5XCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQml0c0dyb3VwZWRcIn0sXG4gICAgXCIwMDI4MDA3MFwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiUGVyaW1ldGVyVGFibGVcIn0sXG4gICAgXCIwMDI4MDA3MVwiOiB7dnI6IFwiVVN8U1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBlcmltZXRlclZhbHVlXCJ9LFxuICAgIFwiMDAyODAwODBcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQcmVkaWN0b3JSb3dzXCJ9LFxuICAgIFwiMDAyODAwODFcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQcmVkaWN0b3JDb2x1bW5zXCJ9LFxuICAgIFwiMDAyODAwODJcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIlByZWRpY3RvckNvbnN0YW50c1wifSxcbiAgICBcIjAwMjgwMDkwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQmxvY2tlZFBpeGVsc1wifSxcbiAgICBcIjAwMjgwMDkxXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQmxvY2tSb3dzXCJ9LFxuICAgIFwiMDAyODAwOTJcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJCbG9ja0NvbHVtbnNcIn0sXG4gICAgXCIwMDI4MDA5M1wiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJvd092ZXJsYXBcIn0sXG4gICAgXCIwMDI4MDA5NFwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvbHVtbk92ZXJsYXBcIn0sXG4gICAgXCIwMDI4MDEwMFwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkJpdHNBbGxvY2F0ZWRcIn0sXG4gICAgXCIwMDI4MDEwMVwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkJpdHNTdG9yZWRcIn0sXG4gICAgXCIwMDI4MDEwMlwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkhpZ2hCaXRcIn0sXG4gICAgXCIwMDI4MDEwM1wiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBpeGVsUmVwcmVzZW50YXRpb25cIn0sXG4gICAgXCIwMDI4MDEwNFwiOiB7dnI6IFwiVVN8U1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNtYWxsZXN0VmFsaWRQaXhlbFZhbHVlXCJ9LFxuICAgIFwiMDAyODAxMDVcIjoge3ZyOiBcIlVTfFNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJMYXJnZXN0VmFsaWRQaXhlbFZhbHVlXCJ9LFxuICAgIFwiMDAyODAxMDZcIjoge3ZyOiBcIlVTfFNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTbWFsbGVzdEltYWdlUGl4ZWxWYWx1ZVwifSxcbiAgICBcIjAwMjgwMTA3XCI6IHt2cjogXCJVU3xTU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTGFyZ2VzdEltYWdlUGl4ZWxWYWx1ZVwifSxcbiAgICBcIjAwMjgwMTA4XCI6IHt2cjogXCJVU3xTU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU21hbGxlc3RQaXhlbFZhbHVlSW5TZXJpZXNcIn0sXG4gICAgXCIwMDI4MDEwOVwiOiB7dnI6IFwiVVN8U1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkxhcmdlc3RQaXhlbFZhbHVlSW5TZXJpZXNcIn0sXG4gICAgXCIwMDI4MDExMFwiOiB7dnI6IFwiVVN8U1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNtYWxsZXN0SW1hZ2VQaXhlbFZhbHVlSW5QbGFuZVwifSxcbiAgICBcIjAwMjgwMTExXCI6IHt2cjogXCJVU3xTU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTGFyZ2VzdEltYWdlUGl4ZWxWYWx1ZUluUGxhbmVcIn0sXG4gICAgXCIwMDI4MDEyMFwiOiB7dnI6IFwiVVN8U1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBpeGVsUGFkZGluZ1ZhbHVlXCJ9LFxuICAgIFwiMDAyODAxMjFcIjoge3ZyOiBcIlVTfFNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQaXhlbFBhZGRpbmdSYW5nZUxpbWl0XCJ9LFxuICAgIFwiMDAyODAyMDBcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbWFnZUxvY2F0aW9uXCJ9LFxuICAgIFwiMDAyODAzMDBcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJRdWFsaXR5Q29udHJvbEltYWdlXCJ9LFxuICAgIFwiMDAyODAzMDFcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJCdXJuZWRJbkFubm90YXRpb25cIn0sXG4gICAgXCIwMDI4MDMwMlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlY29nbml6YWJsZVZpc3VhbEZlYXR1cmVzXCJ9LFxuICAgIFwiMDAyODAzMDNcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJMb25naXR1ZGluYWxUZW1wb3JhbEluZm9ybWF0aW9uTW9kaWZpZWRcIn0sXG4gICAgXCIwMDI4MDQwMFwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRyYW5zZm9ybUxhYmVsXCJ9LFxuICAgIFwiMDAyODA0MDFcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUcmFuc2Zvcm1WZXJzaW9uTnVtYmVyXCJ9LFxuICAgIFwiMDAyODA0MDJcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJOdW1iZXJPZlRyYW5zZm9ybVN0ZXBzXCJ9LFxuICAgIFwiMDAyODA0MDNcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIlNlcXVlbmNlT2ZDb21wcmVzc2VkRGF0YVwifSxcbiAgICBcIjAwMjgwNDA0XCI6IHt2cjogXCJBVFwiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJEZXRhaWxzT2ZDb2VmZmljaWVudHNcIn0sXG4gICAgXCIwMDI4MDR4MFwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJvd3NGb3JOdGhPcmRlckNvZWZmaWNpZW50c1wifSxcbiAgICBcIjAwMjgwNHgxXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29sdW1uc0Zvck50aE9yZGVyQ29lZmZpY2llbnRzXCJ9LFxuICAgIFwiMDAyODA0eDJcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIkNvZWZmaWNpZW50Q29kaW5nXCJ9LFxuICAgIFwiMDAyODA0eDNcIjoge3ZyOiBcIkFUXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIkNvZWZmaWNpZW50Q29kaW5nUG9pbnRlcnNcIn0sXG4gICAgXCIwMDI4MDcwMFwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRDVExhYmVsXCJ9LFxuICAgIFwiMDAyODA3MDFcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIkRhdGFCbG9ja0Rlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMDAyODA3MDJcIjoge3ZyOiBcIkFUXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIkRhdGFCbG9ja1wifSxcbiAgICBcIjAwMjgwNzEwXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTm9ybWFsaXphdGlvbkZhY3RvckZvcm1hdFwifSxcbiAgICBcIjAwMjgwNzIwXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiWm9uYWxNYXBOdW1iZXJGb3JtYXRcIn0sXG4gICAgXCIwMDI4MDcyMVwiOiB7dnI6IFwiQVRcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiWm9uYWxNYXBMb2NhdGlvblwifSxcbiAgICBcIjAwMjgwNzIyXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiWm9uYWxNYXBGb3JtYXRcIn0sXG4gICAgXCIwMDI4MDczMFwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFkYXB0aXZlTWFwRm9ybWF0XCJ9LFxuICAgIFwiMDAyODA3NDBcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb2RlTnVtYmVyRm9ybWF0XCJ9LFxuICAgIFwiMDAyODA4eDBcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIkNvZGVMYWJlbFwifSxcbiAgICBcIjAwMjgwOHgyXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTnVtYmVyT2ZUYWJsZXNcIn0sXG4gICAgXCIwMDI4MDh4M1wiOiB7dnI6IFwiQVRcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiQ29kZVRhYmxlTG9jYXRpb25cIn0sXG4gICAgXCIwMDI4MDh4NFwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkJpdHNGb3JDb2RlV29yZFwifSxcbiAgICBcIjAwMjgwOHg4XCI6IHt2cjogXCJBVFwiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJJbWFnZURhdGFMb2NhdGlvblwifSxcbiAgICBcIjAwMjgwQTAyXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGl4ZWxTcGFjaW5nQ2FsaWJyYXRpb25UeXBlXCJ9LFxuICAgIFwiMDAyODBBMDRcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQaXhlbFNwYWNpbmdDYWxpYnJhdGlvbkRlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMDAyODEwNDBcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQaXhlbEludGVuc2l0eVJlbGF0aW9uc2hpcFwifSxcbiAgICBcIjAwMjgxMDQxXCI6IHt2cjogXCJTU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGl4ZWxJbnRlbnNpdHlSZWxhdGlvbnNoaXBTaWduXCJ9LFxuICAgIFwiMDAyODEwNTBcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIldpbmRvd0NlbnRlclwifSxcbiAgICBcIjAwMjgxMDUxXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJXaW5kb3dXaWR0aFwifSxcbiAgICBcIjAwMjgxMDUyXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVzY2FsZUludGVyY2VwdFwifSxcbiAgICBcIjAwMjgxMDUzXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVzY2FsZVNsb3BlXCJ9LFxuICAgIFwiMDAyODEwNTRcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZXNjYWxlVHlwZVwifSxcbiAgICBcIjAwMjgxMDU1XCI6IHt2cjogXCJMT1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJXaW5kb3dDZW50ZXJXaWR0aEV4cGxhbmF0aW9uXCJ9LFxuICAgIFwiMDAyODEwNTZcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJWT0lMVVRGdW5jdGlvblwifSxcbiAgICBcIjAwMjgxMDgwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiR3JheVNjYWxlXCJ9LFxuICAgIFwiMDAyODEwOTBcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWNvbW1lbmRlZFZpZXdpbmdNb2RlXCJ9LFxuICAgIFwiMDAyODExMDBcIjoge3ZyOiBcIlVTfFNTXCIsIHZtOiBcIjNcIiwgbmFtZTogXCJHcmF5TG9va3VwVGFibGVEZXNjcmlwdG9yXCJ9LFxuICAgIFwiMDAyODExMDFcIjoge3ZyOiBcIlVTfFNTXCIsIHZtOiBcIjNcIiwgbmFtZTogXCJSZWRQYWxldHRlQ29sb3JMb29rdXBUYWJsZURlc2NyaXB0b3JcIn0sXG4gICAgXCIwMDI4MTEwMlwiOiB7dnI6IFwiVVN8U1NcIiwgdm06IFwiM1wiLCBuYW1lOiBcIkdyZWVuUGFsZXR0ZUNvbG9yTG9va3VwVGFibGVEZXNjcmlwdG9yXCJ9LFxuICAgIFwiMDAyODExMDNcIjoge3ZyOiBcIlVTfFNTXCIsIHZtOiBcIjNcIiwgbmFtZTogXCJCbHVlUGFsZXR0ZUNvbG9yTG9va3VwVGFibGVEZXNjcmlwdG9yXCJ9LFxuICAgIFwiMDAyODExMDRcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjNcIiwgbmFtZTogXCJBbHBoYVBhbGV0dGVDb2xvckxvb2t1cFRhYmxlRGVzY3JpcHRvclwifSxcbiAgICBcIjAwMjgxMTExXCI6IHt2cjogXCJVU3xTU1wiLCB2bTogXCI0XCIsIG5hbWU6IFwiTGFyZ2VSZWRQYWxldHRlQ29sb3JMb29rdXBUYWJsZURlc2NyaXB0b3JcIn0sXG4gICAgXCIwMDI4MTExMlwiOiB7dnI6IFwiVVN8U1NcIiwgdm06IFwiNFwiLCBuYW1lOiBcIkxhcmdlR3JlZW5QYWxldHRlQ29sb3JMb29rdXBUYWJsZURlc2NyaXB0b3JcIn0sXG4gICAgXCIwMDI4MTExM1wiOiB7dnI6IFwiVVN8U1NcIiwgdm06IFwiNFwiLCBuYW1lOiBcIkxhcmdlQmx1ZVBhbGV0dGVDb2xvckxvb2t1cFRhYmxlRGVzY3JpcHRvclwifSxcbiAgICBcIjAwMjgxMTk5XCI6IHt2cjogXCJVSVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGFsZXR0ZUNvbG9yTG9va3VwVGFibGVVSURcIn0sXG4gICAgXCIwMDI4MTIwMFwiOiB7dnI6IFwiVVN8U1N8T1dcIiwgdm06IFwiMS1uMVwiLCBuYW1lOiBcIkdyYXlMb29rdXBUYWJsZURhdGFcIn0sXG4gICAgXCIwMDI4MTIwMVwiOiB7dnI6IFwiT1dcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZFBhbGV0dGVDb2xvckxvb2t1cFRhYmxlRGF0YVwifSxcbiAgICBcIjAwMjgxMjAyXCI6IHt2cjogXCJPV1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiR3JlZW5QYWxldHRlQ29sb3JMb29rdXBUYWJsZURhdGFcIn0sXG4gICAgXCIwMDI4MTIwM1wiOiB7dnI6IFwiT1dcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkJsdWVQYWxldHRlQ29sb3JMb29rdXBUYWJsZURhdGFcIn0sXG4gICAgXCIwMDI4MTIwNFwiOiB7dnI6IFwiT1dcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFscGhhUGFsZXR0ZUNvbG9yTG9va3VwVGFibGVEYXRhXCJ9LFxuICAgIFwiMDAyODEyMTFcIjoge3ZyOiBcIk9XXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJMYXJnZVJlZFBhbGV0dGVDb2xvckxvb2t1cFRhYmxlRGF0YVwifSxcbiAgICBcIjAwMjgxMjEyXCI6IHt2cjogXCJPV1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTGFyZ2VHcmVlblBhbGV0dGVDb2xvckxvb2t1cFRhYmxlRGF0YVwifSxcbiAgICBcIjAwMjgxMjEzXCI6IHt2cjogXCJPV1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTGFyZ2VCbHVlUGFsZXR0ZUNvbG9yTG9va3VwVGFibGVEYXRhXCJ9LFxuICAgIFwiMDAyODEyMTRcIjoge3ZyOiBcIlVJXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJMYXJnZVBhbGV0dGVDb2xvckxvb2t1cFRhYmxlVUlEXCJ9LFxuICAgIFwiMDAyODEyMjFcIjoge3ZyOiBcIk9XXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTZWdtZW50ZWRSZWRQYWxldHRlQ29sb3JMb29rdXBUYWJsZURhdGFcIn0sXG4gICAgXCIwMDI4MTIyMlwiOiB7dnI6IFwiT1dcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNlZ21lbnRlZEdyZWVuUGFsZXR0ZUNvbG9yTG9va3VwVGFibGVEYXRhXCJ9LFxuICAgIFwiMDAyODEyMjNcIjoge3ZyOiBcIk9XXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTZWdtZW50ZWRCbHVlUGFsZXR0ZUNvbG9yTG9va3VwVGFibGVEYXRhXCJ9LFxuICAgIFwiMDAyODEzMDBcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJCcmVhc3RJbXBsYW50UHJlc2VudFwifSxcbiAgICBcIjAwMjgxMzUwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGFydGlhbFZpZXdcIn0sXG4gICAgXCIwMDI4MTM1MVwiOiB7dnI6IFwiU1RcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBhcnRpYWxWaWV3RGVzY3JpcHRpb25cIn0sXG4gICAgXCIwMDI4MTM1MlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBhcnRpYWxWaWV3Q29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDAyODEzNUFcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTcGF0aWFsTG9jYXRpb25zUHJlc2VydmVkXCJ9LFxuICAgIFwiMDAyODE0MDFcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEYXRhRnJhbWVBc3NpZ25tZW50U2VxdWVuY2VcIn0sXG4gICAgXCIwMDI4MTQwMlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRhdGFQYXRoQXNzaWdubWVudFwifSxcbiAgICBcIjAwMjgxNDAzXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQml0c01hcHBlZFRvQ29sb3JMb29rdXBUYWJsZVwifSxcbiAgICBcIjAwMjgxNDA0XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQmxlbmRpbmdMVVQxU2VxdWVuY2VcIn0sXG4gICAgXCIwMDI4MTQwNVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkJsZW5kaW5nTFVUMVRyYW5zZmVyRnVuY3Rpb25cIn0sXG4gICAgXCIwMDI4MTQwNlwiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkJsZW5kaW5nV2VpZ2h0Q29uc3RhbnRcIn0sXG4gICAgXCIwMDI4MTQwN1wiOiB7dnI6IFwiVVNcIiwgdm06IFwiM1wiLCBuYW1lOiBcIkJsZW5kaW5nTG9va3VwVGFibGVEZXNjcmlwdG9yXCJ9LFxuICAgIFwiMDAyODE0MDhcIjoge3ZyOiBcIk9XXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJCbGVuZGluZ0xvb2t1cFRhYmxlRGF0YVwifSxcbiAgICBcIjAwMjgxNDBCXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRW5oYW5jZWRQYWxldHRlQ29sb3JMb29rdXBUYWJsZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDAyODE0MENcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJCbGVuZGluZ0xVVDJTZXF1ZW5jZVwifSxcbiAgICBcIjAwMjgxNDBEXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQmxlbmRpbmdMVVQyVHJhbnNmZXJGdW5jdGlvblwifSxcbiAgICBcIjAwMjgxNDBFXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGF0YVBhdGhJRFwifSxcbiAgICBcIjAwMjgxNDBGXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUkdCTFVUVHJhbnNmZXJGdW5jdGlvblwifSxcbiAgICBcIjAwMjgxNDEwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQWxwaGFMVVRUcmFuc2ZlckZ1bmN0aW9uXCJ9LFxuICAgIFwiMDAyODIwMDBcIjoge3ZyOiBcIk9CXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJQ0NQcm9maWxlXCJ9LFxuICAgIFwiMDAyODIxMTBcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJMb3NzeUltYWdlQ29tcHJlc3Npb25cIn0sXG4gICAgXCIwMDI4MjExMlwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiTG9zc3lJbWFnZUNvbXByZXNzaW9uUmF0aW9cIn0sXG4gICAgXCIwMDI4MjExNFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiTG9zc3lJbWFnZUNvbXByZXNzaW9uTWV0aG9kXCJ9LFxuICAgIFwiMDAyODMwMDBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNb2RhbGl0eUxVVFNlcXVlbmNlXCJ9LFxuICAgIFwiMDAyODMwMDJcIjoge3ZyOiBcIlVTfFNTXCIsIHZtOiBcIjNcIiwgbmFtZTogXCJMVVREZXNjcmlwdG9yXCJ9LFxuICAgIFwiMDAyODMwMDNcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJMVVRFeHBsYW5hdGlvblwifSxcbiAgICBcIjAwMjgzMDA0XCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTW9kYWxpdHlMVVRUeXBlXCJ9LFxuICAgIFwiMDAyODMwMDZcIjoge3ZyOiBcIlVTfE9XXCIsIHZtOiBcIjEtbjFcIiwgbmFtZTogXCJMVVREYXRhXCJ9LFxuICAgIFwiMDAyODMwMTBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJWT0lMVVRTZXF1ZW5jZVwifSxcbiAgICBcIjAwMjgzMTEwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU29mdGNvcHlWT0lMVVRTZXF1ZW5jZVwifSxcbiAgICBcIjAwMjg0MDAwXCI6IHt2cjogXCJMVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW1hZ2VQcmVzZW50YXRpb25Db21tZW50c1wifSxcbiAgICBcIjAwMjg1MDAwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQmlQbGFuZUFjcXVpc2l0aW9uU2VxdWVuY2VcIn0sXG4gICAgXCIwMDI4NjAxMFwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlcHJlc2VudGF0aXZlRnJhbWVOdW1iZXJcIn0sXG4gICAgXCIwMDI4NjAyMFwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiRnJhbWVOdW1iZXJzT2ZJbnRlcmVzdFwifSxcbiAgICBcIjAwMjg2MDIyXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJGcmFtZU9mSW50ZXJlc3REZXNjcmlwdGlvblwifSxcbiAgICBcIjAwMjg2MDIzXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJGcmFtZU9mSW50ZXJlc3RUeXBlXCJ9LFxuICAgIFwiMDAyODYwMzBcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIk1hc2tQb2ludGVyc1wifSxcbiAgICBcIjAwMjg2MDQwXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJSV2F2ZVBvaW50ZXJcIn0sXG4gICAgXCIwMDI4NjEwMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk1hc2tTdWJ0cmFjdGlvblNlcXVlbmNlXCJ9LFxuICAgIFwiMDAyODYxMDFcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNYXNrT3BlcmF0aW9uXCJ9LFxuICAgIFwiMDAyODYxMDJcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjItMm5cIiwgbmFtZTogXCJBcHBsaWNhYmxlRnJhbWVSYW5nZVwifSxcbiAgICBcIjAwMjg2MTEwXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJNYXNrRnJhbWVOdW1iZXJzXCJ9LFxuICAgIFwiMDAyODYxMTJcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb250cmFzdEZyYW1lQXZlcmFnaW5nXCJ9LFxuICAgIFwiMDAyODYxMTRcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjJcIiwgbmFtZTogXCJNYXNrU3ViUGl4ZWxTaGlmdFwifSxcbiAgICBcIjAwMjg2MTIwXCI6IHt2cjogXCJTU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiVElET2Zmc2V0XCJ9LFxuICAgIFwiMDAyODYxOTBcIjoge3ZyOiBcIlNUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNYXNrT3BlcmF0aW9uRXhwbGFuYXRpb25cIn0sXG4gICAgXCIwMDI4N0ZFMFwiOiB7dnI6IFwiVVRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBpeGVsRGF0YVByb3ZpZGVyVVJMXCJ9LFxuICAgIFwiMDAyODkwMDFcIjoge3ZyOiBcIlVMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEYXRhUG9pbnRSb3dzXCJ9LFxuICAgIFwiMDAyODkwMDJcIjoge3ZyOiBcIlVMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEYXRhUG9pbnRDb2x1bW5zXCJ9LFxuICAgIFwiMDAyODkwMDNcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTaWduYWxEb21haW5Db2x1bW5zXCJ9LFxuICAgIFwiMDAyODkwOTlcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJMYXJnZXN0TW9ub2Nocm9tZVBpeGVsVmFsdWVcIn0sXG4gICAgXCIwMDI4OTEwOFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRhdGFSZXByZXNlbnRhdGlvblwifSxcbiAgICBcIjAwMjg5MTEwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGl4ZWxNZWFzdXJlc1NlcXVlbmNlXCJ9LFxuICAgIFwiMDAyODkxMzJcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJGcmFtZVZPSUxVVFNlcXVlbmNlXCJ9LFxuICAgIFwiMDAyODkxNDVcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQaXhlbFZhbHVlVHJhbnNmb3JtYXRpb25TZXF1ZW5jZVwifSxcbiAgICBcIjAwMjg5MjM1XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2lnbmFsRG9tYWluUm93c1wifSxcbiAgICBcIjAwMjg5NDExXCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGlzcGxheUZpbHRlclBlcmNlbnRhZ2VcIn0sXG4gICAgXCIwMDI4OTQxNVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkZyYW1lUGl4ZWxTaGlmdFNlcXVlbmNlXCJ9LFxuICAgIFwiMDAyODk0MTZcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTdWJ0cmFjdGlvbkl0ZW1JRFwifSxcbiAgICBcIjAwMjg5NDIyXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGl4ZWxJbnRlbnNpdHlSZWxhdGlvbnNoaXBMVVRTZXF1ZW5jZVwifSxcbiAgICBcIjAwMjg5NDQzXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRnJhbWVQaXhlbERhdGFQcm9wZXJ0aWVzU2VxdWVuY2VcIn0sXG4gICAgXCIwMDI4OTQ0NFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkdlb21ldHJpY2FsUHJvcGVydGllc1wifSxcbiAgICBcIjAwMjg5NDQ1XCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiR2VvbWV0cmljTWF4aW11bURpc3RvcnRpb25cIn0sXG4gICAgXCIwMDI4OTQ0NlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiSW1hZ2VQcm9jZXNzaW5nQXBwbGllZFwifSxcbiAgICBcIjAwMjg5NDU0XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTWFza1NlbGVjdGlvbk1vZGVcIn0sXG4gICAgXCIwMDI4OTQ3NFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkxVVEZ1bmN0aW9uXCJ9LFxuICAgIFwiMDAyODk0NzhcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNYXNrVmlzaWJpbGl0eVBlcmNlbnRhZ2VcIn0sXG4gICAgXCIwMDI4OTUwMVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBpeGVsU2hpZnRTZXF1ZW5jZVwifSxcbiAgICBcIjAwMjg5NTAyXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVnaW9uUGl4ZWxTaGlmdFNlcXVlbmNlXCJ9LFxuICAgIFwiMDAyODk1MDNcIjoge3ZyOiBcIlNTXCIsIHZtOiBcIjItMm5cIiwgbmFtZTogXCJWZXJ0aWNlc09mVGhlUmVnaW9uXCJ9LFxuICAgIFwiMDAyODk1MDVcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNdWx0aUZyYW1lUHJlc2VudGF0aW9uU2VxdWVuY2VcIn0sXG4gICAgXCIwMDI4OTUwNlwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMi0yblwiLCBuYW1lOiBcIlBpeGVsU2hpZnRGcmFtZVJhbmdlXCJ9LFxuICAgIFwiMDAyODk1MDdcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjItMm5cIiwgbmFtZTogXCJMVVRGcmFtZVJhbmdlXCJ9LFxuICAgIFwiMDAyODk1MjBcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjE2XCIsIG5hbWU6IFwiSW1hZ2VUb0VxdWlwbWVudE1hcHBpbmdNYXRyaXhcIn0sXG4gICAgXCIwMDI4OTUzN1wiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkVxdWlwbWVudENvb3JkaW5hdGVTeXN0ZW1JZGVudGlmaWNhdGlvblwifSxcbiAgICBcIjAwMzIwMDBBXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3R1ZHlTdGF0dXNJRFwifSxcbiAgICBcIjAwMzIwMDBDXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3R1ZHlQcmlvcml0eUlEXCJ9LFxuICAgIFwiMDAzMjAwMTJcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTdHVkeUlESXNzdWVyXCJ9LFxuICAgIFwiMDAzMjAwMzJcIjoge3ZyOiBcIkRBXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTdHVkeVZlcmlmaWVkRGF0ZVwifSxcbiAgICBcIjAwMzIwMDMzXCI6IHt2cjogXCJUTVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3R1ZHlWZXJpZmllZFRpbWVcIn0sXG4gICAgXCIwMDMyMDAzNFwiOiB7dnI6IFwiREFcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlN0dWR5UmVhZERhdGVcIn0sXG4gICAgXCIwMDMyMDAzNVwiOiB7dnI6IFwiVE1cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlN0dWR5UmVhZFRpbWVcIn0sXG4gICAgXCIwMDMyMTAwMFwiOiB7dnI6IFwiREFcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNjaGVkdWxlZFN0dWR5U3RhcnREYXRlXCJ9LFxuICAgIFwiMDAzMjEwMDFcIjoge3ZyOiBcIlRNXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTY2hlZHVsZWRTdHVkeVN0YXJ0VGltZVwifSxcbiAgICBcIjAwMzIxMDEwXCI6IHt2cjogXCJEQVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2NoZWR1bGVkU3R1ZHlTdG9wRGF0ZVwifSxcbiAgICBcIjAwMzIxMDExXCI6IHt2cjogXCJUTVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2NoZWR1bGVkU3R1ZHlTdG9wVGltZVwifSxcbiAgICBcIjAwMzIxMDIwXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2NoZWR1bGVkU3R1ZHlMb2NhdGlvblwifSxcbiAgICBcIjAwMzIxMDIxXCI6IHt2cjogXCJBRVwiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJTY2hlZHVsZWRTdHVkeUxvY2F0aW9uQUVUaXRsZVwifSxcbiAgICBcIjAwMzIxMDMwXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVhc29uRm9yU3R1ZHlcIn0sXG4gICAgXCIwMDMyMTAzMVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlcXVlc3RpbmdQaHlzaWNpYW5JZGVudGlmaWNhdGlvblNlcXVlbmNlXCJ9LFxuICAgIFwiMDAzMjEwMzJcIjoge3ZyOiBcIlBOXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZXF1ZXN0aW5nUGh5c2ljaWFuXCJ9LFxuICAgIFwiMDAzMjEwMzNcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZXF1ZXN0aW5nU2VydmljZVwifSxcbiAgICBcIjAwMzIxMDM0XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVxdWVzdGluZ1NlcnZpY2VDb2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDMyMTA0MFwiOiB7dnI6IFwiREFcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlN0dWR5QXJyaXZhbERhdGVcIn0sXG4gICAgXCIwMDMyMTA0MVwiOiB7dnI6IFwiVE1cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlN0dWR5QXJyaXZhbFRpbWVcIn0sXG4gICAgXCIwMDMyMTA1MFwiOiB7dnI6IFwiREFcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlN0dWR5Q29tcGxldGlvbkRhdGVcIn0sXG4gICAgXCIwMDMyMTA1MVwiOiB7dnI6IFwiVE1cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlN0dWR5Q29tcGxldGlvblRpbWVcIn0sXG4gICAgXCIwMDMyMTA1NVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlN0dWR5Q29tcG9uZW50U3RhdHVzSURcIn0sXG4gICAgXCIwMDMyMTA2MFwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlcXVlc3RlZFByb2NlZHVyZURlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMDAzMjEwNjRcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZXF1ZXN0ZWRQcm9jZWR1cmVDb2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDMyMTA3MFwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlcXVlc3RlZENvbnRyYXN0QWdlbnRcIn0sXG4gICAgXCIwMDMyNDAwMFwiOiB7dnI6IFwiTFRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlN0dWR5Q29tbWVudHNcIn0sXG4gICAgXCIwMDM4MDAwNFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZmVyZW5jZWRQYXRpZW50QWxpYXNTZXF1ZW5jZVwifSxcbiAgICBcIjAwMzgwMDA4XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiVmlzaXRTdGF0dXNJRFwifSxcbiAgICBcIjAwMzgwMDEwXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQWRtaXNzaW9uSURcIn0sXG4gICAgXCIwMDM4MDAxMVwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIklzc3Vlck9mQWRtaXNzaW9uSURcIn0sXG4gICAgXCIwMDM4MDAxNFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIklzc3Vlck9mQWRtaXNzaW9uSURTZXF1ZW5jZVwifSxcbiAgICBcIjAwMzgwMDE2XCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUm91dGVPZkFkbWlzc2lvbnNcIn0sXG4gICAgXCIwMDM4MDAxQVwiOiB7dnI6IFwiREFcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNjaGVkdWxlZEFkbWlzc2lvbkRhdGVcIn0sXG4gICAgXCIwMDM4MDAxQlwiOiB7dnI6IFwiVE1cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNjaGVkdWxlZEFkbWlzc2lvblRpbWVcIn0sXG4gICAgXCIwMDM4MDAxQ1wiOiB7dnI6IFwiREFcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNjaGVkdWxlZERpc2NoYXJnZURhdGVcIn0sXG4gICAgXCIwMDM4MDAxRFwiOiB7dnI6IFwiVE1cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNjaGVkdWxlZERpc2NoYXJnZVRpbWVcIn0sXG4gICAgXCIwMDM4MDAxRVwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNjaGVkdWxlZFBhdGllbnRJbnN0aXR1dGlvblJlc2lkZW5jZVwifSxcbiAgICBcIjAwMzgwMDIwXCI6IHt2cjogXCJEQVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQWRtaXR0aW5nRGF0ZVwifSxcbiAgICBcIjAwMzgwMDIxXCI6IHt2cjogXCJUTVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQWRtaXR0aW5nVGltZVwifSxcbiAgICBcIjAwMzgwMDMwXCI6IHt2cjogXCJEQVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGlzY2hhcmdlRGF0ZVwifSxcbiAgICBcIjAwMzgwMDMyXCI6IHt2cjogXCJUTVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGlzY2hhcmdlVGltZVwifSxcbiAgICBcIjAwMzgwMDQwXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGlzY2hhcmdlRGlhZ25vc2lzRGVzY3JpcHRpb25cIn0sXG4gICAgXCIwMDM4MDA0NFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRpc2NoYXJnZURpYWdub3Npc0NvZGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwMzgwMDUwXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3BlY2lhbE5lZWRzXCJ9LFxuICAgIFwiMDAzODAwNjBcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTZXJ2aWNlRXBpc29kZUlEXCJ9LFxuICAgIFwiMDAzODAwNjFcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJc3N1ZXJPZlNlcnZpY2VFcGlzb2RlSURcIn0sXG4gICAgXCIwMDM4MDA2MlwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNlcnZpY2VFcGlzb2RlRGVzY3JpcHRpb25cIn0sXG4gICAgXCIwMDM4MDA2NFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIklzc3Vlck9mU2VydmljZUVwaXNvZGVJRFNlcXVlbmNlXCJ9LFxuICAgIFwiMDAzODAxMDBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQZXJ0aW5lbnREb2N1bWVudHNTZXF1ZW5jZVwifSxcbiAgICBcIjAwMzgwMzAwXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ3VycmVudFBhdGllbnRMb2NhdGlvblwifSxcbiAgICBcIjAwMzgwNDAwXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGF0aWVudEluc3RpdHV0aW9uUmVzaWRlbmNlXCJ9LFxuICAgIFwiMDAzODA1MDBcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQYXRpZW50U3RhdGVcIn0sXG4gICAgXCIwMDM4MDUwMlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBhdGllbnRDbGluaWNhbFRyaWFsUGFydGljaXBhdGlvblNlcXVlbmNlXCJ9LFxuICAgIFwiMDAzODQwMDBcIjoge3ZyOiBcIkxUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJWaXNpdENvbW1lbnRzXCJ9LFxuICAgIFwiMDAzQTAwMDRcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJXYXZlZm9ybU9yaWdpbmFsaXR5XCJ9LFxuICAgIFwiMDAzQTAwMDVcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJOdW1iZXJPZldhdmVmb3JtQ2hhbm5lbHNcIn0sXG4gICAgXCIwMDNBMDAxMFwiOiB7dnI6IFwiVUxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk51bWJlck9mV2F2ZWZvcm1TYW1wbGVzXCJ9LFxuICAgIFwiMDAzQTAwMUFcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTYW1wbGluZ0ZyZXF1ZW5jeVwifSxcbiAgICBcIjAwM0EwMDIwXCI6IHt2cjogXCJTSFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTXVsdGlwbGV4R3JvdXBMYWJlbFwifSxcbiAgICBcIjAwM0EwMjAwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ2hhbm5lbERlZmluaXRpb25TZXF1ZW5jZVwifSxcbiAgICBcIjAwM0EwMjAyXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiV2F2ZWZvcm1DaGFubmVsTnVtYmVyXCJ9LFxuICAgIFwiMDAzQTAyMDNcIjoge3ZyOiBcIlNIXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDaGFubmVsTGFiZWxcIn0sXG4gICAgXCIwMDNBMDIwNVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiQ2hhbm5lbFN0YXR1c1wifSxcbiAgICBcIjAwM0EwMjA4XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ2hhbm5lbFNvdXJjZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDAzQTAyMDlcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDaGFubmVsU291cmNlTW9kaWZpZXJzU2VxdWVuY2VcIn0sXG4gICAgXCIwMDNBMDIwQVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNvdXJjZVdhdmVmb3JtU2VxdWVuY2VcIn0sXG4gICAgXCIwMDNBMDIwQ1wiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNoYW5uZWxEZXJpdmF0aW9uRGVzY3JpcHRpb25cIn0sXG4gICAgXCIwMDNBMDIxMFwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNoYW5uZWxTZW5zaXRpdml0eVwifSxcbiAgICBcIjAwM0EwMjExXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ2hhbm5lbFNlbnNpdGl2aXR5VW5pdHNTZXF1ZW5jZVwifSxcbiAgICBcIjAwM0EwMjEyXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ2hhbm5lbFNlbnNpdGl2aXR5Q29ycmVjdGlvbkZhY3RvclwifSxcbiAgICBcIjAwM0EwMjEzXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ2hhbm5lbEJhc2VsaW5lXCJ9LFxuICAgIFwiMDAzQTAyMTRcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDaGFubmVsVGltZVNrZXdcIn0sXG4gICAgXCIwMDNBMDIxNVwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNoYW5uZWxTYW1wbGVTa2V3XCJ9LFxuICAgIFwiMDAzQTAyMThcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDaGFubmVsT2Zmc2V0XCJ9LFxuICAgIFwiMDAzQTAyMUFcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJXYXZlZm9ybUJpdHNTdG9yZWRcIn0sXG4gICAgXCIwMDNBMDIyMFwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkZpbHRlckxvd0ZyZXF1ZW5jeVwifSxcbiAgICBcIjAwM0EwMjIxXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRmlsdGVySGlnaEZyZXF1ZW5jeVwifSxcbiAgICBcIjAwM0EwMjIyXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTm90Y2hGaWx0ZXJGcmVxdWVuY3lcIn0sXG4gICAgXCIwMDNBMDIyM1wiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk5vdGNoRmlsdGVyQmFuZHdpZHRoXCJ9LFxuICAgIFwiMDAzQTAyMzBcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJXYXZlZm9ybURhdGFEaXNwbGF5U2NhbGVcIn0sXG4gICAgXCIwMDNBMDIzMVwiOiB7dnI6IFwiVVNcIiwgdm06IFwiM1wiLCBuYW1lOiBcIldhdmVmb3JtRGlzcGxheUJhY2tncm91bmRDSUVMYWJWYWx1ZVwifSxcbiAgICBcIjAwM0EwMjQwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiV2F2ZWZvcm1QcmVzZW50YXRpb25Hcm91cFNlcXVlbmNlXCJ9LFxuICAgIFwiMDAzQTAyNDFcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQcmVzZW50YXRpb25Hcm91cE51bWJlclwifSxcbiAgICBcIjAwM0EwMjQyXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ2hhbm5lbERpc3BsYXlTZXF1ZW5jZVwifSxcbiAgICBcIjAwM0EwMjQ0XCI6IHt2cjogXCJVU1wiLCB2bTogXCIzXCIsIG5hbWU6IFwiQ2hhbm5lbFJlY29tbWVuZGVkRGlzcGxheUNJRUxhYlZhbHVlXCJ9LFxuICAgIFwiMDAzQTAyNDVcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDaGFubmVsUG9zaXRpb25cIn0sXG4gICAgXCIwMDNBMDI0NlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRpc3BsYXlTaGFkaW5nRmxhZ1wifSxcbiAgICBcIjAwM0EwMjQ3XCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRnJhY3Rpb25hbENoYW5uZWxEaXNwbGF5U2NhbGVcIn0sXG4gICAgXCIwMDNBMDI0OFwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFic29sdXRlQ2hhbm5lbERpc3BsYXlTY2FsZVwifSxcbiAgICBcIjAwM0EwMzAwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTXVsdGlwbGV4ZWRBdWRpb0NoYW5uZWxzRGVzY3JpcHRpb25Db2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDNBMDMwMVwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNoYW5uZWxJZGVudGlmaWNhdGlvbkNvZGVcIn0sXG4gICAgXCIwMDNBMDMwMlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNoYW5uZWxNb2RlXCJ9LFxuICAgIFwiMDA0MDAwMDFcIjoge3ZyOiBcIkFFXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIlNjaGVkdWxlZFN0YXRpb25BRVRpdGxlXCJ9LFxuICAgIFwiMDA0MDAwMDJcIjoge3ZyOiBcIkRBXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTY2hlZHVsZWRQcm9jZWR1cmVTdGVwU3RhcnREYXRlXCJ9LFxuICAgIFwiMDA0MDAwMDNcIjoge3ZyOiBcIlRNXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTY2hlZHVsZWRQcm9jZWR1cmVTdGVwU3RhcnRUaW1lXCJ9LFxuICAgIFwiMDA0MDAwMDRcIjoge3ZyOiBcIkRBXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTY2hlZHVsZWRQcm9jZWR1cmVTdGVwRW5kRGF0ZVwifSxcbiAgICBcIjAwNDAwMDA1XCI6IHt2cjogXCJUTVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2NoZWR1bGVkUHJvY2VkdXJlU3RlcEVuZFRpbWVcIn0sXG4gICAgXCIwMDQwMDAwNlwiOiB7dnI6IFwiUE5cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNjaGVkdWxlZFBlcmZvcm1pbmdQaHlzaWNpYW5OYW1lXCJ9LFxuICAgIFwiMDA0MDAwMDdcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTY2hlZHVsZWRQcm9jZWR1cmVTdGVwRGVzY3JpcHRpb25cIn0sXG4gICAgXCIwMDQwMDAwOFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNjaGVkdWxlZFByb3RvY29sQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDA0MDAwMDlcIjoge3ZyOiBcIlNIXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTY2hlZHVsZWRQcm9jZWR1cmVTdGVwSURcIn0sXG4gICAgXCIwMDQwMDAwQVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlN0YWdlQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDA0MDAwMEJcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTY2hlZHVsZWRQZXJmb3JtaW5nUGh5c2ljaWFuSWRlbnRpZmljYXRpb25TZXF1ZW5jZVwifSxcbiAgICBcIjAwNDAwMDEwXCI6IHt2cjogXCJTSFwiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJTY2hlZHVsZWRTdGF0aW9uTmFtZVwifSxcbiAgICBcIjAwNDAwMDExXCI6IHt2cjogXCJTSFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2NoZWR1bGVkUHJvY2VkdXJlU3RlcExvY2F0aW9uXCJ9LFxuICAgIFwiMDA0MDAwMTJcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQcmVNZWRpY2F0aW9uXCJ9LFxuICAgIFwiMDA0MDAwMjBcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTY2hlZHVsZWRQcm9jZWR1cmVTdGVwU3RhdHVzXCJ9LFxuICAgIFwiMDA0MDAwMjZcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJPcmRlclBsYWNlcklkZW50aWZpZXJTZXF1ZW5jZVwifSxcbiAgICBcIjAwNDAwMDI3XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiT3JkZXJGaWxsZXJJZGVudGlmaWVyU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQwMDAzMVwiOiB7dnI6IFwiVVRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkxvY2FsTmFtZXNwYWNlRW50aXR5SURcIn0sXG4gICAgXCIwMDQwMDAzMlwiOiB7dnI6IFwiVVRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlVuaXZlcnNhbEVudGl0eUlEXCJ9LFxuICAgIFwiMDA0MDAwMzNcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJVbml2ZXJzYWxFbnRpdHlJRFR5cGVcIn0sXG4gICAgXCIwMDQwMDAzNVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIklkZW50aWZpZXJUeXBlQ29kZVwifSxcbiAgICBcIjAwNDAwMDM2XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQXNzaWduaW5nRmFjaWxpdHlTZXF1ZW5jZVwifSxcbiAgICBcIjAwNDAwMDM5XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQXNzaWduaW5nSnVyaXNkaWN0aW9uQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDA0MDAwM0FcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBc3NpZ25pbmdBZ2VuY3lPckRlcGFydG1lbnRDb2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQwMDEwMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNjaGVkdWxlZFByb2NlZHVyZVN0ZXBTZXF1ZW5jZVwifSxcbiAgICBcIjAwNDAwMjIwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJlbmNlZE5vbkltYWdlQ29tcG9zaXRlU09QSW5zdGFuY2VTZXF1ZW5jZVwifSxcbiAgICBcIjAwNDAwMjQxXCI6IHt2cjogXCJBRVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGVyZm9ybWVkU3RhdGlvbkFFVGl0bGVcIn0sXG4gICAgXCIwMDQwMDI0MlwiOiB7dnI6IFwiU0hcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBlcmZvcm1lZFN0YXRpb25OYW1lXCJ9LFxuICAgIFwiMDA0MDAyNDNcIjoge3ZyOiBcIlNIXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQZXJmb3JtZWRMb2NhdGlvblwifSxcbiAgICBcIjAwNDAwMjQ0XCI6IHt2cjogXCJEQVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGVyZm9ybWVkUHJvY2VkdXJlU3RlcFN0YXJ0RGF0ZVwifSxcbiAgICBcIjAwNDAwMjQ1XCI6IHt2cjogXCJUTVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGVyZm9ybWVkUHJvY2VkdXJlU3RlcFN0YXJ0VGltZVwifSxcbiAgICBcIjAwNDAwMjUwXCI6IHt2cjogXCJEQVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGVyZm9ybWVkUHJvY2VkdXJlU3RlcEVuZERhdGVcIn0sXG4gICAgXCIwMDQwMDI1MVwiOiB7dnI6IFwiVE1cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBlcmZvcm1lZFByb2NlZHVyZVN0ZXBFbmRUaW1lXCJ9LFxuICAgIFwiMDA0MDAyNTJcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQZXJmb3JtZWRQcm9jZWR1cmVTdGVwU3RhdHVzXCJ9LFxuICAgIFwiMDA0MDAyNTNcIjoge3ZyOiBcIlNIXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQZXJmb3JtZWRQcm9jZWR1cmVTdGVwSURcIn0sXG4gICAgXCIwMDQwMDI1NFwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBlcmZvcm1lZFByb2NlZHVyZVN0ZXBEZXNjcmlwdGlvblwifSxcbiAgICBcIjAwNDAwMjU1XCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGVyZm9ybWVkUHJvY2VkdXJlVHlwZURlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMDA0MDAyNjBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQZXJmb3JtZWRQcm90b2NvbENvZGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwNDAwMjYxXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGVyZm9ybWVkUHJvdG9jb2xUeXBlXCJ9LFxuICAgIFwiMDA0MDAyNzBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTY2hlZHVsZWRTdGVwQXR0cmlidXRlc1NlcXVlbmNlXCJ9LFxuICAgIFwiMDA0MDAyNzVcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZXF1ZXN0QXR0cmlidXRlc1NlcXVlbmNlXCJ9LFxuICAgIFwiMDA0MDAyODBcIjoge3ZyOiBcIlNUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb21tZW50c09uVGhlUGVyZm9ybWVkUHJvY2VkdXJlU3RlcFwifSxcbiAgICBcIjAwNDAwMjgxXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGVyZm9ybWVkUHJvY2VkdXJlU3RlcERpc2NvbnRpbnVhdGlvblJlYXNvbkNvZGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwNDAwMjkzXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUXVhbnRpdHlTZXF1ZW5jZVwifSxcbiAgICBcIjAwNDAwMjk0XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUXVhbnRpdHlcIn0sXG4gICAgXCIwMDQwMDI5NVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk1lYXN1cmluZ1VuaXRzU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQwMDI5NlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkJpbGxpbmdJdGVtU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQwMDMwMFwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRvdGFsVGltZU9mRmx1b3Jvc2NvcHlcIn0sXG4gICAgXCIwMDQwMDMwMVwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRvdGFsTnVtYmVyT2ZFeHBvc3VyZXNcIn0sXG4gICAgXCIwMDQwMDMwMlwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkVudHJhbmNlRG9zZVwifSxcbiAgICBcIjAwNDAwMzAzXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxLTJcIiwgbmFtZTogXCJFeHBvc2VkQXJlYVwifSxcbiAgICBcIjAwNDAwMzA2XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGlzdGFuY2VTb3VyY2VUb0VudHJhbmNlXCJ9LFxuICAgIFwiMDA0MDAzMDdcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEaXN0YW5jZVNvdXJjZVRvU3VwcG9ydFwifSxcbiAgICBcIjAwNDAwMzBFXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRXhwb3N1cmVEb3NlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQwMDMxMFwiOiB7dnI6IFwiU1RcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvbW1lbnRzT25SYWRpYXRpb25Eb3NlXCJ9LFxuICAgIFwiMDA0MDAzMTJcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJYUmF5T3V0cHV0XCJ9LFxuICAgIFwiMDA0MDAzMTRcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJIYWxmVmFsdWVMYXllclwifSxcbiAgICBcIjAwNDAwMzE2XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiT3JnYW5Eb3NlXCJ9LFxuICAgIFwiMDA0MDAzMThcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJPcmdhbkV4cG9zZWRcIn0sXG4gICAgXCIwMDQwMDMyMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkJpbGxpbmdQcm9jZWR1cmVTdGVwU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQwMDMyMVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkZpbG1Db25zdW1wdGlvblNlcXVlbmNlXCJ9LFxuICAgIFwiMDA0MDAzMjRcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJCaWxsaW5nU3VwcGxpZXNBbmREZXZpY2VzU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQwMDMzMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZmVyZW5jZWRQcm9jZWR1cmVTdGVwU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQwMDM0MFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBlcmZvcm1lZFNlcmllc1NlcXVlbmNlXCJ9LFxuICAgIFwiMDA0MDA0MDBcIjoge3ZyOiBcIkxUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb21tZW50c09uVGhlU2NoZWR1bGVkUHJvY2VkdXJlU3RlcFwifSxcbiAgICBcIjAwNDAwNDQwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUHJvdG9jb2xDb250ZXh0U2VxdWVuY2VcIn0sXG4gICAgXCIwMDQwMDQ0MVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvbnRlbnRJdGVtTW9kaWZpZXJTZXF1ZW5jZVwifSxcbiAgICBcIjAwNDAwNTAwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2NoZWR1bGVkU3BlY2ltZW5TZXF1ZW5jZVwifSxcbiAgICBcIjAwNDAwNTBBXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3BlY2ltZW5BY2Nlc3Npb25OdW1iZXJcIn0sXG4gICAgXCIwMDQwMDUxMlwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvbnRhaW5lcklkZW50aWZpZXJcIn0sXG4gICAgXCIwMDQwMDUxM1wiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIklzc3Vlck9mVGhlQ29udGFpbmVySWRlbnRpZmllclNlcXVlbmNlXCJ9LFxuICAgIFwiMDA0MDA1MTVcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBbHRlcm5hdGVDb250YWluZXJJZGVudGlmaWVyU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQwMDUxOFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvbnRhaW5lclR5cGVDb2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQwMDUxQVwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvbnRhaW5lckRlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMDA0MDA1MjBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb250YWluZXJDb21wb25lbnRTZXF1ZW5jZVwifSxcbiAgICBcIjAwNDAwNTUwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3BlY2ltZW5TZXF1ZW5jZVwifSxcbiAgICBcIjAwNDAwNTUxXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3BlY2ltZW5JZGVudGlmaWVyXCJ9LFxuICAgIFwiMDA0MDA1NTJcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTcGVjaW1lbkRlc2NyaXB0aW9uU2VxdWVuY2VUcmlhbFwifSxcbiAgICBcIjAwNDAwNTUzXCI6IHt2cjogXCJTVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3BlY2ltZW5EZXNjcmlwdGlvblRyaWFsXCJ9LFxuICAgIFwiMDA0MDA1NTRcIjoge3ZyOiBcIlVJXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTcGVjaW1lblVJRFwifSxcbiAgICBcIjAwNDAwNTU1XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQWNxdWlzaXRpb25Db250ZXh0U2VxdWVuY2VcIn0sXG4gICAgXCIwMDQwMDU1NlwiOiB7dnI6IFwiU1RcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFjcXVpc2l0aW9uQ29udGV4dERlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMDA0MDA1NjBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTcGVjaW1lbkRlc2NyaXB0aW9uU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQwMDU2MlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIklzc3Vlck9mVGhlU3BlY2ltZW5JZGVudGlmaWVyU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQwMDU5QVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNwZWNpbWVuVHlwZUNvZGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwNDAwNjAwXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3BlY2ltZW5TaG9ydERlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMDA0MDA2MDJcIjoge3ZyOiBcIlVUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTcGVjaW1lbkRldGFpbGVkRGVzY3JpcHRpb25cIn0sXG4gICAgXCIwMDQwMDYxMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNwZWNpbWVuUHJlcGFyYXRpb25TZXF1ZW5jZVwifSxcbiAgICBcIjAwNDAwNjEyXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3BlY2ltZW5QcmVwYXJhdGlvblN0ZXBDb250ZW50SXRlbVNlcXVlbmNlXCJ9LFxuICAgIFwiMDA0MDA2MjBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTcGVjaW1lbkxvY2FsaXphdGlvbkNvbnRlbnRJdGVtU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQwMDZGQVwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNsaWRlSWRlbnRpZmllclwifSxcbiAgICBcIjAwNDAwNzFBXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW1hZ2VDZW50ZXJQb2ludENvb3JkaW5hdGVzU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQwMDcyQVwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlhPZmZzZXRJblNsaWRlQ29vcmRpbmF0ZVN5c3RlbVwifSxcbiAgICBcIjAwNDAwNzNBXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiWU9mZnNldEluU2xpZGVDb29yZGluYXRlU3lzdGVtXCJ9LFxuICAgIFwiMDA0MDA3NEFcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJaT2Zmc2V0SW5TbGlkZUNvb3JkaW5hdGVTeXN0ZW1cIn0sXG4gICAgXCIwMDQwMDhEOFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBpeGVsU3BhY2luZ1NlcXVlbmNlXCJ9LFxuICAgIFwiMDA0MDA4REFcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb29yZGluYXRlU3lzdGVtQXhpc0NvZGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwNDAwOEVBXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTWVhc3VyZW1lbnRVbml0c0NvZGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwNDAwOUY4XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVml0YWxTdGFpbkNvZGVTZXF1ZW5jZVRyaWFsXCJ9LFxuICAgIFwiMDA0MDEwMDFcIjoge3ZyOiBcIlNIXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZXF1ZXN0ZWRQcm9jZWR1cmVJRFwifSxcbiAgICBcIjAwNDAxMDAyXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVhc29uRm9yVGhlUmVxdWVzdGVkUHJvY2VkdXJlXCJ9LFxuICAgIFwiMDA0MDEwMDNcIjoge3ZyOiBcIlNIXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZXF1ZXN0ZWRQcm9jZWR1cmVQcmlvcml0eVwifSxcbiAgICBcIjAwNDAxMDA0XCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGF0aWVudFRyYW5zcG9ydEFycmFuZ2VtZW50c1wifSxcbiAgICBcIjAwNDAxMDA1XCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVxdWVzdGVkUHJvY2VkdXJlTG9jYXRpb25cIn0sXG4gICAgXCIwMDQwMTAwNlwiOiB7dnI6IFwiU0hcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBsYWNlck9yZGVyTnVtYmVyUHJvY2VkdXJlXCJ9LFxuICAgIFwiMDA0MDEwMDdcIjoge3ZyOiBcIlNIXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJGaWxsZXJPcmRlck51bWJlclByb2NlZHVyZVwifSxcbiAgICBcIjAwNDAxMDA4XCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29uZmlkZW50aWFsaXR5Q29kZVwifSxcbiAgICBcIjAwNDAxMDA5XCI6IHt2cjogXCJTSFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVwb3J0aW5nUHJpb3JpdHlcIn0sXG4gICAgXCIwMDQwMTAwQVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlYXNvbkZvclJlcXVlc3RlZFByb2NlZHVyZUNvZGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwNDAxMDEwXCI6IHt2cjogXCJQTlwiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJOYW1lc09mSW50ZW5kZWRSZWNpcGllbnRzT2ZSZXN1bHRzXCJ9LFxuICAgIFwiMDA0MDEwMTFcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbnRlbmRlZFJlY2lwaWVudHNPZlJlc3VsdHNJZGVudGlmaWNhdGlvblNlcXVlbmNlXCJ9LFxuICAgIFwiMDA0MDEwMTJcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWFzb25Gb3JQZXJmb3JtZWRQcm9jZWR1cmVDb2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQwMTA2MFwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlcXVlc3RlZFByb2NlZHVyZURlc2NyaXB0aW9uVHJpYWxcIn0sXG4gICAgXCIwMDQwMTEwMVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBlcnNvbklkZW50aWZpY2F0aW9uQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDA0MDExMDJcIjoge3ZyOiBcIlNUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQZXJzb25BZGRyZXNzXCJ9LFxuICAgIFwiMDA0MDExMDNcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIlBlcnNvblRlbGVwaG9uZU51bWJlcnNcIn0sXG4gICAgXCIwMDQwMTQwMFwiOiB7dnI6IFwiTFRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlcXVlc3RlZFByb2NlZHVyZUNvbW1lbnRzXCJ9LFxuICAgIFwiMDA0MDIwMDFcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWFzb25Gb3JUaGVJbWFnaW5nU2VydmljZVJlcXVlc3RcIn0sXG4gICAgXCIwMDQwMjAwNFwiOiB7dnI6IFwiREFcIiwgdm06IFwiMVwiLCBuYW1lOiBcIklzc3VlRGF0ZU9mSW1hZ2luZ1NlcnZpY2VSZXF1ZXN0XCJ9LFxuICAgIFwiMDA0MDIwMDVcIjoge3ZyOiBcIlRNXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJc3N1ZVRpbWVPZkltYWdpbmdTZXJ2aWNlUmVxdWVzdFwifSxcbiAgICBcIjAwNDAyMDA2XCI6IHt2cjogXCJTSFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGxhY2VyT3JkZXJOdW1iZXJJbWFnaW5nU2VydmljZVJlcXVlc3RSZXRpcmVkXCJ9LFxuICAgIFwiMDA0MDIwMDdcIjoge3ZyOiBcIlNIXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJGaWxsZXJPcmRlck51bWJlckltYWdpbmdTZXJ2aWNlUmVxdWVzdFJldGlyZWRcIn0sXG4gICAgXCIwMDQwMjAwOFwiOiB7dnI6IFwiUE5cIiwgdm06IFwiMVwiLCBuYW1lOiBcIk9yZGVyRW50ZXJlZEJ5XCJ9LFxuICAgIFwiMDA0MDIwMDlcIjoge3ZyOiBcIlNIXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJPcmRlckVudGVyZXJMb2NhdGlvblwifSxcbiAgICBcIjAwNDAyMDEwXCI6IHt2cjogXCJTSFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiT3JkZXJDYWxsYmFja1Bob25lTnVtYmVyXCJ9LFxuICAgIFwiMDA0MDIwMTZcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQbGFjZXJPcmRlck51bWJlckltYWdpbmdTZXJ2aWNlUmVxdWVzdFwifSxcbiAgICBcIjAwNDAyMDE3XCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRmlsbGVyT3JkZXJOdW1iZXJJbWFnaW5nU2VydmljZVJlcXVlc3RcIn0sXG4gICAgXCIwMDQwMjQwMFwiOiB7dnI6IFwiTFRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkltYWdpbmdTZXJ2aWNlUmVxdWVzdENvbW1lbnRzXCJ9LFxuICAgIFwiMDA0MDMwMDFcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb25maWRlbnRpYWxpdHlDb25zdHJhaW50T25QYXRpZW50RGF0YURlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMDA0MDQwMDFcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJHZW5lcmFsUHVycG9zZVNjaGVkdWxlZFByb2NlZHVyZVN0ZXBTdGF0dXNcIn0sXG4gICAgXCIwMDQwNDAwMlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkdlbmVyYWxQdXJwb3NlUGVyZm9ybWVkUHJvY2VkdXJlU3RlcFN0YXR1c1wifSxcbiAgICBcIjAwNDA0MDAzXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiR2VuZXJhbFB1cnBvc2VTY2hlZHVsZWRQcm9jZWR1cmVTdGVwUHJpb3JpdHlcIn0sXG4gICAgXCIwMDQwNDAwNFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNjaGVkdWxlZFByb2Nlc3NpbmdBcHBsaWNhdGlvbnNDb2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQwNDAwNVwiOiB7dnI6IFwiRFRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNjaGVkdWxlZFByb2NlZHVyZVN0ZXBTdGFydERhdGVUaW1lXCJ9LFxuICAgIFwiMDA0MDQwMDZcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNdWx0aXBsZUNvcGllc0ZsYWdcIn0sXG4gICAgXCIwMDQwNDAwN1wiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBlcmZvcm1lZFByb2Nlc3NpbmdBcHBsaWNhdGlvbnNDb2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQwNDAwOVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkh1bWFuUGVyZm9ybWVyQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDA0MDQwMTBcIjoge3ZyOiBcIkRUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTY2hlZHVsZWRQcm9jZWR1cmVTdGVwTW9kaWZpY2F0aW9uRGF0ZVRpbWVcIn0sXG4gICAgXCIwMDQwNDAxMVwiOiB7dnI6IFwiRFRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkV4cGVjdGVkQ29tcGxldGlvbkRhdGVUaW1lXCJ9LFxuICAgIFwiMDA0MDQwMTVcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZXN1bHRpbmdHZW5lcmFsUHVycG9zZVBlcmZvcm1lZFByb2NlZHVyZVN0ZXBzU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQwNDAxNlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZmVyZW5jZWRHZW5lcmFsUHVycG9zZVNjaGVkdWxlZFByb2NlZHVyZVN0ZXBTZXF1ZW5jZVwifSxcbiAgICBcIjAwNDA0MDE4XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2NoZWR1bGVkV29ya2l0ZW1Db2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQwNDAxOVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBlcmZvcm1lZFdvcmtpdGVtQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDA0MDQwMjBcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbnB1dEF2YWlsYWJpbGl0eUZsYWdcIn0sXG4gICAgXCIwMDQwNDAyMVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIklucHV0SW5mb3JtYXRpb25TZXF1ZW5jZVwifSxcbiAgICBcIjAwNDA0MDIyXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVsZXZhbnRJbmZvcm1hdGlvblNlcXVlbmNlXCJ9LFxuICAgIFwiMDA0MDQwMjNcIjoge3ZyOiBcIlVJXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWZlcmVuY2VkR2VuZXJhbFB1cnBvc2VTY2hlZHVsZWRQcm9jZWR1cmVTdGVwVHJhbnNhY3Rpb25VSURcIn0sXG4gICAgXCIwMDQwNDAyNVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNjaGVkdWxlZFN0YXRpb25OYW1lQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDA0MDQwMjZcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTY2hlZHVsZWRTdGF0aW9uQ2xhc3NDb2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQwNDAyN1wiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNjaGVkdWxlZFN0YXRpb25HZW9ncmFwaGljTG9jYXRpb25Db2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQwNDAyOFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBlcmZvcm1lZFN0YXRpb25OYW1lQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDA0MDQwMjlcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQZXJmb3JtZWRTdGF0aW9uQ2xhc3NDb2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQwNDAzMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBlcmZvcm1lZFN0YXRpb25HZW9ncmFwaGljTG9jYXRpb25Db2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQwNDAzMVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlcXVlc3RlZFN1YnNlcXVlbnRXb3JraXRlbUNvZGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwNDA0MDMyXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTm9uRElDT01PdXRwdXRDb2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQwNDAzM1wiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk91dHB1dEluZm9ybWF0aW9uU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQwNDAzNFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNjaGVkdWxlZEh1bWFuUGVyZm9ybWVyc1NlcXVlbmNlXCJ9LFxuICAgIFwiMDA0MDQwMzVcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBY3R1YWxIdW1hblBlcmZvcm1lcnNTZXF1ZW5jZVwifSxcbiAgICBcIjAwNDA0MDM2XCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiSHVtYW5QZXJmb3JtZXJPcmdhbml6YXRpb25cIn0sXG4gICAgXCIwMDQwNDAzN1wiOiB7dnI6IFwiUE5cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkh1bWFuUGVyZm9ybWVyTmFtZVwifSxcbiAgICBcIjAwNDA0MDQwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmF3RGF0YUhhbmRsaW5nXCJ9LFxuICAgIFwiMDA0MDQwNDFcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbnB1dFJlYWRpbmVzc1N0YXRlXCJ9LFxuICAgIFwiMDA0MDQwNTBcIjoge3ZyOiBcIkRUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQZXJmb3JtZWRQcm9jZWR1cmVTdGVwU3RhcnREYXRlVGltZVwifSxcbiAgICBcIjAwNDA0MDUxXCI6IHt2cjogXCJEVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGVyZm9ybWVkUHJvY2VkdXJlU3RlcEVuZERhdGVUaW1lXCJ9LFxuICAgIFwiMDA0MDQwNTJcIjoge3ZyOiBcIkRUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQcm9jZWR1cmVTdGVwQ2FuY2VsbGF0aW9uRGF0ZVRpbWVcIn0sXG4gICAgXCIwMDQwODMwMlwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkVudHJhbmNlRG9zZUlubUd5XCJ9LFxuICAgIFwiMDA0MDkwOTRcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWZlcmVuY2VkSW1hZ2VSZWFsV29ybGRWYWx1ZU1hcHBpbmdTZXF1ZW5jZVwifSxcbiAgICBcIjAwNDA5MDk2XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVhbFdvcmxkVmFsdWVNYXBwaW5nU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQwOTA5OFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBpeGVsVmFsdWVNYXBwaW5nQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDA0MDkyMTBcIjoge3ZyOiBcIlNIXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJMVVRMYWJlbFwifSxcbiAgICBcIjAwNDA5MjExXCI6IHt2cjogXCJVU3xTU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVhbFdvcmxkVmFsdWVMYXN0VmFsdWVNYXBwZWRcIn0sXG4gICAgXCIwMDQwOTIxMlwiOiB7dnI6IFwiRkRcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiUmVhbFdvcmxkVmFsdWVMVVREYXRhXCJ9LFxuICAgIFwiMDA0MDkyMTZcIjoge3ZyOiBcIlVTfFNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWFsV29ybGRWYWx1ZUZpcnN0VmFsdWVNYXBwZWRcIn0sXG4gICAgXCIwMDQwOTIyNFwiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlYWxXb3JsZFZhbHVlSW50ZXJjZXB0XCJ9LFxuICAgIFwiMDA0MDkyMjVcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWFsV29ybGRWYWx1ZVNsb3BlXCJ9LFxuICAgIFwiMDA0MEEwMDdcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJGaW5kaW5nc0ZsYWdUcmlhbFwifSxcbiAgICBcIjAwNDBBMDEwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVsYXRpb25zaGlwVHlwZVwifSxcbiAgICBcIjAwNDBBMDIwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRmluZGluZ3NTZXF1ZW5jZVRyaWFsXCJ9LFxuICAgIFwiMDA0MEEwMjFcIjoge3ZyOiBcIlVJXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJGaW5kaW5nc0dyb3VwVUlEVHJpYWxcIn0sXG4gICAgXCIwMDQwQTAyMlwiOiB7dnI6IFwiVUlcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZmVyZW5jZWRGaW5kaW5nc0dyb3VwVUlEVHJpYWxcIn0sXG4gICAgXCIwMDQwQTAyM1wiOiB7dnI6IFwiREFcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkZpbmRpbmdzR3JvdXBSZWNvcmRpbmdEYXRlVHJpYWxcIn0sXG4gICAgXCIwMDQwQTAyNFwiOiB7dnI6IFwiVE1cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkZpbmRpbmdzR3JvdXBSZWNvcmRpbmdUaW1lVHJpYWxcIn0sXG4gICAgXCIwMDQwQTAyNlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkZpbmRpbmdzU291cmNlQ2F0ZWdvcnlDb2RlU2VxdWVuY2VUcmlhbFwifSxcbiAgICBcIjAwNDBBMDI3XCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiVmVyaWZ5aW5nT3JnYW5pemF0aW9uXCJ9LFxuICAgIFwiMDA0MEEwMjhcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEb2N1bWVudGluZ09yZ2FuaXphdGlvbklkZW50aWZpZXJDb2RlU2VxdWVuY2VUcmlhbFwifSxcbiAgICBcIjAwNDBBMDMwXCI6IHt2cjogXCJEVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVmVyaWZpY2F0aW9uRGF0ZVRpbWVcIn0sXG4gICAgXCIwMDQwQTAzMlwiOiB7dnI6IFwiRFRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk9ic2VydmF0aW9uRGF0ZVRpbWVcIn0sXG4gICAgXCIwMDQwQTA0MFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlZhbHVlVHlwZVwifSxcbiAgICBcIjAwNDBBMDQzXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29uY2VwdE5hbWVDb2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQwQTA0N1wiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIk1lYXN1cmVtZW50UHJlY2lzaW9uRGVzY3JpcHRpb25UcmlhbFwifSxcbiAgICBcIjAwNDBBMDUwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29udGludWl0eU9mQ29udGVudFwifSxcbiAgICBcIjAwNDBBMDU3XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJVcmdlbmN5T3JQcmlvcml0eUFsZXJ0c1RyaWFsXCJ9LFxuICAgIFwiMDA0MEEwNjBcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTZXF1ZW5jaW5nSW5kaWNhdG9yVHJpYWxcIn0sXG4gICAgXCIwMDQwQTA2NlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRvY3VtZW50SWRlbnRpZmllckNvZGVTZXF1ZW5jZVRyaWFsXCJ9LFxuICAgIFwiMDA0MEEwNjdcIjoge3ZyOiBcIlBOXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEb2N1bWVudEF1dGhvclRyaWFsXCJ9LFxuICAgIFwiMDA0MEEwNjhcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEb2N1bWVudEF1dGhvcklkZW50aWZpZXJDb2RlU2VxdWVuY2VUcmlhbFwifSxcbiAgICBcIjAwNDBBMDcwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiSWRlbnRpZmllckNvZGVTZXF1ZW5jZVRyaWFsXCJ9LFxuICAgIFwiMDA0MEEwNzNcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJWZXJpZnlpbmdPYnNlcnZlclNlcXVlbmNlXCJ9LFxuICAgIFwiMDA0MEEwNzRcIjoge3ZyOiBcIk9CXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJPYmplY3RCaW5hcnlJZGVudGlmaWVyVHJpYWxcIn0sXG4gICAgXCIwMDQwQTA3NVwiOiB7dnI6IFwiUE5cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlZlcmlmeWluZ09ic2VydmVyTmFtZVwifSxcbiAgICBcIjAwNDBBMDc2XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRG9jdW1lbnRpbmdPYnNlcnZlcklkZW50aWZpZXJDb2RlU2VxdWVuY2VUcmlhbFwifSxcbiAgICBcIjAwNDBBMDc4XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQXV0aG9yT2JzZXJ2ZXJTZXF1ZW5jZVwifSxcbiAgICBcIjAwNDBBMDdBXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGFydGljaXBhbnRTZXF1ZW5jZVwifSxcbiAgICBcIjAwNDBBMDdDXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ3VzdG9kaWFsT3JnYW5pemF0aW9uU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQwQTA4MFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBhcnRpY2lwYXRpb25UeXBlXCJ9LFxuICAgIFwiMDA0MEEwODJcIjoge3ZyOiBcIkRUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQYXJ0aWNpcGF0aW9uRGF0ZVRpbWVcIn0sXG4gICAgXCIwMDQwQTA4NFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk9ic2VydmVyVHlwZVwifSxcbiAgICBcIjAwNDBBMDg1XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUHJvY2VkdXJlSWRlbnRpZmllckNvZGVTZXF1ZW5jZVRyaWFsXCJ9LFxuICAgIFwiMDA0MEEwODhcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJWZXJpZnlpbmdPYnNlcnZlcklkZW50aWZpY2F0aW9uQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDA0MEEwODlcIjoge3ZyOiBcIk9CXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJPYmplY3REaXJlY3RvcnlCaW5hcnlJZGVudGlmaWVyVHJpYWxcIn0sXG4gICAgXCIwMDQwQTA5MFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkVxdWl2YWxlbnRDREFEb2N1bWVudFNlcXVlbmNlXCJ9LFxuICAgIFwiMDA0MEEwQjBcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjItMm5cIiwgbmFtZTogXCJSZWZlcmVuY2VkV2F2ZWZvcm1DaGFubmVsc1wifSxcbiAgICBcIjAwNDBBMTEwXCI6IHt2cjogXCJEQVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGF0ZU9mRG9jdW1lbnRPclZlcmJhbFRyYW5zYWN0aW9uVHJpYWxcIn0sXG4gICAgXCIwMDQwQTExMlwiOiB7dnI6IFwiVE1cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRpbWVPZkRvY3VtZW50Q3JlYXRpb25PclZlcmJhbFRyYW5zYWN0aW9uVHJpYWxcIn0sXG4gICAgXCIwMDQwQTEyMFwiOiB7dnI6IFwiRFRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRhdGVUaW1lXCJ9LFxuICAgIFwiMDA0MEExMjFcIjoge3ZyOiBcIkRBXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEYXRlXCJ9LFxuICAgIFwiMDA0MEExMjJcIjoge3ZyOiBcIlRNXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUaW1lXCJ9LFxuICAgIFwiMDA0MEExMjNcIjoge3ZyOiBcIlBOXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQZXJzb25OYW1lXCJ9LFxuICAgIFwiMDA0MEExMjRcIjoge3ZyOiBcIlVJXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJVSURcIn0sXG4gICAgXCIwMDQwQTEyNVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMlwiLCBuYW1lOiBcIlJlcG9ydFN0YXR1c0lEVHJpYWxcIn0sXG4gICAgXCIwMDQwQTEzMFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRlbXBvcmFsUmFuZ2VUeXBlXCJ9LFxuICAgIFwiMDA0MEExMzJcIjoge3ZyOiBcIlVMXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIlJlZmVyZW5jZWRTYW1wbGVQb3NpdGlvbnNcIn0sXG4gICAgXCIwMDQwQTEzNlwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiUmVmZXJlbmNlZEZyYW1lTnVtYmVyc1wifSxcbiAgICBcIjAwNDBBMTM4XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJSZWZlcmVuY2VkVGltZU9mZnNldHNcIn0sXG4gICAgXCIwMDQwQTEzQVwiOiB7dnI6IFwiRFRcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiUmVmZXJlbmNlZERhdGVUaW1lXCJ9LFxuICAgIFwiMDA0MEExNjBcIjoge3ZyOiBcIlVUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUZXh0VmFsdWVcIn0sXG4gICAgXCIwMDQwQTE2N1wiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk9ic2VydmF0aW9uQ2F0ZWdvcnlDb2RlU2VxdWVuY2VUcmlhbFwifSxcbiAgICBcIjAwNDBBMTY4XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29uY2VwdENvZGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwNDBBMTZBXCI6IHt2cjogXCJTVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQmlibGlvZ3JhcGhpY0NpdGF0aW9uVHJpYWxcIn0sXG4gICAgXCIwMDQwQTE3MFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlB1cnBvc2VPZlJlZmVyZW5jZUNvZGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwNDBBMTcxXCI6IHt2cjogXCJVSVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiT2JzZXJ2YXRpb25VSURUcmlhbFwifSxcbiAgICBcIjAwNDBBMTcyXCI6IHt2cjogXCJVSVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJlbmNlZE9ic2VydmF0aW9uVUlEVHJpYWxcIn0sXG4gICAgXCIwMDQwQTE3M1wiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZmVyZW5jZWRPYnNlcnZhdGlvbkNsYXNzVHJpYWxcIn0sXG4gICAgXCIwMDQwQTE3NFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZmVyZW5jZWRPYmplY3RPYnNlcnZhdGlvbkNsYXNzVHJpYWxcIn0sXG4gICAgXCIwMDQwQTE4MFwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFubm90YXRpb25Hcm91cE51bWJlclwifSxcbiAgICBcIjAwNDBBMTkyXCI6IHt2cjogXCJEQVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiT2JzZXJ2YXRpb25EYXRlVHJpYWxcIn0sXG4gICAgXCIwMDQwQTE5M1wiOiB7dnI6IFwiVE1cIiwgdm06IFwiMVwiLCBuYW1lOiBcIk9ic2VydmF0aW9uVGltZVRyaWFsXCJ9LFxuICAgIFwiMDA0MEExOTRcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNZWFzdXJlbWVudEF1dG9tYXRpb25UcmlhbFwifSxcbiAgICBcIjAwNDBBMTk1XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTW9kaWZpZXJDb2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQwQTIyNFwiOiB7dnI6IFwiU1RcIiwgdm06IFwiMVwiLCBuYW1lOiBcIklkZW50aWZpY2F0aW9uRGVzY3JpcHRpb25UcmlhbFwifSxcbiAgICBcIjAwNDBBMjkwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29vcmRpbmF0ZXNTZXRHZW9tZXRyaWNUeXBlVHJpYWxcIn0sXG4gICAgXCIwMDQwQTI5NlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFsZ29yaXRobUNvZGVTZXF1ZW5jZVRyaWFsXCJ9LFxuICAgIFwiMDA0MEEyOTdcIjoge3ZyOiBcIlNUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBbGdvcml0aG1EZXNjcmlwdGlvblRyaWFsXCJ9LFxuICAgIFwiMDA0MEEyOUFcIjoge3ZyOiBcIlNMXCIsIHZtOiBcIjItMm5cIiwgbmFtZTogXCJQaXhlbENvb3JkaW5hdGVzU2V0VHJpYWxcIn0sXG4gICAgXCIwMDQwQTMwMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk1lYXN1cmVkVmFsdWVTZXF1ZW5jZVwifSxcbiAgICBcIjAwNDBBMzAxXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTnVtZXJpY1ZhbHVlUXVhbGlmaWVyQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDA0MEEzMDdcIjoge3ZyOiBcIlBOXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDdXJyZW50T2JzZXJ2ZXJUcmlhbFwifSxcbiAgICBcIjAwNDBBMzBBXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJOdW1lcmljVmFsdWVcIn0sXG4gICAgXCIwMDQwQTMxM1wiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZmVyZW5jZWRBY2Nlc3Npb25TZXF1ZW5jZVRyaWFsXCJ9LFxuICAgIFwiMDA0MEEzM0FcIjoge3ZyOiBcIlNUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZXBvcnRTdGF0dXNDb21tZW50VHJpYWxcIn0sXG4gICAgXCIwMDQwQTM0MFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlByb2NlZHVyZUNvbnRleHRTZXF1ZW5jZVRyaWFsXCJ9LFxuICAgIFwiMDA0MEEzNTJcIjoge3ZyOiBcIlBOXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJWZXJiYWxTb3VyY2VUcmlhbFwifSxcbiAgICBcIjAwNDBBMzUzXCI6IHt2cjogXCJTVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQWRkcmVzc1RyaWFsXCJ9LFxuICAgIFwiMDA0MEEzNTRcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUZWxlcGhvbmVOdW1iZXJUcmlhbFwifSxcbiAgICBcIjAwNDBBMzU4XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVmVyYmFsU291cmNlSWRlbnRpZmllckNvZGVTZXF1ZW5jZVRyaWFsXCJ9LFxuICAgIFwiMDA0MEEzNjBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQcmVkZWNlc3NvckRvY3VtZW50c1NlcXVlbmNlXCJ9LFxuICAgIFwiMDA0MEEzNzBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWZlcmVuY2VkUmVxdWVzdFNlcXVlbmNlXCJ9LFxuICAgIFwiMDA0MEEzNzJcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQZXJmb3JtZWRQcm9jZWR1cmVDb2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQwQTM3NVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkN1cnJlbnRSZXF1ZXN0ZWRQcm9jZWR1cmVFdmlkZW5jZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDA0MEEzODBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZXBvcnREZXRhaWxTZXF1ZW5jZVRyaWFsXCJ9LFxuICAgIFwiMDA0MEEzODVcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQZXJ0aW5lbnRPdGhlckV2aWRlbmNlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQwQTM5MFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkhMN1N0cnVjdHVyZWREb2N1bWVudFJlZmVyZW5jZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDA0MEE0MDJcIjoge3ZyOiBcIlVJXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJPYnNlcnZhdGlvblN1YmplY3RVSURUcmlhbFwifSxcbiAgICBcIjAwNDBBNDAzXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiT2JzZXJ2YXRpb25TdWJqZWN0Q2xhc3NUcmlhbFwifSxcbiAgICBcIjAwNDBBNDA0XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiT2JzZXJ2YXRpb25TdWJqZWN0VHlwZUNvZGVTZXF1ZW5jZVRyaWFsXCJ9LFxuICAgIFwiMDA0MEE0OTFcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb21wbGV0aW9uRmxhZ1wifSxcbiAgICBcIjAwNDBBNDkyXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29tcGxldGlvbkZsYWdEZXNjcmlwdGlvblwifSxcbiAgICBcIjAwNDBBNDkzXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiVmVyaWZpY2F0aW9uRmxhZ1wifSxcbiAgICBcIjAwNDBBNDk0XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQXJjaGl2ZVJlcXVlc3RlZFwifSxcbiAgICBcIjAwNDBBNDk2XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUHJlbGltaW5hcnlGbGFnXCJ9LFxuICAgIFwiMDA0MEE1MDRcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb250ZW50VGVtcGxhdGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwNDBBNTI1XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiSWRlbnRpY2FsRG9jdW1lbnRzU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQwQTYwMFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk9ic2VydmF0aW9uU3ViamVjdENvbnRleHRGbGFnVHJpYWxcIn0sXG4gICAgXCIwMDQwQTYwMVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk9ic2VydmVyQ29udGV4dEZsYWdUcmlhbFwifSxcbiAgICBcIjAwNDBBNjAzXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUHJvY2VkdXJlQ29udGV4dEZsYWdUcmlhbFwifSxcbiAgICBcIjAwNDBBNzMwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29udGVudFNlcXVlbmNlXCJ9LFxuICAgIFwiMDA0MEE3MzFcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWxhdGlvbnNoaXBTZXF1ZW5jZVRyaWFsXCJ9LFxuICAgIFwiMDA0MEE3MzJcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWxhdGlvbnNoaXBUeXBlQ29kZVNlcXVlbmNlVHJpYWxcIn0sXG4gICAgXCIwMDQwQTc0NFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkxhbmd1YWdlQ29kZVNlcXVlbmNlVHJpYWxcIn0sXG4gICAgXCIwMDQwQTk5MlwiOiB7dnI6IFwiU1RcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlVuaWZvcm1SZXNvdXJjZUxvY2F0b3JUcmlhbFwifSxcbiAgICBcIjAwNDBCMDIwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiV2F2ZWZvcm1Bbm5vdGF0aW9uU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQwREIwMFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRlbXBsYXRlSWRlbnRpZmllclwifSxcbiAgICBcIjAwNDBEQjA2XCI6IHt2cjogXCJEVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVGVtcGxhdGVWZXJzaW9uXCJ9LFxuICAgIFwiMDA0MERCMDdcIjoge3ZyOiBcIkRUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUZW1wbGF0ZUxvY2FsVmVyc2lvblwifSxcbiAgICBcIjAwNDBEQjBCXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiVGVtcGxhdGVFeHRlbnNpb25GbGFnXCJ9LFxuICAgIFwiMDA0MERCMENcIjoge3ZyOiBcIlVJXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUZW1wbGF0ZUV4dGVuc2lvbk9yZ2FuaXphdGlvblVJRFwifSxcbiAgICBcIjAwNDBEQjBEXCI6IHt2cjogXCJVSVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVGVtcGxhdGVFeHRlbnNpb25DcmVhdG9yVUlEXCJ9LFxuICAgIFwiMDA0MERCNzNcIjoge3ZyOiBcIlVMXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIlJlZmVyZW5jZWRDb250ZW50SXRlbUlkZW50aWZpZXJcIn0sXG4gICAgXCIwMDQwRTAwMVwiOiB7dnI6IFwiU1RcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkhMN0luc3RhbmNlSWRlbnRpZmllclwifSxcbiAgICBcIjAwNDBFMDA0XCI6IHt2cjogXCJEVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiSEw3RG9jdW1lbnRFZmZlY3RpdmVUaW1lXCJ9LFxuICAgIFwiMDA0MEUwMDZcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJITDdEb2N1bWVudFR5cGVDb2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQwRTAwOFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRvY3VtZW50Q2xhc3NDb2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQwRTAxMFwiOiB7dnI6IFwiVVRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJldHJpZXZlVVJJXCJ9LFxuICAgIFwiMDA0MEUwMTFcIjoge3ZyOiBcIlVJXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZXRyaWV2ZUxvY2F0aW9uVUlEXCJ9LFxuICAgIFwiMDA0MEUwMjBcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUeXBlT2ZJbnN0YW5jZXNcIn0sXG4gICAgXCIwMDQwRTAyMVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRJQ09NUmV0cmlldmFsU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQwRTAyMlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRJQ09NTWVkaWFSZXRyaWV2YWxTZXF1ZW5jZVwifSxcbiAgICBcIjAwNDBFMDIzXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiV0FET1JldHJpZXZhbFNlcXVlbmNlXCJ9LFxuICAgIFwiMDA0MEUwMjRcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJYRFNSZXRyaWV2YWxTZXF1ZW5jZVwifSxcbiAgICBcIjAwNDBFMDMwXCI6IHt2cjogXCJVSVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVwb3NpdG9yeVVuaXF1ZUlEXCJ9LFxuICAgIFwiMDA0MEUwMzFcIjoge3ZyOiBcIlVJXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJIb21lQ29tbXVuaXR5SURcIn0sXG4gICAgXCIwMDQyMDAxMFwiOiB7dnI6IFwiU1RcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRvY3VtZW50VGl0bGVcIn0sXG4gICAgXCIwMDQyMDAxMVwiOiB7dnI6IFwiT0JcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkVuY2Fwc3VsYXRlZERvY3VtZW50XCJ9LFxuICAgIFwiMDA0MjAwMTJcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNSU1FVHlwZU9mRW5jYXBzdWxhdGVkRG9jdW1lbnRcIn0sXG4gICAgXCIwMDQyMDAxM1wiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNvdXJjZUluc3RhbmNlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQyMDAxNFwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiTGlzdE9mTUlNRVR5cGVzXCJ9LFxuICAgIFwiMDA0NDAwMDFcIjoge3ZyOiBcIlNUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQcm9kdWN0UGFja2FnZUlkZW50aWZpZXJcIn0sXG4gICAgXCIwMDQ0MDAwMlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlN1YnN0YW5jZUFkbWluaXN0cmF0aW9uQXBwcm92YWxcIn0sXG4gICAgXCIwMDQ0MDAwM1wiOiB7dnI6IFwiTFRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFwcHJvdmFsU3RhdHVzRnVydGhlckRlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMDA0NDAwMDRcIjoge3ZyOiBcIkRUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBcHByb3ZhbFN0YXR1c0RhdGVUaW1lXCJ9LFxuICAgIFwiMDA0NDAwMDdcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQcm9kdWN0VHlwZUNvZGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwNDQwMDA4XCI6IHt2cjogXCJMT1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJQcm9kdWN0TmFtZVwifSxcbiAgICBcIjAwNDQwMDA5XCI6IHt2cjogXCJMVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUHJvZHVjdERlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMDA0NDAwMEFcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQcm9kdWN0TG90SWRlbnRpZmllclwifSxcbiAgICBcIjAwNDQwMDBCXCI6IHt2cjogXCJEVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUHJvZHVjdEV4cGlyYXRpb25EYXRlVGltZVwifSxcbiAgICBcIjAwNDQwMDEwXCI6IHt2cjogXCJEVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3Vic3RhbmNlQWRtaW5pc3RyYXRpb25EYXRlVGltZVwifSxcbiAgICBcIjAwNDQwMDExXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3Vic3RhbmNlQWRtaW5pc3RyYXRpb25Ob3Rlc1wifSxcbiAgICBcIjAwNDQwMDEyXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3Vic3RhbmNlQWRtaW5pc3RyYXRpb25EZXZpY2VJRFwifSxcbiAgICBcIjAwNDQwMDEzXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUHJvZHVjdFBhcmFtZXRlclNlcXVlbmNlXCJ9LFxuICAgIFwiMDA0NDAwMTlcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTdWJzdGFuY2VBZG1pbmlzdHJhdGlvblBhcmFtZXRlclNlcXVlbmNlXCJ9LFxuICAgIFwiMDA0NjAwMTJcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJMZW5zRGVzY3JpcHRpb25cIn0sXG4gICAgXCIwMDQ2MDAxNFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJpZ2h0TGVuc1NlcXVlbmNlXCJ9LFxuICAgIFwiMDA0NjAwMTVcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJMZWZ0TGVuc1NlcXVlbmNlXCJ9LFxuICAgIFwiMDA0NjAwMTZcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJVbnNwZWNpZmllZExhdGVyYWxpdHlMZW5zU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQ2MDAxOFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkN5bGluZGVyU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQ2MDAyOFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlByaXNtU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQ2MDAzMFwiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkhvcml6b250YWxQcmlzbVBvd2VyXCJ9LFxuICAgIFwiMDA0NjAwMzJcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJIb3Jpem9udGFsUHJpc21CYXNlXCJ9LFxuICAgIFwiMDA0NjAwMzRcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJWZXJ0aWNhbFByaXNtUG93ZXJcIn0sXG4gICAgXCIwMDQ2MDAzNlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlZlcnRpY2FsUHJpc21CYXNlXCJ9LFxuICAgIFwiMDA0NjAwMzhcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJMZW5zU2VnbWVudFR5cGVcIn0sXG4gICAgXCIwMDQ2MDA0MFwiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk9wdGljYWxUcmFuc21pdHRhbmNlXCJ9LFxuICAgIFwiMDA0NjAwNDJcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDaGFubmVsV2lkdGhcIn0sXG4gICAgXCIwMDQ2MDA0NFwiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlB1cGlsU2l6ZVwifSxcbiAgICBcIjAwNDYwMDQ2XCI6IHt2cjogXCJGRFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29ybmVhbFNpemVcIn0sXG4gICAgXCIwMDQ2MDA1MFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkF1dG9yZWZyYWN0aW9uUmlnaHRFeWVTZXF1ZW5jZVwifSxcbiAgICBcIjAwNDYwMDUyXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQXV0b3JlZnJhY3Rpb25MZWZ0RXllU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQ2MDA2MFwiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRpc3RhbmNlUHVwaWxsYXJ5RGlzdGFuY2VcIn0sXG4gICAgXCIwMDQ2MDA2MlwiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk5lYXJQdXBpbGxhcnlEaXN0YW5jZVwifSxcbiAgICBcIjAwNDYwMDYzXCI6IHt2cjogXCJGRFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW50ZXJtZWRpYXRlUHVwaWxsYXJ5RGlzdGFuY2VcIn0sXG4gICAgXCIwMDQ2MDA2NFwiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk90aGVyUHVwaWxsYXJ5RGlzdGFuY2VcIn0sXG4gICAgXCIwMDQ2MDA3MFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIktlcmF0b21ldHJ5UmlnaHRFeWVTZXF1ZW5jZVwifSxcbiAgICBcIjAwNDYwMDcxXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiS2VyYXRvbWV0cnlMZWZ0RXllU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQ2MDA3NFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlN0ZWVwS2VyYXRvbWV0cmljQXhpc1NlcXVlbmNlXCJ9LFxuICAgIFwiMDA0NjAwNzVcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSYWRpdXNPZkN1cnZhdHVyZVwifSxcbiAgICBcIjAwNDYwMDc2XCI6IHt2cjogXCJGRFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiS2VyYXRvbWV0cmljUG93ZXJcIn0sXG4gICAgXCIwMDQ2MDA3N1wiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIktlcmF0b21ldHJpY0F4aXNcIn0sXG4gICAgXCIwMDQ2MDA4MFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkZsYXRLZXJhdG9tZXRyaWNBeGlzU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQ2MDA5MlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkJhY2tncm91bmRDb2xvclwifSxcbiAgICBcIjAwNDYwMDk0XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiT3B0b3R5cGVcIn0sXG4gICAgXCIwMDQ2MDA5NVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk9wdG90eXBlUHJlc2VudGF0aW9uXCJ9LFxuICAgIFwiMDA0NjAwOTdcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTdWJqZWN0aXZlUmVmcmFjdGlvblJpZ2h0RXllU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQ2MDA5OFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlN1YmplY3RpdmVSZWZyYWN0aW9uTGVmdEV5ZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDA0NjAxMDBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBZGROZWFyU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQ2MDEwMVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFkZEludGVybWVkaWF0ZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDA0NjAxMDJcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBZGRPdGhlclNlcXVlbmNlXCJ9LFxuICAgIFwiMDA0NjAxMDRcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBZGRQb3dlclwifSxcbiAgICBcIjAwNDYwMTA2XCI6IHt2cjogXCJGRFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVmlld2luZ0Rpc3RhbmNlXCJ9LFxuICAgIFwiMDA0NjAxMjFcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJWaXN1YWxBY3VpdHlUeXBlQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDA0NjAxMjJcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJWaXN1YWxBY3VpdHlSaWdodEV5ZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDA0NjAxMjNcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJWaXN1YWxBY3VpdHlMZWZ0RXllU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQ2MDEyNFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlZpc3VhbEFjdWl0eUJvdGhFeWVzT3BlblNlcXVlbmNlXCJ9LFxuICAgIFwiMDA0NjAxMjVcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJWaWV3aW5nRGlzdGFuY2VUeXBlXCJ9LFxuICAgIFwiMDA0NjAxMzVcIjoge3ZyOiBcIlNTXCIsIHZtOiBcIjJcIiwgbmFtZTogXCJWaXN1YWxBY3VpdHlNb2RpZmllcnNcIn0sXG4gICAgXCIwMDQ2MDEzN1wiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRlY2ltYWxWaXN1YWxBY3VpdHlcIn0sXG4gICAgXCIwMDQ2MDEzOVwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIk9wdG90eXBlRGV0YWlsZWREZWZpbml0aW9uXCJ9LFxuICAgIFwiMDA0NjAxNDVcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWZlcmVuY2VkUmVmcmFjdGl2ZU1lYXN1cmVtZW50c1NlcXVlbmNlXCJ9LFxuICAgIFwiMDA0NjAxNDZcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTcGhlcmVQb3dlclwifSxcbiAgICBcIjAwNDYwMTQ3XCI6IHt2cjogXCJGRFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ3lsaW5kZXJQb3dlclwifSxcbiAgICBcIjAwNDgwMDAxXCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW1hZ2VkVm9sdW1lV2lkdGhcIn0sXG4gICAgXCIwMDQ4MDAwMlwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkltYWdlZFZvbHVtZUhlaWdodFwifSxcbiAgICBcIjAwNDgwMDAzXCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW1hZ2VkVm9sdW1lRGVwdGhcIn0sXG4gICAgXCIwMDQ4MDAwNlwiOiB7dnI6IFwiVUxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRvdGFsUGl4ZWxNYXRyaXhDb2x1bW5zXCJ9LFxuICAgIFwiMDA0ODAwMDdcIjoge3ZyOiBcIlVMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUb3RhbFBpeGVsTWF0cml4Um93c1wifSxcbiAgICBcIjAwNDgwMDA4XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVG90YWxQaXhlbE1hdHJpeE9yaWdpblNlcXVlbmNlXCJ9LFxuICAgIFwiMDA0ODAwMTBcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTcGVjaW1lbkxhYmVsSW5JbWFnZVwifSxcbiAgICBcIjAwNDgwMDExXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRm9jdXNNZXRob2RcIn0sXG4gICAgXCIwMDQ4MDAxMlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkV4dGVuZGVkRGVwdGhPZkZpZWxkXCJ9LFxuICAgIFwiMDA0ODAwMTNcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJOdW1iZXJPZkZvY2FsUGxhbmVzXCJ9LFxuICAgIFwiMDA0ODAwMTRcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEaXN0YW5jZUJldHdlZW5Gb2NhbFBsYW5lc1wifSxcbiAgICBcIjAwNDgwMDE1XCI6IHt2cjogXCJVU1wiLCB2bTogXCIzXCIsIG5hbWU6IFwiUmVjb21tZW5kZWRBYnNlbnRQaXhlbENJRUxhYlZhbHVlXCJ9LFxuICAgIFwiMDA0ODAxMDBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbGx1bWluYXRvclR5cGVDb2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQ4MDEwMlwiOiB7dnI6IFwiRFNcIiwgdm06IFwiNlwiLCBuYW1lOiBcIkltYWdlT3JpZW50YXRpb25TbGlkZVwifSxcbiAgICBcIjAwNDgwMTA1XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiT3B0aWNhbFBhdGhTZXF1ZW5jZVwifSxcbiAgICBcIjAwNDgwMTA2XCI6IHt2cjogXCJTSFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiT3B0aWNhbFBhdGhJZGVudGlmaWVyXCJ9LFxuICAgIFwiMDA0ODAxMDdcIjoge3ZyOiBcIlNUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJPcHRpY2FsUGF0aERlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMDA0ODAxMDhcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbGx1bWluYXRpb25Db2xvckNvZGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwNDgwMTEwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3BlY2ltZW5SZWZlcmVuY2VTZXF1ZW5jZVwifSxcbiAgICBcIjAwNDgwMTExXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29uZGVuc2VyTGVuc1Bvd2VyXCJ9LFxuICAgIFwiMDA0ODAxMTJcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJPYmplY3RpdmVMZW5zUG93ZXJcIn0sXG4gICAgXCIwMDQ4MDExM1wiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk9iamVjdGl2ZUxlbnNOdW1lcmljYWxBcGVydHVyZVwifSxcbiAgICBcIjAwNDgwMTIwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGFsZXR0ZUNvbG9yTG9va3VwVGFibGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwNDgwMjAwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJlbmNlZEltYWdlTmF2aWdhdGlvblNlcXVlbmNlXCJ9LFxuICAgIFwiMDA0ODAyMDFcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjJcIiwgbmFtZTogXCJUb3BMZWZ0SGFuZENvcm5lck9mTG9jYWxpemVyQXJlYVwifSxcbiAgICBcIjAwNDgwMjAyXCI6IHt2cjogXCJVU1wiLCB2bTogXCIyXCIsIG5hbWU6IFwiQm90dG9tUmlnaHRIYW5kQ29ybmVyT2ZMb2NhbGl6ZXJBcmVhXCJ9LFxuICAgIFwiMDA0ODAyMDdcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJPcHRpY2FsUGF0aElkZW50aWZpY2F0aW9uU2VxdWVuY2VcIn0sXG4gICAgXCIwMDQ4MDIxQVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBsYW5lUG9zaXRpb25TbGlkZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDA0ODAyMUVcIjoge3ZyOiBcIlNMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSb3dQb3NpdGlvbkluVG90YWxJbWFnZVBpeGVsTWF0cml4XCJ9LFxuICAgIFwiMDA0ODAyMUZcIjoge3ZyOiBcIlNMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb2x1bW5Qb3NpdGlvbkluVG90YWxJbWFnZVBpeGVsTWF0cml4XCJ9LFxuICAgIFwiMDA0ODAzMDFcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQaXhlbE9yaWdpbkludGVycHJldGF0aW9uXCJ9LFxuICAgIFwiMDA1MDAwMDRcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDYWxpYnJhdGlvbkltYWdlXCJ9LFxuICAgIFwiMDA1MDAwMTBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEZXZpY2VTZXF1ZW5jZVwifSxcbiAgICBcIjAwNTAwMDEyXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29udGFpbmVyQ29tcG9uZW50VHlwZUNvZGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwNTAwMDEzXCI6IHt2cjogXCJGRFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29udGFpbmVyQ29tcG9uZW50VGhpY2tuZXNzXCJ9LFxuICAgIFwiMDA1MDAwMTRcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEZXZpY2VMZW5ndGhcIn0sXG4gICAgXCIwMDUwMDAxNVwiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvbnRhaW5lckNvbXBvbmVudFdpZHRoXCJ9LFxuICAgIFwiMDA1MDAwMTZcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEZXZpY2VEaWFtZXRlclwifSxcbiAgICBcIjAwNTAwMDE3XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGV2aWNlRGlhbWV0ZXJVbml0c1wifSxcbiAgICBcIjAwNTAwMDE4XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGV2aWNlVm9sdW1lXCJ9LFxuICAgIFwiMDA1MDAwMTlcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbnRlck1hcmtlckRpc3RhbmNlXCJ9LFxuICAgIFwiMDA1MDAwMUFcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb250YWluZXJDb21wb25lbnRNYXRlcmlhbFwifSxcbiAgICBcIjAwNTAwMDFCXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29udGFpbmVyQ29tcG9uZW50SURcIn0sXG4gICAgXCIwMDUwMDAxQ1wiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvbnRhaW5lckNvbXBvbmVudExlbmd0aFwifSxcbiAgICBcIjAwNTAwMDFEXCI6IHt2cjogXCJGRFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29udGFpbmVyQ29tcG9uZW50RGlhbWV0ZXJcIn0sXG4gICAgXCIwMDUwMDAxRVwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvbnRhaW5lckNvbXBvbmVudERlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMDA1MDAwMjBcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEZXZpY2VEZXNjcmlwdGlvblwifSxcbiAgICBcIjAwNTIwMDAxXCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29udHJhc3RCb2x1c0luZ3JlZGllbnRQZXJjZW50QnlWb2x1bWVcIn0sXG4gICAgXCIwMDUyMDAwMlwiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk9DVEZvY2FsRGlzdGFuY2VcIn0sXG4gICAgXCIwMDUyMDAwM1wiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkJlYW1TcG90U2l6ZVwifSxcbiAgICBcIjAwNTIwMDA0XCI6IHt2cjogXCJGRFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRWZmZWN0aXZlUmVmcmFjdGl2ZUluZGV4XCJ9LFxuICAgIFwiMDA1MjAwMDZcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJPQ1RBY3F1aXNpdGlvbkRvbWFpblwifSxcbiAgICBcIjAwNTIwMDA3XCI6IHt2cjogXCJGRFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiT0NUT3B0aWNhbENlbnRlcldhdmVsZW5ndGhcIn0sXG4gICAgXCIwMDUyMDAwOFwiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkF4aWFsUmVzb2x1dGlvblwifSxcbiAgICBcIjAwNTIwMDA5XCI6IHt2cjogXCJGRFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmFuZ2luZ0RlcHRoXCJ9LFxuICAgIFwiMDA1MjAwMTFcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBTGluZVJhdGVcIn0sXG4gICAgXCIwMDUyMDAxMlwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFMaW5lc1BlckZyYW1lXCJ9LFxuICAgIFwiMDA1MjAwMTNcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDYXRoZXRlclJvdGF0aW9uYWxSYXRlXCJ9LFxuICAgIFwiMDA1MjAwMTRcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBTGluZVBpeGVsU3BhY2luZ1wifSxcbiAgICBcIjAwNTIwMDE2XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTW9kZU9mUGVyY3V0YW5lb3VzQWNjZXNzU2VxdWVuY2VcIn0sXG4gICAgXCIwMDUyMDAyNVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkludHJhdmFzY3VsYXJPQ1RGcmFtZVR5cGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwNTIwMDI2XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiT0NUWk9mZnNldEFwcGxpZWRcIn0sXG4gICAgXCIwMDUyMDAyN1wiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkludHJhdmFzY3VsYXJGcmFtZUNvbnRlbnRTZXF1ZW5jZVwifSxcbiAgICBcIjAwNTIwMDI4XCI6IHt2cjogXCJGRFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW50cmF2YXNjdWxhckxvbmdpdHVkaW5hbERpc3RhbmNlXCJ9LFxuICAgIFwiMDA1MjAwMjlcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbnRyYXZhc2N1bGFyT0NURnJhbWVDb250ZW50U2VxdWVuY2VcIn0sXG4gICAgXCIwMDUyMDAzMFwiOiB7dnI6IFwiU1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk9DVFpPZmZzZXRDb3JyZWN0aW9uXCJ9LFxuICAgIFwiMDA1MjAwMzFcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDYXRoZXRlckRpcmVjdGlvbk9mUm90YXRpb25cIn0sXG4gICAgXCIwMDUyMDAzM1wiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNlYW1MaW5lTG9jYXRpb25cIn0sXG4gICAgXCIwMDUyMDAzNFwiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkZpcnN0QUxpbmVMb2NhdGlvblwifSxcbiAgICBcIjAwNTIwMDM2XCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2VhbUxpbmVJbmRleFwifSxcbiAgICBcIjAwNTIwMDM4XCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTnVtYmVyT2ZQYWRkZWRBbGluZXNcIn0sXG4gICAgXCIwMDUyMDAzOVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkludGVycG9sYXRpb25UeXBlXCJ9LFxuICAgIFwiMDA1MjAwM0FcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWZyYWN0aXZlSW5kZXhBcHBsaWVkXCJ9LFxuICAgIFwiMDA1NDAwMTFcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJOdW1iZXJPZkVuZXJneVdpbmRvd3NcIn0sXG4gICAgXCIwMDU0MDAxMlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkVuZXJneVdpbmRvd0luZm9ybWF0aW9uU2VxdWVuY2VcIn0sXG4gICAgXCIwMDU0MDAxM1wiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkVuZXJneVdpbmRvd1JhbmdlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDU0MDAxNFwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkVuZXJneVdpbmRvd0xvd2VyTGltaXRcIn0sXG4gICAgXCIwMDU0MDAxNVwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkVuZXJneVdpbmRvd1VwcGVyTGltaXRcIn0sXG4gICAgXCIwMDU0MDAxNlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJhZGlvcGhhcm1hY2V1dGljYWxJbmZvcm1hdGlvblNlcXVlbmNlXCJ9LFxuICAgIFwiMDA1NDAwMTdcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZXNpZHVhbFN5cmluZ2VDb3VudHNcIn0sXG4gICAgXCIwMDU0MDAxOFwiOiB7dnI6IFwiU0hcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkVuZXJneVdpbmRvd05hbWVcIn0sXG4gICAgXCIwMDU0MDAyMFwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiRGV0ZWN0b3JWZWN0b3JcIn0sXG4gICAgXCIwMDU0MDAyMVwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk51bWJlck9mRGV0ZWN0b3JzXCJ9LFxuICAgIFwiMDA1NDAwMjJcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEZXRlY3RvckluZm9ybWF0aW9uU2VxdWVuY2VcIn0sXG4gICAgXCIwMDU0MDAzMFwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiUGhhc2VWZWN0b3JcIn0sXG4gICAgXCIwMDU0MDAzMVwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk51bWJlck9mUGhhc2VzXCJ9LFxuICAgIFwiMDA1NDAwMzJcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQaGFzZUluZm9ybWF0aW9uU2VxdWVuY2VcIn0sXG4gICAgXCIwMDU0MDAzM1wiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk51bWJlck9mRnJhbWVzSW5QaGFzZVwifSxcbiAgICBcIjAwNTQwMDM2XCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGhhc2VEZWxheVwifSxcbiAgICBcIjAwNTQwMDM4XCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGF1c2VCZXR3ZWVuRnJhbWVzXCJ9LFxuICAgIFwiMDA1NDAwMzlcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQaGFzZURlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMDA1NDAwNTBcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIlJvdGF0aW9uVmVjdG9yXCJ9LFxuICAgIFwiMDA1NDAwNTFcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJOdW1iZXJPZlJvdGF0aW9uc1wifSxcbiAgICBcIjAwNTQwMDUyXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUm90YXRpb25JbmZvcm1hdGlvblNlcXVlbmNlXCJ9LFxuICAgIFwiMDA1NDAwNTNcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJOdW1iZXJPZkZyYW1lc0luUm90YXRpb25cIn0sXG4gICAgXCIwMDU0MDA2MFwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiUlJJbnRlcnZhbFZlY3RvclwifSxcbiAgICBcIjAwNTQwMDYxXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTnVtYmVyT2ZSUkludGVydmFsc1wifSxcbiAgICBcIjAwNTQwMDYyXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiR2F0ZWRJbmZvcm1hdGlvblNlcXVlbmNlXCJ9LFxuICAgIFwiMDA1NDAwNjNcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEYXRhSW5mb3JtYXRpb25TZXF1ZW5jZVwifSxcbiAgICBcIjAwNTQwMDcwXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJUaW1lU2xvdFZlY3RvclwifSxcbiAgICBcIjAwNTQwMDcxXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTnVtYmVyT2ZUaW1lU2xvdHNcIn0sXG4gICAgXCIwMDU0MDA3MlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRpbWVTbG90SW5mb3JtYXRpb25TZXF1ZW5jZVwifSxcbiAgICBcIjAwNTQwMDczXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiVGltZVNsb3RUaW1lXCJ9LFxuICAgIFwiMDA1NDAwODBcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIlNsaWNlVmVjdG9yXCJ9LFxuICAgIFwiMDA1NDAwODFcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJOdW1iZXJPZlNsaWNlc1wifSxcbiAgICBcIjAwNTQwMDkwXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJBbmd1bGFyVmlld1ZlY3RvclwifSxcbiAgICBcIjAwNTQwMTAwXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJUaW1lU2xpY2VWZWN0b3JcIn0sXG4gICAgXCIwMDU0MDEwMVwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk51bWJlck9mVGltZVNsaWNlc1wifSxcbiAgICBcIjAwNTQwMjAwXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3RhcnRBbmdsZVwifSxcbiAgICBcIjAwNTQwMjAyXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiVHlwZU9mRGV0ZWN0b3JNb3Rpb25cIn0sXG4gICAgXCIwMDU0MDIxMFwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiVHJpZ2dlclZlY3RvclwifSxcbiAgICBcIjAwNTQwMjExXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTnVtYmVyT2ZUcmlnZ2Vyc0luUGhhc2VcIn0sXG4gICAgXCIwMDU0MDIyMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlZpZXdDb2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDU0MDIyMlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlZpZXdNb2RpZmllckNvZGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwNTQwMzAwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmFkaW9udWNsaWRlQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDA1NDAzMDJcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBZG1pbmlzdHJhdGlvblJvdXRlQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDA1NDAzMDRcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSYWRpb3BoYXJtYWNldXRpY2FsQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDA1NDAzMDZcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDYWxpYnJhdGlvbkRhdGFTZXF1ZW5jZVwifSxcbiAgICBcIjAwNTQwMzA4XCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRW5lcmd5V2luZG93TnVtYmVyXCJ9LFxuICAgIFwiMDA1NDA0MDBcIjoge3ZyOiBcIlNIXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbWFnZUlEXCJ9LFxuICAgIFwiMDA1NDA0MTBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQYXRpZW50T3JpZW50YXRpb25Db2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDU0MDQxMlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBhdGllbnRPcmllbnRhdGlvbk1vZGlmaWVyQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDA1NDA0MTRcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQYXRpZW50R2FudHJ5UmVsYXRpb25zaGlwQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDA1NDA1MDBcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTbGljZVByb2dyZXNzaW9uRGlyZWN0aW9uXCJ9LFxuICAgIFwiMDA1NDEwMDBcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjJcIiwgbmFtZTogXCJTZXJpZXNUeXBlXCJ9LFxuICAgIFwiMDA1NDEwMDFcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJVbml0c1wifSxcbiAgICBcIjAwNTQxMDAyXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ291bnRzU291cmNlXCJ9LFxuICAgIFwiMDA1NDEwMDRcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZXByb2plY3Rpb25NZXRob2RcIn0sXG4gICAgXCIwMDU0MTAwNlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNVVlR5cGVcIn0sXG4gICAgXCIwMDU0MTEwMFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJhbmRvbXNDb3JyZWN0aW9uTWV0aG9kXCJ9LFxuICAgIFwiMDA1NDExMDFcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBdHRlbnVhdGlvbkNvcnJlY3Rpb25NZXRob2RcIn0sXG4gICAgXCIwMDU0MTEwMlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRlY2F5Q29ycmVjdGlvblwifSxcbiAgICBcIjAwNTQxMTAzXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVjb25zdHJ1Y3Rpb25NZXRob2RcIn0sXG4gICAgXCIwMDU0MTEwNFwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRldGVjdG9yTGluZXNPZlJlc3BvbnNlVXNlZFwifSxcbiAgICBcIjAwNTQxMTA1XCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2NhdHRlckNvcnJlY3Rpb25NZXRob2RcIn0sXG4gICAgXCIwMDU0MTIwMFwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkF4aWFsQWNjZXB0YW5jZVwifSxcbiAgICBcIjAwNTQxMjAxXCI6IHt2cjogXCJJU1wiLCB2bTogXCIyXCIsIG5hbWU6IFwiQXhpYWxNYXNoXCJ9LFxuICAgIFwiMDA1NDEyMDJcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUcmFuc3ZlcnNlTWFzaFwifSxcbiAgICBcIjAwNTQxMjAzXCI6IHt2cjogXCJEU1wiLCB2bTogXCIyXCIsIG5hbWU6IFwiRGV0ZWN0b3JFbGVtZW50U2l6ZVwifSxcbiAgICBcIjAwNTQxMjEwXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29pbmNpZGVuY2VXaW5kb3dXaWR0aFwifSxcbiAgICBcIjAwNTQxMjIwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJTZWNvbmRhcnlDb3VudHNUeXBlXCJ9LFxuICAgIFwiMDA1NDEzMDBcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJGcmFtZVJlZmVyZW5jZVRpbWVcIn0sXG4gICAgXCIwMDU0MTMxMFwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlByaW1hcnlQcm9tcHRzQ291bnRzQWNjdW11bGF0ZWRcIn0sXG4gICAgXCIwMDU0MTMxMVwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiU2Vjb25kYXJ5Q291bnRzQWNjdW11bGF0ZWRcIn0sXG4gICAgXCIwMDU0MTMyMFwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNsaWNlU2Vuc2l0aXZpdHlGYWN0b3JcIn0sXG4gICAgXCIwMDU0MTMyMVwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRlY2F5RmFjdG9yXCJ9LFxuICAgIFwiMDA1NDEzMjJcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEb3NlQ2FsaWJyYXRpb25GYWN0b3JcIn0sXG4gICAgXCIwMDU0MTMyM1wiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNjYXR0ZXJGcmFjdGlvbkZhY3RvclwifSxcbiAgICBcIjAwNTQxMzI0XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGVhZFRpbWVGYWN0b3JcIn0sXG4gICAgXCIwMDU0MTMzMFwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkltYWdlSW5kZXhcIn0sXG4gICAgXCIwMDU0MTQwMFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiQ291bnRzSW5jbHVkZWRcIn0sXG4gICAgXCIwMDU0MTQwMVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRlYWRUaW1lQ29ycmVjdGlvbkZsYWdcIn0sXG4gICAgXCIwMDYwMzAwMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkhpc3RvZ3JhbVNlcXVlbmNlXCJ9LFxuICAgIFwiMDA2MDMwMDJcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJIaXN0b2dyYW1OdW1iZXJPZkJpbnNcIn0sXG4gICAgXCIwMDYwMzAwNFwiOiB7dnI6IFwiVVN8U1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkhpc3RvZ3JhbUZpcnN0QmluVmFsdWVcIn0sXG4gICAgXCIwMDYwMzAwNlwiOiB7dnI6IFwiVVN8U1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkhpc3RvZ3JhbUxhc3RCaW5WYWx1ZVwifSxcbiAgICBcIjAwNjAzMDA4XCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiSGlzdG9ncmFtQmluV2lkdGhcIn0sXG4gICAgXCIwMDYwMzAxMFwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkhpc3RvZ3JhbUV4cGxhbmF0aW9uXCJ9LFxuICAgIFwiMDA2MDMwMjBcIjoge3ZyOiBcIlVMXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIkhpc3RvZ3JhbURhdGFcIn0sXG4gICAgXCIwMDYyMDAwMVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNlZ21lbnRhdGlvblR5cGVcIn0sXG4gICAgXCIwMDYyMDAwMlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNlZ21lbnRTZXF1ZW5jZVwifSxcbiAgICBcIjAwNjIwMDAzXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2VnbWVudGVkUHJvcGVydHlDYXRlZ29yeUNvZGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwNjIwMDA0XCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2VnbWVudE51bWJlclwifSxcbiAgICBcIjAwNjIwMDA1XCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2VnbWVudExhYmVsXCJ9LFxuICAgIFwiMDA2MjAwMDZcIjoge3ZyOiBcIlNUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTZWdtZW50RGVzY3JpcHRpb25cIn0sXG4gICAgXCIwMDYyMDAwOFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNlZ21lbnRBbGdvcml0aG1UeXBlXCJ9LFxuICAgIFwiMDA2MjAwMDlcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTZWdtZW50QWxnb3JpdGhtTmFtZVwifSxcbiAgICBcIjAwNjIwMDBBXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2VnbWVudElkZW50aWZpY2F0aW9uU2VxdWVuY2VcIn0sXG4gICAgXCIwMDYyMDAwQlwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiUmVmZXJlbmNlZFNlZ21lbnROdW1iZXJcIn0sXG4gICAgXCIwMDYyMDAwQ1wiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlY29tbWVuZGVkRGlzcGxheUdyYXlzY2FsZVZhbHVlXCJ9LFxuICAgIFwiMDA2MjAwMERcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjNcIiwgbmFtZTogXCJSZWNvbW1lbmRlZERpc3BsYXlDSUVMYWJWYWx1ZVwifSxcbiAgICBcIjAwNjIwMDBFXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTWF4aW11bUZyYWN0aW9uYWxWYWx1ZVwifSxcbiAgICBcIjAwNjIwMDBGXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2VnbWVudGVkUHJvcGVydHlUeXBlQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDA2MjAwMTBcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTZWdtZW50YXRpb25GcmFjdGlvbmFsVHlwZVwifSxcbiAgICBcIjAwNjQwMDAyXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGVmb3JtYWJsZVJlZ2lzdHJhdGlvblNlcXVlbmNlXCJ9LFxuICAgIFwiMDA2NDAwMDNcIjoge3ZyOiBcIlVJXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTb3VyY2VGcmFtZU9mUmVmZXJlbmNlVUlEXCJ9LFxuICAgIFwiMDA2NDAwMDVcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEZWZvcm1hYmxlUmVnaXN0cmF0aW9uR3JpZFNlcXVlbmNlXCJ9LFxuICAgIFwiMDA2NDAwMDdcIjoge3ZyOiBcIlVMXCIsIHZtOiBcIjNcIiwgbmFtZTogXCJHcmlkRGltZW5zaW9uc1wifSxcbiAgICBcIjAwNjQwMDA4XCI6IHt2cjogXCJGRFwiLCB2bTogXCIzXCIsIG5hbWU6IFwiR3JpZFJlc29sdXRpb25cIn0sXG4gICAgXCIwMDY0MDAwOVwiOiB7dnI6IFwiT0ZcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlZlY3RvckdyaWREYXRhXCJ9LFxuICAgIFwiMDA2NDAwMEZcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQcmVEZWZvcm1hdGlvbk1hdHJpeFJlZ2lzdHJhdGlvblNlcXVlbmNlXCJ9LFxuICAgIFwiMDA2NDAwMTBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQb3N0RGVmb3JtYXRpb25NYXRyaXhSZWdpc3RyYXRpb25TZXF1ZW5jZVwifSxcbiAgICBcIjAwNjYwMDAxXCI6IHt2cjogXCJVTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTnVtYmVyT2ZTdXJmYWNlc1wifSxcbiAgICBcIjAwNjYwMDAyXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3VyZmFjZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDA2NjAwMDNcIjoge3ZyOiBcIlVMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTdXJmYWNlTnVtYmVyXCJ9LFxuICAgIFwiMDA2NjAwMDRcIjoge3ZyOiBcIkxUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTdXJmYWNlQ29tbWVudHNcIn0sXG4gICAgXCIwMDY2MDAwOVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlN1cmZhY2VQcm9jZXNzaW5nXCJ9LFxuICAgIFwiMDA2NjAwMEFcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTdXJmYWNlUHJvY2Vzc2luZ1JhdGlvXCJ9LFxuICAgIFwiMDA2NjAwMEJcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTdXJmYWNlUHJvY2Vzc2luZ0Rlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMDA2NjAwMENcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWNvbW1lbmRlZFByZXNlbnRhdGlvbk9wYWNpdHlcIn0sXG4gICAgXCIwMDY2MDAwRFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlY29tbWVuZGVkUHJlc2VudGF0aW9uVHlwZVwifSxcbiAgICBcIjAwNjYwMDBFXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRmluaXRlVm9sdW1lXCJ9LFxuICAgIFwiMDA2NjAwMTBcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNYW5pZm9sZFwifSxcbiAgICBcIjAwNjYwMDExXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3VyZmFjZVBvaW50c1NlcXVlbmNlXCJ9LFxuICAgIFwiMDA2NjAwMTJcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTdXJmYWNlUG9pbnRzTm9ybWFsc1NlcXVlbmNlXCJ9LFxuICAgIFwiMDA2NjAwMTNcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTdXJmYWNlTWVzaFByaW1pdGl2ZXNTZXF1ZW5jZVwifSxcbiAgICBcIjAwNjYwMDE1XCI6IHt2cjogXCJVTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTnVtYmVyT2ZTdXJmYWNlUG9pbnRzXCJ9LFxuICAgIFwiMDA2NjAwMTZcIjoge3ZyOiBcIk9GXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQb2ludENvb3JkaW5hdGVzRGF0YVwifSxcbiAgICBcIjAwNjYwMDE3XCI6IHt2cjogXCJGTFwiLCB2bTogXCIzXCIsIG5hbWU6IFwiUG9pbnRQb3NpdGlvbkFjY3VyYWN5XCJ9LFxuICAgIFwiMDA2NjAwMThcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNZWFuUG9pbnREaXN0YW5jZVwifSxcbiAgICBcIjAwNjYwMDE5XCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTWF4aW11bVBvaW50RGlzdGFuY2VcIn0sXG4gICAgXCIwMDY2MDAxQVwiOiB7dnI6IFwiRkxcIiwgdm06IFwiNlwiLCBuYW1lOiBcIlBvaW50c0JvdW5kaW5nQm94Q29vcmRpbmF0ZXNcIn0sXG4gICAgXCIwMDY2MDAxQlwiOiB7dnI6IFwiRkxcIiwgdm06IFwiM1wiLCBuYW1lOiBcIkF4aXNPZlJvdGF0aW9uXCJ9LFxuICAgIFwiMDA2NjAwMUNcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjNcIiwgbmFtZTogXCJDZW50ZXJPZlJvdGF0aW9uXCJ9LFxuICAgIFwiMDA2NjAwMUVcIjoge3ZyOiBcIlVMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJOdW1iZXJPZlZlY3RvcnNcIn0sXG4gICAgXCIwMDY2MDAxRlwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlZlY3RvckRpbWVuc2lvbmFsaXR5XCJ9LFxuICAgIFwiMDA2NjAwMjBcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIlZlY3RvckFjY3VyYWN5XCJ9LFxuICAgIFwiMDA2NjAwMjFcIjoge3ZyOiBcIk9GXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJWZWN0b3JDb29yZGluYXRlRGF0YVwifSxcbiAgICBcIjAwNjYwMDIzXCI6IHt2cjogXCJPV1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiVHJpYW5nbGVQb2ludEluZGV4TGlzdFwifSxcbiAgICBcIjAwNjYwMDI0XCI6IHt2cjogXCJPV1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRWRnZVBvaW50SW5kZXhMaXN0XCJ9LFxuICAgIFwiMDA2NjAwMjVcIjoge3ZyOiBcIk9XXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJWZXJ0ZXhQb2ludEluZGV4TGlzdFwifSxcbiAgICBcIjAwNjYwMDI2XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVHJpYW5nbGVTdHJpcFNlcXVlbmNlXCJ9LFxuICAgIFwiMDA2NjAwMjdcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUcmlhbmdsZUZhblNlcXVlbmNlXCJ9LFxuICAgIFwiMDA2NjAwMjhcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJMaW5lU2VxdWVuY2VcIn0sXG4gICAgXCIwMDY2MDAyOVwiOiB7dnI6IFwiT1dcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlByaW1pdGl2ZVBvaW50SW5kZXhMaXN0XCJ9LFxuICAgIFwiMDA2NjAwMkFcIjoge3ZyOiBcIlVMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTdXJmYWNlQ291bnRcIn0sXG4gICAgXCIwMDY2MDAyQlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZmVyZW5jZWRTdXJmYWNlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDY2MDAyQ1wiOiB7dnI6IFwiVUxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZmVyZW5jZWRTdXJmYWNlTnVtYmVyXCJ9LFxuICAgIFwiMDA2NjAwMkRcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTZWdtZW50U3VyZmFjZUdlbmVyYXRpb25BbGdvcml0aG1JZGVudGlmaWNhdGlvblNlcXVlbmNlXCJ9LFxuICAgIFwiMDA2NjAwMkVcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTZWdtZW50U3VyZmFjZVNvdXJjZUluc3RhbmNlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDY2MDAyRlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFsZ29yaXRobUZhbWlseUNvZGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwNjYwMDMwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQWxnb3JpdGhtTmFtZUNvZGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwNjYwMDMxXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQWxnb3JpdGhtVmVyc2lvblwifSxcbiAgICBcIjAwNjYwMDMyXCI6IHt2cjogXCJMVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQWxnb3JpdGhtUGFyYW1ldGVyc1wifSxcbiAgICBcIjAwNjYwMDM0XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRmFjZXRTZXF1ZW5jZVwifSxcbiAgICBcIjAwNjYwMDM1XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3VyZmFjZVByb2Nlc3NpbmdBbGdvcml0aG1JZGVudGlmaWNhdGlvblNlcXVlbmNlXCJ9LFxuICAgIFwiMDA2NjAwMzZcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBbGdvcml0aG1OYW1lXCJ9LFxuICAgIFwiMDA2ODYyMTBcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbXBsYW50U2l6ZVwifSxcbiAgICBcIjAwNjg2MjIxXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW1wbGFudFRlbXBsYXRlVmVyc2lvblwifSxcbiAgICBcIjAwNjg2MjIyXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVwbGFjZWRJbXBsYW50VGVtcGxhdGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwNjg2MjIzXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW1wbGFudFR5cGVcIn0sXG4gICAgXCIwMDY4NjIyNFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRlcml2YXRpb25JbXBsYW50VGVtcGxhdGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwNjg2MjI1XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiT3JpZ2luYWxJbXBsYW50VGVtcGxhdGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwNjg2MjI2XCI6IHt2cjogXCJEVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRWZmZWN0aXZlRGF0ZVRpbWVcIn0sXG4gICAgXCIwMDY4NjIzMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkltcGxhbnRUYXJnZXRBbmF0b215U2VxdWVuY2VcIn0sXG4gICAgXCIwMDY4NjI2MFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkluZm9ybWF0aW9uRnJvbU1hbnVmYWN0dXJlclNlcXVlbmNlXCJ9LFxuICAgIFwiMDA2ODYyNjVcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJOb3RpZmljYXRpb25Gcm9tTWFudWZhY3R1cmVyU2VxdWVuY2VcIn0sXG4gICAgXCIwMDY4NjI3MFwiOiB7dnI6IFwiRFRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkluZm9ybWF0aW9uSXNzdWVEYXRlVGltZVwifSxcbiAgICBcIjAwNjg2MjgwXCI6IHt2cjogXCJTVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW5mb3JtYXRpb25TdW1tYXJ5XCJ9LFxuICAgIFwiMDA2ODYyQTBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbXBsYW50UmVndWxhdG9yeURpc2FwcHJvdmFsQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDA2ODYyQTVcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJPdmVyYWxsVGVtcGxhdGVTcGF0aWFsVG9sZXJhbmNlXCJ9LFxuICAgIFwiMDA2ODYyQzBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJIUEdMRG9jdW1lbnRTZXF1ZW5jZVwifSxcbiAgICBcIjAwNjg2MkQwXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiSFBHTERvY3VtZW50SURcIn0sXG4gICAgXCIwMDY4NjJENVwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkhQR0xEb2N1bWVudExhYmVsXCJ9LFxuICAgIFwiMDA2ODYyRTBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJWaWV3T3JpZW50YXRpb25Db2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDY4NjJGMFwiOiB7dnI6IFwiRkRcIiwgdm06IFwiOVwiLCBuYW1lOiBcIlZpZXdPcmllbnRhdGlvbk1vZGlmaWVyXCJ9LFxuICAgIFwiMDA2ODYyRjJcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJIUEdMRG9jdW1lbnRTY2FsaW5nXCJ9LFxuICAgIFwiMDA2ODYzMDBcIjoge3ZyOiBcIk9CXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJIUEdMRG9jdW1lbnRcIn0sXG4gICAgXCIwMDY4NjMxMFwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkhQR0xDb250b3VyUGVuTnVtYmVyXCJ9LFxuICAgIFwiMDA2ODYzMjBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJIUEdMUGVuU2VxdWVuY2VcIn0sXG4gICAgXCIwMDY4NjMzMFwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkhQR0xQZW5OdW1iZXJcIn0sXG4gICAgXCIwMDY4NjM0MFwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkhQR0xQZW5MYWJlbFwifSxcbiAgICBcIjAwNjg2MzQ1XCI6IHt2cjogXCJTVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiSFBHTFBlbkRlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMDA2ODYzNDZcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjJcIiwgbmFtZTogXCJSZWNvbW1lbmRlZFJvdGF0aW9uUG9pbnRcIn0sXG4gICAgXCIwMDY4NjM0N1wiOiB7dnI6IFwiRkRcIiwgdm06IFwiNFwiLCBuYW1lOiBcIkJvdW5kaW5nUmVjdGFuZ2xlXCJ9LFxuICAgIFwiMDA2ODYzNTBcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIkltcGxhbnRUZW1wbGF0ZTNETW9kZWxTdXJmYWNlTnVtYmVyXCJ9LFxuICAgIFwiMDA2ODYzNjBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTdXJmYWNlTW9kZWxEZXNjcmlwdGlvblNlcXVlbmNlXCJ9LFxuICAgIFwiMDA2ODYzODBcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTdXJmYWNlTW9kZWxMYWJlbFwifSxcbiAgICBcIjAwNjg2MzkwXCI6IHt2cjogXCJGRFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3VyZmFjZU1vZGVsU2NhbGluZ0ZhY3RvclwifSxcbiAgICBcIjAwNjg2M0EwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTWF0ZXJpYWxzQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDA2ODYzQTRcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb2F0aW5nTWF0ZXJpYWxzQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDA2ODYzQThcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbXBsYW50VHlwZUNvZGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwNjg2M0FDXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRml4YXRpb25NZXRob2RDb2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDY4NjNCMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk1hdGluZ0ZlYXR1cmVTZXRzU2VxdWVuY2VcIn0sXG4gICAgXCIwMDY4NjNDMFwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk1hdGluZ0ZlYXR1cmVTZXRJRFwifSxcbiAgICBcIjAwNjg2M0QwXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTWF0aW5nRmVhdHVyZVNldExhYmVsXCJ9LFxuICAgIFwiMDA2ODYzRTBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNYXRpbmdGZWF0dXJlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDY4NjNGMFwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk1hdGluZ0ZlYXR1cmVJRFwifSxcbiAgICBcIjAwNjg2NDAwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTWF0aW5nRmVhdHVyZURlZ3JlZU9mRnJlZWRvbVNlcXVlbmNlXCJ9LFxuICAgIFwiMDA2ODY0MTBcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEZWdyZWVPZkZyZWVkb21JRFwifSxcbiAgICBcIjAwNjg2NDIwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGVncmVlT2ZGcmVlZG9tVHlwZVwifSxcbiAgICBcIjAwNjg2NDMwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVHdvRE1hdGluZ0ZlYXR1cmVDb29yZGluYXRlc1NlcXVlbmNlXCJ9LFxuICAgIFwiMDA2ODY0NDBcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWZlcmVuY2VkSFBHTERvY3VtZW50SURcIn0sXG4gICAgXCIwMDY4NjQ1MFwiOiB7dnI6IFwiRkRcIiwgdm06IFwiMlwiLCBuYW1lOiBcIlR3b0RNYXRpbmdQb2ludFwifSxcbiAgICBcIjAwNjg2NDYwXCI6IHt2cjogXCJGRFwiLCB2bTogXCI0XCIsIG5hbWU6IFwiVHdvRE1hdGluZ0F4ZXNcIn0sXG4gICAgXCIwMDY4NjQ3MFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlR3b0REZWdyZWVPZkZyZWVkb21TZXF1ZW5jZVwifSxcbiAgICBcIjAwNjg2NDkwXCI6IHt2cjogXCJGRFwiLCB2bTogXCIzXCIsIG5hbWU6IFwiVGhyZWVERGVncmVlT2ZGcmVlZG9tQXhpc1wifSxcbiAgICBcIjAwNjg2NEEwXCI6IHt2cjogXCJGRFwiLCB2bTogXCIyXCIsIG5hbWU6IFwiUmFuZ2VPZkZyZWVkb21cIn0sXG4gICAgXCIwMDY4NjRDMFwiOiB7dnI6IFwiRkRcIiwgdm06IFwiM1wiLCBuYW1lOiBcIlRocmVlRE1hdGluZ1BvaW50XCJ9LFxuICAgIFwiMDA2ODY0RDBcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjlcIiwgbmFtZTogXCJUaHJlZURNYXRpbmdBeGVzXCJ9LFxuICAgIFwiMDA2ODY0RjBcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjNcIiwgbmFtZTogXCJUd29ERGVncmVlT2ZGcmVlZG9tQXhpc1wifSxcbiAgICBcIjAwNjg2NTAwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGxhbm5pbmdMYW5kbWFya1BvaW50U2VxdWVuY2VcIn0sXG4gICAgXCIwMDY4NjUxMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBsYW5uaW5nTGFuZG1hcmtMaW5lU2VxdWVuY2VcIn0sXG4gICAgXCIwMDY4NjUyMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBsYW5uaW5nTGFuZG1hcmtQbGFuZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDA2ODY1MzBcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQbGFubmluZ0xhbmRtYXJrSURcIn0sXG4gICAgXCIwMDY4NjU0MFwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBsYW5uaW5nTGFuZG1hcmtEZXNjcmlwdGlvblwifSxcbiAgICBcIjAwNjg2NTQ1XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGxhbm5pbmdMYW5kbWFya0lkZW50aWZpY2F0aW9uQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDA2ODY1NTBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUd29EUG9pbnRDb29yZGluYXRlc1NlcXVlbmNlXCJ9LFxuICAgIFwiMDA2ODY1NjBcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjJcIiwgbmFtZTogXCJUd29EUG9pbnRDb29yZGluYXRlc1wifSxcbiAgICBcIjAwNjg2NTkwXCI6IHt2cjogXCJGRFwiLCB2bTogXCIzXCIsIG5hbWU6IFwiVGhyZWVEUG9pbnRDb29yZGluYXRlc1wifSxcbiAgICBcIjAwNjg2NUEwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVHdvRExpbmVDb29yZGluYXRlc1NlcXVlbmNlXCJ9LFxuICAgIFwiMDA2ODY1QjBcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjRcIiwgbmFtZTogXCJUd29ETGluZUNvb3JkaW5hdGVzXCJ9LFxuICAgIFwiMDA2ODY1RDBcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjZcIiwgbmFtZTogXCJUaHJlZURMaW5lQ29vcmRpbmF0ZXNcIn0sXG4gICAgXCIwMDY4NjVFMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlR3b0RQbGFuZUNvb3JkaW5hdGVzU2VxdWVuY2VcIn0sXG4gICAgXCIwMDY4NjVGMFwiOiB7dnI6IFwiRkRcIiwgdm06IFwiNFwiLCBuYW1lOiBcIlR3b0RQbGFuZUludGVyc2VjdGlvblwifSxcbiAgICBcIjAwNjg2NjEwXCI6IHt2cjogXCJGRFwiLCB2bTogXCIzXCIsIG5hbWU6IFwiVGhyZWVEUGxhbmVPcmlnaW5cIn0sXG4gICAgXCIwMDY4NjYyMFwiOiB7dnI6IFwiRkRcIiwgdm06IFwiM1wiLCBuYW1lOiBcIlRocmVlRFBsYW5lTm9ybWFsXCJ9LFxuICAgIFwiMDA3MDAwMDFcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJHcmFwaGljQW5ub3RhdGlvblNlcXVlbmNlXCJ9LFxuICAgIFwiMDA3MDAwMDJcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJHcmFwaGljTGF5ZXJcIn0sXG4gICAgXCIwMDcwMDAwM1wiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkJvdW5kaW5nQm94QW5ub3RhdGlvblVuaXRzXCJ9LFxuICAgIFwiMDA3MDAwMDRcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBbmNob3JQb2ludEFubm90YXRpb25Vbml0c1wifSxcbiAgICBcIjAwNzAwMDA1XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiR3JhcGhpY0Fubm90YXRpb25Vbml0c1wifSxcbiAgICBcIjAwNzAwMDA2XCI6IHt2cjogXCJTVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVW5mb3JtYXR0ZWRUZXh0VmFsdWVcIn0sXG4gICAgXCIwMDcwMDAwOFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRleHRPYmplY3RTZXF1ZW5jZVwifSxcbiAgICBcIjAwNzAwMDA5XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiR3JhcGhpY09iamVjdFNlcXVlbmNlXCJ9LFxuICAgIFwiMDA3MDAwMTBcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjJcIiwgbmFtZTogXCJCb3VuZGluZ0JveFRvcExlZnRIYW5kQ29ybmVyXCJ9LFxuICAgIFwiMDA3MDAwMTFcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjJcIiwgbmFtZTogXCJCb3VuZGluZ0JveEJvdHRvbVJpZ2h0SGFuZENvcm5lclwifSxcbiAgICBcIjAwNzAwMDEyXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQm91bmRpbmdCb3hUZXh0SG9yaXpvbnRhbEp1c3RpZmljYXRpb25cIn0sXG4gICAgXCIwMDcwMDAxNFwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMlwiLCBuYW1lOiBcIkFuY2hvclBvaW50XCJ9LFxuICAgIFwiMDA3MDAwMTVcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBbmNob3JQb2ludFZpc2liaWxpdHlcIn0sXG4gICAgXCIwMDcwMDAyMFwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkdyYXBoaWNEaW1lbnNpb25zXCJ9LFxuICAgIFwiMDA3MDAwMjFcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJOdW1iZXJPZkdyYXBoaWNQb2ludHNcIn0sXG4gICAgXCIwMDcwMDAyMlwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMi1uXCIsIG5hbWU6IFwiR3JhcGhpY0RhdGFcIn0sXG4gICAgXCIwMDcwMDAyM1wiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkdyYXBoaWNUeXBlXCJ9LFxuICAgIFwiMDA3MDAwMjRcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJHcmFwaGljRmlsbGVkXCJ9LFxuICAgIFwiMDA3MDAwNDBcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbWFnZVJvdGF0aW9uUmV0aXJlZFwifSxcbiAgICBcIjAwNzAwMDQxXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW1hZ2VIb3Jpem9udGFsRmxpcFwifSxcbiAgICBcIjAwNzAwMDQyXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW1hZ2VSb3RhdGlvblwifSxcbiAgICBcIjAwNzAwMDUwXCI6IHt2cjogXCJVU1wiLCB2bTogXCIyXCIsIG5hbWU6IFwiRGlzcGxheWVkQXJlYVRvcExlZnRIYW5kQ29ybmVyVHJpYWxcIn0sXG4gICAgXCIwMDcwMDA1MVwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMlwiLCBuYW1lOiBcIkRpc3BsYXllZEFyZWFCb3R0b21SaWdodEhhbmRDb3JuZXJUcmlhbFwifSxcbiAgICBcIjAwNzAwMDUyXCI6IHt2cjogXCJTTFwiLCB2bTogXCIyXCIsIG5hbWU6IFwiRGlzcGxheWVkQXJlYVRvcExlZnRIYW5kQ29ybmVyXCJ9LFxuICAgIFwiMDA3MDAwNTNcIjoge3ZyOiBcIlNMXCIsIHZtOiBcIjJcIiwgbmFtZTogXCJEaXNwbGF5ZWRBcmVhQm90dG9tUmlnaHRIYW5kQ29ybmVyXCJ9LFxuICAgIFwiMDA3MDAwNUFcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEaXNwbGF5ZWRBcmVhU2VsZWN0aW9uU2VxdWVuY2VcIn0sXG4gICAgXCIwMDcwMDA2MFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkdyYXBoaWNMYXllclNlcXVlbmNlXCJ9LFxuICAgIFwiMDA3MDAwNjJcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJHcmFwaGljTGF5ZXJPcmRlclwifSxcbiAgICBcIjAwNzAwMDY2XCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiR3JhcGhpY0xheWVyUmVjb21tZW5kZWREaXNwbGF5R3JheXNjYWxlVmFsdWVcIn0sXG4gICAgXCIwMDcwMDA2N1wiOiB7dnI6IFwiVVNcIiwgdm06IFwiM1wiLCBuYW1lOiBcIkdyYXBoaWNMYXllclJlY29tbWVuZGVkRGlzcGxheVJHQlZhbHVlXCJ9LFxuICAgIFwiMDA3MDAwNjhcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJHcmFwaGljTGF5ZXJEZXNjcmlwdGlvblwifSxcbiAgICBcIjAwNzAwMDgwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29udGVudExhYmVsXCJ9LFxuICAgIFwiMDA3MDAwODFcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb250ZW50RGVzY3JpcHRpb25cIn0sXG4gICAgXCIwMDcwMDA4MlwiOiB7dnI6IFwiREFcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlByZXNlbnRhdGlvbkNyZWF0aW9uRGF0ZVwifSxcbiAgICBcIjAwNzAwMDgzXCI6IHt2cjogXCJUTVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUHJlc2VudGF0aW9uQ3JlYXRpb25UaW1lXCJ9LFxuICAgIFwiMDA3MDAwODRcIjoge3ZyOiBcIlBOXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb250ZW50Q3JlYXRvck5hbWVcIn0sXG4gICAgXCIwMDcwMDA4NlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvbnRlbnRDcmVhdG9ySWRlbnRpZmljYXRpb25Db2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDcwMDA4N1wiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFsdGVybmF0ZUNvbnRlbnREZXNjcmlwdGlvblNlcXVlbmNlXCJ9LFxuICAgIFwiMDA3MDAxMDBcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQcmVzZW50YXRpb25TaXplTW9kZVwifSxcbiAgICBcIjAwNzAwMTAxXCI6IHt2cjogXCJEU1wiLCB2bTogXCIyXCIsIG5hbWU6IFwiUHJlc2VudGF0aW9uUGl4ZWxTcGFjaW5nXCJ9LFxuICAgIFwiMDA3MDAxMDJcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjJcIiwgbmFtZTogXCJQcmVzZW50YXRpb25QaXhlbEFzcGVjdFJhdGlvXCJ9LFxuICAgIFwiMDA3MDAxMDNcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQcmVzZW50YXRpb25QaXhlbE1hZ25pZmljYXRpb25SYXRpb1wifSxcbiAgICBcIjAwNzAwMjA3XCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiR3JhcGhpY0dyb3VwTGFiZWxcIn0sXG4gICAgXCIwMDcwMDIwOFwiOiB7dnI6IFwiU1RcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkdyYXBoaWNHcm91cERlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMDA3MDAyMDlcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb21wb3VuZEdyYXBoaWNTZXF1ZW5jZVwifSxcbiAgICBcIjAwNzAwMjI2XCI6IHt2cjogXCJVTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29tcG91bmRHcmFwaGljSW5zdGFuY2VJRFwifSxcbiAgICBcIjAwNzAwMjI3XCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRm9udE5hbWVcIn0sXG4gICAgXCIwMDcwMDIyOFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkZvbnROYW1lVHlwZVwifSxcbiAgICBcIjAwNzAwMjI5XCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ1NTRm9udE5hbWVcIn0sXG4gICAgXCIwMDcwMDIzMFwiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJvdGF0aW9uQW5nbGVcIn0sXG4gICAgXCIwMDcwMDIzMVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRleHRTdHlsZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDA3MDAyMzJcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJMaW5lU3R5bGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwNzAwMjMzXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRmlsbFN0eWxlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDcwMDIzNFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkdyYXBoaWNHcm91cFNlcXVlbmNlXCJ9LFxuICAgIFwiMDA3MDAyNDFcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjNcIiwgbmFtZTogXCJUZXh0Q29sb3JDSUVMYWJWYWx1ZVwifSxcbiAgICBcIjAwNzAwMjQyXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiSG9yaXpvbnRhbEFsaWdubWVudFwifSxcbiAgICBcIjAwNzAwMjQzXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiVmVydGljYWxBbGlnbm1lbnRcIn0sXG4gICAgXCIwMDcwMDI0NFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNoYWRvd1N0eWxlXCJ9LFxuICAgIFwiMDA3MDAyNDVcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTaGFkb3dPZmZzZXRYXCJ9LFxuICAgIFwiMDA3MDAyNDZcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTaGFkb3dPZmZzZXRZXCJ9LFxuICAgIFwiMDA3MDAyNDdcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjNcIiwgbmFtZTogXCJTaGFkb3dDb2xvckNJRUxhYlZhbHVlXCJ9LFxuICAgIFwiMDA3MDAyNDhcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJVbmRlcmxpbmVkXCJ9LFxuICAgIFwiMDA3MDAyNDlcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJCb2xkXCJ9LFxuICAgIFwiMDA3MDAyNTBcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJdGFsaWNcIn0sXG4gICAgXCIwMDcwMDI1MVwiOiB7dnI6IFwiVVNcIiwgdm06IFwiM1wiLCBuYW1lOiBcIlBhdHRlcm5PbkNvbG9yQ0lFTGFiVmFsdWVcIn0sXG4gICAgXCIwMDcwMDI1MlwiOiB7dnI6IFwiVVNcIiwgdm06IFwiM1wiLCBuYW1lOiBcIlBhdHRlcm5PZmZDb2xvckNJRUxhYlZhbHVlXCJ9LFxuICAgIFwiMDA3MDAyNTNcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJMaW5lVGhpY2tuZXNzXCJ9LFxuICAgIFwiMDA3MDAyNTRcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJMaW5lRGFzaGluZ1N0eWxlXCJ9LFxuICAgIFwiMDA3MDAyNTVcIjoge3ZyOiBcIlVMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJMaW5lUGF0dGVyblwifSxcbiAgICBcIjAwNzAwMjU2XCI6IHt2cjogXCJPQlwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRmlsbFBhdHRlcm5cIn0sXG4gICAgXCIwMDcwMDI1N1wiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkZpbGxNb2RlXCJ9LFxuICAgIFwiMDA3MDAyNThcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTaGFkb3dPcGFjaXR5XCJ9LFxuICAgIFwiMDA3MDAyNjFcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJHYXBMZW5ndGhcIn0sXG4gICAgXCIwMDcwMDI2MlwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRpYW1ldGVyT2ZWaXNpYmlsaXR5XCJ9LFxuICAgIFwiMDA3MDAyNzNcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjJcIiwgbmFtZTogXCJSb3RhdGlvblBvaW50XCJ9LFxuICAgIFwiMDA3MDAyNzRcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUaWNrQWxpZ25tZW50XCJ9LFxuICAgIFwiMDA3MDAyNzhcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTaG93VGlja0xhYmVsXCJ9LFxuICAgIFwiMDA3MDAyNzlcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUaWNrTGFiZWxBbGlnbm1lbnRcIn0sXG4gICAgXCIwMDcwMDI4MlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvbXBvdW5kR3JhcGhpY1VuaXRzXCJ9LFxuICAgIFwiMDA3MDAyODRcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQYXR0ZXJuT25PcGFjaXR5XCJ9LFxuICAgIFwiMDA3MDAyODVcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQYXR0ZXJuT2ZmT3BhY2l0eVwifSxcbiAgICBcIjAwNzAwMjg3XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTWFqb3JUaWNrc1NlcXVlbmNlXCJ9LFxuICAgIFwiMDA3MDAyODhcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUaWNrUG9zaXRpb25cIn0sXG4gICAgXCIwMDcwMDI4OVwiOiB7dnI6IFwiU0hcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRpY2tMYWJlbFwifSxcbiAgICBcIjAwNzAwMjk0XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29tcG91bmRHcmFwaGljVHlwZVwifSxcbiAgICBcIjAwNzAwMjk1XCI6IHt2cjogXCJVTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiR3JhcGhpY0dyb3VwSURcIn0sXG4gICAgXCIwMDcwMDMwNlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNoYXBlVHlwZVwifSxcbiAgICBcIjAwNzAwMzA4XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVnaXN0cmF0aW9uU2VxdWVuY2VcIn0sXG4gICAgXCIwMDcwMDMwOVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk1hdHJpeFJlZ2lzdHJhdGlvblNlcXVlbmNlXCJ9LFxuICAgIFwiMDA3MDAzMEFcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNYXRyaXhTZXF1ZW5jZVwifSxcbiAgICBcIjAwNzAwMzBDXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRnJhbWVPZlJlZmVyZW5jZVRyYW5zZm9ybWF0aW9uTWF0cml4VHlwZVwifSxcbiAgICBcIjAwNzAwMzBEXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVnaXN0cmF0aW9uVHlwZUNvZGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwNzAwMzBGXCI6IHt2cjogXCJTVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRmlkdWNpYWxEZXNjcmlwdGlvblwifSxcbiAgICBcIjAwNzAwMzEwXCI6IHt2cjogXCJTSFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRmlkdWNpYWxJZGVudGlmaWVyXCJ9LFxuICAgIFwiMDA3MDAzMTFcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJGaWR1Y2lhbElkZW50aWZpZXJDb2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDcwMDMxMlwiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvbnRvdXJVbmNlcnRhaW50eVJhZGl1c1wifSxcbiAgICBcIjAwNzAwMzE0XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVXNlZEZpZHVjaWFsc1NlcXVlbmNlXCJ9LFxuICAgIFwiMDA3MDAzMThcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJHcmFwaGljQ29vcmRpbmF0ZXNEYXRhU2VxdWVuY2VcIn0sXG4gICAgXCIwMDcwMDMxQVwiOiB7dnI6IFwiVUlcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkZpZHVjaWFsVUlEXCJ9LFxuICAgIFwiMDA3MDAzMUNcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJGaWR1Y2lhbFNldFNlcXVlbmNlXCJ9LFxuICAgIFwiMDA3MDAzMUVcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJGaWR1Y2lhbFNlcXVlbmNlXCJ9LFxuICAgIFwiMDA3MDA0MDFcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjNcIiwgbmFtZTogXCJHcmFwaGljTGF5ZXJSZWNvbW1lbmRlZERpc3BsYXlDSUVMYWJWYWx1ZVwifSxcbiAgICBcIjAwNzAwNDAyXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQmxlbmRpbmdTZXF1ZW5jZVwifSxcbiAgICBcIjAwNzAwNDAzXCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVsYXRpdmVPcGFjaXR5XCJ9LFxuICAgIFwiMDA3MDA0MDRcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWZlcmVuY2VkU3BhdGlhbFJlZ2lzdHJhdGlvblNlcXVlbmNlXCJ9LFxuICAgIFwiMDA3MDA0MDVcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJCbGVuZGluZ1Bvc2l0aW9uXCJ9LFxuICAgIFwiMDA3MjAwMDJcIjoge3ZyOiBcIlNIXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJIYW5naW5nUHJvdG9jb2xOYW1lXCJ9LFxuICAgIFwiMDA3MjAwMDRcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJIYW5naW5nUHJvdG9jb2xEZXNjcmlwdGlvblwifSxcbiAgICBcIjAwNzIwMDA2XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiSGFuZ2luZ1Byb3RvY29sTGV2ZWxcIn0sXG4gICAgXCIwMDcyMDAwOFwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkhhbmdpbmdQcm90b2NvbENyZWF0b3JcIn0sXG4gICAgXCIwMDcyMDAwQVwiOiB7dnI6IFwiRFRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkhhbmdpbmdQcm90b2NvbENyZWF0aW9uRGF0ZVRpbWVcIn0sXG4gICAgXCIwMDcyMDAwQ1wiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkhhbmdpbmdQcm90b2NvbERlZmluaXRpb25TZXF1ZW5jZVwifSxcbiAgICBcIjAwNzIwMDBFXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiSGFuZ2luZ1Byb3RvY29sVXNlcklkZW50aWZpY2F0aW9uQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDA3MjAwMTBcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJIYW5naW5nUHJvdG9jb2xVc2VyR3JvdXBOYW1lXCJ9LFxuICAgIFwiMDA3MjAwMTJcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTb3VyY2VIYW5naW5nUHJvdG9jb2xTZXF1ZW5jZVwifSxcbiAgICBcIjAwNzIwMDE0XCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTnVtYmVyT2ZQcmlvcnNSZWZlcmVuY2VkXCJ9LFxuICAgIFwiMDA3MjAwMjBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbWFnZVNldHNTZXF1ZW5jZVwifSxcbiAgICBcIjAwNzIwMDIyXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW1hZ2VTZXRTZWxlY3RvclNlcXVlbmNlXCJ9LFxuICAgIFwiMDA3MjAwMjRcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbWFnZVNldFNlbGVjdG9yVXNhZ2VGbGFnXCJ9LFxuICAgIFwiMDA3MjAwMjZcIjoge3ZyOiBcIkFUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTZWxlY3RvckF0dHJpYnV0ZVwifSxcbiAgICBcIjAwNzIwMDI4XCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2VsZWN0b3JWYWx1ZU51bWJlclwifSxcbiAgICBcIjAwNzIwMDMwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVGltZUJhc2VkSW1hZ2VTZXRzU2VxdWVuY2VcIn0sXG4gICAgXCIwMDcyMDAzMlwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkltYWdlU2V0TnVtYmVyXCJ9LFxuICAgIFwiMDA3MjAwMzRcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbWFnZVNldFNlbGVjdG9yQ2F0ZWdvcnlcIn0sXG4gICAgXCIwMDcyMDAzOFwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMlwiLCBuYW1lOiBcIlJlbGF0aXZlVGltZVwifSxcbiAgICBcIjAwNzIwMDNBXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVsYXRpdmVUaW1lVW5pdHNcIn0sXG4gICAgXCIwMDcyMDAzQ1wiOiB7dnI6IFwiU1NcIiwgdm06IFwiMlwiLCBuYW1lOiBcIkFic3RyYWN0UHJpb3JWYWx1ZVwifSxcbiAgICBcIjAwNzIwMDNFXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQWJzdHJhY3RQcmlvckNvZGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwNzIwMDQwXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW1hZ2VTZXRMYWJlbFwifSxcbiAgICBcIjAwNzIwMDUwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2VsZWN0b3JBdHRyaWJ1dGVWUlwifSxcbiAgICBcIjAwNzIwMDUyXCI6IHt2cjogXCJBVFwiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJTZWxlY3RvclNlcXVlbmNlUG9pbnRlclwifSxcbiAgICBcIjAwNzIwMDU0XCI6IHt2cjogXCJMT1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJTZWxlY3RvclNlcXVlbmNlUG9pbnRlclByaXZhdGVDcmVhdG9yXCJ9LFxuICAgIFwiMDA3MjAwNTZcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTZWxlY3RvckF0dHJpYnV0ZVByaXZhdGVDcmVhdG9yXCJ9LFxuICAgIFwiMDA3MjAwNjBcIjoge3ZyOiBcIkFUXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIlNlbGVjdG9yQVRWYWx1ZVwifSxcbiAgICBcIjAwNzIwMDYyXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJTZWxlY3RvckNTVmFsdWVcIn0sXG4gICAgXCIwMDcyMDA2NFwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiU2VsZWN0b3JJU1ZhbHVlXCJ9LFxuICAgIFwiMDA3MjAwNjZcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIlNlbGVjdG9yTE9WYWx1ZVwifSxcbiAgICBcIjAwNzIwMDY4XCI6IHt2cjogXCJMVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2VsZWN0b3JMVFZhbHVlXCJ9LFxuICAgIFwiMDA3MjAwNkFcIjoge3ZyOiBcIlBOXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIlNlbGVjdG9yUE5WYWx1ZVwifSxcbiAgICBcIjAwNzIwMDZDXCI6IHt2cjogXCJTSFwiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJTZWxlY3RvclNIVmFsdWVcIn0sXG4gICAgXCIwMDcyMDA2RVwiOiB7dnI6IFwiU1RcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNlbGVjdG9yU1RWYWx1ZVwifSxcbiAgICBcIjAwNzIwMDcwXCI6IHt2cjogXCJVVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2VsZWN0b3JVVFZhbHVlXCJ9LFxuICAgIFwiMDA3MjAwNzJcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIlNlbGVjdG9yRFNWYWx1ZVwifSxcbiAgICBcIjAwNzIwMDc0XCI6IHt2cjogXCJGRFwiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJTZWxlY3RvckZEVmFsdWVcIn0sXG4gICAgXCIwMDcyMDA3NlwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiU2VsZWN0b3JGTFZhbHVlXCJ9LFxuICAgIFwiMDA3MjAwNzhcIjoge3ZyOiBcIlVMXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIlNlbGVjdG9yVUxWYWx1ZVwifSxcbiAgICBcIjAwNzIwMDdBXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJTZWxlY3RvclVTVmFsdWVcIn0sXG4gICAgXCIwMDcyMDA3Q1wiOiB7dnI6IFwiU0xcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiU2VsZWN0b3JTTFZhbHVlXCJ9LFxuICAgIFwiMDA3MjAwN0VcIjoge3ZyOiBcIlNTXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIlNlbGVjdG9yU1NWYWx1ZVwifSxcbiAgICBcIjAwNzIwMDgwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2VsZWN0b3JDb2RlU2VxdWVuY2VWYWx1ZVwifSxcbiAgICBcIjAwNzIwMTAwXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTnVtYmVyT2ZTY3JlZW5zXCJ9LFxuICAgIFwiMDA3MjAxMDJcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJOb21pbmFsU2NyZWVuRGVmaW5pdGlvblNlcXVlbmNlXCJ9LFxuICAgIFwiMDA3MjAxMDRcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJOdW1iZXJPZlZlcnRpY2FsUGl4ZWxzXCJ9LFxuICAgIFwiMDA3MjAxMDZcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJOdW1iZXJPZkhvcml6b250YWxQaXhlbHNcIn0sXG4gICAgXCIwMDcyMDEwOFwiOiB7dnI6IFwiRkRcIiwgdm06IFwiNFwiLCBuYW1lOiBcIkRpc3BsYXlFbnZpcm9ubWVudFNwYXRpYWxQb3NpdGlvblwifSxcbiAgICBcIjAwNzIwMTBBXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2NyZWVuTWluaW11bUdyYXlzY2FsZUJpdERlcHRoXCJ9LFxuICAgIFwiMDA3MjAxMENcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTY3JlZW5NaW5pbXVtQ29sb3JCaXREZXB0aFwifSxcbiAgICBcIjAwNzIwMTBFXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQXBwbGljYXRpb25NYXhpbXVtUmVwYWludFRpbWVcIn0sXG4gICAgXCIwMDcyMDIwMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRpc3BsYXlTZXRzU2VxdWVuY2VcIn0sXG4gICAgXCIwMDcyMDIwMlwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRpc3BsYXlTZXROdW1iZXJcIn0sXG4gICAgXCIwMDcyMDIwM1wiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRpc3BsYXlTZXRMYWJlbFwifSxcbiAgICBcIjAwNzIwMjA0XCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGlzcGxheVNldFByZXNlbnRhdGlvbkdyb3VwXCJ9LFxuICAgIFwiMDA3MjAyMDZcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEaXNwbGF5U2V0UHJlc2VudGF0aW9uR3JvdXBEZXNjcmlwdGlvblwifSxcbiAgICBcIjAwNzIwMjA4XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGFydGlhbERhdGFEaXNwbGF5SGFuZGxpbmdcIn0sXG4gICAgXCIwMDcyMDIxMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlN5bmNocm9uaXplZFNjcm9sbGluZ1NlcXVlbmNlXCJ9LFxuICAgIFwiMDA3MjAyMTJcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjItblwiLCBuYW1lOiBcIkRpc3BsYXlTZXRTY3JvbGxpbmdHcm91cFwifSxcbiAgICBcIjAwNzIwMjE0XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTmF2aWdhdGlvbkluZGljYXRvclNlcXVlbmNlXCJ9LFxuICAgIFwiMDA3MjAyMTZcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJOYXZpZ2F0aW9uRGlzcGxheVNldFwifSxcbiAgICBcIjAwNzIwMjE4XCI6IHt2cjogXCJVU1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJSZWZlcmVuY2VEaXNwbGF5U2V0c1wifSxcbiAgICBcIjAwNzIwMzAwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW1hZ2VCb3hlc1NlcXVlbmNlXCJ9LFxuICAgIFwiMDA3MjAzMDJcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbWFnZUJveE51bWJlclwifSxcbiAgICBcIjAwNzIwMzA0XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW1hZ2VCb3hMYXlvdXRUeXBlXCJ9LFxuICAgIFwiMDA3MjAzMDZcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbWFnZUJveFRpbGVIb3Jpem9udGFsRGltZW5zaW9uXCJ9LFxuICAgIFwiMDA3MjAzMDhcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbWFnZUJveFRpbGVWZXJ0aWNhbERpbWVuc2lvblwifSxcbiAgICBcIjAwNzIwMzEwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW1hZ2VCb3hTY3JvbGxEaXJlY3Rpb25cIn0sXG4gICAgXCIwMDcyMDMxMlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkltYWdlQm94U21hbGxTY3JvbGxUeXBlXCJ9LFxuICAgIFwiMDA3MjAzMTRcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbWFnZUJveFNtYWxsU2Nyb2xsQW1vdW50XCJ9LFxuICAgIFwiMDA3MjAzMTZcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbWFnZUJveExhcmdlU2Nyb2xsVHlwZVwifSxcbiAgICBcIjAwNzIwMzE4XCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW1hZ2VCb3hMYXJnZVNjcm9sbEFtb3VudFwifSxcbiAgICBcIjAwNzIwMzIwXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW1hZ2VCb3hPdmVybGFwUHJpb3JpdHlcIn0sXG4gICAgXCIwMDcyMDMzMFwiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNpbmVSZWxhdGl2ZVRvUmVhbFRpbWVcIn0sXG4gICAgXCIwMDcyMDQwMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkZpbHRlck9wZXJhdGlvbnNTZXF1ZW5jZVwifSxcbiAgICBcIjAwNzIwNDAyXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRmlsdGVyQnlDYXRlZ29yeVwifSxcbiAgICBcIjAwNzIwNDA0XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRmlsdGVyQnlBdHRyaWJ1dGVQcmVzZW5jZVwifSxcbiAgICBcIjAwNzIwNDA2XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRmlsdGVyQnlPcGVyYXRvclwifSxcbiAgICBcIjAwNzIwNDIwXCI6IHt2cjogXCJVU1wiLCB2bTogXCIzXCIsIG5hbWU6IFwiU3RydWN0dXJlZERpc3BsYXlCYWNrZ3JvdW5kQ0lFTGFiVmFsdWVcIn0sXG4gICAgXCIwMDcyMDQyMVwiOiB7dnI6IFwiVVNcIiwgdm06IFwiM1wiLCBuYW1lOiBcIkVtcHR5SW1hZ2VCb3hDSUVMYWJWYWx1ZVwifSxcbiAgICBcIjAwNzIwNDIyXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3RydWN0dXJlZERpc3BsYXlJbWFnZUJveFNlcXVlbmNlXCJ9LFxuICAgIFwiMDA3MjA0MjRcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTdHJ1Y3R1cmVkRGlzcGxheVRleHRCb3hTZXF1ZW5jZVwifSxcbiAgICBcIjAwNzIwNDI3XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJlbmNlZEZpcnN0RnJhbWVTZXF1ZW5jZVwifSxcbiAgICBcIjAwNzIwNDMwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW1hZ2VCb3hTeW5jaHJvbml6YXRpb25TZXF1ZW5jZVwifSxcbiAgICBcIjAwNzIwNDMyXCI6IHt2cjogXCJVU1wiLCB2bTogXCIyLW5cIiwgbmFtZTogXCJTeW5jaHJvbml6ZWRJbWFnZUJveExpc3RcIn0sXG4gICAgXCIwMDcyMDQzNFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlR5cGVPZlN5bmNocm9uaXphdGlvblwifSxcbiAgICBcIjAwNzIwNTAwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQmxlbmRpbmdPcGVyYXRpb25UeXBlXCJ9LFxuICAgIFwiMDA3MjA1MTBcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWZvcm1hdHRpbmdPcGVyYXRpb25UeXBlXCJ9LFxuICAgIFwiMDA3MjA1MTJcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWZvcm1hdHRpbmdUaGlja25lc3NcIn0sXG4gICAgXCIwMDcyMDUxNFwiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZm9ybWF0dGluZ0ludGVydmFsXCJ9LFxuICAgIFwiMDA3MjA1MTZcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWZvcm1hdHRpbmdPcGVyYXRpb25Jbml0aWFsVmlld0RpcmVjdGlvblwifSxcbiAgICBcIjAwNzIwNTIwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJUaHJlZURSZW5kZXJpbmdUeXBlXCJ9LFxuICAgIFwiMDA3MjA2MDBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTb3J0aW5nT3BlcmF0aW9uc1NlcXVlbmNlXCJ9LFxuICAgIFwiMDA3MjA2MDJcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTb3J0QnlDYXRlZ29yeVwifSxcbiAgICBcIjAwNzIwNjA0XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU29ydGluZ0RpcmVjdGlvblwifSxcbiAgICBcIjAwNzIwNzAwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIyXCIsIG5hbWU6IFwiRGlzcGxheVNldFBhdGllbnRPcmllbnRhdGlvblwifSxcbiAgICBcIjAwNzIwNzAyXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiVk9JVHlwZVwifSxcbiAgICBcIjAwNzIwNzA0XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUHNldWRvQ29sb3JUeXBlXCJ9LFxuICAgIFwiMDA3MjA3MDVcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQc2V1ZG9Db2xvclBhbGV0dGVJbnN0YW5jZVJlZmVyZW5jZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDA3MjA3MDZcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTaG93R3JheXNjYWxlSW52ZXJ0ZWRcIn0sXG4gICAgXCIwMDcyMDcxMFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNob3dJbWFnZVRydWVTaXplRmxhZ1wifSxcbiAgICBcIjAwNzIwNzEyXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2hvd0dyYXBoaWNBbm5vdGF0aW9uRmxhZ1wifSxcbiAgICBcIjAwNzIwNzE0XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2hvd1BhdGllbnREZW1vZ3JhcGhpY3NGbGFnXCJ9LFxuICAgIFwiMDA3MjA3MTZcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTaG93QWNxdWlzaXRpb25UZWNobmlxdWVzRmxhZ1wifSxcbiAgICBcIjAwNzIwNzE3XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGlzcGxheVNldEhvcml6b250YWxKdXN0aWZpY2F0aW9uXCJ9LFxuICAgIFwiMDA3MjA3MThcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEaXNwbGF5U2V0VmVydGljYWxKdXN0aWZpY2F0aW9uXCJ9LFxuICAgIFwiMDA3NDAxMjBcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb250aW51YXRpb25TdGFydE1ldGVyc2V0XCJ9LFxuICAgIFwiMDA3NDAxMjFcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb250aW51YXRpb25FbmRNZXRlcnNldFwifSxcbiAgICBcIjAwNzQxMDAwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUHJvY2VkdXJlU3RlcFN0YXRlXCJ9LFxuICAgIFwiMDA3NDEwMDJcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQcm9jZWR1cmVTdGVwUHJvZ3Jlc3NJbmZvcm1hdGlvblNlcXVlbmNlXCJ9LFxuICAgIFwiMDA3NDEwMDRcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQcm9jZWR1cmVTdGVwUHJvZ3Jlc3NcIn0sXG4gICAgXCIwMDc0MTAwNlwiOiB7dnI6IFwiU1RcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlByb2NlZHVyZVN0ZXBQcm9ncmVzc0Rlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMDA3NDEwMDhcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQcm9jZWR1cmVTdGVwQ29tbXVuaWNhdGlvbnNVUklTZXF1ZW5jZVwifSxcbiAgICBcIjAwNzQxMDBhXCI6IHt2cjogXCJTVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29udGFjdFVSSVwifSxcbiAgICBcIjAwNzQxMDBjXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29udGFjdERpc3BsYXlOYW1lXCJ9LFxuICAgIFwiMDA3NDEwMGVcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQcm9jZWR1cmVTdGVwRGlzY29udGludWF0aW9uUmVhc29uQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDA3NDEwMjBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJCZWFtVGFza1NlcXVlbmNlXCJ9LFxuICAgIFwiMDA3NDEwMjJcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJCZWFtVGFza1R5cGVcIn0sXG4gICAgXCIwMDc0MTAyNFwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkJlYW1PcmRlckluZGV4VHJpYWxcIn0sXG4gICAgXCIwMDc0MTAyNlwiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRhYmxlVG9wVmVydGljYWxBZGp1c3RlZFBvc2l0aW9uXCJ9LFxuICAgIFwiMDA3NDEwMjdcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUYWJsZVRvcExvbmdpdHVkaW5hbEFkanVzdGVkUG9zaXRpb25cIn0sXG4gICAgXCIwMDc0MTAyOFwiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRhYmxlVG9wTGF0ZXJhbEFkanVzdGVkUG9zaXRpb25cIn0sXG4gICAgXCIwMDc0MTAyQVwiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBhdGllbnRTdXBwb3J0QWRqdXN0ZWRBbmdsZVwifSxcbiAgICBcIjAwNzQxMDJCXCI6IHt2cjogXCJGRFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVGFibGVUb3BFY2NlbnRyaWNBZGp1c3RlZEFuZ2xlXCJ9LFxuICAgIFwiMDA3NDEwMkNcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUYWJsZVRvcFBpdGNoQWRqdXN0ZWRBbmdsZVwifSxcbiAgICBcIjAwNzQxMDJEXCI6IHt2cjogXCJGRFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVGFibGVUb3BSb2xsQWRqdXN0ZWRBbmdsZVwifSxcbiAgICBcIjAwNzQxMDMwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGVsaXZlcnlWZXJpZmljYXRpb25JbWFnZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDA3NDEwMzJcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJWZXJpZmljYXRpb25JbWFnZVRpbWluZ1wifSxcbiAgICBcIjAwNzQxMDM0XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRG91YmxlRXhwb3N1cmVGbGFnXCJ9LFxuICAgIFwiMDA3NDEwMzZcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEb3VibGVFeHBvc3VyZU9yZGVyaW5nXCJ9LFxuICAgIFwiMDA3NDEwMzhcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEb3VibGVFeHBvc3VyZU1ldGVyc2V0VHJpYWxcIn0sXG4gICAgXCIwMDc0MTAzQVwiOiB7dnI6IFwiRFNcIiwgdm06IFwiNFwiLCBuYW1lOiBcIkRvdWJsZUV4cG9zdXJlRmllbGREZWx0YVRyaWFsXCJ9LFxuICAgIFwiMDA3NDEwNDBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWxhdGVkUmVmZXJlbmNlUlRJbWFnZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDA3NDEwNDJcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJHZW5lcmFsTWFjaGluZVZlcmlmaWNhdGlvblNlcXVlbmNlXCJ9LFxuICAgIFwiMDA3NDEwNDRcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb252ZW50aW9uYWxNYWNoaW5lVmVyaWZpY2F0aW9uU2VxdWVuY2VcIn0sXG4gICAgXCIwMDc0MTA0NlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIklvbk1hY2hpbmVWZXJpZmljYXRpb25TZXF1ZW5jZVwifSxcbiAgICBcIjAwNzQxMDQ4XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRmFpbGVkQXR0cmlidXRlc1NlcXVlbmNlXCJ9LFxuICAgIFwiMDA3NDEwNEFcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJPdmVycmlkZGVuQXR0cmlidXRlc1NlcXVlbmNlXCJ9LFxuICAgIFwiMDA3NDEwNENcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb252ZW50aW9uYWxDb250cm9sUG9pbnRWZXJpZmljYXRpb25TZXF1ZW5jZVwifSxcbiAgICBcIjAwNzQxMDRFXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW9uQ29udHJvbFBvaW50VmVyaWZpY2F0aW9uU2VxdWVuY2VcIn0sXG4gICAgXCIwMDc0MTA1MFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkF0dHJpYnV0ZU9jY3VycmVuY2VTZXF1ZW5jZVwifSxcbiAgICBcIjAwNzQxMDUyXCI6IHt2cjogXCJBVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQXR0cmlidXRlT2NjdXJyZW5jZVBvaW50ZXJcIn0sXG4gICAgXCIwMDc0MTA1NFwiOiB7dnI6IFwiVUxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkF0dHJpYnV0ZUl0ZW1TZWxlY3RvclwifSxcbiAgICBcIjAwNzQxMDU2XCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQXR0cmlidXRlT2NjdXJyZW5jZVByaXZhdGVDcmVhdG9yXCJ9LFxuICAgIFwiMDA3NDEwNTdcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIlNlbGVjdG9yU2VxdWVuY2VQb2ludGVySXRlbXNcIn0sXG4gICAgXCIwMDc0MTIwMFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNjaGVkdWxlZFByb2NlZHVyZVN0ZXBQcmlvcml0eVwifSxcbiAgICBcIjAwNzQxMjAyXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiV29ya2xpc3RMYWJlbFwifSxcbiAgICBcIjAwNzQxMjA0XCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUHJvY2VkdXJlU3RlcExhYmVsXCJ9LFxuICAgIFwiMDA3NDEyMTBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTY2hlZHVsZWRQcm9jZXNzaW5nUGFyYW1ldGVyc1NlcXVlbmNlXCJ9LFxuICAgIFwiMDA3NDEyMTJcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQZXJmb3JtZWRQcm9jZXNzaW5nUGFyYW1ldGVyc1NlcXVlbmNlXCJ9LFxuICAgIFwiMDA3NDEyMTZcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJVbmlmaWVkUHJvY2VkdXJlU3RlcFBlcmZvcm1lZFByb2NlZHVyZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDA3NDEyMjBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWxhdGVkUHJvY2VkdXJlU3RlcFNlcXVlbmNlXCJ9LFxuICAgIFwiMDA3NDEyMjJcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQcm9jZWR1cmVTdGVwUmVsYXRpb25zaGlwVHlwZVwifSxcbiAgICBcIjAwNzQxMjI0XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVwbGFjZWRQcm9jZWR1cmVTdGVwU2VxdWVuY2VcIn0sXG4gICAgXCIwMDc0MTIzMFwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRlbGV0aW9uTG9ja1wifSxcbiAgICBcIjAwNzQxMjM0XCI6IHt2cjogXCJBRVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVjZWl2aW5nQUVcIn0sXG4gICAgXCIwMDc0MTIzNlwiOiB7dnI6IFwiQUVcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlcXVlc3RpbmdBRVwifSxcbiAgICBcIjAwNzQxMjM4XCI6IHt2cjogXCJMVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVhc29uRm9yQ2FuY2VsbGF0aW9uXCJ9LFxuICAgIFwiMDA3NDEyNDJcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTQ1BTdGF0dXNcIn0sXG4gICAgXCIwMDc0MTI0NFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlN1YnNjcmlwdGlvbkxpc3RTdGF0dXNcIn0sXG4gICAgXCIwMDc0MTI0NlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlVuaWZpZWRQcm9jZWR1cmVTdGVwTGlzdFN0YXR1c1wifSxcbiAgICBcIjAwNzQxMzI0XCI6IHt2cjogXCJVTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQmVhbU9yZGVySW5kZXhcIn0sXG4gICAgXCIwMDc0MTMzOFwiOiB7dnI6IFwiRkRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRvdWJsZUV4cG9zdXJlTWV0ZXJzZXRcIn0sXG4gICAgXCIwMDc0MTMzQVwiOiB7dnI6IFwiRkRcIiwgdm06IFwiNFwiLCBuYW1lOiBcIkRvdWJsZUV4cG9zdXJlRmllbGREZWx0YVwifSxcbiAgICBcIjAwNzYwMDAxXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW1wbGFudEFzc2VtYmx5VGVtcGxhdGVOYW1lXCJ9LFxuICAgIFwiMDA3NjAwMDNcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbXBsYW50QXNzZW1ibHlUZW1wbGF0ZUlzc3VlclwifSxcbiAgICBcIjAwNzYwMDA2XCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW1wbGFudEFzc2VtYmx5VGVtcGxhdGVWZXJzaW9uXCJ9LFxuICAgIFwiMDA3NjAwMDhcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZXBsYWNlZEltcGxhbnRBc3NlbWJseVRlbXBsYXRlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDc2MDAwQVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkltcGxhbnRBc3NlbWJseVRlbXBsYXRlVHlwZVwifSxcbiAgICBcIjAwNzYwMDBDXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiT3JpZ2luYWxJbXBsYW50QXNzZW1ibHlUZW1wbGF0ZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDA3NjAwMEVcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEZXJpdmF0aW9uSW1wbGFudEFzc2VtYmx5VGVtcGxhdGVTZXF1ZW5jZVwifSxcbiAgICBcIjAwNzYwMDEwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW1wbGFudEFzc2VtYmx5VGVtcGxhdGVUYXJnZXRBbmF0b215U2VxdWVuY2VcIn0sXG4gICAgXCIwMDc2MDAyMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlByb2NlZHVyZVR5cGVDb2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDc2MDAzMFwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlN1cmdpY2FsVGVjaG5pcXVlXCJ9LFxuICAgIFwiMDA3NjAwMzJcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb21wb25lbnRUeXBlc1NlcXVlbmNlXCJ9LFxuICAgIFwiMDA3NjAwMzRcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb21wb25lbnRUeXBlQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiMDA3NjAwMzZcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJFeGNsdXNpdmVDb21wb25lbnRUeXBlXCJ9LFxuICAgIFwiMDA3NjAwMzhcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNYW5kYXRvcnlDb21wb25lbnRUeXBlXCJ9LFxuICAgIFwiMDA3NjAwNDBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb21wb25lbnRTZXF1ZW5jZVwifSxcbiAgICBcIjAwNzYwMDU1XCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29tcG9uZW50SURcIn0sXG4gICAgXCIwMDc2MDA2MFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvbXBvbmVudEFzc2VtYmx5U2VxdWVuY2VcIn0sXG4gICAgXCIwMDc2MDA3MFwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvbXBvbmVudDFSZWZlcmVuY2VkSURcIn0sXG4gICAgXCIwMDc2MDA4MFwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvbXBvbmVudDFSZWZlcmVuY2VkTWF0aW5nRmVhdHVyZVNldElEXCJ9LFxuICAgIFwiMDA3NjAwOTBcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb21wb25lbnQxUmVmZXJlbmNlZE1hdGluZ0ZlYXR1cmVJRFwifSxcbiAgICBcIjAwNzYwMEEwXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29tcG9uZW50MlJlZmVyZW5jZWRJRFwifSxcbiAgICBcIjAwNzYwMEIwXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29tcG9uZW50MlJlZmVyZW5jZWRNYXRpbmdGZWF0dXJlU2V0SURcIn0sXG4gICAgXCIwMDc2MDBDMFwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvbXBvbmVudDJSZWZlcmVuY2VkTWF0aW5nRmVhdHVyZUlEXCJ9LFxuICAgIFwiMDA3ODAwMDFcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbXBsYW50VGVtcGxhdGVHcm91cE5hbWVcIn0sXG4gICAgXCIwMDc4MDAxMFwiOiB7dnI6IFwiU1RcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkltcGxhbnRUZW1wbGF0ZUdyb3VwRGVzY3JpcHRpb25cIn0sXG4gICAgXCIwMDc4MDAyMFwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkltcGxhbnRUZW1wbGF0ZUdyb3VwSXNzdWVyXCJ9LFxuICAgIFwiMDA3ODAwMjRcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbXBsYW50VGVtcGxhdGVHcm91cFZlcnNpb25cIn0sXG4gICAgXCIwMDc4MDAyNlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlcGxhY2VkSW1wbGFudFRlbXBsYXRlR3JvdXBTZXF1ZW5jZVwifSxcbiAgICBcIjAwNzgwMDI4XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW1wbGFudFRlbXBsYXRlR3JvdXBUYXJnZXRBbmF0b215U2VxdWVuY2VcIn0sXG4gICAgXCIwMDc4MDAyQVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkltcGxhbnRUZW1wbGF0ZUdyb3VwTWVtYmVyc1NlcXVlbmNlXCJ9LFxuICAgIFwiMDA3ODAwMkVcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbXBsYW50VGVtcGxhdGVHcm91cE1lbWJlcklEXCJ9LFxuICAgIFwiMDA3ODAwNTBcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjNcIiwgbmFtZTogXCJUaHJlZURJbXBsYW50VGVtcGxhdGVHcm91cE1lbWJlck1hdGNoaW5nUG9pbnRcIn0sXG4gICAgXCIwMDc4MDA2MFwiOiB7dnI6IFwiRkRcIiwgdm06IFwiOVwiLCBuYW1lOiBcIlRocmVlREltcGxhbnRUZW1wbGF0ZUdyb3VwTWVtYmVyTWF0Y2hpbmdBeGVzXCJ9LFxuICAgIFwiMDA3ODAwNzBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbXBsYW50VGVtcGxhdGVHcm91cE1lbWJlck1hdGNoaW5nMkRDb29yZGluYXRlc1NlcXVlbmNlXCJ9LFxuICAgIFwiMDA3ODAwOTBcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjJcIiwgbmFtZTogXCJUd29ESW1wbGFudFRlbXBsYXRlR3JvdXBNZW1iZXJNYXRjaGluZ1BvaW50XCJ9LFxuICAgIFwiMDA3ODAwQTBcIjoge3ZyOiBcIkZEXCIsIHZtOiBcIjRcIiwgbmFtZTogXCJUd29ESW1wbGFudFRlbXBsYXRlR3JvdXBNZW1iZXJNYXRjaGluZ0F4ZXNcIn0sXG4gICAgXCIwMDc4MDBCMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkltcGxhbnRUZW1wbGF0ZUdyb3VwVmFyaWF0aW9uRGltZW5zaW9uU2VxdWVuY2VcIn0sXG4gICAgXCIwMDc4MDBCMlwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkltcGxhbnRUZW1wbGF0ZUdyb3VwVmFyaWF0aW9uRGltZW5zaW9uTmFtZVwifSxcbiAgICBcIjAwNzgwMEI0XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW1wbGFudFRlbXBsYXRlR3JvdXBWYXJpYXRpb25EaW1lbnNpb25SYW5rU2VxdWVuY2VcIn0sXG4gICAgXCIwMDc4MDBCNlwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZmVyZW5jZWRJbXBsYW50VGVtcGxhdGVHcm91cE1lbWJlcklEXCJ9LFxuICAgIFwiMDA3ODAwQjhcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbXBsYW50VGVtcGxhdGVHcm91cFZhcmlhdGlvbkRpbWVuc2lvblJhbmtcIn0sXG4gICAgXCIwMDg4MDEzMFwiOiB7dnI6IFwiU0hcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlN0b3JhZ2VNZWRpYUZpbGVTZXRJRFwifSxcbiAgICBcIjAwODgwMTQwXCI6IHt2cjogXCJVSVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3RvcmFnZU1lZGlhRmlsZVNldFVJRFwifSxcbiAgICBcIjAwODgwMjAwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiSWNvbkltYWdlU2VxdWVuY2VcIn0sXG4gICAgXCIwMDg4MDkwNFwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRvcGljVGl0bGVcIn0sXG4gICAgXCIwMDg4MDkwNlwiOiB7dnI6IFwiU1RcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRvcGljU3ViamVjdFwifSxcbiAgICBcIjAwODgwOTEwXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiVG9waWNBdXRob3JcIn0sXG4gICAgXCIwMDg4MDkxMlwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMS0zMlwiLCBuYW1lOiBcIlRvcGljS2V5d29yZHNcIn0sXG4gICAgXCIwMTAwMDQxMFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNPUEluc3RhbmNlU3RhdHVzXCJ9LFxuICAgIFwiMDEwMDA0MjBcIjoge3ZyOiBcIkRUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTT1BBdXRob3JpemF0aW9uRGF0ZVRpbWVcIn0sXG4gICAgXCIwMTAwMDQyNFwiOiB7dnI6IFwiTFRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNPUEF1dGhvcml6YXRpb25Db21tZW50XCJ9LFxuICAgIFwiMDEwMDA0MjZcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBdXRob3JpemF0aW9uRXF1aXBtZW50Q2VydGlmaWNhdGlvbk51bWJlclwifSxcbiAgICBcIjA0MDAwMDA1XCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTUFDSUROdW1iZXJcIn0sXG4gICAgXCIwNDAwMDAxMFwiOiB7dnI6IFwiVUlcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk1BQ0NhbGN1bGF0aW9uVHJhbnNmZXJTeW50YXhVSURcIn0sXG4gICAgXCIwNDAwMDAxNVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk1BQ0FsZ29yaXRobVwifSxcbiAgICBcIjA0MDAwMDIwXCI6IHt2cjogXCJBVFwiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJEYXRhRWxlbWVudHNTaWduZWRcIn0sXG4gICAgXCIwNDAwMDEwMFwiOiB7dnI6IFwiVUlcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRpZ2l0YWxTaWduYXR1cmVVSURcIn0sXG4gICAgXCIwNDAwMDEwNVwiOiB7dnI6IFwiRFRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRpZ2l0YWxTaWduYXR1cmVEYXRlVGltZVwifSxcbiAgICBcIjA0MDAwMTEwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ2VydGlmaWNhdGVUeXBlXCJ9LFxuICAgIFwiMDQwMDAxMTVcIjoge3ZyOiBcIk9CXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDZXJ0aWZpY2F0ZU9mU2lnbmVyXCJ9LFxuICAgIFwiMDQwMDAxMjBcIjoge3ZyOiBcIk9CXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTaWduYXR1cmVcIn0sXG4gICAgXCIwNDAwMDMwNVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNlcnRpZmllZFRpbWVzdGFtcFR5cGVcIn0sXG4gICAgXCIwNDAwMDMxMFwiOiB7dnI6IFwiT0JcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNlcnRpZmllZFRpbWVzdGFtcFwifSxcbiAgICBcIjA0MDAwNDAxXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGlnaXRhbFNpZ25hdHVyZVB1cnBvc2VDb2RlU2VxdWVuY2VcIn0sXG4gICAgXCIwNDAwMDQwMlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZmVyZW5jZWREaWdpdGFsU2lnbmF0dXJlU2VxdWVuY2VcIn0sXG4gICAgXCIwNDAwMDQwM1wiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZmVyZW5jZWRTT1BJbnN0YW5jZU1BQ1NlcXVlbmNlXCJ9LFxuICAgIFwiMDQwMDA0MDRcIjoge3ZyOiBcIk9CXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNQUNcIn0sXG4gICAgXCIwNDAwMDUwMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkVuY3J5cHRlZEF0dHJpYnV0ZXNTZXF1ZW5jZVwifSxcbiAgICBcIjA0MDAwNTEwXCI6IHt2cjogXCJVSVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRW5jcnlwdGVkQ29udGVudFRyYW5zZmVyU3ludGF4VUlEXCJ9LFxuICAgIFwiMDQwMDA1MjBcIjoge3ZyOiBcIk9CXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJFbmNyeXB0ZWRDb250ZW50XCJ9LFxuICAgIFwiMDQwMDA1NTBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNb2RpZmllZEF0dHJpYnV0ZXNTZXF1ZW5jZVwifSxcbiAgICBcIjA0MDAwNTYxXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiT3JpZ2luYWxBdHRyaWJ1dGVzU2VxdWVuY2VcIn0sXG4gICAgXCIwNDAwMDU2MlwiOiB7dnI6IFwiRFRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkF0dHJpYnV0ZU1vZGlmaWNhdGlvbkRhdGVUaW1lXCJ9LFxuICAgIFwiMDQwMDA1NjNcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNb2RpZnlpbmdTeXN0ZW1cIn0sXG4gICAgXCIwNDAwMDU2NFwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNvdXJjZU9mUHJldmlvdXNWYWx1ZXNcIn0sXG4gICAgXCIwNDAwMDU2NVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlYXNvbkZvclRoZUF0dHJpYnV0ZU1vZGlmaWNhdGlvblwifSxcbiAgICBcIjEwMDB4eHgwXCI6IHt2cjogXCJVU1wiLCB2bTogXCIzXCIsIG5hbWU6IFwiRXNjYXBlVHJpcGxldFwifSxcbiAgICBcIjEwMDB4eHgxXCI6IHt2cjogXCJVU1wiLCB2bTogXCIzXCIsIG5hbWU6IFwiUnVuTGVuZ3RoVHJpcGxldFwifSxcbiAgICBcIjEwMDB4eHgyXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiSHVmZm1hblRhYmxlU2l6ZVwifSxcbiAgICBcIjEwMDB4eHgzXCI6IHt2cjogXCJVU1wiLCB2bTogXCIzXCIsIG5hbWU6IFwiSHVmZm1hblRhYmxlVHJpcGxldFwifSxcbiAgICBcIjEwMDB4eHg0XCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2hpZnRUYWJsZVNpemVcIn0sXG4gICAgXCIxMDAweHh4NVwiOiB7dnI6IFwiVVNcIiwgdm06IFwiM1wiLCBuYW1lOiBcIlNoaWZ0VGFibGVUcmlwbGV0XCJ9LFxuICAgIFwiMTAxMHh4eHhcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIlpvbmFsTWFwXCJ9LFxuICAgIFwiMjAwMDAwMTBcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJOdW1iZXJPZkNvcGllc1wifSxcbiAgICBcIjIwMDAwMDFFXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUHJpbnRlckNvbmZpZ3VyYXRpb25TZXF1ZW5jZVwifSxcbiAgICBcIjIwMDAwMDIwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUHJpbnRQcmlvcml0eVwifSxcbiAgICBcIjIwMDAwMDMwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTWVkaXVtVHlwZVwifSxcbiAgICBcIjIwMDAwMDQwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRmlsbURlc3RpbmF0aW9uXCJ9LFxuICAgIFwiMjAwMDAwNTBcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJGaWxtU2Vzc2lvbkxhYmVsXCJ9LFxuICAgIFwiMjAwMDAwNjBcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNZW1vcnlBbGxvY2F0aW9uXCJ9LFxuICAgIFwiMjAwMDAwNjFcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNYXhpbXVtTWVtb3J5QWxsb2NhdGlvblwifSxcbiAgICBcIjIwMDAwMDYyXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29sb3JJbWFnZVByaW50aW5nRmxhZ1wifSxcbiAgICBcIjIwMDAwMDYzXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29sbGF0aW9uRmxhZ1wifSxcbiAgICBcIjIwMDAwMDY1XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQW5ub3RhdGlvbkZsYWdcIn0sXG4gICAgXCIyMDAwMDA2N1wiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkltYWdlT3ZlcmxheUZsYWdcIn0sXG4gICAgXCIyMDAwMDA2OVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlByZXNlbnRhdGlvbkxVVEZsYWdcIn0sXG4gICAgXCIyMDAwMDA2QVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkltYWdlQm94UHJlc2VudGF0aW9uTFVURmxhZ1wifSxcbiAgICBcIjIwMDAwMEEwXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTWVtb3J5Qml0RGVwdGhcIn0sXG4gICAgXCIyMDAwMDBBMVwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlByaW50aW5nQml0RGVwdGhcIn0sXG4gICAgXCIyMDAwMDBBMlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk1lZGlhSW5zdGFsbGVkU2VxdWVuY2VcIn0sXG4gICAgXCIyMDAwMDBBNFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk90aGVyTWVkaWFBdmFpbGFibGVTZXF1ZW5jZVwifSxcbiAgICBcIjIwMDAwMEE4XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3VwcG9ydGVkSW1hZ2VEaXNwbGF5Rm9ybWF0c1NlcXVlbmNlXCJ9LFxuICAgIFwiMjAwMDA1MDBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWZlcmVuY2VkRmlsbUJveFNlcXVlbmNlXCJ9LFxuICAgIFwiMjAwMDA1MTBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWZlcmVuY2VkU3RvcmVkUHJpbnRTZXF1ZW5jZVwifSxcbiAgICBcIjIwMTAwMDEwXCI6IHt2cjogXCJTVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW1hZ2VEaXNwbGF5Rm9ybWF0XCJ9LFxuICAgIFwiMjAxMDAwMzBcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBbm5vdGF0aW9uRGlzcGxheUZvcm1hdElEXCJ9LFxuICAgIFwiMjAxMDAwNDBcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJGaWxtT3JpZW50YXRpb25cIn0sXG4gICAgXCIyMDEwMDA1MFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkZpbG1TaXplSURcIn0sXG4gICAgXCIyMDEwMDA1MlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlByaW50ZXJSZXNvbHV0aW9uSURcIn0sXG4gICAgXCIyMDEwMDA1NFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRlZmF1bHRQcmludGVyUmVzb2x1dGlvbklEXCJ9LFxuICAgIFwiMjAxMDAwNjBcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNYWduaWZpY2F0aW9uVHlwZVwifSxcbiAgICBcIjIwMTAwMDgwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU21vb3RoaW5nVHlwZVwifSxcbiAgICBcIjIwMTAwMEE2XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGVmYXVsdE1hZ25pZmljYXRpb25UeXBlXCJ9LFxuICAgIFwiMjAxMDAwQTdcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIk90aGVyTWFnbmlmaWNhdGlvblR5cGVzQXZhaWxhYmxlXCJ9LFxuICAgIFwiMjAxMDAwQThcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEZWZhdWx0U21vb3RoaW5nVHlwZVwifSxcbiAgICBcIjIwMTAwMEE5XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJPdGhlclNtb290aGluZ1R5cGVzQXZhaWxhYmxlXCJ9LFxuICAgIFwiMjAxMDAxMDBcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJCb3JkZXJEZW5zaXR5XCJ9LFxuICAgIFwiMjAxMDAxMTBcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJFbXB0eUltYWdlRGVuc2l0eVwifSxcbiAgICBcIjIwMTAwMTIwXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTWluRGVuc2l0eVwifSxcbiAgICBcIjIwMTAwMTMwXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTWF4RGVuc2l0eVwifSxcbiAgICBcIjIwMTAwMTQwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiVHJpbVwifSxcbiAgICBcIjIwMTAwMTUwXCI6IHt2cjogXCJTVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29uZmlndXJhdGlvbkluZm9ybWF0aW9uXCJ9LFxuICAgIFwiMjAxMDAxNTJcIjoge3ZyOiBcIkxUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb25maWd1cmF0aW9uSW5mb3JtYXRpb25EZXNjcmlwdGlvblwifSxcbiAgICBcIjIwMTAwMTU0XCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTWF4aW11bUNvbGxhdGVkRmlsbXNcIn0sXG4gICAgXCIyMDEwMDE1RVwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIklsbHVtaW5hdGlvblwifSxcbiAgICBcIjIwMTAwMTYwXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmbGVjdGVkQW1iaWVudExpZ2h0XCJ9LFxuICAgIFwiMjAxMDAzNzZcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjJcIiwgbmFtZTogXCJQcmludGVyUGl4ZWxTcGFjaW5nXCJ9LFxuICAgIFwiMjAxMDA1MDBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWZlcmVuY2VkRmlsbVNlc3Npb25TZXF1ZW5jZVwifSxcbiAgICBcIjIwMTAwNTEwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJlbmNlZEltYWdlQm94U2VxdWVuY2VcIn0sXG4gICAgXCIyMDEwMDUyMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZmVyZW5jZWRCYXNpY0Fubm90YXRpb25Cb3hTZXF1ZW5jZVwifSxcbiAgICBcIjIwMjAwMDEwXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW1hZ2VCb3hQb3NpdGlvblwifSxcbiAgICBcIjIwMjAwMDIwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUG9sYXJpdHlcIn0sXG4gICAgXCIyMDIwMDAzMFwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlcXVlc3RlZEltYWdlU2l6ZVwifSxcbiAgICBcIjIwMjAwMDQwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVxdWVzdGVkRGVjaW1hdGVDcm9wQmVoYXZpb3JcIn0sXG4gICAgXCIyMDIwMDA1MFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlcXVlc3RlZFJlc29sdXRpb25JRFwifSxcbiAgICBcIjIwMjAwMEEwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVxdWVzdGVkSW1hZ2VTaXplRmxhZ1wifSxcbiAgICBcIjIwMjAwMEEyXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGVjaW1hdGVDcm9wUmVzdWx0XCJ9LFxuICAgIFwiMjAyMDAxMTBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJCYXNpY0dyYXlzY2FsZUltYWdlU2VxdWVuY2VcIn0sXG4gICAgXCIyMDIwMDExMVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkJhc2ljQ29sb3JJbWFnZVNlcXVlbmNlXCJ9LFxuICAgIFwiMjAyMDAxMzBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWZlcmVuY2VkSW1hZ2VPdmVybGF5Qm94U2VxdWVuY2VcIn0sXG4gICAgXCIyMDIwMDE0MFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZmVyZW5jZWRWT0lMVVRCb3hTZXF1ZW5jZVwifSxcbiAgICBcIjIwMzAwMDEwXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQW5ub3RhdGlvblBvc2l0aW9uXCJ9LFxuICAgIFwiMjAzMDAwMjBcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUZXh0U3RyaW5nXCJ9LFxuICAgIFwiMjA0MDAwMTBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWZlcmVuY2VkT3ZlcmxheVBsYW5lU2VxdWVuY2VcIn0sXG4gICAgXCIyMDQwMDAxMVwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMS05OVwiLCBuYW1lOiBcIlJlZmVyZW5jZWRPdmVybGF5UGxhbmVHcm91cHNcIn0sXG4gICAgXCIyMDQwMDAyMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk92ZXJsYXlQaXhlbERhdGFTZXF1ZW5jZVwifSxcbiAgICBcIjIwNDAwMDYwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiT3ZlcmxheU1hZ25pZmljYXRpb25UeXBlXCJ9LFxuICAgIFwiMjA0MDAwNzBcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJPdmVybGF5U21vb3RoaW5nVHlwZVwifSxcbiAgICBcIjIwNDAwMDcyXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiT3ZlcmxheU9ySW1hZ2VNYWduaWZpY2F0aW9uXCJ9LFxuICAgIFwiMjA0MDAwNzRcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNYWduaWZ5VG9OdW1iZXJPZkNvbHVtbnNcIn0sXG4gICAgXCIyMDQwMDA4MFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk92ZXJsYXlGb3JlZ3JvdW5kRGVuc2l0eVwifSxcbiAgICBcIjIwNDAwMDgyXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiT3ZlcmxheUJhY2tncm91bmREZW5zaXR5XCJ9LFxuICAgIFwiMjA0MDAwOTBcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJPdmVybGF5TW9kZVwifSxcbiAgICBcIjIwNDAwMTAwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiVGhyZXNob2xkRGVuc2l0eVwifSxcbiAgICBcIjIwNDAwNTAwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJlbmNlZEltYWdlQm94U2VxdWVuY2VSZXRpcmVkXCJ9LFxuICAgIFwiMjA1MDAwMTBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQcmVzZW50YXRpb25MVVRTZXF1ZW5jZVwifSxcbiAgICBcIjIwNTAwMDIwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUHJlc2VudGF0aW9uTFVUU2hhcGVcIn0sXG4gICAgXCIyMDUwMDUwMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZmVyZW5jZWRQcmVzZW50YXRpb25MVVRTZXF1ZW5jZVwifSxcbiAgICBcIjIxMDAwMDEwXCI6IHt2cjogXCJTSFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUHJpbnRKb2JJRFwifSxcbiAgICBcIjIxMDAwMDIwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRXhlY3V0aW9uU3RhdHVzXCJ9LFxuICAgIFwiMjEwMDAwMzBcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJFeGVjdXRpb25TdGF0dXNJbmZvXCJ9LFxuICAgIFwiMjEwMDAwNDBcIjoge3ZyOiBcIkRBXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDcmVhdGlvbkRhdGVcIn0sXG4gICAgXCIyMTAwMDA1MFwiOiB7dnI6IFwiVE1cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNyZWF0aW9uVGltZVwifSxcbiAgICBcIjIxMDAwMDcwXCI6IHt2cjogXCJBRVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiT3JpZ2luYXRvclwifSxcbiAgICBcIjIxMDAwMTQwXCI6IHt2cjogXCJBRVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGVzdGluYXRpb25BRVwifSxcbiAgICBcIjIxMDAwMTYwXCI6IHt2cjogXCJTSFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiT3duZXJJRFwifSxcbiAgICBcIjIxMDAwMTcwXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTnVtYmVyT2ZGaWxtc1wifSxcbiAgICBcIjIxMDAwNTAwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJlbmNlZFByaW50Sm9iU2VxdWVuY2VQdWxsU3RvcmVkUHJpbnRcIn0sXG4gICAgXCIyMTEwMDAxMFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlByaW50ZXJTdGF0dXNcIn0sXG4gICAgXCIyMTEwMDAyMFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlByaW50ZXJTdGF0dXNJbmZvXCJ9LFxuICAgIFwiMjExMDAwMzBcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQcmludGVyTmFtZVwifSxcbiAgICBcIjIxMTAwMDk5XCI6IHt2cjogXCJTSFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUHJpbnRRdWV1ZUlEXCJ9LFxuICAgIFwiMjEyMDAwMTBcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJRdWV1ZVN0YXR1c1wifSxcbiAgICBcIjIxMjAwMDUwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUHJpbnRKb2JEZXNjcmlwdGlvblNlcXVlbmNlXCJ9LFxuICAgIFwiMjEyMDAwNzBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWZlcmVuY2VkUHJpbnRKb2JTZXF1ZW5jZVwifSxcbiAgICBcIjIxMzAwMDEwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUHJpbnRNYW5hZ2VtZW50Q2FwYWJpbGl0aWVzU2VxdWVuY2VcIn0sXG4gICAgXCIyMTMwMDAxNVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlByaW50ZXJDaGFyYWN0ZXJpc3RpY3NTZXF1ZW5jZVwifSxcbiAgICBcIjIxMzAwMDMwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRmlsbUJveENvbnRlbnRTZXF1ZW5jZVwifSxcbiAgICBcIjIxMzAwMDQwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW1hZ2VCb3hDb250ZW50U2VxdWVuY2VcIn0sXG4gICAgXCIyMTMwMDA1MFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFubm90YXRpb25Db250ZW50U2VxdWVuY2VcIn0sXG4gICAgXCIyMTMwMDA2MFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkltYWdlT3ZlcmxheUJveENvbnRlbnRTZXF1ZW5jZVwifSxcbiAgICBcIjIxMzAwMDgwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUHJlc2VudGF0aW9uTFVUQ29udGVudFNlcXVlbmNlXCJ9LFxuICAgIFwiMjEzMDAwQTBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQcm9wb3NlZFN0dWR5U2VxdWVuY2VcIn0sXG4gICAgXCIyMTMwMDBDMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk9yaWdpbmFsSW1hZ2VTZXF1ZW5jZVwifSxcbiAgICBcIjIyMDAwMDAxXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTGFiZWxVc2luZ0luZm9ybWF0aW9uRXh0cmFjdGVkRnJvbUluc3RhbmNlc1wifSxcbiAgICBcIjIyMDAwMDAyXCI6IHt2cjogXCJVVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTGFiZWxUZXh0XCJ9LFxuICAgIFwiMjIwMDAwMDNcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJMYWJlbFN0eWxlU2VsZWN0aW9uXCJ9LFxuICAgIFwiMjIwMDAwMDRcIjoge3ZyOiBcIkxUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNZWRpYURpc3Bvc2l0aW9uXCJ9LFxuICAgIFwiMjIwMDAwMDVcIjoge3ZyOiBcIkxUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJCYXJjb2RlVmFsdWVcIn0sXG4gICAgXCIyMjAwMDAwNlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkJhcmNvZGVTeW1ib2xvZ3lcIn0sXG4gICAgXCIyMjAwMDAwN1wiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFsbG93TWVkaWFTcGxpdHRpbmdcIn0sXG4gICAgXCIyMjAwMDAwOFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkluY2x1ZGVOb25ESUNPTU9iamVjdHNcIn0sXG4gICAgXCIyMjAwMDAwOVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkluY2x1ZGVEaXNwbGF5QXBwbGljYXRpb25cIn0sXG4gICAgXCIyMjAwMDAwQVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlByZXNlcnZlQ29tcG9zaXRlSW5zdGFuY2VzQWZ0ZXJNZWRpYUNyZWF0aW9uXCJ9LFxuICAgIFwiMjIwMDAwMEJcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUb3RhbE51bWJlck9mUGllY2VzT2ZNZWRpYUNyZWF0ZWRcIn0sXG4gICAgXCIyMjAwMDAwQ1wiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlcXVlc3RlZE1lZGlhQXBwbGljYXRpb25Qcm9maWxlXCJ9LFxuICAgIFwiMjIwMDAwMERcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWZlcmVuY2VkU3RvcmFnZU1lZGlhU2VxdWVuY2VcIn0sXG4gICAgXCIyMjAwMDAwRVwiOiB7dnI6IFwiQVRcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiRmFpbHVyZUF0dHJpYnV0ZXNcIn0sXG4gICAgXCIyMjAwMDAwRlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFsbG93TG9zc3lDb21wcmVzc2lvblwifSxcbiAgICBcIjIyMDAwMDIwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVxdWVzdFByaW9yaXR5XCJ9LFxuICAgIFwiMzAwMjAwMDJcIjoge3ZyOiBcIlNIXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSVEltYWdlTGFiZWxcIn0sXG4gICAgXCIzMDAyMDAwM1wiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJUSW1hZ2VOYW1lXCJ9LFxuICAgIFwiMzAwMjAwMDRcIjoge3ZyOiBcIlNUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSVEltYWdlRGVzY3JpcHRpb25cIn0sXG4gICAgXCIzMDAyMDAwQVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlcG9ydGVkVmFsdWVzT3JpZ2luXCJ9LFxuICAgIFwiMzAwMjAwMENcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSVEltYWdlUGxhbmVcIn0sXG4gICAgXCIzMDAyMDAwRFwiOiB7dnI6IFwiRFNcIiwgdm06IFwiM1wiLCBuYW1lOiBcIlhSYXlJbWFnZVJlY2VwdG9yVHJhbnNsYXRpb25cIn0sXG4gICAgXCIzMDAyMDAwRVwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlhSYXlJbWFnZVJlY2VwdG9yQW5nbGVcIn0sXG4gICAgXCIzMDAyMDAxMFwiOiB7dnI6IFwiRFNcIiwgdm06IFwiNlwiLCBuYW1lOiBcIlJUSW1hZ2VPcmllbnRhdGlvblwifSxcbiAgICBcIjMwMDIwMDExXCI6IHt2cjogXCJEU1wiLCB2bTogXCIyXCIsIG5hbWU6IFwiSW1hZ2VQbGFuZVBpeGVsU3BhY2luZ1wifSxcbiAgICBcIjMwMDIwMDEyXCI6IHt2cjogXCJEU1wiLCB2bTogXCIyXCIsIG5hbWU6IFwiUlRJbWFnZVBvc2l0aW9uXCJ9LFxuICAgIFwiMzAwMjAwMjBcIjoge3ZyOiBcIlNIXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSYWRpYXRpb25NYWNoaW5lTmFtZVwifSxcbiAgICBcIjMwMDIwMDIyXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmFkaWF0aW9uTWFjaGluZVNBRFwifSxcbiAgICBcIjMwMDIwMDI0XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmFkaWF0aW9uTWFjaGluZVNTRFwifSxcbiAgICBcIjMwMDIwMDI2XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUlRJbWFnZVNJRFwifSxcbiAgICBcIjMwMDIwMDI4XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU291cmNlVG9SZWZlcmVuY2VPYmplY3REaXN0YW5jZVwifSxcbiAgICBcIjMwMDIwMDI5XCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRnJhY3Rpb25OdW1iZXJcIn0sXG4gICAgXCIzMDAyMDAzMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkV4cG9zdXJlU2VxdWVuY2VcIn0sXG4gICAgXCIzMDAyMDAzMlwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk1ldGVyc2V0RXhwb3N1cmVcIn0sXG4gICAgXCIzMDAyMDAzNFwiOiB7dnI6IFwiRFNcIiwgdm06IFwiNFwiLCBuYW1lOiBcIkRpYXBocmFnbVBvc2l0aW9uXCJ9LFxuICAgIFwiMzAwMjAwNDBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJGbHVlbmNlTWFwU2VxdWVuY2VcIn0sXG4gICAgXCIzMDAyMDA0MVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkZsdWVuY2VEYXRhU291cmNlXCJ9LFxuICAgIFwiMzAwMjAwNDJcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJGbHVlbmNlRGF0YVNjYWxlXCJ9LFxuICAgIFwiMzAwMjAwNTBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQcmltYXJ5Rmx1ZW5jZU1vZGVTZXF1ZW5jZVwifSxcbiAgICBcIjMwMDIwMDUxXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRmx1ZW5jZU1vZGVcIn0sXG4gICAgXCIzMDAyMDA1MlwiOiB7dnI6IFwiU0hcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkZsdWVuY2VNb2RlSURcIn0sXG4gICAgXCIzMDA0MDAwMVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRWSFR5cGVcIn0sXG4gICAgXCIzMDA0MDAwMlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRvc2VVbml0c1wifSxcbiAgICBcIjMwMDQwMDA0XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRG9zZVR5cGVcIn0sXG4gICAgXCIzMDA0MDAwNlwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRvc2VDb21tZW50XCJ9LFxuICAgIFwiMzAwNDAwMDhcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjNcIiwgbmFtZTogXCJOb3JtYWxpemF0aW9uUG9pbnRcIn0sXG4gICAgXCIzMDA0MDAwQVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRvc2VTdW1tYXRpb25UeXBlXCJ9LFxuICAgIFwiMzAwNDAwMENcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjItblwiLCBuYW1lOiBcIkdyaWRGcmFtZU9mZnNldFZlY3RvclwifSxcbiAgICBcIjMwMDQwMDBFXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRG9zZUdyaWRTY2FsaW5nXCJ9LFxuICAgIFwiMzAwNDAwMTBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSVERvc2VST0lTZXF1ZW5jZVwifSxcbiAgICBcIjMwMDQwMDEyXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRG9zZVZhbHVlXCJ9LFxuICAgIFwiMzAwNDAwMTRcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjEtM1wiLCBuYW1lOiBcIlRpc3N1ZUhldGVyb2dlbmVpdHlDb3JyZWN0aW9uXCJ9LFxuICAgIFwiMzAwNDAwNDBcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjNcIiwgbmFtZTogXCJEVkhOb3JtYWxpemF0aW9uUG9pbnRcIn0sXG4gICAgXCIzMDA0MDA0MlwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRWSE5vcm1hbGl6YXRpb25Eb3NlVmFsdWVcIn0sXG4gICAgXCIzMDA0MDA1MFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRWSFNlcXVlbmNlXCJ9LFxuICAgIFwiMzAwNDAwNTJcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEVkhEb3NlU2NhbGluZ1wifSxcbiAgICBcIjMwMDQwMDU0XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRFZIVm9sdW1lVW5pdHNcIn0sXG4gICAgXCIzMDA0MDA1NlwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRWSE51bWJlck9mQmluc1wifSxcbiAgICBcIjMwMDQwMDU4XCI6IHt2cjogXCJEU1wiLCB2bTogXCIyLTJuXCIsIG5hbWU6IFwiRFZIRGF0YVwifSxcbiAgICBcIjMwMDQwMDYwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRFZIUmVmZXJlbmNlZFJPSVNlcXVlbmNlXCJ9LFxuICAgIFwiMzAwNDAwNjJcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEVkhST0lDb250cmlidXRpb25UeXBlXCJ9LFxuICAgIFwiMzAwNDAwNzBcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEVkhNaW5pbXVtRG9zZVwifSxcbiAgICBcIjMwMDQwMDcyXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRFZITWF4aW11bURvc2VcIn0sXG4gICAgXCIzMDA0MDA3NFwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRWSE1lYW5Eb3NlXCJ9LFxuICAgIFwiMzAwNjAwMDJcIjoge3ZyOiBcIlNIXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTdHJ1Y3R1cmVTZXRMYWJlbFwifSxcbiAgICBcIjMwMDYwMDA0XCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3RydWN0dXJlU2V0TmFtZVwifSxcbiAgICBcIjMwMDYwMDA2XCI6IHt2cjogXCJTVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3RydWN0dXJlU2V0RGVzY3JpcHRpb25cIn0sXG4gICAgXCIzMDA2MDAwOFwiOiB7dnI6IFwiREFcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlN0cnVjdHVyZVNldERhdGVcIn0sXG4gICAgXCIzMDA2MDAwOVwiOiB7dnI6IFwiVE1cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlN0cnVjdHVyZVNldFRpbWVcIn0sXG4gICAgXCIzMDA2MDAxMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZmVyZW5jZWRGcmFtZU9mUmVmZXJlbmNlU2VxdWVuY2VcIn0sXG4gICAgXCIzMDA2MDAxMlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJUUmVmZXJlbmNlZFN0dWR5U2VxdWVuY2VcIn0sXG4gICAgXCIzMDA2MDAxNFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJUUmVmZXJlbmNlZFNlcmllc1NlcXVlbmNlXCJ9LFxuICAgIFwiMzAwNjAwMTZcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb250b3VySW1hZ2VTZXF1ZW5jZVwifSxcbiAgICBcIjMwMDYwMDIwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3RydWN0dXJlU2V0Uk9JU2VxdWVuY2VcIn0sXG4gICAgXCIzMDA2MDAyMlwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJPSU51bWJlclwifSxcbiAgICBcIjMwMDYwMDI0XCI6IHt2cjogXCJVSVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJlbmNlZEZyYW1lT2ZSZWZlcmVuY2VVSURcIn0sXG4gICAgXCIzMDA2MDAyNlwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJPSU5hbWVcIn0sXG4gICAgXCIzMDA2MDAyOFwiOiB7dnI6IFwiU1RcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJPSURlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMzAwNjAwMkFcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjNcIiwgbmFtZTogXCJST0lEaXNwbGF5Q29sb3JcIn0sXG4gICAgXCIzMDA2MDAyQ1wiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJPSVZvbHVtZVwifSxcbiAgICBcIjMwMDYwMDMwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUlRSZWxhdGVkUk9JU2VxdWVuY2VcIn0sXG4gICAgXCIzMDA2MDAzM1wiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJUUk9JUmVsYXRpb25zaGlwXCJ9LFxuICAgIFwiMzAwNjAwMzZcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJST0lHZW5lcmF0aW9uQWxnb3JpdGhtXCJ9LFxuICAgIFwiMzAwNjAwMzhcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJST0lHZW5lcmF0aW9uRGVzY3JpcHRpb25cIn0sXG4gICAgXCIzMDA2MDAzOVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJPSUNvbnRvdXJTZXF1ZW5jZVwifSxcbiAgICBcIjMwMDYwMDQwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29udG91clNlcXVlbmNlXCJ9LFxuICAgIFwiMzAwNjAwNDJcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb250b3VyR2VvbWV0cmljVHlwZVwifSxcbiAgICBcIjMwMDYwMDQ0XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29udG91clNsYWJUaGlja25lc3NcIn0sXG4gICAgXCIzMDA2MDA0NVwiOiB7dnI6IFwiRFNcIiwgdm06IFwiM1wiLCBuYW1lOiBcIkNvbnRvdXJPZmZzZXRWZWN0b3JcIn0sXG4gICAgXCIzMDA2MDA0NlwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk51bWJlck9mQ29udG91clBvaW50c1wifSxcbiAgICBcIjMwMDYwMDQ4XCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29udG91ck51bWJlclwifSxcbiAgICBcIjMwMDYwMDQ5XCI6IHt2cjogXCJJU1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJBdHRhY2hlZENvbnRvdXJzXCJ9LFxuICAgIFwiMzAwNjAwNTBcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjMtM25cIiwgbmFtZTogXCJDb250b3VyRGF0YVwifSxcbiAgICBcIjMwMDYwMDgwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUlRST0lPYnNlcnZhdGlvbnNTZXF1ZW5jZVwifSxcbiAgICBcIjMwMDYwMDgyXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiT2JzZXJ2YXRpb25OdW1iZXJcIn0sXG4gICAgXCIzMDA2MDA4NFwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZmVyZW5jZWRST0lOdW1iZXJcIn0sXG4gICAgXCIzMDA2MDA4NVwiOiB7dnI6IFwiU0hcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJPSU9ic2VydmF0aW9uTGFiZWxcIn0sXG4gICAgXCIzMDA2MDA4NlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJUUk9JSWRlbnRpZmljYXRpb25Db2RlU2VxdWVuY2VcIn0sXG4gICAgXCIzMDA2MDA4OFwiOiB7dnI6IFwiU1RcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJPSU9ic2VydmF0aW9uRGVzY3JpcHRpb25cIn0sXG4gICAgXCIzMDA2MDBBMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlbGF0ZWRSVFJPSU9ic2VydmF0aW9uc1NlcXVlbmNlXCJ9LFxuICAgIFwiMzAwNjAwQTRcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSVFJPSUludGVycHJldGVkVHlwZVwifSxcbiAgICBcIjMwMDYwMEE2XCI6IHt2cjogXCJQTlwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUk9JSW50ZXJwcmV0ZXJcIn0sXG4gICAgXCIzMDA2MDBCMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJPSVBoeXNpY2FsUHJvcGVydGllc1NlcXVlbmNlXCJ9LFxuICAgIFwiMzAwNjAwQjJcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJST0lQaHlzaWNhbFByb3BlcnR5XCJ9LFxuICAgIFwiMzAwNjAwQjRcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJST0lQaHlzaWNhbFByb3BlcnR5VmFsdWVcIn0sXG4gICAgXCIzMDA2MDBCNlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJPSUVsZW1lbnRhbENvbXBvc2l0aW9uU2VxdWVuY2VcIn0sXG4gICAgXCIzMDA2MDBCN1wiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJPSUVsZW1lbnRhbENvbXBvc2l0aW9uQXRvbWljTnVtYmVyXCJ9LFxuICAgIFwiMzAwNjAwQjhcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJST0lFbGVtZW50YWxDb21wb3NpdGlvbkF0b21pY01hc3NGcmFjdGlvblwifSxcbiAgICBcIjMwMDYwMEMwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRnJhbWVPZlJlZmVyZW5jZVJlbGF0aW9uc2hpcFNlcXVlbmNlXCJ9LFxuICAgIFwiMzAwNjAwQzJcIjoge3ZyOiBcIlVJXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWxhdGVkRnJhbWVPZlJlZmVyZW5jZVVJRFwifSxcbiAgICBcIjMwMDYwMEM0XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRnJhbWVPZlJlZmVyZW5jZVRyYW5zZm9ybWF0aW9uVHlwZVwifSxcbiAgICBcIjMwMDYwMEM2XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxNlwiLCBuYW1lOiBcIkZyYW1lT2ZSZWZlcmVuY2VUcmFuc2Zvcm1hdGlvbk1hdHJpeFwifSxcbiAgICBcIjMwMDYwMEM4XCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRnJhbWVPZlJlZmVyZW5jZVRyYW5zZm9ybWF0aW9uQ29tbWVudFwifSxcbiAgICBcIjMwMDgwMDEwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTWVhc3VyZWREb3NlUmVmZXJlbmNlU2VxdWVuY2VcIn0sXG4gICAgXCIzMDA4MDAxMlwiOiB7dnI6IFwiU1RcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk1lYXN1cmVkRG9zZURlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMzAwODAwMTRcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNZWFzdXJlZERvc2VUeXBlXCJ9LFxuICAgIFwiMzAwODAwMTZcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNZWFzdXJlZERvc2VWYWx1ZVwifSxcbiAgICBcIjMwMDgwMDIwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVHJlYXRtZW50U2Vzc2lvbkJlYW1TZXF1ZW5jZVwifSxcbiAgICBcIjMwMDgwMDIxXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVHJlYXRtZW50U2Vzc2lvbklvbkJlYW1TZXF1ZW5jZVwifSxcbiAgICBcIjMwMDgwMDIyXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ3VycmVudEZyYWN0aW9uTnVtYmVyXCJ9LFxuICAgIFwiMzAwODAwMjRcIjoge3ZyOiBcIkRBXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUcmVhdG1lbnRDb250cm9sUG9pbnREYXRlXCJ9LFxuICAgIFwiMzAwODAwMjVcIjoge3ZyOiBcIlRNXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUcmVhdG1lbnRDb250cm9sUG9pbnRUaW1lXCJ9LFxuICAgIFwiMzAwODAwMkFcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUcmVhdG1lbnRUZXJtaW5hdGlvblN0YXR1c1wifSxcbiAgICBcIjMwMDgwMDJCXCI6IHt2cjogXCJTSFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVHJlYXRtZW50VGVybWluYXRpb25Db2RlXCJ9LFxuICAgIFwiMzAwODAwMkNcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUcmVhdG1lbnRWZXJpZmljYXRpb25TdGF0dXNcIn0sXG4gICAgXCIzMDA4MDAzMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZmVyZW5jZWRUcmVhdG1lbnRSZWNvcmRTZXF1ZW5jZVwifSxcbiAgICBcIjMwMDgwMDMyXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3BlY2lmaWVkUHJpbWFyeU1ldGVyc2V0XCJ9LFxuICAgIFwiMzAwODAwMzNcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTcGVjaWZpZWRTZWNvbmRhcnlNZXRlcnNldFwifSxcbiAgICBcIjMwMDgwMDM2XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGVsaXZlcmVkUHJpbWFyeU1ldGVyc2V0XCJ9LFxuICAgIFwiMzAwODAwMzdcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEZWxpdmVyZWRTZWNvbmRhcnlNZXRlcnNldFwifSxcbiAgICBcIjMwMDgwMDNBXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3BlY2lmaWVkVHJlYXRtZW50VGltZVwifSxcbiAgICBcIjMwMDgwMDNCXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGVsaXZlcmVkVHJlYXRtZW50VGltZVwifSxcbiAgICBcIjMwMDgwMDQwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29udHJvbFBvaW50RGVsaXZlcnlTZXF1ZW5jZVwifSxcbiAgICBcIjMwMDgwMDQxXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW9uQ29udHJvbFBvaW50RGVsaXZlcnlTZXF1ZW5jZVwifSxcbiAgICBcIjMwMDgwMDQyXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3BlY2lmaWVkTWV0ZXJzZXRcIn0sXG4gICAgXCIzMDA4MDA0NFwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRlbGl2ZXJlZE1ldGVyc2V0XCJ9LFxuICAgIFwiMzAwODAwNDVcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNZXRlcnNldFJhdGVTZXRcIn0sXG4gICAgXCIzMDA4MDA0NlwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk1ldGVyc2V0UmF0ZURlbGl2ZXJlZFwifSxcbiAgICBcIjMwMDgwMDQ3XCI6IHt2cjogXCJGTFwiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJTY2FuU3BvdE1ldGVyc2V0c0RlbGl2ZXJlZFwifSxcbiAgICBcIjMwMDgwMDQ4XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRG9zZVJhdGVEZWxpdmVyZWRcIn0sXG4gICAgXCIzMDA4MDA1MFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRyZWF0bWVudFN1bW1hcnlDYWxjdWxhdGVkRG9zZVJlZmVyZW5jZVNlcXVlbmNlXCJ9LFxuICAgIFwiMzAwODAwNTJcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDdW11bGF0aXZlRG9zZVRvRG9zZVJlZmVyZW5jZVwifSxcbiAgICBcIjMwMDgwMDU0XCI6IHt2cjogXCJEQVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRmlyc3RUcmVhdG1lbnREYXRlXCJ9LFxuICAgIFwiMzAwODAwNTZcIjoge3ZyOiBcIkRBXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNb3N0UmVjZW50VHJlYXRtZW50RGF0ZVwifSxcbiAgICBcIjMwMDgwMDVBXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTnVtYmVyT2ZGcmFjdGlvbnNEZWxpdmVyZWRcIn0sXG4gICAgXCIzMDA4MDA2MFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk92ZXJyaWRlU2VxdWVuY2VcIn0sXG4gICAgXCIzMDA4MDA2MVwiOiB7dnI6IFwiQVRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBhcmFtZXRlclNlcXVlbmNlUG9pbnRlclwifSxcbiAgICBcIjMwMDgwMDYyXCI6IHt2cjogXCJBVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiT3ZlcnJpZGVQYXJhbWV0ZXJQb2ludGVyXCJ9LFxuICAgIFwiMzAwODAwNjNcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQYXJhbWV0ZXJJdGVtSW5kZXhcIn0sXG4gICAgXCIzMDA4MDA2NFwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk1lYXN1cmVkRG9zZVJlZmVyZW5jZU51bWJlclwifSxcbiAgICBcIjMwMDgwMDY1XCI6IHt2cjogXCJBVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGFyYW1ldGVyUG9pbnRlclwifSxcbiAgICBcIjMwMDgwMDY2XCI6IHt2cjogXCJTVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiT3ZlcnJpZGVSZWFzb25cIn0sXG4gICAgXCIzMDA4MDA2OFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvcnJlY3RlZFBhcmFtZXRlclNlcXVlbmNlXCJ9LFxuICAgIFwiMzAwODAwNkFcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb3JyZWN0aW9uVmFsdWVcIn0sXG4gICAgXCIzMDA4MDA3MFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNhbGN1bGF0ZWREb3NlUmVmZXJlbmNlU2VxdWVuY2VcIn0sXG4gICAgXCIzMDA4MDA3MlwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNhbGN1bGF0ZWREb3NlUmVmZXJlbmNlTnVtYmVyXCJ9LFxuICAgIFwiMzAwODAwNzRcIjoge3ZyOiBcIlNUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDYWxjdWxhdGVkRG9zZVJlZmVyZW5jZURlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMzAwODAwNzZcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDYWxjdWxhdGVkRG9zZVJlZmVyZW5jZURvc2VWYWx1ZVwifSxcbiAgICBcIjMwMDgwMDc4XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3RhcnRNZXRlcnNldFwifSxcbiAgICBcIjMwMDgwMDdBXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRW5kTWV0ZXJzZXRcIn0sXG4gICAgXCIzMDA4MDA4MFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZmVyZW5jZWRNZWFzdXJlZERvc2VSZWZlcmVuY2VTZXF1ZW5jZVwifSxcbiAgICBcIjMwMDgwMDgyXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJlbmNlZE1lYXN1cmVkRG9zZVJlZmVyZW5jZU51bWJlclwifSxcbiAgICBcIjMwMDgwMDkwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJlbmNlZENhbGN1bGF0ZWREb3NlUmVmZXJlbmNlU2VxdWVuY2VcIn0sXG4gICAgXCIzMDA4MDA5MlwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZmVyZW5jZWRDYWxjdWxhdGVkRG9zZVJlZmVyZW5jZU51bWJlclwifSxcbiAgICBcIjMwMDgwMEEwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQmVhbUxpbWl0aW5nRGV2aWNlTGVhZlBhaXJzU2VxdWVuY2VcIn0sXG4gICAgXCIzMDA4MDBCMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlY29yZGVkV2VkZ2VTZXF1ZW5jZVwifSxcbiAgICBcIjMwMDgwMEMwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVjb3JkZWRDb21wZW5zYXRvclNlcXVlbmNlXCJ9LFxuICAgIFwiMzAwODAwRDBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWNvcmRlZEJsb2NrU2VxdWVuY2VcIn0sXG4gICAgXCIzMDA4MDBFMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRyZWF0bWVudFN1bW1hcnlNZWFzdXJlZERvc2VSZWZlcmVuY2VTZXF1ZW5jZVwifSxcbiAgICBcIjMwMDgwMEYwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVjb3JkZWRTbm91dFNlcXVlbmNlXCJ9LFxuICAgIFwiMzAwODAwRjJcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWNvcmRlZFJhbmdlU2hpZnRlclNlcXVlbmNlXCJ9LFxuICAgIFwiMzAwODAwRjRcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWNvcmRlZExhdGVyYWxTcHJlYWRpbmdEZXZpY2VTZXF1ZW5jZVwifSxcbiAgICBcIjMwMDgwMEY2XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVjb3JkZWRSYW5nZU1vZHVsYXRvclNlcXVlbmNlXCJ9LFxuICAgIFwiMzAwODAxMDBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWNvcmRlZFNvdXJjZVNlcXVlbmNlXCJ9LFxuICAgIFwiMzAwODAxMDVcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTb3VyY2VTZXJpYWxOdW1iZXJcIn0sXG4gICAgXCIzMDA4MDExMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRyZWF0bWVudFNlc3Npb25BcHBsaWNhdGlvblNldHVwU2VxdWVuY2VcIn0sXG4gICAgXCIzMDA4MDExNlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFwcGxpY2F0aW9uU2V0dXBDaGVja1wifSxcbiAgICBcIjMwMDgwMTIwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVjb3JkZWRCcmFjaHlBY2Nlc3NvcnlEZXZpY2VTZXF1ZW5jZVwifSxcbiAgICBcIjMwMDgwMTIyXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJlbmNlZEJyYWNoeUFjY2Vzc29yeURldmljZU51bWJlclwifSxcbiAgICBcIjMwMDgwMTMwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVjb3JkZWRDaGFubmVsU2VxdWVuY2VcIn0sXG4gICAgXCIzMDA4MDEzMlwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNwZWNpZmllZENoYW5uZWxUb3RhbFRpbWVcIn0sXG4gICAgXCIzMDA4MDEzNFwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRlbGl2ZXJlZENoYW5uZWxUb3RhbFRpbWVcIn0sXG4gICAgXCIzMDA4MDEzNlwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNwZWNpZmllZE51bWJlck9mUHVsc2VzXCJ9LFxuICAgIFwiMzAwODAxMzhcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEZWxpdmVyZWROdW1iZXJPZlB1bHNlc1wifSxcbiAgICBcIjMwMDgwMTNBXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU3BlY2lmaWVkUHVsc2VSZXBldGl0aW9uSW50ZXJ2YWxcIn0sXG4gICAgXCIzMDA4MDEzQ1wiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkRlbGl2ZXJlZFB1bHNlUmVwZXRpdGlvbkludGVydmFsXCJ9LFxuICAgIFwiMzAwODAxNDBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWNvcmRlZFNvdXJjZUFwcGxpY2F0b3JTZXF1ZW5jZVwifSxcbiAgICBcIjMwMDgwMTQyXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJlbmNlZFNvdXJjZUFwcGxpY2F0b3JOdW1iZXJcIn0sXG4gICAgXCIzMDA4MDE1MFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlY29yZGVkQ2hhbm5lbFNoaWVsZFNlcXVlbmNlXCJ9LFxuICAgIFwiMzAwODAxNTJcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWZlcmVuY2VkQ2hhbm5lbFNoaWVsZE51bWJlclwifSxcbiAgICBcIjMwMDgwMTYwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQnJhY2h5Q29udHJvbFBvaW50RGVsaXZlcmVkU2VxdWVuY2VcIn0sXG4gICAgXCIzMDA4MDE2MlwiOiB7dnI6IFwiREFcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNhZmVQb3NpdGlvbkV4aXREYXRlXCJ9LFxuICAgIFwiMzAwODAxNjRcIjoge3ZyOiBcIlRNXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTYWZlUG9zaXRpb25FeGl0VGltZVwifSxcbiAgICBcIjMwMDgwMTY2XCI6IHt2cjogXCJEQVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2FmZVBvc2l0aW9uUmV0dXJuRGF0ZVwifSxcbiAgICBcIjMwMDgwMTY4XCI6IHt2cjogXCJUTVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2FmZVBvc2l0aW9uUmV0dXJuVGltZVwifSxcbiAgICBcIjMwMDgwMjAwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ3VycmVudFRyZWF0bWVudFN0YXR1c1wifSxcbiAgICBcIjMwMDgwMjAyXCI6IHt2cjogXCJTVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVHJlYXRtZW50U3RhdHVzQ29tbWVudFwifSxcbiAgICBcIjMwMDgwMjIwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRnJhY3Rpb25Hcm91cFN1bW1hcnlTZXF1ZW5jZVwifSxcbiAgICBcIjMwMDgwMjIzXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJlbmNlZEZyYWN0aW9uTnVtYmVyXCJ9LFxuICAgIFwiMzAwODAyMjRcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJGcmFjdGlvbkdyb3VwVHlwZVwifSxcbiAgICBcIjMwMDgwMjMwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQmVhbVN0b3BwZXJQb3NpdGlvblwifSxcbiAgICBcIjMwMDgwMjQwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRnJhY3Rpb25TdGF0dXNTdW1tYXJ5U2VxdWVuY2VcIn0sXG4gICAgXCIzMDA4MDI1MFwiOiB7dnI6IFwiREFcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRyZWF0bWVudERhdGVcIn0sXG4gICAgXCIzMDA4MDI1MVwiOiB7dnI6IFwiVE1cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRyZWF0bWVudFRpbWVcIn0sXG4gICAgXCIzMDBBMDAwMlwiOiB7dnI6IFwiU0hcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJUUGxhbkxhYmVsXCJ9LFxuICAgIFwiMzAwQTAwMDNcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSVFBsYW5OYW1lXCJ9LFxuICAgIFwiMzAwQTAwMDRcIjoge3ZyOiBcIlNUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSVFBsYW5EZXNjcmlwdGlvblwifSxcbiAgICBcIjMwMEEwMDA2XCI6IHt2cjogXCJEQVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUlRQbGFuRGF0ZVwifSxcbiAgICBcIjMwMEEwMDA3XCI6IHt2cjogXCJUTVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUlRQbGFuVGltZVwifSxcbiAgICBcIjMwMEEwMDA5XCI6IHt2cjogXCJMT1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJUcmVhdG1lbnRQcm90b2NvbHNcIn0sXG4gICAgXCIzMDBBMDAwQVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBsYW5JbnRlbnRcIn0sXG4gICAgXCIzMDBBMDAwQlwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiVHJlYXRtZW50U2l0ZXNcIn0sXG4gICAgXCIzMDBBMDAwQ1wiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJUUGxhbkdlb21ldHJ5XCJ9LFxuICAgIFwiMzAwQTAwMEVcIjoge3ZyOiBcIlNUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQcmVzY3JpcHRpb25EZXNjcmlwdGlvblwifSxcbiAgICBcIjMwMEEwMDEwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRG9zZVJlZmVyZW5jZVNlcXVlbmNlXCJ9LFxuICAgIFwiMzAwQTAwMTJcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEb3NlUmVmZXJlbmNlTnVtYmVyXCJ9LFxuICAgIFwiMzAwQTAwMTNcIjoge3ZyOiBcIlVJXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEb3NlUmVmZXJlbmNlVUlEXCJ9LFxuICAgIFwiMzAwQTAwMTRcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEb3NlUmVmZXJlbmNlU3RydWN0dXJlVHlwZVwifSxcbiAgICBcIjMwMEEwMDE1XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTm9taW5hbEJlYW1FbmVyZ3lVbml0XCJ9LFxuICAgIFwiMzAwQTAwMTZcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEb3NlUmVmZXJlbmNlRGVzY3JpcHRpb25cIn0sXG4gICAgXCIzMDBBMDAxOFwiOiB7dnI6IFwiRFNcIiwgdm06IFwiM1wiLCBuYW1lOiBcIkRvc2VSZWZlcmVuY2VQb2ludENvb3JkaW5hdGVzXCJ9LFxuICAgIFwiMzAwQTAwMUFcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJOb21pbmFsUHJpb3JEb3NlXCJ9LFxuICAgIFwiMzAwQTAwMjBcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEb3NlUmVmZXJlbmNlVHlwZVwifSxcbiAgICBcIjMwMEEwMDIxXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29uc3RyYWludFdlaWdodFwifSxcbiAgICBcIjMwMEEwMDIyXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGVsaXZlcnlXYXJuaW5nRG9zZVwifSxcbiAgICBcIjMwMEEwMDIzXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGVsaXZlcnlNYXhpbXVtRG9zZVwifSxcbiAgICBcIjMwMEEwMDI1XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiVGFyZ2V0TWluaW11bURvc2VcIn0sXG4gICAgXCIzMDBBMDAyNlwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRhcmdldFByZXNjcmlwdGlvbkRvc2VcIn0sXG4gICAgXCIzMDBBMDAyN1wiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRhcmdldE1heGltdW1Eb3NlXCJ9LFxuICAgIFwiMzAwQTAwMjhcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUYXJnZXRVbmRlcmRvc2VWb2x1bWVGcmFjdGlvblwifSxcbiAgICBcIjMwMEEwMDJBXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiT3JnYW5BdFJpc2tGdWxsVm9sdW1lRG9zZVwifSxcbiAgICBcIjMwMEEwMDJCXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiT3JnYW5BdFJpc2tMaW1pdERvc2VcIn0sXG4gICAgXCIzMDBBMDAyQ1wiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk9yZ2FuQXRSaXNrTWF4aW11bURvc2VcIn0sXG4gICAgXCIzMDBBMDAyRFwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk9yZ2FuQXRSaXNrT3ZlcmRvc2VWb2x1bWVGcmFjdGlvblwifSxcbiAgICBcIjMwMEEwMDQwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVG9sZXJhbmNlVGFibGVTZXF1ZW5jZVwifSxcbiAgICBcIjMwMEEwMDQyXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiVG9sZXJhbmNlVGFibGVOdW1iZXJcIn0sXG4gICAgXCIzMDBBMDA0M1wiOiB7dnI6IFwiU0hcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRvbGVyYW5jZVRhYmxlTGFiZWxcIn0sXG4gICAgXCIzMDBBMDA0NFwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkdhbnRyeUFuZ2xlVG9sZXJhbmNlXCJ9LFxuICAgIFwiMzAwQTAwNDZcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJCZWFtTGltaXRpbmdEZXZpY2VBbmdsZVRvbGVyYW5jZVwifSxcbiAgICBcIjMwMEEwMDQ4XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQmVhbUxpbWl0aW5nRGV2aWNlVG9sZXJhbmNlU2VxdWVuY2VcIn0sXG4gICAgXCIzMDBBMDA0QVwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkJlYW1MaW1pdGluZ0RldmljZVBvc2l0aW9uVG9sZXJhbmNlXCJ9LFxuICAgIFwiMzAwQTAwNEJcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTbm91dFBvc2l0aW9uVG9sZXJhbmNlXCJ9LFxuICAgIFwiMzAwQTAwNENcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQYXRpZW50U3VwcG9ydEFuZ2xlVG9sZXJhbmNlXCJ9LFxuICAgIFwiMzAwQTAwNEVcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUYWJsZVRvcEVjY2VudHJpY0FuZ2xlVG9sZXJhbmNlXCJ9LFxuICAgIFwiMzAwQTAwNEZcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUYWJsZVRvcFBpdGNoQW5nbGVUb2xlcmFuY2VcIn0sXG4gICAgXCIzMDBBMDA1MFwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRhYmxlVG9wUm9sbEFuZ2xlVG9sZXJhbmNlXCJ9LFxuICAgIFwiMzAwQTAwNTFcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUYWJsZVRvcFZlcnRpY2FsUG9zaXRpb25Ub2xlcmFuY2VcIn0sXG4gICAgXCIzMDBBMDA1MlwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRhYmxlVG9wTG9uZ2l0dWRpbmFsUG9zaXRpb25Ub2xlcmFuY2VcIn0sXG4gICAgXCIzMDBBMDA1M1wiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRhYmxlVG9wTGF0ZXJhbFBvc2l0aW9uVG9sZXJhbmNlXCJ9LFxuICAgIFwiMzAwQTAwNTVcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSVFBsYW5SZWxhdGlvbnNoaXBcIn0sXG4gICAgXCIzMDBBMDA3MFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkZyYWN0aW9uR3JvdXBTZXF1ZW5jZVwifSxcbiAgICBcIjMwMEEwMDcxXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRnJhY3Rpb25Hcm91cE51bWJlclwifSxcbiAgICBcIjMwMEEwMDcyXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRnJhY3Rpb25Hcm91cERlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMzAwQTAwNzhcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJOdW1iZXJPZkZyYWN0aW9uc1BsYW5uZWRcIn0sXG4gICAgXCIzMDBBMDA3OVwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk51bWJlck9mRnJhY3Rpb25QYXR0ZXJuRGlnaXRzUGVyRGF5XCJ9LFxuICAgIFwiMzAwQTAwN0FcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZXBlYXRGcmFjdGlvbkN5Y2xlTGVuZ3RoXCJ9LFxuICAgIFwiMzAwQTAwN0JcIjoge3ZyOiBcIkxUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJGcmFjdGlvblBhdHRlcm5cIn0sXG4gICAgXCIzMDBBMDA4MFwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk51bWJlck9mQmVhbXNcIn0sXG4gICAgXCIzMDBBMDA4MlwiOiB7dnI6IFwiRFNcIiwgdm06IFwiM1wiLCBuYW1lOiBcIkJlYW1Eb3NlU3BlY2lmaWNhdGlvblBvaW50XCJ9LFxuICAgIFwiMzAwQTAwODRcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJCZWFtRG9zZVwifSxcbiAgICBcIjMwMEEwMDg2XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQmVhbU1ldGVyc2V0XCJ9LFxuICAgIFwiMzAwQTAwODhcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJCZWFtRG9zZVBvaW50RGVwdGhcIn0sXG4gICAgXCIzMDBBMDA4OVwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkJlYW1Eb3NlUG9pbnRFcXVpdmFsZW50RGVwdGhcIn0sXG4gICAgXCIzMDBBMDA4QVwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkJlYW1Eb3NlUG9pbnRTU0RcIn0sXG4gICAgXCIzMDBBMDBBMFwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk51bWJlck9mQnJhY2h5QXBwbGljYXRpb25TZXR1cHNcIn0sXG4gICAgXCIzMDBBMDBBMlwiOiB7dnI6IFwiRFNcIiwgdm06IFwiM1wiLCBuYW1lOiBcIkJyYWNoeUFwcGxpY2F0aW9uU2V0dXBEb3NlU3BlY2lmaWNhdGlvblBvaW50XCJ9LFxuICAgIFwiMzAwQTAwQTRcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJCcmFjaHlBcHBsaWNhdGlvblNldHVwRG9zZVwifSxcbiAgICBcIjMwMEEwMEIwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQmVhbVNlcXVlbmNlXCJ9LFxuICAgIFwiMzAwQTAwQjJcIjoge3ZyOiBcIlNIXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUcmVhdG1lbnRNYWNoaW5lTmFtZVwifSxcbiAgICBcIjMwMEEwMEIzXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUHJpbWFyeURvc2ltZXRlclVuaXRcIn0sXG4gICAgXCIzMDBBMDBCNFwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNvdXJjZUF4aXNEaXN0YW5jZVwifSxcbiAgICBcIjMwMEEwMEI2XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQmVhbUxpbWl0aW5nRGV2aWNlU2VxdWVuY2VcIn0sXG4gICAgXCIzMDBBMDBCOFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJUQmVhbUxpbWl0aW5nRGV2aWNlVHlwZVwifSxcbiAgICBcIjMwMEEwMEJBXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU291cmNlVG9CZWFtTGltaXRpbmdEZXZpY2VEaXN0YW5jZVwifSxcbiAgICBcIjMwMEEwMEJCXCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiSXNvY2VudGVyVG9CZWFtTGltaXRpbmdEZXZpY2VEaXN0YW5jZVwifSxcbiAgICBcIjMwMEEwMEJDXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTnVtYmVyT2ZMZWFmSmF3UGFpcnNcIn0sXG4gICAgXCIzMDBBMDBCRVwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMy1uXCIsIG5hbWU6IFwiTGVhZlBvc2l0aW9uQm91bmRhcmllc1wifSxcbiAgICBcIjMwMEEwMEMwXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQmVhbU51bWJlclwifSxcbiAgICBcIjMwMEEwMEMyXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQmVhbU5hbWVcIn0sXG4gICAgXCIzMDBBMDBDM1wiOiB7dnI6IFwiU1RcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkJlYW1EZXNjcmlwdGlvblwifSxcbiAgICBcIjMwMEEwMEM0XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQmVhbVR5cGVcIn0sXG4gICAgXCIzMDBBMDBDNlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJhZGlhdGlvblR5cGVcIn0sXG4gICAgXCIzMDBBMDBDN1wiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkhpZ2hEb3NlVGVjaG5pcXVlVHlwZVwifSxcbiAgICBcIjMwMEEwMEM4XCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJlbmNlSW1hZ2VOdW1iZXJcIn0sXG4gICAgXCIzMDBBMDBDQVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBsYW5uZWRWZXJpZmljYXRpb25JbWFnZVNlcXVlbmNlXCJ9LFxuICAgIFwiMzAwQTAwQ0NcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIkltYWdpbmdEZXZpY2VTcGVjaWZpY0FjcXVpc2l0aW9uUGFyYW1ldGVyc1wifSxcbiAgICBcIjMwMEEwMENFXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiVHJlYXRtZW50RGVsaXZlcnlUeXBlXCJ9LFxuICAgIFwiMzAwQTAwRDBcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJOdW1iZXJPZldlZGdlc1wifSxcbiAgICBcIjMwMEEwMEQxXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiV2VkZ2VTZXF1ZW5jZVwifSxcbiAgICBcIjMwMEEwMEQyXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiV2VkZ2VOdW1iZXJcIn0sXG4gICAgXCIzMDBBMDBEM1wiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIldlZGdlVHlwZVwifSxcbiAgICBcIjMwMEEwMEQ0XCI6IHt2cjogXCJTSFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiV2VkZ2VJRFwifSxcbiAgICBcIjMwMEEwMEQ1XCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiV2VkZ2VBbmdsZVwifSxcbiAgICBcIjMwMEEwMEQ2XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiV2VkZ2VGYWN0b3JcIn0sXG4gICAgXCIzMDBBMDBEN1wiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRvdGFsV2VkZ2VUcmF5V2F0ZXJFcXVpdmFsZW50VGhpY2tuZXNzXCJ9LFxuICAgIFwiMzAwQTAwRDhcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJXZWRnZU9yaWVudGF0aW9uXCJ9LFxuICAgIFwiMzAwQTAwRDlcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJc29jZW50ZXJUb1dlZGdlVHJheURpc3RhbmNlXCJ9LFxuICAgIFwiMzAwQTAwREFcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTb3VyY2VUb1dlZGdlVHJheURpc3RhbmNlXCJ9LFxuICAgIFwiMzAwQTAwREJcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJXZWRnZVRoaW5FZGdlUG9zaXRpb25cIn0sXG4gICAgXCIzMDBBMDBEQ1wiOiB7dnI6IFwiU0hcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkJvbHVzSURcIn0sXG4gICAgXCIzMDBBMDBERFwiOiB7dnI6IFwiU1RcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkJvbHVzRGVzY3JpcHRpb25cIn0sXG4gICAgXCIzMDBBMDBFMFwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk51bWJlck9mQ29tcGVuc2F0b3JzXCJ9LFxuICAgIFwiMzAwQTAwRTFcIjoge3ZyOiBcIlNIXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJNYXRlcmlhbElEXCJ9LFxuICAgIFwiMzAwQTAwRTJcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUb3RhbENvbXBlbnNhdG9yVHJheUZhY3RvclwifSxcbiAgICBcIjMwMEEwMEUzXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29tcGVuc2F0b3JTZXF1ZW5jZVwifSxcbiAgICBcIjMwMEEwMEU0XCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29tcGVuc2F0b3JOdW1iZXJcIn0sXG4gICAgXCIzMDBBMDBFNVwiOiB7dnI6IFwiU0hcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvbXBlbnNhdG9ySURcIn0sXG4gICAgXCIzMDBBMDBFNlwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNvdXJjZVRvQ29tcGVuc2F0b3JUcmF5RGlzdGFuY2VcIn0sXG4gICAgXCIzMDBBMDBFN1wiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvbXBlbnNhdG9yUm93c1wifSxcbiAgICBcIjMwMEEwMEU4XCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29tcGVuc2F0b3JDb2x1bW5zXCJ9LFxuICAgIFwiMzAwQTAwRTlcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjJcIiwgbmFtZTogXCJDb21wZW5zYXRvclBpeGVsU3BhY2luZ1wifSxcbiAgICBcIjMwMEEwMEVBXCI6IHt2cjogXCJEU1wiLCB2bTogXCIyXCIsIG5hbWU6IFwiQ29tcGVuc2F0b3JQb3NpdGlvblwifSxcbiAgICBcIjMwMEEwMEVCXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJDb21wZW5zYXRvclRyYW5zbWlzc2lvbkRhdGFcIn0sXG4gICAgXCIzMDBBMDBFQ1wiOiB7dnI6IFwiRFNcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiQ29tcGVuc2F0b3JUaGlja25lc3NEYXRhXCJ9LFxuICAgIFwiMzAwQTAwRURcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJOdW1iZXJPZkJvbGlcIn0sXG4gICAgXCIzMDBBMDBFRVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvbXBlbnNhdG9yVHlwZVwifSxcbiAgICBcIjMwMEEwMEYwXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTnVtYmVyT2ZCbG9ja3NcIn0sXG4gICAgXCIzMDBBMDBGMlwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRvdGFsQmxvY2tUcmF5RmFjdG9yXCJ9LFxuICAgIFwiMzAwQTAwRjNcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUb3RhbEJsb2NrVHJheVdhdGVyRXF1aXZhbGVudFRoaWNrbmVzc1wifSxcbiAgICBcIjMwMEEwMEY0XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQmxvY2tTZXF1ZW5jZVwifSxcbiAgICBcIjMwMEEwMEY1XCI6IHt2cjogXCJTSFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQmxvY2tUcmF5SURcIn0sXG4gICAgXCIzMDBBMDBGNlwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNvdXJjZVRvQmxvY2tUcmF5RGlzdGFuY2VcIn0sXG4gICAgXCIzMDBBMDBGN1wiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIklzb2NlbnRlclRvQmxvY2tUcmF5RGlzdGFuY2VcIn0sXG4gICAgXCIzMDBBMDBGOFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkJsb2NrVHlwZVwifSxcbiAgICBcIjMwMEEwMEY5XCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQWNjZXNzb3J5Q29kZVwifSxcbiAgICBcIjMwMEEwMEZBXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQmxvY2tEaXZlcmdlbmNlXCJ9LFxuICAgIFwiMzAwQTAwRkJcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJCbG9ja01vdW50aW5nUG9zaXRpb25cIn0sXG4gICAgXCIzMDBBMDBGQ1wiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkJsb2NrTnVtYmVyXCJ9LFxuICAgIFwiMzAwQTAwRkVcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJCbG9ja05hbWVcIn0sXG4gICAgXCIzMDBBMDEwMFwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkJsb2NrVGhpY2tuZXNzXCJ9LFxuICAgIFwiMzAwQTAxMDJcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJCbG9ja1RyYW5zbWlzc2lvblwifSxcbiAgICBcIjMwMEEwMTA0XCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQmxvY2tOdW1iZXJPZlBvaW50c1wifSxcbiAgICBcIjMwMEEwMTA2XCI6IHt2cjogXCJEU1wiLCB2bTogXCIyLTJuXCIsIG5hbWU6IFwiQmxvY2tEYXRhXCJ9LFxuICAgIFwiMzAwQTAxMDdcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBcHBsaWNhdG9yU2VxdWVuY2VcIn0sXG4gICAgXCIzMDBBMDEwOFwiOiB7dnI6IFwiU0hcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFwcGxpY2F0b3JJRFwifSxcbiAgICBcIjMwMEEwMTA5XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQXBwbGljYXRvclR5cGVcIn0sXG4gICAgXCIzMDBBMDEwQVwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFwcGxpY2F0b3JEZXNjcmlwdGlvblwifSxcbiAgICBcIjMwMEEwMTBDXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ3VtdWxhdGl2ZURvc2VSZWZlcmVuY2VDb2VmZmljaWVudFwifSxcbiAgICBcIjMwMEEwMTBFXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRmluYWxDdW11bGF0aXZlTWV0ZXJzZXRXZWlnaHRcIn0sXG4gICAgXCIzMDBBMDExMFwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk51bWJlck9mQ29udHJvbFBvaW50c1wifSxcbiAgICBcIjMwMEEwMTExXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29udHJvbFBvaW50U2VxdWVuY2VcIn0sXG4gICAgXCIzMDBBMDExMlwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvbnRyb2xQb2ludEluZGV4XCJ9LFxuICAgIFwiMzAwQTAxMTRcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJOb21pbmFsQmVhbUVuZXJneVwifSxcbiAgICBcIjMwMEEwMTE1XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRG9zZVJhdGVTZXRcIn0sXG4gICAgXCIzMDBBMDExNlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIldlZGdlUG9zaXRpb25TZXF1ZW5jZVwifSxcbiAgICBcIjMwMEEwMTE4XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiV2VkZ2VQb3NpdGlvblwifSxcbiAgICBcIjMwMEEwMTFBXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQmVhbUxpbWl0aW5nRGV2aWNlUG9zaXRpb25TZXF1ZW5jZVwifSxcbiAgICBcIjMwMEEwMTFDXCI6IHt2cjogXCJEU1wiLCB2bTogXCIyLTJuXCIsIG5hbWU6IFwiTGVhZkphd1Bvc2l0aW9uc1wifSxcbiAgICBcIjMwMEEwMTFFXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiR2FudHJ5QW5nbGVcIn0sXG4gICAgXCIzMDBBMDExRlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkdhbnRyeVJvdGF0aW9uRGlyZWN0aW9uXCJ9LFxuICAgIFwiMzAwQTAxMjBcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJCZWFtTGltaXRpbmdEZXZpY2VBbmdsZVwifSxcbiAgICBcIjMwMEEwMTIxXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQmVhbUxpbWl0aW5nRGV2aWNlUm90YXRpb25EaXJlY3Rpb25cIn0sXG4gICAgXCIzMDBBMDEyMlwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBhdGllbnRTdXBwb3J0QW5nbGVcIn0sXG4gICAgXCIzMDBBMDEyM1wiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBhdGllbnRTdXBwb3J0Um90YXRpb25EaXJlY3Rpb25cIn0sXG4gICAgXCIzMDBBMDEyNFwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRhYmxlVG9wRWNjZW50cmljQXhpc0Rpc3RhbmNlXCJ9LFxuICAgIFwiMzAwQTAxMjVcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUYWJsZVRvcEVjY2VudHJpY0FuZ2xlXCJ9LFxuICAgIFwiMzAwQTAxMjZcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUYWJsZVRvcEVjY2VudHJpY1JvdGF0aW9uRGlyZWN0aW9uXCJ9LFxuICAgIFwiMzAwQTAxMjhcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUYWJsZVRvcFZlcnRpY2FsUG9zaXRpb25cIn0sXG4gICAgXCIzMDBBMDEyOVwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRhYmxlVG9wTG9uZ2l0dWRpbmFsUG9zaXRpb25cIn0sXG4gICAgXCIzMDBBMDEyQVwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRhYmxlVG9wTGF0ZXJhbFBvc2l0aW9uXCJ9LFxuICAgIFwiMzAwQTAxMkNcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjNcIiwgbmFtZTogXCJJc29jZW50ZXJQb3NpdGlvblwifSxcbiAgICBcIjMwMEEwMTJFXCI6IHt2cjogXCJEU1wiLCB2bTogXCIzXCIsIG5hbWU6IFwiU3VyZmFjZUVudHJ5UG9pbnRcIn0sXG4gICAgXCIzMDBBMDEzMFwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNvdXJjZVRvU3VyZmFjZURpc3RhbmNlXCJ9LFxuICAgIFwiMzAwQTAxMzRcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDdW11bGF0aXZlTWV0ZXJzZXRXZWlnaHRcIn0sXG4gICAgXCIzMDBBMDE0MFwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRhYmxlVG9wUGl0Y2hBbmdsZVwifSxcbiAgICBcIjMwMEEwMTQyXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiVGFibGVUb3BQaXRjaFJvdGF0aW9uRGlyZWN0aW9uXCJ9LFxuICAgIFwiMzAwQTAxNDRcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUYWJsZVRvcFJvbGxBbmdsZVwifSxcbiAgICBcIjMwMEEwMTQ2XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiVGFibGVUb3BSb2xsUm90YXRpb25EaXJlY3Rpb25cIn0sXG4gICAgXCIzMDBBMDE0OFwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkhlYWRGaXhhdGlvbkFuZ2xlXCJ9LFxuICAgIFwiMzAwQTAxNEFcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJHYW50cnlQaXRjaEFuZ2xlXCJ9LFxuICAgIFwiMzAwQTAxNENcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJHYW50cnlQaXRjaFJvdGF0aW9uRGlyZWN0aW9uXCJ9LFxuICAgIFwiMzAwQTAxNEVcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJHYW50cnlQaXRjaEFuZ2xlVG9sZXJhbmNlXCJ9LFxuICAgIFwiMzAwQTAxODBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQYXRpZW50U2V0dXBTZXF1ZW5jZVwifSxcbiAgICBcIjMwMEEwMTgyXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGF0aWVudFNldHVwTnVtYmVyXCJ9LFxuICAgIFwiMzAwQTAxODNcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQYXRpZW50U2V0dXBMYWJlbFwifSxcbiAgICBcIjMwMEEwMTg0XCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGF0aWVudEFkZGl0aW9uYWxQb3NpdGlvblwifSxcbiAgICBcIjMwMEEwMTkwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRml4YXRpb25EZXZpY2VTZXF1ZW5jZVwifSxcbiAgICBcIjMwMEEwMTkyXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRml4YXRpb25EZXZpY2VUeXBlXCJ9LFxuICAgIFwiMzAwQTAxOTRcIjoge3ZyOiBcIlNIXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJGaXhhdGlvbkRldmljZUxhYmVsXCJ9LFxuICAgIFwiMzAwQTAxOTZcIjoge3ZyOiBcIlNUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJGaXhhdGlvbkRldmljZURlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMzAwQTAxOThcIjoge3ZyOiBcIlNIXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJGaXhhdGlvbkRldmljZVBvc2l0aW9uXCJ9LFxuICAgIFwiMzAwQTAxOTlcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJGaXhhdGlvbkRldmljZVBpdGNoQW5nbGVcIn0sXG4gICAgXCIzMDBBMDE5QVwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkZpeGF0aW9uRGV2aWNlUm9sbEFuZ2xlXCJ9LFxuICAgIFwiMzAwQTAxQTBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTaGllbGRpbmdEZXZpY2VTZXF1ZW5jZVwifSxcbiAgICBcIjMwMEEwMUEyXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2hpZWxkaW5nRGV2aWNlVHlwZVwifSxcbiAgICBcIjMwMEEwMUE0XCI6IHt2cjogXCJTSFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2hpZWxkaW5nRGV2aWNlTGFiZWxcIn0sXG4gICAgXCIzMDBBMDFBNlwiOiB7dnI6IFwiU1RcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNoaWVsZGluZ0RldmljZURlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMzAwQTAxQThcIjoge3ZyOiBcIlNIXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTaGllbGRpbmdEZXZpY2VQb3NpdGlvblwifSxcbiAgICBcIjMwMEEwMUIwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2V0dXBUZWNobmlxdWVcIn0sXG4gICAgXCIzMDBBMDFCMlwiOiB7dnI6IFwiU1RcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNldHVwVGVjaG5pcXVlRGVzY3JpcHRpb25cIn0sXG4gICAgXCIzMDBBMDFCNFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNldHVwRGV2aWNlU2VxdWVuY2VcIn0sXG4gICAgXCIzMDBBMDFCNlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNldHVwRGV2aWNlVHlwZVwifSxcbiAgICBcIjMwMEEwMUI4XCI6IHt2cjogXCJTSFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2V0dXBEZXZpY2VMYWJlbFwifSxcbiAgICBcIjMwMEEwMUJBXCI6IHt2cjogXCJTVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2V0dXBEZXZpY2VEZXNjcmlwdGlvblwifSxcbiAgICBcIjMwMEEwMUJDXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2V0dXBEZXZpY2VQYXJhbWV0ZXJcIn0sXG4gICAgXCIzMDBBMDFEMFwiOiB7dnI6IFwiU1RcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNldHVwUmVmZXJlbmNlRGVzY3JpcHRpb25cIn0sXG4gICAgXCIzMDBBMDFEMlwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRhYmxlVG9wVmVydGljYWxTZXR1cERpc3BsYWNlbWVudFwifSxcbiAgICBcIjMwMEEwMUQ0XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiVGFibGVUb3BMb25naXR1ZGluYWxTZXR1cERpc3BsYWNlbWVudFwifSxcbiAgICBcIjMwMEEwMUQ2XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiVGFibGVUb3BMYXRlcmFsU2V0dXBEaXNwbGFjZW1lbnRcIn0sXG4gICAgXCIzMDBBMDIwMFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkJyYWNoeVRyZWF0bWVudFRlY2huaXF1ZVwifSxcbiAgICBcIjMwMEEwMjAyXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQnJhY2h5VHJlYXRtZW50VHlwZVwifSxcbiAgICBcIjMwMEEwMjA2XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVHJlYXRtZW50TWFjaGluZVNlcXVlbmNlXCJ9LFxuICAgIFwiMzAwQTAyMTBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTb3VyY2VTZXF1ZW5jZVwifSxcbiAgICBcIjMwMEEwMjEyXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU291cmNlTnVtYmVyXCJ9LFxuICAgIFwiMzAwQTAyMTRcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTb3VyY2VUeXBlXCJ9LFxuICAgIFwiMzAwQTAyMTZcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTb3VyY2VNYW51ZmFjdHVyZXJcIn0sXG4gICAgXCIzMDBBMDIxOFwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFjdGl2ZVNvdXJjZURpYW1ldGVyXCJ9LFxuICAgIFwiMzAwQTAyMUFcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBY3RpdmVTb3VyY2VMZW5ndGhcIn0sXG4gICAgXCIzMDBBMDIyMlwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNvdXJjZUVuY2Fwc3VsYXRpb25Ob21pbmFsVGhpY2tuZXNzXCJ9LFxuICAgIFwiMzAwQTAyMjRcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTb3VyY2VFbmNhcHN1bGF0aW9uTm9taW5hbFRyYW5zbWlzc2lvblwifSxcbiAgICBcIjMwMEEwMjI2XCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU291cmNlSXNvdG9wZU5hbWVcIn0sXG4gICAgXCIzMDBBMDIyOFwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNvdXJjZUlzb3RvcGVIYWxmTGlmZVwifSxcbiAgICBcIjMwMEEwMjI5XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU291cmNlU3RyZW5ndGhVbml0c1wifSxcbiAgICBcIjMwMEEwMjJBXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJlbmNlQWlyS2VybWFSYXRlXCJ9LFxuICAgIFwiMzAwQTAyMkJcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTb3VyY2VTdHJlbmd0aFwifSxcbiAgICBcIjMwMEEwMjJDXCI6IHt2cjogXCJEQVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU291cmNlU3RyZW5ndGhSZWZlcmVuY2VEYXRlXCJ9LFxuICAgIFwiMzAwQTAyMkVcIjoge3ZyOiBcIlRNXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTb3VyY2VTdHJlbmd0aFJlZmVyZW5jZVRpbWVcIn0sXG4gICAgXCIzMDBBMDIzMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFwcGxpY2F0aW9uU2V0dXBTZXF1ZW5jZVwifSxcbiAgICBcIjMwMEEwMjMyXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQXBwbGljYXRpb25TZXR1cFR5cGVcIn0sXG4gICAgXCIzMDBBMDIzNFwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFwcGxpY2F0aW9uU2V0dXBOdW1iZXJcIn0sXG4gICAgXCIzMDBBMDIzNlwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFwcGxpY2F0aW9uU2V0dXBOYW1lXCJ9LFxuICAgIFwiMzAwQTAyMzhcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBcHBsaWNhdGlvblNldHVwTWFudWZhY3R1cmVyXCJ9LFxuICAgIFwiMzAwQTAyNDBcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUZW1wbGF0ZU51bWJlclwifSxcbiAgICBcIjMwMEEwMjQyXCI6IHt2cjogXCJTSFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVGVtcGxhdGVUeXBlXCJ9LFxuICAgIFwiMzAwQTAyNDRcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUZW1wbGF0ZU5hbWVcIn0sXG4gICAgXCIzMDBBMDI1MFwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRvdGFsUmVmZXJlbmNlQWlyS2VybWFcIn0sXG4gICAgXCIzMDBBMDI2MFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkJyYWNoeUFjY2Vzc29yeURldmljZVNlcXVlbmNlXCJ9LFxuICAgIFwiMzAwQTAyNjJcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJCcmFjaHlBY2Nlc3NvcnlEZXZpY2VOdW1iZXJcIn0sXG4gICAgXCIzMDBBMDI2M1wiOiB7dnI6IFwiU0hcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkJyYWNoeUFjY2Vzc29yeURldmljZUlEXCJ9LFxuICAgIFwiMzAwQTAyNjRcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJCcmFjaHlBY2Nlc3NvcnlEZXZpY2VUeXBlXCJ9LFxuICAgIFwiMzAwQTAyNjZcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJCcmFjaHlBY2Nlc3NvcnlEZXZpY2VOYW1lXCJ9LFxuICAgIFwiMzAwQTAyNkFcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJCcmFjaHlBY2Nlc3NvcnlEZXZpY2VOb21pbmFsVGhpY2tuZXNzXCJ9LFxuICAgIFwiMzAwQTAyNkNcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJCcmFjaHlBY2Nlc3NvcnlEZXZpY2VOb21pbmFsVHJhbnNtaXNzaW9uXCJ9LFxuICAgIFwiMzAwQTAyODBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDaGFubmVsU2VxdWVuY2VcIn0sXG4gICAgXCIzMDBBMDI4MlwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNoYW5uZWxOdW1iZXJcIn0sXG4gICAgXCIzMDBBMDI4NFwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNoYW5uZWxMZW5ndGhcIn0sXG4gICAgXCIzMDBBMDI4NlwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNoYW5uZWxUb3RhbFRpbWVcIn0sXG4gICAgXCIzMDBBMDI4OFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNvdXJjZU1vdmVtZW50VHlwZVwifSxcbiAgICBcIjMwMEEwMjhBXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTnVtYmVyT2ZQdWxzZXNcIn0sXG4gICAgXCIzMDBBMDI4Q1wiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlB1bHNlUmVwZXRpdGlvbkludGVydmFsXCJ9LFxuICAgIFwiMzAwQTAyOTBcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTb3VyY2VBcHBsaWNhdG9yTnVtYmVyXCJ9LFxuICAgIFwiMzAwQTAyOTFcIjoge3ZyOiBcIlNIXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTb3VyY2VBcHBsaWNhdG9ySURcIn0sXG4gICAgXCIzMDBBMDI5MlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNvdXJjZUFwcGxpY2F0b3JUeXBlXCJ9LFxuICAgIFwiMzAwQTAyOTRcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTb3VyY2VBcHBsaWNhdG9yTmFtZVwifSxcbiAgICBcIjMwMEEwMjk2XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU291cmNlQXBwbGljYXRvckxlbmd0aFwifSxcbiAgICBcIjMwMEEwMjk4XCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU291cmNlQXBwbGljYXRvck1hbnVmYWN0dXJlclwifSxcbiAgICBcIjMwMEEwMjlDXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiU291cmNlQXBwbGljYXRvcldhbGxOb21pbmFsVGhpY2tuZXNzXCJ9LFxuICAgIFwiMzAwQTAyOUVcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTb3VyY2VBcHBsaWNhdG9yV2FsbE5vbWluYWxUcmFuc21pc3Npb25cIn0sXG4gICAgXCIzMDBBMDJBMFwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNvdXJjZUFwcGxpY2F0b3JTdGVwU2l6ZVwifSxcbiAgICBcIjMwMEEwMkEyXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiVHJhbnNmZXJUdWJlTnVtYmVyXCJ9LFxuICAgIFwiMzAwQTAyQTRcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUcmFuc2ZlclR1YmVMZW5ndGhcIn0sXG4gICAgXCIzMDBBMDJCMFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNoYW5uZWxTaGllbGRTZXF1ZW5jZVwifSxcbiAgICBcIjMwMEEwMkIyXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ2hhbm5lbFNoaWVsZE51bWJlclwifSxcbiAgICBcIjMwMEEwMkIzXCI6IHt2cjogXCJTSFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ2hhbm5lbFNoaWVsZElEXCJ9LFxuICAgIFwiMzAwQTAyQjRcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDaGFubmVsU2hpZWxkTmFtZVwifSxcbiAgICBcIjMwMEEwMkI4XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ2hhbm5lbFNoaWVsZE5vbWluYWxUaGlja25lc3NcIn0sXG4gICAgXCIzMDBBMDJCQVwiOiB7dnI6IFwiRFNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNoYW5uZWxTaGllbGROb21pbmFsVHJhbnNtaXNzaW9uXCJ9LFxuICAgIFwiMzAwQTAyQzhcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJGaW5hbEN1bXVsYXRpdmVUaW1lV2VpZ2h0XCJ9LFxuICAgIFwiMzAwQTAyRDBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJCcmFjaHlDb250cm9sUG9pbnRTZXF1ZW5jZVwifSxcbiAgICBcIjMwMEEwMkQyXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29udHJvbFBvaW50UmVsYXRpdmVQb3NpdGlvblwifSxcbiAgICBcIjMwMEEwMkQ0XCI6IHt2cjogXCJEU1wiLCB2bTogXCIzXCIsIG5hbWU6IFwiQ29udHJvbFBvaW50M0RQb3NpdGlvblwifSxcbiAgICBcIjMwMEEwMkQ2XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ3VtdWxhdGl2ZVRpbWVXZWlnaHRcIn0sXG4gICAgXCIzMDBBMDJFMFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvbXBlbnNhdG9yRGl2ZXJnZW5jZVwifSxcbiAgICBcIjMwMEEwMkUxXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ29tcGVuc2F0b3JNb3VudGluZ1Bvc2l0aW9uXCJ9LFxuICAgIFwiMzAwQTAyRTJcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIlNvdXJjZVRvQ29tcGVuc2F0b3JEaXN0YW5jZVwifSxcbiAgICBcIjMwMEEwMkUzXCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVG90YWxDb21wZW5zYXRvclRyYXlXYXRlckVxdWl2YWxlbnRUaGlja25lc3NcIn0sXG4gICAgXCIzMDBBMDJFNFwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIklzb2NlbnRlclRvQ29tcGVuc2F0b3JUcmF5RGlzdGFuY2VcIn0sXG4gICAgXCIzMDBBMDJFNVwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvbXBlbnNhdG9yQ29sdW1uT2Zmc2V0XCJ9LFxuICAgIFwiMzAwQTAyRTZcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIklzb2NlbnRlclRvQ29tcGVuc2F0b3JEaXN0YW5jZXNcIn0sXG4gICAgXCIzMDBBMDJFN1wiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvbXBlbnNhdG9yUmVsYXRpdmVTdG9wcGluZ1Bvd2VyUmF0aW9cIn0sXG4gICAgXCIzMDBBMDJFOFwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkNvbXBlbnNhdG9yTWlsbGluZ1Rvb2xEaWFtZXRlclwifSxcbiAgICBcIjMwMEEwMkVBXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW9uUmFuZ2VDb21wZW5zYXRvclNlcXVlbmNlXCJ9LFxuICAgIFwiMzAwQTAyRUJcIjoge3ZyOiBcIkxUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb21wZW5zYXRvckRlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMzAwQTAzMDJcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSYWRpYXRpb25NYXNzTnVtYmVyXCJ9LFxuICAgIFwiMzAwQTAzMDRcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSYWRpYXRpb25BdG9taWNOdW1iZXJcIn0sXG4gICAgXCIzMDBBMDMwNlwiOiB7dnI6IFwiU1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJhZGlhdGlvbkNoYXJnZVN0YXRlXCJ9LFxuICAgIFwiMzAwQTAzMDhcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTY2FuTW9kZVwifSxcbiAgICBcIjMwMEEwMzBBXCI6IHt2cjogXCJGTFwiLCB2bTogXCIyXCIsIG5hbWU6IFwiVmlydHVhbFNvdXJjZUF4aXNEaXN0YW5jZXNcIn0sXG4gICAgXCIzMDBBMDMwQ1wiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNub3V0U2VxdWVuY2VcIn0sXG4gICAgXCIzMDBBMDMwRFwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNub3V0UG9zaXRpb25cIn0sXG4gICAgXCIzMDBBMDMwRlwiOiB7dnI6IFwiU0hcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNub3V0SURcIn0sXG4gICAgXCIzMDBBMDMxMlwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk51bWJlck9mUmFuZ2VTaGlmdGVyc1wifSxcbiAgICBcIjMwMEEwMzE0XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmFuZ2VTaGlmdGVyU2VxdWVuY2VcIn0sXG4gICAgXCIzMDBBMDMxNlwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJhbmdlU2hpZnRlck51bWJlclwifSxcbiAgICBcIjMwMEEwMzE4XCI6IHt2cjogXCJTSFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmFuZ2VTaGlmdGVySURcIn0sXG4gICAgXCIzMDBBMDMyMFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJhbmdlU2hpZnRlclR5cGVcIn0sXG4gICAgXCIzMDBBMDMyMlwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJhbmdlU2hpZnRlckRlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMzAwQTAzMzBcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJOdW1iZXJPZkxhdGVyYWxTcHJlYWRpbmdEZXZpY2VzXCJ9LFxuICAgIFwiMzAwQTAzMzJcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJMYXRlcmFsU3ByZWFkaW5nRGV2aWNlU2VxdWVuY2VcIn0sXG4gICAgXCIzMDBBMDMzNFwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkxhdGVyYWxTcHJlYWRpbmdEZXZpY2VOdW1iZXJcIn0sXG4gICAgXCIzMDBBMDMzNlwiOiB7dnI6IFwiU0hcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkxhdGVyYWxTcHJlYWRpbmdEZXZpY2VJRFwifSxcbiAgICBcIjMwMEEwMzM4XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTGF0ZXJhbFNwcmVhZGluZ0RldmljZVR5cGVcIn0sXG4gICAgXCIzMDBBMDMzQVwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkxhdGVyYWxTcHJlYWRpbmdEZXZpY2VEZXNjcmlwdGlvblwifSxcbiAgICBcIjMwMEEwMzNDXCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTGF0ZXJhbFNwcmVhZGluZ0RldmljZVdhdGVyRXF1aXZhbGVudFRoaWNrbmVzc1wifSxcbiAgICBcIjMwMEEwMzQwXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTnVtYmVyT2ZSYW5nZU1vZHVsYXRvcnNcIn0sXG4gICAgXCIzMDBBMDM0MlwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJhbmdlTW9kdWxhdG9yU2VxdWVuY2VcIn0sXG4gICAgXCIzMDBBMDM0NFwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJhbmdlTW9kdWxhdG9yTnVtYmVyXCJ9LFxuICAgIFwiMzAwQTAzNDZcIjoge3ZyOiBcIlNIXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSYW5nZU1vZHVsYXRvcklEXCJ9LFxuICAgIFwiMzAwQTAzNDhcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSYW5nZU1vZHVsYXRvclR5cGVcIn0sXG4gICAgXCIzMDBBMDM0QVwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJhbmdlTW9kdWxhdG9yRGVzY3JpcHRpb25cIn0sXG4gICAgXCIzMDBBMDM0Q1wiOiB7dnI6IFwiU0hcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkJlYW1DdXJyZW50TW9kdWxhdGlvbklEXCJ9LFxuICAgIFwiMzAwQTAzNTBcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQYXRpZW50U3VwcG9ydFR5cGVcIn0sXG4gICAgXCIzMDBBMDM1MlwiOiB7dnI6IFwiU0hcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBhdGllbnRTdXBwb3J0SURcIn0sXG4gICAgXCIzMDBBMDM1NFwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBhdGllbnRTdXBwb3J0QWNjZXNzb3J5Q29kZVwifSxcbiAgICBcIjMwMEEwMzU2XCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRml4YXRpb25MaWdodEF6aW11dGhhbEFuZ2xlXCJ9LFxuICAgIFwiMzAwQTAzNThcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJGaXhhdGlvbkxpZ2h0UG9sYXJBbmdsZVwifSxcbiAgICBcIjMwMEEwMzVBXCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTWV0ZXJzZXRSYXRlXCJ9LFxuICAgIFwiMzAwQTAzNjBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSYW5nZVNoaWZ0ZXJTZXR0aW5nc1NlcXVlbmNlXCJ9LFxuICAgIFwiMzAwQTAzNjJcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSYW5nZVNoaWZ0ZXJTZXR0aW5nXCJ9LFxuICAgIFwiMzAwQTAzNjRcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJc29jZW50ZXJUb1JhbmdlU2hpZnRlckRpc3RhbmNlXCJ9LFxuICAgIFwiMzAwQTAzNjZcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSYW5nZVNoaWZ0ZXJXYXRlckVxdWl2YWxlbnRUaGlja25lc3NcIn0sXG4gICAgXCIzMDBBMDM3MFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkxhdGVyYWxTcHJlYWRpbmdEZXZpY2VTZXR0aW5nc1NlcXVlbmNlXCJ9LFxuICAgIFwiMzAwQTAzNzJcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJMYXRlcmFsU3ByZWFkaW5nRGV2aWNlU2V0dGluZ1wifSxcbiAgICBcIjMwMEEwMzc0XCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiSXNvY2VudGVyVG9MYXRlcmFsU3ByZWFkaW5nRGV2aWNlRGlzdGFuY2VcIn0sXG4gICAgXCIzMDBBMDM4MFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJhbmdlTW9kdWxhdG9yU2V0dGluZ3NTZXF1ZW5jZVwifSxcbiAgICBcIjMwMEEwMzgyXCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmFuZ2VNb2R1bGF0b3JHYXRpbmdTdGFydFZhbHVlXCJ9LFxuICAgIFwiMzAwQTAzODRcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSYW5nZU1vZHVsYXRvckdhdGluZ1N0b3BWYWx1ZVwifSxcbiAgICBcIjMwMEEwMzg2XCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmFuZ2VNb2R1bGF0b3JHYXRpbmdTdGFydFdhdGVyRXF1aXZhbGVudFRoaWNrbmVzc1wifSxcbiAgICBcIjMwMEEwMzg4XCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmFuZ2VNb2R1bGF0b3JHYXRpbmdTdG9wV2F0ZXJFcXVpdmFsZW50VGhpY2tuZXNzXCJ9LFxuICAgIFwiMzAwQTAzOEFcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJc29jZW50ZXJUb1JhbmdlTW9kdWxhdG9yRGlzdGFuY2VcIn0sXG4gICAgXCIzMDBBMDM5MFwiOiB7dnI6IFwiU0hcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNjYW5TcG90VHVuZUlEXCJ9LFxuICAgIFwiMzAwQTAzOTJcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJOdW1iZXJPZlNjYW5TcG90UG9zaXRpb25zXCJ9LFxuICAgIFwiMzAwQTAzOTRcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIlNjYW5TcG90UG9zaXRpb25NYXBcIn0sXG4gICAgXCIzMDBBMDM5NlwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiU2NhblNwb3RNZXRlcnNldFdlaWdodHNcIn0sXG4gICAgXCIzMDBBMDM5OFwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMlwiLCBuYW1lOiBcIlNjYW5uaW5nU3BvdFNpemVcIn0sXG4gICAgXCIzMDBBMDM5QVwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk51bWJlck9mUGFpbnRpbmdzXCJ9LFxuICAgIFwiMzAwQTAzQTBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJb25Ub2xlcmFuY2VUYWJsZVNlcXVlbmNlXCJ9LFxuICAgIFwiMzAwQTAzQTJcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJb25CZWFtU2VxdWVuY2VcIn0sXG4gICAgXCIzMDBBMDNBNFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIklvbkJlYW1MaW1pdGluZ0RldmljZVNlcXVlbmNlXCJ9LFxuICAgIFwiMzAwQTAzQTZcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJb25CbG9ja1NlcXVlbmNlXCJ9LFxuICAgIFwiMzAwQTAzQThcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJb25Db250cm9sUG9pbnRTZXF1ZW5jZVwifSxcbiAgICBcIjMwMEEwM0FBXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW9uV2VkZ2VTZXF1ZW5jZVwifSxcbiAgICBcIjMwMEEwM0FDXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW9uV2VkZ2VQb3NpdGlvblNlcXVlbmNlXCJ9LFxuICAgIFwiMzAwQTA0MDFcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWZlcmVuY2VkU2V0dXBJbWFnZVNlcXVlbmNlXCJ9LFxuICAgIFwiMzAwQTA0MDJcIjoge3ZyOiBcIlNUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTZXR1cEltYWdlQ29tbWVudFwifSxcbiAgICBcIjMwMEEwNDEwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTW90aW9uU3luY2hyb25pemF0aW9uU2VxdWVuY2VcIn0sXG4gICAgXCIzMDBBMDQxMlwiOiB7dnI6IFwiRkxcIiwgdm06IFwiM1wiLCBuYW1lOiBcIkNvbnRyb2xQb2ludE9yaWVudGF0aW9uXCJ9LFxuICAgIFwiMzAwQTA0MjBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJHZW5lcmFsQWNjZXNzb3J5U2VxdWVuY2VcIn0sXG4gICAgXCIzMDBBMDQyMVwiOiB7dnI6IFwiU0hcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkdlbmVyYWxBY2Nlc3NvcnlJRFwifSxcbiAgICBcIjMwMEEwNDIyXCI6IHt2cjogXCJTVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiR2VuZXJhbEFjY2Vzc29yeURlc2NyaXB0aW9uXCJ9LFxuICAgIFwiMzAwQTA0MjNcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJHZW5lcmFsQWNjZXNzb3J5VHlwZVwifSxcbiAgICBcIjMwMEEwNDI0XCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiR2VuZXJhbEFjY2Vzc29yeU51bWJlclwifSxcbiAgICBcIjMwMEEwNDMxXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQXBwbGljYXRvckdlb21ldHJ5U2VxdWVuY2VcIn0sXG4gICAgXCIzMDBBMDQzMlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFwcGxpY2F0b3JBcGVydHVyZVNoYXBlXCJ9LFxuICAgIFwiMzAwQTA0MzNcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBcHBsaWNhdG9yT3BlbmluZ1wifSxcbiAgICBcIjMwMEEwNDM0XCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQXBwbGljYXRvck9wZW5pbmdYXCJ9LFxuICAgIFwiMzAwQTA0MzVcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBcHBsaWNhdG9yT3BlbmluZ1lcIn0sXG4gICAgXCIzMDBBMDQzNlwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNvdXJjZVRvQXBwbGljYXRvck1vdW50aW5nUG9zaXRpb25EaXN0YW5jZVwifSxcbiAgICBcIjMwMEMwMDAyXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJlbmNlZFJUUGxhblNlcXVlbmNlXCJ9LFxuICAgIFwiMzAwQzAwMDRcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWZlcmVuY2VkQmVhbVNlcXVlbmNlXCJ9LFxuICAgIFwiMzAwQzAwMDZcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWZlcmVuY2VkQmVhbU51bWJlclwifSxcbiAgICBcIjMwMEMwMDA3XCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJlbmNlZFJlZmVyZW5jZUltYWdlTnVtYmVyXCJ9LFxuICAgIFwiMzAwQzAwMDhcIjoge3ZyOiBcIkRTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTdGFydEN1bXVsYXRpdmVNZXRlcnNldFdlaWdodFwifSxcbiAgICBcIjMwMEMwMDA5XCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiRW5kQ3VtdWxhdGl2ZU1ldGVyc2V0V2VpZ2h0XCJ9LFxuICAgIFwiMzAwQzAwMEFcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWZlcmVuY2VkQnJhY2h5QXBwbGljYXRpb25TZXR1cFNlcXVlbmNlXCJ9LFxuICAgIFwiMzAwQzAwMENcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWZlcmVuY2VkQnJhY2h5QXBwbGljYXRpb25TZXR1cE51bWJlclwifSxcbiAgICBcIjMwMEMwMDBFXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJlbmNlZFNvdXJjZU51bWJlclwifSxcbiAgICBcIjMwMEMwMDIwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJlbmNlZEZyYWN0aW9uR3JvdXBTZXF1ZW5jZVwifSxcbiAgICBcIjMwMEMwMDIyXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJlbmNlZEZyYWN0aW9uR3JvdXBOdW1iZXJcIn0sXG4gICAgXCIzMDBDMDA0MFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZmVyZW5jZWRWZXJpZmljYXRpb25JbWFnZVNlcXVlbmNlXCJ9LFxuICAgIFwiMzAwQzAwNDJcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWZlcmVuY2VkUmVmZXJlbmNlSW1hZ2VTZXF1ZW5jZVwifSxcbiAgICBcIjMwMEMwMDUwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJlbmNlZERvc2VSZWZlcmVuY2VTZXF1ZW5jZVwifSxcbiAgICBcIjMwMEMwMDUxXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJlbmNlZERvc2VSZWZlcmVuY2VOdW1iZXJcIn0sXG4gICAgXCIzMDBDMDA1NVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkJyYWNoeVJlZmVyZW5jZWREb3NlUmVmZXJlbmNlU2VxdWVuY2VcIn0sXG4gICAgXCIzMDBDMDA2MFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZmVyZW5jZWRTdHJ1Y3R1cmVTZXRTZXF1ZW5jZVwifSxcbiAgICBcIjMwMEMwMDZBXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJlbmNlZFBhdGllbnRTZXR1cE51bWJlclwifSxcbiAgICBcIjMwMEMwMDgwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJlbmNlZERvc2VTZXF1ZW5jZVwifSxcbiAgICBcIjMwMEMwMEEwXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJlbmNlZFRvbGVyYW5jZVRhYmxlTnVtYmVyXCJ9LFxuICAgIFwiMzAwQzAwQjBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWZlcmVuY2VkQm9sdXNTZXF1ZW5jZVwifSxcbiAgICBcIjMwMEMwMEMwXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJlbmNlZFdlZGdlTnVtYmVyXCJ9LFxuICAgIFwiMzAwQzAwRDBcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWZlcmVuY2VkQ29tcGVuc2F0b3JOdW1iZXJcIn0sXG4gICAgXCIzMDBDMDBFMFwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZmVyZW5jZWRCbG9ja051bWJlclwifSxcbiAgICBcIjMwMEMwMEYwXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJlbmNlZENvbnRyb2xQb2ludEluZGV4XCJ9LFxuICAgIFwiMzAwQzAwRjJcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWZlcmVuY2VkQ29udHJvbFBvaW50U2VxdWVuY2VcIn0sXG4gICAgXCIzMDBDMDBGNFwiOiB7dnI6IFwiSVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZmVyZW5jZWRTdGFydENvbnRyb2xQb2ludEluZGV4XCJ9LFxuICAgIFwiMzAwQzAwRjZcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWZlcmVuY2VkU3RvcENvbnRyb2xQb2ludEluZGV4XCJ9LFxuICAgIFwiMzAwQzAxMDBcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWZlcmVuY2VkUmFuZ2VTaGlmdGVyTnVtYmVyXCJ9LFxuICAgIFwiMzAwQzAxMDJcIjoge3ZyOiBcIklTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZWZlcmVuY2VkTGF0ZXJhbFNwcmVhZGluZ0RldmljZU51bWJlclwifSxcbiAgICBcIjMwMEMwMTA0XCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJlbmNlZFJhbmdlTW9kdWxhdG9yTnVtYmVyXCJ9LFxuICAgIFwiMzAwRTAwMDJcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBcHByb3ZhbFN0YXR1c1wifSxcbiAgICBcIjMwMEUwMDA0XCI6IHt2cjogXCJEQVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmV2aWV3RGF0ZVwifSxcbiAgICBcIjMwMEUwMDA1XCI6IHt2cjogXCJUTVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmV2aWV3VGltZVwifSxcbiAgICBcIjMwMEUwMDA4XCI6IHt2cjogXCJQTlwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmV2aWV3ZXJOYW1lXCJ9LFxuICAgIFwiNDAwMDAwMTBcIjoge3ZyOiBcIkxUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBcmJpdHJhcnlcIn0sXG4gICAgXCI0MDAwNDAwMFwiOiB7dnI6IFwiTFRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRleHRDb21tZW50c1wifSxcbiAgICBcIjQwMDgwMDQwXCI6IHt2cjogXCJTSFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVzdWx0c0lEXCJ9LFxuICAgIFwiNDAwODAwNDJcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZXN1bHRzSURJc3N1ZXJcIn0sXG4gICAgXCI0MDA4MDA1MFwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJlZmVyZW5jZWRJbnRlcnByZXRhdGlvblNlcXVlbmNlXCJ9LFxuICAgIFwiNDAwODAwRkZcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZXBvcnRQcm9kdWN0aW9uU3RhdHVzVHJpYWxcIn0sXG4gICAgXCI0MDA4MDEwMFwiOiB7dnI6IFwiREFcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkludGVycHJldGF0aW9uUmVjb3JkZWREYXRlXCJ9LFxuICAgIFwiNDAwODAxMDFcIjoge3ZyOiBcIlRNXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbnRlcnByZXRhdGlvblJlY29yZGVkVGltZVwifSxcbiAgICBcIjQwMDgwMTAyXCI6IHt2cjogXCJQTlwiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW50ZXJwcmV0YXRpb25SZWNvcmRlclwifSxcbiAgICBcIjQwMDgwMTAzXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUmVmZXJlbmNlVG9SZWNvcmRlZFNvdW5kXCJ9LFxuICAgIFwiNDAwODAxMDhcIjoge3ZyOiBcIkRBXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbnRlcnByZXRhdGlvblRyYW5zY3JpcHRpb25EYXRlXCJ9LFxuICAgIFwiNDAwODAxMDlcIjoge3ZyOiBcIlRNXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbnRlcnByZXRhdGlvblRyYW5zY3JpcHRpb25UaW1lXCJ9LFxuICAgIFwiNDAwODAxMEFcIjoge3ZyOiBcIlBOXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbnRlcnByZXRhdGlvblRyYW5zY3JpYmVyXCJ9LFxuICAgIFwiNDAwODAxMEJcIjoge3ZyOiBcIlNUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbnRlcnByZXRhdGlvblRleHRcIn0sXG4gICAgXCI0MDA4MDEwQ1wiOiB7dnI6IFwiUE5cIiwgdm06IFwiMVwiLCBuYW1lOiBcIkludGVycHJldGF0aW9uQXV0aG9yXCJ9LFxuICAgIFwiNDAwODAxMTFcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbnRlcnByZXRhdGlvbkFwcHJvdmVyU2VxdWVuY2VcIn0sXG4gICAgXCI0MDA4MDExMlwiOiB7dnI6IFwiREFcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkludGVycHJldGF0aW9uQXBwcm92YWxEYXRlXCJ9LFxuICAgIFwiNDAwODAxMTNcIjoge3ZyOiBcIlRNXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbnRlcnByZXRhdGlvbkFwcHJvdmFsVGltZVwifSxcbiAgICBcIjQwMDgwMTE0XCI6IHt2cjogXCJQTlwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGh5c2ljaWFuQXBwcm92aW5nSW50ZXJwcmV0YXRpb25cIn0sXG4gICAgXCI0MDA4MDExNVwiOiB7dnI6IFwiTFRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkludGVycHJldGF0aW9uRGlhZ25vc2lzRGVzY3JpcHRpb25cIn0sXG4gICAgXCI0MDA4MDExN1wiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkludGVycHJldGF0aW9uRGlhZ25vc2lzQ29kZVNlcXVlbmNlXCJ9LFxuICAgIFwiNDAwODAxMThcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSZXN1bHRzRGlzdHJpYnV0aW9uTGlzdFNlcXVlbmNlXCJ9LFxuICAgIFwiNDAwODAxMTlcIjoge3ZyOiBcIlBOXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEaXN0cmlidXRpb25OYW1lXCJ9LFxuICAgIFwiNDAwODAxMUFcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEaXN0cmlidXRpb25BZGRyZXNzXCJ9LFxuICAgIFwiNDAwODAyMDBcIjoge3ZyOiBcIlNIXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbnRlcnByZXRhdGlvbklEXCJ9LFxuICAgIFwiNDAwODAyMDJcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbnRlcnByZXRhdGlvbklESXNzdWVyXCJ9LFxuICAgIFwiNDAwODAyMTBcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbnRlcnByZXRhdGlvblR5cGVJRFwifSxcbiAgICBcIjQwMDgwMjEyXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW50ZXJwcmV0YXRpb25TdGF0dXNJRFwifSxcbiAgICBcIjQwMDgwMzAwXCI6IHt2cjogXCJTVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiSW1wcmVzc2lvbnNcIn0sXG4gICAgXCI0MDA4NDAwMFwiOiB7dnI6IFwiU1RcIiwgdm06IFwiMSBcIiwgbmFtZTogXCJSZXN1bHRzQ29tbWVudHNcIn0sXG4gICAgXCI0MDEwMDAwMVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkxvd0VuZXJneURldGVjdG9yc1wifSxcbiAgICBcIjQwMTAwMDAyXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiSGlnaEVuZXJneURldGVjdG9yc1wifSxcbiAgICBcIjQwMTAwMDA0XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGV0ZWN0b3JHZW9tZXRyeVNlcXVlbmNlXCJ9LFxuICAgIFwiNDAxMDEwMDFcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUaHJlYXRST0lWb3hlbFNlcXVlbmNlXCJ9LFxuICAgIFwiNDAxMDEwMDRcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjNcIiwgbmFtZTogXCJUaHJlYXRST0lCYXNlXCJ9LFxuICAgIFwiNDAxMDEwMDVcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjNcIiwgbmFtZTogXCJUaHJlYXRST0lFeHRlbnRzXCJ9LFxuICAgIFwiNDAxMDEwMDZcIjoge3ZyOiBcIk9CXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUaHJlYXRST0lCaXRtYXBcIn0sXG4gICAgXCI0MDEwMTAwN1wiOiB7dnI6IFwiU0hcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJvdXRlU2VnbWVudElEXCJ9LFxuICAgIFwiNDAxMDEwMDhcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJHYW50cnlUeXBlXCJ9LFxuICAgIFwiNDAxMDEwMDlcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJPT0lPd25lclR5cGVcIn0sXG4gICAgXCI0MDEwMTAwQVwiOiB7dnI6IFwiU1FcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJvdXRlU2VnbWVudFNlcXVlbmNlXCJ9LFxuICAgIFwiNDAxMDEwMTBcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQb3RlbnRpYWxUaHJlYXRPYmplY3RJRFwifSxcbiAgICBcIjQwMTAxMDExXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiVGhyZWF0U2VxdWVuY2VcIn0sXG4gICAgXCI0MDEwMTAxMlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRocmVhdENhdGVnb3J5XCJ9LFxuICAgIFwiNDAxMDEwMTNcIjoge3ZyOiBcIkxUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUaHJlYXRDYXRlZ29yeURlc2NyaXB0aW9uXCJ9LFxuICAgIFwiNDAxMDEwMTRcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBVERBYmlsaXR5QXNzZXNzbWVudFwifSxcbiAgICBcIjQwMTAxMDE1XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQVREQXNzZXNzbWVudEZsYWdcIn0sXG4gICAgXCI0MDEwMTAxNlwiOiB7dnI6IFwiRkxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFUREFzc2Vzc21lbnRQcm9iYWJpbGl0eVwifSxcbiAgICBcIjQwMTAxMDE3XCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTWFzc1wifSxcbiAgICBcIjQwMTAxMDE4XCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiRGVuc2l0eVwifSxcbiAgICBcIjQwMTAxMDE5XCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiWkVmZmVjdGl2ZVwifSxcbiAgICBcIjQwMTAxMDFBXCI6IHt2cjogXCJTSFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQm9hcmRpbmdQYXNzSURcIn0sXG4gICAgXCI0MDEwMTAxQlwiOiB7dnI6IFwiRkxcIiwgdm06IFwiM1wiLCBuYW1lOiBcIkNlbnRlck9mTWFzc1wifSxcbiAgICBcIjQwMTAxMDFDXCI6IHt2cjogXCJGTFwiLCB2bTogXCIzXCIsIG5hbWU6IFwiQ2VudGVyT2ZQVE9cIn0sXG4gICAgXCI0MDEwMTAxRFwiOiB7dnI6IFwiRkxcIiwgdm06IFwiNi1uXCIsIG5hbWU6IFwiQm91bmRpbmdQb2x5Z29uXCJ9LFxuICAgIFwiNDAxMDEwMUVcIjoge3ZyOiBcIlNIXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSb3V0ZVNlZ21lbnRTdGFydExvY2F0aW9uSURcIn0sXG4gICAgXCI0MDEwMTAxRlwiOiB7dnI6IFwiU0hcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJvdXRlU2VnbWVudEVuZExvY2F0aW9uSURcIn0sXG4gICAgXCI0MDEwMTAyMFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJvdXRlU2VnbWVudExvY2F0aW9uSURUeXBlXCJ9LFxuICAgIFwiNDAxMDEwMjFcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIkFib3J0UmVhc29uXCJ9LFxuICAgIFwiNDAxMDEwMjNcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJWb2x1bWVPZlBUT1wifSxcbiAgICBcIjQwMTAxMDI0XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQWJvcnRGbGFnXCJ9LFxuICAgIFwiNDAxMDEwMjVcIjoge3ZyOiBcIkRUXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJSb3V0ZVNlZ21lbnRTdGFydFRpbWVcIn0sXG4gICAgXCI0MDEwMTAyNlwiOiB7dnI6IFwiRFRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJvdXRlU2VnbWVudEVuZFRpbWVcIn0sXG4gICAgXCI0MDEwMTAyN1wiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlREUlR5cGVcIn0sXG4gICAgXCI0MDEwMTAyOFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkludGVybmF0aW9uYWxSb3V0ZVNlZ21lbnRcIn0sXG4gICAgXCI0MDEwMTAyOVwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiVGhyZWF0RGV0ZWN0aW9uQWxnb3JpdGhtYW5kVmVyc2lvblwifSxcbiAgICBcIjQwMTAxMDJBXCI6IHt2cjogXCJTSFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQXNzaWduZWRMb2NhdGlvblwifSxcbiAgICBcIjQwMTAxMDJCXCI6IHt2cjogXCJEVFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQWxhcm1EZWNpc2lvblRpbWVcIn0sXG4gICAgXCI0MDEwMTAzMVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkFsYXJtRGVjaXNpb25cIn0sXG4gICAgXCI0MDEwMTAzM1wiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk51bWJlck9mVG90YWxPYmplY3RzXCJ9LFxuICAgIFwiNDAxMDEwMzRcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJOdW1iZXJPZkFsYXJtT2JqZWN0c1wifSxcbiAgICBcIjQwMTAxMDM3XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUFRPUmVwcmVzZW50YXRpb25TZXF1ZW5jZVwifSxcbiAgICBcIjQwMTAxMDM4XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQVREQXNzZXNzbWVudFNlcXVlbmNlXCJ9LFxuICAgIFwiNDAxMDEwMzlcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUSVBUeXBlXCJ9LFxuICAgIFwiNDAxMDEwM0FcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJESUNPU1ZlcnNpb25cIn0sXG4gICAgXCI0MDEwMTA0MVwiOiB7dnI6IFwiRFRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk9PSU93bmVyQ3JlYXRpb25UaW1lXCJ9LFxuICAgIFwiNDAxMDEwNDJcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJPT0lUeXBlXCJ9LFxuICAgIFwiNDAxMDEwNDNcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjNcIiwgbmFtZTogXCJPT0lTaXplXCJ9LFxuICAgIFwiNDAxMDEwNDRcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBY3F1aXNpdGlvblN0YXR1c1wifSxcbiAgICBcIjQwMTAxMDQ1XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQmFzaXNNYXRlcmlhbHNDb2RlU2VxdWVuY2VcIn0sXG4gICAgXCI0MDEwMTA0NlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlBoYW50b21UeXBlXCJ9LFxuICAgIFwiNDAxMDEwNDdcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJPT0lPd25lclNlcXVlbmNlXCJ9LFxuICAgIFwiNDAxMDEwNDhcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJTY2FuVHlwZVwifSxcbiAgICBcIjQwMTAxMDUxXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiSXRpbmVyYXJ5SURcIn0sXG4gICAgXCI0MDEwMTA1MlwiOiB7dnI6IFwiU0hcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkl0aW5lcmFyeUlEVHlwZVwifSxcbiAgICBcIjQwMTAxMDUzXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiSXRpbmVyYXJ5SURBc3NpZ25pbmdBdXRob3JpdHlcIn0sXG4gICAgXCI0MDEwMTA1NFwiOiB7dnI6IFwiU0hcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJvdXRlSURcIn0sXG4gICAgXCI0MDEwMTA1NVwiOiB7dnI6IFwiU0hcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlJvdXRlSURBc3NpZ25pbmdBdXRob3JpdHlcIn0sXG4gICAgXCI0MDEwMTA1NlwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkluYm91bmRBcnJpdmFsVHlwZVwifSxcbiAgICBcIjQwMTAxMDU4XCI6IHt2cjogXCJTSFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ2FycmllcklEXCJ9LFxuICAgIFwiNDAxMDEwNTlcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDYXJyaWVySURBc3NpZ25pbmdBdXRob3JpdHlcIn0sXG4gICAgXCI0MDEwMTA2MFwiOiB7dnI6IFwiRkxcIiwgdm06IFwiM1wiLCBuYW1lOiBcIlNvdXJjZU9yaWVudGF0aW9uXCJ9LFxuICAgIFwiNDAxMDEwNjFcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjNcIiwgbmFtZTogXCJTb3VyY2VQb3NpdGlvblwifSxcbiAgICBcIjQwMTAxMDYyXCI6IHt2cjogXCJGTFwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQmVsdEhlaWdodFwifSxcbiAgICBcIjQwMTAxMDY0XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQWxnb3JpdGhtUm91dGluZ0NvZGVTZXF1ZW5jZVwifSxcbiAgICBcIjQwMTAxMDY3XCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiVHJhbnNwb3J0Q2xhc3NpZmljYXRpb25cIn0sXG4gICAgXCI0MDEwMTA2OFwiOiB7dnI6IFwiTFRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk9PSVR5cGVEZXNjcmlwdG9yXCJ9LFxuICAgIFwiNDAxMDEwNjlcIjoge3ZyOiBcIkZMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUb3RhbFByb2Nlc3NpbmdUaW1lXCJ9LFxuICAgIFwiNDAxMDEwNkNcIjoge3ZyOiBcIk9CXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEZXRlY3RvckNhbGlicmF0aW9uRGF0YVwifSxcbiAgICBcIjRGRkUwMDAxXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiTUFDUGFyYW1ldGVyc1NlcXVlbmNlXCJ9LFxuICAgIFwiNTB4eDAwMDVcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDdXJ2ZURpbWVuc2lvbnNcIn0sXG4gICAgXCI1MHh4MDAxMFwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk51bWJlck9mUG9pbnRzXCJ9LFxuICAgIFwiNTB4eDAwMjBcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJUeXBlT2ZEYXRhXCJ9LFxuICAgIFwiNTB4eDAwMjJcIjoge3ZyOiBcIkxPXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDdXJ2ZURlc2NyaXB0aW9uXCJ9LFxuICAgIFwiNTB4eDAwMzBcIjoge3ZyOiBcIlNIXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIkF4aXNVbml0c1wifSxcbiAgICBcIjUweHgwMDQwXCI6IHt2cjogXCJTSFwiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJBeGlzTGFiZWxzXCJ9LFxuICAgIFwiNTB4eDAxMDNcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEYXRhVmFsdWVSZXByZXNlbnRhdGlvblwifSxcbiAgICBcIjUweHgwMTA0XCI6IHt2cjogXCJVU1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJNaW5pbXVtQ29vcmRpbmF0ZVZhbHVlXCJ9LFxuICAgIFwiNTB4eDAxMDVcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIk1heGltdW1Db29yZGluYXRlVmFsdWVcIn0sXG4gICAgXCI1MHh4MDEwNlwiOiB7dnI6IFwiU0hcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiQ3VydmVSYW5nZVwifSxcbiAgICBcIjUweHgwMTEwXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJDdXJ2ZURhdGFEZXNjcmlwdG9yXCJ9LFxuICAgIFwiNTB4eDAxMTJcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIkNvb3JkaW5hdGVTdGFydFZhbHVlXCJ9LFxuICAgIFwiNTB4eDAxMTRcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIkNvb3JkaW5hdGVTdGVwVmFsdWVcIn0sXG4gICAgXCI1MHh4MTAwMVwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkN1cnZlQWN0aXZhdGlvbkxheWVyXCJ9LFxuICAgIFwiNTB4eDIwMDBcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJBdWRpb1R5cGVcIn0sXG4gICAgXCI1MHh4MjAwMlwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkF1ZGlvU2FtcGxlRm9ybWF0XCJ9LFxuICAgIFwiNTB4eDIwMDRcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJOdW1iZXJPZkNoYW5uZWxzXCJ9LFxuICAgIFwiNTB4eDIwMDZcIjoge3ZyOiBcIlVMXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJOdW1iZXJPZlNhbXBsZXNcIn0sXG4gICAgXCI1MHh4MjAwOFwiOiB7dnI6IFwiVUxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNhbXBsZVJhdGVcIn0sXG4gICAgXCI1MHh4MjAwQVwiOiB7dnI6IFwiVUxcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlRvdGFsVGltZVwifSxcbiAgICBcIjUweHgyMDBDXCI6IHt2cjogXCJPV3xPQlwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQXVkaW9TYW1wbGVEYXRhXCJ9LFxuICAgIFwiNTB4eDIwMEVcIjoge3ZyOiBcIkxUXCIsIHZtOiBcIjEgXCIsIG5hbWU6IFwiQXVkaW9Db21tZW50c1wifSxcbiAgICBcIjUweHgyNTAwXCI6IHt2cjogXCJMT1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ3VydmVMYWJlbFwifSxcbiAgICBcIjUweHgyNjAwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ3VydmVSZWZlcmVuY2VkT3ZlcmxheVNlcXVlbmNlXCJ9LFxuICAgIFwiNTB4eDI2MTBcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDdXJ2ZVJlZmVyZW5jZWRPdmVybGF5R3JvdXBcIn0sXG4gICAgXCI1MHh4MzAwMFwiOiB7dnI6IFwiT1d8T0JcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkN1cnZlRGF0YVwifSxcbiAgICBcIjUyMDA5MjI5XCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2hhcmVkRnVuY3Rpb25hbEdyb3Vwc1NlcXVlbmNlXCJ9LFxuICAgIFwiNTIwMDkyMzBcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJQZXJGcmFtZUZ1bmN0aW9uYWxHcm91cHNTZXF1ZW5jZVwifSxcbiAgICBcIjU0MDAwMTAwXCI6IHt2cjogXCJTUVwiLCB2bTogXCIxXCIsIG5hbWU6IFwiV2F2ZWZvcm1TZXF1ZW5jZVwifSxcbiAgICBcIjU0MDAwMTEwXCI6IHt2cjogXCJPQnxPV1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ2hhbm5lbE1pbmltdW1WYWx1ZVwifSxcbiAgICBcIjU0MDAwMTEyXCI6IHt2cjogXCJPQnxPV1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiQ2hhbm5lbE1heGltdW1WYWx1ZVwifSxcbiAgICBcIjU0MDAxMDA0XCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiV2F2ZWZvcm1CaXRzQWxsb2NhdGVkXCJ9LFxuICAgIFwiNTQwMDEwMDZcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJXYXZlZm9ybVNhbXBsZUludGVycHJldGF0aW9uXCJ9LFxuICAgIFwiNTQwMDEwMEFcIjoge3ZyOiBcIk9CfE9XXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJXYXZlZm9ybVBhZGRpbmdWYWx1ZVwifSxcbiAgICBcIjU0MDAxMDEwXCI6IHt2cjogXCJPQnxPV1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiV2F2ZWZvcm1EYXRhXCJ9LFxuICAgIFwiNTYwMDAwMTBcIjoge3ZyOiBcIk9GXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJGaXJzdE9yZGVyUGhhc2VDb3JyZWN0aW9uQW5nbGVcIn0sXG4gICAgXCI1NjAwMDAyMFwiOiB7dnI6IFwiT0ZcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlNwZWN0cm9zY29weURhdGFcIn0sXG4gICAgXCI2MHh4MDAxMFwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk92ZXJsYXlSb3dzXCJ9LFxuICAgIFwiNjB4eDAwMTFcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJPdmVybGF5Q29sdW1uc1wifSxcbiAgICBcIjYweHgwMDEyXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiT3ZlcmxheVBsYW5lc1wifSxcbiAgICBcIjYweHgwMDE1XCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiTnVtYmVyT2ZGcmFtZXNJbk92ZXJsYXlcIn0sXG4gICAgXCI2MHh4MDAyMlwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIk92ZXJsYXlEZXNjcmlwdGlvblwifSxcbiAgICBcIjYweHgwMDQwXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiT3ZlcmxheVR5cGVcIn0sXG4gICAgXCI2MHh4MDA0NVwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIk92ZXJsYXlTdWJ0eXBlXCJ9LFxuICAgIFwiNjB4eDAwNTBcIjoge3ZyOiBcIlNTXCIsIHZtOiBcIjJcIiwgbmFtZTogXCJPdmVybGF5T3JpZ2luXCJ9LFxuICAgIFwiNjB4eDAwNTFcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJJbWFnZUZyYW1lT3JpZ2luXCJ9LFxuICAgIFwiNjB4eDAwNTJcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJPdmVybGF5UGxhbmVPcmlnaW5cIn0sXG4gICAgXCI2MHh4MDA2MFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk92ZXJsYXlDb21wcmVzc2lvbkNvZGVcIn0sXG4gICAgXCI2MHh4MDA2MVwiOiB7dnI6IFwiU0hcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk92ZXJsYXlDb21wcmVzc2lvbk9yaWdpbmF0b3JcIn0sXG4gICAgXCI2MHh4MDA2MlwiOiB7dnI6IFwiU0hcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk92ZXJsYXlDb21wcmVzc2lvbkxhYmVsXCJ9LFxuICAgIFwiNjB4eDAwNjNcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJPdmVybGF5Q29tcHJlc3Npb25EZXNjcmlwdGlvblwifSxcbiAgICBcIjYweHgwMDY2XCI6IHt2cjogXCJBVFwiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJPdmVybGF5Q29tcHJlc3Npb25TdGVwUG9pbnRlcnNcIn0sXG4gICAgXCI2MHh4MDA2OFwiOiB7dnI6IFwiVVNcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk92ZXJsYXlSZXBlYXRJbnRlcnZhbFwifSxcbiAgICBcIjYweHgwMDY5XCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiT3ZlcmxheUJpdHNHcm91cGVkXCJ9LFxuICAgIFwiNjB4eDAxMDBcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJPdmVybGF5Qml0c0FsbG9jYXRlZFwifSxcbiAgICBcIjYweHgwMTAyXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiT3ZlcmxheUJpdFBvc2l0aW9uXCJ9LFxuICAgIFwiNjB4eDAxMTBcIjoge3ZyOiBcIkNTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJPdmVybGF5Rm9ybWF0XCJ9LFxuICAgIFwiNjB4eDAyMDBcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJPdmVybGF5TG9jYXRpb25cIn0sXG4gICAgXCI2MHh4MDgwMFwiOiB7dnI6IFwiQ1NcIiwgdm06IFwiMS1uXCIsIG5hbWU6IFwiT3ZlcmxheUNvZGVMYWJlbFwifSxcbiAgICBcIjYweHgwODAyXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiT3ZlcmxheU51bWJlck9mVGFibGVzXCJ9LFxuICAgIFwiNjB4eDA4MDNcIjoge3ZyOiBcIkFUXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIk92ZXJsYXlDb2RlVGFibGVMb2NhdGlvblwifSxcbiAgICBcIjYweHgwODA0XCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiT3ZlcmxheUJpdHNGb3JDb2RlV29yZFwifSxcbiAgICBcIjYweHgxMDAxXCI6IHt2cjogXCJDU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiT3ZlcmxheUFjdGl2YXRpb25MYXllclwifSxcbiAgICBcIjYweHgxMTAwXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiT3ZlcmxheURlc2NyaXB0b3JHcmF5XCJ9LFxuICAgIFwiNjB4eDExMDFcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJPdmVybGF5RGVzY3JpcHRvclJlZFwifSxcbiAgICBcIjYweHgxMTAyXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiT3ZlcmxheURlc2NyaXB0b3JHcmVlblwifSxcbiAgICBcIjYweHgxMTAzXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiT3ZlcmxheURlc2NyaXB0b3JCbHVlXCJ9LFxuICAgIFwiNjB4eDEyMDBcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIk92ZXJsYXlzR3JheVwifSxcbiAgICBcIjYweHgxMjAxXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJPdmVybGF5c1JlZFwifSxcbiAgICBcIjYweHgxMjAyXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxLW5cIiwgbmFtZTogXCJPdmVybGF5c0dyZWVuXCJ9LFxuICAgIFwiNjB4eDEyMDNcIjoge3ZyOiBcIlVTXCIsIHZtOiBcIjEtblwiLCBuYW1lOiBcIk92ZXJsYXlzQmx1ZVwifSxcbiAgICBcIjYweHgxMzAxXCI6IHt2cjogXCJJU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUk9JQXJlYVwifSxcbiAgICBcIjYweHgxMzAyXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUk9JTWVhblwifSxcbiAgICBcIjYweHgxMzAzXCI6IHt2cjogXCJEU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiUk9JU3RhbmRhcmREZXZpYXRpb25cIn0sXG4gICAgXCI2MHh4MTUwMFwiOiB7dnI6IFwiTE9cIiwgdm06IFwiMVwiLCBuYW1lOiBcIk92ZXJsYXlMYWJlbFwifSxcbiAgICBcIjYweHgzMDAwXCI6IHt2cjogXCJPQnxPV1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiT3ZlcmxheURhdGFcIn0sXG4gICAgXCI2MHh4NDAwMFwiOiB7dnI6IFwiTFRcIiwgdm06IFwiMVwiLCBuYW1lOiBcIk92ZXJsYXlDb21tZW50c1wifSxcbiAgICBcIjdGRTAwMDEwXCI6IHt2cjogXCJPV3xPQlwiLCB2bTogXCIxXCIsIG5hbWU6IFwiUGl4ZWxEYXRhXCJ9LFxuICAgIFwiN0ZFMDAwMjBcIjoge3ZyOiBcIk9XXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb2VmZmljaWVudHNTRFZOXCJ9LFxuICAgIFwiN0ZFMDAwMzBcIjoge3ZyOiBcIk9XXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb2VmZmljaWVudHNTREhOXCJ9LFxuICAgIFwiN0ZFMDAwNDBcIjoge3ZyOiBcIk9XXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJDb2VmZmljaWVudHNTREROXCJ9LFxuICAgIFwiN0Z4eDAwMTBcIjoge3ZyOiBcIk9XfE9CXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJWYXJpYWJsZVBpeGVsRGF0YVwifSxcbiAgICBcIjdGeHgwMDExXCI6IHt2cjogXCJVU1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiVmFyaWFibGVOZXh0RGF0YUdyb3VwXCJ9LFxuICAgIFwiN0Z4eDAwMjBcIjoge3ZyOiBcIk9XXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJWYXJpYWJsZUNvZWZmaWNpZW50c1NEVk5cIn0sXG4gICAgXCI3Rnh4MDAzMFwiOiB7dnI6IFwiT1dcIiwgdm06IFwiMVwiLCBuYW1lOiBcIlZhcmlhYmxlQ29lZmZpY2llbnRzU0RITlwifSxcbiAgICBcIjdGeHgwMDQwXCI6IHt2cjogXCJPV1wiLCB2bTogXCIxXCIsIG5hbWU6IFwiVmFyaWFibGVDb2VmZmljaWVudHNTREROXCJ9LFxuICAgIFwiRkZGQUZGRkFcIjoge3ZyOiBcIlNRXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEaWdpdGFsU2lnbmF0dXJlc1NlcXVlbmNlXCJ9LFxuICAgIFwiRkZGQ0ZGRkNcIjoge3ZyOiBcIk9CXCIsIHZtOiBcIjFcIiwgbmFtZTogXCJEYXRhU2V0VHJhaWxpbmdQYWRkaW5nXCJ9LFxuICAgIFwiRkZGRUUwMDBcIjoge3ZyOiBcIlwiLCB2bTogXCIxXCIsIG5hbWU6IFwiSXRlbVwifSxcbiAgICBcIkZGRkVFMDBEXCI6IHt2cjogXCJcIiwgdm06IFwiMVwiLCBuYW1lOiBcIkl0ZW1EZWxpbWl0YXRpb25JdGVtXCJ9LFxuICAgIFwiRkZGRUUwRERcIjoge3ZyOiBcIlwiLCB2bTogXCIxXCIsIG5hbWU6IFwiU2VxdWVuY2VEZWxpbWl0YXRpb25JdGVtXCJ9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBkYXRhRWxlbWVudHM6IGRhdGFFbGVtZW50c1xufTsiLCIvKipcbiAqIEF1dGhvciAgOiBSYW1lc2ggUlxuICogQ3JlYXRlZCA6IDcvMTIvMjAxNSAyOjM0IFBNXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKiBUaGlzIGZpbGUgaXMgc3ViamVjdCB0byB0aGUgdGVybXMgYW5kIGNvbmRpdGlvbnMgZGVmaW5lZCBpblxuICogZmlsZSAnTElDRU5TRScsIHdoaWNoIGlzIHBhcnQgb2YgdGhpcyBzb3VyY2UgY29kZSBwYWNrYWdlLlxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICovXG5cbnZhciBmcyA9IHJlcXVpcmUoJ2ZzJyksXG4gICAgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyksXG4gICAgY29uc3RhbnRzID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKSxcbiAgICBEY21GaWxlID0gcmVxdWlyZSgnLi9kY21maWxlJyksXG4gICAgRGF0YUVsZW1lbnQgPSByZXF1aXJlKCcuL2RhdGFlbGVtZW50JyksXG4gICAgdHJhbnNmZXJTeW50YXggPSByZXF1aXJlKCcuL3RyYW5zZmVyc3ludGF4JyksXG4gICAgY29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcnKVxuICAgIDtcblxudmFyIHBhcnNlQnVmZmVyID0gZnVuY3Rpb24gKGJ1ZmZlciwgb3B0aW9ucywgY2FsbGJhY2spIHtcblxuICAgIHZhciBmaWxlUHJlYW1ibGUgPSB1dGlscy5yZWFkU3RyaW5nKGJ1ZmZlciwgMCwgY29uc3RhbnRzLmRjbVByZWZpeFBvc2l0aW9uKTtcbiAgICB2YXIgZGljb21QcmVmaXggPSB1dGlscy5yZWFkU3RyaW5nKGJ1ZmZlciwgY29uc3RhbnRzLmRjbVByZWZpeFBvc2l0aW9uLCA0KTtcblxuICAgIGlmICh0eXBlb2Ygb3B0aW9ucyA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cblxuICAgIC8vLyBTZXQgVXNlciBjb25maWdcbiAgICBjb25maWcuc2V0T3B0aW9ucyhvcHRpb25zKTtcblxuICAgIHZhciBkZWZhdWx0VHhQcm9wcyA9IG51bGw7XG4gICAgdmFyIG1ldGFQb3NpdGlvbiA9IDA7XG5cbiAgICBpZiAoZGljb21QcmVmaXggPT09ICdESUNNJykge1xuICAgICAgICBkZWZhdWx0VHhQcm9wcyA9IHRyYW5zZmVyU3ludGF4LnJlYWRQcm9wcyhjb25zdGFudHMuZ3JvdXBUcmFuc2ZlclN5bnRheCk7XG4gICAgICAgIG1ldGFQb3NpdGlvbiA9IGNvbnN0YW50cy5tZXRhUG9zaXRpb247XG4gICAgfSBlbHNlIHtcblxuICAgICAgICBkZWZhdWx0VHhQcm9wcyA9IHRyYW5zZmVyU3ludGF4LnJlYWRQcm9wcyhjb25zdGFudHMuZGljb21EZWZhdWx0VHJhbnNmZXJTeW50YXgpO1xuXG4gICAgICAgIC8vLyBDaGVja2luZyBmb3IgZ3JvdXAgZWxlbWVudFxuICAgICAgICB2YXIgZ3JvdXBFbGVtZW50ID0gbmV3IERhdGFFbGVtZW50KGRlZmF1bHRUeFByb3BzKTtcbiAgICAgICAgZ3JvdXBFbGVtZW50LnBhcnNlKGJ1ZmZlciwgbWV0YVBvc2l0aW9uKTtcblxuICAgICAgICBpZiAoZ3JvdXBFbGVtZW50LnRhZyA9PT0gY29uc3RhbnRzLmdyb3VwTGVuZ3RoVGFnKSB7XG4gICAgICAgICAgICBtZXRhUG9zaXRpb24gPSAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ0ludmFsaWQgRElDT00gZGF0YScpO1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKHtlcnI6ICdJbnZhbGlkIERJQ09NIGRhdGEnfSk7XG4gICAgICAgIH1cbiAgICB9XG5cblxuICAgIHZhciBmaWxlID0gbmV3IERjbUZpbGUoKTtcblxuICAgIC8vLyBQYXJzZSBtZXRhIGluZm9ybWF0aW9uXG4gICAgdmFyIGdyb3VwRWxlbWVudCA9IG5ldyBEYXRhRWxlbWVudChkZWZhdWx0VHhQcm9wcyk7XG4gICAgdmFyIGN1cnJlbnRQb3NpdGlvbiA9IGdyb3VwRWxlbWVudC5wYXJzZShidWZmZXIsIG1ldGFQb3NpdGlvbik7XG5cbiAgICB2YXIgbWV0YUVuZCA9IGN1cnJlbnRQb3NpdGlvbiArIGdyb3VwRWxlbWVudC52YWx1ZTtcbiAgICB3aGlsZSAoY3VycmVudFBvc2l0aW9uIDwgbWV0YUVuZCkge1xuICAgICAgICB2YXIgZWxlbWVudCA9IG5ldyBEYXRhRWxlbWVudChkZWZhdWx0VHhQcm9wcyk7XG5cbiAgICAgICAgY3VycmVudFBvc2l0aW9uID0gZWxlbWVudC5wYXJzZShidWZmZXIsIGN1cnJlbnRQb3NpdGlvbik7XG4gICAgICAgIGZpbGUubWV0YUVsZW1lbnRzW2VsZW1lbnQuaWRdID0gZWxlbWVudDtcbiAgICB9XG5cbiAgICB2YXIgdHhQcm9wcyA9IG51bGw7XG4gICAgaWYgKGZpbGUubWV0YUVsZW1lbnRzW2NvbnN0YW50cy50cmFuc2ZlclN5bnRheFRhZ10pIHtcbiAgICAgICAgdmFyIGN1cnJlbnRUcmFuc2ZlclN5bnRheCA9IGZpbGUubWV0YUVsZW1lbnRzW2NvbnN0YW50cy50cmFuc2ZlclN5bnRheFRhZ10udmFsdWU7XG4gICAgICAgIHR4UHJvcHMgPSB0cmFuc2ZlclN5bnRheFtjdXJyZW50VHJhbnNmZXJTeW50YXhdO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHR4UHJvcHMgPSB0cmFuc2ZlclN5bnRheFtjb25zdGFudHMuZGljb21EZWZhdWx0VHJhbnNmZXJTeW50YXhdO1xuICAgIH1cblxuICAgIGlmICghdHhQcm9wcykge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2soe2VycjogJ05vdCBzdXBwb3J0ZWQnfSk7XG4gICAgfVxuXG4gICAgKGZ1bmN0aW9uIHByb2Nlc3NFbGVtZW50cyhpbm5lckNhbGxiYWNrKSB7XG4gICAgICAgIChmdW5jdGlvbiBwYXJzZU5leHQoY3VycmVudFBvc2l0aW9uKSB7XG4gICAgICAgICAgICByZXR1cm4gcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRQb3NpdGlvbiArIDYgPCBidWZmZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBlbGVtZW50ID0gbmV3IERhdGFFbGVtZW50KHR4UHJvcHMpO1xuICAgICAgICAgICAgICAgICAgICBjdXJyZW50UG9zaXRpb24gPSBlbGVtZW50LnBhcnNlKGJ1ZmZlciwgY3VycmVudFBvc2l0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgZmlsZS5kYXRhc2V0W2VsZW1lbnQuaWRdID0gZWxlbWVudDtcblxuICAgICAgICAgICAgICAgICAgICBwYXJzZU5leHQoY3VycmVudFBvc2l0aW9uKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpbm5lckNhbGxiYWNrKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pKGN1cnJlbnRQb3NpdGlvbik7XG4gICAgfSkoZnVuY3Rpb24gKGVycikge1xuXG4gICAgICAgIGlmIChmaWxlLmRhdGFzZXRbJzdGRTAwMDEwJ10pIHtcbiAgICAgICAgICAgIHZhciBwaXhlbERhdGEgPSBmaWxlLmRhdGFzZXRbJzdGRTAwMDEwJ107XG5cbiAgICAgICAgICAgIGlmIChwaXhlbERhdGEudnIgPT0gJ09XJykge1xuICAgICAgICAgICAgICAgIGZpbGUucGl4ZWxEYXRhID0gZmlsZS5kYXRhc2V0Wyc3RkUwMDAxMCddLnZhbHVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmaWxlLnBpeGVsRGF0YSA9IGZpbGUuZGF0YXNldFsnN0ZFMDAwMTAnXS5waXhlbERhdGFJdGVtcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNhbGxiYWNrKG51bGwsIGZpbGUpO1xuICAgIH0pO1xufTtcblxudmFyIHBhcnNlRmlsZSA9IGZ1bmN0aW9uIChmaWxlUGF0aCwgb3B0aW9ucywgY2FsbGJhY2spIHtcblxuICAgIGlmICh0eXBlb2Ygb3B0aW9ucyA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cblxuICAgIGlmICghZmlsZVBhdGgpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKHtlcnI6ICdJbnZhbGlkIGFyZ3VtZW50cyBmb3IgcGFyc2VGaWxlJ30pO1xuICAgIH1cblxuICAgIGZzLnJlYWRGaWxlKGZpbGVQYXRoLCBmdW5jdGlvbiAoZXJyLCBidWZmZXIpIHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwYXJzZUJ1ZmZlcihidWZmZXIsIG9wdGlvbnMsIGNhbGxiYWNrKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgcGFyc2U6IHBhcnNlQnVmZmVyLFxuICAgIHBhcnNlRmlsZTogcGFyc2VGaWxlXG59O1xuIiwiLyoqXG4gKiBBdXRob3IgIDogUmFtZXNoIFJcbiAqIENyZWF0ZWQgOiA3LzE0LzIwMTUgMTA6NDggUE1cbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqIFRoaXMgZmlsZSBpcyBzdWJqZWN0IHRvIHRoZSB0ZXJtcyBhbmQgY29uZGl0aW9ucyBkZWZpbmVkIGluXG4gKiBmaWxlICdMSUNFTlNFJywgd2hpY2ggaXMgcGFydCBvZiB0aGlzIHNvdXJjZSBjb2RlIHBhY2thZ2UuXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKi9cblxudmFyIGJpbmRQcm9wcyA9IGZ1bmN0aW9uIChuYW1lLCBwcm9wcykge1xuICAgIHZhciB0eCA9IHtcbiAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgaXNCaWdFbmRpYW46IGZhbHNlLFxuICAgICAgICBpc0ltcGxpY2l0OiBmYWxzZSxcbiAgICAgICAgaXNBbGl2ZTogdHJ1ZVxuICAgIH07XG5cbiAgICBmb3IgKHZhciBrZXkgaW4gcHJvcHMpIHtcbiAgICAgICAgaWYgKHR4Lmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIHR4W2tleV0gPSBwcm9wc1trZXldO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHR4O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICAnMS4yLjg0MC4xMDAwOC4xLjInOiBiaW5kUHJvcHMoJ0ltcGxpY2l0IFZSIEVuZGlhbicsIHtpc0ltcGxpY2l0OiB0cnVlfSksXG4gICAgJzEuMi44NDAuMTAwMDguMS4yLjEnOiBiaW5kUHJvcHMoJ0V4cGxpY2l0IFZSIExpdHRsZSBFbmRpYW4nKSxcbiAgICAnMS4yLjg0MC4xMDAwOC4xLjIuMS45OSc6IGJpbmRQcm9wcygnRGVmbGF0ZWQgRXhwbGljaXQgVlIgQmlnIEVuZGlhbicsIHtpc0JpZ0VuZGlhbjogdHJ1ZX0pLFxuICAgICcxLjIuODQwLjEwMDA4LjEuMi4yJzogYmluZFByb3BzKCdFeHBsaWNpdCBWUiBCaWcgRW5kaWFuJywge2lzQmlnRW5kaWFuOiB0cnVlfSksXG4gICAgJzEuMi44NDAuMTAwMDguMS4yLjQuNTAnOiBiaW5kUHJvcHMoJ0pQRUcgQmFzZWxpbmUgKFByb2Nlc3MgMSknKSxcbiAgICAnMS4yLjg0MC4xMDAwOC4xLjIuNC41MSc6IGJpbmRQcm9wcygnSlBFRyBCYXNlbGluZSAoUHJvY2Vzc2VzIDIgJiA0KScpLFxuICAgICcxLjIuODQwLjEwMDA4LjEuMi40LjU3JzogYmluZFByb3BzKCdKUEVHIExvc3NsZXNzLCBOb25oaWVyYXJjaGljYWwgKFByb2Nlc3NlcyAxNCknKSxcbiAgICAnMS4yLjg0MC4xMDAwOC4xLjIuNC43MCc6IGJpbmRQcm9wcygnSlBFRyBMb3NzbGVzcywgTm9uaGllcmFyY2hpY2FsLCBGaXJzdC0gT3JkZXIgUHJlZGljdGlvbiAoUHJvY2Vzc2VzIDE0IFtTZWxlY3Rpb24gVmFsdWUgMV0pJyksXG4gICAgJzEuMi44NDAuMTAwMDguMS4yLjQuODAnOiBiaW5kUHJvcHMoJ0pQRUctTFMgTG9zc2xlc3MgSW1hZ2UgQ29tcHJlc3Npb24nKSxcbiAgICAnMS4yLjg0MC4xMDAwOC4xLjIuNC44MSc6IGJpbmRQcm9wcygnSlBFRy1MUyBMb3NzeSAoTmVhci0gTG9zc2xlc3MpIEltYWdlIENvbXByZXNzaW9uJyksXG4gICAgJzEuMi44NDAuMTAwMDguMS4yLjQuOTAnOiBiaW5kUHJvcHMoJ0pQRUcgMjAwMCBJbWFnZSBDb21wcmVzc2lvbiAoTG9zc2xlc3MgT25seSknKSxcbiAgICAnMS4yLjg0MC4xMDAwOC4xLjIuNC45MSc6IGJpbmRQcm9wcygnSlBFRyAyMDAwIEltYWdlIENvbXByZXNzaW9uJyksXG4gICAgJzEuMi44NDAuMTAwMDguMS4yLjQuOTInOiBiaW5kUHJvcHMoJ0pQRUcgMjAwMCBQYXJ0IDIgTXVsdGljb21wb25lbnQgSW1hZ2UgQ29tcHJlc3Npb24gKExvc3NsZXNzIE9ubHkpJyksXG4gICAgJzEuMi44NDAuMTAwMDguMS4yLjQuOTMnOiBiaW5kUHJvcHMoJ0pQRUcgMjAwMCBQYXJ0IDIgTXVsdGljb21wb25lbnQgSW1hZ2UgQ29tcHJlc3Npb24nKSxcblxuICAgIHJlYWRQcm9wczogZnVuY3Rpb24gKHRyYW5zZmVyU3ludGF4KSB7XG4gICAgICAgIHJldHVybiB0aGlzW3RyYW5zZmVyU3ludGF4XSA/IHRoaXNbdHJhbnNmZXJTeW50YXhdIDogdGhpc1snMS4yLjg0MC4xMDAwOC4xLjInXTtcbiAgICB9XG59OyIsIi8qKlxuICogQXV0aG9yICA6IFJhbWVzaCBSXG4gKiBDcmVhdGVkIDogNy8xMy8yMDE1IDU6MjYgUE1cbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqIFRoaXMgZmlsZSBpcyBzdWJqZWN0IHRvIHRoZSB0ZXJtcyBhbmQgY29uZGl0aW9ucyBkZWZpbmVkIGluXG4gKiBmaWxlICdMSUNFTlNFJywgd2hpY2ggaXMgcGFydCBvZiB0aGlzIHNvdXJjZSBjb2RlIHBhY2thZ2UuXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKi9cblxudmFyIGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgYnl0ZVRvSGV4OiBmdW5jdGlvbiAoYnl0ZVZhbHVlKSB7XG4gICAgICAgIHJldHVybiBjb25zdGFudHMuaGV4Q2hhcmFjdGVyc1soYnl0ZVZhbHVlID4+IDQpICYgMHgwZl0gKyBjb25zdGFudHMuaGV4Q2hhcmFjdGVyc1tieXRlVmFsdWUgJiAweDBmXTtcbiAgICB9LFxuXG4gICAgcmVhZFN0cmluZzogZnVuY3Rpb24gKGJ1ZmZlciwgcG9zaXRpb24sIGxlbmd0aCkge1xuICAgICAgICAvL2lmICghYnVmZmVyIHx8IGxlbmd0aCA9PSAwKSB7XG4gICAgICAgIC8vICAgIC8vLyBUT0RPOiBUaHJvdyBlcnJcbiAgICAgICAgLy8gICAgcmV0dXJuICcnO1xuICAgICAgICAvL31cbiAgICAgICAgLy9cbiAgICAgICAgLy9pZiAocG9zaXRpb24gKyBsZW5ndGggPiBidWZmZXIubGVuZ3RoKSB7XG4gICAgICAgIC8vICAgIC8vLyBUT0RPOiBUaHJvdyBlcnJcbiAgICAgICAgLy8gICAgcmV0dXJuICcnO1xuICAgICAgICAvL31cblxuICAgICAgICB2YXIgZGF0YSA9ICcnO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSBwb3NpdGlvbjsgaSA8IHBvc2l0aW9uICsgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGRhdGEgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShidWZmZXJbaV0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfSxcblxuICAgIHJlYWRCaW5hcnk6IGZ1bmN0aW9uIChidWZmZXIsIHBvc2l0aW9uLCBsZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGJ1ZmZlci5zbGljZShwb3NpdGlvbiwgcG9zaXRpb24gKyBsZW5ndGgpO1xuICAgIH0sXG5cbiAgICByZWFkSGV4OiBmdW5jdGlvbiAoYnVmZmVyLCBwb3NpdGlvbiwgaXNCaWdFbmRpYW4pIHtcbiAgICAgICAgLy8vIEZpcnN0IDIgYnl0ZXMgZm9yIEdyb3VwIE5vIGFuZCBzZWNvbmQgMiBmb3IgRWxlbWVudCBOby5cbiAgICAgICAgaWYgKGlzQmlnRW5kaWFuKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5ieXRlVG9IZXgoYnVmZmVyW3Bvc2l0aW9uXSkgKyB0aGlzLmJ5dGVUb0hleChidWZmZXJbcG9zaXRpb24gKyAxXSkgKyB0aGlzLmJ5dGVUb0hleChidWZmZXJbcG9zaXRpb24gKyAyXSkgKyB0aGlzLmJ5dGVUb0hleChidWZmZXJbcG9zaXRpb24gKyAzXSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5ieXRlVG9IZXgoYnVmZmVyW3Bvc2l0aW9uICsgMV0pICsgdGhpcy5ieXRlVG9IZXgoYnVmZmVyW3Bvc2l0aW9uXSkgKyB0aGlzLmJ5dGVUb0hleChidWZmZXJbcG9zaXRpb24gKyAzXSkgKyB0aGlzLmJ5dGVUb0hleChidWZmZXJbcG9zaXRpb24gKyAyXSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgcmVhZFRhZzogZnVuY3Rpb24gKGJ1ZmZlciwgcG9zaXRpb24sIGlzQmlnRW5kaWFuKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnJlYWRIZXgoYnVmZmVyLCBwb3NpdGlvbiwgaXNCaWdFbmRpYW4pO1xuICAgIH0sXG5cbiAgICByZWFkVnI6IGZ1bmN0aW9uIChidWZmZXIsIHBvc2l0aW9uKSB7XG4gICAgICAgIC8vcmV0dXJuIHRoaXMucmVhZFN0cmluZyhidWZmZXIsIHBvc2l0aW9uLCAyKTtcbiAgICAgICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmZmVyW3Bvc2l0aW9uXSkgKyBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZmZlcltwb3NpdGlvbiArIDFdKTtcbiAgICB9LFxuXG4gICAgcmVhZFN0cmluZ0RhdGE6IGZ1bmN0aW9uIChidWZmZXIsIHBvc2l0aW9uLCBsZW5ndGgpIHtcbiAgICAgICAgdmFyIGRhdGEgPSAnJztcblxuICAgICAgICBmb3IgKHZhciBpID0gcG9zaXRpb247IGkgPCBwb3NpdGlvbiArIGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoYnVmZmVyW2ldID09PSAwKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGRhdGEgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShidWZmZXJbaV0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfSxcblxuICAgIHJlYWRGbG9hdDogZnVuY3Rpb24gKGJ1ZmZlciwgcG9zaXRpb24sIGxlbmd0aCwgaXNCaWdFbmRpYW4sIHV0aWxzKSB7XG4gICAgICAgIGlmIChsZW5ndGggPiA2NTUzNCkge1xuICAgICAgICAgICAgLy8vIERhdGEgRWxlbWVudHMgd2l0aCBtdWx0aXBsZSB2YWx1ZXMgdXNpbmcgdGhpcyBWUiBtYXkgbm90IGJlIHByb3Blcmx5IGVuY29kZWRcbiAgICAgICAgICAgIC8vLyBpZiBFeHBsaWNpdC1WUiB0cmFuc2ZlciBzeW50YXggaXMgdXNlZCBhbmQgdGhlIFZMIG9mIHRoaXMgYXR0cmlidXRlIGV4Y2VlZHMgNjU1MzQgYnl0ZXMuXG4gICAgICAgIH1cblxuICAgICAgICB2YXIgc3RyaW5nRGF0YSA9IHV0aWxzLnJlYWRTdHJpbmdEYXRhKGJ1ZmZlciwgcG9zaXRpb24sIGxlbmd0aCk7XG5cbiAgICAgICAgaWYgKHN0cmluZ0RhdGEuaW5kZXhPZignXFxcXCcpID4gLTEpIHtcbiAgICAgICAgICAgIHJldHVybiBzdHJpbmdEYXRhLnNwbGl0KCdcXFxcJykubWFwKHBhcnNlRmxvYXQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHBhcnNlRmxvYXQoc3RyaW5nRGF0YSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgcmVhZEludGVnZXI6IGZ1bmN0aW9uIChidWZmZXIsIHBvc2l0aW9uLCBsZW5ndGgsIGlzQmlnRW5kaWFuKSB7XG4gICAgICAgIHJldHVybiBpc0JpZ0VuZGlhbiA/IGJ1ZmZlci5yZWFkSW50QkUocG9zaXRpb24sIGxlbmd0aCkgOiBidWZmZXIucmVhZEludExFKHBvc2l0aW9uLCBsZW5ndGgpO1xuXG4gICAgICAgIC8vdmFyIG4gPSAwO1xuICAgICAgICAvL2lmIChpc0JpZ0VuZGlhbikge1xuICAgICAgICAvLyAgICBmb3IgKHZhciBpID0gcG9zaXRpb247IGkgPCBwb3NpdGlvbiArIGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIC8vICAgICAgICBuID0gbiAqIDI1NiArIGJ1ZmZlcltpXTtcbiAgICAgICAgLy8gICAgfVxuICAgICAgICAvL30gZWxzZSB7XG4gICAgICAgIC8vICAgIGZvciAodmFyIGkgPSBwb3NpdGlvbiArIGxlbmd0aCAtIDE7IGkgPj0gcG9zaXRpb247IGktLSkge1xuICAgICAgICAvLyAgICAgICAgbiA9IG4gKiAyNTYgKyBidWZmZXJbaV07XG4gICAgICAgIC8vICAgIH1cbiAgICAgICAgLy99XG4gICAgICAgIC8vXG4gICAgICAgIC8vcmV0dXJuIG47XG4gICAgfSxcblxuICAgIHJlYWRVbnNpZ25lZEludGVnZXI6IGZ1bmN0aW9uIChidWZmZXIsIHBvc2l0aW9uLCBsZW5ndGgsIGlzQmlnRW5kaWFuKSB7XG4gICAgICAgIHJldHVybiBpc0JpZ0VuZGlhbiA/IGJ1ZmZlci5yZWFkVUludEJFKHBvc2l0aW9uLCBsZW5ndGgpIDogYnVmZmVyLnJlYWRVSW50TEUocG9zaXRpb24sIGxlbmd0aCk7XG4gICAgfSxcblxuICAgIHJlYWRVSW50OEFycmF5OiBmdW5jdGlvbiAoYnVmZmVyLCBwb3NpdGlvbiwgbGVuZ3RoLCBpc0JpZ0VuZGlhbiwgdXRpbHMpIHtcbiAgICAgICAgLy9yZXR1cm4gbmV3IFVpbnQ4QXJyYXkoYnVmZmVyLCBwb3NpdGlvbiwgbGVuZ3RoKTtcbiAgICAgICAgcmV0dXJuIHV0aWxzLnJlYWRCaW5hcnkoYnVmZmVyLCBwb3NpdGlvbiwgbGVuZ3RoKTtcbiAgICB9LFxuXG4gICAgcmVhZFVJbnQxNkFycmF5OiBmdW5jdGlvbiAoYnVmZmVyLCBwb3NpdGlvbiwgbGVuZ3RoLCBpc0JpZ0VuZGlhbiwgdXRpbHMpIHtcbiAgICAgICAgLy9yZXR1cm4gbmV3IFVpbnQxNkFycmF5KGJ1ZmZlci5idWZmZXIsIHBvc2l0aW9uLCBsZW5ndGgvMik7XG4gICAgICAgIHJldHVybiB1dGlscy5yZWFkQmluYXJ5KGJ1ZmZlciwgcG9zaXRpb24sIGxlbmd0aCk7XG4gICAgfVxufTsiLCIvKipcbiAqIEF1dGhvciAgOiBSYW1lc2ggUlxuICogQ3JlYXRlZCA6IDcvMTQvMjAxNSAxMDo1NyBBTVxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICogVGhpcyBmaWxlIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIGFuZCBjb25kaXRpb25zIGRlZmluZWQgaW5cbiAqIGZpbGUgJ0xJQ0VOU0UnLCB3aGljaCBpcyBwYXJ0IG9mIHRoaXMgc291cmNlIGNvZGUgcGFja2FnZS5cbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICAvLy8gVGFibGUgNy4xLTEuIFBhZ2UgMzg6IC0tPiBmdHA6Ly9tZWRpY2FsLm5lbWEub3JnL21lZGljYWwvZGljb20vMjAxMS8xMV8wNXB1LnBkZlxuICAgIF80Ynl0ZVZyczogWydTUScsICdVTicsICdPVycsICdPQicsICdPRicsICdVVCcsICdVTiddLFxuXG4gICAgZ2V0TGVuZ3RoOiBmdW5jdGlvbiAodnIpIHtcbiAgICAgICAgaWYgKHRoaXMuXzRieXRlVnJzLmluZGV4T2YodnIpID4gLTEpIHtcbiAgICAgICAgICAgIHJldHVybiB7bGVuZ3RoOiA0LCByZXNlcnZlZDogMn07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge2xlbmd0aDogMiwgcmVzZXJ2ZWQ6IDB9O1xuICAgIH1cbn07IixudWxsLCIvKiFcbiAqIFRoZSBidWZmZXIgbW9kdWxlIGZyb20gbm9kZS5qcywgZm9yIHRoZSBicm93c2VyLlxuICpcbiAqIEBhdXRob3IgICBGZXJvc3MgQWJvdWtoYWRpamVoIDxmZXJvc3NAZmVyb3NzLm9yZz4gPGh0dHA6Ly9mZXJvc3Mub3JnPlxuICogQGxpY2Vuc2UgIE1JVFxuICovXG4vKiBlc2xpbnQtZGlzYWJsZSBuby1wcm90byAqL1xuXG52YXIgYmFzZTY0ID0gcmVxdWlyZSgnYmFzZTY0LWpzJylcbnZhciBpZWVlNzU0ID0gcmVxdWlyZSgnaWVlZTc1NCcpXG52YXIgaXNBcnJheSA9IHJlcXVpcmUoJ2lzLWFycmF5JylcblxuZXhwb3J0cy5CdWZmZXIgPSBCdWZmZXJcbmV4cG9ydHMuU2xvd0J1ZmZlciA9IFNsb3dCdWZmZXJcbmV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVMgPSA1MFxuQnVmZmVyLnBvb2xTaXplID0gODE5MiAvLyBub3QgdXNlZCBieSB0aGlzIGltcGxlbWVudGF0aW9uXG5cbnZhciByb290UGFyZW50ID0ge31cblxuLyoqXG4gKiBJZiBgQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlRgOlxuICogICA9PT0gdHJ1ZSAgICBVc2UgVWludDhBcnJheSBpbXBsZW1lbnRhdGlvbiAoZmFzdGVzdClcbiAqICAgPT09IGZhbHNlICAgVXNlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiAobW9zdCBjb21wYXRpYmxlLCBldmVuIElFNilcbiAqXG4gKiBCcm93c2VycyB0aGF0IHN1cHBvcnQgdHlwZWQgYXJyYXlzIGFyZSBJRSAxMCssIEZpcmVmb3ggNCssIENocm9tZSA3KywgU2FmYXJpIDUuMSssXG4gKiBPcGVyYSAxMS42KywgaU9TIDQuMisuXG4gKlxuICogRHVlIHRvIHZhcmlvdXMgYnJvd3NlciBidWdzLCBzb21ldGltZXMgdGhlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiB3aWxsIGJlIHVzZWQgZXZlblxuICogd2hlbiB0aGUgYnJvd3NlciBzdXBwb3J0cyB0eXBlZCBhcnJheXMuXG4gKlxuICogTm90ZTpcbiAqXG4gKiAgIC0gRmlyZWZveCA0LTI5IGxhY2tzIHN1cHBvcnQgZm9yIGFkZGluZyBuZXcgcHJvcGVydGllcyB0byBgVWludDhBcnJheWAgaW5zdGFuY2VzLFxuICogICAgIFNlZTogaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9Njk1NDM4LlxuICpcbiAqICAgLSBTYWZhcmkgNS03IGxhY2tzIHN1cHBvcnQgZm9yIGNoYW5naW5nIHRoZSBgT2JqZWN0LnByb3RvdHlwZS5jb25zdHJ1Y3RvcmAgcHJvcGVydHlcbiAqICAgICBvbiBvYmplY3RzLlxuICpcbiAqICAgLSBDaHJvbWUgOS0xMCBpcyBtaXNzaW5nIHRoZSBgVHlwZWRBcnJheS5wcm90b3R5cGUuc3ViYXJyYXlgIGZ1bmN0aW9uLlxuICpcbiAqICAgLSBJRTEwIGhhcyBhIGJyb2tlbiBgVHlwZWRBcnJheS5wcm90b3R5cGUuc3ViYXJyYXlgIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgYXJyYXlzIG9mXG4gKiAgICAgaW5jb3JyZWN0IGxlbmd0aCBpbiBzb21lIHNpdHVhdGlvbnMuXG5cbiAqIFdlIGRldGVjdCB0aGVzZSBidWdneSBicm93c2VycyBhbmQgc2V0IGBCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVGAgdG8gYGZhbHNlYCBzbyB0aGV5XG4gKiBnZXQgdGhlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiwgd2hpY2ggaXMgc2xvd2VyIGJ1dCBiZWhhdmVzIGNvcnJlY3RseS5cbiAqL1xuQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQgPSBnbG9iYWwuVFlQRURfQVJSQVlfU1VQUE9SVCAhPT0gdW5kZWZpbmVkXG4gID8gZ2xvYmFsLlRZUEVEX0FSUkFZX1NVUFBPUlRcbiAgOiB0eXBlZEFycmF5U3VwcG9ydCgpXG5cbmZ1bmN0aW9uIHR5cGVkQXJyYXlTdXBwb3J0ICgpIHtcbiAgZnVuY3Rpb24gQmFyICgpIHt9XG4gIHRyeSB7XG4gICAgdmFyIGFyciA9IG5ldyBVaW50OEFycmF5KDEpXG4gICAgYXJyLmZvbyA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIDQyIH1cbiAgICBhcnIuY29uc3RydWN0b3IgPSBCYXJcbiAgICByZXR1cm4gYXJyLmZvbygpID09PSA0MiAmJiAvLyB0eXBlZCBhcnJheSBpbnN0YW5jZXMgY2FuIGJlIGF1Z21lbnRlZFxuICAgICAgICBhcnIuY29uc3RydWN0b3IgPT09IEJhciAmJiAvLyBjb25zdHJ1Y3RvciBjYW4gYmUgc2V0XG4gICAgICAgIHR5cGVvZiBhcnIuc3ViYXJyYXkgPT09ICdmdW5jdGlvbicgJiYgLy8gY2hyb21lIDktMTAgbGFjayBgc3ViYXJyYXlgXG4gICAgICAgIGFyci5zdWJhcnJheSgxLCAxKS5ieXRlTGVuZ3RoID09PSAwIC8vIGllMTAgaGFzIGJyb2tlbiBgc3ViYXJyYXlgXG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG5mdW5jdGlvbiBrTWF4TGVuZ3RoICgpIHtcbiAgcmV0dXJuIEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUXG4gICAgPyAweDdmZmZmZmZmXG4gICAgOiAweDNmZmZmZmZmXG59XG5cbi8qKlxuICogQ2xhc3M6IEJ1ZmZlclxuICogPT09PT09PT09PT09PVxuICpcbiAqIFRoZSBCdWZmZXIgY29uc3RydWN0b3IgcmV0dXJucyBpbnN0YW5jZXMgb2YgYFVpbnQ4QXJyYXlgIHRoYXQgYXJlIGF1Z21lbnRlZFxuICogd2l0aCBmdW5jdGlvbiBwcm9wZXJ0aWVzIGZvciBhbGwgdGhlIG5vZGUgYEJ1ZmZlcmAgQVBJIGZ1bmN0aW9ucy4gV2UgdXNlXG4gKiBgVWludDhBcnJheWAgc28gdGhhdCBzcXVhcmUgYnJhY2tldCBub3RhdGlvbiB3b3JrcyBhcyBleHBlY3RlZCAtLSBpdCByZXR1cm5zXG4gKiBhIHNpbmdsZSBvY3RldC5cbiAqXG4gKiBCeSBhdWdtZW50aW5nIHRoZSBpbnN0YW5jZXMsIHdlIGNhbiBhdm9pZCBtb2RpZnlpbmcgdGhlIGBVaW50OEFycmF5YFxuICogcHJvdG90eXBlLlxuICovXG5mdW5jdGlvbiBCdWZmZXIgKGFyZykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgQnVmZmVyKSkge1xuICAgIC8vIEF2b2lkIGdvaW5nIHRocm91Z2ggYW4gQXJndW1lbnRzQWRhcHRvclRyYW1wb2xpbmUgaW4gdGhlIGNvbW1vbiBjYXNlLlxuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkgcmV0dXJuIG5ldyBCdWZmZXIoYXJnLCBhcmd1bWVudHNbMV0pXG4gICAgcmV0dXJuIG5ldyBCdWZmZXIoYXJnKVxuICB9XG5cbiAgdGhpcy5sZW5ndGggPSAwXG4gIHRoaXMucGFyZW50ID0gdW5kZWZpbmVkXG5cbiAgLy8gQ29tbW9uIGNhc2UuXG4gIGlmICh0eXBlb2YgYXJnID09PSAnbnVtYmVyJykge1xuICAgIHJldHVybiBmcm9tTnVtYmVyKHRoaXMsIGFyZylcbiAgfVxuXG4gIC8vIFNsaWdodGx5IGxlc3MgY29tbW9uIGNhc2UuXG4gIGlmICh0eXBlb2YgYXJnID09PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBmcm9tU3RyaW5nKHRoaXMsIGFyZywgYXJndW1lbnRzLmxlbmd0aCA+IDEgPyBhcmd1bWVudHNbMV0gOiAndXRmOCcpXG4gIH1cblxuICAvLyBVbnVzdWFsLlxuICByZXR1cm4gZnJvbU9iamVjdCh0aGlzLCBhcmcpXG59XG5cbmZ1bmN0aW9uIGZyb21OdW1iZXIgKHRoYXQsIGxlbmd0aCkge1xuICB0aGF0ID0gYWxsb2NhdGUodGhhdCwgbGVuZ3RoIDwgMCA/IDAgOiBjaGVja2VkKGxlbmd0aCkgfCAwKVxuICBpZiAoIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgdGhhdFtpXSA9IDBcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRoYXRcbn1cblxuZnVuY3Rpb24gZnJvbVN0cmluZyAodGhhdCwgc3RyaW5nLCBlbmNvZGluZykge1xuICBpZiAodHlwZW9mIGVuY29kaW5nICE9PSAnc3RyaW5nJyB8fCBlbmNvZGluZyA9PT0gJycpIGVuY29kaW5nID0gJ3V0ZjgnXG5cbiAgLy8gQXNzdW1wdGlvbjogYnl0ZUxlbmd0aCgpIHJldHVybiB2YWx1ZSBpcyBhbHdheXMgPCBrTWF4TGVuZ3RoLlxuICB2YXIgbGVuZ3RoID0gYnl0ZUxlbmd0aChzdHJpbmcsIGVuY29kaW5nKSB8IDBcbiAgdGhhdCA9IGFsbG9jYXRlKHRoYXQsIGxlbmd0aClcblxuICB0aGF0LndyaXRlKHN0cmluZywgZW5jb2RpbmcpXG4gIHJldHVybiB0aGF0XG59XG5cbmZ1bmN0aW9uIGZyb21PYmplY3QgKHRoYXQsIG9iamVjdCkge1xuICBpZiAoQnVmZmVyLmlzQnVmZmVyKG9iamVjdCkpIHJldHVybiBmcm9tQnVmZmVyKHRoYXQsIG9iamVjdClcblxuICBpZiAoaXNBcnJheShvYmplY3QpKSByZXR1cm4gZnJvbUFycmF5KHRoYXQsIG9iamVjdClcblxuICBpZiAob2JqZWN0ID09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdtdXN0IHN0YXJ0IHdpdGggbnVtYmVyLCBidWZmZXIsIGFycmF5IG9yIHN0cmluZycpXG4gIH1cblxuICBpZiAodHlwZW9mIEFycmF5QnVmZmVyICE9PSAndW5kZWZpbmVkJykge1xuICAgIGlmIChvYmplY3QuYnVmZmVyIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpIHtcbiAgICAgIHJldHVybiBmcm9tVHlwZWRBcnJheSh0aGF0LCBvYmplY3QpXG4gICAgfVxuICAgIGlmIChvYmplY3QgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikge1xuICAgICAgcmV0dXJuIGZyb21BcnJheUJ1ZmZlcih0aGF0LCBvYmplY3QpXG4gICAgfVxuICB9XG5cbiAgaWYgKG9iamVjdC5sZW5ndGgpIHJldHVybiBmcm9tQXJyYXlMaWtlKHRoYXQsIG9iamVjdClcblxuICByZXR1cm4gZnJvbUpzb25PYmplY3QodGhhdCwgb2JqZWN0KVxufVxuXG5mdW5jdGlvbiBmcm9tQnVmZmVyICh0aGF0LCBidWZmZXIpIHtcbiAgdmFyIGxlbmd0aCA9IGNoZWNrZWQoYnVmZmVyLmxlbmd0aCkgfCAwXG4gIHRoYXQgPSBhbGxvY2F0ZSh0aGF0LCBsZW5ndGgpXG4gIGJ1ZmZlci5jb3B5KHRoYXQsIDAsIDAsIGxlbmd0aClcbiAgcmV0dXJuIHRoYXRcbn1cblxuZnVuY3Rpb24gZnJvbUFycmF5ICh0aGF0LCBhcnJheSkge1xuICB2YXIgbGVuZ3RoID0gY2hlY2tlZChhcnJheS5sZW5ndGgpIHwgMFxuICB0aGF0ID0gYWxsb2NhdGUodGhhdCwgbGVuZ3RoKVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSArPSAxKSB7XG4gICAgdGhhdFtpXSA9IGFycmF5W2ldICYgMjU1XG4gIH1cbiAgcmV0dXJuIHRoYXRcbn1cblxuLy8gRHVwbGljYXRlIG9mIGZyb21BcnJheSgpIHRvIGtlZXAgZnJvbUFycmF5KCkgbW9ub21vcnBoaWMuXG5mdW5jdGlvbiBmcm9tVHlwZWRBcnJheSAodGhhdCwgYXJyYXkpIHtcbiAgdmFyIGxlbmd0aCA9IGNoZWNrZWQoYXJyYXkubGVuZ3RoKSB8IDBcbiAgdGhhdCA9IGFsbG9jYXRlKHRoYXQsIGxlbmd0aClcbiAgLy8gVHJ1bmNhdGluZyB0aGUgZWxlbWVudHMgaXMgcHJvYmFibHkgbm90IHdoYXQgcGVvcGxlIGV4cGVjdCBmcm9tIHR5cGVkXG4gIC8vIGFycmF5cyB3aXRoIEJZVEVTX1BFUl9FTEVNRU5UID4gMSBidXQgaXQncyBjb21wYXRpYmxlIHdpdGggdGhlIGJlaGF2aW9yXG4gIC8vIG9mIHRoZSBvbGQgQnVmZmVyIGNvbnN0cnVjdG9yLlxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSArPSAxKSB7XG4gICAgdGhhdFtpXSA9IGFycmF5W2ldICYgMjU1XG4gIH1cbiAgcmV0dXJuIHRoYXRcbn1cblxuZnVuY3Rpb24gZnJvbUFycmF5QnVmZmVyICh0aGF0LCBhcnJheSkge1xuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICAvLyBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZSwgZm9yIGJlc3QgcGVyZm9ybWFuY2VcbiAgICBhcnJheS5ieXRlTGVuZ3RoXG4gICAgdGhhdCA9IEJ1ZmZlci5fYXVnbWVudChuZXcgVWludDhBcnJheShhcnJheSkpXG4gIH0gZWxzZSB7XG4gICAgLy8gRmFsbGJhY2s6IFJldHVybiBhbiBvYmplY3QgaW5zdGFuY2Ugb2YgdGhlIEJ1ZmZlciBjbGFzc1xuICAgIHRoYXQgPSBmcm9tVHlwZWRBcnJheSh0aGF0LCBuZXcgVWludDhBcnJheShhcnJheSkpXG4gIH1cbiAgcmV0dXJuIHRoYXRcbn1cblxuZnVuY3Rpb24gZnJvbUFycmF5TGlrZSAodGhhdCwgYXJyYXkpIHtcbiAgdmFyIGxlbmd0aCA9IGNoZWNrZWQoYXJyYXkubGVuZ3RoKSB8IDBcbiAgdGhhdCA9IGFsbG9jYXRlKHRoYXQsIGxlbmd0aClcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkgKz0gMSkge1xuICAgIHRoYXRbaV0gPSBhcnJheVtpXSAmIDI1NVxuICB9XG4gIHJldHVybiB0aGF0XG59XG5cbi8vIERlc2VyaWFsaXplIHsgdHlwZTogJ0J1ZmZlcicsIGRhdGE6IFsxLDIsMywuLi5dIH0gaW50byBhIEJ1ZmZlciBvYmplY3QuXG4vLyBSZXR1cm5zIGEgemVyby1sZW5ndGggYnVmZmVyIGZvciBpbnB1dHMgdGhhdCBkb24ndCBjb25mb3JtIHRvIHRoZSBzcGVjLlxuZnVuY3Rpb24gZnJvbUpzb25PYmplY3QgKHRoYXQsIG9iamVjdCkge1xuICB2YXIgYXJyYXlcbiAgdmFyIGxlbmd0aCA9IDBcblxuICBpZiAob2JqZWN0LnR5cGUgPT09ICdCdWZmZXInICYmIGlzQXJyYXkob2JqZWN0LmRhdGEpKSB7XG4gICAgYXJyYXkgPSBvYmplY3QuZGF0YVxuICAgIGxlbmd0aCA9IGNoZWNrZWQoYXJyYXkubGVuZ3RoKSB8IDBcbiAgfVxuICB0aGF0ID0gYWxsb2NhdGUodGhhdCwgbGVuZ3RoKVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpICs9IDEpIHtcbiAgICB0aGF0W2ldID0gYXJyYXlbaV0gJiAyNTVcbiAgfVxuICByZXR1cm4gdGhhdFxufVxuXG5pZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgQnVmZmVyLnByb3RvdHlwZS5fX3Byb3RvX18gPSBVaW50OEFycmF5LnByb3RvdHlwZVxuICBCdWZmZXIuX19wcm90b19fID0gVWludDhBcnJheVxufVxuXG5mdW5jdGlvbiBhbGxvY2F0ZSAodGhhdCwgbGVuZ3RoKSB7XG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIC8vIFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlLCBmb3IgYmVzdCBwZXJmb3JtYW5jZVxuICAgIHRoYXQgPSBCdWZmZXIuX2F1Z21lbnQobmV3IFVpbnQ4QXJyYXkobGVuZ3RoKSlcbiAgICB0aGF0Ll9fcHJvdG9fXyA9IEJ1ZmZlci5wcm90b3R5cGVcbiAgfSBlbHNlIHtcbiAgICAvLyBGYWxsYmFjazogUmV0dXJuIGFuIG9iamVjdCBpbnN0YW5jZSBvZiB0aGUgQnVmZmVyIGNsYXNzXG4gICAgdGhhdC5sZW5ndGggPSBsZW5ndGhcbiAgICB0aGF0Ll9pc0J1ZmZlciA9IHRydWVcbiAgfVxuXG4gIHZhciBmcm9tUG9vbCA9IGxlbmd0aCAhPT0gMCAmJiBsZW5ndGggPD0gQnVmZmVyLnBvb2xTaXplID4+PiAxXG4gIGlmIChmcm9tUG9vbCkgdGhhdC5wYXJlbnQgPSByb290UGFyZW50XG5cbiAgcmV0dXJuIHRoYXRcbn1cblxuZnVuY3Rpb24gY2hlY2tlZCAobGVuZ3RoKSB7XG4gIC8vIE5vdGU6IGNhbm5vdCB1c2UgYGxlbmd0aCA8IGtNYXhMZW5ndGhgIGhlcmUgYmVjYXVzZSB0aGF0IGZhaWxzIHdoZW5cbiAgLy8gbGVuZ3RoIGlzIE5hTiAod2hpY2ggaXMgb3RoZXJ3aXNlIGNvZXJjZWQgdG8gemVyby4pXG4gIGlmIChsZW5ndGggPj0ga01heExlbmd0aCgpKSB7XG4gICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0F0dGVtcHQgdG8gYWxsb2NhdGUgQnVmZmVyIGxhcmdlciB0aGFuIG1heGltdW0gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgJ3NpemU6IDB4JyArIGtNYXhMZW5ndGgoKS50b1N0cmluZygxNikgKyAnIGJ5dGVzJylcbiAgfVxuICByZXR1cm4gbGVuZ3RoIHwgMFxufVxuXG5mdW5jdGlvbiBTbG93QnVmZmVyIChzdWJqZWN0LCBlbmNvZGluZykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgU2xvd0J1ZmZlcikpIHJldHVybiBuZXcgU2xvd0J1ZmZlcihzdWJqZWN0LCBlbmNvZGluZylcblxuICB2YXIgYnVmID0gbmV3IEJ1ZmZlcihzdWJqZWN0LCBlbmNvZGluZylcbiAgZGVsZXRlIGJ1Zi5wYXJlbnRcbiAgcmV0dXJuIGJ1ZlxufVxuXG5CdWZmZXIuaXNCdWZmZXIgPSBmdW5jdGlvbiBpc0J1ZmZlciAoYikge1xuICByZXR1cm4gISEoYiAhPSBudWxsICYmIGIuX2lzQnVmZmVyKVxufVxuXG5CdWZmZXIuY29tcGFyZSA9IGZ1bmN0aW9uIGNvbXBhcmUgKGEsIGIpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYSkgfHwgIUJ1ZmZlci5pc0J1ZmZlcihiKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50cyBtdXN0IGJlIEJ1ZmZlcnMnKVxuICB9XG5cbiAgaWYgKGEgPT09IGIpIHJldHVybiAwXG5cbiAgdmFyIHggPSBhLmxlbmd0aFxuICB2YXIgeSA9IGIubGVuZ3RoXG5cbiAgdmFyIGkgPSAwXG4gIHZhciBsZW4gPSBNYXRoLm1pbih4LCB5KVxuICB3aGlsZSAoaSA8IGxlbikge1xuICAgIGlmIChhW2ldICE9PSBiW2ldKSBicmVha1xuXG4gICAgKytpXG4gIH1cblxuICBpZiAoaSAhPT0gbGVuKSB7XG4gICAgeCA9IGFbaV1cbiAgICB5ID0gYltpXVxuICB9XG5cbiAgaWYgKHggPCB5KSByZXR1cm4gLTFcbiAgaWYgKHkgPCB4KSByZXR1cm4gMVxuICByZXR1cm4gMFxufVxuXG5CdWZmZXIuaXNFbmNvZGluZyA9IGZ1bmN0aW9uIGlzRW5jb2RpbmcgKGVuY29kaW5nKSB7XG4gIHN3aXRjaCAoU3RyaW5nKGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICBjYXNlICd1dGY4JzpcbiAgICBjYXNlICd1dGYtOCc6XG4gICAgY2FzZSAnYXNjaWknOlxuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICBjYXNlICdyYXcnOlxuICAgIGNhc2UgJ3VjczInOlxuICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICBjYXNlICd1dGYxNmxlJzpcbiAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gZmFsc2VcbiAgfVxufVxuXG5CdWZmZXIuY29uY2F0ID0gZnVuY3Rpb24gY29uY2F0IChsaXN0LCBsZW5ndGgpIHtcbiAgaWYgKCFpc0FycmF5KGxpc3QpKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdsaXN0IGFyZ3VtZW50IG11c3QgYmUgYW4gQXJyYXkgb2YgQnVmZmVycy4nKVxuXG4gIGlmIChsaXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBuZXcgQnVmZmVyKDApXG4gIH1cblxuICB2YXIgaVxuICBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICBsZW5ndGggPSAwXG4gICAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgIGxlbmd0aCArPSBsaXN0W2ldLmxlbmd0aFxuICAgIH1cbiAgfVxuXG4gIHZhciBidWYgPSBuZXcgQnVmZmVyKGxlbmd0aClcbiAgdmFyIHBvcyA9IDBcbiAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgaXRlbSA9IGxpc3RbaV1cbiAgICBpdGVtLmNvcHkoYnVmLCBwb3MpXG4gICAgcG9zICs9IGl0ZW0ubGVuZ3RoXG4gIH1cbiAgcmV0dXJuIGJ1ZlxufVxuXG5mdW5jdGlvbiBieXRlTGVuZ3RoIChzdHJpbmcsIGVuY29kaW5nKSB7XG4gIGlmICh0eXBlb2Ygc3RyaW5nICE9PSAnc3RyaW5nJykgc3RyaW5nID0gJycgKyBzdHJpbmdcblxuICB2YXIgbGVuID0gc3RyaW5nLmxlbmd0aFxuICBpZiAobGVuID09PSAwKSByZXR1cm4gMFxuXG4gIC8vIFVzZSBhIGZvciBsb29wIHRvIGF2b2lkIHJlY3Vyc2lvblxuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuICBmb3IgKDs7KSB7XG4gICAgc3dpdGNoIChlbmNvZGluZykge1xuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgIC8vIERlcHJlY2F0ZWRcbiAgICAgIGNhc2UgJ3Jhdyc6XG4gICAgICBjYXNlICdyYXdzJzpcbiAgICAgICAgcmV0dXJuIGxlblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4VG9CeXRlcyhzdHJpbmcpLmxlbmd0aFxuICAgICAgY2FzZSAndWNzMic6XG4gICAgICBjYXNlICd1Y3MtMic6XG4gICAgICBjYXNlICd1dGYxNmxlJzpcbiAgICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgICAgcmV0dXJuIGxlbiAqIDJcbiAgICAgIGNhc2UgJ2hleCc6XG4gICAgICAgIHJldHVybiBsZW4gPj4+IDFcbiAgICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAgIHJldHVybiBiYXNlNjRUb0J5dGVzKHN0cmluZykubGVuZ3RoXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAobG93ZXJlZENhc2UpIHJldHVybiB1dGY4VG9CeXRlcyhzdHJpbmcpLmxlbmd0aCAvLyBhc3N1bWUgdXRmOFxuICAgICAgICBlbmNvZGluZyA9ICgnJyArIGVuY29kaW5nKS50b0xvd2VyQ2FzZSgpXG4gICAgICAgIGxvd2VyZWRDYXNlID0gdHJ1ZVxuICAgIH1cbiAgfVxufVxuQnVmZmVyLmJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoXG5cbi8vIHByZS1zZXQgZm9yIHZhbHVlcyB0aGF0IG1heSBleGlzdCBpbiB0aGUgZnV0dXJlXG5CdWZmZXIucHJvdG90eXBlLmxlbmd0aCA9IHVuZGVmaW5lZFxuQnVmZmVyLnByb3RvdHlwZS5wYXJlbnQgPSB1bmRlZmluZWRcblxuZnVuY3Rpb24gc2xvd1RvU3RyaW5nIChlbmNvZGluZywgc3RhcnQsIGVuZCkge1xuICB2YXIgbG93ZXJlZENhc2UgPSBmYWxzZVxuXG4gIHN0YXJ0ID0gc3RhcnQgfCAwXG4gIGVuZCA9IGVuZCA9PT0gdW5kZWZpbmVkIHx8IGVuZCA9PT0gSW5maW5pdHkgPyB0aGlzLmxlbmd0aCA6IGVuZCB8IDBcblxuICBpZiAoIWVuY29kaW5nKSBlbmNvZGluZyA9ICd1dGY4J1xuICBpZiAoc3RhcnQgPCAwKSBzdGFydCA9IDBcbiAgaWYgKGVuZCA+IHRoaXMubGVuZ3RoKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAoZW5kIDw9IHN0YXJ0KSByZXR1cm4gJydcblxuICB3aGlsZSAodHJ1ZSkge1xuICAgIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICAgIGNhc2UgJ2hleCc6XG4gICAgICAgIHJldHVybiBoZXhTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICd1dGY4JzpcbiAgICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgICAgcmV0dXJuIHV0ZjhTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdhc2NpaSc6XG4gICAgICAgIHJldHVybiBhc2NpaVNsaWNlKHRoaXMsIHN0YXJ0LCBlbmQpXG5cbiAgICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICAgIHJldHVybiBiaW5hcnlTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgICByZXR1cm4gYmFzZTY0U2xpY2UodGhpcywgc3RhcnQsIGVuZClcblxuICAgICAgY2FzZSAndWNzMic6XG4gICAgICBjYXNlICd1Y3MtMic6XG4gICAgICBjYXNlICd1dGYxNmxlJzpcbiAgICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgICAgcmV0dXJuIHV0ZjE2bGVTbGljZSh0aGlzLCBzdGFydCwgZW5kKVxuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAobG93ZXJlZENhc2UpIHRocm93IG5ldyBUeXBlRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZylcbiAgICAgICAgZW5jb2RpbmcgPSAoZW5jb2RpbmcgKyAnJykudG9Mb3dlckNhc2UoKVxuICAgICAgICBsb3dlcmVkQ2FzZSA9IHRydWVcbiAgICB9XG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nICgpIHtcbiAgdmFyIGxlbmd0aCA9IHRoaXMubGVuZ3RoIHwgMFxuICBpZiAobGVuZ3RoID09PSAwKSByZXR1cm4gJydcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHJldHVybiB1dGY4U2xpY2UodGhpcywgMCwgbGVuZ3RoKVxuICByZXR1cm4gc2xvd1RvU3RyaW5nLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbiBlcXVhbHMgKGIpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYikpIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50IG11c3QgYmUgYSBCdWZmZXInKVxuICBpZiAodGhpcyA9PT0gYikgcmV0dXJuIHRydWVcbiAgcmV0dXJuIEJ1ZmZlci5jb21wYXJlKHRoaXMsIGIpID09PSAwXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuaW5zcGVjdCA9IGZ1bmN0aW9uIGluc3BlY3QgKCkge1xuICB2YXIgc3RyID0gJydcbiAgdmFyIG1heCA9IGV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVNcbiAgaWYgKHRoaXMubGVuZ3RoID4gMCkge1xuICAgIHN0ciA9IHRoaXMudG9TdHJpbmcoJ2hleCcsIDAsIG1heCkubWF0Y2goLy57Mn0vZykuam9pbignICcpXG4gICAgaWYgKHRoaXMubGVuZ3RoID4gbWF4KSBzdHIgKz0gJyAuLi4gJ1xuICB9XG4gIHJldHVybiAnPEJ1ZmZlciAnICsgc3RyICsgJz4nXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuY29tcGFyZSA9IGZ1bmN0aW9uIGNvbXBhcmUgKGIpIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYikpIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50IG11c3QgYmUgYSBCdWZmZXInKVxuICBpZiAodGhpcyA9PT0gYikgcmV0dXJuIDBcbiAgcmV0dXJuIEJ1ZmZlci5jb21wYXJlKHRoaXMsIGIpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuaW5kZXhPZiA9IGZ1bmN0aW9uIGluZGV4T2YgKHZhbCwgYnl0ZU9mZnNldCkge1xuICBpZiAoYnl0ZU9mZnNldCA+IDB4N2ZmZmZmZmYpIGJ5dGVPZmZzZXQgPSAweDdmZmZmZmZmXG4gIGVsc2UgaWYgKGJ5dGVPZmZzZXQgPCAtMHg4MDAwMDAwMCkgYnl0ZU9mZnNldCA9IC0weDgwMDAwMDAwXG4gIGJ5dGVPZmZzZXQgPj49IDBcblxuICBpZiAodGhpcy5sZW5ndGggPT09IDApIHJldHVybiAtMVxuICBpZiAoYnl0ZU9mZnNldCA+PSB0aGlzLmxlbmd0aCkgcmV0dXJuIC0xXG5cbiAgLy8gTmVnYXRpdmUgb2Zmc2V0cyBzdGFydCBmcm9tIHRoZSBlbmQgb2YgdGhlIGJ1ZmZlclxuICBpZiAoYnl0ZU9mZnNldCA8IDApIGJ5dGVPZmZzZXQgPSBNYXRoLm1heCh0aGlzLmxlbmd0aCArIGJ5dGVPZmZzZXQsIDApXG5cbiAgaWYgKHR5cGVvZiB2YWwgPT09ICdzdHJpbmcnKSB7XG4gICAgaWYgKHZhbC5sZW5ndGggPT09IDApIHJldHVybiAtMSAvLyBzcGVjaWFsIGNhc2U6IGxvb2tpbmcgZm9yIGVtcHR5IHN0cmluZyBhbHdheXMgZmFpbHNcbiAgICByZXR1cm4gU3RyaW5nLnByb3RvdHlwZS5pbmRleE9mLmNhbGwodGhpcywgdmFsLCBieXRlT2Zmc2V0KVxuICB9XG4gIGlmIChCdWZmZXIuaXNCdWZmZXIodmFsKSkge1xuICAgIHJldHVybiBhcnJheUluZGV4T2YodGhpcywgdmFsLCBieXRlT2Zmc2V0KVxuICB9XG4gIGlmICh0eXBlb2YgdmFsID09PSAnbnVtYmVyJykge1xuICAgIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCAmJiBVaW50OEFycmF5LnByb3RvdHlwZS5pbmRleE9mID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gVWludDhBcnJheS5wcm90b3R5cGUuaW5kZXhPZi5jYWxsKHRoaXMsIHZhbCwgYnl0ZU9mZnNldClcbiAgICB9XG4gICAgcmV0dXJuIGFycmF5SW5kZXhPZih0aGlzLCBbIHZhbCBdLCBieXRlT2Zmc2V0KVxuICB9XG5cbiAgZnVuY3Rpb24gYXJyYXlJbmRleE9mIChhcnIsIHZhbCwgYnl0ZU9mZnNldCkge1xuICAgIHZhciBmb3VuZEluZGV4ID0gLTFcbiAgICBmb3IgKHZhciBpID0gMDsgYnl0ZU9mZnNldCArIGkgPCBhcnIubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChhcnJbYnl0ZU9mZnNldCArIGldID09PSB2YWxbZm91bmRJbmRleCA9PT0gLTEgPyAwIDogaSAtIGZvdW5kSW5kZXhdKSB7XG4gICAgICAgIGlmIChmb3VuZEluZGV4ID09PSAtMSkgZm91bmRJbmRleCA9IGlcbiAgICAgICAgaWYgKGkgLSBmb3VuZEluZGV4ICsgMSA9PT0gdmFsLmxlbmd0aCkgcmV0dXJuIGJ5dGVPZmZzZXQgKyBmb3VuZEluZGV4XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb3VuZEluZGV4ID0gLTFcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIC0xXG4gIH1cblxuICB0aHJvdyBuZXcgVHlwZUVycm9yKCd2YWwgbXVzdCBiZSBzdHJpbmcsIG51bWJlciBvciBCdWZmZXInKVxufVxuXG4vLyBgZ2V0YCBpcyBkZXByZWNhdGVkXG5CdWZmZXIucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIGdldCAob2Zmc2V0KSB7XG4gIGNvbnNvbGUubG9nKCcuZ2V0KCkgaXMgZGVwcmVjYXRlZC4gQWNjZXNzIHVzaW5nIGFycmF5IGluZGV4ZXMgaW5zdGVhZC4nKVxuICByZXR1cm4gdGhpcy5yZWFkVUludDgob2Zmc2V0KVxufVxuXG4vLyBgc2V0YCBpcyBkZXByZWNhdGVkXG5CdWZmZXIucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIHNldCAodiwgb2Zmc2V0KSB7XG4gIGNvbnNvbGUubG9nKCcuc2V0KCkgaXMgZGVwcmVjYXRlZC4gQWNjZXNzIHVzaW5nIGFycmF5IGluZGV4ZXMgaW5zdGVhZC4nKVxuICByZXR1cm4gdGhpcy53cml0ZVVJbnQ4KHYsIG9mZnNldClcbn1cblxuZnVuY3Rpb24gaGV4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICBvZmZzZXQgPSBOdW1iZXIob2Zmc2V0KSB8fCAwXG4gIHZhciByZW1haW5pbmcgPSBidWYubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmICghbGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gTnVtYmVyKGxlbmd0aClcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgICB9XG4gIH1cblxuICAvLyBtdXN0IGJlIGFuIGV2ZW4gbnVtYmVyIG9mIGRpZ2l0c1xuICB2YXIgc3RyTGVuID0gc3RyaW5nLmxlbmd0aFxuICBpZiAoc3RyTGVuICUgMiAhPT0gMCkgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGhleCBzdHJpbmcnKVxuXG4gIGlmIChsZW5ndGggPiBzdHJMZW4gLyAyKSB7XG4gICAgbGVuZ3RoID0gc3RyTGVuIC8gMlxuICB9XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgcGFyc2VkID0gcGFyc2VJbnQoc3RyaW5nLnN1YnN0cihpICogMiwgMiksIDE2KVxuICAgIGlmIChpc05hTihwYXJzZWQpKSB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgaGV4IHN0cmluZycpXG4gICAgYnVmW29mZnNldCArIGldID0gcGFyc2VkXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuZnVuY3Rpb24gdXRmOFdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGJsaXRCdWZmZXIodXRmOFRvQnl0ZXMoc3RyaW5nLCBidWYubGVuZ3RoIC0gb2Zmc2V0KSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYXNjaWlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKGFzY2lpVG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBiaW5hcnlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBhc2NpaVdyaXRlKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbn1cblxuZnVuY3Rpb24gYmFzZTY0V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gYmxpdEJ1ZmZlcihiYXNlNjRUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIHVjczJXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBibGl0QnVmZmVyKHV0ZjE2bGVUb0J5dGVzKHN0cmluZywgYnVmLmxlbmd0aCAtIG9mZnNldCksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbiB3cml0ZSAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcpIHtcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZylcbiAgaWYgKG9mZnNldCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgZW5jb2RpbmcgPSAndXRmOCdcbiAgICBsZW5ndGggPSB0aGlzLmxlbmd0aFxuICAgIG9mZnNldCA9IDBcbiAgLy8gQnVmZmVyI3dyaXRlKHN0cmluZywgZW5jb2RpbmcpXG4gIH0gZWxzZSBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQgJiYgdHlwZW9mIG9mZnNldCA9PT0gJ3N0cmluZycpIHtcbiAgICBlbmNvZGluZyA9IG9mZnNldFxuICAgIGxlbmd0aCA9IHRoaXMubGVuZ3RoXG4gICAgb2Zmc2V0ID0gMFxuICAvLyBCdWZmZXIjd3JpdGUoc3RyaW5nLCBvZmZzZXRbLCBsZW5ndGhdWywgZW5jb2RpbmddKVxuICB9IGVsc2UgaWYgKGlzRmluaXRlKG9mZnNldCkpIHtcbiAgICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gICAgaWYgKGlzRmluaXRlKGxlbmd0aCkpIHtcbiAgICAgIGxlbmd0aCA9IGxlbmd0aCB8IDBcbiAgICAgIGlmIChlbmNvZGluZyA9PT0gdW5kZWZpbmVkKSBlbmNvZGluZyA9ICd1dGY4J1xuICAgIH0gZWxzZSB7XG4gICAgICBlbmNvZGluZyA9IGxlbmd0aFxuICAgICAgbGVuZ3RoID0gdW5kZWZpbmVkXG4gICAgfVxuICAvLyBsZWdhY3kgd3JpdGUoc3RyaW5nLCBlbmNvZGluZywgb2Zmc2V0LCBsZW5ndGgpIC0gcmVtb3ZlIGluIHYwLjEzXG4gIH0gZWxzZSB7XG4gICAgdmFyIHN3YXAgPSBlbmNvZGluZ1xuICAgIGVuY29kaW5nID0gb2Zmc2V0XG4gICAgb2Zmc2V0ID0gbGVuZ3RoIHwgMFxuICAgIGxlbmd0aCA9IHN3YXBcbiAgfVxuXG4gIHZhciByZW1haW5pbmcgPSB0aGlzLmxlbmd0aCAtIG9mZnNldFxuICBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQgfHwgbGVuZ3RoID4gcmVtYWluaW5nKSBsZW5ndGggPSByZW1haW5pbmdcblxuICBpZiAoKHN0cmluZy5sZW5ndGggPiAwICYmIChsZW5ndGggPCAwIHx8IG9mZnNldCA8IDApKSB8fCBvZmZzZXQgPiB0aGlzLmxlbmd0aCkge1xuICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdhdHRlbXB0IHRvIHdyaXRlIG91dHNpZGUgYnVmZmVyIGJvdW5kcycpXG4gIH1cblxuICBpZiAoIWVuY29kaW5nKSBlbmNvZGluZyA9ICd1dGY4J1xuXG4gIHZhciBsb3dlcmVkQ2FzZSA9IGZhbHNlXG4gIGZvciAoOzspIHtcbiAgICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgICBjYXNlICdoZXgnOlxuICAgICAgICByZXR1cm4gaGV4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAndXRmOCc6XG4gICAgICBjYXNlICd1dGYtOCc6XG4gICAgICAgIHJldHVybiB1dGY4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnYXNjaWknOlxuICAgICAgICByZXR1cm4gYXNjaWlXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuXG4gICAgICBjYXNlICdiaW5hcnknOlxuICAgICAgICByZXR1cm4gYmluYXJ5V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgICAgLy8gV2FybmluZzogbWF4TGVuZ3RoIG5vdCB0YWtlbiBpbnRvIGFjY291bnQgaW4gYmFzZTY0V3JpdGVcbiAgICAgICAgcmV0dXJuIGJhc2U2NFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG5cbiAgICAgIGNhc2UgJ3VjczInOlxuICAgICAgY2FzZSAndWNzLTInOlxuICAgICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICAgIHJldHVybiB1Y3MyV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgaWYgKGxvd2VyZWRDYXNlKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdVbmtub3duIGVuY29kaW5nOiAnICsgZW5jb2RpbmcpXG4gICAgICAgIGVuY29kaW5nID0gKCcnICsgZW5jb2RpbmcpLnRvTG93ZXJDYXNlKClcbiAgICAgICAgbG93ZXJlZENhc2UgPSB0cnVlXG4gICAgfVxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OICgpIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiAnQnVmZmVyJyxcbiAgICBkYXRhOiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0aGlzLl9hcnIgfHwgdGhpcywgMClcbiAgfVxufVxuXG5mdW5jdGlvbiBiYXNlNjRTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIGlmIChzdGFydCA9PT0gMCAmJiBlbmQgPT09IGJ1Zi5sZW5ndGgpIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmKVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYuc2xpY2Uoc3RhcnQsIGVuZCkpXG4gIH1cbn1cblxuZnVuY3Rpb24gdXRmOFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuICB2YXIgcmVzID0gW11cblxuICB2YXIgaSA9IHN0YXJ0XG4gIHdoaWxlIChpIDwgZW5kKSB7XG4gICAgdmFyIGZpcnN0Qnl0ZSA9IGJ1ZltpXVxuICAgIHZhciBjb2RlUG9pbnQgPSBudWxsXG4gICAgdmFyIGJ5dGVzUGVyU2VxdWVuY2UgPSAoZmlyc3RCeXRlID4gMHhFRikgPyA0XG4gICAgICA6IChmaXJzdEJ5dGUgPiAweERGKSA/IDNcbiAgICAgIDogKGZpcnN0Qnl0ZSA+IDB4QkYpID8gMlxuICAgICAgOiAxXG5cbiAgICBpZiAoaSArIGJ5dGVzUGVyU2VxdWVuY2UgPD0gZW5kKSB7XG4gICAgICB2YXIgc2Vjb25kQnl0ZSwgdGhpcmRCeXRlLCBmb3VydGhCeXRlLCB0ZW1wQ29kZVBvaW50XG5cbiAgICAgIHN3aXRjaCAoYnl0ZXNQZXJTZXF1ZW5jZSkge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgaWYgKGZpcnN0Qnl0ZSA8IDB4ODApIHtcbiAgICAgICAgICAgIGNvZGVQb2ludCA9IGZpcnN0Qnl0ZVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgc2Vjb25kQnl0ZSA9IGJ1ZltpICsgMV1cbiAgICAgICAgICBpZiAoKHNlY29uZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCkge1xuICAgICAgICAgICAgdGVtcENvZGVQb2ludCA9IChmaXJzdEJ5dGUgJiAweDFGKSA8PCAweDYgfCAoc2Vjb25kQnl0ZSAmIDB4M0YpXG4gICAgICAgICAgICBpZiAodGVtcENvZGVQb2ludCA+IDB4N0YpIHtcbiAgICAgICAgICAgICAgY29kZVBvaW50ID0gdGVtcENvZGVQb2ludFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgc2Vjb25kQnl0ZSA9IGJ1ZltpICsgMV1cbiAgICAgICAgICB0aGlyZEJ5dGUgPSBidWZbaSArIDJdXG4gICAgICAgICAgaWYgKChzZWNvbmRCeXRlICYgMHhDMCkgPT09IDB4ODAgJiYgKHRoaXJkQnl0ZSAmIDB4QzApID09PSAweDgwKSB7XG4gICAgICAgICAgICB0ZW1wQ29kZVBvaW50ID0gKGZpcnN0Qnl0ZSAmIDB4RikgPDwgMHhDIHwgKHNlY29uZEJ5dGUgJiAweDNGKSA8PCAweDYgfCAodGhpcmRCeXRlICYgMHgzRilcbiAgICAgICAgICAgIGlmICh0ZW1wQ29kZVBvaW50ID4gMHg3RkYgJiYgKHRlbXBDb2RlUG9pbnQgPCAweEQ4MDAgfHwgdGVtcENvZGVQb2ludCA+IDB4REZGRikpIHtcbiAgICAgICAgICAgICAgY29kZVBvaW50ID0gdGVtcENvZGVQb2ludFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgc2Vjb25kQnl0ZSA9IGJ1ZltpICsgMV1cbiAgICAgICAgICB0aGlyZEJ5dGUgPSBidWZbaSArIDJdXG4gICAgICAgICAgZm91cnRoQnl0ZSA9IGJ1ZltpICsgM11cbiAgICAgICAgICBpZiAoKHNlY29uZEJ5dGUgJiAweEMwKSA9PT0gMHg4MCAmJiAodGhpcmRCeXRlICYgMHhDMCkgPT09IDB4ODAgJiYgKGZvdXJ0aEJ5dGUgJiAweEMwKSA9PT0gMHg4MCkge1xuICAgICAgICAgICAgdGVtcENvZGVQb2ludCA9IChmaXJzdEJ5dGUgJiAweEYpIDw8IDB4MTIgfCAoc2Vjb25kQnl0ZSAmIDB4M0YpIDw8IDB4QyB8ICh0aGlyZEJ5dGUgJiAweDNGKSA8PCAweDYgfCAoZm91cnRoQnl0ZSAmIDB4M0YpXG4gICAgICAgICAgICBpZiAodGVtcENvZGVQb2ludCA+IDB4RkZGRiAmJiB0ZW1wQ29kZVBvaW50IDwgMHgxMTAwMDApIHtcbiAgICAgICAgICAgICAgY29kZVBvaW50ID0gdGVtcENvZGVQb2ludFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoY29kZVBvaW50ID09PSBudWxsKSB7XG4gICAgICAvLyB3ZSBkaWQgbm90IGdlbmVyYXRlIGEgdmFsaWQgY29kZVBvaW50IHNvIGluc2VydCBhXG4gICAgICAvLyByZXBsYWNlbWVudCBjaGFyIChVK0ZGRkQpIGFuZCBhZHZhbmNlIG9ubHkgMSBieXRlXG4gICAgICBjb2RlUG9pbnQgPSAweEZGRkRcbiAgICAgIGJ5dGVzUGVyU2VxdWVuY2UgPSAxXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPiAweEZGRkYpIHtcbiAgICAgIC8vIGVuY29kZSB0byB1dGYxNiAoc3Vycm9nYXRlIHBhaXIgZGFuY2UpXG4gICAgICBjb2RlUG9pbnQgLT0gMHgxMDAwMFxuICAgICAgcmVzLnB1c2goY29kZVBvaW50ID4+PiAxMCAmIDB4M0ZGIHwgMHhEODAwKVxuICAgICAgY29kZVBvaW50ID0gMHhEQzAwIHwgY29kZVBvaW50ICYgMHgzRkZcbiAgICB9XG5cbiAgICByZXMucHVzaChjb2RlUG9pbnQpXG4gICAgaSArPSBieXRlc1BlclNlcXVlbmNlXG4gIH1cblxuICByZXR1cm4gZGVjb2RlQ29kZVBvaW50c0FycmF5KHJlcylcbn1cblxuLy8gQmFzZWQgb24gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMjI3NDcyNzIvNjgwNzQyLCB0aGUgYnJvd3NlciB3aXRoXG4vLyB0aGUgbG93ZXN0IGxpbWl0IGlzIENocm9tZSwgd2l0aCAweDEwMDAwIGFyZ3MuXG4vLyBXZSBnbyAxIG1hZ25pdHVkZSBsZXNzLCBmb3Igc2FmZXR5XG52YXIgTUFYX0FSR1VNRU5UU19MRU5HVEggPSAweDEwMDBcblxuZnVuY3Rpb24gZGVjb2RlQ29kZVBvaW50c0FycmF5IChjb2RlUG9pbnRzKSB7XG4gIHZhciBsZW4gPSBjb2RlUG9pbnRzLmxlbmd0aFxuICBpZiAobGVuIDw9IE1BWF9BUkdVTUVOVFNfTEVOR1RIKSB7XG4gICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkoU3RyaW5nLCBjb2RlUG9pbnRzKSAvLyBhdm9pZCBleHRyYSBzbGljZSgpXG4gIH1cblxuICAvLyBEZWNvZGUgaW4gY2h1bmtzIHRvIGF2b2lkIFwiY2FsbCBzdGFjayBzaXplIGV4Y2VlZGVkXCIuXG4gIHZhciByZXMgPSAnJ1xuICB2YXIgaSA9IDBcbiAgd2hpbGUgKGkgPCBsZW4pIHtcbiAgICByZXMgKz0gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShcbiAgICAgIFN0cmluZyxcbiAgICAgIGNvZGVQb2ludHMuc2xpY2UoaSwgaSArPSBNQVhfQVJHVU1FTlRTX0xFTkdUSClcbiAgICApXG4gIH1cbiAgcmV0dXJuIHJlc1xufVxuXG5mdW5jdGlvbiBhc2NpaVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJldCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSAmIDB4N0YpXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBiaW5hcnlTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXQgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICByZXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0pXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBoZXhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG5cbiAgaWYgKCFzdGFydCB8fCBzdGFydCA8IDApIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCB8fCBlbmQgPCAwIHx8IGVuZCA+IGxlbikgZW5kID0gbGVuXG5cbiAgdmFyIG91dCA9ICcnXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgb3V0ICs9IHRvSGV4KGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gb3V0XG59XG5cbmZ1bmN0aW9uIHV0ZjE2bGVTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBieXRlcyA9IGJ1Zi5zbGljZShzdGFydCwgZW5kKVxuICB2YXIgcmVzID0gJydcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBieXRlcy5sZW5ndGg7IGkgKz0gMikge1xuICAgIHJlcyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ5dGVzW2ldICsgYnl0ZXNbaSArIDFdICogMjU2KVxuICB9XG4gIHJldHVybiByZXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zbGljZSA9IGZ1bmN0aW9uIHNsaWNlIChzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBzdGFydCA9IH5+c3RhcnRcbiAgZW5kID0gZW5kID09PSB1bmRlZmluZWQgPyBsZW4gOiB+fmVuZFxuXG4gIGlmIChzdGFydCA8IDApIHtcbiAgICBzdGFydCArPSBsZW5cbiAgICBpZiAoc3RhcnQgPCAwKSBzdGFydCA9IDBcbiAgfSBlbHNlIGlmIChzdGFydCA+IGxlbikge1xuICAgIHN0YXJ0ID0gbGVuXG4gIH1cblxuICBpZiAoZW5kIDwgMCkge1xuICAgIGVuZCArPSBsZW5cbiAgICBpZiAoZW5kIDwgMCkgZW5kID0gMFxuICB9IGVsc2UgaWYgKGVuZCA+IGxlbikge1xuICAgIGVuZCA9IGxlblxuICB9XG5cbiAgaWYgKGVuZCA8IHN0YXJ0KSBlbmQgPSBzdGFydFxuXG4gIHZhciBuZXdCdWZcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgbmV3QnVmID0gQnVmZmVyLl9hdWdtZW50KHRoaXMuc3ViYXJyYXkoc3RhcnQsIGVuZCkpXG4gIH0gZWxzZSB7XG4gICAgdmFyIHNsaWNlTGVuID0gZW5kIC0gc3RhcnRcbiAgICBuZXdCdWYgPSBuZXcgQnVmZmVyKHNsaWNlTGVuLCB1bmRlZmluZWQpXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzbGljZUxlbjsgaSsrKSB7XG4gICAgICBuZXdCdWZbaV0gPSB0aGlzW2kgKyBzdGFydF1cbiAgICB9XG4gIH1cblxuICBpZiAobmV3QnVmLmxlbmd0aCkgbmV3QnVmLnBhcmVudCA9IHRoaXMucGFyZW50IHx8IHRoaXNcblxuICByZXR1cm4gbmV3QnVmXG59XG5cbi8qXG4gKiBOZWVkIHRvIG1ha2Ugc3VyZSB0aGF0IGJ1ZmZlciBpc24ndCB0cnlpbmcgdG8gd3JpdGUgb3V0IG9mIGJvdW5kcy5cbiAqL1xuZnVuY3Rpb24gY2hlY2tPZmZzZXQgKG9mZnNldCwgZXh0LCBsZW5ndGgpIHtcbiAgaWYgKChvZmZzZXQgJSAxKSAhPT0gMCB8fCBvZmZzZXQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignb2Zmc2V0IGlzIG5vdCB1aW50JylcbiAgaWYgKG9mZnNldCArIGV4dCA+IGxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1RyeWluZyB0byBhY2Nlc3MgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50TEUgPSBmdW5jdGlvbiByZWFkVUludExFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgYnl0ZUxlbmd0aCwgdGhpcy5sZW5ndGgpXG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0XVxuICB2YXIgbXVsID0gMVxuICB2YXIgaSA9IDBcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyBpXSAqIG11bFxuICB9XG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50QkUgPSBmdW5jdGlvbiByZWFkVUludEJFIChvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgYnl0ZUxlbmd0aCA9IGJ5dGVMZW5ndGggfCAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuICB9XG5cbiAgdmFyIHZhbCA9IHRoaXNbb2Zmc2V0ICsgLS1ieXRlTGVuZ3RoXVxuICB2YXIgbXVsID0gMVxuICB3aGlsZSAoYnl0ZUxlbmd0aCA+IDAgJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB2YWwgKz0gdGhpc1tvZmZzZXQgKyAtLWJ5dGVMZW5ndGhdICogbXVsXG4gIH1cblxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQ4ID0gZnVuY3Rpb24gcmVhZFVJbnQ4IChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMSwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiB0aGlzW29mZnNldF1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2TEUgPSBmdW5jdGlvbiByZWFkVUludDE2TEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAyLCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XSB8ICh0aGlzW29mZnNldCArIDFdIDw8IDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkJFID0gZnVuY3Rpb24gcmVhZFVJbnQxNkJFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHJldHVybiAodGhpc1tvZmZzZXRdIDw8IDgpIHwgdGhpc1tvZmZzZXQgKyAxXVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJMRSA9IGZ1bmN0aW9uIHJlYWRVSW50MzJMRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDQsIHRoaXMubGVuZ3RoKVxuXG4gIHJldHVybiAoKHRoaXNbb2Zmc2V0XSkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMV0gPDwgOCkgfFxuICAgICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgMTYpKSArXG4gICAgICAodGhpc1tvZmZzZXQgKyAzXSAqIDB4MTAwMDAwMClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyQkUgPSBmdW5jdGlvbiByZWFkVUludDMyQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSAqIDB4MTAwMDAwMCkgK1xuICAgICgodGhpc1tvZmZzZXQgKyAxXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDJdIDw8IDgpIHxcbiAgICB0aGlzW29mZnNldCArIDNdKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnRMRSA9IGZ1bmN0aW9uIHJlYWRJbnRMRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoIHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF1cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHdoaWxlICgrK2kgPCBieXRlTGVuZ3RoICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdmFsICs9IHRoaXNbb2Zmc2V0ICsgaV0gKiBtdWxcbiAgfVxuICBtdWwgKj0gMHg4MFxuXG4gIGlmICh2YWwgPj0gbXVsKSB2YWwgLT0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpXG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnRCRSA9IGZ1bmN0aW9uIHJlYWRJbnRCRSAob2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoIHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIGJ5dGVMZW5ndGgsIHRoaXMubGVuZ3RoKVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aFxuICB2YXIgbXVsID0gMVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAtLWldXG4gIHdoaWxlIChpID4gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHZhbCArPSB0aGlzW29mZnNldCArIC0taV0gKiBtdWxcbiAgfVxuICBtdWwgKj0gMHg4MFxuXG4gIGlmICh2YWwgPj0gbXVsKSB2YWwgLT0gTWF0aC5wb3coMiwgOCAqIGJ5dGVMZW5ndGgpXG5cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQ4ID0gZnVuY3Rpb24gcmVhZEludDggKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCAxLCB0aGlzLmxlbmd0aClcbiAgaWYgKCEodGhpc1tvZmZzZXRdICYgMHg4MCkpIHJldHVybiAodGhpc1tvZmZzZXRdKVxuICByZXR1cm4gKCgweGZmIC0gdGhpc1tvZmZzZXRdICsgMSkgKiAtMSlcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZMRSA9IGZ1bmN0aW9uIHJlYWRJbnQxNkxFIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrT2Zmc2V0KG9mZnNldCwgMiwgdGhpcy5sZW5ndGgpXG4gIHZhciB2YWwgPSB0aGlzW29mZnNldF0gfCAodGhpc1tvZmZzZXQgKyAxXSA8PCA4KVxuICByZXR1cm4gKHZhbCAmIDB4ODAwMCkgPyB2YWwgfCAweEZGRkYwMDAwIDogdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2QkUgPSBmdW5jdGlvbiByZWFkSW50MTZCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDIsIHRoaXMubGVuZ3RoKVxuICB2YXIgdmFsID0gdGhpc1tvZmZzZXQgKyAxXSB8ICh0aGlzW29mZnNldF0gPDwgOClcbiAgcmV0dXJuICh2YWwgJiAweDgwMDApID8gdmFsIHwgMHhGRkZGMDAwMCA6IHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkxFID0gZnVuY3Rpb24gcmVhZEludDMyTEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSkgfFxuICAgICh0aGlzW29mZnNldCArIDFdIDw8IDgpIHxcbiAgICAodGhpc1tvZmZzZXQgKyAyXSA8PCAxNikgfFxuICAgICh0aGlzW29mZnNldCArIDNdIDw8IDI0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkJFID0gZnVuY3Rpb24gcmVhZEludDMyQkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcblxuICByZXR1cm4gKHRoaXNbb2Zmc2V0XSA8PCAyNCkgfFxuICAgICh0aGlzW29mZnNldCArIDFdIDw8IDE2KSB8XG4gICAgKHRoaXNbb2Zmc2V0ICsgMl0gPDwgOCkgfFxuICAgICh0aGlzW29mZnNldCArIDNdKVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdExFID0gZnVuY3Rpb24gcmVhZEZsb2F0TEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIHRydWUsIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdEJFID0gZnVuY3Rpb24gcmVhZEZsb2F0QkUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA0LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIGZhbHNlLCAyMywgNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRG91YmxlTEUgPSBmdW5jdGlvbiByZWFkRG91YmxlTEUgKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tPZmZzZXQob2Zmc2V0LCA4LCB0aGlzLmxlbmd0aClcbiAgcmV0dXJuIGllZWU3NTQucmVhZCh0aGlzLCBvZmZzZXQsIHRydWUsIDUyLCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVCRSA9IGZ1bmN0aW9uIHJlYWREb3VibGVCRSAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSBjaGVja09mZnNldChvZmZzZXQsIDgsIHRoaXMubGVuZ3RoKVxuICByZXR1cm4gaWVlZTc1NC5yZWFkKHRoaXMsIG9mZnNldCwgZmFsc2UsIDUyLCA4KVxufVxuXG5mdW5jdGlvbiBjaGVja0ludCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBleHQsIG1heCwgbWluKSB7XG4gIGlmICghQnVmZmVyLmlzQnVmZmVyKGJ1ZikpIHRocm93IG5ldyBUeXBlRXJyb3IoJ2J1ZmZlciBtdXN0IGJlIGEgQnVmZmVyIGluc3RhbmNlJylcbiAgaWYgKHZhbHVlID4gbWF4IHx8IHZhbHVlIDwgbWluKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcigndmFsdWUgaXMgb3V0IG9mIGJvdW5kcycpXG4gIGlmIChvZmZzZXQgKyBleHQgPiBidWYubGVuZ3RoKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignaW5kZXggb3V0IG9mIHJhbmdlJylcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnRMRSA9IGZ1bmN0aW9uIHdyaXRlVUludExFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoIHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCksIDApXG5cbiAgdmFyIG11bCA9IDFcbiAgdmFyIGkgPSAwXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlICYgMHhGRlxuICB3aGlsZSAoKytpIDwgYnl0ZUxlbmd0aCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAodmFsdWUgLyBtdWwpICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnRCRSA9IGZ1bmN0aW9uIHdyaXRlVUludEJFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGJ5dGVMZW5ndGggPSBieXRlTGVuZ3RoIHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCksIDApXG5cbiAgdmFyIGkgPSBieXRlTGVuZ3RoIC0gMVxuICB2YXIgbXVsID0gMVxuICB0aGlzW29mZnNldCArIGldID0gdmFsdWUgJiAweEZGXG4gIHdoaWxlICgtLWkgPj0gMCAmJiAobXVsICo9IDB4MTAwKSkge1xuICAgIHRoaXNbb2Zmc2V0ICsgaV0gPSAodmFsdWUgLyBtdWwpICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQ4ID0gZnVuY3Rpb24gd3JpdGVVSW50OCAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgdmFsdWUgPSArdmFsdWVcbiAgb2Zmc2V0ID0gb2Zmc2V0IHwgMFxuICBpZiAoIW5vQXNzZXJ0KSBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCAxLCAweGZmLCAwKVxuICBpZiAoIUJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB2YWx1ZSA9IE1hdGguZmxvb3IodmFsdWUpXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbmZ1bmN0aW9uIG9iamVjdFdyaXRlVUludDE2IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbikge1xuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmZmZiArIHZhbHVlICsgMVxuICBmb3IgKHZhciBpID0gMCwgaiA9IE1hdGgubWluKGJ1Zi5sZW5ndGggLSBvZmZzZXQsIDIpOyBpIDwgajsgaSsrKSB7XG4gICAgYnVmW29mZnNldCArIGldID0gKHZhbHVlICYgKDB4ZmYgPDwgKDggKiAobGl0dGxlRW5kaWFuID8gaSA6IDEgLSBpKSkpKSA+Pj5cbiAgICAgIChsaXR0bGVFbmRpYW4gPyBpIDogMSAtIGkpICogOFxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZMRSA9IGZ1bmN0aW9uIHdyaXRlVUludDE2TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHhmZmZmLCAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgJiAweGZmKVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSlcbiAgfVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDE2QkUgPSBmdW5jdGlvbiB3cml0ZVVJbnQxNkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4ZmZmZiwgMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgJiAweGZmKVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyAyXG59XG5cbmZ1bmN0aW9uIG9iamVjdFdyaXRlVUludDMyIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbikge1xuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmZmZmZmZmYgKyB2YWx1ZSArIDFcbiAgZm9yICh2YXIgaSA9IDAsIGogPSBNYXRoLm1pbihidWYubGVuZ3RoIC0gb2Zmc2V0LCA0KTsgaSA8IGo7IGkrKykge1xuICAgIGJ1ZltvZmZzZXQgKyBpXSA9ICh2YWx1ZSA+Pj4gKGxpdHRsZUVuZGlhbiA/IGkgOiAzIC0gaSkgKiA4KSAmIDB4ZmZcbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyTEUgPSBmdW5jdGlvbiB3cml0ZVVJbnQzMkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4ZmZmZmZmZmYsIDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgPj4+IDI0KVxuICAgIHRoaXNbb2Zmc2V0ICsgMl0gPSAodmFsdWUgPj4+IDE2KVxuICAgIHRoaXNbb2Zmc2V0ICsgMV0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJCRSA9IGZ1bmN0aW9uIHdyaXRlVUludDMyQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHhmZmZmZmZmZiwgMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiAyNClcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiAxNilcbiAgICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgJiAweGZmKVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnRMRSA9IGZ1bmN0aW9uIHdyaXRlSW50TEUgKHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIHZhciBsaW1pdCA9IE1hdGgucG93KDIsIDggKiBieXRlTGVuZ3RoIC0gMSlcblxuICAgIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGJ5dGVMZW5ndGgsIGxpbWl0IC0gMSwgLWxpbWl0KVxuICB9XG5cbiAgdmFyIGkgPSAwXG4gIHZhciBtdWwgPSAxXG4gIHZhciBzdWIgPSB2YWx1ZSA8IDAgPyAxIDogMFxuICB0aGlzW29mZnNldF0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKCsraSA8IGJ5dGVMZW5ndGggJiYgKG11bCAqPSAweDEwMCkpIHtcbiAgICB0aGlzW29mZnNldCArIGldID0gKCh2YWx1ZSAvIG11bCkgPj4gMCkgLSBzdWIgJiAweEZGXG4gIH1cblxuICByZXR1cm4gb2Zmc2V0ICsgYnl0ZUxlbmd0aFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50QkUgPSBmdW5jdGlvbiB3cml0ZUludEJFICh2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICB2YXIgbGltaXQgPSBNYXRoLnBvdygyLCA4ICogYnl0ZUxlbmd0aCAtIDEpXG5cbiAgICBjaGVja0ludCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBieXRlTGVuZ3RoLCBsaW1pdCAtIDEsIC1saW1pdClcbiAgfVxuXG4gIHZhciBpID0gYnl0ZUxlbmd0aCAtIDFcbiAgdmFyIG11bCA9IDFcbiAgdmFyIHN1YiA9IHZhbHVlIDwgMCA/IDEgOiAwXG4gIHRoaXNbb2Zmc2V0ICsgaV0gPSB2YWx1ZSAmIDB4RkZcbiAgd2hpbGUgKC0taSA+PSAwICYmIChtdWwgKj0gMHgxMDApKSB7XG4gICAgdGhpc1tvZmZzZXQgKyBpXSA9ICgodmFsdWUgLyBtdWwpID4+IDApIC0gc3ViICYgMHhGRlxuICB9XG5cbiAgcmV0dXJuIG9mZnNldCArIGJ5dGVMZW5ndGhcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDggPSBmdW5jdGlvbiB3cml0ZUludDggKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMSwgMHg3ZiwgLTB4ODApXG4gIGlmICghQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHZhbHVlID0gTWF0aC5mbG9vcih2YWx1ZSlcbiAgaWYgKHZhbHVlIDwgMCkgdmFsdWUgPSAweGZmICsgdmFsdWUgKyAxXG4gIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIHJldHVybiBvZmZzZXQgKyAxXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkxFID0gZnVuY3Rpb24gd3JpdGVJbnQxNkxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDIsIDB4N2ZmZiwgLTB4ODAwMClcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlICYgMHhmZilcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiA4KVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2QkUgPSBmdW5jdGlvbiB3cml0ZUludDE2QkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgMiwgMHg3ZmZmLCAtMHg4MDAwKVxuICBpZiAoQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICB0aGlzW29mZnNldF0gPSAodmFsdWUgPj4+IDgpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSAmIDB4ZmYpXG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0V3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UpXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyTEUgPSBmdW5jdGlvbiB3cml0ZUludDMyTEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHZhbHVlID0gK3ZhbHVlXG4gIG9mZnNldCA9IG9mZnNldCB8IDBcbiAgaWYgKCFub0Fzc2VydCkgY2hlY2tJbnQodGhpcywgdmFsdWUsIG9mZnNldCwgNCwgMHg3ZmZmZmZmZiwgLTB4ODAwMDAwMDApXG4gIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHRoaXNbb2Zmc2V0XSA9ICh2YWx1ZSAmIDB4ZmYpXG4gICAgdGhpc1tvZmZzZXQgKyAxXSA9ICh2YWx1ZSA+Pj4gOClcbiAgICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiAxNilcbiAgICB0aGlzW29mZnNldCArIDNdID0gKHZhbHVlID4+PiAyNClcbiAgfSBlbHNlIHtcbiAgICBvYmplY3RXcml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkJFID0gZnVuY3Rpb24gd3JpdGVJbnQzMkJFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICB2YWx1ZSA9ICt2YWx1ZVxuICBvZmZzZXQgPSBvZmZzZXQgfCAwXG4gIGlmICghbm9Bc3NlcnQpIGNoZWNrSW50KHRoaXMsIHZhbHVlLCBvZmZzZXQsIDQsIDB4N2ZmZmZmZmYsIC0weDgwMDAwMDAwKVxuICBpZiAodmFsdWUgPCAwKSB2YWx1ZSA9IDB4ZmZmZmZmZmYgKyB2YWx1ZSArIDFcbiAgaWYgKEJ1ZmZlci5UWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgdGhpc1tvZmZzZXRdID0gKHZhbHVlID4+PiAyNClcbiAgICB0aGlzW29mZnNldCArIDFdID0gKHZhbHVlID4+PiAxNilcbiAgICB0aGlzW29mZnNldCArIDJdID0gKHZhbHVlID4+PiA4KVxuICAgIHRoaXNbb2Zmc2V0ICsgM10gPSAodmFsdWUgJiAweGZmKVxuICB9IGVsc2Uge1xuICAgIG9iamVjdFdyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlKVxuICB9XG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbmZ1bmN0aW9uIGNoZWNrSUVFRTc1NCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBleHQsIG1heCwgbWluKSB7XG4gIGlmICh2YWx1ZSA+IG1heCB8fCB2YWx1ZSA8IG1pbikgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3ZhbHVlIGlzIG91dCBvZiBib3VuZHMnKVxuICBpZiAob2Zmc2V0ICsgZXh0ID4gYnVmLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ2luZGV4IG91dCBvZiByYW5nZScpXG4gIGlmIChvZmZzZXQgPCAwKSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignaW5kZXggb3V0IG9mIHJhbmdlJylcbn1cblxuZnVuY3Rpb24gd3JpdGVGbG9hdCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBjaGVja0lFRUU3NTQoYnVmLCB2YWx1ZSwgb2Zmc2V0LCA0LCAzLjQwMjgyMzQ2NjM4NTI4ODZlKzM4LCAtMy40MDI4MjM0NjYzODUyODg2ZSszOClcbiAgfVxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCAyMywgNClcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0TEUgPSBmdW5jdGlvbiB3cml0ZUZsb2F0TEUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRCRSA9IGZ1bmN0aW9uIHdyaXRlRmxvYXRCRSAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiB3cml0ZURvdWJsZSAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBjaGVja0lFRUU3NTQoYnVmLCB2YWx1ZSwgb2Zmc2V0LCA4LCAxLjc5NzY5MzEzNDg2MjMxNTdFKzMwOCwgLTEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4KVxuICB9XG4gIGllZWU3NTQud3JpdGUoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDUyLCA4KVxuICByZXR1cm4gb2Zmc2V0ICsgOFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlTEUgPSBmdW5jdGlvbiB3cml0ZURvdWJsZUxFICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVEb3VibGUodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVEb3VibGVCRSA9IGZ1bmN0aW9uIHdyaXRlRG91YmxlQkUgKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbi8vIGNvcHkodGFyZ2V0QnVmZmVyLCB0YXJnZXRTdGFydD0wLCBzb3VyY2VTdGFydD0wLCBzb3VyY2VFbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uIGNvcHkgKHRhcmdldCwgdGFyZ2V0U3RhcnQsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKCFzdGFydCkgc3RhcnQgPSAwXG4gIGlmICghZW5kICYmIGVuZCAhPT0gMCkgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKHRhcmdldFN0YXJ0ID49IHRhcmdldC5sZW5ndGgpIHRhcmdldFN0YXJ0ID0gdGFyZ2V0Lmxlbmd0aFxuICBpZiAoIXRhcmdldFN0YXJ0KSB0YXJnZXRTdGFydCA9IDBcbiAgaWYgKGVuZCA+IDAgJiYgZW5kIDwgc3RhcnQpIGVuZCA9IHN0YXJ0XG5cbiAgLy8gQ29weSAwIGJ5dGVzOyB3ZSdyZSBkb25lXG4gIGlmIChlbmQgPT09IHN0YXJ0KSByZXR1cm4gMFxuICBpZiAodGFyZ2V0Lmxlbmd0aCA9PT0gMCB8fCB0aGlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIDBcblxuICAvLyBGYXRhbCBlcnJvciBjb25kaXRpb25zXG4gIGlmICh0YXJnZXRTdGFydCA8IDApIHtcbiAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcigndGFyZ2V0U3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIH1cbiAgaWYgKHN0YXJ0IDwgMCB8fCBzdGFydCA+PSB0aGlzLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3NvdXJjZVN0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBpZiAoZW5kIDwgMCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3NvdXJjZUVuZCBvdXQgb2YgYm91bmRzJylcblxuICAvLyBBcmUgd2Ugb29iP1xuICBpZiAoZW5kID4gdGhpcy5sZW5ndGgpIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICh0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0U3RhcnQgPCBlbmQgLSBzdGFydCkge1xuICAgIGVuZCA9IHRhcmdldC5sZW5ndGggLSB0YXJnZXRTdGFydCArIHN0YXJ0XG4gIH1cblxuICB2YXIgbGVuID0gZW5kIC0gc3RhcnRcbiAgdmFyIGlcblxuICBpZiAodGhpcyA9PT0gdGFyZ2V0ICYmIHN0YXJ0IDwgdGFyZ2V0U3RhcnQgJiYgdGFyZ2V0U3RhcnQgPCBlbmQpIHtcbiAgICAvLyBkZXNjZW5kaW5nIGNvcHkgZnJvbSBlbmRcbiAgICBmb3IgKGkgPSBsZW4gLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgdGFyZ2V0W2kgKyB0YXJnZXRTdGFydF0gPSB0aGlzW2kgKyBzdGFydF1cbiAgICB9XG4gIH0gZWxzZSBpZiAobGVuIDwgMTAwMCB8fCAhQnVmZmVyLlRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICAvLyBhc2NlbmRpbmcgY29weSBmcm9tIHN0YXJ0XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICB0YXJnZXRbaSArIHRhcmdldFN0YXJ0XSA9IHRoaXNbaSArIHN0YXJ0XVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0YXJnZXQuX3NldCh0aGlzLnN1YmFycmF5KHN0YXJ0LCBzdGFydCArIGxlbiksIHRhcmdldFN0YXJ0KVxuICB9XG5cbiAgcmV0dXJuIGxlblxufVxuXG4vLyBmaWxsKHZhbHVlLCBzdGFydD0wLCBlbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUuZmlsbCA9IGZ1bmN0aW9uIGZpbGwgKHZhbHVlLCBzdGFydCwgZW5kKSB7XG4gIGlmICghdmFsdWUpIHZhbHVlID0gMFxuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQpIGVuZCA9IHRoaXMubGVuZ3RoXG5cbiAgaWYgKGVuZCA8IHN0YXJ0KSB0aHJvdyBuZXcgUmFuZ2VFcnJvcignZW5kIDwgc3RhcnQnKVxuXG4gIC8vIEZpbGwgMCBieXRlczsgd2UncmUgZG9uZVxuICBpZiAoZW5kID09PSBzdGFydCkgcmV0dXJuXG4gIGlmICh0aGlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgaWYgKHN0YXJ0IDwgMCB8fCBzdGFydCA+PSB0aGlzLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ3N0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBpZiAoZW5kIDwgMCB8fCBlbmQgPiB0aGlzLmxlbmd0aCkgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ2VuZCBvdXQgb2YgYm91bmRzJylcblxuICB2YXIgaVxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgIGZvciAoaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICAgIHRoaXNbaV0gPSB2YWx1ZVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB2YXIgYnl0ZXMgPSB1dGY4VG9CeXRlcyh2YWx1ZS50b1N0cmluZygpKVxuICAgIHZhciBsZW4gPSBieXRlcy5sZW5ndGhcbiAgICBmb3IgKGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgICB0aGlzW2ldID0gYnl0ZXNbaSAlIGxlbl1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpc1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgYEFycmF5QnVmZmVyYCB3aXRoIHRoZSAqY29waWVkKiBtZW1vcnkgb2YgdGhlIGJ1ZmZlciBpbnN0YW5jZS5cbiAqIEFkZGVkIGluIE5vZGUgMC4xMi4gT25seSBhdmFpbGFibGUgaW4gYnJvd3NlcnMgdGhhdCBzdXBwb3J0IEFycmF5QnVmZmVyLlxuICovXG5CdWZmZXIucHJvdG90eXBlLnRvQXJyYXlCdWZmZXIgPSBmdW5jdGlvbiB0b0FycmF5QnVmZmVyICgpIHtcbiAgaWYgKHR5cGVvZiBVaW50OEFycmF5ICE9PSAndW5kZWZpbmVkJykge1xuICAgIGlmIChCdWZmZXIuVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgICAgcmV0dXJuIChuZXcgQnVmZmVyKHRoaXMpKS5idWZmZXJcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGJ1ZiA9IG5ldyBVaW50OEFycmF5KHRoaXMubGVuZ3RoKVxuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGJ1Zi5sZW5ndGg7IGkgPCBsZW47IGkgKz0gMSkge1xuICAgICAgICBidWZbaV0gPSB0aGlzW2ldXG4gICAgICB9XG4gICAgICByZXR1cm4gYnVmLmJ1ZmZlclxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdCdWZmZXIudG9BcnJheUJ1ZmZlciBub3Qgc3VwcG9ydGVkIGluIHRoaXMgYnJvd3NlcicpXG4gIH1cbn1cblxuLy8gSEVMUEVSIEZVTkNUSU9OU1xuLy8gPT09PT09PT09PT09PT09PVxuXG52YXIgQlAgPSBCdWZmZXIucHJvdG90eXBlXG5cbi8qKlxuICogQXVnbWVudCBhIFVpbnQ4QXJyYXkgKmluc3RhbmNlKiAobm90IHRoZSBVaW50OEFycmF5IGNsYXNzISkgd2l0aCBCdWZmZXIgbWV0aG9kc1xuICovXG5CdWZmZXIuX2F1Z21lbnQgPSBmdW5jdGlvbiBfYXVnbWVudCAoYXJyKSB7XG4gIGFyci5jb25zdHJ1Y3RvciA9IEJ1ZmZlclxuICBhcnIuX2lzQnVmZmVyID0gdHJ1ZVxuXG4gIC8vIHNhdmUgcmVmZXJlbmNlIHRvIG9yaWdpbmFsIFVpbnQ4QXJyYXkgc2V0IG1ldGhvZCBiZWZvcmUgb3ZlcndyaXRpbmdcbiAgYXJyLl9zZXQgPSBhcnIuc2V0XG5cbiAgLy8gZGVwcmVjYXRlZFxuICBhcnIuZ2V0ID0gQlAuZ2V0XG4gIGFyci5zZXQgPSBCUC5zZXRcblxuICBhcnIud3JpdGUgPSBCUC53cml0ZVxuICBhcnIudG9TdHJpbmcgPSBCUC50b1N0cmluZ1xuICBhcnIudG9Mb2NhbGVTdHJpbmcgPSBCUC50b1N0cmluZ1xuICBhcnIudG9KU09OID0gQlAudG9KU09OXG4gIGFyci5lcXVhbHMgPSBCUC5lcXVhbHNcbiAgYXJyLmNvbXBhcmUgPSBCUC5jb21wYXJlXG4gIGFyci5pbmRleE9mID0gQlAuaW5kZXhPZlxuICBhcnIuY29weSA9IEJQLmNvcHlcbiAgYXJyLnNsaWNlID0gQlAuc2xpY2VcbiAgYXJyLnJlYWRVSW50TEUgPSBCUC5yZWFkVUludExFXG4gIGFyci5yZWFkVUludEJFID0gQlAucmVhZFVJbnRCRVxuICBhcnIucmVhZFVJbnQ4ID0gQlAucmVhZFVJbnQ4XG4gIGFyci5yZWFkVUludDE2TEUgPSBCUC5yZWFkVUludDE2TEVcbiAgYXJyLnJlYWRVSW50MTZCRSA9IEJQLnJlYWRVSW50MTZCRVxuICBhcnIucmVhZFVJbnQzMkxFID0gQlAucmVhZFVJbnQzMkxFXG4gIGFyci5yZWFkVUludDMyQkUgPSBCUC5yZWFkVUludDMyQkVcbiAgYXJyLnJlYWRJbnRMRSA9IEJQLnJlYWRJbnRMRVxuICBhcnIucmVhZEludEJFID0gQlAucmVhZEludEJFXG4gIGFyci5yZWFkSW50OCA9IEJQLnJlYWRJbnQ4XG4gIGFyci5yZWFkSW50MTZMRSA9IEJQLnJlYWRJbnQxNkxFXG4gIGFyci5yZWFkSW50MTZCRSA9IEJQLnJlYWRJbnQxNkJFXG4gIGFyci5yZWFkSW50MzJMRSA9IEJQLnJlYWRJbnQzMkxFXG4gIGFyci5yZWFkSW50MzJCRSA9IEJQLnJlYWRJbnQzMkJFXG4gIGFyci5yZWFkRmxvYXRMRSA9IEJQLnJlYWRGbG9hdExFXG4gIGFyci5yZWFkRmxvYXRCRSA9IEJQLnJlYWRGbG9hdEJFXG4gIGFyci5yZWFkRG91YmxlTEUgPSBCUC5yZWFkRG91YmxlTEVcbiAgYXJyLnJlYWREb3VibGVCRSA9IEJQLnJlYWREb3VibGVCRVxuICBhcnIud3JpdGVVSW50OCA9IEJQLndyaXRlVUludDhcbiAgYXJyLndyaXRlVUludExFID0gQlAud3JpdGVVSW50TEVcbiAgYXJyLndyaXRlVUludEJFID0gQlAud3JpdGVVSW50QkVcbiAgYXJyLndyaXRlVUludDE2TEUgPSBCUC53cml0ZVVJbnQxNkxFXG4gIGFyci53cml0ZVVJbnQxNkJFID0gQlAud3JpdGVVSW50MTZCRVxuICBhcnIud3JpdGVVSW50MzJMRSA9IEJQLndyaXRlVUludDMyTEVcbiAgYXJyLndyaXRlVUludDMyQkUgPSBCUC53cml0ZVVJbnQzMkJFXG4gIGFyci53cml0ZUludExFID0gQlAud3JpdGVJbnRMRVxuICBhcnIud3JpdGVJbnRCRSA9IEJQLndyaXRlSW50QkVcbiAgYXJyLndyaXRlSW50OCA9IEJQLndyaXRlSW50OFxuICBhcnIud3JpdGVJbnQxNkxFID0gQlAud3JpdGVJbnQxNkxFXG4gIGFyci53cml0ZUludDE2QkUgPSBCUC53cml0ZUludDE2QkVcbiAgYXJyLndyaXRlSW50MzJMRSA9IEJQLndyaXRlSW50MzJMRVxuICBhcnIud3JpdGVJbnQzMkJFID0gQlAud3JpdGVJbnQzMkJFXG4gIGFyci53cml0ZUZsb2F0TEUgPSBCUC53cml0ZUZsb2F0TEVcbiAgYXJyLndyaXRlRmxvYXRCRSA9IEJQLndyaXRlRmxvYXRCRVxuICBhcnIud3JpdGVEb3VibGVMRSA9IEJQLndyaXRlRG91YmxlTEVcbiAgYXJyLndyaXRlRG91YmxlQkUgPSBCUC53cml0ZURvdWJsZUJFXG4gIGFyci5maWxsID0gQlAuZmlsbFxuICBhcnIuaW5zcGVjdCA9IEJQLmluc3BlY3RcbiAgYXJyLnRvQXJyYXlCdWZmZXIgPSBCUC50b0FycmF5QnVmZmVyXG5cbiAgcmV0dXJuIGFyclxufVxuXG52YXIgSU5WQUxJRF9CQVNFNjRfUkUgPSAvW14rXFwvMC05QS1aYS16LV9dL2dcblxuZnVuY3Rpb24gYmFzZTY0Y2xlYW4gKHN0cikge1xuICAvLyBOb2RlIHN0cmlwcyBvdXQgaW52YWxpZCBjaGFyYWN0ZXJzIGxpa2UgXFxuIGFuZCBcXHQgZnJvbSB0aGUgc3RyaW5nLCBiYXNlNjQtanMgZG9lcyBub3RcbiAgc3RyID0gc3RyaW5ndHJpbShzdHIpLnJlcGxhY2UoSU5WQUxJRF9CQVNFNjRfUkUsICcnKVxuICAvLyBOb2RlIGNvbnZlcnRzIHN0cmluZ3Mgd2l0aCBsZW5ndGggPCAyIHRvICcnXG4gIGlmIChzdHIubGVuZ3RoIDwgMikgcmV0dXJuICcnXG4gIC8vIE5vZGUgYWxsb3dzIGZvciBub24tcGFkZGVkIGJhc2U2NCBzdHJpbmdzIChtaXNzaW5nIHRyYWlsaW5nID09PSksIGJhc2U2NC1qcyBkb2VzIG5vdFxuICB3aGlsZSAoc3RyLmxlbmd0aCAlIDQgIT09IDApIHtcbiAgICBzdHIgPSBzdHIgKyAnPSdcbiAgfVxuICByZXR1cm4gc3RyXG59XG5cbmZ1bmN0aW9uIHN0cmluZ3RyaW0gKHN0cikge1xuICBpZiAoc3RyLnRyaW0pIHJldHVybiBzdHIudHJpbSgpXG4gIHJldHVybiBzdHIucmVwbGFjZSgvXlxccyt8XFxzKyQvZywgJycpXG59XG5cbmZ1bmN0aW9uIHRvSGV4IChuKSB7XG4gIGlmIChuIDwgMTYpIHJldHVybiAnMCcgKyBuLnRvU3RyaW5nKDE2KVxuICByZXR1cm4gbi50b1N0cmluZygxNilcbn1cblxuZnVuY3Rpb24gdXRmOFRvQnl0ZXMgKHN0cmluZywgdW5pdHMpIHtcbiAgdW5pdHMgPSB1bml0cyB8fCBJbmZpbml0eVxuICB2YXIgY29kZVBvaW50XG4gIHZhciBsZW5ndGggPSBzdHJpbmcubGVuZ3RoXG4gIHZhciBsZWFkU3Vycm9nYXRlID0gbnVsbFxuICB2YXIgYnl0ZXMgPSBbXVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICBjb2RlUG9pbnQgPSBzdHJpbmcuY2hhckNvZGVBdChpKVxuXG4gICAgLy8gaXMgc3Vycm9nYXRlIGNvbXBvbmVudFxuICAgIGlmIChjb2RlUG9pbnQgPiAweEQ3RkYgJiYgY29kZVBvaW50IDwgMHhFMDAwKSB7XG4gICAgICAvLyBsYXN0IGNoYXIgd2FzIGEgbGVhZFxuICAgICAgaWYgKCFsZWFkU3Vycm9nYXRlKSB7XG4gICAgICAgIC8vIG5vIGxlYWQgeWV0XG4gICAgICAgIGlmIChjb2RlUG9pbnQgPiAweERCRkYpIHtcbiAgICAgICAgICAvLyB1bmV4cGVjdGVkIHRyYWlsXG4gICAgICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgfSBlbHNlIGlmIChpICsgMSA9PT0gbGVuZ3RoKSB7XG4gICAgICAgICAgLy8gdW5wYWlyZWQgbGVhZFxuICAgICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH1cblxuICAgICAgICAvLyB2YWxpZCBsZWFkXG4gICAgICAgIGxlYWRTdXJyb2dhdGUgPSBjb2RlUG9pbnRcblxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICAvLyAyIGxlYWRzIGluIGEgcm93XG4gICAgICBpZiAoY29kZVBvaW50IDwgMHhEQzAwKSB7XG4gICAgICAgIGlmICgodW5pdHMgLT0gMykgPiAtMSkgYnl0ZXMucHVzaCgweEVGLCAweEJGLCAweEJEKVxuICAgICAgICBsZWFkU3Vycm9nYXRlID0gY29kZVBvaW50XG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIC8vIHZhbGlkIHN1cnJvZ2F0ZSBwYWlyXG4gICAgICBjb2RlUG9pbnQgPSBsZWFkU3Vycm9nYXRlIC0gMHhEODAwIDw8IDEwIHwgY29kZVBvaW50IC0gMHhEQzAwIHwgMHgxMDAwMFxuICAgIH0gZWxzZSBpZiAobGVhZFN1cnJvZ2F0ZSkge1xuICAgICAgLy8gdmFsaWQgYm1wIGNoYXIsIGJ1dCBsYXN0IGNoYXIgd2FzIGEgbGVhZFxuICAgICAgaWYgKCh1bml0cyAtPSAzKSA+IC0xKSBieXRlcy5wdXNoKDB4RUYsIDB4QkYsIDB4QkQpXG4gICAgfVxuXG4gICAgbGVhZFN1cnJvZ2F0ZSA9IG51bGxcblxuICAgIC8vIGVuY29kZSB1dGY4XG4gICAgaWYgKGNvZGVQb2ludCA8IDB4ODApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMSkgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChjb2RlUG9pbnQpXG4gICAgfSBlbHNlIGlmIChjb2RlUG9pbnQgPCAweDgwMCkge1xuICAgICAgaWYgKCh1bml0cyAtPSAyKSA8IDApIGJyZWFrXG4gICAgICBieXRlcy5wdXNoKFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2IHwgMHhDMCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MTAwMDApIHtcbiAgICAgIGlmICgodW5pdHMgLT0gMykgPCAwKSBicmVha1xuICAgICAgYnl0ZXMucHVzaChcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyB8IDB4RTAsXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDYgJiAweDNGIHwgMHg4MCxcbiAgICAgICAgY29kZVBvaW50ICYgMHgzRiB8IDB4ODBcbiAgICAgIClcbiAgICB9IGVsc2UgaWYgKGNvZGVQb2ludCA8IDB4MTEwMDAwKSB7XG4gICAgICBpZiAoKHVuaXRzIC09IDQpIDwgMCkgYnJlYWtcbiAgICAgIGJ5dGVzLnB1c2goXG4gICAgICAgIGNvZGVQb2ludCA+PiAweDEyIHwgMHhGMCxcbiAgICAgICAgY29kZVBvaW50ID4+IDB4QyAmIDB4M0YgfCAweDgwLFxuICAgICAgICBjb2RlUG9pbnQgPj4gMHg2ICYgMHgzRiB8IDB4ODAsXG4gICAgICAgIGNvZGVQb2ludCAmIDB4M0YgfCAweDgwXG4gICAgICApXG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjb2RlIHBvaW50JylcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYnl0ZXNcbn1cblxuZnVuY3Rpb24gYXNjaWlUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgLy8gTm9kZSdzIGNvZGUgc2VlbXMgdG8gYmUgZG9pbmcgdGhpcyBhbmQgbm90ICYgMHg3Ri4uXG4gICAgYnl0ZUFycmF5LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkgJiAweEZGKVxuICB9XG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVRvQnl0ZXMgKHN0ciwgdW5pdHMpIHtcbiAgdmFyIGMsIGhpLCBsb1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoKHVuaXRzIC09IDIpIDwgMCkgYnJlYWtcblxuICAgIGMgPSBzdHIuY2hhckNvZGVBdChpKVxuICAgIGhpID0gYyA+PiA4XG4gICAgbG8gPSBjICUgMjU2XG4gICAgYnl0ZUFycmF5LnB1c2gobG8pXG4gICAgYnl0ZUFycmF5LnB1c2goaGkpXG4gIH1cblxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFRvQnl0ZXMgKHN0cikge1xuICByZXR1cm4gYmFzZTY0LnRvQnl0ZUFycmF5KGJhc2U2NGNsZWFuKHN0cikpXG59XG5cbmZ1bmN0aW9uIGJsaXRCdWZmZXIgKHNyYywgZHN0LCBvZmZzZXQsIGxlbmd0aCkge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKChpICsgb2Zmc2V0ID49IGRzdC5sZW5ndGgpIHx8IChpID49IHNyYy5sZW5ndGgpKSBicmVha1xuICAgIGRzdFtpICsgb2Zmc2V0XSA9IHNyY1tpXVxuICB9XG4gIHJldHVybiBpXG59XG4iLCJ2YXIgbG9va3VwID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky8nO1xuXG47KGZ1bmN0aW9uIChleHBvcnRzKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuICB2YXIgQXJyID0gKHR5cGVvZiBVaW50OEFycmF5ICE9PSAndW5kZWZpbmVkJylcbiAgICA/IFVpbnQ4QXJyYXlcbiAgICA6IEFycmF5XG5cblx0dmFyIFBMVVMgICA9ICcrJy5jaGFyQ29kZUF0KDApXG5cdHZhciBTTEFTSCAgPSAnLycuY2hhckNvZGVBdCgwKVxuXHR2YXIgTlVNQkVSID0gJzAnLmNoYXJDb2RlQXQoMClcblx0dmFyIExPV0VSICA9ICdhJy5jaGFyQ29kZUF0KDApXG5cdHZhciBVUFBFUiAgPSAnQScuY2hhckNvZGVBdCgwKVxuXHR2YXIgUExVU19VUkxfU0FGRSA9ICctJy5jaGFyQ29kZUF0KDApXG5cdHZhciBTTEFTSF9VUkxfU0FGRSA9ICdfJy5jaGFyQ29kZUF0KDApXG5cblx0ZnVuY3Rpb24gZGVjb2RlIChlbHQpIHtcblx0XHR2YXIgY29kZSA9IGVsdC5jaGFyQ29kZUF0KDApXG5cdFx0aWYgKGNvZGUgPT09IFBMVVMgfHxcblx0XHQgICAgY29kZSA9PT0gUExVU19VUkxfU0FGRSlcblx0XHRcdHJldHVybiA2MiAvLyAnKydcblx0XHRpZiAoY29kZSA9PT0gU0xBU0ggfHxcblx0XHQgICAgY29kZSA9PT0gU0xBU0hfVVJMX1NBRkUpXG5cdFx0XHRyZXR1cm4gNjMgLy8gJy8nXG5cdFx0aWYgKGNvZGUgPCBOVU1CRVIpXG5cdFx0XHRyZXR1cm4gLTEgLy9ubyBtYXRjaFxuXHRcdGlmIChjb2RlIDwgTlVNQkVSICsgMTApXG5cdFx0XHRyZXR1cm4gY29kZSAtIE5VTUJFUiArIDI2ICsgMjZcblx0XHRpZiAoY29kZSA8IFVQUEVSICsgMjYpXG5cdFx0XHRyZXR1cm4gY29kZSAtIFVQUEVSXG5cdFx0aWYgKGNvZGUgPCBMT1dFUiArIDI2KVxuXHRcdFx0cmV0dXJuIGNvZGUgLSBMT1dFUiArIDI2XG5cdH1cblxuXHRmdW5jdGlvbiBiNjRUb0J5dGVBcnJheSAoYjY0KSB7XG5cdFx0dmFyIGksIGosIGwsIHRtcCwgcGxhY2VIb2xkZXJzLCBhcnJcblxuXHRcdGlmIChiNjQubGVuZ3RoICUgNCA+IDApIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignSW52YWxpZCBzdHJpbmcuIExlbmd0aCBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgNCcpXG5cdFx0fVxuXG5cdFx0Ly8gdGhlIG51bWJlciBvZiBlcXVhbCBzaWducyAocGxhY2UgaG9sZGVycylcblx0XHQvLyBpZiB0aGVyZSBhcmUgdHdvIHBsYWNlaG9sZGVycywgdGhhbiB0aGUgdHdvIGNoYXJhY3RlcnMgYmVmb3JlIGl0XG5cdFx0Ly8gcmVwcmVzZW50IG9uZSBieXRlXG5cdFx0Ly8gaWYgdGhlcmUgaXMgb25seSBvbmUsIHRoZW4gdGhlIHRocmVlIGNoYXJhY3RlcnMgYmVmb3JlIGl0IHJlcHJlc2VudCAyIGJ5dGVzXG5cdFx0Ly8gdGhpcyBpcyBqdXN0IGEgY2hlYXAgaGFjayB0byBub3QgZG8gaW5kZXhPZiB0d2ljZVxuXHRcdHZhciBsZW4gPSBiNjQubGVuZ3RoXG5cdFx0cGxhY2VIb2xkZXJzID0gJz0nID09PSBiNjQuY2hhckF0KGxlbiAtIDIpID8gMiA6ICc9JyA9PT0gYjY0LmNoYXJBdChsZW4gLSAxKSA/IDEgOiAwXG5cblx0XHQvLyBiYXNlNjQgaXMgNC8zICsgdXAgdG8gdHdvIGNoYXJhY3RlcnMgb2YgdGhlIG9yaWdpbmFsIGRhdGFcblx0XHRhcnIgPSBuZXcgQXJyKGI2NC5sZW5ndGggKiAzIC8gNCAtIHBsYWNlSG9sZGVycylcblxuXHRcdC8vIGlmIHRoZXJlIGFyZSBwbGFjZWhvbGRlcnMsIG9ubHkgZ2V0IHVwIHRvIHRoZSBsYXN0IGNvbXBsZXRlIDQgY2hhcnNcblx0XHRsID0gcGxhY2VIb2xkZXJzID4gMCA/IGI2NC5sZW5ndGggLSA0IDogYjY0Lmxlbmd0aFxuXG5cdFx0dmFyIEwgPSAwXG5cblx0XHRmdW5jdGlvbiBwdXNoICh2KSB7XG5cdFx0XHRhcnJbTCsrXSA9IHZcblx0XHR9XG5cblx0XHRmb3IgKGkgPSAwLCBqID0gMDsgaSA8IGw7IGkgKz0gNCwgaiArPSAzKSB7XG5cdFx0XHR0bXAgPSAoZGVjb2RlKGI2NC5jaGFyQXQoaSkpIDw8IDE4KSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMSkpIDw8IDEyKSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMikpIDw8IDYpIHwgZGVjb2RlKGI2NC5jaGFyQXQoaSArIDMpKVxuXHRcdFx0cHVzaCgodG1wICYgMHhGRjAwMDApID4+IDE2KVxuXHRcdFx0cHVzaCgodG1wICYgMHhGRjAwKSA+PiA4KVxuXHRcdFx0cHVzaCh0bXAgJiAweEZGKVxuXHRcdH1cblxuXHRcdGlmIChwbGFjZUhvbGRlcnMgPT09IDIpIHtcblx0XHRcdHRtcCA9IChkZWNvZGUoYjY0LmNoYXJBdChpKSkgPDwgMikgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDEpKSA+PiA0KVxuXHRcdFx0cHVzaCh0bXAgJiAweEZGKVxuXHRcdH0gZWxzZSBpZiAocGxhY2VIb2xkZXJzID09PSAxKSB7XG5cdFx0XHR0bXAgPSAoZGVjb2RlKGI2NC5jaGFyQXQoaSkpIDw8IDEwKSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMSkpIDw8IDQpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAyKSkgPj4gMilcblx0XHRcdHB1c2goKHRtcCA+PiA4KSAmIDB4RkYpXG5cdFx0XHRwdXNoKHRtcCAmIDB4RkYpXG5cdFx0fVxuXG5cdFx0cmV0dXJuIGFyclxuXHR9XG5cblx0ZnVuY3Rpb24gdWludDhUb0Jhc2U2NCAodWludDgpIHtcblx0XHR2YXIgaSxcblx0XHRcdGV4dHJhQnl0ZXMgPSB1aW50OC5sZW5ndGggJSAzLCAvLyBpZiB3ZSBoYXZlIDEgYnl0ZSBsZWZ0LCBwYWQgMiBieXRlc1xuXHRcdFx0b3V0cHV0ID0gXCJcIixcblx0XHRcdHRlbXAsIGxlbmd0aFxuXG5cdFx0ZnVuY3Rpb24gZW5jb2RlIChudW0pIHtcblx0XHRcdHJldHVybiBsb29rdXAuY2hhckF0KG51bSlcblx0XHR9XG5cblx0XHRmdW5jdGlvbiB0cmlwbGV0VG9CYXNlNjQgKG51bSkge1xuXHRcdFx0cmV0dXJuIGVuY29kZShudW0gPj4gMTggJiAweDNGKSArIGVuY29kZShudW0gPj4gMTIgJiAweDNGKSArIGVuY29kZShudW0gPj4gNiAmIDB4M0YpICsgZW5jb2RlKG51bSAmIDB4M0YpXG5cdFx0fVxuXG5cdFx0Ly8gZ28gdGhyb3VnaCB0aGUgYXJyYXkgZXZlcnkgdGhyZWUgYnl0ZXMsIHdlJ2xsIGRlYWwgd2l0aCB0cmFpbGluZyBzdHVmZiBsYXRlclxuXHRcdGZvciAoaSA9IDAsIGxlbmd0aCA9IHVpbnQ4Lmxlbmd0aCAtIGV4dHJhQnl0ZXM7IGkgPCBsZW5ndGg7IGkgKz0gMykge1xuXHRcdFx0dGVtcCA9ICh1aW50OFtpXSA8PCAxNikgKyAodWludDhbaSArIDFdIDw8IDgpICsgKHVpbnQ4W2kgKyAyXSlcblx0XHRcdG91dHB1dCArPSB0cmlwbGV0VG9CYXNlNjQodGVtcClcblx0XHR9XG5cblx0XHQvLyBwYWQgdGhlIGVuZCB3aXRoIHplcm9zLCBidXQgbWFrZSBzdXJlIHRvIG5vdCBmb3JnZXQgdGhlIGV4dHJhIGJ5dGVzXG5cdFx0c3dpdGNoIChleHRyYUJ5dGVzKSB7XG5cdFx0XHRjYXNlIDE6XG5cdFx0XHRcdHRlbXAgPSB1aW50OFt1aW50OC5sZW5ndGggLSAxXVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKHRlbXAgPj4gMilcblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSgodGVtcCA8PCA0KSAmIDB4M0YpXG5cdFx0XHRcdG91dHB1dCArPSAnPT0nXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIDI6XG5cdFx0XHRcdHRlbXAgPSAodWludDhbdWludDgubGVuZ3RoIC0gMl0gPDwgOCkgKyAodWludDhbdWludDgubGVuZ3RoIC0gMV0pXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUodGVtcCA+PiAxMClcblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSgodGVtcCA+PiA0KSAmIDB4M0YpXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUoKHRlbXAgPDwgMikgJiAweDNGKVxuXHRcdFx0XHRvdXRwdXQgKz0gJz0nXG5cdFx0XHRcdGJyZWFrXG5cdFx0fVxuXG5cdFx0cmV0dXJuIG91dHB1dFxuXHR9XG5cblx0ZXhwb3J0cy50b0J5dGVBcnJheSA9IGI2NFRvQnl0ZUFycmF5XG5cdGV4cG9ydHMuZnJvbUJ5dGVBcnJheSA9IHVpbnQ4VG9CYXNlNjRcbn0odHlwZW9mIGV4cG9ydHMgPT09ICd1bmRlZmluZWQnID8gKHRoaXMuYmFzZTY0anMgPSB7fSkgOiBleHBvcnRzKSlcbiIsImV4cG9ydHMucmVhZCA9IGZ1bmN0aW9uIChidWZmZXIsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtXG4gIHZhciBlTGVuID0gbkJ5dGVzICogOCAtIG1MZW4gLSAxXG4gIHZhciBlTWF4ID0gKDEgPDwgZUxlbikgLSAxXG4gIHZhciBlQmlhcyA9IGVNYXggPj4gMVxuICB2YXIgbkJpdHMgPSAtN1xuICB2YXIgaSA9IGlzTEUgPyAobkJ5dGVzIC0gMSkgOiAwXG4gIHZhciBkID0gaXNMRSA/IC0xIDogMVxuICB2YXIgcyA9IGJ1ZmZlcltvZmZzZXQgKyBpXVxuXG4gIGkgKz0gZFxuXG4gIGUgPSBzICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpXG4gIHMgPj49ICgtbkJpdHMpXG4gIG5CaXRzICs9IGVMZW5cbiAgZm9yICg7IG5CaXRzID4gMDsgZSA9IGUgKiAyNTYgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCkge31cblxuICBtID0gZSAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKVxuICBlID4+PSAoLW5CaXRzKVxuICBuQml0cyArPSBtTGVuXG4gIGZvciAoOyBuQml0cyA+IDA7IG0gPSBtICogMjU2ICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpIHt9XG5cbiAgaWYgKGUgPT09IDApIHtcbiAgICBlID0gMSAtIGVCaWFzXG4gIH0gZWxzZSBpZiAoZSA9PT0gZU1heCkge1xuICAgIHJldHVybiBtID8gTmFOIDogKChzID8gLTEgOiAxKSAqIEluZmluaXR5KVxuICB9IGVsc2Uge1xuICAgIG0gPSBtICsgTWF0aC5wb3coMiwgbUxlbilcbiAgICBlID0gZSAtIGVCaWFzXG4gIH1cbiAgcmV0dXJuIChzID8gLTEgOiAxKSAqIG0gKiBNYXRoLnBvdygyLCBlIC0gbUxlbilcbn1cblxuZXhwb3J0cy53cml0ZSA9IGZ1bmN0aW9uIChidWZmZXIsIHZhbHVlLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbSwgY1xuICB2YXIgZUxlbiA9IG5CeXRlcyAqIDggLSBtTGVuIC0gMVxuICB2YXIgZU1heCA9ICgxIDw8IGVMZW4pIC0gMVxuICB2YXIgZUJpYXMgPSBlTWF4ID4+IDFcbiAgdmFyIHJ0ID0gKG1MZW4gPT09IDIzID8gTWF0aC5wb3coMiwgLTI0KSAtIE1hdGgucG93KDIsIC03NykgOiAwKVxuICB2YXIgaSA9IGlzTEUgPyAwIDogKG5CeXRlcyAtIDEpXG4gIHZhciBkID0gaXNMRSA/IDEgOiAtMVxuICB2YXIgcyA9IHZhbHVlIDwgMCB8fCAodmFsdWUgPT09IDAgJiYgMSAvIHZhbHVlIDwgMCkgPyAxIDogMFxuXG4gIHZhbHVlID0gTWF0aC5hYnModmFsdWUpXG5cbiAgaWYgKGlzTmFOKHZhbHVlKSB8fCB2YWx1ZSA9PT0gSW5maW5pdHkpIHtcbiAgICBtID0gaXNOYU4odmFsdWUpID8gMSA6IDBcbiAgICBlID0gZU1heFxuICB9IGVsc2Uge1xuICAgIGUgPSBNYXRoLmZsb29yKE1hdGgubG9nKHZhbHVlKSAvIE1hdGguTE4yKVxuICAgIGlmICh2YWx1ZSAqIChjID0gTWF0aC5wb3coMiwgLWUpKSA8IDEpIHtcbiAgICAgIGUtLVxuICAgICAgYyAqPSAyXG4gICAgfVxuICAgIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgdmFsdWUgKz0gcnQgLyBjXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlICs9IHJ0ICogTWF0aC5wb3coMiwgMSAtIGVCaWFzKVxuICAgIH1cbiAgICBpZiAodmFsdWUgKiBjID49IDIpIHtcbiAgICAgIGUrK1xuICAgICAgYyAvPSAyXG4gICAgfVxuXG4gICAgaWYgKGUgKyBlQmlhcyA+PSBlTWF4KSB7XG4gICAgICBtID0gMFxuICAgICAgZSA9IGVNYXhcbiAgICB9IGVsc2UgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICBtID0gKHZhbHVlICogYyAtIDEpICogTWF0aC5wb3coMiwgbUxlbilcbiAgICAgIGUgPSBlICsgZUJpYXNcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IHZhbHVlICogTWF0aC5wb3coMiwgZUJpYXMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pXG4gICAgICBlID0gMFxuICAgIH1cbiAgfVxuXG4gIGZvciAoOyBtTGVuID49IDg7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IG0gJiAweGZmLCBpICs9IGQsIG0gLz0gMjU2LCBtTGVuIC09IDgpIHt9XG5cbiAgZSA9IChlIDw8IG1MZW4pIHwgbVxuICBlTGVuICs9IG1MZW5cbiAgZm9yICg7IGVMZW4gPiAwOyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBlICYgMHhmZiwgaSArPSBkLCBlIC89IDI1NiwgZUxlbiAtPSA4KSB7fVxuXG4gIGJ1ZmZlcltvZmZzZXQgKyBpIC0gZF0gfD0gcyAqIDEyOFxufVxuIiwiXG4vKipcbiAqIGlzQXJyYXlcbiAqL1xuXG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXk7XG5cbi8qKlxuICogdG9TdHJpbmdcbiAqL1xuXG52YXIgc3RyID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuLyoqXG4gKiBXaGV0aGVyIG9yIG5vdCB0aGUgZ2l2ZW4gYHZhbGBcbiAqIGlzIGFuIGFycmF5LlxuICpcbiAqIGV4YW1wbGU6XG4gKlxuICogICAgICAgIGlzQXJyYXkoW10pO1xuICogICAgICAgIC8vID4gdHJ1ZVxuICogICAgICAgIGlzQXJyYXkoYXJndW1lbnRzKTtcbiAqICAgICAgICAvLyA+IGZhbHNlXG4gKiAgICAgICAgaXNBcnJheSgnJyk7XG4gKiAgICAgICAgLy8gPiBmYWxzZVxuICpcbiAqIEBwYXJhbSB7bWl4ZWR9IHZhbFxuICogQHJldHVybiB7Ym9vbH1cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGlzQXJyYXkgfHwgZnVuY3Rpb24gKHZhbCkge1xuICByZXR1cm4gISEgdmFsICYmICdbb2JqZWN0IEFycmF5XScgPT0gc3RyLmNhbGwodmFsKTtcbn07XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gc2V0VGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgc2V0VGltZW91dChkcmFpblF1ZXVlLCAwKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiJdfQ==
