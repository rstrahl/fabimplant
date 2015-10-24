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