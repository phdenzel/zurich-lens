var LensModule = (function() {

    var imageCvs;            // canvas for lens processing
    var imageCtx;            // context of processing canvas
    var imageDataSrc;        // original canvas image data
    var imageDataDst;        // image data for processing
    var imageWidth;          // image width
    var imageHeight;         // image height
    var windowWidth;         // width of the window embedding canvas
    var windowHeight;        // height of the window embedding canvas

    var initSuccessCallback; // called after init function succeeds
    var initErrorCallback;   // called if init function causes error
    var readCallback;        // called after readImg read functions

    var lensType;            // what kind of lens should be applied
    var radius;              // lensing influence radius
    var center = {};         // center of lens
    var tolerance;           // tolerance


    function init(options) {

        defaults(options)
            .then(initSuccessCallback)
            .catch(initErrorCallback)
    }


    function defaults(options) {
        // initialize defaults and options
        return new Promise( (resolve, reject) => {
            if (!options) { //sanity check
                reject('No data for lensing provided');
            }

            //// default settings
            imageCvs = options.imageCvs || document.createElement('canvas');
            imageWidth = options.imageWidth || 1280;
            imageHeight = options.imageHeight || 720;
            windowWidth = options.windowWidth || window.innerWidth;
            windowHeight = options.windowHeight || window.innerHeight;
            // callbacks
            initSuccessCallback = options.initSuccessCallback || function(resolve) {console.log(resolve)};
            initErrorCallback = options.initErrorCallback || function(error) {console.log(error)};
            readCallback = options.readCallback || function() {};
            // lens properties
            lensType = options.lensType || 'isothermal';
            radius = options.radius || 200;
            center = options.center || {x: 0, y: 0};
            tolerance = options.tolerance || -15;

            //// setting up image components
            imageCvs.width = imageWidth;
            imageCvs.height = imageHeight;
            imageCtx = imageCvs.getContext('2d');

            setTimeout(function() {
                resolve("LensModule configured");
            }, 1000);
        });
    }


    function readImage(srcImg) {
        imageCtx.drawImage(srcImg, 0, 0, imageWidth, imageHeight);
        imageDataSrc = imageCtx.getImageData(0, 0, imageWidth, imageHeight); // this will not change until readImage is called again!
        imageDataDst = imageCtx.getImageData(0, 0, imageWidth, imageHeight);
        readCallback();
    }


    function loadImageData(srcImageData) {
        readCallback();
    }


    function source(px, py, dstID, srcID) {
        // put the source image data back into destination image data at (px, py)
        dstID = dstID || imageDataDst;
        srcID = srcID || imageDataSrc;
        
        // at (px, py) around the lensing radius
        var xmin, xmax, ymin, ymax;
        var x, y, halfidx, idxDst;
        
        // setup deflection range
        xmin = Math.max(px-radius, 0);
        xmax = Math.min(px+radius, imageWidth);
        ymin = Math.max(py-radius, 0);
        ymax = Math.min(py+radius, imageHeight);
        
        // reset to original data
        for (y = ymin; y < ymax; y++) {
            halfidx = y * imageWidth;
            for (x = xmin; x < xmax; x++) {
                idxDst = (x + halfidx) << 2;
                dstID.data[idxDst] = srcID.data[idxDst++]; // r
                dstID.data[idxDst] = srcID.data[idxDst++]; // g
                dstID.data[idxDst] = srcID.data[idxDst++]; // b
                dstID.data[idxDst] = 255;                  // a
            }
        }
    }


    function process(px, py, dstID, srcID) {
        // let LensModule process image data with new center at (px, py)
        dstID = dstID || imageDataDst;
        srcID = srcID || imageDataSrc;

        // Uint8ClampedArray data buffers
        var dstData = dstID.data;
        var srcData = srcID.data;
        
        switch (lensType) {
        case 'isothermal':
            dstData = isothermLens(dstData, srcData, px, py);
            break;
        case 'point':
            dstData = pointLens(dstData, srcData, px, py);
            break;
        default:
            dstData = isotherm_lens(dstData, srcData, px, py);   
        }

        dstID.data = dstData;
    }


    function isothermLens(lensData, unlensedData, px, py) {
        // lens applicator following isothermal lens equation
        // with smooth transition from center to radius
        var distance, deflection, maxSize;
        var x, y, idxDst, idxSrc, xbuf, ybuf, dx, dy;
        var xmin, xmax, ymin, ymax;


        // setup deflection range
        xmin = Math.max(px-radius, 0);
        xmax = Math.min(px+radius, imageWidth);
        ymin = Math.max(py-radius, 0);
        ymax = Math.min(py+radius, imageHeight);

        maxSize = imageWidth * (imageHeight - 1) + imageWidth - 1;

        for (y = ymin; y < ymax; y++) {
            idxDst = (xmin + y * imageWidth) << 2;
            ybuf = y - py;
            for (x = xmin; x < xmax; x++) {
                xbuf = x - px;
                distance = Math.sqrt(xbuf*xbuf + ybuf*ybuf);
                if (distance <= radius) {
                    // calculate deflection indices
                    deflection = radius * (1 - Math.tanh(4*distance/radius))/(distance+1);

                    // actual lensing equation
                    dx = Math.floor(x - xbuf * deflection);
                    dy = Math.floor(y - ybuf * deflection);

                    // antialiasing (while preserving brightness more or less)
                    if (deflection < tolerance * 0.9 && deflection > tolerance * 1.1) {
                        deflection = 0.9;
                    } else if (deflection < tolerance) {
                        deflection = 0.1;
                    } else {
                        deflection = 1;
                    }

                    // move pixels
                    idxSrc = ((dx + dy * imageWidth) % maxSize) << 2;
                    lensData[idxDst++] = deflection * unlensedData[idxSrc + 0]; // r
                    lensData[idxDst++] = deflection * unlensedData[idxSrc + 1]; // g
                    lensData[idxDst++] = deflection * unlensedData[idxSrc + 2]; // b
                    idxDst++; // leave alpha unchanged
                } else {
                    idxDst = idxDst + 4;
                }
            }
        }

        return lensData;
    }


    function pointLens(lensData, unlensedData, px, py) {
        return lensData
    }
    

    function startLoop() {
        imageCvs.addEventListener('mousemove', listener, false);
    }

 
    function listener(evt) {
        var mousePosition = trackMouse(evt);
        source(center.x, center.y);
        process(mousePosition.x, mousePosition.y);
        imageCtx.putImageData(imageDataDst, 0, 0);
        setCenter(mousePosition.x, mousePosition.y);
        
    }

    
    function trackMouse(evt) {
        return {
            x: (evt.clientX / windowWidth  * imageWidth)  >> 0,
            y: (evt.clientY / windowHeight * imageHeight) >> 0
        };
    }




    // getters and setters
    function getLensType() {
        return lensType;
    }
    
    function setLensType(type) {
        lensType = type;
    }

    
    function getRadius() {
        return radius;
    }

    function setRadius(val) {
        radius = val;
    }

    
    function getCenter() {
        return center;
    }

    function setCenter(x, y) {
        center = {x: x, y: y};
    }


    function getTolerance() {
        return tolerance;
    }

    function setTolerance(tol) {
        tolerance = tol;
    }


    return {

        // getters/setters
        getLensType: getLensType,
        setLensType: setLensType,
        getRadius: getRadius,
        setRadius: setRadius,
        getCenter: getCenter,
        setCenter: setCenter,
        getTolerance: getTolerance,
        setTolerance: setTolerance,

        // functions
        init,
        readImage,
        source,
        process,
        startLoop

    };
})();
