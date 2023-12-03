(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("babylonjs"));
	else if(typeof define === 'function' && define.amd)
		define("babylonjs-post-process", ["babylonjs"], factory);
	else if(typeof exports === 'object')
		exports["babylonjs-post-process"] = factory(require("babylonjs"));
	else
		root["POSTPROCESSES"] = factory(root["BABYLON"]);
})((typeof self !== "undefined" ? self : typeof global !== "undefined" ? global : this), (__WEBPACK_EXTERNAL_MODULE_babylonjs_Misc_decorators__) => {
return /******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "../../../dev/postProcesses/src/asciiArt/asciiArtPostProcess.ts":
/*!**********************************************************************!*\
  !*** ../../../dev/postProcesses/src/asciiArt/asciiArtPostProcess.ts ***!
  \**********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AsciiArtFontTexture: () => (/* binding */ AsciiArtFontTexture),
/* harmony export */   AsciiArtPostProcess: () => (/* binding */ AsciiArtPostProcess)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! tslib */ "../../../../node_modules/tslib/tslib.es6.mjs");
/* harmony import */ var babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! babylonjs/Engines/Extensions/engine.dynamicTexture */ "babylonjs/Misc/decorators");
/* harmony import */ var babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _asciiart_fragment__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./asciiart.fragment */ "../../../dev/postProcesses/src/asciiArt/asciiart.fragment.ts");







/**
 * AsciiArtFontTexture is the helper class used to easily create your ascii art font texture.
 *
 * It basically takes care rendering the font front the given font size to a texture.
 * This is used later on in the postprocess.
 */
var AsciiArtFontTexture = /** @class */ (function (_super) {
    (0,tslib__WEBPACK_IMPORTED_MODULE_2__.__extends)(AsciiArtFontTexture, _super);
    /**
     * Create a new instance of the Ascii Art FontTexture class
     * @param name the name of the texture
     * @param font the font to use, use the W3C CSS notation
     * @param text the caracter set to use in the rendering.
     * @param scene the scene that owns the texture
     */
    function AsciiArtFontTexture(name, font, text, scene) {
        if (scene === void 0) { scene = null; }
        var _this = _super.call(this, scene) || this;
        scene = _this.getScene();
        if (!scene) {
            return _this;
        }
        _this.name = name;
        _this._text == text;
        _this._font == font;
        _this.wrapU = babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.Texture.CLAMP_ADDRESSMODE;
        _this.wrapV = babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.Texture.CLAMP_ADDRESSMODE;
        //this.anisotropicFilteringLevel = 1;
        // Get the font specific info.
        var maxCharHeight = _this._getFontHeight(font);
        var maxCharWidth = _this._getFontWidth(font);
        _this._charSize = Math.max(maxCharHeight.height, maxCharWidth);
        // This is an approximate size, but should always be able to fit at least the maxCharCount.
        var textureWidth = Math.ceil(_this._charSize * text.length);
        var textureHeight = _this._charSize;
        // Create the texture that will store the font characters.
        _this._texture = scene.getEngine().createDynamicTexture(textureWidth, textureHeight, false, babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.Texture.NEAREST_SAMPLINGMODE);
        //scene.getEngine().setclamp
        var textureSize = _this.getSize();
        // Create a canvas with the final size: the one matching the texture.
        var canvas = document.createElement("canvas");
        canvas.width = textureSize.width;
        canvas.height = textureSize.height;
        var context = canvas.getContext("2d");
        context.textBaseline = "top";
        context.font = font;
        context.fillStyle = "white";
        context.imageSmoothingEnabled = false;
        // Sets the text in the texture.
        for (var i = 0; i < text.length; i++) {
            context.fillText(text[i], i * _this._charSize, -maxCharHeight.offset);
        }
        // Flush the text in the dynamic texture.
        scene.getEngine().updateDynamicTexture(_this._texture, canvas, false, true);
        return _this;
    }
    Object.defineProperty(AsciiArtFontTexture.prototype, "charSize", {
        /**
         * Gets the size of one char in the texture (each char fits in size * size space in the texture).
         */
        get: function () {
            return this._charSize;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Gets the max char width of a font.
     * @param font the font to use, use the W3C CSS notation
     * @returns the max char width
     */
    AsciiArtFontTexture.prototype._getFontWidth = function (font) {
        var fontDraw = document.createElement("canvas");
        var ctx = fontDraw.getContext("2d");
        ctx.fillStyle = "white";
        ctx.font = font;
        return ctx.measureText("W").width;
    };
    // More info here: https://videlais.com/2014/03/16/the-many-and-varied-problems-with-measuring-font-height-for-html5-canvas/
    /**
     * Gets the max char height of a font.
     * @param font the font to use, use the W3C CSS notation
     * @returns the max char height
     */
    AsciiArtFontTexture.prototype._getFontHeight = function (font) {
        var fontDraw = document.createElement("canvas");
        var ctx = fontDraw.getContext("2d");
        ctx.fillRect(0, 0, fontDraw.width, fontDraw.height);
        ctx.textBaseline = "top";
        ctx.fillStyle = "white";
        ctx.font = font;
        ctx.fillText("jH|", 0, 0);
        var pixels = ctx.getImageData(0, 0, fontDraw.width, fontDraw.height).data;
        var start = -1;
        var end = -1;
        for (var row = 0; row < fontDraw.height; row++) {
            for (var column = 0; column < fontDraw.width; column++) {
                var index = (row * fontDraw.width + column) * 4;
                if (pixels[index] === 0) {
                    if (column === fontDraw.width - 1 && start !== -1) {
                        end = row;
                        row = fontDraw.height;
                        break;
                    }
                    continue;
                }
                else {
                    if (start === -1) {
                        start = row;
                    }
                    break;
                }
            }
        }
        return { height: end - start + 1, offset: start - 1 };
    };
    /**
     * Clones the current AsciiArtTexture.
     * @returns the clone of the texture.
     */
    AsciiArtFontTexture.prototype.clone = function () {
        return new AsciiArtFontTexture(this.name, this._font, this._text, this.getScene());
    };
    /**
     * Parses a json object representing the texture and returns an instance of it.
     * @param source the source JSON representation
     * @param scene the scene to create the texture for
     * @returns the parsed texture
     */
    AsciiArtFontTexture.Parse = function (source, scene) {
        var texture = babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.SerializationHelper.Parse(function () { return new AsciiArtFontTexture(source.name, source.font, source.text, scene); }, source, scene, null);
        return texture;
    };
    (0,tslib__WEBPACK_IMPORTED_MODULE_2__.__decorate)([
        (0,babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.serialize)("font")
    ], AsciiArtFontTexture.prototype, "_font", void 0);
    (0,tslib__WEBPACK_IMPORTED_MODULE_2__.__decorate)([
        (0,babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.serialize)("text")
    ], AsciiArtFontTexture.prototype, "_text", void 0);
    return AsciiArtFontTexture;
}(babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.BaseTexture));
/**
 * AsciiArtPostProcess helps rendering everithing in Ascii Art.
 *
 * Simmply add it to your scene and let the nerd that lives in you have fun.
 * Example usage: var pp = new AsciiArtPostProcess("myAscii", "20px Monospace", camera);
 */
var AsciiArtPostProcess = /** @class */ (function (_super) {
    (0,tslib__WEBPACK_IMPORTED_MODULE_2__.__extends)(AsciiArtPostProcess, _super);
    /**
     * Instantiates a new Ascii Art Post Process.
     * @param name the name to give to the postprocess
     * @camera the camera to apply the post process to.
     * @param camera
     * @param options can either be the font name or an option object following the IAsciiArtPostProcessOptions format
     */
    function AsciiArtPostProcess(name, camera, options) {
        var _this = _super.call(this, name, "asciiart", ["asciiArtFontInfos", "asciiArtOptions"], ["asciiArtFont"], 1, camera, babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.Texture.TRILINEAR_SAMPLINGMODE, undefined, true) || this;
        /**
         * This defines the amount you want to mix the "tile" or caracter space colored in the ascii art.
         * This number is defined between 0 and 1;
         */
        _this.mixToTile = 0;
        /**
         * This defines the amount you want to mix the normal rendering pass in the ascii art.
         * This number is defined between 0 and 1;
         */
        _this.mixToNormal = 0;
        // Default values.
        var font = "40px Monospace";
        var characterSet = " `-.'_:,\"=^;<+!*?/cL\\zrs7TivJtC{3F)Il(xZfY5S2eajo14[nuyE]P6V9kXpKwGhqAUbOd8#HRDB0$mgMW&Q%N@";
        // Use options.
        if (options) {
            if (typeof options === "string") {
                font = options;
            }
            else {
                font = options.font || font;
                characterSet = options.characterSet || characterSet;
                _this.mixToTile = options.mixToTile || _this.mixToTile;
                _this.mixToNormal = options.mixToNormal || _this.mixToNormal;
            }
        }
        var scene = (camera === null || camera === void 0 ? void 0 : camera.getScene()) || _this._scene;
        _this._asciiArtFontTexture = new AsciiArtFontTexture(name, font, characterSet, scene);
        var textureSize = _this._asciiArtFontTexture.getSize();
        _this.onApply = function (effect) {
            effect.setTexture("asciiArtFont", _this._asciiArtFontTexture);
            effect.setFloat4("asciiArtFontInfos", _this._asciiArtFontTexture.charSize, characterSet.length, textureSize.width, textureSize.height);
            effect.setFloat4("asciiArtOptions", _this.width, _this.height, _this.mixToNormal, _this.mixToTile);
        };
        return _this;
    }
    return AsciiArtPostProcess;
}(babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.PostProcess));



/***/ }),

/***/ "../../../dev/postProcesses/src/asciiArt/asciiart.fragment.ts":
/*!********************************************************************!*\
  !*** ../../../dev/postProcesses/src/asciiArt/asciiart.fragment.ts ***!
  \********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   asciiartPixelShader: () => (/* binding */ asciiartPixelShader)
/* harmony export */ });
/* harmony import */ var babylonjs_Engines_shaderStore__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! babylonjs/Engines/shaderStore */ "babylonjs/Misc/decorators");
/* harmony import */ var babylonjs_Engines_shaderStore__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(babylonjs_Engines_shaderStore__WEBPACK_IMPORTED_MODULE_0__);
// Do not edit.

var name = "asciiartPixelShader";
var shader = "varying vec2 vUV;uniform sampler2D textureSampler;uniform sampler2D asciiArtFont;uniform vec4 asciiArtFontInfos;uniform vec4 asciiArtOptions;float getLuminance(vec3 color)\n{return clamp(dot(color,vec3(0.2126,0.7152,0.0722)),0.,1.);}\n#define CUSTOM_FRAGMENT_DEFINITIONS\nvoid main(void) \n{float caracterSize=asciiArtFontInfos.x;float numChar=asciiArtFontInfos.y-1.0;float fontx=asciiArtFontInfos.z;float fonty=asciiArtFontInfos.w;float screenx=asciiArtOptions.x;float screeny=asciiArtOptions.y;float tileX=float(floor((gl_FragCoord.x)/caracterSize))*caracterSize/screenx;float tileY=float(floor((gl_FragCoord.y)/caracterSize))*caracterSize/screeny;vec2 tileUV=vec2(tileX,tileY);vec4 tileColor=texture2D(textureSampler,tileUV);vec4 baseColor=texture2D(textureSampler,vUV);float tileLuminance=getLuminance(tileColor.rgb);float offsetx=(float(floor(tileLuminance*numChar)))*caracterSize/fontx;float offsety=0.0;float x=float(mod(gl_FragCoord.x,caracterSize))/fontx;float y=float(mod(gl_FragCoord.y,caracterSize))/fonty;vec4 finalColor= texture2D(asciiArtFont,vec2(offsetx+x,offsety+(caracterSize/fonty-y)));finalColor.rgb*=tileColor.rgb;finalColor.a=1.0;finalColor= mix(finalColor,tileColor,asciiArtOptions.w);finalColor= mix(finalColor,baseColor,asciiArtOptions.z);gl_FragColor=finalColor;}";
// Sideeffect
babylonjs_Engines_shaderStore__WEBPACK_IMPORTED_MODULE_0__.ShaderStore.ShadersStore[name] = shader;
/** @internal */
var asciiartPixelShader = { name: name, shader: shader };


/***/ }),

/***/ "../../../dev/postProcesses/src/asciiArt/index.ts":
/*!********************************************************!*\
  !*** ../../../dev/postProcesses/src/asciiArt/index.ts ***!
  \********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AsciiArtFontTexture: () => (/* reexport safe */ _asciiArtPostProcess__WEBPACK_IMPORTED_MODULE_0__.AsciiArtFontTexture),
/* harmony export */   AsciiArtPostProcess: () => (/* reexport safe */ _asciiArtPostProcess__WEBPACK_IMPORTED_MODULE_0__.AsciiArtPostProcess)
/* harmony export */ });
/* harmony import */ var _asciiArtPostProcess__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./asciiArtPostProcess */ "../../../dev/postProcesses/src/asciiArt/asciiArtPostProcess.ts");



/***/ }),

/***/ "../../../dev/postProcesses/src/digitalRain/digitalRainPostProcess.ts":
/*!****************************************************************************!*\
  !*** ../../../dev/postProcesses/src/digitalRain/digitalRainPostProcess.ts ***!
  \****************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DigitalRainFontTexture: () => (/* binding */ DigitalRainFontTexture),
/* harmony export */   DigitalRainPostProcess: () => (/* binding */ DigitalRainPostProcess)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! tslib */ "../../../../node_modules/tslib/tslib.es6.mjs");
/* harmony import */ var babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! babylonjs/Engines/Extensions/engine.dynamicTexture */ "babylonjs/Misc/decorators");
/* harmony import */ var babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _digitalrain_fragment__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./digitalrain.fragment */ "../../../dev/postProcesses/src/digitalRain/digitalrain.fragment.ts");








/**
 * DigitalRainFontTexture is the helper class used to easily create your digital rain font texture.
 *
 * It basically takes care rendering the font front the given font size to a texture.
 * This is used later on in the postprocess.
 */
var DigitalRainFontTexture = /** @class */ (function (_super) {
    (0,tslib__WEBPACK_IMPORTED_MODULE_2__.__extends)(DigitalRainFontTexture, _super);
    /**
     * Create a new instance of the Digital Rain FontTexture class
     * @param name the name of the texture
     * @param font the font to use, use the W3C CSS notation
     * @param text the caracter set to use in the rendering.
     * @param scene the scene that owns the texture
     */
    function DigitalRainFontTexture(name, font, text, scene) {
        if (scene === void 0) { scene = null; }
        var _this = _super.call(this, scene) || this;
        scene = _this.getScene();
        if (!scene) {
            return _this;
        }
        _this.name = name;
        _this._text == text;
        _this._font == font;
        _this.wrapU = babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.Texture.CLAMP_ADDRESSMODE;
        _this.wrapV = babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.Texture.CLAMP_ADDRESSMODE;
        // Get the font specific info.
        var maxCharHeight = _this._getFontHeight(font);
        var maxCharWidth = _this._getFontWidth(font);
        _this._charSize = Math.max(maxCharHeight.height, maxCharWidth);
        // This is an approximate size, but should always be able to fit at least the maxCharCount.
        var textureWidth = _this._charSize;
        var textureHeight = Math.ceil(_this._charSize * text.length);
        // Create the texture that will store the font characters.
        _this._texture = scene.getEngine().createDynamicTexture(textureWidth, textureHeight, false, babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.Texture.NEAREST_SAMPLINGMODE);
        //scene.getEngine().setclamp
        var textureSize = _this.getSize();
        // Create a canvas with the final size: the one matching the texture.
        var canvas = document.createElement("canvas");
        canvas.width = textureSize.width;
        canvas.height = textureSize.height;
        var context = canvas.getContext("2d");
        context.textBaseline = "top";
        context.font = font;
        context.fillStyle = "white";
        context.imageSmoothingEnabled = false;
        // Sets the text in the texture.
        for (var i = 0; i < text.length; i++) {
            context.fillText(text[i], 0, i * _this._charSize - maxCharHeight.offset);
        }
        // Flush the text in the dynamic texture.
        scene.getEngine().updateDynamicTexture(_this._texture, canvas, false, true);
        return _this;
    }
    Object.defineProperty(DigitalRainFontTexture.prototype, "charSize", {
        /**
         * Gets the size of one char in the texture (each char fits in size * size space in the texture).
         */
        get: function () {
            return this._charSize;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Gets the max char width of a font.
     * @param font the font to use, use the W3C CSS notation
     * @returns the max char width
     */
    DigitalRainFontTexture.prototype._getFontWidth = function (font) {
        var fontDraw = document.createElement("canvas");
        var ctx = fontDraw.getContext("2d");
        ctx.fillStyle = "white";
        ctx.font = font;
        return ctx.measureText("W").width;
    };
    // More info here: https://videlais.com/2014/03/16/the-many-and-varied-problems-with-measuring-font-height-for-html5-canvas/
    /**
     * Gets the max char height of a font.
     * @param font the font to use, use the W3C CSS notation
     * @returns the max char height
     */
    DigitalRainFontTexture.prototype._getFontHeight = function (font) {
        var fontDraw = document.createElement("canvas");
        var ctx = fontDraw.getContext("2d");
        ctx.fillRect(0, 0, fontDraw.width, fontDraw.height);
        ctx.textBaseline = "top";
        ctx.fillStyle = "white";
        ctx.font = font;
        ctx.fillText("jH|", 0, 0);
        var pixels = ctx.getImageData(0, 0, fontDraw.width, fontDraw.height).data;
        var start = -1;
        var end = -1;
        for (var row = 0; row < fontDraw.height; row++) {
            for (var column = 0; column < fontDraw.width; column++) {
                var index = (row * fontDraw.width + column) * 4;
                if (pixels[index] === 0) {
                    if (column === fontDraw.width - 1 && start !== -1) {
                        end = row;
                        row = fontDraw.height;
                        break;
                    }
                    continue;
                }
                else {
                    if (start === -1) {
                        start = row;
                    }
                    break;
                }
            }
        }
        return { height: end - start + 1, offset: start - 1 };
    };
    /**
     * Clones the current DigitalRainFontTexture.
     * @returns the clone of the texture.
     */
    DigitalRainFontTexture.prototype.clone = function () {
        return new DigitalRainFontTexture(this.name, this._font, this._text, this.getScene());
    };
    /**
     * Parses a json object representing the texture and returns an instance of it.
     * @param source the source JSON representation
     * @param scene the scene to create the texture for
     * @returns the parsed texture
     */
    DigitalRainFontTexture.Parse = function (source, scene) {
        var texture = babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.SerializationHelper.Parse(function () { return new DigitalRainFontTexture(source.name, source.font, source.text, scene); }, source, scene, null);
        return texture;
    };
    (0,tslib__WEBPACK_IMPORTED_MODULE_2__.__decorate)([
        (0,babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.serialize)("font")
    ], DigitalRainFontTexture.prototype, "_font", void 0);
    (0,tslib__WEBPACK_IMPORTED_MODULE_2__.__decorate)([
        (0,babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.serialize)("text")
    ], DigitalRainFontTexture.prototype, "_text", void 0);
    return DigitalRainFontTexture;
}(babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.BaseTexture));
/**
 * DigitalRainPostProcess helps rendering everithing in digital rain.
 *
 * Simmply add it to your scene and let the nerd that lives in you have fun.
 * Example usage: var pp = new DigitalRainPostProcess("digitalRain", "20px Monospace", camera);
 */
var DigitalRainPostProcess = /** @class */ (function (_super) {
    (0,tslib__WEBPACK_IMPORTED_MODULE_2__.__extends)(DigitalRainPostProcess, _super);
    /**
     * Instantiates a new Digital Rain Post Process.
     * @param name the name to give to the postprocess
     * @camera the camera to apply the post process to.
     * @param camera
     * @param options can either be the font name or an option object following the IDigitalRainPostProcessOptions format
     */
    function DigitalRainPostProcess(name, camera, options) {
        var _this = _super.call(this, name, "digitalrain", ["digitalRainFontInfos", "digitalRainOptions", "cosTimeZeroOne", "matrixSpeed"], ["digitalRainFont"], 1.0, camera, babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.Texture.TRILINEAR_SAMPLINGMODE, undefined, true) || this;
        /**
         * This defines the amount you want to mix the "tile" or caracter space colored in the digital rain.
         * This number is defined between 0 and 1;
         */
        _this.mixToTile = 0;
        /**
         * This defines the amount you want to mix the normal rendering pass in the digital rain.
         * This number is defined between 0 and 1;
         */
        _this.mixToNormal = 0;
        /**
         * Speed of the effect
         */
        _this.speed = 0.003;
        // Default values.
        var font = "15px Monospace";
        var characterSet = "古池や蛙飛び込む水の音ふるいけやかわずとびこむみずのおと初しぐれ猿も小蓑をほしげ也はつしぐれさるもこみのをほしげなり江戸の雨何石呑んだ時鳥えどのあめなんごくのんだほととぎす";
        // Use options.
        if (options) {
            if (typeof options === "string") {
                font = options;
            }
            else {
                font = options.font || font;
                _this.mixToTile = options.mixToTile || _this.mixToTile;
                _this.mixToNormal = options.mixToNormal || _this.mixToNormal;
            }
        }
        var scene = (camera === null || camera === void 0 ? void 0 : camera.getScene()) || null;
        _this._digitalRainFontTexture = new DigitalRainFontTexture(name, font, characterSet, scene);
        var textureSize = _this._digitalRainFontTexture.getSize();
        var alpha = 0.0;
        var cosTimeZeroOne = 0.0;
        var matrix = babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.Matrix.FromValues(Math.random(), Math.random(), Math.random(), Math.random(), Math.random(), Math.random(), Math.random(), Math.random(), Math.random(), Math.random(), Math.random(), Math.random(), Math.random(), Math.random(), Math.random(), Math.random());
        _this.onApply = function (effect) {
            effect.setTexture("digitalRainFont", _this._digitalRainFontTexture);
            effect.setFloat4("digitalRainFontInfos", _this._digitalRainFontTexture.charSize, characterSet.length, textureSize.width, textureSize.height);
            effect.setFloat4("digitalRainOptions", _this.width, _this.height, _this.mixToNormal, _this.mixToTile);
            effect.setMatrix("matrixSpeed", matrix);
            alpha += _this.speed;
            cosTimeZeroOne = alpha;
            effect.setFloat("cosTimeZeroOne", cosTimeZeroOne);
        };
        return _this;
    }
    return DigitalRainPostProcess;
}(babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.PostProcess));



/***/ }),

/***/ "../../../dev/postProcesses/src/digitalRain/digitalrain.fragment.ts":
/*!**************************************************************************!*\
  !*** ../../../dev/postProcesses/src/digitalRain/digitalrain.fragment.ts ***!
  \**************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   digitalrainPixelShader: () => (/* binding */ digitalrainPixelShader)
