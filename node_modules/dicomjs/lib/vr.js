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