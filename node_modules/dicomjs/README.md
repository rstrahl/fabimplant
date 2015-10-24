# dicomjs (Beta)
Nodejs library for DICOM parsing

# Installation
install via [NPM](https://www.npmjs.com/):
> npm install dicomjs

# Usage
### Initializing:
```javascript

var dicomjs = require('dicomjs');

```

### parseFile(filePath, callback);
```javascript

dicomjs.parseFile(sampleDcmPath, function (err, dcmData) {
    console.log('Parsing file complete..');

    if (!err) {
        /// Reading patient name
        var patientName = dcmData.dataset['00100010'].value;

        /// TODO: Add more code here..
    } else {
        console.log(err);
    }
});

```

### parse(buffer, callback);
```javascript

fs.readFile(sample_file_path, function (err, buffer) {
    dicomjs.parse(buffer, function (err, dcmData) {
        /// Shows list of elements

        if (!err) {
            for (var key in dcmData.metaElements) {
                console.log('   tag: ', key, ', value: ', dcmData.metaElements[key].value);
            }

            for (var key in dcmData.dataset) {

                if(dcmData.dataset[key].isSequence) {
                    /// TODO: Parse sequence here
                    console.log('   tag: ', key, ', Sequence: Yes');
                } else if(dcmData.dataset[key].isPixelData) {
                    /// TODO: Handle PixelData here
                    console.log('   tag: ', key, ', PixelData: Yes');
                } else {
                    console.log('   tag: ', key, ', value: ', dcmData.dataset[key].value);
                }
            }

            /// Reading patient name
            var patientName = dcmData.dataset['00100010'].value;

            /// Reading pixel data
            var pixelData = dcmData.pixelData;

        } else {
            console.log(err);
        }
    });
});
```

# Documentation
### Reading patient name
```javascript

var patientName = dcmData.dataset['00100010'].value;

```

### Reading pixel data
```javascript

var pixelData = dcmData.pixelData;

```


# Contributions
Contributions are welcome
    
# Issues 
Please file your issues [here](https://github.com/rameshrr/dicomjs/issues):
    