/* harmony export */ });
/* harmony import */ var babylonjs_Engines_shaderStore__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! babylonjs/Engines/shaderStore */ "babylonjs/Misc/decorators");
/* harmony import */ var babylonjs_Engines_shaderStore__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(babylonjs_Engines_shaderStore__WEBPACK_IMPORTED_MODULE_0__);
// Do not edit.

var name = "digitalrainPixelShader";
var shader = "varying vec2 vUV;uniform sampler2D textureSampler;uniform sampler2D digitalRainFont;uniform vec4 digitalRainFontInfos;uniform vec4 digitalRainOptions;uniform mat4 matrixSpeed;uniform float cosTimeZeroOne;float getLuminance(vec3 color)\n{return clamp(dot(color,vec3(0.2126,0.7152,0.0722)),0.,1.);}\n#define CUSTOM_FRAGMENT_DEFINITIONS\nvoid main(void) \n{float caracterSize=digitalRainFontInfos.x;float numChar=digitalRainFontInfos.y-1.0;float fontx=digitalRainFontInfos.z;float fonty=digitalRainFontInfos.w;float screenx=digitalRainOptions.x;float screeny=digitalRainOptions.y;float ratio=screeny/fonty;float columnx=float(floor((gl_FragCoord.x)/caracterSize));float tileX=float(floor((gl_FragCoord.x)/caracterSize))*caracterSize/screenx;float tileY=float(floor((gl_FragCoord.y)/caracterSize))*caracterSize/screeny;vec2 tileUV=vec2(tileX,tileY);vec4 tileColor=texture2D(textureSampler,tileUV);vec4 baseColor=texture2D(textureSampler,vUV);float tileLuminance=getLuminance(tileColor.rgb);int st=int(mod(columnx,4.0));float speed=cosTimeZeroOne*(sin(tileX*314.5)*0.5+0.6); \nfloat x=float(mod(gl_FragCoord.x,caracterSize))/fontx;float y=float(mod(speed+gl_FragCoord.y/screeny,1.0));y*=ratio;vec4 finalColor= texture2D(digitalRainFont,vec2(x,1.0-y));vec3 high=finalColor.rgb*(vec3(1.2,1.2,1.2)*pow(1.0-y,30.0));finalColor.rgb*=vec3(pow(tileLuminance,5.0),pow(tileLuminance,1.5),pow(tileLuminance,3.0));finalColor.rgb+=high;finalColor.rgb=clamp(finalColor.rgb,0.,1.);finalColor.a=1.0;finalColor= mix(finalColor,tileColor,digitalRainOptions.w);finalColor= mix(finalColor,baseColor,digitalRainOptions.z);gl_FragColor=finalColor;}";
// Sideeffect
babylonjs_Engines_shaderStore__WEBPACK_IMPORTED_MODULE_0__.ShaderStore.ShadersStore[name] = shader;
/** @internal */
var digitalrainPixelShader = { name: name, shader: shader };


/***/ }),

/***/ "../../../dev/postProcesses/src/digitalRain/index.ts":
/*!***********************************************************!*\
  !*** ../../../dev/postProcesses/src/digitalRain/index.ts ***!
  \***********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DigitalRainFontTexture: () => (/* reexport safe */ _digitalRainPostProcess__WEBPACK_IMPORTED_MODULE_0__.DigitalRainFontTexture),
/* harmony export */   DigitalRainPostProcess: () => (/* reexport safe */ _digitalRainPostProcess__WEBPACK_IMPORTED_MODULE_0__.DigitalRainPostProcess)
/* harmony export */ });
/* harmony import */ var _digitalRainPostProcess__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./digitalRainPostProcess */ "../../../dev/postProcesses/src/digitalRain/digitalRainPostProcess.ts");



/***/ }),

/***/ "../../../dev/postProcesses/src/index.ts":
/*!***********************************************!*\
  !*** ../../../dev/postProcesses/src/index.ts ***!
  \***********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AsciiArtFontTexture: () => (/* reexport safe */ _asciiArt_index__WEBPACK_IMPORTED_MODULE_0__.AsciiArtFontTexture),
/* harmony export */   AsciiArtPostProcess: () => (/* reexport safe */ _asciiArt_index__WEBPACK_IMPORTED_MODULE_0__.AsciiArtPostProcess),
/* harmony export */   DigitalRainFontTexture: () => (/* reexport safe */ _digitalRain_index__WEBPACK_IMPORTED_MODULE_1__.DigitalRainFontTexture),
/* harmony export */   DigitalRainPostProcess: () => (/* reexport safe */ _digitalRain_index__WEBPACK_IMPORTED_MODULE_1__.DigitalRainPostProcess)
/* harmony export */ });
/* harmony import */ var _asciiArt_index__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./asciiArt/index */ "../../../dev/postProcesses/src/asciiArt/index.ts");
/* harmony import */ var _digitalRain_index__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./digitalRain/index */ "../../../dev/postProcesses/src/digitalRain/index.ts");
/* eslint-disable import/no-internal-modules */




/***/ }),

/***/ "../../../lts/postProcesses/src/legacy/legacy.ts":
/*!*******************************************************!*\
  !*** ../../../lts/postProcesses/src/legacy/legacy.ts ***!
  \*******************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AsciiArtFontTexture: () => (/* reexport safe */ post_processes_index__WEBPACK_IMPORTED_MODULE_0__.AsciiArtFontTexture),
/* harmony export */   AsciiArtPostProcess: () => (/* reexport safe */ post_processes_index__WEBPACK_IMPORTED_MODULE_0__.AsciiArtPostProcess),
/* harmony export */   DigitalRainFontTexture: () => (/* reexport safe */ post_processes_index__WEBPACK_IMPORTED_MODULE_0__.DigitalRainFontTexture),
/* harmony export */   DigitalRainPostProcess: () => (/* reexport safe */ post_processes_index__WEBPACK_IMPORTED_MODULE_0__.DigitalRainPostProcess)
/* harmony export */ });
/* harmony import */ var post_processes_index__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! post-processes/index */ "../../../dev/postProcesses/src/index.ts");
/* eslint-disable import/no-internal-modules */

/**
 *
 * This is the entry point for the UMD module.
 * The entry point for a future ESM package should be index.ts
 */
var globalObject = typeof __webpack_require__.g !== "undefined" ? __webpack_require__.g : typeof window !== "undefined" ? window : undefined;
if (typeof globalObject !== "undefined") {
    for (var key in post_processes_index__WEBPACK_IMPORTED_MODULE_0__) {
        globalObject.BABYLON[key] = post_processes_index__WEBPACK_IMPORTED_MODULE_0__[key];
    }
}



/***/ }),

/***/ "babylonjs/Misc/decorators":
/*!****************************************************************************************************!*\
  !*** external {"root":"BABYLON","commonjs":"babylonjs","commonjs2":"babylonjs","amd":"babylonjs"} ***!
  \****************************************************************************************************/
/***/ ((module) => {

module.exports = __WEBPACK_EXTERNAL_MODULE_babylonjs_Misc_decorators__;

/***/ }),

/***/ "../../../../node_modules/tslib/tslib.es6.mjs":
/*!****************************************************!*\
  !*** ../../../../node_modules/tslib/tslib.es6.mjs ***!
  \****************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   __addDisposableResource: () => (/* binding */ __addDisposableResource),
/* harmony export */   __assign: () => (/* binding */ __assign),
/* harmony export */   __asyncDelegator: () => (/* binding */ __asyncDelegator),
/* harmony export */   __asyncGenerator: () => (/* binding */ __asyncGenerator),
/* harmony export */   __asyncValues: () => (/* binding */ __asyncValues),
/* harmony export */   __await: () => (/* binding */ __await),
/* harmony export */   __awaiter: () => (/* binding */ __awaiter),
/* harmony export */   __classPrivateFieldGet: () => (/* binding */ __classPrivateFieldGet),
/* harmony export */   __classPrivateFieldIn: () => (/* binding */ __classPrivateFieldIn),
/* harmony export */   __classPrivateFieldSet: () => (/* binding */ __classPrivateFieldSet),
/* harmony export */   __createBinding: () => (/* binding */ __createBinding),
/* harmony export */   __decorate: () => (/* binding */ __decorate),
/* harmony export */   __disposeResources: () => (/* binding */ __disposeResources),
/* harmony export */   __esDecorate: () => (/* binding */ __esDecorate),
/* harmony export */   __exportStar: () => (/* binding */ __exportStar),
/* harmony export */   __extends: () => (/* binding */ __extends),
/* harmony export */   __generator: () => (/* binding */ __generator),
/* harmony export */   __importDefault: () => (/* binding */ __importDefault),
/* harmony export */   __importStar: () => (/* binding */ __importStar),
/* harmony export */   __makeTemplateObject: () => (/* binding */ __makeTemplateObject),
/* harmony export */   __metadata: () => (/* binding */ __metadata),
/* harmony export */   __param: () => (/* binding */ __param),
/* harmony export */   __propKey: () => (/* binding */ __propKey),
/* harmony export */   __read: () => (/* binding */ __read),
/* harmony export */   __rest: () => (/* binding */ __rest),
/* harmony export */   __runInitializers: () => (/* binding */ __runInitializers),
/* harmony export */   __setFunctionName: () => (/* binding */ __setFunctionName),
/* harmony export */   __spread: () => (/* binding */ __spread),
/* harmony export */   __spreadArray: () => (/* binding */ __spreadArray),
/* harmony export */   __spreadArrays: () => (/* binding */ __spreadArrays),
/* harmony export */   __values: () => (/* binding */ __values),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol */

var extendStatics = function(d, b) {
  extendStatics = Object.setPrototypeOf ||
      ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
      function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
  return extendStatics(d, b);
};

function __extends(d, b) {
  if (typeof b !== "function" && b !== null)
      throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
  extendStatics(d, b);
  function __() { this.constructor = d; }
  d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

var __assign = function() {
  __assign = Object.assign || function __assign(t) {
      for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
      }
      return t;
  }
  return __assign.apply(this, arguments);
}

function __rest(s, e) {
  var t = {};
  for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
      t[p] = s[p];
  if (s != null && typeof Object.getOwnPropertySymbols === "function")
      for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
          if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
              t[p[i]] = s[p[i]];
      }
  return t;
}

function __decorate(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}

function __param(paramIndex, decorator) {
  return function (target, key) { decorator(target, key, paramIndex); }
}

function __esDecorate(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
  function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
  var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
  var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
  var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
  var _, done = false;
  for (var i = decorators.length - 1; i >= 0; i--) {
      var context = {};
      for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
      for (var p in contextIn.access) context.access[p] = contextIn.access[p];
      context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
      var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
      if (kind === "accessor") {
          if (result === void 0) continue;
          if (result === null || typeof result !== "object") throw new TypeError("Object expected");
          if (_ = accept(result.get)) descriptor.get = _;
          if (_ = accept(result.set)) descriptor.set = _;
          if (_ = accept(result.init)) initializers.unshift(_);
      }
      else if (_ = accept(result)) {
          if (kind === "field") initializers.unshift(_);
          else descriptor[key] = _;
      }
  }
  if (target) Object.defineProperty(target, contextIn.name, descriptor);
  done = true;
};

function __runInitializers(thisArg, initializers, value) {
  var useValue = arguments.length > 2;
  for (var i = 0; i < initializers.length; i++) {
      value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
  }
  return useValue ? value : void 0;
};

function __propKey(x) {
  return typeof x === "symbol" ? x : "".concat(x);
};

function __setFunctionName(f, name, prefix) {
  if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
  return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};

function __metadata(metadataKey, metadataValue) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
}

function __awaiter(thisArg, _arguments, P, generator) {
  function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
  return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
      function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
      function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
}

function __generator(thisArg, body) {
  var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
  function verb(n) { return function (v) { return step([n, v]); }; }
  function step(op) {
      if (f) throw new TypeError("Generator is already executing.");
      while (g && (g = 0, op[0] && (_ = 0)), _) try {
          if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
          if (y = 0, t) op = [op[0] & 2, t.value];
          switch (op[0]) {
              case 0: case 1: t = op; break;
              case 4: _.label++; return { value: op[1], done: false };
              case 5: _.label++; y = op[1]; op = [0]; continue;
              case 7: op = _.ops.pop(); _.trys.pop(); continue;
              default:
                  if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                  if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                  if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                  if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                  if (t[2]) _.ops.pop();
                  _.trys.pop(); continue;
          }
          op = body.call(thisArg, _);
      } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
      if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
  }
}

var __createBinding = Object.create ? (function(o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  var desc = Object.getOwnPropertyDescriptor(m, k);
  if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
  }
  Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  o[k2] = m[k];
});

function __exportStar(m, o) {
  for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(o, p)) __createBinding(o, m, p);
}

function __values(o) {
  var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
  if (m) return m.call(o);
  if (o && typeof o.length === "number") return {
      next: function () {
          if (o && i >= o.length) o = void 0;
          return { value: o && o[i++], done: !o };
      }
  };
  throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
}

function __read(o, n) {
  var m = typeof Symbol === "function" && o[Symbol.iterator];
  if (!m) return o;
  var i = m.call(o), r, ar = [], e;
  try {
      while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
  }
  catch (error) { e = { error: error }; }
  finally {
      try {
          if (r && !r.done && (m = i["return"])) m.call(i);
      }
      finally { if (e) throw e.error; }
  }
  return ar;
}

/** @deprecated */
function __spread() {
  for (var ar = [], i = 0; i < arguments.length; i++)
      ar = ar.concat(__read(arguments[i]));
  return ar;
}

/** @deprecated */
function __spreadArrays() {
  for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
  for (var r = Array(s), k = 0, i = 0; i < il; i++)
      for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
          r[k] = a[j];
  return r;
}

function __spreadArray(to, from, pack) {
  if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
      if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
      }
  }
  return to.concat(ar || Array.prototype.slice.call(from));
}

function __await(v) {
  return this instanceof __await ? (this.v = v, this) : new __await(v);
}

function __asyncGenerator(thisArg, _arguments, generator) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var g = generator.apply(thisArg, _arguments || []), i, q = [];
  return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
  function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
  function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
  function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
  function fulfill(value) { resume("next", value); }
  function reject(value) { resume("throw", value); }
  function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
}

function __asyncDelegator(o) {
  var i, p;
  return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
  function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: false } : f ? f(v) : v; } : f; }
}

function __asyncValues(o) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var m = o[Symbol.asyncIterator], i;
  return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
  function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
  function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
}

function __makeTemplateObject(cooked, raw) {
  if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
  return cooked;
};

var __setModuleDefault = Object.create ? (function(o, v) {
  Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
  o["default"] = v;
};

function __importStar(mod) {
  if (mod && mod.__esModule) return mod;
  var result = {};
  if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
  __setModuleDefault(result, mod);
  return result;
}

function __importDefault(mod) {
  return (mod && mod.__esModule) ? mod : { default: mod };
}

function __classPrivateFieldGet(receiver, state, kind, f) {
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}

function __classPrivateFieldSet(receiver, state, value, kind, f) {
  if (kind === "m") throw new TypeError("Private method is not writable");
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
}

function __classPrivateFieldIn(state, receiver) {
  if (receiver === null || (typeof receiver !== "object" && typeof receiver !== "function")) throw new TypeError("Cannot use 'in' operator on non-object");
  return typeof state === "function" ? receiver === state : state.has(receiver);
}

function __addDisposableResource(env, value, async) {
  if (value !== null && value !== void 0) {
    if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
    var dispose;
    if (async) {
        if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
        dispose = value[Symbol.asyncDispose];
    }
    if (dispose === void 0) {
        if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
        dispose = value[Symbol.dispose];
    }
    if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
    env.stack.push({ value: value, dispose: dispose, async: async });
  }
  else if (async) {
    env.stack.push({ async: true });
  }
  return value;
}

var _SuppressedError = typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
  var e = new Error(message);
  return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

function __disposeResources(env) {
  function fail(e) {
    env.error = env.hasError ? new _SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
    env.hasError = true;
  }
  function next() {
    while (env.stack.length) {
      var rec = env.stack.pop();
      try {
        var result = rec.dispose && rec.dispose.call(rec.value);
        if (rec.async) return Promise.resolve(result).then(next, function(e) { fail(e); return next(); });
      }
      catch (e) {
          fail(e);
      }
    }
    if (env.hasError) throw env.error;
  }
  return next();
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({
  __extends,
  __assign,
  __rest,
  __decorate,
  __param,
  __metadata,
  __awaiter,
  __generator,
  __createBinding,
  __exportStar,
  __values,
  __read,
  __spread,
  __spreadArrays,
  __spreadArray,
  __await,
  __asyncGenerator,
  __asyncDelegator,
  __asyncValues,
  __makeTemplateObject,
  __importStar,
  __importDefault,
  __classPrivateFieldGet,
  __classPrivateFieldSet,
  __classPrivateFieldIn,
  __addDisposableResource,
  __disposeResources,
});


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
/*!**********************!*\
  !*** ./src/index.ts ***!
  \**********************/
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   postProcess: () => (/* reexport module object */ _lts_post_processes_legacy_legacy__WEBPACK_IMPORTED_MODULE_0__)
/* harmony export */ });
/* harmony import */ var _lts_post_processes_legacy_legacy__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @lts/post-processes/legacy/legacy */ "../../../lts/postProcesses/src/legacy/legacy.ts");


/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (_lts_post_processes_legacy_legacy__WEBPACK_IMPORTED_MODULE_0__);

})();

