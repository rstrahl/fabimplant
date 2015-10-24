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