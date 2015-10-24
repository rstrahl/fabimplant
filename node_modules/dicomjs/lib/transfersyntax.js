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