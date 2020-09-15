// Grabbing settings
var ww = window.innerWidth;
var wh = window.innerHeight;
var dst = document.getElementById('dst');
var img = new Image();
img.src = "assets/images/zurich.jpg"


function loadSrc(resolve) {
    console.log(resolve);
    LensModule.readImage(img);
}


function loop() {
    // console.log(LensModule);
    LensModule.startLoop();
}


LensModule.init({
    imageCvs: dst,
    windowWidth: ww,
    windowHeight: wh,
    initSuccessCallback: loadSrc,
    readCallback: loop
});