__webpack_exports__ = __webpack_exports__["default"];
/******/ 	return __webpack_exports__;
/******/ })()
;
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFieWxvbmpzLnBvc3RQcm9jZXNzLmpzIiwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDVEE7QUFFQTtBQUNBO0FBRUE7QUFFQTtBQUNBO0FBRUE7Ozs7O0FBS0E7QUFDQTtBQUFBO0FBZ0JBOzs7Ozs7QUFNQTtBQUNBO0FBQUE7QUFBQTtBQUdBO0FBRUE7O0FBRUE7QUFFQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFFQTtBQUVBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUVBOztBQUNBO0FBN0RBO0FBSEE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7OztBQUFBO0FBNkRBOzs7O0FBSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUVBO0FBQ0E7Ozs7QUFJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFFQTs7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFFQTs7Ozs7QUFLQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBL0lBO0FBREE7QUFDQTtBQUdBO0FBREE7QUFDQTtBQTZJQTtBQUFBO0FBNkJBOzs7OztBQUtBO0FBQ0E7QUFBQTtBQWtCQTs7Ozs7O0FBTUE7QUFDQTtBQUFBO0FBbkJBOzs7QUFHQTtBQUNBO0FBRUE7OztBQUdBO0FBQ0E7QUFZQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBRUE7QUFFQTtBQUNBOztBQUNBO0FBQ0E7QUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDOVBBO0FBQ0E7QUFFQTtBQUNBO0FBS0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDWkE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ0NBO0FBQ0E7QUFFQTtBQUNBO0FBRUE7QUFFQTtBQUNBO0FBRUE7Ozs7O0FBS0E7QUFDQTtBQUFBO0FBZ0JBOzs7Ozs7QUFNQTtBQUNBO0FBQUE7QUFBQTtBQUdBO0FBRUE7O0FBRUE7QUFFQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBRUE7QUFFQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTs7QUFDQTtBQTNEQTtBQUhBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOzs7QUFBQTtBQTJEQTs7OztBQUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFFQTtBQUNBOzs7O0FBSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7OztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7Ozs7O0FBS0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQTdJQTtBQURBO0FBQ0E7QUFHQTtBQURBO0FBQ0E7QUEySUE7QUFBQTtBQXdCQTs7Ozs7QUFLQTtBQUNBO0FBQUE7QUF1QkE7Ozs7OztBQU1BO0FBQ0E7QUFBQTtBQXhCQTs7O0FBR0E7QUFDQTtBQUVBOzs7QUFHQTtBQUNBO0FBRUE7O0FBRUE7QUFDQTtBQXNCQTtBQUNBO0FBQ0E7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBbUJBO0FBQ0E7QUFFQTtBQUVBO0FBRUE7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQTtBQUNBO0FBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ2xTQTtBQUNBO0FBRUE7QUFDQTtBQU1BO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7Ozs7Ozs7Ozs7OztBQ2JBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ0FBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ0ZBO0FBQ0E7QUFFQTs7OztBQUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7Ozs7Ozs7Ozs7O0FDZkE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7O0FDalhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNQQTs7Ozs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7Ozs7OztBQ05BO0FBQ0E7QUFDQSIsInNvdXJjZXMiOlsid2VicGFjazovL1BPU1RQUk9DRVNTRVMvd2VicGFjay91bml2ZXJzYWxNb2R1bGVEZWZpbml0aW9uIiwid2VicGFjazovL1BPU1RQUk9DRVNTRVMvLi4vLi4vLi4vZGV2L3Bvc3RQcm9jZXNzZXMvc3JjL2FzY2lpQXJ0L2FzY2lpQXJ0UG9zdFByb2Nlc3MudHMiLCJ3ZWJwYWNrOi8vUE9TVFBST0NFU1NFUy8uLi8uLi8uLi9kZXYvcG9zdFByb2Nlc3Nlcy9zcmMvYXNjaWlBcnQvYXNjaWlhcnQuZnJhZ21lbnQudHMiLCJ3ZWJwYWNrOi8vUE9TVFBST0NFU1NFUy8uLi8uLi8uLi9kZXYvcG9zdFByb2Nlc3Nlcy9zcmMvYXNjaWlBcnQvaW5kZXgudHMiLCJ3ZWJwYWNrOi8vUE9TVFBST0NFU1NFUy8uLi8uLi8uLi9kZXYvcG9zdFByb2Nlc3Nlcy9zcmMvZGlnaXRhbFJhaW4vZGlnaXRhbFJhaW5Qb3N0UHJvY2Vzcy50cyIsIndlYnBhY2s6Ly9QT1NUUFJPQ0VTU0VTLy4uLy4uLy4uL2Rldi9wb3N0UHJvY2Vzc2VzL3NyYy9kaWdpdGFsUmFpbi9kaWdpdGFscmFpbi5mcmFnbWVudC50cyIsIndlYnBhY2s6Ly9QT1NUUFJPQ0VTU0VTLy4uLy4uLy4uL2Rldi9wb3N0UHJvY2Vzc2VzL3NyYy9kaWdpdGFsUmFpbi9pbmRleC50cyIsIndlYnBhY2s6Ly9QT1NUUFJPQ0VTU0VTLy4uLy4uLy4uL2Rldi9wb3N0UHJvY2Vzc2VzL3NyYy9pbmRleC50cyIsIndlYnBhY2s6Ly9QT1NUUFJPQ0VTU0VTLy4uLy4uLy4uL2x0cy9wb3N0UHJvY2Vzc2VzL3NyYy9sZWdhY3kvbGVnYWN5LnRzIiwid2VicGFjazovL1BPU1RQUk9DRVNTRVMvZXh0ZXJuYWwgdW1kIHtcInJvb3RcIjpcIkJBQllMT05cIixcImNvbW1vbmpzXCI6XCJiYWJ5bG9uanNcIixcImNvbW1vbmpzMlwiOlwiYmFieWxvbmpzXCIsXCJhbWRcIjpcImJhYnlsb25qc1wifSIsIndlYnBhY2s6Ly9QT1NUUFJPQ0VTU0VTLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy90c2xpYi90c2xpYi5lczYubWpzIiwid2VicGFjazovL1BPU1RQUk9DRVNTRVMvd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vUE9TVFBST0NFU1NFUy93ZWJwYWNrL3J1bnRpbWUvY29tcGF0IGdldCBkZWZhdWx0IGV4cG9ydCIsIndlYnBhY2s6Ly9QT1NUUFJPQ0VTU0VTL3dlYnBhY2svcnVudGltZS9kZWZpbmUgcHJvcGVydHkgZ2V0dGVycyIsIndlYnBhY2s6Ly9QT1NUUFJPQ0VTU0VTL3dlYnBhY2svcnVudGltZS9nbG9iYWwiLCJ3ZWJwYWNrOi8vUE9TVFBST0NFU1NFUy93ZWJwYWNrL3J1bnRpbWUvaGFzT3duUHJvcGVydHkgc2hvcnRoYW5kIiwid2VicGFjazovL1BPU1RQUk9DRVNTRVMvd2VicGFjay9ydW50aW1lL21ha2UgbmFtZXNwYWNlIG9iamVjdCIsIndlYnBhY2s6Ly9QT1NUUFJPQ0VTU0VTLy4vc3JjL2luZGV4LnRzIl0sInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiB3ZWJwYWNrVW5pdmVyc2FsTW9kdWxlRGVmaW5pdGlvbihyb290LCBmYWN0b3J5KSB7XG5cdGlmKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0Jylcblx0XHRtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZShcImJhYnlsb25qc1wiKSk7XG5cdGVsc2UgaWYodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKVxuXHRcdGRlZmluZShcImJhYnlsb25qcy1wb3N0LXByb2Nlc3NcIiwgW1wiYmFieWxvbmpzXCJdLCBmYWN0b3J5KTtcblx0ZWxzZSBpZih0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcpXG5cdFx0ZXhwb3J0c1tcImJhYnlsb25qcy1wb3N0LXByb2Nlc3NcIl0gPSBmYWN0b3J5KHJlcXVpcmUoXCJiYWJ5bG9uanNcIikpO1xuXHRlbHNlXG5cdFx0cm9vdFtcIlBPU1RQUk9DRVNTRVNcIl0gPSBmYWN0b3J5KHJvb3RbXCJCQUJZTE9OXCJdKTtcbn0pKCh0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdGhpcyksIChfX1dFQlBBQ0tfRVhURVJOQUxfTU9EVUxFX2JhYnlsb25qc19NaXNjX2RlY29yYXRvcnNfXykgPT4ge1xucmV0dXJuICIsImltcG9ydCB0eXBlIHsgTnVsbGFibGUgfSBmcm9tIFwiY29yZS90eXBlc1wiO1xyXG5pbXBvcnQgeyBzZXJpYWxpemUsIFNlcmlhbGl6YXRpb25IZWxwZXIgfSBmcm9tIFwiY29yZS9NaXNjL2RlY29yYXRvcnNcIjtcclxuaW1wb3J0IHR5cGUgeyBDYW1lcmEgfSBmcm9tIFwiY29yZS9DYW1lcmFzL2NhbWVyYVwiO1xyXG5pbXBvcnQgeyBCYXNlVGV4dHVyZSB9IGZyb20gXCJjb3JlL01hdGVyaWFscy9UZXh0dXJlcy9iYXNlVGV4dHVyZVwiO1xyXG5pbXBvcnQgeyBUZXh0dXJlIH0gZnJvbSBcImNvcmUvTWF0ZXJpYWxzL1RleHR1cmVzL3RleHR1cmVcIjtcclxuaW1wb3J0IHR5cGUgeyBFZmZlY3QgfSBmcm9tIFwiY29yZS9NYXRlcmlhbHMvZWZmZWN0XCI7XHJcbmltcG9ydCB7IFBvc3RQcm9jZXNzIH0gZnJvbSBcImNvcmUvUG9zdFByb2Nlc3Nlcy9wb3N0UHJvY2Vzc1wiO1xyXG5pbXBvcnQgdHlwZSB7IFNjZW5lIH0gZnJvbSBcImNvcmUvc2NlbmVcIjtcclxuaW1wb3J0IFwiY29yZS9FbmdpbmVzL0V4dGVuc2lvbnMvZW5naW5lLmR5bmFtaWNUZXh0dXJlXCI7XHJcbmltcG9ydCBcIi4vYXNjaWlhcnQuZnJhZ21lbnRcIjtcclxuXHJcbi8qKlxyXG4gKiBBc2NpaUFydEZvbnRUZXh0dXJlIGlzIHRoZSBoZWxwZXIgY2xhc3MgdXNlZCB0byBlYXNpbHkgY3JlYXRlIHlvdXIgYXNjaWkgYXJ0IGZvbnQgdGV4dHVyZS5cclxuICpcclxuICogSXQgYmFzaWNhbGx5IHRha2VzIGNhcmUgcmVuZGVyaW5nIHRoZSBmb250IGZyb250IHRoZSBnaXZlbiBmb250IHNpemUgdG8gYSB0ZXh0dXJlLlxyXG4gKiBUaGlzIGlzIHVzZWQgbGF0ZXIgb24gaW4gdGhlIHBvc3Rwcm9jZXNzLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIEFzY2lpQXJ0Rm9udFRleHR1cmUgZXh0ZW5kcyBCYXNlVGV4dHVyZSB7XHJcbiAgICBAc2VyaWFsaXplKFwiZm9udFwiKVxyXG4gICAgcHJpdmF0ZSBfZm9udDogc3RyaW5nO1xyXG5cclxuICAgIEBzZXJpYWxpemUoXCJ0ZXh0XCIpXHJcbiAgICBwcml2YXRlIF90ZXh0OiBzdHJpbmc7XHJcblxyXG4gICAgcHJpdmF0ZSBfY2hhclNpemU6IG51bWJlcjtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEdldHMgdGhlIHNpemUgb2Ygb25lIGNoYXIgaW4gdGhlIHRleHR1cmUgKGVhY2ggY2hhciBmaXRzIGluIHNpemUgKiBzaXplIHNwYWNlIGluIHRoZSB0ZXh0dXJlKS5cclxuICAgICAqL1xyXG4gICAgcHVibGljIGdldCBjaGFyU2l6ZSgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLl9jaGFyU2l6ZTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIENyZWF0ZSBhIG5ldyBpbnN0YW5jZSBvZiB0aGUgQXNjaWkgQXJ0IEZvbnRUZXh0dXJlIGNsYXNzXHJcbiAgICAgKiBAcGFyYW0gbmFtZSB0aGUgbmFtZSBvZiB0aGUgdGV4dHVyZVxyXG4gICAgICogQHBhcmFtIGZvbnQgdGhlIGZvbnQgdG8gdXNlLCB1c2UgdGhlIFczQyBDU1Mgbm90YXRpb25cclxuICAgICAqIEBwYXJhbSB0ZXh0IHRoZSBjYXJhY3RlciBzZXQgdG8gdXNlIGluIHRoZSByZW5kZXJpbmcuXHJcbiAgICAgKiBAcGFyYW0gc2NlbmUgdGhlIHNjZW5lIHRoYXQgb3ducyB0aGUgdGV4dHVyZVxyXG4gICAgICovXHJcbiAgICBjb25zdHJ1Y3RvcihuYW1lOiBzdHJpbmcsIGZvbnQ6IHN0cmluZywgdGV4dDogc3RyaW5nLCBzY2VuZTogTnVsbGFibGU8U2NlbmU+ID0gbnVsbCkge1xyXG4gICAgICAgIHN1cGVyKHNjZW5lKTtcclxuXHJcbiAgICAgICAgc2NlbmUgPSB0aGlzLmdldFNjZW5lKCk7XHJcblxyXG4gICAgICAgIGlmICghc2NlbmUpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5uYW1lID0gbmFtZTtcclxuICAgICAgICB0aGlzLl90ZXh0ID09IHRleHQ7XHJcbiAgICAgICAgdGhpcy5fZm9udCA9PSBmb250O1xyXG5cclxuICAgICAgICB0aGlzLndyYXBVID0gVGV4dHVyZS5DTEFNUF9BRERSRVNTTU9ERTtcclxuICAgICAgICB0aGlzLndyYXBWID0gVGV4dHVyZS5DTEFNUF9BRERSRVNTTU9ERTtcclxuICAgICAgICAvL3RoaXMuYW5pc290cm9waWNGaWx0ZXJpbmdMZXZlbCA9IDE7XHJcblxyXG4gICAgICAgIC8vIEdldCB0aGUgZm9udCBzcGVjaWZpYyBpbmZvLlxyXG4gICAgICAgIGNvbnN0IG1heENoYXJIZWlnaHQgPSB0aGlzLl9nZXRGb250SGVpZ2h0KGZvbnQpO1xyXG4gICAgICAgIGNvbnN0IG1heENoYXJXaWR0aCA9IHRoaXMuX2dldEZvbnRXaWR0aChmb250KTtcclxuXHJcbiAgICAgICAgdGhpcy5fY2hhclNpemUgPSBNYXRoLm1heChtYXhDaGFySGVpZ2h0LmhlaWdodCwgbWF4Q2hhcldpZHRoKTtcclxuXHJcbiAgICAgICAgLy8gVGhpcyBpcyBhbiBhcHByb3hpbWF0ZSBzaXplLCBidXQgc2hvdWxkIGFsd2F5cyBiZSBhYmxlIHRvIGZpdCBhdCBsZWFzdCB0aGUgbWF4Q2hhckNvdW50LlxyXG4gICAgICAgIGNvbnN0IHRleHR1cmVXaWR0aCA9IE1hdGguY2VpbCh0aGlzLl9jaGFyU2l6ZSAqIHRleHQubGVuZ3RoKTtcclxuICAgICAgICBjb25zdCB0ZXh0dXJlSGVpZ2h0ID0gdGhpcy5fY2hhclNpemU7XHJcblxyXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgdGV4dHVyZSB0aGF0IHdpbGwgc3RvcmUgdGhlIGZvbnQgY2hhcmFjdGVycy5cclxuICAgICAgICB0aGlzLl90ZXh0dXJlID0gc2NlbmUuZ2V0RW5naW5lKCkuY3JlYXRlRHluYW1pY1RleHR1cmUodGV4dHVyZVdpZHRoLCB0ZXh0dXJlSGVpZ2h0LCBmYWxzZSwgVGV4dHVyZS5ORUFSRVNUX1NBTVBMSU5HTU9ERSk7XHJcbiAgICAgICAgLy9zY2VuZS5nZXRFbmdpbmUoKS5zZXRjbGFtcFxyXG4gICAgICAgIGNvbnN0IHRleHR1cmVTaXplID0gdGhpcy5nZXRTaXplKCk7XHJcblxyXG4gICAgICAgIC8vIENyZWF0ZSBhIGNhbnZhcyB3aXRoIHRoZSBmaW5hbCBzaXplOiB0aGUgb25lIG1hdGNoaW5nIHRoZSB0ZXh0dXJlLlxyXG4gICAgICAgIGNvbnN0IGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIik7XHJcbiAgICAgICAgY2FudmFzLndpZHRoID0gdGV4dHVyZVNpemUud2lkdGg7XHJcbiAgICAgICAgY2FudmFzLmhlaWdodCA9IHRleHR1cmVTaXplLmhlaWdodDtcclxuICAgICAgICBjb25zdCBjb250ZXh0ID0gPENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRD5jYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xyXG4gICAgICAgIGNvbnRleHQudGV4dEJhc2VsaW5lID0gXCJ0b3BcIjtcclxuICAgICAgICBjb250ZXh0LmZvbnQgPSBmb250O1xyXG4gICAgICAgIGNvbnRleHQuZmlsbFN0eWxlID0gXCJ3aGl0ZVwiO1xyXG4gICAgICAgIGNvbnRleHQuaW1hZ2VTbW9vdGhpbmdFbmFibGVkID0gZmFsc2U7XHJcblxyXG4gICAgICAgIC8vIFNldHMgdGhlIHRleHQgaW4gdGhlIHRleHR1cmUuXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0ZXh0Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGNvbnRleHQuZmlsbFRleHQodGV4dFtpXSwgaSAqIHRoaXMuX2NoYXJTaXplLCAtbWF4Q2hhckhlaWdodC5vZmZzZXQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gRmx1c2ggdGhlIHRleHQgaW4gdGhlIGR5bmFtaWMgdGV4dHVyZS5cclxuXHJcbiAgICAgICAgc2NlbmUuZ2V0RW5naW5lKCkudXBkYXRlRHluYW1pY1RleHR1cmUodGhpcy5fdGV4dHVyZSwgY2FudmFzLCBmYWxzZSwgdHJ1ZSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBHZXRzIHRoZSBtYXggY2hhciB3aWR0aCBvZiBhIGZvbnQuXHJcbiAgICAgKiBAcGFyYW0gZm9udCB0aGUgZm9udCB0byB1c2UsIHVzZSB0aGUgVzNDIENTUyBub3RhdGlvblxyXG4gICAgICogQHJldHVybnMgdGhlIG1heCBjaGFyIHdpZHRoXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgX2dldEZvbnRXaWR0aChmb250OiBzdHJpbmcpOiBudW1iZXIge1xyXG4gICAgICAgIGNvbnN0IGZvbnREcmF3ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKTtcclxuICAgICAgICBjb25zdCBjdHggPSA8Q2FudmFzUmVuZGVyaW5nQ29udGV4dDJEPmZvbnREcmF3LmdldENvbnRleHQoXCIyZFwiKTtcclxuICAgICAgICBjdHguZmlsbFN0eWxlID0gXCJ3aGl0ZVwiO1xyXG4gICAgICAgIGN0eC5mb250ID0gZm9udDtcclxuXHJcbiAgICAgICAgcmV0dXJuIGN0eC5tZWFzdXJlVGV4dChcIldcIikud2lkdGg7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gTW9yZSBpbmZvIGhlcmU6IGh0dHBzOi8vdmlkZWxhaXMuY29tLzIwMTQvMDMvMTYvdGhlLW1hbnktYW5kLXZhcmllZC1wcm9ibGVtcy13aXRoLW1lYXN1cmluZy1mb250LWhlaWdodC1mb3ItaHRtbDUtY2FudmFzL1xyXG4gICAgLyoqXHJcbiAgICAgKiBHZXRzIHRoZSBtYXggY2hhciBoZWlnaHQgb2YgYSBmb250LlxyXG4gICAgICogQHBhcmFtIGZvbnQgdGhlIGZvbnQgdG8gdXNlLCB1c2UgdGhlIFczQyBDU1Mgbm90YXRpb25cclxuICAgICAqIEByZXR1cm5zIHRoZSBtYXggY2hhciBoZWlnaHRcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBfZ2V0Rm9udEhlaWdodChmb250OiBzdHJpbmcpOiB7IGhlaWdodDogbnVtYmVyOyBvZmZzZXQ6IG51bWJlciB9IHtcclxuICAgICAgICBjb25zdCBmb250RHJhdyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIik7XHJcbiAgICAgICAgY29uc3QgY3R4ID0gPENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRD5mb250RHJhdy5nZXRDb250ZXh0KFwiMmRcIik7XHJcbiAgICAgICAgY3R4LmZpbGxSZWN0KDAsIDAsIGZvbnREcmF3LndpZHRoLCBmb250RHJhdy5oZWlnaHQpO1xyXG4gICAgICAgIGN0eC50ZXh0QmFzZWxpbmUgPSBcInRvcFwiO1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcIndoaXRlXCI7XHJcbiAgICAgICAgY3R4LmZvbnQgPSBmb250O1xyXG4gICAgICAgIGN0eC5maWxsVGV4dChcImpIfFwiLCAwLCAwKTtcclxuICAgICAgICBjb25zdCBwaXhlbHMgPSBjdHguZ2V0SW1hZ2VEYXRhKDAsIDAsIGZvbnREcmF3LndpZHRoLCBmb250RHJhdy5oZWlnaHQpLmRhdGE7XHJcbiAgICAgICAgbGV0IHN0YXJ0ID0gLTE7XHJcbiAgICAgICAgbGV0IGVuZCA9IC0xO1xyXG4gICAgICAgIGZvciAobGV0IHJvdyA9IDA7IHJvdyA8IGZvbnREcmF3LmhlaWdodDsgcm93KyspIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgY29sdW1uID0gMDsgY29sdW1uIDwgZm9udERyYXcud2lkdGg7IGNvbHVtbisrKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpbmRleCA9IChyb3cgKiBmb250RHJhdy53aWR0aCArIGNvbHVtbikgKiA0O1xyXG4gICAgICAgICAgICAgICAgaWYgKHBpeGVsc1tpbmRleF0gPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoY29sdW1uID09PSBmb250RHJhdy53aWR0aCAtIDEgJiYgc3RhcnQgIT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuZCA9IHJvdztcclxuICAgICAgICAgICAgICAgICAgICAgICAgcm93ID0gZm9udERyYXcuaGVpZ2h0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzdGFydCA9PT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSByb3c7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB7IGhlaWdodDogZW5kIC0gc3RhcnQgKyAxLCBvZmZzZXQ6IHN0YXJ0IC0gMSB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ2xvbmVzIHRoZSBjdXJyZW50IEFzY2lpQXJ0VGV4dHVyZS5cclxuICAgICAqIEByZXR1cm5zIHRoZSBjbG9uZSBvZiB0aGUgdGV4dHVyZS5cclxuICAgICAqL1xyXG4gICAgcHVibGljIGNsb25lKCk6IEFzY2lpQXJ0Rm9udFRleHR1cmUge1xyXG4gICAgICAgIHJldHVybiBuZXcgQXNjaWlBcnRGb250VGV4dHVyZSh0aGlzLm5hbWUsIHRoaXMuX2ZvbnQsIHRoaXMuX3RleHQsIHRoaXMuZ2V0U2NlbmUoKSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBQYXJzZXMgYSBqc29uIG9iamVjdCByZXByZXNlbnRpbmcgdGhlIHRleHR1cmUgYW5kIHJldHVybnMgYW4gaW5zdGFuY2Ugb2YgaXQuXHJcbiAgICAgKiBAcGFyYW0gc291cmNlIHRoZSBzb3VyY2UgSlNPTiByZXByZXNlbnRhdGlvblxyXG4gICAgICogQHBhcmFtIHNjZW5lIHRoZSBzY2VuZSB0byBjcmVhdGUgdGhlIHRleHR1cmUgZm9yXHJcbiAgICAgKiBAcmV0dXJucyB0aGUgcGFyc2VkIHRleHR1cmVcclxuICAgICAqL1xyXG4gICAgcHVibGljIHN0YXRpYyBQYXJzZShzb3VyY2U6IGFueSwgc2NlbmU6IFNjZW5lKTogQXNjaWlBcnRGb250VGV4dHVyZSB7XHJcbiAgICAgICAgY29uc3QgdGV4dHVyZSA9IFNlcmlhbGl6YXRpb25IZWxwZXIuUGFyc2UoKCkgPT4gbmV3IEFzY2lpQXJ0Rm9udFRleHR1cmUoc291cmNlLm5hbWUsIHNvdXJjZS5mb250LCBzb3VyY2UudGV4dCwgc2NlbmUpLCBzb3VyY2UsIHNjZW5lLCBudWxsKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRleHR1cmU7XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBPcHRpb24gYXZhaWxhYmxlIGluIHRoZSBBc2NpaSBBcnQgUG9zdCBQcm9jZXNzLlxyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBJQXNjaWlBcnRQb3N0UHJvY2Vzc09wdGlvbnMge1xyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgZm9udCB0byB1c2UgZm9sbG93aW5nIHRoZSB3M2MgZm9udCBkZWZpbml0aW9uLlxyXG4gICAgICovXHJcbiAgICBmb250Pzogc3RyaW5nO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogVGhlIGNoYXJhY3RlciBzZXQgdG8gdXNlIGluIHRoZSBwb3N0cHJvY2Vzcy5cclxuICAgICAqL1xyXG4gICAgY2hhcmFjdGVyU2V0Pzogc3RyaW5nO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogVGhpcyBkZWZpbmVzIHRoZSBhbW91bnQgeW91IHdhbnQgdG8gbWl4IHRoZSBcInRpbGVcIiBvciBjYXJhY3RlciBzcGFjZSBjb2xvcmVkIGluIHRoZSBhc2NpaSBhcnQuXHJcbiAgICAgKiBUaGlzIG51bWJlciBpcyBkZWZpbmVkIGJldHdlZW4gMCBhbmQgMTtcclxuICAgICAqL1xyXG4gICAgbWl4VG9UaWxlPzogbnVtYmVyO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogVGhpcyBkZWZpbmVzIHRoZSBhbW91bnQgeW91IHdhbnQgdG8gbWl4IHRoZSBub3JtYWwgcmVuZGVyaW5nIHBhc3MgaW4gdGhlIGFzY2lpIGFydC5cclxuICAgICAqIFRoaXMgbnVtYmVyIGlzIGRlZmluZWQgYmV0d2VlbiAwIGFuZCAxO1xyXG4gICAgICovXHJcbiAgICBtaXhUb05vcm1hbD86IG51bWJlcjtcclxufVxyXG5cclxuLyoqXHJcbiAqIEFzY2lpQXJ0UG9zdFByb2Nlc3MgaGVscHMgcmVuZGVyaW5nIGV2ZXJpdGhpbmcgaW4gQXNjaWkgQXJ0LlxyXG4gKlxyXG4gKiBTaW1tcGx5IGFkZCBpdCB0byB5b3VyIHNjZW5lIGFuZCBsZXQgdGhlIG5lcmQgdGhhdCBsaXZlcyBpbiB5b3UgaGF2ZSBmdW4uXHJcbiAqIEV4YW1wbGUgdXNhZ2U6IHZhciBwcCA9IG5ldyBBc2NpaUFydFBvc3RQcm9jZXNzKFwibXlBc2NpaVwiLCBcIjIwcHggTW9ub3NwYWNlXCIsIGNhbWVyYSk7XHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgQXNjaWlBcnRQb3N0UHJvY2VzcyBleHRlbmRzIFBvc3RQcm9jZXNzIHtcclxuICAgIC8qKlxyXG4gICAgICogVGhlIGZvbnQgdGV4dHVyZSB1c2VkIHRvIHJlbmRlciB0aGUgY2hhciBpbiB0aGUgcG9zdCBwcm9jZXNzLlxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIF9hc2NpaUFydEZvbnRUZXh0dXJlOiBBc2NpaUFydEZvbnRUZXh0dXJlO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogVGhpcyBkZWZpbmVzIHRoZSBhbW91bnQgeW91IHdhbnQgdG8gbWl4IHRoZSBcInRpbGVcIiBvciBjYXJhY3RlciBzcGFjZSBjb2xvcmVkIGluIHRoZSBhc2NpaSBhcnQuXHJcbiAgICAgKiBUaGlzIG51bWJlciBpcyBkZWZpbmVkIGJldHdlZW4gMCBhbmQgMTtcclxuICAgICAqL1xyXG4gICAgcHVibGljIG1peFRvVGlsZTogbnVtYmVyID0gMDtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoaXMgZGVmaW5lcyB0aGUgYW1vdW50IHlvdSB3YW50IHRvIG1peCB0aGUgbm9ybWFsIHJlbmRlcmluZyBwYXNzIGluIHRoZSBhc2NpaSBhcnQuXHJcbiAgICAgKiBUaGlzIG51bWJlciBpcyBkZWZpbmVkIGJldHdlZW4gMCBhbmQgMTtcclxuICAgICAqL1xyXG4gICAgcHVibGljIG1peFRvTm9ybWFsOiBudW1iZXIgPSAwO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogSW5zdGFudGlhdGVzIGEgbmV3IEFzY2lpIEFydCBQb3N0IFByb2Nlc3MuXHJcbiAgICAgKiBAcGFyYW0gbmFtZSB0aGUgbmFtZSB0byBnaXZlIHRvIHRoZSBwb3N0cHJvY2Vzc1xyXG4gICAgICogQGNhbWVyYSB0aGUgY2FtZXJhIHRvIGFwcGx5IHRoZSBwb3N0IHByb2Nlc3MgdG8uXHJcbiAgICAgKiBAcGFyYW0gY2FtZXJhXHJcbiAgICAgKiBAcGFyYW0gb3B0aW9ucyBjYW4gZWl0aGVyIGJlIHRoZSBmb250IG5hbWUgb3IgYW4gb3B0aW9uIG9iamVjdCBmb2xsb3dpbmcgdGhlIElBc2NpaUFydFBvc3RQcm9jZXNzT3B0aW9ucyBmb3JtYXRcclxuICAgICAqL1xyXG4gICAgY29uc3RydWN0b3IobmFtZTogc3RyaW5nLCBjYW1lcmE6IE51bGxhYmxlPENhbWVyYT4sIG9wdGlvbnM/OiBzdHJpbmcgfCBJQXNjaWlBcnRQb3N0UHJvY2Vzc09wdGlvbnMpIHtcclxuICAgICAgICBzdXBlcihuYW1lLCBcImFzY2lpYXJ0XCIsIFtcImFzY2lpQXJ0Rm9udEluZm9zXCIsIFwiYXNjaWlBcnRPcHRpb25zXCJdLCBbXCJhc2NpaUFydEZvbnRcIl0sIDEsIGNhbWVyYSwgVGV4dHVyZS5UUklMSU5FQVJfU0FNUExJTkdNT0RFLCB1bmRlZmluZWQsIHRydWUpO1xyXG5cclxuICAgICAgICAvLyBEZWZhdWx0IHZhbHVlcy5cclxuICAgICAgICBsZXQgZm9udCA9IFwiNDBweCBNb25vc3BhY2VcIjtcclxuICAgICAgICBsZXQgY2hhcmFjdGVyU2V0ID0gXCIgYC0uJ186LFxcXCI9Xjs8KyEqPy9jTFxcXFx6cnM3VGl2SnRDezNGKUlsKHhaZlk1UzJlYWpvMTRbbnV5RV1QNlY5a1hwS3dHaHFBVWJPZDgjSFJEQjAkbWdNVyZRJU5AXCI7XHJcblxyXG4gICAgICAgIC8vIFVzZSBvcHRpb25zLlxyXG4gICAgICAgIGlmIChvcHRpb25zKSB7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gXCJzdHJpbmdcIikge1xyXG4gICAgICAgICAgICAgICAgZm9udCA9IDxzdHJpbmc+b3B0aW9ucztcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGZvbnQgPSAoPElBc2NpaUFydFBvc3RQcm9jZXNzT3B0aW9ucz5vcHRpb25zKS5mb250IHx8IGZvbnQ7XHJcbiAgICAgICAgICAgICAgICBjaGFyYWN0ZXJTZXQgPSAoPElBc2NpaUFydFBvc3RQcm9jZXNzT3B0aW9ucz5vcHRpb25zKS5jaGFyYWN0ZXJTZXQgfHwgY2hhcmFjdGVyU2V0O1xyXG4gICAgICAgICAgICAgICAgdGhpcy5taXhUb1RpbGUgPSAoPElBc2NpaUFydFBvc3RQcm9jZXNzT3B0aW9ucz5vcHRpb25zKS5taXhUb1RpbGUgfHwgdGhpcy5taXhUb1RpbGU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1peFRvTm9ybWFsID0gKDxJQXNjaWlBcnRQb3N0UHJvY2Vzc09wdGlvbnM+b3B0aW9ucykubWl4VG9Ob3JtYWwgfHwgdGhpcy5taXhUb05vcm1hbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3Qgc2NlbmUgPSBjYW1lcmE/LmdldFNjZW5lKCkgfHwgdGhpcy5fc2NlbmU7XHJcbiAgICAgICAgdGhpcy5fYXNjaWlBcnRGb250VGV4dHVyZSA9IG5ldyBBc2NpaUFydEZvbnRUZXh0dXJlKG5hbWUsIGZvbnQsIGNoYXJhY3RlclNldCwgc2NlbmUpO1xyXG4gICAgICAgIGNvbnN0IHRleHR1cmVTaXplID0gdGhpcy5fYXNjaWlBcnRGb250VGV4dHVyZS5nZXRTaXplKCk7XHJcblxyXG4gICAgICAgIHRoaXMub25BcHBseSA9IChlZmZlY3Q6IEVmZmVjdCkgPT4ge1xyXG4gICAgICAgICAgICBlZmZlY3Quc2V0VGV4dHVyZShcImFzY2lpQXJ0Rm9udFwiLCB0aGlzLl9hc2NpaUFydEZvbnRUZXh0dXJlKTtcclxuXHJcbiAgICAgICAgICAgIGVmZmVjdC5zZXRGbG9hdDQoXCJhc2NpaUFydEZvbnRJbmZvc1wiLCB0aGlzLl9hc2NpaUFydEZvbnRUZXh0dXJlLmNoYXJTaXplLCBjaGFyYWN0ZXJTZXQubGVuZ3RoLCB0ZXh0dXJlU2l6ZS53aWR0aCwgdGV4dHVyZVNpemUuaGVpZ2h0KTtcclxuXHJcbiAgICAgICAgICAgIGVmZmVjdC5zZXRGbG9hdDQoXCJhc2NpaUFydE9wdGlvbnNcIiwgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQsIHRoaXMubWl4VG9Ob3JtYWwsIHRoaXMubWl4VG9UaWxlKTtcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG59XHJcbiIsIi8vIERvIG5vdCBlZGl0LlxuaW1wb3J0IHsgU2hhZGVyU3RvcmUgfSBmcm9tIFwiY29yZS9FbmdpbmVzL3NoYWRlclN0b3JlXCI7XG5cbmNvbnN0IG5hbWUgPSBcImFzY2lpYXJ0UGl4ZWxTaGFkZXJcIjtcbmNvbnN0IHNoYWRlciA9IGB2YXJ5aW5nIHZlYzIgdlVWO3VuaWZvcm0gc2FtcGxlcjJEIHRleHR1cmVTYW1wbGVyO3VuaWZvcm0gc2FtcGxlcjJEIGFzY2lpQXJ0Rm9udDt1bmlmb3JtIHZlYzQgYXNjaWlBcnRGb250SW5mb3M7dW5pZm9ybSB2ZWM0IGFzY2lpQXJ0T3B0aW9ucztmbG9hdCBnZXRMdW1pbmFuY2UodmVjMyBjb2xvcilcbntyZXR1cm4gY2xhbXAoZG90KGNvbG9yLHZlYzMoMC4yMTI2LDAuNzE1MiwwLjA3MjIpKSwwLiwxLik7fVxuI2RlZmluZSBDVVNUT01fRlJBR01FTlRfREVGSU5JVElPTlNcbnZvaWQgbWFpbih2b2lkKSBcbntmbG9hdCBjYXJhY3RlclNpemU9YXNjaWlBcnRGb250SW5mb3MueDtmbG9hdCBudW1DaGFyPWFzY2lpQXJ0Rm9udEluZm9zLnktMS4wO2Zsb2F0IGZvbnR4PWFzY2lpQXJ0Rm9udEluZm9zLno7ZmxvYXQgZm9udHk9YXNjaWlBcnRGb250SW5mb3MudztmbG9hdCBzY3JlZW54PWFzY2lpQXJ0T3B0aW9ucy54O2Zsb2F0IHNjcmVlbnk9YXNjaWlBcnRPcHRpb25zLnk7ZmxvYXQgdGlsZVg9ZmxvYXQoZmxvb3IoKGdsX0ZyYWdDb29yZC54KS9jYXJhY3RlclNpemUpKSpjYXJhY3RlclNpemUvc2NyZWVueDtmbG9hdCB0aWxlWT1mbG9hdChmbG9vcigoZ2xfRnJhZ0Nvb3JkLnkpL2NhcmFjdGVyU2l6ZSkpKmNhcmFjdGVyU2l6ZS9zY3JlZW55O3ZlYzIgdGlsZVVWPXZlYzIodGlsZVgsdGlsZVkpO3ZlYzQgdGlsZUNvbG9yPXRleHR1cmUyRCh0ZXh0dXJlU2FtcGxlcix0aWxlVVYpO3ZlYzQgYmFzZUNvbG9yPXRleHR1cmUyRCh0ZXh0dXJlU2FtcGxlcix2VVYpO2Zsb2F0IHRpbGVMdW1pbmFuY2U9Z2V0THVtaW5hbmNlKHRpbGVDb2xvci5yZ2IpO2Zsb2F0IG9mZnNldHg9KGZsb2F0KGZsb29yKHRpbGVMdW1pbmFuY2UqbnVtQ2hhcikpKSpjYXJhY3RlclNpemUvZm9udHg7ZmxvYXQgb2Zmc2V0eT0wLjA7ZmxvYXQgeD1mbG9hdChtb2QoZ2xfRnJhZ0Nvb3JkLngsY2FyYWN0ZXJTaXplKSkvZm9udHg7ZmxvYXQgeT1mbG9hdChtb2QoZ2xfRnJhZ0Nvb3JkLnksY2FyYWN0ZXJTaXplKSkvZm9udHk7dmVjNCBmaW5hbENvbG9yPSB0ZXh0dXJlMkQoYXNjaWlBcnRGb250LHZlYzIob2Zmc2V0eCt4LG9mZnNldHkrKGNhcmFjdGVyU2l6ZS9mb250eS15KSkpO2ZpbmFsQ29sb3IucmdiKj10aWxlQ29sb3IucmdiO2ZpbmFsQ29sb3IuYT0xLjA7ZmluYWxDb2xvcj0gbWl4KGZpbmFsQ29sb3IsdGlsZUNvbG9yLGFzY2lpQXJ0T3B0aW9ucy53KTtmaW5hbENvbG9yPSBtaXgoZmluYWxDb2xvcixiYXNlQ29sb3IsYXNjaWlBcnRPcHRpb25zLnopO2dsX0ZyYWdDb2xvcj1maW5hbENvbG9yO31gO1xuLy8gU2lkZWVmZmVjdFxuU2hhZGVyU3RvcmUuU2hhZGVyc1N0b3JlW25hbWVdID0gc2hhZGVyO1xuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGFzY2lpYXJ0UGl4ZWxTaGFkZXIgPSB7IG5hbWUsIHNoYWRlciB9O1xuIiwiZXhwb3J0ICogZnJvbSBcIi4vYXNjaWlBcnRQb3N0UHJvY2Vzc1wiO1xyXG4iLCJpbXBvcnQgdHlwZSB7IE51bGxhYmxlIH0gZnJvbSBcImNvcmUvdHlwZXNcIjtcclxuaW1wb3J0IHsgc2VyaWFsaXplLCBTZXJpYWxpemF0aW9uSGVscGVyIH0gZnJvbSBcImNvcmUvTWlzYy9kZWNvcmF0b3JzXCI7XHJcbmltcG9ydCB7IE1hdHJpeCB9IGZyb20gXCJjb3JlL01hdGhzL21hdGgudmVjdG9yXCI7XHJcbmltcG9ydCB0eXBlIHsgQ2FtZXJhIH0gZnJvbSBcImNvcmUvQ2FtZXJhcy9jYW1lcmFcIjtcclxuaW1wb3J0IHsgQmFzZVRleHR1cmUgfSBmcm9tIFwiY29yZS9NYXRlcmlhbHMvVGV4dHVyZXMvYmFzZVRleHR1cmVcIjtcclxuaW1wb3J0IHsgVGV4dHVyZSB9IGZyb20gXCJjb3JlL01hdGVyaWFscy9UZXh0dXJlcy90ZXh0dXJlXCI7XHJcbmltcG9ydCB0eXBlIHsgRWZmZWN0IH0gZnJvbSBcImNvcmUvTWF0ZXJpYWxzL2VmZmVjdFwiO1xyXG5pbXBvcnQgeyBQb3N0UHJvY2VzcyB9IGZyb20gXCJjb3JlL1Bvc3RQcm9jZXNzZXMvcG9zdFByb2Nlc3NcIjtcclxuaW1wb3J0IHR5cGUgeyBTY2VuZSB9IGZyb20gXCJjb3JlL3NjZW5lXCI7XHJcbmltcG9ydCBcImNvcmUvRW5naW5lcy9FeHRlbnNpb25zL2VuZ2luZS5keW5hbWljVGV4dHVyZVwiO1xyXG5pbXBvcnQgXCIuL2RpZ2l0YWxyYWluLmZyYWdtZW50XCI7XHJcblxyXG4vKipcclxuICogRGlnaXRhbFJhaW5Gb250VGV4dHVyZSBpcyB0aGUgaGVscGVyIGNsYXNzIHVzZWQgdG8gZWFzaWx5IGNyZWF0ZSB5b3VyIGRpZ2l0YWwgcmFpbiBmb250IHRleHR1cmUuXHJcbiAqXHJcbiAqIEl0IGJhc2ljYWxseSB0YWtlcyBjYXJlIHJlbmRlcmluZyB0aGUgZm9udCBmcm9udCB0aGUgZ2l2ZW4gZm9udCBzaXplIHRvIGEgdGV4dHVyZS5cclxuICogVGhpcyBpcyB1c2VkIGxhdGVyIG9uIGluIHRoZSBwb3N0cHJvY2Vzcy5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBEaWdpdGFsUmFpbkZvbnRUZXh0dXJlIGV4dGVuZHMgQmFzZVRleHR1cmUge1xyXG4gICAgQHNlcmlhbGl6ZShcImZvbnRcIilcclxuICAgIHByaXZhdGUgX2ZvbnQ6IHN0cmluZztcclxuXHJcbiAgICBAc2VyaWFsaXplKFwidGV4dFwiKVxyXG4gICAgcHJpdmF0ZSBfdGV4dDogc3RyaW5nO1xyXG5cclxuICAgIHByaXZhdGUgX2NoYXJTaXplOiBudW1iZXI7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBHZXRzIHRoZSBzaXplIG9mIG9uZSBjaGFyIGluIHRoZSB0ZXh0dXJlIChlYWNoIGNoYXIgZml0cyBpbiBzaXplICogc2l6ZSBzcGFjZSBpbiB0aGUgdGV4dHVyZSkuXHJcbiAgICAgKi9cclxuICAgIHB1YmxpYyBnZXQgY2hhclNpemUoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fY2hhclNpemU7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDcmVhdGUgYSBuZXcgaW5zdGFuY2Ugb2YgdGhlIERpZ2l0YWwgUmFpbiBGb250VGV4dHVyZSBjbGFzc1xyXG4gICAgICogQHBhcmFtIG5hbWUgdGhlIG5hbWUgb2YgdGhlIHRleHR1cmVcclxuICAgICAqIEBwYXJhbSBmb250IHRoZSBmb250IHRvIHVzZSwgdXNlIHRoZSBXM0MgQ1NTIG5vdGF0aW9uXHJcbiAgICAgKiBAcGFyYW0gdGV4dCB0aGUgY2FyYWN0ZXIgc2V0IHRvIHVzZSBpbiB0aGUgcmVuZGVyaW5nLlxyXG4gICAgICogQHBhcmFtIHNjZW5lIHRoZSBzY2VuZSB0aGF0IG93bnMgdGhlIHRleHR1cmVcclxuICAgICAqL1xyXG4gICAgY29uc3RydWN0b3IobmFtZTogc3RyaW5nLCBmb250OiBzdHJpbmcsIHRleHQ6IHN0cmluZywgc2NlbmU6IE51bGxhYmxlPFNjZW5lPiA9IG51bGwpIHtcclxuICAgICAgICBzdXBlcihzY2VuZSk7XHJcblxyXG4gICAgICAgIHNjZW5lID0gdGhpcy5nZXRTY2VuZSgpO1xyXG5cclxuICAgICAgICBpZiAoIXNjZW5lKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMubmFtZSA9IG5hbWU7XHJcbiAgICAgICAgdGhpcy5fdGV4dCA9PSB0ZXh0O1xyXG4gICAgICAgIHRoaXMuX2ZvbnQgPT0gZm9udDtcclxuXHJcbiAgICAgICAgdGhpcy53cmFwVSA9IFRleHR1cmUuQ0xBTVBfQUREUkVTU01PREU7XHJcbiAgICAgICAgdGhpcy53cmFwViA9IFRleHR1cmUuQ0xBTVBfQUREUkVTU01PREU7XHJcblxyXG4gICAgICAgIC8vIEdldCB0aGUgZm9udCBzcGVjaWZpYyBpbmZvLlxyXG4gICAgICAgIGNvbnN0IG1heENoYXJIZWlnaHQgPSB0aGlzLl9nZXRGb250SGVpZ2h0KGZvbnQpO1xyXG4gICAgICAgIGNvbnN0IG1heENoYXJXaWR0aCA9IHRoaXMuX2dldEZvbnRXaWR0aChmb250KTtcclxuXHJcbiAgICAgICAgdGhpcy5fY2hhclNpemUgPSBNYXRoLm1heChtYXhDaGFySGVpZ2h0LmhlaWdodCwgbWF4Q2hhcldpZHRoKTtcclxuXHJcbiAgICAgICAgLy8gVGhpcyBpcyBhbiBhcHByb3hpbWF0ZSBzaXplLCBidXQgc2hvdWxkIGFsd2F5cyBiZSBhYmxlIHRvIGZpdCBhdCBsZWFzdCB0aGUgbWF4Q2hhckNvdW50LlxyXG4gICAgICAgIGNvbnN0IHRleHR1cmVXaWR0aCA9IHRoaXMuX2NoYXJTaXplO1xyXG4gICAgICAgIGNvbnN0IHRleHR1cmVIZWlnaHQgPSBNYXRoLmNlaWwodGhpcy5fY2hhclNpemUgKiB0ZXh0Lmxlbmd0aCk7XHJcblxyXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgdGV4dHVyZSB0aGF0IHdpbGwgc3RvcmUgdGhlIGZvbnQgY2hhcmFjdGVycy5cclxuICAgICAgICB0aGlzLl90ZXh0dXJlID0gc2NlbmUuZ2V0RW5naW5lKCkuY3JlYXRlRHluYW1pY1RleHR1cmUodGV4dHVyZVdpZHRoLCB0ZXh0dXJlSGVpZ2h0LCBmYWxzZSwgVGV4dHVyZS5ORUFSRVNUX1NBTVBMSU5HTU9ERSk7XHJcbiAgICAgICAgLy9zY2VuZS5nZXRFbmdpbmUoKS5zZXRjbGFtcFxyXG4gICAgICAgIGNvbnN0IHRleHR1cmVTaXplID0gdGhpcy5nZXRTaXplKCk7XHJcblxyXG4gICAgICAgIC8vIENyZWF0ZSBhIGNhbnZhcyB3aXRoIHRoZSBmaW5hbCBzaXplOiB0aGUgb25lIG1hdGNoaW5nIHRoZSB0ZXh0dXJlLlxyXG4gICAgICAgIGNvbnN0IGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIik7XHJcbiAgICAgICAgY2FudmFzLndpZHRoID0gdGV4dHVyZVNpemUud2lkdGg7XHJcbiAgICAgICAgY2FudmFzLmhlaWdodCA9IHRleHR1cmVTaXplLmhlaWdodDtcclxuICAgICAgICBjb25zdCBjb250ZXh0ID0gPENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRD5jYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xyXG4gICAgICAgIGNvbnRleHQudGV4dEJhc2VsaW5lID0gXCJ0b3BcIjtcclxuICAgICAgICBjb250ZXh0LmZvbnQgPSBmb250O1xyXG4gICAgICAgIGNvbnRleHQuZmlsbFN0eWxlID0gXCJ3aGl0ZVwiO1xyXG4gICAgICAgIGNvbnRleHQuaW1hZ2VTbW9vdGhpbmdFbmFibGVkID0gZmFsc2U7XHJcblxyXG4gICAgICAgIC8vIFNldHMgdGhlIHRleHQgaW4gdGhlIHRleHR1cmUuXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0ZXh0Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGNvbnRleHQuZmlsbFRleHQodGV4dFtpXSwgMCwgaSAqIHRoaXMuX2NoYXJTaXplIC0gbWF4Q2hhckhlaWdodC5vZmZzZXQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gRmx1c2ggdGhlIHRleHQgaW4gdGhlIGR5bmFtaWMgdGV4dHVyZS5cclxuICAgICAgICBzY2VuZS5nZXRFbmdpbmUoKS51cGRhdGVEeW5hbWljVGV4dHVyZSh0aGlzLl90ZXh0dXJlLCBjYW52YXMsIGZhbHNlLCB0cnVlKTtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEdldHMgdGhlIG1heCBjaGFyIHdpZHRoIG9mIGEgZm9udC5cclxuICAgICAqIEBwYXJhbSBmb250IHRoZSBmb250IHRvIHVzZSwgdXNlIHRoZSBXM0MgQ1NTIG5vdGF0aW9uXHJcbiAgICAgKiBAcmV0dXJucyB0aGUgbWF4IGNoYXIgd2lkdGhcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBfZ2V0Rm9udFdpZHRoKGZvbnQ6IHN0cmluZyk6IG51bWJlciB7XHJcbiAgICAgICAgY29uc3QgZm9udERyYXcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpO1xyXG4gICAgICAgIGNvbnN0IGN0eCA9IDxDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQ+Zm9udERyYXcuZ2V0Q29udGV4dChcIjJkXCIpO1xyXG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBcIndoaXRlXCI7XHJcbiAgICAgICAgY3R4LmZvbnQgPSBmb250O1xyXG5cclxuICAgICAgICByZXR1cm4gY3R4Lm1lYXN1cmVUZXh0KFwiV1wiKS53aWR0aDtcclxuICAgIH1cclxuXHJcbiAgICAvLyBNb3JlIGluZm8gaGVyZTogaHR0cHM6Ly92aWRlbGFpcy5jb20vMjAxNC8wMy8xNi90aGUtbWFueS1hbmQtdmFyaWVkLXByb2JsZW1zLXdpdGgtbWVhc3VyaW5nLWZvbnQtaGVpZ2h0LWZvci1odG1sNS1jYW52YXMvXHJcbiAgICAvKipcclxuICAgICAqIEdldHMgdGhlIG1heCBjaGFyIGhlaWdodCBvZiBhIGZvbnQuXHJcbiAgICAgKiBAcGFyYW0gZm9udCB0aGUgZm9udCB0byB1c2UsIHVzZSB0aGUgVzNDIENTUyBub3RhdGlvblxyXG4gICAgICogQHJldHVybnMgdGhlIG1heCBjaGFyIGhlaWdodFxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIF9nZXRGb250SGVpZ2h0KGZvbnQ6IHN0cmluZyk6IHsgaGVpZ2h0OiBudW1iZXI7IG9mZnNldDogbnVtYmVyIH0ge1xyXG4gICAgICAgIGNvbnN0IGZvbnREcmF3ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKTtcclxuICAgICAgICBjb25zdCBjdHggPSA8Q2FudmFzUmVuZGVyaW5nQ29udGV4dDJEPmZvbnREcmF3LmdldENvbnRleHQoXCIyZFwiKTtcclxuICAgICAgICBjdHguZmlsbFJlY3QoMCwgMCwgZm9udERyYXcud2lkdGgsIGZvbnREcmF3LmhlaWdodCk7XHJcbiAgICAgICAgY3R4LnRleHRCYXNlbGluZSA9IFwidG9wXCI7XHJcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwid2hpdGVcIjtcclxuICAgICAgICBjdHguZm9udCA9IGZvbnQ7XHJcbiAgICAgICAgY3R4LmZpbGxUZXh0KFwiakh8XCIsIDAsIDApO1xyXG4gICAgICAgIGNvbnN0IHBpeGVscyA9IGN0eC5nZXRJbWFnZURhdGEoMCwgMCwgZm9udERyYXcud2lkdGgsIGZvbnREcmF3LmhlaWdodCkuZGF0YTtcclxuICAgICAgICBsZXQgc3RhcnQgPSAtMTtcclxuICAgICAgICBsZXQgZW5kID0gLTE7XHJcbiAgICAgICAgZm9yIChsZXQgcm93ID0gMDsgcm93IDwgZm9udERyYXcuaGVpZ2h0OyByb3crKykge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBjb2x1bW4gPSAwOyBjb2x1bW4gPCBmb250RHJhdy53aWR0aDsgY29sdW1uKyspIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gKHJvdyAqIGZvbnREcmF3LndpZHRoICsgY29sdW1uKSAqIDQ7XHJcbiAgICAgICAgICAgICAgICBpZiAocGl4ZWxzW2luZGV4XSA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjb2x1bW4gPT09IGZvbnREcmF3LndpZHRoIC0gMSAmJiBzdGFydCAhPT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW5kID0gcm93O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByb3cgPSBmb250RHJhdy5oZWlnaHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXJ0ID09PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydCA9IHJvdztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHsgaGVpZ2h0OiBlbmQgLSBzdGFydCArIDEsIG9mZnNldDogc3RhcnQgLSAxIH07XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDbG9uZXMgdGhlIGN1cnJlbnQgRGlnaXRhbFJhaW5Gb250VGV4dHVyZS5cclxuICAgICAqIEByZXR1cm5zIHRoZSBjbG9uZSBvZiB0aGUgdGV4dHVyZS5cclxuICAgICAqL1xyXG4gICAgcHVibGljIGNsb25lKCk6IERpZ2l0YWxSYWluRm9udFRleHR1cmUge1xyXG4gICAgICAgIHJldHVybiBuZXcgRGlnaXRhbFJhaW5Gb250VGV4dHVyZSh0aGlzLm5hbWUsIHRoaXMuX2ZvbnQsIHRoaXMuX3RleHQsIHRoaXMuZ2V0U2NlbmUoKSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBQYXJzZXMgYSBqc29uIG9iamVjdCByZXByZXNlbnRpbmcgdGhlIHRleHR1cmUgYW5kIHJldHVybnMgYW4gaW5zdGFuY2Ugb2YgaXQuXHJcbiAgICAgKiBAcGFyYW0gc291cmNlIHRoZSBzb3VyY2UgSlNPTiByZXByZXNlbnRhdGlvblxyXG4gICAgICogQHBhcmFtIHNjZW5lIHRoZSBzY2VuZSB0byBjcmVhdGUgdGhlIHRleHR1cmUgZm9yXHJcbiAgICAgKiBAcmV0dXJucyB0aGUgcGFyc2VkIHRleHR1cmVcclxuICAgICAqL1xyXG4gICAgcHVibGljIHN0YXRpYyBQYXJzZShzb3VyY2U6IGFueSwgc2NlbmU6IFNjZW5lKTogRGlnaXRhbFJhaW5Gb250VGV4dHVyZSB7XHJcbiAgICAgICAgY29uc3QgdGV4dHVyZSA9IFNlcmlhbGl6YXRpb25IZWxwZXIuUGFyc2UoKCkgPT4gbmV3IERpZ2l0YWxSYWluRm9udFRleHR1cmUoc291cmNlLm5hbWUsIHNvdXJjZS5mb250LCBzb3VyY2UudGV4dCwgc2NlbmUpLCBzb3VyY2UsIHNjZW5lLCBudWxsKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRleHR1cmU7XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBPcHRpb24gYXZhaWxhYmxlIGluIHRoZSBEaWdpdGFsIFJhaW4gUG9zdCBQcm9jZXNzLlxyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBJRGlnaXRhbFJhaW5Qb3N0UHJvY2Vzc09wdGlvbnMge1xyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgZm9udCB0byB1c2UgZm9sbG93aW5nIHRoZSB3M2MgZm9udCBkZWZpbml0aW9uLlxyXG4gICAgICovXHJcbiAgICBmb250Pzogc3RyaW5nO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogVGhpcyBkZWZpbmVzIHRoZSBhbW91bnQgeW91IHdhbnQgdG8gbWl4IHRoZSBcInRpbGVcIiBvciBjYXJhY3RlciBzcGFjZSBjb2xvcmVkIGluIHRoZSBkaWdpdGFsIHJhaW4uXHJcbiAgICAgKiBUaGlzIG51bWJlciBpcyBkZWZpbmVkIGJldHdlZW4gMCBhbmQgMTtcclxuICAgICAqL1xyXG4gICAgbWl4VG9UaWxlPzogbnVtYmVyO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogVGhpcyBkZWZpbmVzIHRoZSBhbW91bnQgeW91IHdhbnQgdG8gbWl4IHRoZSBub3JtYWwgcmVuZGVyaW5nIHBhc3MgaW4gdGhlIGRpZ2l0YWwgcmFpbi5cclxuICAgICAqIFRoaXMgbnVtYmVyIGlzIGRlZmluZWQgYmV0d2VlbiAwIGFuZCAxO1xyXG4gICAgICovXHJcbiAgICBtaXhUb05vcm1hbD86IG51bWJlcjtcclxufVxyXG5cclxuLyoqXHJcbiAqIERpZ2l0YWxSYWluUG9zdFByb2Nlc3MgaGVscHMgcmVuZGVyaW5nIGV2ZXJpdGhpbmcgaW4gZGlnaXRhbCByYWluLlxyXG4gKlxyXG4gKiBTaW1tcGx5IGFkZCBpdCB0byB5b3VyIHNjZW5lIGFuZCBsZXQgdGhlIG5lcmQgdGhhdCBsaXZlcyBpbiB5b3UgaGF2ZSBmdW4uXHJcbiAqIEV4YW1wbGUgdXNhZ2U6IHZhciBwcCA9IG5ldyBEaWdpdGFsUmFpblBvc3RQcm9jZXNzKFwiZGlnaXRhbFJhaW5cIiwgXCIyMHB4IE1vbm9zcGFjZVwiLCBjYW1lcmEpO1xyXG4gKi9cclxuZXhwb3J0IGNsYXNzIERpZ2l0YWxSYWluUG9zdFByb2Nlc3MgZXh0ZW5kcyBQb3N0UHJvY2VzcyB7XHJcbiAgICAvKipcclxuICAgICAqIFRoZSBmb250IHRleHR1cmUgdXNlZCB0byByZW5kZXIgdGhlIGNoYXIgaW4gdGhlIHBvc3QgcHJvY2Vzcy5cclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBfZGlnaXRhbFJhaW5Gb250VGV4dHVyZTogRGlnaXRhbFJhaW5Gb250VGV4dHVyZTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFRoaXMgZGVmaW5lcyB0aGUgYW1vdW50IHlvdSB3YW50IHRvIG1peCB0aGUgXCJ0aWxlXCIgb3IgY2FyYWN0ZXIgc3BhY2UgY29sb3JlZCBpbiB0aGUgZGlnaXRhbCByYWluLlxyXG4gICAgICogVGhpcyBudW1iZXIgaXMgZGVmaW5lZCBiZXR3ZWVuIDAgYW5kIDE7XHJcbiAgICAgKi9cclxuICAgIHB1YmxpYyBtaXhUb1RpbGU6IG51bWJlciA9IDA7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBUaGlzIGRlZmluZXMgdGhlIGFtb3VudCB5b3Ugd2FudCB0byBtaXggdGhlIG5vcm1hbCByZW5kZXJpbmcgcGFzcyBpbiB0aGUgZGlnaXRhbCByYWluLlxyXG4gICAgICogVGhpcyBudW1iZXIgaXMgZGVmaW5lZCBiZXR3ZWVuIDAgYW5kIDE7XHJcbiAgICAgKi9cclxuICAgIHB1YmxpYyBtaXhUb05vcm1hbDogbnVtYmVyID0gMDtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFNwZWVkIG9mIHRoZSBlZmZlY3RcclxuICAgICAqL1xyXG4gICAgcHVibGljIHNwZWVkOiBudW1iZXIgPSAwLjAwMztcclxuXHJcbiAgICAvKipcclxuICAgICAqIEluc3RhbnRpYXRlcyBhIG5ldyBEaWdpdGFsIFJhaW4gUG9zdCBQcm9jZXNzLlxyXG4gICAgICogQHBhcmFtIG5hbWUgdGhlIG5hbWUgdG8gZ2l2ZSB0byB0aGUgcG9zdHByb2Nlc3NcclxuICAgICAqIEBjYW1lcmEgdGhlIGNhbWVyYSB0byBhcHBseSB0aGUgcG9zdCBwcm9jZXNzIHRvLlxyXG4gICAgICogQHBhcmFtIGNhbWVyYVxyXG4gICAgICogQHBhcmFtIG9wdGlvbnMgY2FuIGVpdGhlciBiZSB0aGUgZm9udCBuYW1lIG9yIGFuIG9wdGlvbiBvYmplY3QgZm9sbG93aW5nIHRoZSBJRGlnaXRhbFJhaW5Qb3N0UHJvY2Vzc09wdGlvbnMgZm9ybWF0XHJcbiAgICAgKi9cclxuICAgIGNvbnN0cnVjdG9yKG5hbWU6IHN0cmluZywgY2FtZXJhOiBOdWxsYWJsZTxDYW1lcmE+LCBvcHRpb25zPzogc3RyaW5nIHwgSURpZ2l0YWxSYWluUG9zdFByb2Nlc3NPcHRpb25zKSB7XHJcbiAgICAgICAgc3VwZXIoXHJcbiAgICAgICAgICAgIG5hbWUsXHJcbiAgICAgICAgICAgIFwiZGlnaXRhbHJhaW5cIixcclxuICAgICAgICAgICAgW1wiZGlnaXRhbFJhaW5Gb250SW5mb3NcIiwgXCJkaWdpdGFsUmFpbk9wdGlvbnNcIiwgXCJjb3NUaW1lWmVyb09uZVwiLCBcIm1hdHJpeFNwZWVkXCJdLFxyXG4gICAgICAgICAgICBbXCJkaWdpdGFsUmFpbkZvbnRcIl0sXHJcbiAgICAgICAgICAgIDEuMCxcclxuICAgICAgICAgICAgY2FtZXJhLFxyXG4gICAgICAgICAgICBUZXh0dXJlLlRSSUxJTkVBUl9TQU1QTElOR01PREUsXHJcbiAgICAgICAgICAgIHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgdHJ1ZVxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIC8vIERlZmF1bHQgdmFsdWVzLlxyXG4gICAgICAgIGxldCBmb250ID0gXCIxNXB4IE1vbm9zcGFjZVwiO1xyXG4gICAgICAgIGNvbnN0IGNoYXJhY3RlclNldCA9XHJcbiAgICAgICAgICAgIFwi5Y+k5rGg44KE6JuZ6aOb44Gz6L6844KA5rC044Gu6Z+z44G144KL44GE44GR44KE44GL44KP44Ga44Go44Gz44GT44KA44G/44Ga44Gu44GK44Go5Yid44GX44GQ44KM54y/44KC5bCP6JOR44KS44G744GX44GS5Lmf44Gv44Gk44GX44GQ44KM44GV44KL44KC44GT44G/44Gu44KS44G744GX44GS44Gq44KK5rGf5oi444Gu6Zuo5L2V55+z5ZGR44KT44Gg5pmC6bOl44GI44Gp44Gu44GC44KB44Gq44KT44GU44GP44Gu44KT44Gg44G744Go44Go44GO44GZXCI7XHJcblxyXG4gICAgICAgIC8vIFVzZSBvcHRpb25zLlxyXG4gICAgICAgIGlmIChvcHRpb25zKSB7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gXCJzdHJpbmdcIikge1xyXG4gICAgICAgICAgICAgICAgZm9udCA9IDxzdHJpbmc+b3B0aW9ucztcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGZvbnQgPSAoPElEaWdpdGFsUmFpblBvc3RQcm9jZXNzT3B0aW9ucz5vcHRpb25zKS5mb250IHx8IGZvbnQ7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1peFRvVGlsZSA9ICg8SURpZ2l0YWxSYWluUG9zdFByb2Nlc3NPcHRpb25zPm9wdGlvbnMpLm1peFRvVGlsZSB8fCB0aGlzLm1peFRvVGlsZTtcclxuICAgICAgICAgICAgICAgIHRoaXMubWl4VG9Ob3JtYWwgPSAoPElEaWdpdGFsUmFpblBvc3RQcm9jZXNzT3B0aW9ucz5vcHRpb25zKS5taXhUb05vcm1hbCB8fCB0aGlzLm1peFRvTm9ybWFsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBzY2VuZSA9IGNhbWVyYT8uZ2V0U2NlbmUoKSB8fCBudWxsO1xyXG4gICAgICAgIHRoaXMuX2RpZ2l0YWxSYWluRm9udFRleHR1cmUgPSBuZXcgRGlnaXRhbFJhaW5Gb250VGV4dHVyZShuYW1lLCBmb250LCBjaGFyYWN0ZXJTZXQsIHNjZW5lKTtcclxuICAgICAgICBjb25zdCB0ZXh0dXJlU2l6ZSA9IHRoaXMuX2RpZ2l0YWxSYWluRm9udFRleHR1cmUuZ2V0U2l6ZSgpO1xyXG5cclxuICAgICAgICBsZXQgYWxwaGEgPSAwLjA7XHJcbiAgICAgICAgbGV0IGNvc1RpbWVaZXJvT25lID0gMC4wO1xyXG4gICAgICAgIGNvbnN0IG1hdHJpeCA9IE1hdHJpeC5Gcm9tVmFsdWVzKFxyXG4gICAgICAgICAgICBNYXRoLnJhbmRvbSgpLFxyXG4gICAgICAgICAgICBNYXRoLnJhbmRvbSgpLFxyXG4gICAgICAgICAgICBNYXRoLnJhbmRvbSgpLFxyXG4gICAgICAgICAgICBNYXRoLnJhbmRvbSgpLFxyXG4gICAgICAgICAgICBNYXRoLnJhbmRvbSgpLFxyXG4gICAgICAgICAgICBNYXRoLnJhbmRvbSgpLFxyXG4gICAgICAgICAgICBNYXRoLnJhbmRvbSgpLFxyXG4gICAgICAgICAgICBNYXRoLnJhbmRvbSgpLFxyXG4gICAgICAgICAgICBNYXRoLnJhbmRvbSgpLFxyXG4gICAgICAgICAgICBNYXRoLnJhbmRvbSgpLFxyXG4gICAgICAgICAgICBNYXRoLnJhbmRvbSgpLFxyXG4gICAgICAgICAgICBNYXRoLnJhbmRvbSgpLFxyXG4gICAgICAgICAgICBNYXRoLnJhbmRvbSgpLFxyXG4gICAgICAgICAgICBNYXRoLnJhbmRvbSgpLFxyXG4gICAgICAgICAgICBNYXRoLnJhbmRvbSgpLFxyXG4gICAgICAgICAgICBNYXRoLnJhbmRvbSgpXHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgdGhpcy5vbkFwcGx5ID0gKGVmZmVjdDogRWZmZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIGVmZmVjdC5zZXRUZXh0dXJlKFwiZGlnaXRhbFJhaW5Gb250XCIsIHRoaXMuX2RpZ2l0YWxSYWluRm9udFRleHR1cmUpO1xyXG5cclxuICAgICAgICAgICAgZWZmZWN0LnNldEZsb2F0NChcImRpZ2l0YWxSYWluRm9udEluZm9zXCIsIHRoaXMuX2RpZ2l0YWxSYWluRm9udFRleHR1cmUuY2hhclNpemUsIGNoYXJhY3RlclNldC5sZW5ndGgsIHRleHR1cmVTaXplLndpZHRoLCB0ZXh0dXJlU2l6ZS5oZWlnaHQpO1xyXG5cclxuICAgICAgICAgICAgZWZmZWN0LnNldEZsb2F0NChcImRpZ2l0YWxSYWluT3B0aW9uc1wiLCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCwgdGhpcy5taXhUb05vcm1hbCwgdGhpcy5taXhUb1RpbGUpO1xyXG5cclxuICAgICAgICAgICAgZWZmZWN0LnNldE1hdHJpeChcIm1hdHJpeFNwZWVkXCIsIG1hdHJpeCk7XHJcblxyXG4gICAgICAgICAgICBhbHBoYSArPSB0aGlzLnNwZWVkO1xyXG4gICAgICAgICAgICBjb3NUaW1lWmVyb09uZSA9IGFscGhhO1xyXG4gICAgICAgICAgICBlZmZlY3Quc2V0RmxvYXQoXCJjb3NUaW1lWmVyb09uZVwiLCBjb3NUaW1lWmVyb09uZSk7XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxufVxyXG4iLCIvLyBEbyBub3QgZWRpdC5cbmltcG9ydCB7IFNoYWRlclN0b3JlIH0gZnJvbSBcImNvcmUvRW5naW5lcy9zaGFkZXJTdG9yZVwiO1xuXG5jb25zdCBuYW1lID0gXCJkaWdpdGFscmFpblBpeGVsU2hhZGVyXCI7XG5jb25zdCBzaGFkZXIgPSBgdmFyeWluZyB2ZWMyIHZVVjt1bmlmb3JtIHNhbXBsZXIyRCB0ZXh0dXJlU2FtcGxlcjt1bmlmb3JtIHNhbXBsZXIyRCBkaWdpdGFsUmFpbkZvbnQ7dW5pZm9ybSB2ZWM0IGRpZ2l0YWxSYWluRm9udEluZm9zO3VuaWZvcm0gdmVjNCBkaWdpdGFsUmFpbk9wdGlvbnM7dW5pZm9ybSBtYXQ0IG1hdHJpeFNwZWVkO3VuaWZvcm0gZmxvYXQgY29zVGltZVplcm9PbmU7ZmxvYXQgZ2V0THVtaW5hbmNlKHZlYzMgY29sb3IpXG57cmV0dXJuIGNsYW1wKGRvdChjb2xvcix2ZWMzKDAuMjEyNiwwLjcxNTIsMC4wNzIyKSksMC4sMS4pO31cbiNkZWZpbmUgQ1VTVE9NX0ZSQUdNRU5UX0RFRklOSVRJT05TXG52b2lkIG1haW4odm9pZCkgXG57ZmxvYXQgY2FyYWN0ZXJTaXplPWRpZ2l0YWxSYWluRm9udEluZm9zLng7ZmxvYXQgbnVtQ2hhcj1kaWdpdGFsUmFpbkZvbnRJbmZvcy55LTEuMDtmbG9hdCBmb250eD1kaWdpdGFsUmFpbkZvbnRJbmZvcy56O2Zsb2F0IGZvbnR5PWRpZ2l0YWxSYWluRm9udEluZm9zLnc7ZmxvYXQgc2NyZWVueD1kaWdpdGFsUmFpbk9wdGlvbnMueDtmbG9hdCBzY3JlZW55PWRpZ2l0YWxSYWluT3B0aW9ucy55O2Zsb2F0IHJhdGlvPXNjcmVlbnkvZm9udHk7ZmxvYXQgY29sdW1ueD1mbG9hdChmbG9vcigoZ2xfRnJhZ0Nvb3JkLngpL2NhcmFjdGVyU2l6ZSkpO2Zsb2F0IHRpbGVYPWZsb2F0KGZsb29yKChnbF9GcmFnQ29vcmQueCkvY2FyYWN0ZXJTaXplKSkqY2FyYWN0ZXJTaXplL3NjcmVlbng7ZmxvYXQgdGlsZVk9ZmxvYXQoZmxvb3IoKGdsX0ZyYWdDb29yZC55KS9jYXJhY3RlclNpemUpKSpjYXJhY3RlclNpemUvc2NyZWVueTt2ZWMyIHRpbGVVVj12ZWMyKHRpbGVYLHRpbGVZKTt2ZWM0IHRpbGVDb2xvcj10ZXh0dXJlMkQodGV4dHVyZVNhbXBsZXIsdGlsZVVWKTt2ZWM0IGJhc2VDb2xvcj10ZXh0dXJlMkQodGV4dHVyZVNhbXBsZXIsdlVWKTtmbG9hdCB0aWxlTHVtaW5hbmNlPWdldEx1bWluYW5jZSh0aWxlQ29sb3IucmdiKTtpbnQgc3Q9aW50KG1vZChjb2x1bW54LDQuMCkpO2Zsb2F0IHNwZWVkPWNvc1RpbWVaZXJvT25lKihzaW4odGlsZVgqMzE0LjUpKjAuNSswLjYpOyBcbmZsb2F0IHg9ZmxvYXQobW9kKGdsX0ZyYWdDb29yZC54LGNhcmFjdGVyU2l6ZSkpL2ZvbnR4O2Zsb2F0IHk9ZmxvYXQobW9kKHNwZWVkK2dsX0ZyYWdDb29yZC55L3NjcmVlbnksMS4wKSk7eSo9cmF0aW87dmVjNCBmaW5hbENvbG9yPSB0ZXh0dXJlMkQoZGlnaXRhbFJhaW5Gb250LHZlYzIoeCwxLjAteSkpO3ZlYzMgaGlnaD1maW5hbENvbG9yLnJnYioodmVjMygxLjIsMS4yLDEuMikqcG93KDEuMC15LDMwLjApKTtmaW5hbENvbG9yLnJnYio9dmVjMyhwb3codGlsZUx1bWluYW5jZSw1LjApLHBvdyh0aWxlTHVtaW5hbmNlLDEuNSkscG93KHRpbGVMdW1pbmFuY2UsMy4wKSk7ZmluYWxDb2xvci5yZ2IrPWhpZ2g7ZmluYWxDb2xvci5yZ2I9Y2xhbXAoZmluYWxDb2xvci5yZ2IsMC4sMS4pO2ZpbmFsQ29sb3IuYT0xLjA7ZmluYWxDb2xvcj0gbWl4KGZpbmFsQ29sb3IsdGlsZUNvbG9yLGRpZ2l0YWxSYWluT3B0aW9ucy53KTtmaW5hbENvbG9yPSBtaXgoZmluYWxDb2xvcixiYXNlQ29sb3IsZGlnaXRhbFJhaW5PcHRpb25zLnopO2dsX0ZyYWdDb2xvcj1maW5hbENvbG9yO31gO1xuLy8gU2lkZWVmZmVjdFxuU2hhZGVyU3RvcmUuU2hhZGVyc1N0b3JlW25hbWVdID0gc2hhZGVyO1xuLyoqIEBpbnRlcm5hbCAqL1xuZXhwb3J0IGNvbnN0IGRpZ2l0YWxyYWluUGl4ZWxTaGFkZXIgPSB7IG5hbWUsIHNoYWRlciB9O1xuIiwiZXhwb3J0ICogZnJvbSBcIi4vZGlnaXRhbFJhaW5Qb3N0UHJvY2Vzc1wiO1xyXG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBpbXBvcnQvbm8taW50ZXJuYWwtbW9kdWxlcyAqL1xyXG5leHBvcnQgKiBmcm9tIFwiLi9hc2NpaUFydC9pbmRleFwiO1xyXG5leHBvcnQgKiBmcm9tIFwiLi9kaWdpdGFsUmFpbi9pbmRleFwiO1xyXG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBpbXBvcnQvbm8taW50ZXJuYWwtbW9kdWxlcyAqL1xyXG5pbXBvcnQgKiBhcyBwb3N0UHJvY2Vzc0xpYnJhcnkgZnJvbSBcInBvc3QtcHJvY2Vzc2VzL2luZGV4XCI7XHJcblxyXG4vKipcclxuICpcclxuICogVGhpcyBpcyB0aGUgZW50cnkgcG9pbnQgZm9yIHRoZSBVTUQgbW9kdWxlLlxyXG4gKiBUaGUgZW50cnkgcG9pbnQgZm9yIGEgZnV0dXJlIEVTTSBwYWNrYWdlIHNob3VsZCBiZSBpbmRleC50c1xyXG4gKi9cclxuY29uc3QgZ2xvYmFsT2JqZWN0ID0gdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbCA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB1bmRlZmluZWQ7XHJcbmlmICh0eXBlb2YgZ2xvYmFsT2JqZWN0ICE9PSBcInVuZGVmaW5lZFwiKSB7XHJcbiAgICBmb3IgKGNvbnN0IGtleSBpbiBwb3N0UHJvY2Vzc0xpYnJhcnkpIHtcclxuICAgICAgICAoPGFueT5nbG9iYWxPYmplY3QpLkJBQllMT05ba2V5XSA9ICg8YW55PnBvc3RQcm9jZXNzTGlicmFyeSlba2V5XTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0ICogZnJvbSBcInBvc3QtcHJvY2Vzc2VzL2luZGV4XCI7XHJcbiIsIm1vZHVsZS5leHBvcnRzID0gX19XRUJQQUNLX0VYVEVSTkFMX01PRFVMRV9iYWJ5bG9uanNfTWlzY19kZWNvcmF0b3JzX187IiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQgQ29ycG9yYXRpb24uXG5cblBlcm1pc3Npb24gdG8gdXNlLCBjb3B5LCBtb2RpZnksIGFuZC9vciBkaXN0cmlidXRlIHRoaXMgc29mdHdhcmUgZm9yIGFueVxucHVycG9zZSB3aXRoIG9yIHdpdGhvdXQgZmVlIGlzIGhlcmVieSBncmFudGVkLlxuXG5USEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiIEFORCBUSEUgQVVUSE9SIERJU0NMQUlNUyBBTEwgV0FSUkFOVElFUyBXSVRIXG5SRUdBUkQgVE8gVEhJUyBTT0ZUV0FSRSBJTkNMVURJTkcgQUxMIElNUExJRUQgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFlcbkFORCBGSVRORVNTLiBJTiBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SIEJFIExJQUJMRSBGT1IgQU5ZIFNQRUNJQUwsIERJUkVDVCxcbklORElSRUNULCBPUiBDT05TRVFVRU5USUFMIERBTUFHRVMgT1IgQU5ZIERBTUFHRVMgV0hBVFNPRVZFUiBSRVNVTFRJTkcgRlJPTVxuTE9TUyBPRiBVU0UsIERBVEEgT1IgUFJPRklUUywgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIE5FR0xJR0VOQ0UgT1Jcbk9USEVSIFRPUlRJT1VTIEFDVElPTiwgQVJJU0lORyBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBVU0UgT1JcblBFUkZPUk1BTkNFIE9GIFRISVMgU09GVFdBUkUuXG4qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiAqL1xuLyogZ2xvYmFsIFJlZmxlY3QsIFByb21pc2UsIFN1cHByZXNzZWRFcnJvciwgU3ltYm9sICovXG5cbnZhciBleHRlbmRTdGF0aWNzID0gZnVuY3Rpb24oZCwgYikge1xuICBleHRlbmRTdGF0aWNzID0gT2JqZWN0LnNldFByb3RvdHlwZU9mIHx8XG4gICAgICAoeyBfX3Byb3RvX186IFtdIH0gaW5zdGFuY2VvZiBBcnJheSAmJiBmdW5jdGlvbiAoZCwgYikgeyBkLl9fcHJvdG9fXyA9IGI7IH0pIHx8XG4gICAgICBmdW5jdGlvbiAoZCwgYikgeyBmb3IgKHZhciBwIGluIGIpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYiwgcCkpIGRbcF0gPSBiW3BdOyB9O1xuICByZXR1cm4gZXh0ZW5kU3RhdGljcyhkLCBiKTtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBfX2V4dGVuZHMoZCwgYikge1xuICBpZiAodHlwZW9mIGIgIT09IFwiZnVuY3Rpb25cIiAmJiBiICE9PSBudWxsKVxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNsYXNzIGV4dGVuZHMgdmFsdWUgXCIgKyBTdHJpbmcoYikgKyBcIiBpcyBub3QgYSBjb25zdHJ1Y3RvciBvciBudWxsXCIpO1xuICBleHRlbmRTdGF0aWNzKGQsIGIpO1xuICBmdW5jdGlvbiBfXygpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGQ7IH1cbiAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xufVxuXG5leHBvcnQgdmFyIF9fYXNzaWduID0gZnVuY3Rpb24oKSB7XG4gIF9fYXNzaWduID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiBfX2Fzc2lnbih0KSB7XG4gICAgICBmb3IgKHZhciBzLCBpID0gMSwgbiA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgICBzID0gYXJndW1lbnRzW2ldO1xuICAgICAgICAgIGZvciAodmFyIHAgaW4gcykgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzLCBwKSkgdFtwXSA9IHNbcF07XG4gICAgICB9XG4gICAgICByZXR1cm4gdDtcbiAgfVxuICByZXR1cm4gX19hc3NpZ24uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9fcmVzdChzLCBlKSB7XG4gIHZhciB0ID0ge307XG4gIGZvciAodmFyIHAgaW4gcykgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzLCBwKSAmJiBlLmluZGV4T2YocCkgPCAwKVxuICAgICAgdFtwXSA9IHNbcF07XG4gIGlmIChzICE9IG51bGwgJiYgdHlwZW9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMgPT09IFwiZnVuY3Rpb25cIilcbiAgICAgIGZvciAodmFyIGkgPSAwLCBwID0gT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhzKTsgaSA8IHAubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZiAoZS5pbmRleE9mKHBbaV0pIDwgMCAmJiBPYmplY3QucHJvdG90eXBlLnByb3BlcnR5SXNFbnVtZXJhYmxlLmNhbGwocywgcFtpXSkpXG4gICAgICAgICAgICAgIHRbcFtpXV0gPSBzW3BbaV1dO1xuICAgICAgfVxuICByZXR1cm4gdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9fZGVjb3JhdGUoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpIHtcbiAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLCByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYywgZDtcbiAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0LmRlY29yYXRlID09PSBcImZ1bmN0aW9uXCIpIHIgPSBSZWZsZWN0LmRlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKTtcbiAgZWxzZSBmb3IgKHZhciBpID0gZGVjb3JhdG9ycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkgaWYgKGQgPSBkZWNvcmF0b3JzW2ldKSByID0gKGMgPCAzID8gZChyKSA6IGMgPiAzID8gZCh0YXJnZXQsIGtleSwgcikgOiBkKHRhcmdldCwga2V5KSkgfHwgcjtcbiAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9fcGFyYW0ocGFyYW1JbmRleCwgZGVjb3JhdG9yKSB7XG4gIHJldHVybiBmdW5jdGlvbiAodGFyZ2V0LCBrZXkpIHsgZGVjb3JhdG9yKHRhcmdldCwga2V5LCBwYXJhbUluZGV4KTsgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gX19lc0RlY29yYXRlKGN0b3IsIGRlc2NyaXB0b3JJbiwgZGVjb3JhdG9ycywgY29udGV4dEluLCBpbml0aWFsaXplcnMsIGV4dHJhSW5pdGlhbGl6ZXJzKSB7XG4gIGZ1bmN0aW9uIGFjY2VwdChmKSB7IGlmIChmICE9PSB2b2lkIDAgJiYgdHlwZW9mIGYgIT09IFwiZnVuY3Rpb25cIikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkZ1bmN0aW9uIGV4cGVjdGVkXCIpOyByZXR1cm4gZjsgfVxuICB2YXIga2luZCA9IGNvbnRleHRJbi5raW5kLCBrZXkgPSBraW5kID09PSBcImdldHRlclwiID8gXCJnZXRcIiA6IGtpbmQgPT09IFwic2V0dGVyXCIgPyBcInNldFwiIDogXCJ2YWx1ZVwiO1xuICB2YXIgdGFyZ2V0ID0gIWRlc2NyaXB0b3JJbiAmJiBjdG9yID8gY29udGV4dEluW1wic3RhdGljXCJdID8gY3RvciA6IGN0b3IucHJvdG90eXBlIDogbnVsbDtcbiAgdmFyIGRlc2NyaXB0b3IgPSBkZXNjcmlwdG9ySW4gfHwgKHRhcmdldCA/IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBjb250ZXh0SW4ubmFtZSkgOiB7fSk7XG4gIHZhciBfLCBkb25lID0gZmFsc2U7XG4gIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICB2YXIgY29udGV4dCA9IHt9O1xuICAgICAgZm9yICh2YXIgcCBpbiBjb250ZXh0SW4pIGNvbnRleHRbcF0gPSBwID09PSBcImFjY2Vzc1wiID8ge30gOiBjb250ZXh0SW5bcF07XG4gICAgICBmb3IgKHZhciBwIGluIGNvbnRleHRJbi5hY2Nlc3MpIGNvbnRleHQuYWNjZXNzW3BdID0gY29udGV4dEluLmFjY2Vzc1twXTtcbiAgICAgIGNvbnRleHQuYWRkSW5pdGlhbGl6ZXIgPSBmdW5jdGlvbiAoZikgeyBpZiAoZG9uZSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBhZGQgaW5pdGlhbGl6ZXJzIGFmdGVyIGRlY29yYXRpb24gaGFzIGNvbXBsZXRlZFwiKTsgZXh0cmFJbml0aWFsaXplcnMucHVzaChhY2NlcHQoZiB8fCBudWxsKSk7IH07XG4gICAgICB2YXIgcmVzdWx0ID0gKDAsIGRlY29yYXRvcnNbaV0pKGtpbmQgPT09IFwiYWNjZXNzb3JcIiA/IHsgZ2V0OiBkZXNjcmlwdG9yLmdldCwgc2V0OiBkZXNjcmlwdG9yLnNldCB9IDogZGVzY3JpcHRvcltrZXldLCBjb250ZXh0KTtcbiAgICAgIGlmIChraW5kID09PSBcImFjY2Vzc29yXCIpIHtcbiAgICAgICAgICBpZiAocmVzdWx0ID09PSB2b2lkIDApIGNvbnRpbnVlO1xuICAgICAgICAgIGlmIChyZXN1bHQgPT09IG51bGwgfHwgdHlwZW9mIHJlc3VsdCAhPT0gXCJvYmplY3RcIikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdCBleHBlY3RlZFwiKTtcbiAgICAgICAgICBpZiAoXyA9IGFjY2VwdChyZXN1bHQuZ2V0KSkgZGVzY3JpcHRvci5nZXQgPSBfO1xuICAgICAgICAgIGlmIChfID0gYWNjZXB0KHJlc3VsdC5zZXQpKSBkZXNjcmlwdG9yLnNldCA9IF87XG4gICAgICAgICAgaWYgKF8gPSBhY2NlcHQocmVzdWx0LmluaXQpKSBpbml0aWFsaXplcnMudW5zaGlmdChfKTtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKF8gPSBhY2NlcHQocmVzdWx0KSkge1xuICAgICAgICAgIGlmIChraW5kID09PSBcImZpZWxkXCIpIGluaXRpYWxpemVycy51bnNoaWZ0KF8pO1xuICAgICAgICAgIGVsc2UgZGVzY3JpcHRvcltrZXldID0gXztcbiAgICAgIH1cbiAgfVxuICBpZiAodGFyZ2V0KSBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBjb250ZXh0SW4ubmFtZSwgZGVzY3JpcHRvcik7XG4gIGRvbmUgPSB0cnVlO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIF9fcnVuSW5pdGlhbGl6ZXJzKHRoaXNBcmcsIGluaXRpYWxpemVycywgdmFsdWUpIHtcbiAgdmFyIHVzZVZhbHVlID0gYXJndW1lbnRzLmxlbmd0aCA+IDI7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgaW5pdGlhbGl6ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YWx1ZSA9IHVzZVZhbHVlID8gaW5pdGlhbGl6ZXJzW2ldLmNhbGwodGhpc0FyZywgdmFsdWUpIDogaW5pdGlhbGl6ZXJzW2ldLmNhbGwodGhpc0FyZyk7XG4gIH1cbiAgcmV0dXJuIHVzZVZhbHVlID8gdmFsdWUgOiB2b2lkIDA7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gX19wcm9wS2V5KHgpIHtcbiAgcmV0dXJuIHR5cGVvZiB4ID09PSBcInN5bWJvbFwiID8geCA6IFwiXCIuY29uY2F0KHgpO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIF9fc2V0RnVuY3Rpb25OYW1lKGYsIG5hbWUsIHByZWZpeCkge1xuICBpZiAodHlwZW9mIG5hbWUgPT09IFwic3ltYm9sXCIpIG5hbWUgPSBuYW1lLmRlc2NyaXB0aW9uID8gXCJbXCIuY29uY2F0KG5hbWUuZGVzY3JpcHRpb24sIFwiXVwiKSA6IFwiXCI7XG4gIHJldHVybiBPYmplY3QuZGVmaW5lUHJvcGVydHkoZiwgXCJuYW1lXCIsIHsgY29uZmlndXJhYmxlOiB0cnVlLCB2YWx1ZTogcHJlZml4ID8gXCJcIi5jb25jYXQocHJlZml4LCBcIiBcIiwgbmFtZSkgOiBuYW1lIH0pO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIF9fbWV0YWRhdGEobWV0YWRhdGFLZXksIG1ldGFkYXRhVmFsdWUpIHtcbiAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0Lm1ldGFkYXRhID09PSBcImZ1bmN0aW9uXCIpIHJldHVybiBSZWZsZWN0Lm1ldGFkYXRhKG1ldGFkYXRhS2V5LCBtZXRhZGF0YVZhbHVlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9fYXdhaXRlcih0aGlzQXJnLCBfYXJndW1lbnRzLCBQLCBnZW5lcmF0b3IpIHtcbiAgZnVuY3Rpb24gYWRvcHQodmFsdWUpIHsgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgUCA/IHZhbHVlIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZSh2YWx1ZSk7IH0pOyB9XG4gIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IGFkb3B0KHJlc3VsdC52YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxuICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpO1xuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9fZ2VuZXJhdG9yKHRoaXNBcmcsIGJvZHkpIHtcbiAgdmFyIF8gPSB7IGxhYmVsOiAwLCBzZW50OiBmdW5jdGlvbigpIHsgaWYgKHRbMF0gJiAxKSB0aHJvdyB0WzFdOyByZXR1cm4gdFsxXTsgfSwgdHJ5czogW10sIG9wczogW10gfSwgZiwgeSwgdCwgZztcbiAgcmV0dXJuIGcgPSB7IG5leHQ6IHZlcmIoMCksIFwidGhyb3dcIjogdmVyYigxKSwgXCJyZXR1cm5cIjogdmVyYigyKSB9LCB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgKGdbU3ltYm9sLml0ZXJhdG9yXSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpczsgfSksIGc7XG4gIGZ1bmN0aW9uIHZlcmIobikgeyByZXR1cm4gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIHN0ZXAoW24sIHZdKTsgfTsgfVxuICBmdW5jdGlvbiBzdGVwKG9wKSB7XG4gICAgICBpZiAoZikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkdlbmVyYXRvciBpcyBhbHJlYWR5IGV4ZWN1dGluZy5cIik7XG4gICAgICB3aGlsZSAoZyAmJiAoZyA9IDAsIG9wWzBdICYmIChfID0gMCkpLCBfKSB0cnkge1xuICAgICAgICAgIGlmIChmID0gMSwgeSAmJiAodCA9IG9wWzBdICYgMiA/IHlbXCJyZXR1cm5cIl0gOiBvcFswXSA/IHlbXCJ0aHJvd1wiXSB8fCAoKHQgPSB5W1wicmV0dXJuXCJdKSAmJiB0LmNhbGwoeSksIDApIDogeS5uZXh0KSAmJiAhKHQgPSB0LmNhbGwoeSwgb3BbMV0pKS5kb25lKSByZXR1cm4gdDtcbiAgICAgICAgICBpZiAoeSA9IDAsIHQpIG9wID0gW29wWzBdICYgMiwgdC52YWx1ZV07XG4gICAgICAgICAgc3dpdGNoIChvcFswXSkge1xuICAgICAgICAgICAgICBjYXNlIDA6IGNhc2UgMTogdCA9IG9wOyBicmVhaztcbiAgICAgICAgICAgICAgY2FzZSA0OiBfLmxhYmVsKys7IHJldHVybiB7IHZhbHVlOiBvcFsxXSwgZG9uZTogZmFsc2UgfTtcbiAgICAgICAgICAgICAgY2FzZSA1OiBfLmxhYmVsKys7IHkgPSBvcFsxXTsgb3AgPSBbMF07IGNvbnRpbnVlO1xuICAgICAgICAgICAgICBjYXNlIDc6IG9wID0gXy5vcHMucG9wKCk7IF8udHJ5cy5wb3AoKTsgY29udGludWU7XG4gICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICBpZiAoISh0ID0gXy50cnlzLCB0ID0gdC5sZW5ndGggPiAwICYmIHRbdC5sZW5ndGggLSAxXSkgJiYgKG9wWzBdID09PSA2IHx8IG9wWzBdID09PSAyKSkgeyBfID0gMDsgY29udGludWU7IH1cbiAgICAgICAgICAgICAgICAgIGlmIChvcFswXSA9PT0gMyAmJiAoIXQgfHwgKG9wWzFdID4gdFswXSAmJiBvcFsxXSA8IHRbM10pKSkgeyBfLmxhYmVsID0gb3BbMV07IGJyZWFrOyB9XG4gICAgICAgICAgICAgICAgICBpZiAob3BbMF0gPT09IDYgJiYgXy5sYWJlbCA8IHRbMV0pIHsgXy5sYWJlbCA9IHRbMV07IHQgPSBvcDsgYnJlYWs7IH1cbiAgICAgICAgICAgICAgICAgIGlmICh0ICYmIF8ubGFiZWwgPCB0WzJdKSB7IF8ubGFiZWwgPSB0WzJdOyBfLm9wcy5wdXNoKG9wKTsgYnJlYWs7IH1cbiAgICAgICAgICAgICAgICAgIGlmICh0WzJdKSBfLm9wcy5wb3AoKTtcbiAgICAgICAgICAgICAgICAgIF8udHJ5cy5wb3AoKTsgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIG9wID0gYm9keS5jYWxsKHRoaXNBcmcsIF8pO1xuICAgICAgfSBjYXRjaCAoZSkgeyBvcCA9IFs2LCBlXTsgeSA9IDA7IH0gZmluYWxseSB7IGYgPSB0ID0gMDsgfVxuICAgICAgaWYgKG9wWzBdICYgNSkgdGhyb3cgb3BbMV07IHJldHVybiB7IHZhbHVlOiBvcFswXSA/IG9wWzFdIDogdm9pZCAwLCBkb25lOiB0cnVlIH07XG4gIH1cbn1cblxuZXhwb3J0IHZhciBfX2NyZWF0ZUJpbmRpbmcgPSBPYmplY3QuY3JlYXRlID8gKGZ1bmN0aW9uKG8sIG0sIGssIGsyKSB7XG4gIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XG4gIHZhciBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihtLCBrKTtcbiAgaWYgKCFkZXNjIHx8IChcImdldFwiIGluIGRlc2MgPyAhbS5fX2VzTW9kdWxlIDogZGVzYy53cml0YWJsZSB8fCBkZXNjLmNvbmZpZ3VyYWJsZSkpIHtcbiAgICAgIGRlc2MgPSB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBtW2tdOyB9IH07XG4gIH1cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIGsyLCBkZXNjKTtcbn0pIDogKGZ1bmN0aW9uKG8sIG0sIGssIGsyKSB7XG4gIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XG4gIG9bazJdID0gbVtrXTtcbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gX19leHBvcnRTdGFyKG0sIG8pIHtcbiAgZm9yICh2YXIgcCBpbiBtKSBpZiAocCAhPT0gXCJkZWZhdWx0XCIgJiYgIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvLCBwKSkgX19jcmVhdGVCaW5kaW5nKG8sIG0sIHApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gX192YWx1ZXMobykge1xuICB2YXIgcyA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBTeW1ib2wuaXRlcmF0b3IsIG0gPSBzICYmIG9bc10sIGkgPSAwO1xuICBpZiAobSkgcmV0dXJuIG0uY2FsbChvKTtcbiAgaWYgKG8gJiYgdHlwZW9mIG8ubGVuZ3RoID09PSBcIm51bWJlclwiKSByZXR1cm4ge1xuICAgICAgbmV4dDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGlmIChvICYmIGkgPj0gby5sZW5ndGgpIG8gPSB2b2lkIDA7XG4gICAgICAgICAgcmV0dXJuIHsgdmFsdWU6IG8gJiYgb1tpKytdLCBkb25lOiAhbyB9O1xuICAgICAgfVxuICB9O1xuICB0aHJvdyBuZXcgVHlwZUVycm9yKHMgPyBcIk9iamVjdCBpcyBub3QgaXRlcmFibGUuXCIgOiBcIlN5bWJvbC5pdGVyYXRvciBpcyBub3QgZGVmaW5lZC5cIik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfX3JlYWQobywgbikge1xuICB2YXIgbSA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvW1N5bWJvbC5pdGVyYXRvcl07XG4gIGlmICghbSkgcmV0dXJuIG87XG4gIHZhciBpID0gbS5jYWxsKG8pLCByLCBhciA9IFtdLCBlO1xuICB0cnkge1xuICAgICAgd2hpbGUgKChuID09PSB2b2lkIDAgfHwgbi0tID4gMCkgJiYgIShyID0gaS5uZXh0KCkpLmRvbmUpIGFyLnB1c2goci52YWx1ZSk7XG4gIH1cbiAgY2F0Y2ggKGVycm9yKSB7IGUgPSB7IGVycm9yOiBlcnJvciB9OyB9XG4gIGZpbmFsbHkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgICBpZiAociAmJiAhci5kb25lICYmIChtID0gaVtcInJldHVyblwiXSkpIG0uY2FsbChpKTtcbiAgICAgIH1cbiAgICAgIGZpbmFsbHkgeyBpZiAoZSkgdGhyb3cgZS5lcnJvcjsgfVxuICB9XG4gIHJldHVybiBhcjtcbn1cblxuLyoqIEBkZXByZWNhdGVkICovXG5leHBvcnQgZnVuY3Rpb24gX19zcHJlYWQoKSB7XG4gIGZvciAodmFyIGFyID0gW10sIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKVxuICAgICAgYXIgPSBhci5jb25jYXQoX19yZWFkKGFyZ3VtZW50c1tpXSkpO1xuICByZXR1cm4gYXI7XG59XG5cbi8qKiBAZGVwcmVjYXRlZCAqL1xuZXhwb3J0IGZ1bmN0aW9uIF9fc3ByZWFkQXJyYXlzKCkge1xuICBmb3IgKHZhciBzID0gMCwgaSA9IDAsIGlsID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IGlsOyBpKyspIHMgKz0gYXJndW1lbnRzW2ldLmxlbmd0aDtcbiAgZm9yICh2YXIgciA9IEFycmF5KHMpLCBrID0gMCwgaSA9IDA7IGkgPCBpbDsgaSsrKVxuICAgICAgZm9yICh2YXIgYSA9IGFyZ3VtZW50c1tpXSwgaiA9IDAsIGpsID0gYS5sZW5ndGg7IGogPCBqbDsgaisrLCBrKyspXG4gICAgICAgICAgcltrXSA9IGFbal07XG4gIHJldHVybiByO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gX19zcHJlYWRBcnJheSh0bywgZnJvbSwgcGFjaykge1xuICBpZiAocGFjayB8fCBhcmd1bWVudHMubGVuZ3RoID09PSAyKSBmb3IgKHZhciBpID0gMCwgbCA9IGZyb20ubGVuZ3RoLCBhcjsgaSA8IGw7IGkrKykge1xuICAgICAgaWYgKGFyIHx8ICEoaSBpbiBmcm9tKSkge1xuICAgICAgICAgIGlmICghYXIpIGFyID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZnJvbSwgMCwgaSk7XG4gICAgICAgICAgYXJbaV0gPSBmcm9tW2ldO1xuICAgICAgfVxuICB9XG4gIHJldHVybiB0by5jb25jYXQoYXIgfHwgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZnJvbSkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gX19hd2FpdCh2KSB7XG4gIHJldHVybiB0aGlzIGluc3RhbmNlb2YgX19hd2FpdCA/ICh0aGlzLnYgPSB2LCB0aGlzKSA6IG5ldyBfX2F3YWl0KHYpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gX19hc3luY0dlbmVyYXRvcih0aGlzQXJnLCBfYXJndW1lbnRzLCBnZW5lcmF0b3IpIHtcbiAgaWYgKCFTeW1ib2wuYXN5bmNJdGVyYXRvcikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5hc3luY0l0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcbiAgdmFyIGcgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSksIGksIHEgPSBbXTtcbiAgcmV0dXJuIGkgPSB7fSwgdmVyYihcIm5leHRcIiksIHZlcmIoXCJ0aHJvd1wiKSwgdmVyYihcInJldHVyblwiKSwgaVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9LCBpO1xuICBmdW5jdGlvbiB2ZXJiKG4pIHsgaWYgKGdbbl0pIGlbbl0gPSBmdW5jdGlvbiAodikgeyByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKGEsIGIpIHsgcS5wdXNoKFtuLCB2LCBhLCBiXSkgPiAxIHx8IHJlc3VtZShuLCB2KTsgfSk7IH07IH1cbiAgZnVuY3Rpb24gcmVzdW1lKG4sIHYpIHsgdHJ5IHsgc3RlcChnW25dKHYpKTsgfSBjYXRjaCAoZSkgeyBzZXR0bGUocVswXVszXSwgZSk7IH0gfVxuICBmdW5jdGlvbiBzdGVwKHIpIHsgci52YWx1ZSBpbnN0YW5jZW9mIF9fYXdhaXQgPyBQcm9taXNlLnJlc29sdmUoci52YWx1ZS52KS50aGVuKGZ1bGZpbGwsIHJlamVjdCkgOiBzZXR0bGUocVswXVsyXSwgcik7IH1cbiAgZnVuY3Rpb24gZnVsZmlsbCh2YWx1ZSkgeyByZXN1bWUoXCJuZXh0XCIsIHZhbHVlKTsgfVxuICBmdW5jdGlvbiByZWplY3QodmFsdWUpIHsgcmVzdW1lKFwidGhyb3dcIiwgdmFsdWUpOyB9XG4gIGZ1bmN0aW9uIHNldHRsZShmLCB2KSB7IGlmIChmKHYpLCBxLnNoaWZ0KCksIHEubGVuZ3RoKSByZXN1bWUocVswXVswXSwgcVswXVsxXSk7IH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9fYXN5bmNEZWxlZ2F0b3Iobykge1xuICB2YXIgaSwgcDtcbiAgcmV0dXJuIGkgPSB7fSwgdmVyYihcIm5leHRcIiksIHZlcmIoXCJ0aHJvd1wiLCBmdW5jdGlvbiAoZSkgeyB0aHJvdyBlOyB9KSwgdmVyYihcInJldHVyblwiKSwgaVtTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSwgaTtcbiAgZnVuY3Rpb24gdmVyYihuLCBmKSB7IGlbbl0gPSBvW25dID8gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIChwID0gIXApID8geyB2YWx1ZTogX19hd2FpdChvW25dKHYpKSwgZG9uZTogZmFsc2UgfSA6IGYgPyBmKHYpIDogdjsgfSA6IGY7IH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9fYXN5bmNWYWx1ZXMobykge1xuICBpZiAoIVN5bWJvbC5hc3luY0l0ZXJhdG9yKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3ltYm9sLmFzeW5jSXRlcmF0b3IgaXMgbm90IGRlZmluZWQuXCIpO1xuICB2YXIgbSA9IG9bU3ltYm9sLmFzeW5jSXRlcmF0b3JdLCBpO1xuICByZXR1cm4gbSA/IG0uY2FsbChvKSA6IChvID0gdHlwZW9mIF9fdmFsdWVzID09PSBcImZ1bmN0aW9uXCIgPyBfX3ZhbHVlcyhvKSA6IG9bU3ltYm9sLml0ZXJhdG9yXSgpLCBpID0ge30sIHZlcmIoXCJuZXh0XCIpLCB2ZXJiKFwidGhyb3dcIiksIHZlcmIoXCJyZXR1cm5cIiksIGlbU3ltYm9sLmFzeW5jSXRlcmF0b3JdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSwgaSk7XG4gIGZ1bmN0aW9uIHZlcmIobikgeyBpW25dID0gb1tuXSAmJiBmdW5jdGlvbiAodikgeyByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkgeyB2ID0gb1tuXSh2KSwgc2V0dGxlKHJlc29sdmUsIHJlamVjdCwgdi5kb25lLCB2LnZhbHVlKTsgfSk7IH07IH1cbiAgZnVuY3Rpb24gc2V0dGxlKHJlc29sdmUsIHJlamVjdCwgZCwgdikgeyBQcm9taXNlLnJlc29sdmUodikudGhlbihmdW5jdGlvbih2KSB7IHJlc29sdmUoeyB2YWx1ZTogdiwgZG9uZTogZCB9KTsgfSwgcmVqZWN0KTsgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gX19tYWtlVGVtcGxhdGVPYmplY3QoY29va2VkLCByYXcpIHtcbiAgaWYgKE9iamVjdC5kZWZpbmVQcm9wZXJ0eSkgeyBPYmplY3QuZGVmaW5lUHJvcGVydHkoY29va2VkLCBcInJhd1wiLCB7IHZhbHVlOiByYXcgfSk7IH0gZWxzZSB7IGNvb2tlZC5yYXcgPSByYXc7IH1cbiAgcmV0dXJuIGNvb2tlZDtcbn07XG5cbnZhciBfX3NldE1vZHVsZURlZmF1bHQgPSBPYmplY3QuY3JlYXRlID8gKGZ1bmN0aW9uKG8sIHYpIHtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIFwiZGVmYXVsdFwiLCB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiB2IH0pO1xufSkgOiBmdW5jdGlvbihvLCB2KSB7XG4gIG9bXCJkZWZhdWx0XCJdID0gdjtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBfX2ltcG9ydFN0YXIobW9kKSB7XG4gIGlmIChtb2QgJiYgbW9kLl9fZXNNb2R1bGUpIHJldHVybiBtb2Q7XG4gIHZhciByZXN1bHQgPSB7fTtcbiAgaWYgKG1vZCAhPSBudWxsKSBmb3IgKHZhciBrIGluIG1vZCkgaWYgKGsgIT09IFwiZGVmYXVsdFwiICYmIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChtb2QsIGspKSBfX2NyZWF0ZUJpbmRpbmcocmVzdWx0LCBtb2QsIGspO1xuICBfX3NldE1vZHVsZURlZmF1bHQocmVzdWx0LCBtb2QpO1xuICByZXR1cm4gcmVzdWx0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gX19pbXBvcnREZWZhdWx0KG1vZCkge1xuICByZXR1cm4gKG1vZCAmJiBtb2QuX19lc01vZHVsZSkgPyBtb2QgOiB7IGRlZmF1bHQ6IG1vZCB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gX19jbGFzc1ByaXZhdGVGaWVsZEdldChyZWNlaXZlciwgc3RhdGUsIGtpbmQsIGYpIHtcbiAgaWYgKGtpbmQgPT09IFwiYVwiICYmICFmKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiUHJpdmF0ZSBhY2Nlc3NvciB3YXMgZGVmaW5lZCB3aXRob3V0IGEgZ2V0dGVyXCIpO1xuICBpZiAodHlwZW9mIHN0YXRlID09PSBcImZ1bmN0aW9uXCIgPyByZWNlaXZlciAhPT0gc3RhdGUgfHwgIWYgOiAhc3RhdGUuaGFzKHJlY2VpdmVyKSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCByZWFkIHByaXZhdGUgbWVtYmVyIGZyb20gYW4gb2JqZWN0IHdob3NlIGNsYXNzIGRpZCBub3QgZGVjbGFyZSBpdFwiKTtcbiAgcmV0dXJuIGtpbmQgPT09IFwibVwiID8gZiA6IGtpbmQgPT09IFwiYVwiID8gZi5jYWxsKHJlY2VpdmVyKSA6IGYgPyBmLnZhbHVlIDogc3RhdGUuZ2V0KHJlY2VpdmVyKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9fY2xhc3NQcml2YXRlRmllbGRTZXQocmVjZWl2ZXIsIHN0YXRlLCB2YWx1ZSwga2luZCwgZikge1xuICBpZiAoa2luZCA9PT0gXCJtXCIpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJQcml2YXRlIG1ldGhvZCBpcyBub3Qgd3JpdGFibGVcIik7XG4gIGlmIChraW5kID09PSBcImFcIiAmJiAhZikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlByaXZhdGUgYWNjZXNzb3Igd2FzIGRlZmluZWQgd2l0aG91dCBhIHNldHRlclwiKTtcbiAgaWYgKHR5cGVvZiBzdGF0ZSA9PT0gXCJmdW5jdGlvblwiID8gcmVjZWl2ZXIgIT09IHN0YXRlIHx8ICFmIDogIXN0YXRlLmhhcyhyZWNlaXZlcikpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3Qgd3JpdGUgcHJpdmF0ZSBtZW1iZXIgdG8gYW4gb2JqZWN0IHdob3NlIGNsYXNzIGRpZCBub3QgZGVjbGFyZSBpdFwiKTtcbiAgcmV0dXJuIChraW5kID09PSBcImFcIiA/IGYuY2FsbChyZWNlaXZlciwgdmFsdWUpIDogZiA/IGYudmFsdWUgPSB2YWx1ZSA6IHN0YXRlLnNldChyZWNlaXZlciwgdmFsdWUpKSwgdmFsdWU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfX2NsYXNzUHJpdmF0ZUZpZWxkSW4oc3RhdGUsIHJlY2VpdmVyKSB7XG4gIGlmIChyZWNlaXZlciA9PT0gbnVsbCB8fCAodHlwZW9mIHJlY2VpdmVyICE9PSBcIm9iamVjdFwiICYmIHR5cGVvZiByZWNlaXZlciAhPT0gXCJmdW5jdGlvblwiKSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCB1c2UgJ2luJyBvcGVyYXRvciBvbiBub24tb2JqZWN0XCIpO1xuICByZXR1cm4gdHlwZW9mIHN0YXRlID09PSBcImZ1bmN0aW9uXCIgPyByZWNlaXZlciA9PT0gc3RhdGUgOiBzdGF0ZS5oYXMocmVjZWl2ZXIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gX19hZGREaXNwb3NhYmxlUmVzb3VyY2UoZW52LCB2YWx1ZSwgYXN5bmMpIHtcbiAgaWYgKHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSB2b2lkIDApIHtcbiAgICBpZiAodHlwZW9mIHZhbHVlICE9PSBcIm9iamVjdFwiICYmIHR5cGVvZiB2YWx1ZSAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiT2JqZWN0IGV4cGVjdGVkLlwiKTtcbiAgICB2YXIgZGlzcG9zZTtcbiAgICBpZiAoYXN5bmMpIHtcbiAgICAgICAgaWYgKCFTeW1ib2wuYXN5bmNEaXNwb3NlKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3ltYm9sLmFzeW5jRGlzcG9zZSBpcyBub3QgZGVmaW5lZC5cIik7XG4gICAgICAgIGRpc3Bvc2UgPSB2YWx1ZVtTeW1ib2wuYXN5bmNEaXNwb3NlXTtcbiAgICB9XG4gICAgaWYgKGRpc3Bvc2UgPT09IHZvaWQgMCkge1xuICAgICAgICBpZiAoIVN5bWJvbC5kaXNwb3NlKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3ltYm9sLmRpc3Bvc2UgaXMgbm90IGRlZmluZWQuXCIpO1xuICAgICAgICBkaXNwb3NlID0gdmFsdWVbU3ltYm9sLmRpc3Bvc2VdO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIGRpc3Bvc2UgIT09IFwiZnVuY3Rpb25cIikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdCBub3QgZGlzcG9zYWJsZS5cIik7XG4gICAgZW52LnN0YWNrLnB1c2goeyB2YWx1ZTogdmFsdWUsIGRpc3Bvc2U6IGRpc3Bvc2UsIGFzeW5jOiBhc3luYyB9KTtcbiAgfVxuICBlbHNlIGlmIChhc3luYykge1xuICAgIGVudi5zdGFjay5wdXNoKHsgYXN5bmM6IHRydWUgfSk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG52YXIgX1N1cHByZXNzZWRFcnJvciA9IHR5cGVvZiBTdXBwcmVzc2VkRXJyb3IgPT09IFwiZnVuY3Rpb25cIiA/IFN1cHByZXNzZWRFcnJvciA6IGZ1bmN0aW9uIChlcnJvciwgc3VwcHJlc3NlZCwgbWVzc2FnZSkge1xuICB2YXIgZSA9IG5ldyBFcnJvcihtZXNzYWdlKTtcbiAgcmV0dXJuIGUubmFtZSA9IFwiU3VwcHJlc3NlZEVycm9yXCIsIGUuZXJyb3IgPSBlcnJvciwgZS5zdXBwcmVzc2VkID0gc3VwcHJlc3NlZCwgZTtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBfX2Rpc3Bvc2VSZXNvdXJjZXMoZW52KSB7XG4gIGZ1bmN0aW9uIGZhaWwoZSkge1xuICAgIGVudi5lcnJvciA9IGVudi5oYXNFcnJvciA/IG5ldyBfU3VwcHJlc3NlZEVycm9yKGUsIGVudi5lcnJvciwgXCJBbiBlcnJvciB3YXMgc3VwcHJlc3NlZCBkdXJpbmcgZGlzcG9zYWwuXCIpIDogZTtcbiAgICBlbnYuaGFzRXJyb3IgPSB0cnVlO1xuICB9XG4gIGZ1bmN0aW9uIG5leHQoKSB7XG4gICAgd2hpbGUgKGVudi5zdGFjay5sZW5ndGgpIHtcbiAgICAgIHZhciByZWMgPSBlbnYuc3RhY2sucG9wKCk7XG4gICAgICB0cnkge1xuICAgICAgICB2YXIgcmVzdWx0ID0gcmVjLmRpc3Bvc2UgJiYgcmVjLmRpc3Bvc2UuY2FsbChyZWMudmFsdWUpO1xuICAgICAgICBpZiAocmVjLmFzeW5jKSByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHJlc3VsdCkudGhlbihuZXh0LCBmdW5jdGlvbihlKSB7IGZhaWwoZSk7IHJldHVybiBuZXh0KCk7IH0pO1xuICAgICAgfVxuICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICBmYWlsKGUpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoZW52Lmhhc0Vycm9yKSB0aHJvdyBlbnYuZXJyb3I7XG4gIH1cbiAgcmV0dXJuIG5leHQoKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQge1xuICBfX2V4dGVuZHMsXG4gIF9fYXNzaWduLFxuICBfX3Jlc3QsXG4gIF9fZGVjb3JhdGUsXG4gIF9fcGFyYW0sXG4gIF9fbWV0YWRhdGEsXG4gIF9fYXdhaXRlcixcbiAgX19nZW5lcmF0b3IsXG4gIF9fY3JlYXRlQmluZGluZyxcbiAgX19leHBvcnRTdGFyLFxuICBfX3ZhbHVlcyxcbiAgX19yZWFkLFxuICBfX3NwcmVhZCxcbiAgX19zcHJlYWRBcnJheXMsXG4gIF9fc3ByZWFkQXJyYXksXG4gIF9fYXdhaXQsXG4gIF9fYXN5bmNHZW5lcmF0b3IsXG4gIF9fYXN5bmNEZWxlZ2F0b3IsXG4gIF9fYXN5bmNWYWx1ZXMsXG4gIF9fbWFrZVRlbXBsYXRlT2JqZWN0LFxuICBfX2ltcG9ydFN0YXIsXG4gIF9faW1wb3J0RGVmYXVsdCxcbiAgX19jbGFzc1ByaXZhdGVGaWVsZEdldCxcbiAgX19jbGFzc1ByaXZhdGVGaWVsZFNldCxcbiAgX19jbGFzc1ByaXZhdGVGaWVsZEluLFxuICBfX2FkZERpc3Bvc2FibGVSZXNvdXJjZSxcbiAgX19kaXNwb3NlUmVzb3VyY2VzLFxufTtcbiIsIi8vIFRoZSBtb2R1bGUgY2FjaGVcbnZhciBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX18gPSB7fTtcblxuLy8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbmZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG5cdHZhciBjYWNoZWRNb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdO1xuXHRpZiAoY2FjaGVkTW9kdWxlICE9PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4gY2FjaGVkTW9kdWxlLmV4cG9ydHM7XG5cdH1cblx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcblx0dmFyIG1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0gPSB7XG5cdFx0Ly8gbm8gbW9kdWxlLmlkIG5lZWRlZFxuXHRcdC8vIG5vIG1vZHVsZS5sb2FkZWQgbmVlZGVkXG5cdFx0ZXhwb3J0czoge31cblx0fTtcblxuXHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cblx0X193ZWJwYWNrX21vZHVsZXNfX1ttb2R1bGVJZF0obW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cblx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcblx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xufVxuXG4iLCIvLyBnZXREZWZhdWx0RXhwb3J0IGZ1bmN0aW9uIGZvciBjb21wYXRpYmlsaXR5IHdpdGggbm9uLWhhcm1vbnkgbW9kdWxlc1xuX193ZWJwYWNrX3JlcXVpcmVfXy5uID0gKG1vZHVsZSkgPT4ge1xuXHR2YXIgZ2V0dGVyID0gbW9kdWxlICYmIG1vZHVsZS5fX2VzTW9kdWxlID9cblx0XHQoKSA9PiAobW9kdWxlWydkZWZhdWx0J10pIDpcblx0XHQoKSA9PiAobW9kdWxlKTtcblx0X193ZWJwYWNrX3JlcXVpcmVfXy5kKGdldHRlciwgeyBhOiBnZXR0ZXIgfSk7XG5cdHJldHVybiBnZXR0ZXI7XG59OyIsIi8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb25zIGZvciBoYXJtb255IGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uZCA9IChleHBvcnRzLCBkZWZpbml0aW9uKSA9PiB7XG5cdGZvcih2YXIga2V5IGluIGRlZmluaXRpb24pIHtcblx0XHRpZihfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZGVmaW5pdGlvbiwga2V5KSAmJiAhX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIGtleSkpIHtcblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBrZXksIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBkZWZpbml0aW9uW2tleV0gfSk7XG5cdFx0fVxuXHR9XG59OyIsIl9fd2VicGFja19yZXF1aXJlX18uZyA9IChmdW5jdGlvbigpIHtcblx0aWYgKHR5cGVvZiBnbG9iYWxUaGlzID09PSAnb2JqZWN0JykgcmV0dXJuIGdsb2JhbFRoaXM7XG5cdHRyeSB7XG5cdFx0cmV0dXJuIHRoaXMgfHwgbmV3IEZ1bmN0aW9uKCdyZXR1cm4gdGhpcycpKCk7XG5cdH0gY2F0Y2ggKGUpIHtcblx0XHRpZiAodHlwZW9mIHdpbmRvdyA9PT0gJ29iamVjdCcpIHJldHVybiB3aW5kb3c7XG5cdH1cbn0pKCk7IiwiX193ZWJwYWNrX3JlcXVpcmVfXy5vID0gKG9iaiwgcHJvcCkgPT4gKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApKSIsIi8vIGRlZmluZSBfX2VzTW9kdWxlIG9uIGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uciA9IChleHBvcnRzKSA9PiB7XG5cdGlmKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1N0cmluZ1RhZykge1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBTeW1ib2wudG9TdHJpbmdUYWcsIHsgdmFsdWU6ICdNb2R1bGUnIH0pO1xuXHR9XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG59OyIsImltcG9ydCAqIGFzIHBvc3RQcm9jZXNzIGZyb20gXCJAbHRzL3Bvc3QtcHJvY2Vzc2VzL2xlZ2FjeS9sZWdhY3lcIjtcclxuZXhwb3J0IHsgcG9zdFByb2Nlc3MgfTtcclxuZXhwb3J0IGRlZmF1bHQgcG9zdFByb2Nlc3M7XHJcbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==