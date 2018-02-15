// CERN lensing
// image data
var imageDataDst, imageDataSrc;

// temporary postion variables
var oldx = 0;
var oldy = 0;

// linear interpolation
var lerp = function(v1, v2, t) {
    // 
    return (v2 - v1) * (1-Math.exp(-t)) + v1;
};

// mouse tracking
function getMousePos(evt) {

    return { // problems with floats, use rather integers
        x: (evt.clientX / $(window).width() * canvas.width) >> 0,
        y: (evt.clientY / $(window).height() * canvas.height) >> 0
    };
};

// custom event listener
function lensingListener(evt){
    var mousePos = getMousePos(evt);
    console.log(mousePos);
    updatecanvas(canvas, mousePos.x, mousePos.y);
};

// apply lensing manipulation
window.onload = function() {

    canvas = document.querySelector("canvas");

    w = img.width;
    h = img.height;

    canvas.width = w;
    canvas.height = h;

    dst = canvas.getContext("2d");

    dst.drawImage(img, 0, 0, w, h);
    i = 0;
    imageDataSrc = dst.getImageData(0, 0, w, h);
    imageDataDst = dst.getImageData(0, 0, w, h);

    px = 0;
    py = h/2;

    ti = 0;
    var timer = setInterval(function() {
        // if (ti++ > 100){
        clearInterval(timer);
        document.addEventListener('mousemove', lensingListener, false);
		    // }

        // updatecanvas(canvas, lerp(0, w*0.5, ti*0.05), py);

    }, 16);

};

// actual lensing math
function updatecanvas(canvas, px, py) {
    var context = canvas.getContext('2d');

    // define region where lensing is applied
    r = 200;

    xmin = Math.max(oldx-r, 0);
    xmax = Math.min(oldx+r, w);
    ymin = Math.max(oldy-r, 0);
    ymax = Math.min(oldy+r, h);

    // reload unlensed image
    var halfindex;
    for (y = ymin; y < ymax; y++) {
        halfindex = y * w;
        for (x = xmin; x < xmax; x++) {
            index = (x + halfindex) << 2;
            imageDataDst.data[index] = imageDataSrc.data[index++]; // r
            imageDataDst.data[index] = imageDataSrc.data[index++]; // g
            imageDataDst.data[index] = imageDataSrc.data[index++]; // b
            imageDataDst.data[index] = 255;                        // a
        }
    }

    // buffer Uint8ClampedArrays
    var dstdata = imageDataDst.data;
    var srcdata = imageDataSrc.data;

    xmin = Math.max(px-r, 0);
    xmax = Math.min(px+r, w);
    ymin = Math.max(py-r, 0);
    ymax = Math.min(py+r, h);

    var tol = -15;
    var maxSize = w * (h - 1) + w - 1;

    // apply lens in defined range
    for (y = ymin; y < ymax; y++) {
        index = (xmin + y * w) << 2;
        y1 = y - py;
        for (x = xmin; x < xmax; x++) {
            x1 = x - px;
            d = Math.sqrt(x1 * x1 + y1 * y1);
            if (d <= r) {
                // lensing math
                // sc = 0; // no lensing
                sc = 200*(1-Math.tanh(3*d/r))/(d+1);  // smooth transition to sc=0 at r
                // isothermal lensing equation a la beta = theta - theta_E/theta
                xx = Math.floor(x - x1 * sc); 
                yy = Math.floor(y - y1 * sc);

                // Antialiasing, i.e. preserve brightness more or less
                if (sc < tol * 0.9 && sc > tol * 1.1)
                    sc = 0.9;
                else if (sc < tol)
                    sc = 0.1;
                else
                    sc = 1;
                // end of lensing math

                index2 = ((xx + yy * w) % maxSize) << 2;
                dstdata[index++] = sc * srcdata[index2 + 0]; // r
                dstdata[index++] = sc * srcdata[index2 + 1]; // g
                dstdata[index++] = sc * srcdata[index2 + 2]; // b
                index++;
            } else {
                index = index + 4;
            }
        }
    }

    // write from buffer
    imageDataDst.data = dstdata;
    dst.putImageData(imageDataDst, 0, 0);
    oldx = px;
    oldy = py;
};

function clearcanvas(){
  canvas = document.querySelector("canvas");
  var context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  // var w = canvas.width;
  // canvas.width = 1;
  // canvas.width = w;
};

function load_lensing(){
    canvas = document.querySelector("canvas");

    w = img.width;
    h = img.height;

    canvas.width = w;
    canvas.height = h;

    dst = canvas.getContext("2d");

    dst.drawImage(img, 0, 0, w, h);
    i = 0;
    imageDataSrc = dst.getImageData(0, 0, w, h);
    imageDataDst = dst.getImageData(0, 0, w, h);

    px = 0;
    py = h/2;

    ti = 0;
    var timer = setInterval(function() {
        if (ti++ > 100){
            clearInterval(timer);
            document.addEventListener('mousemove', lensingListener, false);
		    }

        updatecanvas(canvas, lerp(0, w*0.5, ti*0.05), py);

    }, 16);
};

// create Image
var img = new Image();
img.src = "assets/images/zurich.jpg";
// img.src = "assets/images/cern.jpg";
