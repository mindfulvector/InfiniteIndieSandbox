(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("babylonjs"));
	else if(typeof define === 'function' && define.amd)
		define("babylonjs-materials", ["babylonjs"], factory);
	else if(typeof exports === 'object')
		exports["babylonjs-materials"] = factory(require("babylonjs"));
	else
		root["MATERIALS"] = factory(root["BABYLON"]);
})((typeof self !== "undefined" ? self : typeof global !== "undefined" ? global : this), (__WEBPACK_EXTERNAL_MODULE_babylonjs_Materials_effect__) => {
return /******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "../../../dev/materials/src/custom/customMaterial.ts":
/*!***********************************************************!*\
  !*** ../../../dev/materials/src/custom/customMaterial.ts ***!
  \***********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CustomMaterial: () => (/* binding */ CustomMaterial),
/* harmony export */   CustomShaderStructure: () => (/* binding */ CustomShaderStructure),
/* harmony export */   ShaderSpecialParts: () => (/* binding */ ShaderSpecialParts)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! tslib */ "../../../../node_modules/tslib/tslib.es6.mjs");
/* harmony import */ var babylonjs_Materials_effect__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! babylonjs/Maths/math.color */ "babylonjs/Materials/effect");
/* harmony import */ var babylonjs_Materials_effect__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(babylonjs_Materials_effect__WEBPACK_IMPORTED_MODULE_0__);





var CustomShaderStructure = /** @class */ (function () {
    function CustomShaderStructure() {
    }
    return CustomShaderStructure;
}());

var ShaderSpecialParts = /** @class */ (function () {
    function ShaderSpecialParts() {
    }
    return ShaderSpecialParts;
}());

var CustomMaterial = /** @class */ (function (_super) {
    (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__extends)(CustomMaterial, _super);
    function CustomMaterial(name, scene) {
        var _this = _super.call(this, name, scene) || this;
        _this.CustomParts = new ShaderSpecialParts();
        _this.customShaderNameResolve = _this.Builder;
        _this.FragmentShader = babylonjs_Materials_effect__WEBPACK_IMPORTED_MODULE_0__.Effect.ShadersStore["defaultPixelShader"];
        _this.VertexShader = babylonjs_Materials_effect__WEBPACK_IMPORTED_MODULE_0__.Effect.ShadersStore["defaultVertexShader"];
        return _this;
    }
    CustomMaterial.prototype.AttachAfterBind = function (mesh, effect) {
        if (this._newUniformInstances) {
            for (var el in this._newUniformInstances) {
                var ea = el.toString().split("-");
                if (ea[0] == "vec2") {
                    effect.setVector2(ea[1], this._newUniformInstances[el]);
                }
                else if (ea[0] == "vec3") {
                    if (this._newUniformInstances[el] instanceof babylonjs_Materials_effect__WEBPACK_IMPORTED_MODULE_0__.Color3) {
                        effect.setColor3(ea[1], this._newUniformInstances[el]);
                    }
                    else {
                        effect.setVector3(ea[1], this._newUniformInstances[el]);
                    }
                }
                else if (ea[0] == "vec4") {
                    if (this._newUniformInstances[el] instanceof babylonjs_Materials_effect__WEBPACK_IMPORTED_MODULE_0__.Color4) {
                        effect.setDirectColor4(ea[1], this._newUniformInstances[el]);
                    }
                    else {
                        effect.setVector4(ea[1], this._newUniformInstances[el]);
                    }
                    effect.setVector4(ea[1], this._newUniformInstances[el]);
                }
                else if (ea[0] == "mat4") {
                    effect.setMatrix(ea[1], this._newUniformInstances[el]);
                }
                else if (ea[0] == "float") {
                    effect.setFloat(ea[1], this._newUniformInstances[el]);
                }
            }
        }
        if (this._newSamplerInstances) {
            for (var el in this._newSamplerInstances) {
                var ea = el.toString().split("-");
                if (ea[0] == "sampler2D" && this._newSamplerInstances[el].isReady && this._newSamplerInstances[el].isReady()) {
                    effect.setTexture(ea[1], this._newSamplerInstances[el]);
                }
            }
        }
    };
    CustomMaterial.prototype.ReviewUniform = function (name, arr) {
        if (name == "uniform" && this._newUniforms) {
            for (var ind = 0; ind < this._newUniforms.length; ind++) {
                if (this._customUniform[ind].indexOf("sampler") == -1) {
                    arr.push(this._newUniforms[ind].replace(/\[\d*\]/g, ""));
                }
            }
        }
        if (name == "sampler" && this._newUniforms) {
            for (var ind = 0; ind < this._newUniforms.length; ind++) {
                if (this._customUniform[ind].indexOf("sampler") != -1) {
                    arr.push(this._newUniforms[ind].replace(/\[\d*\]/g, ""));
                }
            }
        }
        return arr;
    };
    CustomMaterial.prototype.Builder = function (shaderName, uniforms, uniformBuffers, samplers, defines, attributes) {
        var _this = this;
        if (attributes && this._customAttributes && this._customAttributes.length > 0) {
            attributes.push.apply(attributes, this._customAttributes);
        }
        this.ReviewUniform("uniform", uniforms);
        this.ReviewUniform("sampler", samplers);
        if (this._isCreatedShader) {
            return this._createdShaderName;
        }
        this._isCreatedShader = false;
        CustomMaterial.ShaderIndexer++;
        var name = "custom_" + CustomMaterial.ShaderIndexer;
        var fn_afterBind = this._afterBind.bind(this);
        this._afterBind = function (m, e) {
            if (!e) {
                return;
            }
            _this.AttachAfterBind(m, e);
            try {
                fn_afterBind(m, e);
            }
            catch (e) { }
        };
        babylonjs_Materials_effect__WEBPACK_IMPORTED_MODULE_0__.Effect.ShadersStore[name + "VertexShader"] = this.VertexShader.replace("#define CUSTOM_VERTEX_BEGIN", this.CustomParts.Vertex_Begin ? this.CustomParts.Vertex_Begin : "")
            .replace("#define CUSTOM_VERTEX_DEFINITIONS", (this._customUniform ? this._customUniform.join("\n") : "") + (this.CustomParts.Vertex_Definitions ? this.CustomParts.Vertex_Definitions : ""))
            .replace("#define CUSTOM_VERTEX_MAIN_BEGIN", this.CustomParts.Vertex_MainBegin ? this.CustomParts.Vertex_MainBegin : "")
            .replace("#define CUSTOM_VERTEX_UPDATE_POSITION", this.CustomParts.Vertex_Before_PositionUpdated ? this.CustomParts.Vertex_Before_PositionUpdated : "")
            .replace("#define CUSTOM_VERTEX_UPDATE_NORMAL", this.CustomParts.Vertex_Before_NormalUpdated ? this.CustomParts.Vertex_Before_NormalUpdated : "")
            .replace("#define CUSTOM_VERTEX_MAIN_END", this.CustomParts.Vertex_MainEnd ? this.CustomParts.Vertex_MainEnd : "");
        if (this.CustomParts.Vertex_After_WorldPosComputed) {
            babylonjs_Materials_effect__WEBPACK_IMPORTED_MODULE_0__.Effect.ShadersStore[name + "VertexShader"] = babylonjs_Materials_effect__WEBPACK_IMPORTED_MODULE_0__.Effect.ShadersStore[name + "VertexShader"].replace("#define CUSTOM_VERTEX_UPDATE_WORLDPOS", this.CustomParts.Vertex_After_WorldPosComputed);
        }
        babylonjs_Materials_effect__WEBPACK_IMPORTED_MODULE_0__.Effect.ShadersStore[name + "PixelShader"] = this.FragmentShader.replace("#define CUSTOM_FRAGMENT_BEGIN", this.CustomParts.Fragment_Begin ? this.CustomParts.Fragment_Begin : "")
            .replace("#define CUSTOM_FRAGMENT_MAIN_BEGIN", this.CustomParts.Fragment_MainBegin ? this.CustomParts.Fragment_MainBegin : "")
            .replace("#define CUSTOM_FRAGMENT_DEFINITIONS", (this._customUniform ? this._customUniform.join("\n") : "") + (this.CustomParts.Fragment_Definitions ? this.CustomParts.Fragment_Definitions : ""))
            .replace("#define CUSTOM_FRAGMENT_UPDATE_DIFFUSE", this.CustomParts.Fragment_Custom_Diffuse ? this.CustomParts.Fragment_Custom_Diffuse : "")
            .replace("#define CUSTOM_FRAGMENT_UPDATE_ALPHA", this.CustomParts.Fragment_Custom_Alpha ? this.CustomParts.Fragment_Custom_Alpha : "")
            .replace("#define CUSTOM_FRAGMENT_BEFORE_LIGHTS", this.CustomParts.Fragment_Before_Lights ? this.CustomParts.Fragment_Before_Lights : "")
            .replace("#define CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR", this.CustomParts.Fragment_Before_FragColor ? this.CustomParts.Fragment_Before_FragColor : "")
            .replace("#define CUSTOM_FRAGMENT_MAIN_END", this.CustomParts.Fragment_MainEnd ? this.CustomParts.Fragment_MainEnd : "");
        if (this.CustomParts.Fragment_Before_Fog) {
            babylonjs_Materials_effect__WEBPACK_IMPORTED_MODULE_0__.Effect.ShadersStore[name + "PixelShader"] = babylonjs_Materials_effect__WEBPACK_IMPORTED_MODULE_0__.Effect.ShadersStore[name + "PixelShader"].replace("#define CUSTOM_FRAGMENT_BEFORE_FOG", this.CustomParts.Fragment_Before_Fog);
        }
        this._isCreatedShader = true;
        this._createdShaderName = name;
        return name;
    };
    CustomMaterial.prototype.AddUniform = function (name, kind, param) {
        if (!this._customUniform) {
            this._customUniform = new Array();
            this._newUniforms = new Array();
            this._newSamplerInstances = {};
            this._newUniformInstances = {};
        }
        if (param) {
            if (kind.indexOf("sampler") != -1) {
                this._newSamplerInstances[kind + "-" + name] = param;
            }
            else {
                this._newUniformInstances[kind + "-" + name] = param;
            }
        }
        this._customUniform.push("uniform " + kind + " " + name + ";");
        this._newUniforms.push(name);
        return this;
    };
    CustomMaterial.prototype.AddAttribute = function (name) {
        if (!this._customAttributes) {
            this._customAttributes = [];
        }
        this._customAttributes.push(name);
        return this;
    };
    CustomMaterial.prototype.Fragment_Begin = function (shaderPart) {
        this.CustomParts.Fragment_Begin = shaderPart;
        return this;
    };
    CustomMaterial.prototype.Fragment_Definitions = function (shaderPart) {
        this.CustomParts.Fragment_Definitions = shaderPart;
        return this;
    };
    CustomMaterial.prototype.Fragment_MainBegin = function (shaderPart) {
        this.CustomParts.Fragment_MainBegin = shaderPart;
        return this;
    };
    CustomMaterial.prototype.Fragment_MainEnd = function (shaderPart) {
        this.CustomParts.Fragment_MainEnd = shaderPart;
        return this;
    };
    CustomMaterial.prototype.Fragment_Custom_Diffuse = function (shaderPart) {
        this.CustomParts.Fragment_Custom_Diffuse = shaderPart.replace("result", "diffuseColor");
        return this;
    };
    CustomMaterial.prototype.Fragment_Custom_Alpha = function (shaderPart) {
        this.CustomParts.Fragment_Custom_Alpha = shaderPart.replace("result", "alpha");
        return this;
    };
    CustomMaterial.prototype.Fragment_Before_Lights = function (shaderPart) {
        this.CustomParts.Fragment_Before_Lights = shaderPart;
        return this;
    };
    CustomMaterial.prototype.Fragment_Before_Fog = function (shaderPart) {
        this.CustomParts.Fragment_Before_Fog = shaderPart;
        return this;
    };
    CustomMaterial.prototype.Fragment_Before_FragColor = function (shaderPart) {
        this.CustomParts.Fragment_Before_FragColor = shaderPart.replace("result", "color");
        return this;
    };
    CustomMaterial.prototype.Vertex_Begin = function (shaderPart) {
        this.CustomParts.Vertex_Begin = shaderPart;
        return this;
    };
    CustomMaterial.prototype.Vertex_Definitions = function (shaderPart) {
        this.CustomParts.Vertex_Definitions = shaderPart;
        return this;
    };
    CustomMaterial.prototype.Vertex_MainBegin = function (shaderPart) {
        this.CustomParts.Vertex_MainBegin = shaderPart;
        return this;
    };
    CustomMaterial.prototype.Vertex_Before_PositionUpdated = function (shaderPart) {
        this.CustomParts.Vertex_Before_PositionUpdated = shaderPart.replace("result", "positionUpdated");
        return this;
    };
    CustomMaterial.prototype.Vertex_Before_NormalUpdated = function (shaderPart) {
        this.CustomParts.Vertex_Before_NormalUpdated = shaderPart.replace("result", "normalUpdated");
        return this;
    };
    CustomMaterial.prototype.Vertex_After_WorldPosComputed = function (shaderPart) {
        this.CustomParts.Vertex_After_WorldPosComputed = shaderPart;
        return this;
    };
    CustomMaterial.prototype.Vertex_MainEnd = function (shaderPart) {
        this.CustomParts.Vertex_MainEnd = shaderPart;
        return this;
    };
    CustomMaterial.ShaderIndexer = 1;
    return CustomMaterial;
}(babylonjs_Materials_effect__WEBPACK_IMPORTED_MODULE_0__.StandardMaterial));
(0,babylonjs_Materials_effect__WEBPACK_IMPORTED_MODULE_0__.RegisterClass)("BABYLON.CustomMaterial", CustomMaterial);


/***/ }),

/***/ "../../../dev/materials/src/custom/index.ts":
/*!**************************************************!*\
  !*** ../../../dev/materials/src/custom/index.ts ***!
  \**************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CustomMaterial: () => (/* reexport safe */ _customMaterial__WEBPACK_IMPORTED_MODULE_0__.CustomMaterial),
/* harmony export */   CustomShaderStructure: () => (/* reexport safe */ _customMaterial__WEBPACK_IMPORTED_MODULE_0__.CustomShaderStructure),
/* harmony export */   PBRCustomMaterial: () => (/* reexport safe */ _pbrCustomMaterial__WEBPACK_IMPORTED_MODULE_1__.PBRCustomMaterial),
/* harmony export */   ShaderAlbedoParts: () => (/* reexport safe */ _pbrCustomMaterial__WEBPACK_IMPORTED_MODULE_1__.ShaderAlbedoParts),
/* harmony export */   ShaderAlebdoParts: () => (/* reexport safe */ _pbrCustomMaterial__WEBPACK_IMPORTED_MODULE_1__.ShaderAlebdoParts),
/* harmony export */   ShaderSpecialParts: () => (/* reexport safe */ _customMaterial__WEBPACK_IMPORTED_MODULE_0__.ShaderSpecialParts)
/* harmony export */ });
/* harmony import */ var _customMaterial__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./customMaterial */ "../../../dev/materials/src/custom/customMaterial.ts");
/* harmony import */ var _pbrCustomMaterial__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./pbrCustomMaterial */ "../../../dev/materials/src/custom/pbrCustomMaterial.ts");




/***/ }),

/***/ "../../../dev/materials/src/custom/pbrCustomMaterial.ts":
/*!**************************************************************!*\
  !*** ../../../dev/materials/src/custom/pbrCustomMaterial.ts ***!
  \**************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   PBRCustomMaterial: () => (/* binding */ PBRCustomMaterial),
/* harmony export */   ShaderAlbedoParts: () => (/* binding */ ShaderAlbedoParts),
/* harmony export */   ShaderAlebdoParts: () => (/* binding */ ShaderAlebdoParts)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! tslib */ "../../../../node_modules/tslib/tslib.es6.mjs");
/* harmony import */ var babylonjs_Materials_effect__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! babylonjs/Maths/math.color */ "babylonjs/Materials/effect");
/* harmony import */ var babylonjs_Materials_effect__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(babylonjs_Materials_effect__WEBPACK_IMPORTED_MODULE_0__);






var ShaderAlbedoParts = /** @class */ (function () {
    function ShaderAlbedoParts() {
    }
    return ShaderAlbedoParts;
}());

/**
 * @deprecated use ShaderAlbedoParts instead.
 */
var ShaderAlebdoParts = ShaderAlbedoParts;
var PBRCustomMaterial = /** @class */ (function (_super) {
    (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__extends)(PBRCustomMaterial, _super);
    function PBRCustomMaterial(name, scene) {
        var _this = _super.call(this, name, scene) || this;
        _this.CustomParts = new ShaderAlbedoParts();
        _this.customShaderNameResolve = _this.Builder;
        _this.FragmentShader = babylonjs_Materials_effect__WEBPACK_IMPORTED_MODULE_0__.Effect.ShadersStore["pbrPixelShader"];
        _this.VertexShader = babylonjs_Materials_effect__WEBPACK_IMPORTED_MODULE_0__.Effect.ShadersStore["pbrVertexShader"];
        _this.FragmentShader = _this.FragmentShader.replace(/#include<pbrBlockAlbedoOpacity>/g, babylonjs_Materials_effect__WEBPACK_IMPORTED_MODULE_0__.Effect.IncludesShadersStore["pbrBlockAlbedoOpacity"]);
        _this.FragmentShader = _this.FragmentShader.replace(/#include<pbrBlockReflectivity>/g, babylonjs_Materials_effect__WEBPACK_IMPORTED_MODULE_0__.Effect.IncludesShadersStore["pbrBlockReflectivity"]);
        _this.FragmentShader = _this.FragmentShader.replace(/#include<pbrBlockFinalColorComposition>/g, babylonjs_Materials_effect__WEBPACK_IMPORTED_MODULE_0__.Effect.IncludesShadersStore["pbrBlockFinalColorComposition"]);
        return _this;
    }
    PBRCustomMaterial.prototype.AttachAfterBind = function (mesh, effect) {
        if (this._newUniformInstances) {
            for (var el in this._newUniformInstances) {
                var ea = el.toString().split("-");
                if (ea[0] == "vec2") {
                    effect.setVector2(ea[1], this._newUniformInstances[el]);
                }
                else if (ea[0] == "vec3") {
                    if (this._newUniformInstances[el] instanceof babylonjs_Materials_effect__WEBPACK_IMPORTED_MODULE_0__.Color3) {
                        effect.setColor3(ea[1], this._newUniformInstances[el]);
                    }
                    else {
                        effect.setVector3(ea[1], this._newUniformInstances[el]);
                    }
                }
                else if (ea[0] == "vec4") {
                    if (this._newUniformInstances[el] instanceof babylonjs_Materials_effect__WEBPACK_IMPORTED_MODULE_0__.Color4) {
                        effect.setDirectColor4(ea[1], this._newUniformInstances[el]);
                    }
                    else {
                        effect.setVector4(ea[1], this._newUniformInstances[el]);
                    }
                    effect.setVector4(ea[1], this._newUniformInstances[el]);
                }
                else if (ea[0] == "mat4") {
                    effect.setMatrix(ea[1], this._newUniformInstances[el]);
                }
                else if (ea[0] == "float") {
                    effect.setFloat(ea[1], this._newUniformInstances[el]);
                }
            }
        }
        if (this._newSamplerInstances) {
            for (var el in this._newSamplerInstances) {
                var ea = el.toString().split("-");
                if (ea[0] == "sampler2D" && this._newSamplerInstances[el].isReady && this._newSamplerInstances[el].isReady()) {
                    effect.setTexture(ea[1], this._newSamplerInstances[el]);
                }
            }
        }
    };
    PBRCustomMaterial.prototype.ReviewUniform = function (name, arr) {
        if (name == "uniform" && this._newUniforms) {
            for (var ind = 0; ind < this._newUniforms.length; ind++) {
                if (this._customUniform[ind].indexOf("sampler") == -1) {
                    arr.push(this._newUniforms[ind].replace(/\[\d*\]/g, ""));
                }
            }
        }
        if (name == "sampler" && this._newUniforms) {
            for (var ind = 0; ind < this._newUniforms.length; ind++) {
                if (this._customUniform[ind].indexOf("sampler") != -1) {
                    arr.push(this._newUniforms[ind].replace(/\[\d*\]/g, ""));
                }
            }
        }
        return arr;
    };
    PBRCustomMaterial.prototype.Builder = function (shaderName, uniforms, uniformBuffers, samplers, defines, attributes, options) {
        var _this = this;
        if (options) {
            var currentProcessing_1 = options.processFinalCode;
            options.processFinalCode = function (type, code) {
                if (type === "vertex") {
                    return currentProcessing_1 ? currentProcessing_1(type, code) : code;
                }
                var sci = new babylonjs_Materials_effect__WEBPACK_IMPORTED_MODULE_0__.ShaderCodeInliner(code);
                sci.inlineToken = "#define pbr_inline";
                sci.processCode();
                return currentProcessing_1 ? currentProcessing_1(type, sci.code) : sci.code;
            };
        }
        if (attributes && this._customAttributes && this._customAttributes.length > 0) {
            attributes.push.apply(attributes, this._customAttributes);
        }
        this.ReviewUniform("uniform", uniforms);
        this.ReviewUniform("sampler", samplers);
        if (this._isCreatedShader) {
            return this._createdShaderName;
        }
        this._isCreatedShader = false;
        PBRCustomMaterial.ShaderIndexer++;
        var name = "custom_" + PBRCustomMaterial.ShaderIndexer;
        var fn_afterBind = this._afterBind.bind(this);
        this._afterBind = function (m, e) {
            if (!e) {
                return;
            }
            _this.AttachAfterBind(m, e);
            try {
                fn_afterBind(m, e);
            }
            catch (e) { }
        };
        babylonjs_Materials_effect__WEBPACK_IMPORTED_MODULE_0__.Effect.ShadersStore[name + "VertexShader"] = this.VertexShader.replace("#define CUSTOM_VERTEX_BEGIN", this.CustomParts.Vertex_Begin ? this.CustomParts.Vertex_Begin : "")
            .replace("#define CUSTOM_VERTEX_DEFINITIONS", (this._customUniform ? this._customUniform.join("\n") : "") + (this.CustomParts.Vertex_Definitions ? this.CustomParts.Vertex_Definitions : ""))
            .replace("#define CUSTOM_VERTEX_MAIN_BEGIN", this.CustomParts.Vertex_MainBegin ? this.CustomParts.Vertex_MainBegin : "")
            .replace("#define CUSTOM_VERTEX_UPDATE_POSITION", this.CustomParts.Vertex_Before_PositionUpdated ? this.CustomParts.Vertex_Before_PositionUpdated : "")
            .replace("#define CUSTOM_VERTEX_UPDATE_NORMAL", this.CustomParts.Vertex_Before_NormalUpdated ? this.CustomParts.Vertex_Before_NormalUpdated : "")
            .replace("#define CUSTOM_VERTEX_MAIN_END", this.CustomParts.Vertex_MainEnd ? this.CustomParts.Vertex_MainEnd : "");
        if (this.CustomParts.Vertex_After_WorldPosComputed) {
            babylonjs_Materials_effect__WEBPACK_IMPORTED_MODULE_0__.Effect.ShadersStore[name + "VertexShader"] = babylonjs_Materials_effect__WEBPACK_IMPORTED_MODULE_0__.Effect.ShadersStore[name + "VertexShader"].replace("#define CUSTOM_VERTEX_UPDATE_WORLDPOS", this.CustomParts.Vertex_After_WorldPosComputed);
        }
        babylonjs_Materials_effect__WEBPACK_IMPORTED_MODULE_0__.Effect.ShadersStore[name + "PixelShader"] = this.FragmentShader.replace("#define CUSTOM_FRAGMENT_BEGIN", this.CustomParts.Fragment_Begin ? this.CustomParts.Fragment_Begin : "")
            .replace("#define CUSTOM_FRAGMENT_MAIN_BEGIN", this.CustomParts.Fragment_MainBegin ? this.CustomParts.Fragment_MainBegin : "")
            .replace("#define CUSTOM_FRAGMENT_DEFINITIONS", (this._customUniform ? this._customUniform.join("\n") : "") + (this.CustomParts.Fragment_Definitions ? this.CustomParts.Fragment_Definitions : ""))
            .replace("#define CUSTOM_FRAGMENT_UPDATE_ALBEDO", this.CustomParts.Fragment_Custom_Albedo ? this.CustomParts.Fragment_Custom_Albedo : "")
            .replace("#define CUSTOM_FRAGMENT_UPDATE_ALPHA", this.CustomParts.Fragment_Custom_Alpha ? this.CustomParts.Fragment_Custom_Alpha : "")
            .replace("#define CUSTOM_FRAGMENT_BEFORE_LIGHTS", this.CustomParts.Fragment_Before_Lights ? this.CustomParts.Fragment_Before_Lights : "")
            .replace("#define CUSTOM_FRAGMENT_UPDATE_METALLICROUGHNESS", this.CustomParts.Fragment_Custom_MetallicRoughness ? this.CustomParts.Fragment_Custom_MetallicRoughness : "")
            .replace("#define CUSTOM_FRAGMENT_UPDATE_MICROSURFACE", this.CustomParts.Fragment_Custom_MicroSurface ? this.CustomParts.Fragment_Custom_MicroSurface : "")
            .replace("#define CUSTOM_FRAGMENT_BEFORE_FINALCOLORCOMPOSITION", this.CustomParts.Fragment_Before_FinalColorComposition ? this.CustomParts.Fragment_Before_FinalColorComposition : "")
            .replace("#define CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR", this.CustomParts.Fragment_Before_FragColor ? this.CustomParts.Fragment_Before_FragColor : "")
            .replace("#define CUSTOM_FRAGMENT_MAIN_END", this.CustomParts.Fragment_MainEnd ? this.CustomParts.Fragment_MainEnd : "");
        if (this.CustomParts.Fragment_Before_Fog) {
            babylonjs_Materials_effect__WEBPACK_IMPORTED_MODULE_0__.Effect.ShadersStore[name + "PixelShader"] = babylonjs_Materials_effect__WEBPACK_IMPORTED_MODULE_0__.Effect.ShadersStore[name + "PixelShader"].replace("#define CUSTOM_FRAGMENT_BEFORE_FOG", this.CustomParts.Fragment_Before_Fog);
        }
        this._isCreatedShader = true;
        this._createdShaderName = name;
        return name;
    };
    PBRCustomMaterial.prototype.AddUniform = function (name, kind, param) {
        if (!this._customUniform) {
            this._customUniform = new Array();
            this._newUniforms = new Array();
            this._newSamplerInstances = {};
            this._newUniformInstances = {};
        }
        if (param) {
            if (kind.indexOf("sampler") != -1) {
                this._newSamplerInstances[kind + "-" + name] = param;
            }
            else {
                this._newUniformInstances[kind + "-" + name] = param;
            }
        }
        this._customUniform.push("uniform " + kind + " " + name + ";");
        this._newUniforms.push(name);
        return this;
    };
    PBRCustomMaterial.prototype.AddAttribute = function (name) {
        if (!this._customAttributes) {
            this._customAttributes = [];
        }
        this._customAttributes.push(name);
        return this;
    };
    PBRCustomMaterial.prototype.Fragment_Begin = function (shaderPart) {
        this.CustomParts.Fragment_Begin = shaderPart;
        return this;
    };
    PBRCustomMaterial.prototype.Fragment_Definitions = function (shaderPart) {
        this.CustomParts.Fragment_Definitions = shaderPart;
        return this;
    };
    PBRCustomMaterial.prototype.Fragment_MainBegin = function (shaderPart) {
        this.CustomParts.Fragment_MainBegin = shaderPart;
        return this;
    };
    PBRCustomMaterial.prototype.Fragment_Custom_Albedo = function (shaderPart) {
        this.CustomParts.Fragment_Custom_Albedo = shaderPart.replace("result", "surfaceAlbedo");
        return this;
    };
    PBRCustomMaterial.prototype.Fragment_Custom_Alpha = function (shaderPart) {
        this.CustomParts.Fragment_Custom_Alpha = shaderPart.replace("result", "alpha");
        return this;
    };
    PBRCustomMaterial.prototype.Fragment_Before_Lights = function (shaderPart) {
        this.CustomParts.Fragment_Before_Lights = shaderPart;
        return this;
    };
    PBRCustomMaterial.prototype.Fragment_Custom_MetallicRoughness = function (shaderPart) {
        this.CustomParts.Fragment_Custom_MetallicRoughness = shaderPart;
        return this;
    };
    PBRCustomMaterial.prototype.Fragment_Custom_MicroSurface = function (shaderPart) {
        this.CustomParts.Fragment_Custom_MicroSurface = shaderPart;
        return this;
    };
    PBRCustomMaterial.prototype.Fragment_Before_Fog = function (shaderPart) {
        this.CustomParts.Fragment_Before_Fog = shaderPart;
        return this;
    };
    PBRCustomMaterial.prototype.Fragment_Before_FinalColorComposition = function (shaderPart) {
        this.CustomParts.Fragment_Before_FinalColorComposition = shaderPart;
        return this;
    };
    PBRCustomMaterial.prototype.Fragment_Before_FragColor = function (shaderPart) {
        this.CustomParts.Fragment_Before_FragColor = shaderPart.replace("result", "color");
        return this;
    };
    PBRCustomMaterial.prototype.Fragment_MainEnd = function (shaderPart) {
        this.CustomParts.Fragment_MainEnd = shaderPart;
        return this;
    };
    PBRCustomMaterial.prototype.Vertex_Begin = function (shaderPart) {
        this.CustomParts.Vertex_Begin = shaderPart;
        return this;
    };
    PBRCustomMaterial.prototype.Vertex_Definitions = function (shaderPart) {
        this.CustomParts.Vertex_Definitions = shaderPart;
        return this;
    };
    PBRCustomMaterial.prototype.Vertex_MainBegin = function (shaderPart) {
        this.CustomParts.Vertex_MainBegin = shaderPart;
        return this;
    };
    PBRCustomMaterial.prototype.Vertex_Before_PositionUpdated = function (shaderPart) {
        this.CustomParts.Vertex_Before_PositionUpdated = shaderPart.replace("result", "positionUpdated");
        return this;
    };
    PBRCustomMaterial.prototype.Vertex_Before_NormalUpdated = function (shaderPart) {
        this.CustomParts.Vertex_Before_NormalUpdated = shaderPart.replace("result", "normalUpdated");
        return this;
    };
    PBRCustomMaterial.prototype.Vertex_After_WorldPosComputed = function (shaderPart) {
        this.CustomParts.Vertex_After_WorldPosComputed = shaderPart;
        return this;
    };
    PBRCustomMaterial.prototype.Vertex_MainEnd = function (shaderPart) {
        this.CustomParts.Vertex_MainEnd = shaderPart;
        return this;
    };
    PBRCustomMaterial.ShaderIndexer = 1;
    return PBRCustomMaterial;
}(babylonjs_Materials_effect__WEBPACK_IMPORTED_MODULE_0__.PBRMaterial));
(0,babylonjs_Materials_effect__WEBPACK_IMPORTED_MODULE_0__.RegisterClass)("BABYLON.PBRCustomMaterial", PBRCustomMaterial);


/***/ }),

/***/ "../../../lts/materials/src/legacy/legacy-custom.ts":
/*!**********************************************************!*\
  !*** ../../../lts/materials/src/legacy/legacy-custom.ts ***!
  \**********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CustomMaterial: () => (/* reexport safe */ materials_custom_index__WEBPACK_IMPORTED_MODULE_0__.CustomMaterial),
/* harmony export */   CustomShaderStructure: () => (/* reexport safe */ materials_custom_index__WEBPACK_IMPORTED_MODULE_0__.CustomShaderStructure),
/* harmony export */   PBRCustomMaterial: () => (/* reexport safe */ materials_custom_index__WEBPACK_IMPORTED_MODULE_0__.PBRCustomMaterial),
/* harmony export */   ShaderAlbedoParts: () => (/* reexport safe */ materials_custom_index__WEBPACK_IMPORTED_MODULE_0__.ShaderAlbedoParts),
/* harmony export */   ShaderAlebdoParts: () => (/* reexport safe */ materials_custom_index__WEBPACK_IMPORTED_MODULE_0__.ShaderAlebdoParts),
/* harmony export */   ShaderSpecialParts: () => (/* reexport safe */ materials_custom_index__WEBPACK_IMPORTED_MODULE_0__.ShaderSpecialParts)
/* harmony export */ });
/* harmony import */ var materials_custom_index__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! materials/custom/index */ "../../../dev/materials/src/custom/index.ts");
/* eslint-disable import/no-internal-modules */

/**
 * This is the entry point for the UMD module.
 * The entry point for a future ESM package should be index.ts
 */
var globalObject = typeof __webpack_require__.g !== "undefined" ? __webpack_require__.g : typeof window !== "undefined" ? window : undefined;
if (typeof globalObject !== "undefined") {
    for (var key in materials_custom_index__WEBPACK_IMPORTED_MODULE_0__) {
        globalObject.BABYLON[key] = materials_custom_index__WEBPACK_IMPORTED_MODULE_0__[key];
    }
}



/***/ }),

/***/ "babylonjs/Materials/effect":
/*!****************************************************************************************************!*\
  !*** external {"root":"BABYLON","commonjs":"babylonjs","commonjs2":"babylonjs","amd":"babylonjs"} ***!
  \****************************************************************************************************/
/***/ ((module) => {

module.exports = __WEBPACK_EXTERNAL_MODULE_babylonjs_Materials_effect__;

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
/*!***********************!*\
  !*** ./src/custom.ts ***!
  \***********************/
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   materials: () => (/* reexport module object */ _lts_materials_legacy_legacy_custom__WEBPACK_IMPORTED_MODULE_0__)
/* harmony export */ });
/* harmony import */ var _lts_materials_legacy_legacy_custom__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @lts/materials/legacy/legacy-custom */ "../../../lts/materials/src/legacy/legacy-custom.ts");


/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (_lts_materials_legacy_legacy_custom__WEBPACK_IMPORTED_MODULE_0__);

})();

__webpack_exports__ = __webpack_exports__["default"];
/******/ 	return __webpack_exports__;
/******/ })()
;
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFieWxvbi5jdXN0b21NYXRlcmlhbC5qcyIsIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ1JBO0FBRUE7QUFHQTtBQUNBO0FBRUE7QUFJQTtBQUFBO0FBQ0E7QUFBQTs7QUFFQTtBQUNBO0FBQUE7QUFpQ0E7QUFBQTs7QUFFQTtBQUFBO0FBNElBO0FBQUE7QUFFQTtBQUNBO0FBRUE7QUFDQTs7QUFDQTtBQXJJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQUE7QUFDQTtBQUVBO0FBQ0E7QUFJQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFJQTtBQUVBO0FBSUE7QUFDQTtBQUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBSUE7QUFFQTtBQUNBO0FBRUE7QUFDQTtBQVdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUVBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQWhRQTtBQWlRQTtBQUFBO0FBRUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUN6VEE7QUFDQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDQ0E7QUFFQTtBQUdBO0FBQ0E7QUFFQTtBQUVBO0FBQ0E7QUFBQTtBQXVDQTtBQUFBOztBQUVBOztBQUVBO0FBQ0E7QUFFQTtBQUFBO0FBMEtBO0FBQUE7QUFFQTtBQUNBO0FBRUE7QUFDQTtBQUVBO0FBQ0E7QUFDQTs7QUFDQTtBQXZLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQUE7QUFTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQUE7QUFDQTtBQUVBO0FBQ0E7QUFJQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFJQTtBQUVBO0FBSUE7QUFDQTtBQUlBO0FBQ0E7QUFDQTtBQUNBO0FBSUE7QUFDQTtBQUlBO0FBQ0E7QUFFQTtBQUNBO0FBSUE7QUFFQTtBQUNBO0FBRUE7QUFDQTtBQWVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUVBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQWpUQTtBQWtUQTtBQUFBO0FBRUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ2hYQTtBQUNBO0FBRUE7OztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7Ozs7Ozs7Ozs7O0FDZEE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7O0FDalhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNQQTs7Ozs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7Ozs7OztBQ05BO0FBQ0E7QUFDQSIsInNvdXJjZXMiOlsid2VicGFjazovL01BVEVSSUFMUy93ZWJwYWNrL3VuaXZlcnNhbE1vZHVsZURlZmluaXRpb24iLCJ3ZWJwYWNrOi8vTUFURVJJQUxTLy4uLy4uLy4uL2Rldi9tYXRlcmlhbHMvc3JjL2N1c3RvbS9jdXN0b21NYXRlcmlhbC50cyIsIndlYnBhY2s6Ly9NQVRFUklBTFMvLi4vLi4vLi4vZGV2L21hdGVyaWFscy9zcmMvY3VzdG9tL2luZGV4LnRzIiwid2VicGFjazovL01BVEVSSUFMUy8uLi8uLi8uLi9kZXYvbWF0ZXJpYWxzL3NyYy9jdXN0b20vcGJyQ3VzdG9tTWF0ZXJpYWwudHMiLCJ3ZWJwYWNrOi8vTUFURVJJQUxTLy4uLy4uLy4uL2x0cy9tYXRlcmlhbHMvc3JjL2xlZ2FjeS9sZWdhY3ktY3VzdG9tLnRzIiwid2VicGFjazovL01BVEVSSUFMUy9leHRlcm5hbCB1bWQge1wicm9vdFwiOlwiQkFCWUxPTlwiLFwiY29tbW9uanNcIjpcImJhYnlsb25qc1wiLFwiY29tbW9uanMyXCI6XCJiYWJ5bG9uanNcIixcImFtZFwiOlwiYmFieWxvbmpzXCJ9Iiwid2VicGFjazovL01BVEVSSUFMUy8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvdHNsaWIvdHNsaWIuZXM2Lm1qcyIsIndlYnBhY2s6Ly9NQVRFUklBTFMvd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vTUFURVJJQUxTL3dlYnBhY2svcnVudGltZS9jb21wYXQgZ2V0IGRlZmF1bHQgZXhwb3J0Iiwid2VicGFjazovL01BVEVSSUFMUy93ZWJwYWNrL3J1bnRpbWUvZGVmaW5lIHByb3BlcnR5IGdldHRlcnMiLCJ3ZWJwYWNrOi8vTUFURVJJQUxTL3dlYnBhY2svcnVudGltZS9nbG9iYWwiLCJ3ZWJwYWNrOi8vTUFURVJJQUxTL3dlYnBhY2svcnVudGltZS9oYXNPd25Qcm9wZXJ0eSBzaG9ydGhhbmQiLCJ3ZWJwYWNrOi8vTUFURVJJQUxTL3dlYnBhY2svcnVudGltZS9tYWtlIG5hbWVzcGFjZSBvYmplY3QiLCJ3ZWJwYWNrOi8vTUFURVJJQUxTLy4vc3JjL2N1c3RvbS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gd2VicGFja1VuaXZlcnNhbE1vZHVsZURlZmluaXRpb24ocm9vdCwgZmFjdG9yeSkge1xuXHRpZih0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcpXG5cdFx0bW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoXCJiYWJ5bG9uanNcIikpO1xuXHRlbHNlIGlmKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZClcblx0XHRkZWZpbmUoXCJiYWJ5bG9uanMtbWF0ZXJpYWxzXCIsIFtcImJhYnlsb25qc1wiXSwgZmFjdG9yeSk7XG5cdGVsc2UgaWYodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKVxuXHRcdGV4cG9ydHNbXCJiYWJ5bG9uanMtbWF0ZXJpYWxzXCJdID0gZmFjdG9yeShyZXF1aXJlKFwiYmFieWxvbmpzXCIpKTtcblx0ZWxzZVxuXHRcdHJvb3RbXCJNQVRFUklBTFNcIl0gPSBmYWN0b3J5KHJvb3RbXCJCQUJZTE9OXCJdKTtcbn0pKCh0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdGhpcyksIChfX1dFQlBBQ0tfRVhURVJOQUxfTU9EVUxFX2JhYnlsb25qc19NYXRlcmlhbHNfZWZmZWN0X18pID0+IHtcbnJldHVybiAiLCIvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbmFtaW5nLWNvbnZlbnRpb24gKi9cclxuaW1wb3J0IHR5cGUgeyBUZXh0dXJlIH0gZnJvbSBcImNvcmUvTWF0ZXJpYWxzL1RleHR1cmVzL3RleHR1cmVcIjtcclxuaW1wb3J0IHsgRWZmZWN0IH0gZnJvbSBcImNvcmUvTWF0ZXJpYWxzL2VmZmVjdFwiO1xyXG5pbXBvcnQgdHlwZSB7IE1hdGVyaWFsRGVmaW5lcyB9IGZyb20gXCJjb3JlL01hdGVyaWFscy9tYXRlcmlhbERlZmluZXNcIjtcclxuaW1wb3J0IHsgU3RhbmRhcmRNYXRlcmlhbCB9IGZyb20gXCJjb3JlL01hdGVyaWFscy9zdGFuZGFyZE1hdGVyaWFsXCI7XHJcbmltcG9ydCB0eXBlIHsgTWVzaCB9IGZyb20gXCJjb3JlL01lc2hlcy9tZXNoXCI7XHJcbmltcG9ydCB0eXBlIHsgU2NlbmUgfSBmcm9tIFwiY29yZS9zY2VuZVwiO1xyXG5pbXBvcnQgeyBSZWdpc3RlckNsYXNzIH0gZnJvbSBcImNvcmUvTWlzYy90eXBlU3RvcmVcIjtcclxuaW1wb3J0IHsgQ29sb3IzLCBDb2xvcjQgfSBmcm9tIFwiY29yZS9NYXRocy9tYXRoLmNvbG9yXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgQ3VzdG9tU2hhZGVyU3RydWN0dXJlIHtcclxuICAgIHB1YmxpYyBGcmFnbWVudFN0b3JlOiBzdHJpbmc7XHJcbiAgICBwdWJsaWMgVmVydGV4U3RvcmU6IHN0cmluZztcclxuXHJcbiAgICBjb25zdHJ1Y3RvcigpIHt9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBTaGFkZXJTcGVjaWFsUGFydHMge1xyXG4gICAgY29uc3RydWN0b3IoKSB7fVxyXG5cclxuICAgIHB1YmxpYyBGcmFnbWVudF9CZWdpbjogc3RyaW5nO1xyXG4gICAgcHVibGljIEZyYWdtZW50X0RlZmluaXRpb25zOiBzdHJpbmc7XHJcbiAgICBwdWJsaWMgRnJhZ21lbnRfTWFpbkJlZ2luOiBzdHJpbmc7XHJcbiAgICBwdWJsaWMgRnJhZ21lbnRfTWFpbkVuZDogc3RyaW5nO1xyXG5cclxuICAgIC8vIGRpZmZ1c2VDb2xvclxyXG4gICAgcHVibGljIEZyYWdtZW50X0N1c3RvbV9EaWZmdXNlOiBzdHJpbmc7XHJcbiAgICAvLyBsaWdodHNcclxuICAgIHB1YmxpYyBGcmFnbWVudF9CZWZvcmVfTGlnaHRzOiBzdHJpbmc7XHJcbiAgICAvLyBmb2dcclxuICAgIHB1YmxpYyBGcmFnbWVudF9CZWZvcmVfRm9nOiBzdHJpbmc7XHJcbiAgICAvLyBhbHBoYVxyXG4gICAgcHVibGljIEZyYWdtZW50X0N1c3RvbV9BbHBoYTogc3RyaW5nO1xyXG5cclxuICAgIHB1YmxpYyBGcmFnbWVudF9CZWZvcmVfRnJhZ0NvbG9yOiBzdHJpbmc7XHJcblxyXG4gICAgcHVibGljIFZlcnRleF9CZWdpbjogc3RyaW5nO1xyXG4gICAgcHVibGljIFZlcnRleF9EZWZpbml0aW9uczogc3RyaW5nO1xyXG4gICAgcHVibGljIFZlcnRleF9NYWluQmVnaW46IHN0cmluZztcclxuXHJcbiAgICAvLyBwb3NpdGlvblVwZGF0ZWRcclxuICAgIHB1YmxpYyBWZXJ0ZXhfQmVmb3JlX1Bvc2l0aW9uVXBkYXRlZDogc3RyaW5nO1xyXG5cclxuICAgIC8vIG5vcm1hbFVwZGF0ZWRcclxuICAgIHB1YmxpYyBWZXJ0ZXhfQmVmb3JlX05vcm1hbFVwZGF0ZWQ6IHN0cmluZztcclxuXHJcbiAgICAvLyB3b3JsZFBvc0NvbXB1dGVkXHJcbiAgICBwdWJsaWMgVmVydGV4X0FmdGVyX1dvcmxkUG9zQ29tcHV0ZWQ6IHN0cmluZztcclxuXHJcbiAgICAvLyBtYWluRW5kXHJcbiAgICBwdWJsaWMgVmVydGV4X01haW5FbmQ6IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEN1c3RvbU1hdGVyaWFsIGV4dGVuZHMgU3RhbmRhcmRNYXRlcmlhbCB7XHJcbiAgICBwdWJsaWMgc3RhdGljIFNoYWRlckluZGV4ZXIgPSAxO1xyXG4gICAgcHVibGljIEN1c3RvbVBhcnRzOiBTaGFkZXJTcGVjaWFsUGFydHM7XHJcbiAgICBfaXNDcmVhdGVkU2hhZGVyOiBib29sZWFuO1xyXG4gICAgX2NyZWF0ZWRTaGFkZXJOYW1lOiBzdHJpbmc7XHJcbiAgICBfY3VzdG9tVW5pZm9ybTogc3RyaW5nW107XHJcbiAgICBfbmV3VW5pZm9ybXM6IHN0cmluZ1tdO1xyXG4gICAgX25ld1VuaWZvcm1JbnN0YW5jZXM6IHsgW25hbWU6IHN0cmluZ106IGFueSB9O1xyXG4gICAgX25ld1NhbXBsZXJJbnN0YW5jZXM6IHsgW25hbWU6IHN0cmluZ106IFRleHR1cmUgfTtcclxuICAgIF9jdXN0b21BdHRyaWJ1dGVzOiBzdHJpbmdbXTtcclxuXHJcbiAgICBwdWJsaWMgRnJhZ21lbnRTaGFkZXI6IHN0cmluZztcclxuICAgIHB1YmxpYyBWZXJ0ZXhTaGFkZXI6IHN0cmluZztcclxuXHJcbiAgICBwdWJsaWMgQXR0YWNoQWZ0ZXJCaW5kKG1lc2g6IE1lc2ggfCB1bmRlZmluZWQsIGVmZmVjdDogRWZmZWN0KSB7XHJcbiAgICAgICAgaWYgKHRoaXMuX25ld1VuaWZvcm1JbnN0YW5jZXMpIHtcclxuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBpbiB0aGlzLl9uZXdVbmlmb3JtSW5zdGFuY2VzKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBlYSA9IGVsLnRvU3RyaW5nKCkuc3BsaXQoXCItXCIpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGVhWzBdID09IFwidmVjMlwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWZmZWN0LnNldFZlY3RvcjIoZWFbMV0sIHRoaXMuX25ld1VuaWZvcm1JbnN0YW5jZXNbZWxdKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZWFbMF0gPT0gXCJ2ZWMzXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5fbmV3VW5pZm9ybUluc3RhbmNlc1tlbF0gaW5zdGFuY2VvZiBDb2xvcjMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWZmZWN0LnNldENvbG9yMyhlYVsxXSwgdGhpcy5fbmV3VW5pZm9ybUluc3RhbmNlc1tlbF0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVmZmVjdC5zZXRWZWN0b3IzKGVhWzFdLCB0aGlzLl9uZXdVbmlmb3JtSW5zdGFuY2VzW2VsXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChlYVswXSA9PSBcInZlYzRcIikge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLl9uZXdVbmlmb3JtSW5zdGFuY2VzW2VsXSBpbnN0YW5jZW9mIENvbG9yNCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlZmZlY3Quc2V0RGlyZWN0Q29sb3I0KGVhWzFdLCB0aGlzLl9uZXdVbmlmb3JtSW5zdGFuY2VzW2VsXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWZmZWN0LnNldFZlY3RvcjQoZWFbMV0sIHRoaXMuX25ld1VuaWZvcm1JbnN0YW5jZXNbZWxdKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWZmZWN0LnNldFZlY3RvcjQoZWFbMV0sIHRoaXMuX25ld1VuaWZvcm1JbnN0YW5jZXNbZWxdKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZWFbMF0gPT0gXCJtYXQ0XCIpIHtcclxuICAgICAgICAgICAgICAgICAgICBlZmZlY3Quc2V0TWF0cml4KGVhWzFdLCB0aGlzLl9uZXdVbmlmb3JtSW5zdGFuY2VzW2VsXSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGVhWzBdID09IFwiZmxvYXRcIikge1xyXG4gICAgICAgICAgICAgICAgICAgIGVmZmVjdC5zZXRGbG9hdChlYVsxXSwgdGhpcy5fbmV3VW5pZm9ybUluc3RhbmNlc1tlbF0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0aGlzLl9uZXdTYW1wbGVySW5zdGFuY2VzKSB7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgZWwgaW4gdGhpcy5fbmV3U2FtcGxlckluc3RhbmNlcykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZWEgPSBlbC50b1N0cmluZygpLnNwbGl0KFwiLVwiKTtcclxuICAgICAgICAgICAgICAgIGlmIChlYVswXSA9PSBcInNhbXBsZXIyRFwiICYmIHRoaXMuX25ld1NhbXBsZXJJbnN0YW5jZXNbZWxdLmlzUmVhZHkgJiYgdGhpcy5fbmV3U2FtcGxlckluc3RhbmNlc1tlbF0uaXNSZWFkeSgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWZmZWN0LnNldFRleHR1cmUoZWFbMV0sIHRoaXMuX25ld1NhbXBsZXJJbnN0YW5jZXNbZWxdKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgUmV2aWV3VW5pZm9ybShuYW1lOiBzdHJpbmcsIGFycjogc3RyaW5nW10pOiBzdHJpbmdbXSB7XHJcbiAgICAgICAgaWYgKG5hbWUgPT0gXCJ1bmlmb3JtXCIgJiYgdGhpcy5fbmV3VW5pZm9ybXMpIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgaW5kID0gMDsgaW5kIDwgdGhpcy5fbmV3VW5pZm9ybXMubGVuZ3RoOyBpbmQrKykge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX2N1c3RvbVVuaWZvcm1baW5kXS5pbmRleE9mKFwic2FtcGxlclwiKSA9PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGFyci5wdXNoKHRoaXMuX25ld1VuaWZvcm1zW2luZF0ucmVwbGFjZSgvXFxbXFxkKlxcXS9nLCBcIlwiKSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKG5hbWUgPT0gXCJzYW1wbGVyXCIgJiYgdGhpcy5fbmV3VW5pZm9ybXMpIHtcclxuICAgICAgICAgICAgZm9yIChsZXQgaW5kID0gMDsgaW5kIDwgdGhpcy5fbmV3VW5pZm9ybXMubGVuZ3RoOyBpbmQrKykge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX2N1c3RvbVVuaWZvcm1baW5kXS5pbmRleE9mKFwic2FtcGxlclwiKSAhPSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGFyci5wdXNoKHRoaXMuX25ld1VuaWZvcm1zW2luZF0ucmVwbGFjZSgvXFxbXFxkKlxcXS9nLCBcIlwiKSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGFycjtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgQnVpbGRlcihzaGFkZXJOYW1lOiBzdHJpbmcsIHVuaWZvcm1zOiBzdHJpbmdbXSwgdW5pZm9ybUJ1ZmZlcnM6IHN0cmluZ1tdLCBzYW1wbGVyczogc3RyaW5nW10sIGRlZmluZXM6IE1hdGVyaWFsRGVmaW5lcyB8IHN0cmluZ1tdLCBhdHRyaWJ1dGVzPzogc3RyaW5nW10pOiBzdHJpbmcge1xyXG4gICAgICAgIGlmIChhdHRyaWJ1dGVzICYmIHRoaXMuX2N1c3RvbUF0dHJpYnV0ZXMgJiYgdGhpcy5fY3VzdG9tQXR0cmlidXRlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIGF0dHJpYnV0ZXMucHVzaCguLi50aGlzLl9jdXN0b21BdHRyaWJ1dGVzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuUmV2aWV3VW5pZm9ybShcInVuaWZvcm1cIiwgdW5pZm9ybXMpO1xyXG4gICAgICAgIHRoaXMuUmV2aWV3VW5pZm9ybShcInNhbXBsZXJcIiwgc2FtcGxlcnMpO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5faXNDcmVhdGVkU2hhZGVyKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9jcmVhdGVkU2hhZGVyTmFtZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5faXNDcmVhdGVkU2hhZGVyID0gZmFsc2U7XHJcblxyXG4gICAgICAgIEN1c3RvbU1hdGVyaWFsLlNoYWRlckluZGV4ZXIrKztcclxuICAgICAgICBjb25zdCBuYW1lOiBzdHJpbmcgPSBcImN1c3RvbV9cIiArIEN1c3RvbU1hdGVyaWFsLlNoYWRlckluZGV4ZXI7XHJcblxyXG4gICAgICAgIGNvbnN0IGZuX2FmdGVyQmluZCA9IHRoaXMuX2FmdGVyQmluZC5iaW5kKHRoaXMpO1xyXG4gICAgICAgIHRoaXMuX2FmdGVyQmluZCA9IChtLCBlKSA9PiB7XHJcbiAgICAgICAgICAgIGlmICghZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuQXR0YWNoQWZ0ZXJCaW5kKG0sIGUpO1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgZm5fYWZ0ZXJCaW5kKG0sIGUpO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7fVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIEVmZmVjdC5TaGFkZXJzU3RvcmVbbmFtZSArIFwiVmVydGV4U2hhZGVyXCJdID0gdGhpcy5WZXJ0ZXhTaGFkZXIucmVwbGFjZShcIiNkZWZpbmUgQ1VTVE9NX1ZFUlRFWF9CRUdJTlwiLCB0aGlzLkN1c3RvbVBhcnRzLlZlcnRleF9CZWdpbiA/IHRoaXMuQ3VzdG9tUGFydHMuVmVydGV4X0JlZ2luIDogXCJcIilcclxuICAgICAgICAgICAgLnJlcGxhY2UoXHJcbiAgICAgICAgICAgICAgICBcIiNkZWZpbmUgQ1VTVE9NX1ZFUlRFWF9ERUZJTklUSU9OU1wiLFxyXG4gICAgICAgICAgICAgICAgKHRoaXMuX2N1c3RvbVVuaWZvcm0gPyB0aGlzLl9jdXN0b21Vbmlmb3JtLmpvaW4oXCJcXG5cIikgOiBcIlwiKSArICh0aGlzLkN1c3RvbVBhcnRzLlZlcnRleF9EZWZpbml0aW9ucyA/IHRoaXMuQ3VzdG9tUGFydHMuVmVydGV4X0RlZmluaXRpb25zIDogXCJcIilcclxuICAgICAgICAgICAgKVxyXG4gICAgICAgICAgICAucmVwbGFjZShcIiNkZWZpbmUgQ1VTVE9NX1ZFUlRFWF9NQUlOX0JFR0lOXCIsIHRoaXMuQ3VzdG9tUGFydHMuVmVydGV4X01haW5CZWdpbiA/IHRoaXMuQ3VzdG9tUGFydHMuVmVydGV4X01haW5CZWdpbiA6IFwiXCIpXHJcbiAgICAgICAgICAgIC5yZXBsYWNlKFwiI2RlZmluZSBDVVNUT01fVkVSVEVYX1VQREFURV9QT1NJVElPTlwiLCB0aGlzLkN1c3RvbVBhcnRzLlZlcnRleF9CZWZvcmVfUG9zaXRpb25VcGRhdGVkID8gdGhpcy5DdXN0b21QYXJ0cy5WZXJ0ZXhfQmVmb3JlX1Bvc2l0aW9uVXBkYXRlZCA6IFwiXCIpXHJcbiAgICAgICAgICAgIC5yZXBsYWNlKFwiI2RlZmluZSBDVVNUT01fVkVSVEVYX1VQREFURV9OT1JNQUxcIiwgdGhpcy5DdXN0b21QYXJ0cy5WZXJ0ZXhfQmVmb3JlX05vcm1hbFVwZGF0ZWQgPyB0aGlzLkN1c3RvbVBhcnRzLlZlcnRleF9CZWZvcmVfTm9ybWFsVXBkYXRlZCA6IFwiXCIpXHJcbiAgICAgICAgICAgIC5yZXBsYWNlKFwiI2RlZmluZSBDVVNUT01fVkVSVEVYX01BSU5fRU5EXCIsIHRoaXMuQ3VzdG9tUGFydHMuVmVydGV4X01haW5FbmQgPyB0aGlzLkN1c3RvbVBhcnRzLlZlcnRleF9NYWluRW5kIDogXCJcIik7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLkN1c3RvbVBhcnRzLlZlcnRleF9BZnRlcl9Xb3JsZFBvc0NvbXB1dGVkKSB7XHJcbiAgICAgICAgICAgIEVmZmVjdC5TaGFkZXJzU3RvcmVbbmFtZSArIFwiVmVydGV4U2hhZGVyXCJdID0gRWZmZWN0LlNoYWRlcnNTdG9yZVtuYW1lICsgXCJWZXJ0ZXhTaGFkZXJcIl0ucmVwbGFjZShcclxuICAgICAgICAgICAgICAgIFwiI2RlZmluZSBDVVNUT01fVkVSVEVYX1VQREFURV9XT1JMRFBPU1wiLFxyXG4gICAgICAgICAgICAgICAgdGhpcy5DdXN0b21QYXJ0cy5WZXJ0ZXhfQWZ0ZXJfV29ybGRQb3NDb21wdXRlZFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgRWZmZWN0LlNoYWRlcnNTdG9yZVtuYW1lICsgXCJQaXhlbFNoYWRlclwiXSA9IHRoaXMuRnJhZ21lbnRTaGFkZXIucmVwbGFjZShcclxuICAgICAgICAgICAgXCIjZGVmaW5lIENVU1RPTV9GUkFHTUVOVF9CRUdJTlwiLFxyXG4gICAgICAgICAgICB0aGlzLkN1c3RvbVBhcnRzLkZyYWdtZW50X0JlZ2luID8gdGhpcy5DdXN0b21QYXJ0cy5GcmFnbWVudF9CZWdpbiA6IFwiXCJcclxuICAgICAgICApXHJcbiAgICAgICAgICAgIC5yZXBsYWNlKFwiI2RlZmluZSBDVVNUT01fRlJBR01FTlRfTUFJTl9CRUdJTlwiLCB0aGlzLkN1c3RvbVBhcnRzLkZyYWdtZW50X01haW5CZWdpbiA/IHRoaXMuQ3VzdG9tUGFydHMuRnJhZ21lbnRfTWFpbkJlZ2luIDogXCJcIilcclxuICAgICAgICAgICAgLnJlcGxhY2UoXHJcbiAgICAgICAgICAgICAgICBcIiNkZWZpbmUgQ1VTVE9NX0ZSQUdNRU5UX0RFRklOSVRJT05TXCIsXHJcbiAgICAgICAgICAgICAgICAodGhpcy5fY3VzdG9tVW5pZm9ybSA/IHRoaXMuX2N1c3RvbVVuaWZvcm0uam9pbihcIlxcblwiKSA6IFwiXCIpICsgKHRoaXMuQ3VzdG9tUGFydHMuRnJhZ21lbnRfRGVmaW5pdGlvbnMgPyB0aGlzLkN1c3RvbVBhcnRzLkZyYWdtZW50X0RlZmluaXRpb25zIDogXCJcIilcclxuICAgICAgICAgICAgKVxyXG4gICAgICAgICAgICAucmVwbGFjZShcIiNkZWZpbmUgQ1VTVE9NX0ZSQUdNRU5UX1VQREFURV9ESUZGVVNFXCIsIHRoaXMuQ3VzdG9tUGFydHMuRnJhZ21lbnRfQ3VzdG9tX0RpZmZ1c2UgPyB0aGlzLkN1c3RvbVBhcnRzLkZyYWdtZW50X0N1c3RvbV9EaWZmdXNlIDogXCJcIilcclxuICAgICAgICAgICAgLnJlcGxhY2UoXCIjZGVmaW5lIENVU1RPTV9GUkFHTUVOVF9VUERBVEVfQUxQSEFcIiwgdGhpcy5DdXN0b21QYXJ0cy5GcmFnbWVudF9DdXN0b21fQWxwaGEgPyB0aGlzLkN1c3RvbVBhcnRzLkZyYWdtZW50X0N1c3RvbV9BbHBoYSA6IFwiXCIpXHJcbiAgICAgICAgICAgIC5yZXBsYWNlKFwiI2RlZmluZSBDVVNUT01fRlJBR01FTlRfQkVGT1JFX0xJR0hUU1wiLCB0aGlzLkN1c3RvbVBhcnRzLkZyYWdtZW50X0JlZm9yZV9MaWdodHMgPyB0aGlzLkN1c3RvbVBhcnRzLkZyYWdtZW50X0JlZm9yZV9MaWdodHMgOiBcIlwiKVxyXG4gICAgICAgICAgICAucmVwbGFjZShcIiNkZWZpbmUgQ1VTVE9NX0ZSQUdNRU5UX0JFRk9SRV9GUkFHQ09MT1JcIiwgdGhpcy5DdXN0b21QYXJ0cy5GcmFnbWVudF9CZWZvcmVfRnJhZ0NvbG9yID8gdGhpcy5DdXN0b21QYXJ0cy5GcmFnbWVudF9CZWZvcmVfRnJhZ0NvbG9yIDogXCJcIilcclxuICAgICAgICAgICAgLnJlcGxhY2UoXCIjZGVmaW5lIENVU1RPTV9GUkFHTUVOVF9NQUlOX0VORFwiLCB0aGlzLkN1c3RvbVBhcnRzLkZyYWdtZW50X01haW5FbmQgPyB0aGlzLkN1c3RvbVBhcnRzLkZyYWdtZW50X01haW5FbmQgOiBcIlwiKTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuQ3VzdG9tUGFydHMuRnJhZ21lbnRfQmVmb3JlX0ZvZykge1xyXG4gICAgICAgICAgICBFZmZlY3QuU2hhZGVyc1N0b3JlW25hbWUgKyBcIlBpeGVsU2hhZGVyXCJdID0gRWZmZWN0LlNoYWRlcnNTdG9yZVtuYW1lICsgXCJQaXhlbFNoYWRlclwiXS5yZXBsYWNlKFxyXG4gICAgICAgICAgICAgICAgXCIjZGVmaW5lIENVU1RPTV9GUkFHTUVOVF9CRUZPUkVfRk9HXCIsXHJcbiAgICAgICAgICAgICAgICB0aGlzLkN1c3RvbVBhcnRzLkZyYWdtZW50X0JlZm9yZV9Gb2dcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuX2lzQ3JlYXRlZFNoYWRlciA9IHRydWU7XHJcbiAgICAgICAgdGhpcy5fY3JlYXRlZFNoYWRlck5hbWUgPSBuYW1lO1xyXG5cclxuICAgICAgICByZXR1cm4gbmFtZTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdHJ1Y3RvcihuYW1lOiBzdHJpbmcsIHNjZW5lPzogU2NlbmUpIHtcclxuICAgICAgICBzdXBlcihuYW1lLCBzY2VuZSk7XHJcbiAgICAgICAgdGhpcy5DdXN0b21QYXJ0cyA9IG5ldyBTaGFkZXJTcGVjaWFsUGFydHMoKTtcclxuICAgICAgICB0aGlzLmN1c3RvbVNoYWRlck5hbWVSZXNvbHZlID0gdGhpcy5CdWlsZGVyO1xyXG5cclxuICAgICAgICB0aGlzLkZyYWdtZW50U2hhZGVyID0gRWZmZWN0LlNoYWRlcnNTdG9yZVtcImRlZmF1bHRQaXhlbFNoYWRlclwiXTtcclxuICAgICAgICB0aGlzLlZlcnRleFNoYWRlciA9IEVmZmVjdC5TaGFkZXJzU3RvcmVbXCJkZWZhdWx0VmVydGV4U2hhZGVyXCJdO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBBZGRVbmlmb3JtKG5hbWU6IHN0cmluZywga2luZDogc3RyaW5nLCBwYXJhbTogYW55KTogQ3VzdG9tTWF0ZXJpYWwge1xyXG4gICAgICAgIGlmICghdGhpcy5fY3VzdG9tVW5pZm9ybSkge1xyXG4gICAgICAgICAgICB0aGlzLl9jdXN0b21Vbmlmb3JtID0gbmV3IEFycmF5KCk7XHJcbiAgICAgICAgICAgIHRoaXMuX25ld1VuaWZvcm1zID0gbmV3IEFycmF5KCk7XHJcbiAgICAgICAgICAgIHRoaXMuX25ld1NhbXBsZXJJbnN0YW5jZXMgPSB7fTtcclxuICAgICAgICAgICAgdGhpcy5fbmV3VW5pZm9ybUluc3RhbmNlcyA9IHt9O1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAocGFyYW0pIHtcclxuICAgICAgICAgICAgaWYgKGtpbmQuaW5kZXhPZihcInNhbXBsZXJcIikgIT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICg8YW55PnRoaXMuX25ld1NhbXBsZXJJbnN0YW5jZXMpW2tpbmQgKyBcIi1cIiArIG5hbWVdID0gcGFyYW07XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAoPGFueT50aGlzLl9uZXdVbmlmb3JtSW5zdGFuY2VzKVtraW5kICsgXCItXCIgKyBuYW1lXSA9IHBhcmFtO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuX2N1c3RvbVVuaWZvcm0ucHVzaChcInVuaWZvcm0gXCIgKyBraW5kICsgXCIgXCIgKyBuYW1lICsgXCI7XCIpO1xyXG4gICAgICAgIHRoaXMuX25ld1VuaWZvcm1zLnB1c2gobmFtZSk7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBBZGRBdHRyaWJ1dGUobmFtZTogc3RyaW5nKTogQ3VzdG9tTWF0ZXJpYWwge1xyXG4gICAgICAgIGlmICghdGhpcy5fY3VzdG9tQXR0cmlidXRlcykge1xyXG4gICAgICAgICAgICB0aGlzLl9jdXN0b21BdHRyaWJ1dGVzID0gW107XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLl9jdXN0b21BdHRyaWJ1dGVzLnB1c2gobmFtZSk7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBGcmFnbWVudF9CZWdpbihzaGFkZXJQYXJ0OiBzdHJpbmcpOiBDdXN0b21NYXRlcmlhbCB7XHJcbiAgICAgICAgdGhpcy5DdXN0b21QYXJ0cy5GcmFnbWVudF9CZWdpbiA9IHNoYWRlclBhcnQ7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIEZyYWdtZW50X0RlZmluaXRpb25zKHNoYWRlclBhcnQ6IHN0cmluZyk6IEN1c3RvbU1hdGVyaWFsIHtcclxuICAgICAgICB0aGlzLkN1c3RvbVBhcnRzLkZyYWdtZW50X0RlZmluaXRpb25zID0gc2hhZGVyUGFydDtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgRnJhZ21lbnRfTWFpbkJlZ2luKHNoYWRlclBhcnQ6IHN0cmluZyk6IEN1c3RvbU1hdGVyaWFsIHtcclxuICAgICAgICB0aGlzLkN1c3RvbVBhcnRzLkZyYWdtZW50X01haW5CZWdpbiA9IHNoYWRlclBhcnQ7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIEZyYWdtZW50X01haW5FbmQoc2hhZGVyUGFydDogc3RyaW5nKTogQ3VzdG9tTWF0ZXJpYWwge1xyXG4gICAgICAgIHRoaXMuQ3VzdG9tUGFydHMuRnJhZ21lbnRfTWFpbkVuZCA9IHNoYWRlclBhcnQ7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIEZyYWdtZW50X0N1c3RvbV9EaWZmdXNlKHNoYWRlclBhcnQ6IHN0cmluZyk6IEN1c3RvbU1hdGVyaWFsIHtcclxuICAgICAgICB0aGlzLkN1c3RvbVBhcnRzLkZyYWdtZW50X0N1c3RvbV9EaWZmdXNlID0gc2hhZGVyUGFydC5yZXBsYWNlKFwicmVzdWx0XCIsIFwiZGlmZnVzZUNvbG9yXCIpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBGcmFnbWVudF9DdXN0b21fQWxwaGEoc2hhZGVyUGFydDogc3RyaW5nKTogQ3VzdG9tTWF0ZXJpYWwge1xyXG4gICAgICAgIHRoaXMuQ3VzdG9tUGFydHMuRnJhZ21lbnRfQ3VzdG9tX0FscGhhID0gc2hhZGVyUGFydC5yZXBsYWNlKFwicmVzdWx0XCIsIFwiYWxwaGFcIik7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIEZyYWdtZW50X0JlZm9yZV9MaWdodHMoc2hhZGVyUGFydDogc3RyaW5nKTogQ3VzdG9tTWF0ZXJpYWwge1xyXG4gICAgICAgIHRoaXMuQ3VzdG9tUGFydHMuRnJhZ21lbnRfQmVmb3JlX0xpZ2h0cyA9IHNoYWRlclBhcnQ7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIEZyYWdtZW50X0JlZm9yZV9Gb2coc2hhZGVyUGFydDogc3RyaW5nKTogQ3VzdG9tTWF0ZXJpYWwge1xyXG4gICAgICAgIHRoaXMuQ3VzdG9tUGFydHMuRnJhZ21lbnRfQmVmb3JlX0ZvZyA9IHNoYWRlclBhcnQ7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIEZyYWdtZW50X0JlZm9yZV9GcmFnQ29sb3Ioc2hhZGVyUGFydDogc3RyaW5nKTogQ3VzdG9tTWF0ZXJpYWwge1xyXG4gICAgICAgIHRoaXMuQ3VzdG9tUGFydHMuRnJhZ21lbnRfQmVmb3JlX0ZyYWdDb2xvciA9IHNoYWRlclBhcnQucmVwbGFjZShcInJlc3VsdFwiLCBcImNvbG9yXCIpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBWZXJ0ZXhfQmVnaW4oc2hhZGVyUGFydDogc3RyaW5nKTogQ3VzdG9tTWF0ZXJpYWwge1xyXG4gICAgICAgIHRoaXMuQ3VzdG9tUGFydHMuVmVydGV4X0JlZ2luID0gc2hhZGVyUGFydDtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgVmVydGV4X0RlZmluaXRpb25zKHNoYWRlclBhcnQ6IHN0cmluZyk6IEN1c3RvbU1hdGVyaWFsIHtcclxuICAgICAgICB0aGlzLkN1c3RvbVBhcnRzLlZlcnRleF9EZWZpbml0aW9ucyA9IHNoYWRlclBhcnQ7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIFZlcnRleF9NYWluQmVnaW4oc2hhZGVyUGFydDogc3RyaW5nKTogQ3VzdG9tTWF0ZXJpYWwge1xyXG4gICAgICAgIHRoaXMuQ3VzdG9tUGFydHMuVmVydGV4X01haW5CZWdpbiA9IHNoYWRlclBhcnQ7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIFZlcnRleF9CZWZvcmVfUG9zaXRpb25VcGRhdGVkKHNoYWRlclBhcnQ6IHN0cmluZyk6IEN1c3RvbU1hdGVyaWFsIHtcclxuICAgICAgICB0aGlzLkN1c3RvbVBhcnRzLlZlcnRleF9CZWZvcmVfUG9zaXRpb25VcGRhdGVkID0gc2hhZGVyUGFydC5yZXBsYWNlKFwicmVzdWx0XCIsIFwicG9zaXRpb25VcGRhdGVkXCIpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBWZXJ0ZXhfQmVmb3JlX05vcm1hbFVwZGF0ZWQoc2hhZGVyUGFydDogc3RyaW5nKTogQ3VzdG9tTWF0ZXJpYWwge1xyXG4gICAgICAgIHRoaXMuQ3VzdG9tUGFydHMuVmVydGV4X0JlZm9yZV9Ob3JtYWxVcGRhdGVkID0gc2hhZGVyUGFydC5yZXBsYWNlKFwicmVzdWx0XCIsIFwibm9ybWFsVXBkYXRlZFwiKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgVmVydGV4X0FmdGVyX1dvcmxkUG9zQ29tcHV0ZWQoc2hhZGVyUGFydDogc3RyaW5nKTogQ3VzdG9tTWF0ZXJpYWwge1xyXG4gICAgICAgIHRoaXMuQ3VzdG9tUGFydHMuVmVydGV4X0FmdGVyX1dvcmxkUG9zQ29tcHV0ZWQgPSBzaGFkZXJQYXJ0O1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBWZXJ0ZXhfTWFpbkVuZChzaGFkZXJQYXJ0OiBzdHJpbmcpOiBDdXN0b21NYXRlcmlhbCB7XHJcbiAgICAgICAgdGhpcy5DdXN0b21QYXJ0cy5WZXJ0ZXhfTWFpbkVuZCA9IHNoYWRlclBhcnQ7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcbn1cclxuXHJcblJlZ2lzdGVyQ2xhc3MoXCJCQUJZTE9OLkN1c3RvbU1hdGVyaWFsXCIsIEN1c3RvbU1hdGVyaWFsKTtcclxuIiwiZXhwb3J0ICogZnJvbSBcIi4vY3VzdG9tTWF0ZXJpYWxcIjtcclxuZXhwb3J0ICogZnJvbSBcIi4vcGJyQ3VzdG9tTWF0ZXJpYWxcIjtcclxuIiwiLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25hbWluZy1jb252ZW50aW9uICovXHJcbmltcG9ydCB0eXBlIHsgVGV4dHVyZSB9IGZyb20gXCJjb3JlL01hdGVyaWFscy9UZXh0dXJlcy90ZXh0dXJlXCI7XHJcbmltcG9ydCB7IEVmZmVjdCB9IGZyb20gXCJjb3JlL01hdGVyaWFscy9lZmZlY3RcIjtcclxuaW1wb3J0IHR5cGUgeyBNYXRlcmlhbERlZmluZXMgfSBmcm9tIFwiY29yZS9NYXRlcmlhbHMvbWF0ZXJpYWxEZWZpbmVzXCI7XHJcbmltcG9ydCB7IFBCUk1hdGVyaWFsIH0gZnJvbSBcImNvcmUvTWF0ZXJpYWxzL1BCUi9wYnJNYXRlcmlhbFwiO1xyXG5pbXBvcnQgdHlwZSB7IE1lc2ggfSBmcm9tIFwiY29yZS9NZXNoZXMvbWVzaFwiO1xyXG5pbXBvcnQgdHlwZSB7IFNjZW5lIH0gZnJvbSBcImNvcmUvc2NlbmVcIjtcclxuaW1wb3J0IHsgUmVnaXN0ZXJDbGFzcyB9IGZyb20gXCJjb3JlL01pc2MvdHlwZVN0b3JlXCI7XHJcbmltcG9ydCB7IFNoYWRlckNvZGVJbmxpbmVyIH0gZnJvbSBcImNvcmUvRW5naW5lcy9Qcm9jZXNzb3JzL3NoYWRlckNvZGVJbmxpbmVyXCI7XHJcbmltcG9ydCB0eXBlIHsgSUN1c3RvbVNoYWRlck5hbWVSZXNvbHZlT3B0aW9ucyB9IGZyb20gXCJjb3JlL01hdGVyaWFscy9tYXRlcmlhbFwiO1xyXG5pbXBvcnQgeyBDb2xvcjMsIENvbG9yNCB9IGZyb20gXCJjb3JlL01hdGhzL21hdGguY29sb3JcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBTaGFkZXJBbGJlZG9QYXJ0cyB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHt9XHJcblxyXG4gICAgcHVibGljIEZyYWdtZW50X0JlZ2luOiBzdHJpbmc7XHJcbiAgICBwdWJsaWMgRnJhZ21lbnRfRGVmaW5pdGlvbnM6IHN0cmluZztcclxuICAgIHB1YmxpYyBGcmFnbWVudF9NYWluQmVnaW46IHN0cmluZztcclxuICAgIHB1YmxpYyBGcmFnbWVudF9NYWluRW5kOiBzdHJpbmc7XHJcblxyXG4gICAgLy8gYWxiZWRvQ29sb3JcclxuICAgIHB1YmxpYyBGcmFnbWVudF9DdXN0b21fQWxiZWRvOiBzdHJpbmc7XHJcbiAgICAvLyBsaWdodHNcclxuICAgIHB1YmxpYyBGcmFnbWVudF9CZWZvcmVfTGlnaHRzOiBzdHJpbmc7XHJcbiAgICAvLyByb3VnaG5lc3NcclxuICAgIHB1YmxpYyBGcmFnbWVudF9DdXN0b21fTWV0YWxsaWNSb3VnaG5lc3M6IHN0cmluZztcclxuICAgIC8vIG1pY3Jvc3VyZmFjZVxyXG4gICAgcHVibGljIEZyYWdtZW50X0N1c3RvbV9NaWNyb1N1cmZhY2U6IHN0cmluZztcclxuICAgIC8vIGZvZ1xyXG4gICAgcHVibGljIEZyYWdtZW50X0JlZm9yZV9Gb2c6IHN0cmluZztcclxuICAgIC8vIGFscGhhXHJcbiAgICBwdWJsaWMgRnJhZ21lbnRfQ3VzdG9tX0FscGhhOiBzdHJpbmc7XHJcbiAgICAvLyBjb2xvciBjb21wb3NpdGlvblxyXG4gICAgcHVibGljIEZyYWdtZW50X0JlZm9yZV9GaW5hbENvbG9yQ29tcG9zaXRpb246IHN0cmluZztcclxuICAgIC8vIGZyYWcgY29sb3JcclxuICAgIHB1YmxpYyBGcmFnbWVudF9CZWZvcmVfRnJhZ0NvbG9yOiBzdHJpbmc7XHJcblxyXG4gICAgcHVibGljIFZlcnRleF9CZWdpbjogc3RyaW5nO1xyXG4gICAgcHVibGljIFZlcnRleF9EZWZpbml0aW9uczogc3RyaW5nO1xyXG4gICAgcHVibGljIFZlcnRleF9NYWluQmVnaW46IHN0cmluZztcclxuXHJcbiAgICAvLyBwb3NpdGlvblVwZGF0ZWRcclxuICAgIHB1YmxpYyBWZXJ0ZXhfQmVmb3JlX1Bvc2l0aW9uVXBkYXRlZDogc3RyaW5nO1xyXG5cclxuICAgIC8vIG5vcm1hbFVwZGF0ZWRcclxuICAgIHB1YmxpYyBWZXJ0ZXhfQmVmb3JlX05vcm1hbFVwZGF0ZWQ6IHN0cmluZztcclxuXHJcbiAgICAvLyB3b3JsZFBvc0NvbXB1dGVkXHJcbiAgICBwdWJsaWMgVmVydGV4X0FmdGVyX1dvcmxkUG9zQ29tcHV0ZWQ6IHN0cmluZztcclxuXHJcbiAgICAvLyBtYWluRW5kXHJcbiAgICBwdWJsaWMgVmVydGV4X01haW5FbmQ6IHN0cmluZztcclxufVxyXG5cclxuLyoqXHJcbiAqIEBkZXByZWNhdGVkIHVzZSBTaGFkZXJBbGJlZG9QYXJ0cyBpbnN0ZWFkLlxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IFNoYWRlckFsZWJkb1BhcnRzID0gU2hhZGVyQWxiZWRvUGFydHM7XHJcblxyXG5leHBvcnQgY2xhc3MgUEJSQ3VzdG9tTWF0ZXJpYWwgZXh0ZW5kcyBQQlJNYXRlcmlhbCB7XHJcbiAgICBwdWJsaWMgc3RhdGljIFNoYWRlckluZGV4ZXIgPSAxO1xyXG4gICAgcHVibGljIEN1c3RvbVBhcnRzOiBTaGFkZXJBbGJlZG9QYXJ0cztcclxuICAgIF9pc0NyZWF0ZWRTaGFkZXI6IGJvb2xlYW47XHJcbiAgICBfY3JlYXRlZFNoYWRlck5hbWU6IHN0cmluZztcclxuICAgIF9jdXN0b21Vbmlmb3JtOiBzdHJpbmdbXTtcclxuICAgIF9uZXdVbmlmb3Jtczogc3RyaW5nW107XHJcbiAgICBfbmV3VW5pZm9ybUluc3RhbmNlczogeyBbbmFtZTogc3RyaW5nXTogYW55IH07XHJcbiAgICBfbmV3U2FtcGxlckluc3RhbmNlczogeyBbbmFtZTogc3RyaW5nXTogVGV4dHVyZSB9O1xyXG4gICAgX2N1c3RvbUF0dHJpYnV0ZXM6IHN0cmluZ1tdO1xyXG5cclxuICAgIHB1YmxpYyBGcmFnbWVudFNoYWRlcjogc3RyaW5nO1xyXG4gICAgcHVibGljIFZlcnRleFNoYWRlcjogc3RyaW5nO1xyXG5cclxuICAgIHB1YmxpYyBBdHRhY2hBZnRlckJpbmQobWVzaDogTWVzaCB8IHVuZGVmaW5lZCwgZWZmZWN0OiBFZmZlY3QpIHtcclxuICAgICAgICBpZiAodGhpcy5fbmV3VW5pZm9ybUluc3RhbmNlcykge1xyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVsIGluIHRoaXMuX25ld1VuaWZvcm1JbnN0YW5jZXMpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGVhID0gZWwudG9TdHJpbmcoKS5zcGxpdChcIi1cIik7XHJcbiAgICAgICAgICAgICAgICBpZiAoZWFbMF0gPT0gXCJ2ZWMyXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICBlZmZlY3Quc2V0VmVjdG9yMihlYVsxXSwgdGhpcy5fbmV3VW5pZm9ybUluc3RhbmNlc1tlbF0pO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChlYVswXSA9PSBcInZlYzNcIikge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLl9uZXdVbmlmb3JtSW5zdGFuY2VzW2VsXSBpbnN0YW5jZW9mIENvbG9yMykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlZmZlY3Quc2V0Q29sb3IzKGVhWzFdLCB0aGlzLl9uZXdVbmlmb3JtSW5zdGFuY2VzW2VsXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWZmZWN0LnNldFZlY3RvcjMoZWFbMV0sIHRoaXMuX25ld1VuaWZvcm1JbnN0YW5jZXNbZWxdKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGVhWzBdID09IFwidmVjNFwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuX25ld1VuaWZvcm1JbnN0YW5jZXNbZWxdIGluc3RhbmNlb2YgQ29sb3I0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVmZmVjdC5zZXREaXJlY3RDb2xvcjQoZWFbMV0sIHRoaXMuX25ld1VuaWZvcm1JbnN0YW5jZXNbZWxdKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlZmZlY3Quc2V0VmVjdG9yNChlYVsxXSwgdGhpcy5fbmV3VW5pZm9ybUluc3RhbmNlc1tlbF0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBlZmZlY3Quc2V0VmVjdG9yNChlYVsxXSwgdGhpcy5fbmV3VW5pZm9ybUluc3RhbmNlc1tlbF0pO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChlYVswXSA9PSBcIm1hdDRcIikge1xyXG4gICAgICAgICAgICAgICAgICAgIGVmZmVjdC5zZXRNYXRyaXgoZWFbMV0sIHRoaXMuX25ld1VuaWZvcm1JbnN0YW5jZXNbZWxdKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZWFbMF0gPT0gXCJmbG9hdFwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZWZmZWN0LnNldEZsb2F0KGVhWzFdLCB0aGlzLl9uZXdVbmlmb3JtSW5zdGFuY2VzW2VsXSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHRoaXMuX25ld1NhbXBsZXJJbnN0YW5jZXMpIHtcclxuICAgICAgICAgICAgZm9yIChjb25zdCBlbCBpbiB0aGlzLl9uZXdTYW1wbGVySW5zdGFuY2VzKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBlYSA9IGVsLnRvU3RyaW5nKCkuc3BsaXQoXCItXCIpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGVhWzBdID09IFwic2FtcGxlcjJEXCIgJiYgdGhpcy5fbmV3U2FtcGxlckluc3RhbmNlc1tlbF0uaXNSZWFkeSAmJiB0aGlzLl9uZXdTYW1wbGVySW5zdGFuY2VzW2VsXS5pc1JlYWR5KCkpIHtcclxuICAgICAgICAgICAgICAgICAgICBlZmZlY3Quc2V0VGV4dHVyZShlYVsxXSwgdGhpcy5fbmV3U2FtcGxlckluc3RhbmNlc1tlbF0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBSZXZpZXdVbmlmb3JtKG5hbWU6IHN0cmluZywgYXJyOiBzdHJpbmdbXSk6IHN0cmluZ1tdIHtcclxuICAgICAgICBpZiAobmFtZSA9PSBcInVuaWZvcm1cIiAmJiB0aGlzLl9uZXdVbmlmb3Jtcykge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpbmQgPSAwOyBpbmQgPCB0aGlzLl9uZXdVbmlmb3Jtcy5sZW5ndGg7IGluZCsrKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fY3VzdG9tVW5pZm9ybVtpbmRdLmluZGV4T2YoXCJzYW1wbGVyXCIpID09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXJyLnB1c2godGhpcy5fbmV3VW5pZm9ybXNbaW5kXS5yZXBsYWNlKC9cXFtcXGQqXFxdL2csIFwiXCIpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAobmFtZSA9PSBcInNhbXBsZXJcIiAmJiB0aGlzLl9uZXdVbmlmb3Jtcykge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpbmQgPSAwOyBpbmQgPCB0aGlzLl9uZXdVbmlmb3Jtcy5sZW5ndGg7IGluZCsrKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fY3VzdG9tVW5pZm9ybVtpbmRdLmluZGV4T2YoXCJzYW1wbGVyXCIpICE9IC0xKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXJyLnB1c2godGhpcy5fbmV3VW5pZm9ybXNbaW5kXS5yZXBsYWNlKC9cXFtcXGQqXFxdL2csIFwiXCIpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gYXJyO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBCdWlsZGVyKFxyXG4gICAgICAgIHNoYWRlck5hbWU6IHN0cmluZyxcclxuICAgICAgICB1bmlmb3Jtczogc3RyaW5nW10sXHJcbiAgICAgICAgdW5pZm9ybUJ1ZmZlcnM6IHN0cmluZ1tdLFxyXG4gICAgICAgIHNhbXBsZXJzOiBzdHJpbmdbXSxcclxuICAgICAgICBkZWZpbmVzOiBNYXRlcmlhbERlZmluZXMgfCBzdHJpbmdbXSxcclxuICAgICAgICBhdHRyaWJ1dGVzPzogc3RyaW5nW10sXHJcbiAgICAgICAgb3B0aW9ucz86IElDdXN0b21TaGFkZXJOYW1lUmVzb2x2ZU9wdGlvbnNcclxuICAgICk6IHN0cmluZyB7XHJcbiAgICAgICAgaWYgKG9wdGlvbnMpIHtcclxuICAgICAgICAgICAgY29uc3QgY3VycmVudFByb2Nlc3NpbmcgPSBvcHRpb25zLnByb2Nlc3NGaW5hbENvZGU7XHJcbiAgICAgICAgICAgIG9wdGlvbnMucHJvY2Vzc0ZpbmFsQ29kZSA9ICh0eXBlOiBzdHJpbmcsIGNvZGU6IHN0cmluZykgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGUgPT09IFwidmVydGV4XCIpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY3VycmVudFByb2Nlc3NpbmcgPyBjdXJyZW50UHJvY2Vzc2luZyh0eXBlLCBjb2RlKSA6IGNvZGU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjb25zdCBzY2kgPSBuZXcgU2hhZGVyQ29kZUlubGluZXIoY29kZSk7XHJcbiAgICAgICAgICAgICAgICBzY2kuaW5saW5lVG9rZW4gPSBcIiNkZWZpbmUgcGJyX2lubGluZVwiO1xyXG4gICAgICAgICAgICAgICAgc2NpLnByb2Nlc3NDb2RlKCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gY3VycmVudFByb2Nlc3NpbmcgPyBjdXJyZW50UHJvY2Vzc2luZyh0eXBlLCBzY2kuY29kZSkgOiBzY2kuY29kZTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChhdHRyaWJ1dGVzICYmIHRoaXMuX2N1c3RvbUF0dHJpYnV0ZXMgJiYgdGhpcy5fY3VzdG9tQXR0cmlidXRlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIGF0dHJpYnV0ZXMucHVzaCguLi50aGlzLl9jdXN0b21BdHRyaWJ1dGVzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuUmV2aWV3VW5pZm9ybShcInVuaWZvcm1cIiwgdW5pZm9ybXMpO1xyXG4gICAgICAgIHRoaXMuUmV2aWV3VW5pZm9ybShcInNhbXBsZXJcIiwgc2FtcGxlcnMpO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5faXNDcmVhdGVkU2hhZGVyKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9jcmVhdGVkU2hhZGVyTmFtZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5faXNDcmVhdGVkU2hhZGVyID0gZmFsc2U7XHJcblxyXG4gICAgICAgIFBCUkN1c3RvbU1hdGVyaWFsLlNoYWRlckluZGV4ZXIrKztcclxuICAgICAgICBjb25zdCBuYW1lOiBzdHJpbmcgPSBcImN1c3RvbV9cIiArIFBCUkN1c3RvbU1hdGVyaWFsLlNoYWRlckluZGV4ZXI7XHJcblxyXG4gICAgICAgIGNvbnN0IGZuX2FmdGVyQmluZCA9IHRoaXMuX2FmdGVyQmluZC5iaW5kKHRoaXMpO1xyXG4gICAgICAgIHRoaXMuX2FmdGVyQmluZCA9IChtLCBlKSA9PiB7XHJcbiAgICAgICAgICAgIGlmICghZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuQXR0YWNoQWZ0ZXJCaW5kKG0sIGUpO1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgZm5fYWZ0ZXJCaW5kKG0sIGUpO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7fVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIEVmZmVjdC5TaGFkZXJzU3RvcmVbbmFtZSArIFwiVmVydGV4U2hhZGVyXCJdID0gdGhpcy5WZXJ0ZXhTaGFkZXIucmVwbGFjZShcIiNkZWZpbmUgQ1VTVE9NX1ZFUlRFWF9CRUdJTlwiLCB0aGlzLkN1c3RvbVBhcnRzLlZlcnRleF9CZWdpbiA/IHRoaXMuQ3VzdG9tUGFydHMuVmVydGV4X0JlZ2luIDogXCJcIilcclxuICAgICAgICAgICAgLnJlcGxhY2UoXHJcbiAgICAgICAgICAgICAgICBcIiNkZWZpbmUgQ1VTVE9NX1ZFUlRFWF9ERUZJTklUSU9OU1wiLFxyXG4gICAgICAgICAgICAgICAgKHRoaXMuX2N1c3RvbVVuaWZvcm0gPyB0aGlzLl9jdXN0b21Vbmlmb3JtLmpvaW4oXCJcXG5cIikgOiBcIlwiKSArICh0aGlzLkN1c3RvbVBhcnRzLlZlcnRleF9EZWZpbml0aW9ucyA/IHRoaXMuQ3VzdG9tUGFydHMuVmVydGV4X0RlZmluaXRpb25zIDogXCJcIilcclxuICAgICAgICAgICAgKVxyXG4gICAgICAgICAgICAucmVwbGFjZShcIiNkZWZpbmUgQ1VTVE9NX1ZFUlRFWF9NQUlOX0JFR0lOXCIsIHRoaXMuQ3VzdG9tUGFydHMuVmVydGV4X01haW5CZWdpbiA/IHRoaXMuQ3VzdG9tUGFydHMuVmVydGV4X01haW5CZWdpbiA6IFwiXCIpXHJcbiAgICAgICAgICAgIC5yZXBsYWNlKFwiI2RlZmluZSBDVVNUT01fVkVSVEVYX1VQREFURV9QT1NJVElPTlwiLCB0aGlzLkN1c3RvbVBhcnRzLlZlcnRleF9CZWZvcmVfUG9zaXRpb25VcGRhdGVkID8gdGhpcy5DdXN0b21QYXJ0cy5WZXJ0ZXhfQmVmb3JlX1Bvc2l0aW9uVXBkYXRlZCA6IFwiXCIpXHJcbiAgICAgICAgICAgIC5yZXBsYWNlKFwiI2RlZmluZSBDVVNUT01fVkVSVEVYX1VQREFURV9OT1JNQUxcIiwgdGhpcy5DdXN0b21QYXJ0cy5WZXJ0ZXhfQmVmb3JlX05vcm1hbFVwZGF0ZWQgPyB0aGlzLkN1c3RvbVBhcnRzLlZlcnRleF9CZWZvcmVfTm9ybWFsVXBkYXRlZCA6IFwiXCIpXHJcbiAgICAgICAgICAgIC5yZXBsYWNlKFwiI2RlZmluZSBDVVNUT01fVkVSVEVYX01BSU5fRU5EXCIsIHRoaXMuQ3VzdG9tUGFydHMuVmVydGV4X01haW5FbmQgPyB0aGlzLkN1c3RvbVBhcnRzLlZlcnRleF9NYWluRW5kIDogXCJcIik7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLkN1c3RvbVBhcnRzLlZlcnRleF9BZnRlcl9Xb3JsZFBvc0NvbXB1dGVkKSB7XHJcbiAgICAgICAgICAgIEVmZmVjdC5TaGFkZXJzU3RvcmVbbmFtZSArIFwiVmVydGV4U2hhZGVyXCJdID0gRWZmZWN0LlNoYWRlcnNTdG9yZVtuYW1lICsgXCJWZXJ0ZXhTaGFkZXJcIl0ucmVwbGFjZShcclxuICAgICAgICAgICAgICAgIFwiI2RlZmluZSBDVVNUT01fVkVSVEVYX1VQREFURV9XT1JMRFBPU1wiLFxyXG4gICAgICAgICAgICAgICAgdGhpcy5DdXN0b21QYXJ0cy5WZXJ0ZXhfQWZ0ZXJfV29ybGRQb3NDb21wdXRlZFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgRWZmZWN0LlNoYWRlcnNTdG9yZVtuYW1lICsgXCJQaXhlbFNoYWRlclwiXSA9IHRoaXMuRnJhZ21lbnRTaGFkZXIucmVwbGFjZShcclxuICAgICAgICAgICAgXCIjZGVmaW5lIENVU1RPTV9GUkFHTUVOVF9CRUdJTlwiLFxyXG4gICAgICAgICAgICB0aGlzLkN1c3RvbVBhcnRzLkZyYWdtZW50X0JlZ2luID8gdGhpcy5DdXN0b21QYXJ0cy5GcmFnbWVudF9CZWdpbiA6IFwiXCJcclxuICAgICAgICApXHJcbiAgICAgICAgICAgIC5yZXBsYWNlKFwiI2RlZmluZSBDVVNUT01fRlJBR01FTlRfTUFJTl9CRUdJTlwiLCB0aGlzLkN1c3RvbVBhcnRzLkZyYWdtZW50X01haW5CZWdpbiA/IHRoaXMuQ3VzdG9tUGFydHMuRnJhZ21lbnRfTWFpbkJlZ2luIDogXCJcIilcclxuICAgICAgICAgICAgLnJlcGxhY2UoXHJcbiAgICAgICAgICAgICAgICBcIiNkZWZpbmUgQ1VTVE9NX0ZSQUdNRU5UX0RFRklOSVRJT05TXCIsXHJcbiAgICAgICAgICAgICAgICAodGhpcy5fY3VzdG9tVW5pZm9ybSA/IHRoaXMuX2N1c3RvbVVuaWZvcm0uam9pbihcIlxcblwiKSA6IFwiXCIpICsgKHRoaXMuQ3VzdG9tUGFydHMuRnJhZ21lbnRfRGVmaW5pdGlvbnMgPyB0aGlzLkN1c3RvbVBhcnRzLkZyYWdtZW50X0RlZmluaXRpb25zIDogXCJcIilcclxuICAgICAgICAgICAgKVxyXG4gICAgICAgICAgICAucmVwbGFjZShcIiNkZWZpbmUgQ1VTVE9NX0ZSQUdNRU5UX1VQREFURV9BTEJFRE9cIiwgdGhpcy5DdXN0b21QYXJ0cy5GcmFnbWVudF9DdXN0b21fQWxiZWRvID8gdGhpcy5DdXN0b21QYXJ0cy5GcmFnbWVudF9DdXN0b21fQWxiZWRvIDogXCJcIilcclxuICAgICAgICAgICAgLnJlcGxhY2UoXCIjZGVmaW5lIENVU1RPTV9GUkFHTUVOVF9VUERBVEVfQUxQSEFcIiwgdGhpcy5DdXN0b21QYXJ0cy5GcmFnbWVudF9DdXN0b21fQWxwaGEgPyB0aGlzLkN1c3RvbVBhcnRzLkZyYWdtZW50X0N1c3RvbV9BbHBoYSA6IFwiXCIpXHJcbiAgICAgICAgICAgIC5yZXBsYWNlKFwiI2RlZmluZSBDVVNUT01fRlJBR01FTlRfQkVGT1JFX0xJR0hUU1wiLCB0aGlzLkN1c3RvbVBhcnRzLkZyYWdtZW50X0JlZm9yZV9MaWdodHMgPyB0aGlzLkN1c3RvbVBhcnRzLkZyYWdtZW50X0JlZm9yZV9MaWdodHMgOiBcIlwiKVxyXG4gICAgICAgICAgICAucmVwbGFjZShcclxuICAgICAgICAgICAgICAgIFwiI2RlZmluZSBDVVNUT01fRlJBR01FTlRfVVBEQVRFX01FVEFMTElDUk9VR0hORVNTXCIsXHJcbiAgICAgICAgICAgICAgICB0aGlzLkN1c3RvbVBhcnRzLkZyYWdtZW50X0N1c3RvbV9NZXRhbGxpY1JvdWdobmVzcyA/IHRoaXMuQ3VzdG9tUGFydHMuRnJhZ21lbnRfQ3VzdG9tX01ldGFsbGljUm91Z2huZXNzIDogXCJcIlxyXG4gICAgICAgICAgICApXHJcbiAgICAgICAgICAgIC5yZXBsYWNlKFwiI2RlZmluZSBDVVNUT01fRlJBR01FTlRfVVBEQVRFX01JQ1JPU1VSRkFDRVwiLCB0aGlzLkN1c3RvbVBhcnRzLkZyYWdtZW50X0N1c3RvbV9NaWNyb1N1cmZhY2UgPyB0aGlzLkN1c3RvbVBhcnRzLkZyYWdtZW50X0N1c3RvbV9NaWNyb1N1cmZhY2UgOiBcIlwiKVxyXG4gICAgICAgICAgICAucmVwbGFjZShcclxuICAgICAgICAgICAgICAgIFwiI2RlZmluZSBDVVNUT01fRlJBR01FTlRfQkVGT1JFX0ZJTkFMQ09MT1JDT01QT1NJVElPTlwiLFxyXG4gICAgICAgICAgICAgICAgdGhpcy5DdXN0b21QYXJ0cy5GcmFnbWVudF9CZWZvcmVfRmluYWxDb2xvckNvbXBvc2l0aW9uID8gdGhpcy5DdXN0b21QYXJ0cy5GcmFnbWVudF9CZWZvcmVfRmluYWxDb2xvckNvbXBvc2l0aW9uIDogXCJcIlxyXG4gICAgICAgICAgICApXHJcbiAgICAgICAgICAgIC5yZXBsYWNlKFwiI2RlZmluZSBDVVNUT01fRlJBR01FTlRfQkVGT1JFX0ZSQUdDT0xPUlwiLCB0aGlzLkN1c3RvbVBhcnRzLkZyYWdtZW50X0JlZm9yZV9GcmFnQ29sb3IgPyB0aGlzLkN1c3RvbVBhcnRzLkZyYWdtZW50X0JlZm9yZV9GcmFnQ29sb3IgOiBcIlwiKVxyXG4gICAgICAgICAgICAucmVwbGFjZShcIiNkZWZpbmUgQ1VTVE9NX0ZSQUdNRU5UX01BSU5fRU5EXCIsIHRoaXMuQ3VzdG9tUGFydHMuRnJhZ21lbnRfTWFpbkVuZCA/IHRoaXMuQ3VzdG9tUGFydHMuRnJhZ21lbnRfTWFpbkVuZCA6IFwiXCIpO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5DdXN0b21QYXJ0cy5GcmFnbWVudF9CZWZvcmVfRm9nKSB7XHJcbiAgICAgICAgICAgIEVmZmVjdC5TaGFkZXJzU3RvcmVbbmFtZSArIFwiUGl4ZWxTaGFkZXJcIl0gPSBFZmZlY3QuU2hhZGVyc1N0b3JlW25hbWUgKyBcIlBpeGVsU2hhZGVyXCJdLnJlcGxhY2UoXHJcbiAgICAgICAgICAgICAgICBcIiNkZWZpbmUgQ1VTVE9NX0ZSQUdNRU5UX0JFRk9SRV9GT0dcIixcclxuICAgICAgICAgICAgICAgIHRoaXMuQ3VzdG9tUGFydHMuRnJhZ21lbnRfQmVmb3JlX0ZvZ1xyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5faXNDcmVhdGVkU2hhZGVyID0gdHJ1ZTtcclxuICAgICAgICB0aGlzLl9jcmVhdGVkU2hhZGVyTmFtZSA9IG5hbWU7XHJcblxyXG4gICAgICAgIHJldHVybiBuYW1lO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0cnVjdG9yKG5hbWU6IHN0cmluZywgc2NlbmU/OiBTY2VuZSkge1xyXG4gICAgICAgIHN1cGVyKG5hbWUsIHNjZW5lKTtcclxuICAgICAgICB0aGlzLkN1c3RvbVBhcnRzID0gbmV3IFNoYWRlckFsYmVkb1BhcnRzKCk7XHJcbiAgICAgICAgdGhpcy5jdXN0b21TaGFkZXJOYW1lUmVzb2x2ZSA9IHRoaXMuQnVpbGRlcjtcclxuXHJcbiAgICAgICAgdGhpcy5GcmFnbWVudFNoYWRlciA9IEVmZmVjdC5TaGFkZXJzU3RvcmVbXCJwYnJQaXhlbFNoYWRlclwiXTtcclxuICAgICAgICB0aGlzLlZlcnRleFNoYWRlciA9IEVmZmVjdC5TaGFkZXJzU3RvcmVbXCJwYnJWZXJ0ZXhTaGFkZXJcIl07XHJcblxyXG4gICAgICAgIHRoaXMuRnJhZ21lbnRTaGFkZXIgPSB0aGlzLkZyYWdtZW50U2hhZGVyLnJlcGxhY2UoLyNpbmNsdWRlPHBickJsb2NrQWxiZWRvT3BhY2l0eT4vZywgRWZmZWN0LkluY2x1ZGVzU2hhZGVyc1N0b3JlW1wicGJyQmxvY2tBbGJlZG9PcGFjaXR5XCJdKTtcclxuICAgICAgICB0aGlzLkZyYWdtZW50U2hhZGVyID0gdGhpcy5GcmFnbWVudFNoYWRlci5yZXBsYWNlKC8jaW5jbHVkZTxwYnJCbG9ja1JlZmxlY3Rpdml0eT4vZywgRWZmZWN0LkluY2x1ZGVzU2hhZGVyc1N0b3JlW1wicGJyQmxvY2tSZWZsZWN0aXZpdHlcIl0pO1xyXG4gICAgICAgIHRoaXMuRnJhZ21lbnRTaGFkZXIgPSB0aGlzLkZyYWdtZW50U2hhZGVyLnJlcGxhY2UoLyNpbmNsdWRlPHBickJsb2NrRmluYWxDb2xvckNvbXBvc2l0aW9uPi9nLCBFZmZlY3QuSW5jbHVkZXNTaGFkZXJzU3RvcmVbXCJwYnJCbG9ja0ZpbmFsQ29sb3JDb21wb3NpdGlvblwiXSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIEFkZFVuaWZvcm0obmFtZTogc3RyaW5nLCBraW5kOiBzdHJpbmcsIHBhcmFtOiBhbnkpOiBQQlJDdXN0b21NYXRlcmlhbCB7XHJcbiAgICAgICAgaWYgKCF0aGlzLl9jdXN0b21Vbmlmb3JtKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2N1c3RvbVVuaWZvcm0gPSBuZXcgQXJyYXkoKTtcclxuICAgICAgICAgICAgdGhpcy5fbmV3VW5pZm9ybXMgPSBuZXcgQXJyYXkoKTtcclxuICAgICAgICAgICAgdGhpcy5fbmV3U2FtcGxlckluc3RhbmNlcyA9IHt9O1xyXG4gICAgICAgICAgICB0aGlzLl9uZXdVbmlmb3JtSW5zdGFuY2VzID0ge307XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChwYXJhbSkge1xyXG4gICAgICAgICAgICBpZiAoa2luZC5pbmRleE9mKFwic2FtcGxlclwiKSAhPSAtMSkge1xyXG4gICAgICAgICAgICAgICAgKDxhbnk+dGhpcy5fbmV3U2FtcGxlckluc3RhbmNlcylba2luZCArIFwiLVwiICsgbmFtZV0gPSBwYXJhbTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICg8YW55PnRoaXMuX25ld1VuaWZvcm1JbnN0YW5jZXMpW2tpbmQgKyBcIi1cIiArIG5hbWVdID0gcGFyYW07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5fY3VzdG9tVW5pZm9ybS5wdXNoKFwidW5pZm9ybSBcIiArIGtpbmQgKyBcIiBcIiArIG5hbWUgKyBcIjtcIik7XHJcbiAgICAgICAgdGhpcy5fbmV3VW5pZm9ybXMucHVzaChuYW1lKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIEFkZEF0dHJpYnV0ZShuYW1lOiBzdHJpbmcpOiBQQlJDdXN0b21NYXRlcmlhbCB7XHJcbiAgICAgICAgaWYgKCF0aGlzLl9jdXN0b21BdHRyaWJ1dGVzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2N1c3RvbUF0dHJpYnV0ZXMgPSBbXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuX2N1c3RvbUF0dHJpYnV0ZXMucHVzaChuYW1lKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIEZyYWdtZW50X0JlZ2luKHNoYWRlclBhcnQ6IHN0cmluZyk6IFBCUkN1c3RvbU1hdGVyaWFsIHtcclxuICAgICAgICB0aGlzLkN1c3RvbVBhcnRzLkZyYWdtZW50X0JlZ2luID0gc2hhZGVyUGFydDtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgRnJhZ21lbnRfRGVmaW5pdGlvbnMoc2hhZGVyUGFydDogc3RyaW5nKTogUEJSQ3VzdG9tTWF0ZXJpYWwge1xyXG4gICAgICAgIHRoaXMuQ3VzdG9tUGFydHMuRnJhZ21lbnRfRGVmaW5pdGlvbnMgPSBzaGFkZXJQYXJ0O1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBGcmFnbWVudF9NYWluQmVnaW4oc2hhZGVyUGFydDogc3RyaW5nKTogUEJSQ3VzdG9tTWF0ZXJpYWwge1xyXG4gICAgICAgIHRoaXMuQ3VzdG9tUGFydHMuRnJhZ21lbnRfTWFpbkJlZ2luID0gc2hhZGVyUGFydDtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgRnJhZ21lbnRfQ3VzdG9tX0FsYmVkbyhzaGFkZXJQYXJ0OiBzdHJpbmcpOiBQQlJDdXN0b21NYXRlcmlhbCB7XHJcbiAgICAgICAgdGhpcy5DdXN0b21QYXJ0cy5GcmFnbWVudF9DdXN0b21fQWxiZWRvID0gc2hhZGVyUGFydC5yZXBsYWNlKFwicmVzdWx0XCIsIFwic3VyZmFjZUFsYmVkb1wiKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgRnJhZ21lbnRfQ3VzdG9tX0FscGhhKHNoYWRlclBhcnQ6IHN0cmluZyk6IFBCUkN1c3RvbU1hdGVyaWFsIHtcclxuICAgICAgICB0aGlzLkN1c3RvbVBhcnRzLkZyYWdtZW50X0N1c3RvbV9BbHBoYSA9IHNoYWRlclBhcnQucmVwbGFjZShcInJlc3VsdFwiLCBcImFscGhhXCIpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBGcmFnbWVudF9CZWZvcmVfTGlnaHRzKHNoYWRlclBhcnQ6IHN0cmluZyk6IFBCUkN1c3RvbU1hdGVyaWFsIHtcclxuICAgICAgICB0aGlzLkN1c3RvbVBhcnRzLkZyYWdtZW50X0JlZm9yZV9MaWdodHMgPSBzaGFkZXJQYXJ0O1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBGcmFnbWVudF9DdXN0b21fTWV0YWxsaWNSb3VnaG5lc3Moc2hhZGVyUGFydDogc3RyaW5nKTogUEJSQ3VzdG9tTWF0ZXJpYWwge1xyXG4gICAgICAgIHRoaXMuQ3VzdG9tUGFydHMuRnJhZ21lbnRfQ3VzdG9tX01ldGFsbGljUm91Z2huZXNzID0gc2hhZGVyUGFydDtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgRnJhZ21lbnRfQ3VzdG9tX01pY3JvU3VyZmFjZShzaGFkZXJQYXJ0OiBzdHJpbmcpOiBQQlJDdXN0b21NYXRlcmlhbCB7XHJcbiAgICAgICAgdGhpcy5DdXN0b21QYXJ0cy5GcmFnbWVudF9DdXN0b21fTWljcm9TdXJmYWNlID0gc2hhZGVyUGFydDtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgRnJhZ21lbnRfQmVmb3JlX0ZvZyhzaGFkZXJQYXJ0OiBzdHJpbmcpOiBQQlJDdXN0b21NYXRlcmlhbCB7XHJcbiAgICAgICAgdGhpcy5DdXN0b21QYXJ0cy5GcmFnbWVudF9CZWZvcmVfRm9nID0gc2hhZGVyUGFydDtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgRnJhZ21lbnRfQmVmb3JlX0ZpbmFsQ29sb3JDb21wb3NpdGlvbihzaGFkZXJQYXJ0OiBzdHJpbmcpOiBQQlJDdXN0b21NYXRlcmlhbCB7XHJcbiAgICAgICAgdGhpcy5DdXN0b21QYXJ0cy5GcmFnbWVudF9CZWZvcmVfRmluYWxDb2xvckNvbXBvc2l0aW9uID0gc2hhZGVyUGFydDtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgRnJhZ21lbnRfQmVmb3JlX0ZyYWdDb2xvcihzaGFkZXJQYXJ0OiBzdHJpbmcpOiBQQlJDdXN0b21NYXRlcmlhbCB7XHJcbiAgICAgICAgdGhpcy5DdXN0b21QYXJ0cy5GcmFnbWVudF9CZWZvcmVfRnJhZ0NvbG9yID0gc2hhZGVyUGFydC5yZXBsYWNlKFwicmVzdWx0XCIsIFwiY29sb3JcIik7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIEZyYWdtZW50X01haW5FbmQoc2hhZGVyUGFydDogc3RyaW5nKTogUEJSQ3VzdG9tTWF0ZXJpYWwge1xyXG4gICAgICAgIHRoaXMuQ3VzdG9tUGFydHMuRnJhZ21lbnRfTWFpbkVuZCA9IHNoYWRlclBhcnQ7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIFZlcnRleF9CZWdpbihzaGFkZXJQYXJ0OiBzdHJpbmcpOiBQQlJDdXN0b21NYXRlcmlhbCB7XHJcbiAgICAgICAgdGhpcy5DdXN0b21QYXJ0cy5WZXJ0ZXhfQmVnaW4gPSBzaGFkZXJQYXJ0O1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBWZXJ0ZXhfRGVmaW5pdGlvbnMoc2hhZGVyUGFydDogc3RyaW5nKTogUEJSQ3VzdG9tTWF0ZXJpYWwge1xyXG4gICAgICAgIHRoaXMuQ3VzdG9tUGFydHMuVmVydGV4X0RlZmluaXRpb25zID0gc2hhZGVyUGFydDtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgVmVydGV4X01haW5CZWdpbihzaGFkZXJQYXJ0OiBzdHJpbmcpOiBQQlJDdXN0b21NYXRlcmlhbCB7XHJcbiAgICAgICAgdGhpcy5DdXN0b21QYXJ0cy5WZXJ0ZXhfTWFpbkJlZ2luID0gc2hhZGVyUGFydDtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgVmVydGV4X0JlZm9yZV9Qb3NpdGlvblVwZGF0ZWQoc2hhZGVyUGFydDogc3RyaW5nKTogUEJSQ3VzdG9tTWF0ZXJpYWwge1xyXG4gICAgICAgIHRoaXMuQ3VzdG9tUGFydHMuVmVydGV4X0JlZm9yZV9Qb3NpdGlvblVwZGF0ZWQgPSBzaGFkZXJQYXJ0LnJlcGxhY2UoXCJyZXN1bHRcIiwgXCJwb3NpdGlvblVwZGF0ZWRcIik7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIFZlcnRleF9CZWZvcmVfTm9ybWFsVXBkYXRlZChzaGFkZXJQYXJ0OiBzdHJpbmcpOiBQQlJDdXN0b21NYXRlcmlhbCB7XHJcbiAgICAgICAgdGhpcy5DdXN0b21QYXJ0cy5WZXJ0ZXhfQmVmb3JlX05vcm1hbFVwZGF0ZWQgPSBzaGFkZXJQYXJ0LnJlcGxhY2UoXCJyZXN1bHRcIiwgXCJub3JtYWxVcGRhdGVkXCIpO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBWZXJ0ZXhfQWZ0ZXJfV29ybGRQb3NDb21wdXRlZChzaGFkZXJQYXJ0OiBzdHJpbmcpOiBQQlJDdXN0b21NYXRlcmlhbCB7XHJcbiAgICAgICAgdGhpcy5DdXN0b21QYXJ0cy5WZXJ0ZXhfQWZ0ZXJfV29ybGRQb3NDb21wdXRlZCA9IHNoYWRlclBhcnQ7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIFZlcnRleF9NYWluRW5kKHNoYWRlclBhcnQ6IHN0cmluZyk6IFBCUkN1c3RvbU1hdGVyaWFsIHtcclxuICAgICAgICB0aGlzLkN1c3RvbVBhcnRzLlZlcnRleF9NYWluRW5kID0gc2hhZGVyUGFydDtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxufVxyXG5cclxuUmVnaXN0ZXJDbGFzcyhcIkJBQllMT04uUEJSQ3VzdG9tTWF0ZXJpYWxcIiwgUEJSQ3VzdG9tTWF0ZXJpYWwpO1xyXG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBpbXBvcnQvbm8taW50ZXJuYWwtbW9kdWxlcyAqL1xyXG5pbXBvcnQgKiBhcyBNYXRMaWIgZnJvbSBcIm1hdGVyaWFscy9jdXN0b20vaW5kZXhcIjtcclxuXHJcbi8qKlxyXG4gKiBUaGlzIGlzIHRoZSBlbnRyeSBwb2ludCBmb3IgdGhlIFVNRCBtb2R1bGUuXHJcbiAqIFRoZSBlbnRyeSBwb2ludCBmb3IgYSBmdXR1cmUgRVNNIHBhY2thZ2Ugc2hvdWxkIGJlIGluZGV4LnRzXHJcbiAqL1xyXG5jb25zdCBnbG9iYWxPYmplY3QgPSB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHVuZGVmaW5lZDtcclxuaWYgKHR5cGVvZiBnbG9iYWxPYmplY3QgIT09IFwidW5kZWZpbmVkXCIpIHtcclxuICAgIGZvciAoY29uc3Qga2V5IGluIE1hdExpYikge1xyXG4gICAgICAgICg8YW55Pmdsb2JhbE9iamVjdCkuQkFCWUxPTltrZXldID0gKDxhbnk+TWF0TGliKVtrZXldO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgKiBmcm9tIFwibWF0ZXJpYWxzL2N1c3RvbS9pbmRleFwiO1xyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IF9fV0VCUEFDS19FWFRFUk5BTF9NT0RVTEVfYmFieWxvbmpzX01hdGVyaWFsc19lZmZlY3RfXzsiLCIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5Db3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi5cblxuUGVybWlzc2lvbiB0byB1c2UsIGNvcHksIG1vZGlmeSwgYW5kL29yIGRpc3RyaWJ1dGUgdGhpcyBzb2Z0d2FyZSBmb3IgYW55XG5wdXJwb3NlIHdpdGggb3Igd2l0aG91dCBmZWUgaXMgaGVyZWJ5IGdyYW50ZWQuXG5cblRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIgQU5EIFRIRSBBVVRIT1IgRElTQ0xBSU1TIEFMTCBXQVJSQU5USUVTIFdJVEhcblJFR0FSRCBUTyBUSElTIFNPRlRXQVJFIElOQ0xVRElORyBBTEwgSU1QTElFRCBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWVxuQU5EIEZJVE5FU1MuIElOIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1IgQkUgTElBQkxFIEZPUiBBTlkgU1BFQ0lBTCwgRElSRUNULFxuSU5ESVJFQ1QsIE9SIENPTlNFUVVFTlRJQUwgREFNQUdFUyBPUiBBTlkgREFNQUdFUyBXSEFUU09FVkVSIFJFU1VMVElORyBGUk9NXG5MT1NTIE9GIFVTRSwgREFUQSBPUiBQUk9GSVRTLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgTkVHTElHRU5DRSBPUlxuT1RIRVIgVE9SVElPVVMgQUNUSU9OLCBBUklTSU5HIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFVTRSBPUlxuUEVSRk9STUFOQ0UgT0YgVEhJUyBTT0ZUV0FSRS5cbioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqICovXG4vKiBnbG9iYWwgUmVmbGVjdCwgUHJvbWlzZSwgU3VwcHJlc3NlZEVycm9yLCBTeW1ib2wgKi9cblxudmFyIGV4dGVuZFN0YXRpY3MgPSBmdW5jdGlvbihkLCBiKSB7XG4gIGV4dGVuZFN0YXRpY3MgPSBPYmplY3Quc2V0UHJvdG90eXBlT2YgfHxcbiAgICAgICh7IF9fcHJvdG9fXzogW10gfSBpbnN0YW5jZW9mIEFycmF5ICYmIGZ1bmN0aW9uIChkLCBiKSB7IGQuX19wcm90b19fID0gYjsgfSkgfHxcbiAgICAgIGZ1bmN0aW9uIChkLCBiKSB7IGZvciAodmFyIHAgaW4gYikgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChiLCBwKSkgZFtwXSA9IGJbcF07IH07XG4gIHJldHVybiBleHRlbmRTdGF0aWNzKGQsIGIpO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIF9fZXh0ZW5kcyhkLCBiKSB7XG4gIGlmICh0eXBlb2YgYiAhPT0gXCJmdW5jdGlvblwiICYmIGIgIT09IG51bGwpXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2xhc3MgZXh0ZW5kcyB2YWx1ZSBcIiArIFN0cmluZyhiKSArIFwiIGlzIG5vdCBhIGNvbnN0cnVjdG9yIG9yIG51bGxcIik7XG4gIGV4dGVuZFN0YXRpY3MoZCwgYik7XG4gIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxuICBkLnByb3RvdHlwZSA9IGIgPT09IG51bGwgPyBPYmplY3QuY3JlYXRlKGIpIDogKF9fLnByb3RvdHlwZSA9IGIucHJvdG90eXBlLCBuZXcgX18oKSk7XG59XG5cbmV4cG9ydCB2YXIgX19hc3NpZ24gPSBmdW5jdGlvbigpIHtcbiAgX19hc3NpZ24gPSBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uIF9fYXNzaWduKHQpIHtcbiAgICAgIGZvciAodmFyIHMsIGkgPSAxLCBuID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IG47IGkrKykge1xuICAgICAgICAgIHMgPSBhcmd1bWVudHNbaV07XG4gICAgICAgICAgZm9yICh2YXIgcCBpbiBzKSBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHMsIHApKSB0W3BdID0gc1twXTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0O1xuICB9XG4gIHJldHVybiBfX2Fzc2lnbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gX19yZXN0KHMsIGUpIHtcbiAgdmFyIHQgPSB7fTtcbiAgZm9yICh2YXIgcCBpbiBzKSBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHMsIHApICYmIGUuaW5kZXhPZihwKSA8IDApXG4gICAgICB0W3BdID0gc1twXTtcbiAgaWYgKHMgIT0gbnVsbCAmJiB0eXBlb2YgT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyA9PT0gXCJmdW5jdGlvblwiKVxuICAgICAgZm9yICh2YXIgaSA9IDAsIHAgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKHMpOyBpIDwgcC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmIChlLmluZGV4T2YocFtpXSkgPCAwICYmIE9iamVjdC5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGUuY2FsbChzLCBwW2ldKSlcbiAgICAgICAgICAgICAgdFtwW2ldXSA9IHNbcFtpXV07XG4gICAgICB9XG4gIHJldHVybiB0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gX19kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xuICB2YXIgYyA9IGFyZ3VtZW50cy5sZW5ndGgsIHIgPSBjIDwgMyA/IHRhcmdldCA6IGRlc2MgPT09IG51bGwgPyBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGtleSkgOiBkZXNjLCBkO1xuICBpZiAodHlwZW9mIFJlZmxlY3QgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIFJlZmxlY3QuZGVjb3JhdGUgPT09IFwiZnVuY3Rpb25cIikgciA9IFJlZmxlY3QuZGVjb3JhdGUoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpO1xuICBlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xuICByZXR1cm4gYyA+IDMgJiYgciAmJiBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIHIpLCByO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gX19wYXJhbShwYXJhbUluZGV4LCBkZWNvcmF0b3IpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uICh0YXJnZXQsIGtleSkgeyBkZWNvcmF0b3IodGFyZ2V0LCBrZXksIHBhcmFtSW5kZXgpOyB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfX2VzRGVjb3JhdGUoY3RvciwgZGVzY3JpcHRvckluLCBkZWNvcmF0b3JzLCBjb250ZXh0SW4sIGluaXRpYWxpemVycywgZXh0cmFJbml0aWFsaXplcnMpIHtcbiAgZnVuY3Rpb24gYWNjZXB0KGYpIHsgaWYgKGYgIT09IHZvaWQgMCAmJiB0eXBlb2YgZiAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiRnVuY3Rpb24gZXhwZWN0ZWRcIik7IHJldHVybiBmOyB9XG4gIHZhciBraW5kID0gY29udGV4dEluLmtpbmQsIGtleSA9IGtpbmQgPT09IFwiZ2V0dGVyXCIgPyBcImdldFwiIDoga2luZCA9PT0gXCJzZXR0ZXJcIiA/IFwic2V0XCIgOiBcInZhbHVlXCI7XG4gIHZhciB0YXJnZXQgPSAhZGVzY3JpcHRvckluICYmIGN0b3IgPyBjb250ZXh0SW5bXCJzdGF0aWNcIl0gPyBjdG9yIDogY3Rvci5wcm90b3R5cGUgOiBudWxsO1xuICB2YXIgZGVzY3JpcHRvciA9IGRlc2NyaXB0b3JJbiB8fCAodGFyZ2V0ID8gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGNvbnRleHRJbi5uYW1lKSA6IHt9KTtcbiAgdmFyIF8sIGRvbmUgPSBmYWxzZTtcbiAgZm9yICh2YXIgaSA9IGRlY29yYXRvcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgIHZhciBjb250ZXh0ID0ge307XG4gICAgICBmb3IgKHZhciBwIGluIGNvbnRleHRJbikgY29udGV4dFtwXSA9IHAgPT09IFwiYWNjZXNzXCIgPyB7fSA6IGNvbnRleHRJbltwXTtcbiAgICAgIGZvciAodmFyIHAgaW4gY29udGV4dEluLmFjY2VzcykgY29udGV4dC5hY2Nlc3NbcF0gPSBjb250ZXh0SW4uYWNjZXNzW3BdO1xuICAgICAgY29udGV4dC5hZGRJbml0aWFsaXplciA9IGZ1bmN0aW9uIChmKSB7IGlmIChkb25lKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGFkZCBpbml0aWFsaXplcnMgYWZ0ZXIgZGVjb3JhdGlvbiBoYXMgY29tcGxldGVkXCIpOyBleHRyYUluaXRpYWxpemVycy5wdXNoKGFjY2VwdChmIHx8IG51bGwpKTsgfTtcbiAgICAgIHZhciByZXN1bHQgPSAoMCwgZGVjb3JhdG9yc1tpXSkoa2luZCA9PT0gXCJhY2Nlc3NvclwiID8geyBnZXQ6IGRlc2NyaXB0b3IuZ2V0LCBzZXQ6IGRlc2NyaXB0b3Iuc2V0IH0gOiBkZXNjcmlwdG9yW2tleV0sIGNvbnRleHQpO1xuICAgICAgaWYgKGtpbmQgPT09IFwiYWNjZXNzb3JcIikge1xuICAgICAgICAgIGlmIChyZXN1bHQgPT09IHZvaWQgMCkgY29udGludWU7XG4gICAgICAgICAgaWYgKHJlc3VsdCA9PT0gbnVsbCB8fCB0eXBlb2YgcmVzdWx0ICE9PSBcIm9iamVjdFwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiT2JqZWN0IGV4cGVjdGVkXCIpO1xuICAgICAgICAgIGlmIChfID0gYWNjZXB0KHJlc3VsdC5nZXQpKSBkZXNjcmlwdG9yLmdldCA9IF87XG4gICAgICAgICAgaWYgKF8gPSBhY2NlcHQocmVzdWx0LnNldCkpIGRlc2NyaXB0b3Iuc2V0ID0gXztcbiAgICAgICAgICBpZiAoXyA9IGFjY2VwdChyZXN1bHQuaW5pdCkpIGluaXRpYWxpemVycy51bnNoaWZ0KF8pO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAoXyA9IGFjY2VwdChyZXN1bHQpKSB7XG4gICAgICAgICAgaWYgKGtpbmQgPT09IFwiZmllbGRcIikgaW5pdGlhbGl6ZXJzLnVuc2hpZnQoXyk7XG4gICAgICAgICAgZWxzZSBkZXNjcmlwdG9yW2tleV0gPSBfO1xuICAgICAgfVxuICB9XG4gIGlmICh0YXJnZXQpIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGNvbnRleHRJbi5uYW1lLCBkZXNjcmlwdG9yKTtcbiAgZG9uZSA9IHRydWU7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gX19ydW5Jbml0aWFsaXplcnModGhpc0FyZywgaW5pdGlhbGl6ZXJzLCB2YWx1ZSkge1xuICB2YXIgdXNlVmFsdWUgPSBhcmd1bWVudHMubGVuZ3RoID4gMjtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBpbml0aWFsaXplcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhbHVlID0gdXNlVmFsdWUgPyBpbml0aWFsaXplcnNbaV0uY2FsbCh0aGlzQXJnLCB2YWx1ZSkgOiBpbml0aWFsaXplcnNbaV0uY2FsbCh0aGlzQXJnKTtcbiAgfVxuICByZXR1cm4gdXNlVmFsdWUgPyB2YWx1ZSA6IHZvaWQgMDtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBfX3Byb3BLZXkoeCkge1xuICByZXR1cm4gdHlwZW9mIHggPT09IFwic3ltYm9sXCIgPyB4IDogXCJcIi5jb25jYXQoeCk7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gX19zZXRGdW5jdGlvbk5hbWUoZiwgbmFtZSwgcHJlZml4KSB7XG4gIGlmICh0eXBlb2YgbmFtZSA9PT0gXCJzeW1ib2xcIikgbmFtZSA9IG5hbWUuZGVzY3JpcHRpb24gPyBcIltcIi5jb25jYXQobmFtZS5kZXNjcmlwdGlvbiwgXCJdXCIpIDogXCJcIjtcbiAgcmV0dXJuIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShmLCBcIm5hbWVcIiwgeyBjb25maWd1cmFibGU6IHRydWUsIHZhbHVlOiBwcmVmaXggPyBcIlwiLmNvbmNhdChwcmVmaXgsIFwiIFwiLCBuYW1lKSA6IG5hbWUgfSk7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gX19tZXRhZGF0YShtZXRhZGF0YUtleSwgbWV0YWRhdGFWYWx1ZSkge1xuICBpZiAodHlwZW9mIFJlZmxlY3QgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIFJlZmxlY3QubWV0YWRhdGEgPT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIFJlZmxlY3QubWV0YWRhdGEobWV0YWRhdGFLZXksIG1ldGFkYXRhVmFsdWUpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gX19hd2FpdGVyKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xuICBmdW5jdGlvbiBhZG9wdCh2YWx1ZSkgeyByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBQID8gdmFsdWUgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHZhbHVlKTsgfSk7IH1cbiAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogYWRvcHQocmVzdWx0LnZhbHVlKS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XG4gICAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSkpLm5leHQoKSk7XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gX19nZW5lcmF0b3IodGhpc0FyZywgYm9keSkge1xuICB2YXIgXyA9IHsgbGFiZWw6IDAsIHNlbnQ6IGZ1bmN0aW9uKCkgeyBpZiAodFswXSAmIDEpIHRocm93IHRbMV07IHJldHVybiB0WzFdOyB9LCB0cnlzOiBbXSwgb3BzOiBbXSB9LCBmLCB5LCB0LCBnO1xuICByZXR1cm4gZyA9IHsgbmV4dDogdmVyYigwKSwgXCJ0aHJvd1wiOiB2ZXJiKDEpLCBcInJldHVyblwiOiB2ZXJiKDIpIH0sIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiAoZ1tTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzOyB9KSwgZztcbiAgZnVuY3Rpb24gdmVyYihuKSB7IHJldHVybiBmdW5jdGlvbiAodikgeyByZXR1cm4gc3RlcChbbiwgdl0pOyB9OyB9XG4gIGZ1bmN0aW9uIHN0ZXAob3ApIHtcbiAgICAgIGlmIChmKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiR2VuZXJhdG9yIGlzIGFscmVhZHkgZXhlY3V0aW5nLlwiKTtcbiAgICAgIHdoaWxlIChnICYmIChnID0gMCwgb3BbMF0gJiYgKF8gPSAwKSksIF8pIHRyeSB7XG4gICAgICAgICAgaWYgKGYgPSAxLCB5ICYmICh0ID0gb3BbMF0gJiAyID8geVtcInJldHVyblwiXSA6IG9wWzBdID8geVtcInRocm93XCJdIHx8ICgodCA9IHlbXCJyZXR1cm5cIl0pICYmIHQuY2FsbCh5KSwgMCkgOiB5Lm5leHQpICYmICEodCA9IHQuY2FsbCh5LCBvcFsxXSkpLmRvbmUpIHJldHVybiB0O1xuICAgICAgICAgIGlmICh5ID0gMCwgdCkgb3AgPSBbb3BbMF0gJiAyLCB0LnZhbHVlXTtcbiAgICAgICAgICBzd2l0Y2ggKG9wWzBdKSB7XG4gICAgICAgICAgICAgIGNhc2UgMDogY2FzZSAxOiB0ID0gb3A7IGJyZWFrO1xuICAgICAgICAgICAgICBjYXNlIDQ6IF8ubGFiZWwrKzsgcmV0dXJuIHsgdmFsdWU6IG9wWzFdLCBkb25lOiBmYWxzZSB9O1xuICAgICAgICAgICAgICBjYXNlIDU6IF8ubGFiZWwrKzsgeSA9IG9wWzFdOyBvcCA9IFswXTsgY29udGludWU7XG4gICAgICAgICAgICAgIGNhc2UgNzogb3AgPSBfLm9wcy5wb3AoKTsgXy50cnlzLnBvcCgpOyBjb250aW51ZTtcbiAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgIGlmICghKHQgPSBfLnRyeXMsIHQgPSB0Lmxlbmd0aCA+IDAgJiYgdFt0Lmxlbmd0aCAtIDFdKSAmJiAob3BbMF0gPT09IDYgfHwgb3BbMF0gPT09IDIpKSB7IF8gPSAwOyBjb250aW51ZTsgfVxuICAgICAgICAgICAgICAgICAgaWYgKG9wWzBdID09PSAzICYmICghdCB8fCAob3BbMV0gPiB0WzBdICYmIG9wWzFdIDwgdFszXSkpKSB7IF8ubGFiZWwgPSBvcFsxXTsgYnJlYWs7IH1cbiAgICAgICAgICAgICAgICAgIGlmIChvcFswXSA9PT0gNiAmJiBfLmxhYmVsIDwgdFsxXSkgeyBfLmxhYmVsID0gdFsxXTsgdCA9IG9wOyBicmVhazsgfVxuICAgICAgICAgICAgICAgICAgaWYgKHQgJiYgXy5sYWJlbCA8IHRbMl0pIHsgXy5sYWJlbCA9IHRbMl07IF8ub3BzLnB1c2gob3ApOyBicmVhazsgfVxuICAgICAgICAgICAgICAgICAgaWYgKHRbMl0pIF8ub3BzLnBvcCgpO1xuICAgICAgICAgICAgICAgICAgXy50cnlzLnBvcCgpOyBjb250aW51ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgb3AgPSBib2R5LmNhbGwodGhpc0FyZywgXyk7XG4gICAgICB9IGNhdGNoIChlKSB7IG9wID0gWzYsIGVdOyB5ID0gMDsgfSBmaW5hbGx5IHsgZiA9IHQgPSAwOyB9XG4gICAgICBpZiAob3BbMF0gJiA1KSB0aHJvdyBvcFsxXTsgcmV0dXJuIHsgdmFsdWU6IG9wWzBdID8gb3BbMV0gOiB2b2lkIDAsIGRvbmU6IHRydWUgfTtcbiAgfVxufVxuXG5leHBvcnQgdmFyIF9fY3JlYXRlQmluZGluZyA9IE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcbiAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcbiAgdmFyIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG0sIGspO1xuICBpZiAoIWRlc2MgfHwgKFwiZ2V0XCIgaW4gZGVzYyA/ICFtLl9fZXNNb2R1bGUgOiBkZXNjLndyaXRhYmxlIHx8IGRlc2MuY29uZmlndXJhYmxlKSkge1xuICAgICAgZGVzYyA9IHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIG1ba107IH0gfTtcbiAgfVxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgazIsIGRlc2MpO1xufSkgOiAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcbiAgaWYgKGsyID09PSB1bmRlZmluZWQpIGsyID0gaztcbiAgb1trMl0gPSBtW2tdO1xufSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBfX2V4cG9ydFN0YXIobSwgbykge1xuICBmb3IgKHZhciBwIGluIG0pIGlmIChwICE9PSBcImRlZmF1bHRcIiAmJiAhT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG8sIHApKSBfX2NyZWF0ZUJpbmRpbmcobywgbSwgcCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfX3ZhbHVlcyhvKSB7XG4gIHZhciBzID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIFN5bWJvbC5pdGVyYXRvciwgbSA9IHMgJiYgb1tzXSwgaSA9IDA7XG4gIGlmIChtKSByZXR1cm4gbS5jYWxsKG8pO1xuICBpZiAobyAmJiB0eXBlb2Ygby5sZW5ndGggPT09IFwibnVtYmVyXCIpIHJldHVybiB7XG4gICAgICBuZXh0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgaWYgKG8gJiYgaSA+PSBvLmxlbmd0aCkgbyA9IHZvaWQgMDtcbiAgICAgICAgICByZXR1cm4geyB2YWx1ZTogbyAmJiBvW2krK10sIGRvbmU6ICFvIH07XG4gICAgICB9XG4gIH07XG4gIHRocm93IG5ldyBUeXBlRXJyb3IocyA/IFwiT2JqZWN0IGlzIG5vdCBpdGVyYWJsZS5cIiA6IFwiU3ltYm9sLml0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9fcmVhZChvLCBuKSB7XG4gIHZhciBtID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9bU3ltYm9sLml0ZXJhdG9yXTtcbiAgaWYgKCFtKSByZXR1cm4gbztcbiAgdmFyIGkgPSBtLmNhbGwobyksIHIsIGFyID0gW10sIGU7XG4gIHRyeSB7XG4gICAgICB3aGlsZSAoKG4gPT09IHZvaWQgMCB8fCBuLS0gPiAwKSAmJiAhKHIgPSBpLm5leHQoKSkuZG9uZSkgYXIucHVzaChyLnZhbHVlKTtcbiAgfVxuICBjYXRjaCAoZXJyb3IpIHsgZSA9IHsgZXJyb3I6IGVycm9yIH07IH1cbiAgZmluYWxseSB7XG4gICAgICB0cnkge1xuICAgICAgICAgIGlmIChyICYmICFyLmRvbmUgJiYgKG0gPSBpW1wicmV0dXJuXCJdKSkgbS5jYWxsKGkpO1xuICAgICAgfVxuICAgICAgZmluYWxseSB7IGlmIChlKSB0aHJvdyBlLmVycm9yOyB9XG4gIH1cbiAgcmV0dXJuIGFyO1xufVxuXG4vKiogQGRlcHJlY2F0ZWQgKi9cbmV4cG9ydCBmdW5jdGlvbiBfX3NwcmVhZCgpIHtcbiAgZm9yICh2YXIgYXIgPSBbXSwgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspXG4gICAgICBhciA9IGFyLmNvbmNhdChfX3JlYWQoYXJndW1lbnRzW2ldKSk7XG4gIHJldHVybiBhcjtcbn1cblxuLyoqIEBkZXByZWNhdGVkICovXG5leHBvcnQgZnVuY3Rpb24gX19zcHJlYWRBcnJheXMoKSB7XG4gIGZvciAodmFyIHMgPSAwLCBpID0gMCwgaWwgPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgaWw7IGkrKykgcyArPSBhcmd1bWVudHNbaV0ubGVuZ3RoO1xuICBmb3IgKHZhciByID0gQXJyYXkocyksIGsgPSAwLCBpID0gMDsgaSA8IGlsOyBpKyspXG4gICAgICBmb3IgKHZhciBhID0gYXJndW1lbnRzW2ldLCBqID0gMCwgamwgPSBhLmxlbmd0aDsgaiA8IGpsOyBqKyssIGsrKylcbiAgICAgICAgICByW2tdID0gYVtqXTtcbiAgcmV0dXJuIHI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfX3NwcmVhZEFycmF5KHRvLCBmcm9tLCBwYWNrKSB7XG4gIGlmIChwYWNrIHx8IGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIGZvciAodmFyIGkgPSAwLCBsID0gZnJvbS5sZW5ndGgsIGFyOyBpIDwgbDsgaSsrKSB7XG4gICAgICBpZiAoYXIgfHwgIShpIGluIGZyb20pKSB7XG4gICAgICAgICAgaWYgKCFhcikgYXIgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChmcm9tLCAwLCBpKTtcbiAgICAgICAgICBhcltpXSA9IGZyb21baV07XG4gICAgICB9XG4gIH1cbiAgcmV0dXJuIHRvLmNvbmNhdChhciB8fCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChmcm9tKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfX2F3YWl0KHYpIHtcbiAgcmV0dXJuIHRoaXMgaW5zdGFuY2VvZiBfX2F3YWl0ID8gKHRoaXMudiA9IHYsIHRoaXMpIDogbmV3IF9fYXdhaXQodik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jR2VuZXJhdG9yKHRoaXNBcmcsIF9hcmd1bWVudHMsIGdlbmVyYXRvcikge1xuICBpZiAoIVN5bWJvbC5hc3luY0l0ZXJhdG9yKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3ltYm9sLmFzeW5jSXRlcmF0b3IgaXMgbm90IGRlZmluZWQuXCIpO1xuICB2YXIgZyA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSwgaSwgcSA9IFtdO1xuICByZXR1cm4gaSA9IHt9LCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIpLCB2ZXJiKFwicmV0dXJuXCIpLCBpW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH0sIGk7XG4gIGZ1bmN0aW9uIHZlcmIobikgeyBpZiAoZ1tuXSkgaVtuXSA9IGZ1bmN0aW9uICh2KSB7IHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAoYSwgYikgeyBxLnB1c2goW24sIHYsIGEsIGJdKSA+IDEgfHwgcmVzdW1lKG4sIHYpOyB9KTsgfTsgfVxuICBmdW5jdGlvbiByZXN1bWUobiwgdikgeyB0cnkgeyBzdGVwKGdbbl0odikpOyB9IGNhdGNoIChlKSB7IHNldHRsZShxWzBdWzNdLCBlKTsgfSB9XG4gIGZ1bmN0aW9uIHN0ZXAocikgeyByLnZhbHVlIGluc3RhbmNlb2YgX19hd2FpdCA/IFByb21pc2UucmVzb2x2ZShyLnZhbHVlLnYpLnRoZW4oZnVsZmlsbCwgcmVqZWN0KSA6IHNldHRsZShxWzBdWzJdLCByKTsgfVxuICBmdW5jdGlvbiBmdWxmaWxsKHZhbHVlKSB7IHJlc3VtZShcIm5leHRcIiwgdmFsdWUpOyB9XG4gIGZ1bmN0aW9uIHJlamVjdCh2YWx1ZSkgeyByZXN1bWUoXCJ0aHJvd1wiLCB2YWx1ZSk7IH1cbiAgZnVuY3Rpb24gc2V0dGxlKGYsIHYpIHsgaWYgKGYodiksIHEuc2hpZnQoKSwgcS5sZW5ndGgpIHJlc3VtZShxWzBdWzBdLCBxWzBdWzFdKTsgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gX19hc3luY0RlbGVnYXRvcihvKSB7XG4gIHZhciBpLCBwO1xuICByZXR1cm4gaSA9IHt9LCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIsIGZ1bmN0aW9uIChlKSB7IHRocm93IGU7IH0pLCB2ZXJiKFwicmV0dXJuXCIpLCBpW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9LCBpO1xuICBmdW5jdGlvbiB2ZXJiKG4sIGYpIHsgaVtuXSA9IG9bbl0gPyBmdW5jdGlvbiAodikgeyByZXR1cm4gKHAgPSAhcCkgPyB7IHZhbHVlOiBfX2F3YWl0KG9bbl0odikpLCBkb25lOiBmYWxzZSB9IDogZiA/IGYodikgOiB2OyB9IDogZjsgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gX19hc3luY1ZhbHVlcyhvKSB7XG4gIGlmICghU3ltYm9sLmFzeW5jSXRlcmF0b3IpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTeW1ib2wuYXN5bmNJdGVyYXRvciBpcyBub3QgZGVmaW5lZC5cIik7XG4gIHZhciBtID0gb1tTeW1ib2wuYXN5bmNJdGVyYXRvcl0sIGk7XG4gIHJldHVybiBtID8gbS5jYWxsKG8pIDogKG8gPSB0eXBlb2YgX192YWx1ZXMgPT09IFwiZnVuY3Rpb25cIiA/IF9fdmFsdWVzKG8pIDogb1tTeW1ib2wuaXRlcmF0b3JdKCksIGkgPSB7fSwgdmVyYihcIm5leHRcIiksIHZlcmIoXCJ0aHJvd1wiKSwgdmVyYihcInJldHVyblwiKSwgaVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9LCBpKTtcbiAgZnVuY3Rpb24gdmVyYihuKSB7IGlbbl0gPSBvW25dICYmIGZ1bmN0aW9uICh2KSB7IHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7IHYgPSBvW25dKHYpLCBzZXR0bGUocmVzb2x2ZSwgcmVqZWN0LCB2LmRvbmUsIHYudmFsdWUpOyB9KTsgfTsgfVxuICBmdW5jdGlvbiBzZXR0bGUocmVzb2x2ZSwgcmVqZWN0LCBkLCB2KSB7IFByb21pc2UucmVzb2x2ZSh2KS50aGVuKGZ1bmN0aW9uKHYpIHsgcmVzb2x2ZSh7IHZhbHVlOiB2LCBkb25lOiBkIH0pOyB9LCByZWplY3QpOyB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfX21ha2VUZW1wbGF0ZU9iamVjdChjb29rZWQsIHJhdykge1xuICBpZiAoT2JqZWN0LmRlZmluZVByb3BlcnR5KSB7IE9iamVjdC5kZWZpbmVQcm9wZXJ0eShjb29rZWQsIFwicmF3XCIsIHsgdmFsdWU6IHJhdyB9KTsgfSBlbHNlIHsgY29va2VkLnJhdyA9IHJhdzsgfVxuICByZXR1cm4gY29va2VkO1xufTtcblxudmFyIF9fc2V0TW9kdWxlRGVmYXVsdCA9IE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgdikge1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgXCJkZWZhdWx0XCIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgdmFsdWU6IHYgfSk7XG59KSA6IGZ1bmN0aW9uKG8sIHYpIHtcbiAgb1tcImRlZmF1bHRcIl0gPSB2O1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIF9faW1wb3J0U3Rhcihtb2QpIHtcbiAgaWYgKG1vZCAmJiBtb2QuX19lc01vZHVsZSkgcmV0dXJuIG1vZDtcbiAgdmFyIHJlc3VsdCA9IHt9O1xuICBpZiAobW9kICE9IG51bGwpIGZvciAodmFyIGsgaW4gbW9kKSBpZiAoayAhPT0gXCJkZWZhdWx0XCIgJiYgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG1vZCwgaykpIF9fY3JlYXRlQmluZGluZyhyZXN1bHQsIG1vZCwgayk7XG4gIF9fc2V0TW9kdWxlRGVmYXVsdChyZXN1bHQsIG1vZCk7XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfX2ltcG9ydERlZmF1bHQobW9kKSB7XG4gIHJldHVybiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSA/IG1vZCA6IHsgZGVmYXVsdDogbW9kIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfX2NsYXNzUHJpdmF0ZUZpZWxkR2V0KHJlY2VpdmVyLCBzdGF0ZSwga2luZCwgZikge1xuICBpZiAoa2luZCA9PT0gXCJhXCIgJiYgIWYpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJQcml2YXRlIGFjY2Vzc29yIHdhcyBkZWZpbmVkIHdpdGhvdXQgYSBnZXR0ZXJcIik7XG4gIGlmICh0eXBlb2Ygc3RhdGUgPT09IFwiZnVuY3Rpb25cIiA/IHJlY2VpdmVyICE9PSBzdGF0ZSB8fCAhZiA6ICFzdGF0ZS5oYXMocmVjZWl2ZXIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IHJlYWQgcHJpdmF0ZSBtZW1iZXIgZnJvbSBhbiBvYmplY3Qgd2hvc2UgY2xhc3MgZGlkIG5vdCBkZWNsYXJlIGl0XCIpO1xuICByZXR1cm4ga2luZCA9PT0gXCJtXCIgPyBmIDoga2luZCA9PT0gXCJhXCIgPyBmLmNhbGwocmVjZWl2ZXIpIDogZiA/IGYudmFsdWUgOiBzdGF0ZS5nZXQocmVjZWl2ZXIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gX19jbGFzc1ByaXZhdGVGaWVsZFNldChyZWNlaXZlciwgc3RhdGUsIHZhbHVlLCBraW5kLCBmKSB7XG4gIGlmIChraW5kID09PSBcIm1cIikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlByaXZhdGUgbWV0aG9kIGlzIG5vdCB3cml0YWJsZVwiKTtcbiAgaWYgKGtpbmQgPT09IFwiYVwiICYmICFmKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiUHJpdmF0ZSBhY2Nlc3NvciB3YXMgZGVmaW5lZCB3aXRob3V0IGEgc2V0dGVyXCIpO1xuICBpZiAodHlwZW9mIHN0YXRlID09PSBcImZ1bmN0aW9uXCIgPyByZWNlaXZlciAhPT0gc3RhdGUgfHwgIWYgOiAhc3RhdGUuaGFzKHJlY2VpdmVyKSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCB3cml0ZSBwcml2YXRlIG1lbWJlciB0byBhbiBvYmplY3Qgd2hvc2UgY2xhc3MgZGlkIG5vdCBkZWNsYXJlIGl0XCIpO1xuICByZXR1cm4gKGtpbmQgPT09IFwiYVwiID8gZi5jYWxsKHJlY2VpdmVyLCB2YWx1ZSkgOiBmID8gZi52YWx1ZSA9IHZhbHVlIDogc3RhdGUuc2V0KHJlY2VpdmVyLCB2YWx1ZSkpLCB2YWx1ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9fY2xhc3NQcml2YXRlRmllbGRJbihzdGF0ZSwgcmVjZWl2ZXIpIHtcbiAgaWYgKHJlY2VpdmVyID09PSBudWxsIHx8ICh0eXBlb2YgcmVjZWl2ZXIgIT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIHJlY2VpdmVyICE9PSBcImZ1bmN0aW9uXCIpKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IHVzZSAnaW4nIG9wZXJhdG9yIG9uIG5vbi1vYmplY3RcIik7XG4gIHJldHVybiB0eXBlb2Ygc3RhdGUgPT09IFwiZnVuY3Rpb25cIiA/IHJlY2VpdmVyID09PSBzdGF0ZSA6IHN0YXRlLmhhcyhyZWNlaXZlcik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfX2FkZERpc3Bvc2FibGVSZXNvdXJjZShlbnYsIHZhbHVlLCBhc3luYykge1xuICBpZiAodmFsdWUgIT09IG51bGwgJiYgdmFsdWUgIT09IHZvaWQgMCkge1xuICAgIGlmICh0eXBlb2YgdmFsdWUgIT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIHZhbHVlICE9PSBcImZ1bmN0aW9uXCIpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJPYmplY3QgZXhwZWN0ZWQuXCIpO1xuICAgIHZhciBkaXNwb3NlO1xuICAgIGlmIChhc3luYykge1xuICAgICAgICBpZiAoIVN5bWJvbC5hc3luY0Rpc3Bvc2UpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTeW1ib2wuYXN5bmNEaXNwb3NlIGlzIG5vdCBkZWZpbmVkLlwiKTtcbiAgICAgICAgZGlzcG9zZSA9IHZhbHVlW1N5bWJvbC5hc3luY0Rpc3Bvc2VdO1xuICAgIH1cbiAgICBpZiAoZGlzcG9zZSA9PT0gdm9pZCAwKSB7XG4gICAgICAgIGlmICghU3ltYm9sLmRpc3Bvc2UpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTeW1ib2wuZGlzcG9zZSBpcyBub3QgZGVmaW5lZC5cIik7XG4gICAgICAgIGRpc3Bvc2UgPSB2YWx1ZVtTeW1ib2wuZGlzcG9zZV07XG4gICAgfVxuICAgIGlmICh0eXBlb2YgZGlzcG9zZSAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiT2JqZWN0IG5vdCBkaXNwb3NhYmxlLlwiKTtcbiAgICBlbnYuc3RhY2sucHVzaCh7IHZhbHVlOiB2YWx1ZSwgZGlzcG9zZTogZGlzcG9zZSwgYXN5bmM6IGFzeW5jIH0pO1xuICB9XG4gIGVsc2UgaWYgKGFzeW5jKSB7XG4gICAgZW52LnN0YWNrLnB1c2goeyBhc3luYzogdHJ1ZSB9KTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbnZhciBfU3VwcHJlc3NlZEVycm9yID0gdHlwZW9mIFN1cHByZXNzZWRFcnJvciA9PT0gXCJmdW5jdGlvblwiID8gU3VwcHJlc3NlZEVycm9yIDogZnVuY3Rpb24gKGVycm9yLCBzdXBwcmVzc2VkLCBtZXNzYWdlKSB7XG4gIHZhciBlID0gbmV3IEVycm9yKG1lc3NhZ2UpO1xuICByZXR1cm4gZS5uYW1lID0gXCJTdXBwcmVzc2VkRXJyb3JcIiwgZS5lcnJvciA9IGVycm9yLCBlLnN1cHByZXNzZWQgPSBzdXBwcmVzc2VkLCBlO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIF9fZGlzcG9zZVJlc291cmNlcyhlbnYpIHtcbiAgZnVuY3Rpb24gZmFpbChlKSB7XG4gICAgZW52LmVycm9yID0gZW52Lmhhc0Vycm9yID8gbmV3IF9TdXBwcmVzc2VkRXJyb3IoZSwgZW52LmVycm9yLCBcIkFuIGVycm9yIHdhcyBzdXBwcmVzc2VkIGR1cmluZyBkaXNwb3NhbC5cIikgOiBlO1xuICAgIGVudi5oYXNFcnJvciA9IHRydWU7XG4gIH1cbiAgZnVuY3Rpb24gbmV4dCgpIHtcbiAgICB3aGlsZSAoZW52LnN0YWNrLmxlbmd0aCkge1xuICAgICAgdmFyIHJlYyA9IGVudi5zdGFjay5wb3AoKTtcbiAgICAgIHRyeSB7XG4gICAgICAgIHZhciByZXN1bHQgPSByZWMuZGlzcG9zZSAmJiByZWMuZGlzcG9zZS5jYWxsKHJlYy52YWx1ZSk7XG4gICAgICAgIGlmIChyZWMuYXN5bmMpIHJldHVybiBQcm9taXNlLnJlc29sdmUocmVzdWx0KS50aGVuKG5leHQsIGZ1bmN0aW9uKGUpIHsgZmFpbChlKTsgcmV0dXJuIG5leHQoKTsgfSk7XG4gICAgICB9XG4gICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgIGZhaWwoZSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChlbnYuaGFzRXJyb3IpIHRocm93IGVudi5lcnJvcjtcbiAgfVxuICByZXR1cm4gbmV4dCgpO1xufVxuXG5leHBvcnQgZGVmYXVsdCB7XG4gIF9fZXh0ZW5kcyxcbiAgX19hc3NpZ24sXG4gIF9fcmVzdCxcbiAgX19kZWNvcmF0ZSxcbiAgX19wYXJhbSxcbiAgX19tZXRhZGF0YSxcbiAgX19hd2FpdGVyLFxuICBfX2dlbmVyYXRvcixcbiAgX19jcmVhdGVCaW5kaW5nLFxuICBfX2V4cG9ydFN0YXIsXG4gIF9fdmFsdWVzLFxuICBfX3JlYWQsXG4gIF9fc3ByZWFkLFxuICBfX3NwcmVhZEFycmF5cyxcbiAgX19zcHJlYWRBcnJheSxcbiAgX19hd2FpdCxcbiAgX19hc3luY0dlbmVyYXRvcixcbiAgX19hc3luY0RlbGVnYXRvcixcbiAgX19hc3luY1ZhbHVlcyxcbiAgX19tYWtlVGVtcGxhdGVPYmplY3QsXG4gIF9faW1wb3J0U3RhcixcbiAgX19pbXBvcnREZWZhdWx0LFxuICBfX2NsYXNzUHJpdmF0ZUZpZWxkR2V0LFxuICBfX2NsYXNzUHJpdmF0ZUZpZWxkU2V0LFxuICBfX2NsYXNzUHJpdmF0ZUZpZWxkSW4sXG4gIF9fYWRkRGlzcG9zYWJsZVJlc291cmNlLFxuICBfX2Rpc3Bvc2VSZXNvdXJjZXMsXG59O1xuIiwiLy8gVGhlIG1vZHVsZSBjYWNoZVxudmFyIF9fd2VicGFja19tb2R1bGVfY2FjaGVfXyA9IHt9O1xuXG4vLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcblx0dmFyIGNhY2hlZE1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF07XG5cdGlmIChjYWNoZWRNb2R1bGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiBjYWNoZWRNb2R1bGUuZXhwb3J0cztcblx0fVxuXHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuXHR2YXIgbW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXSA9IHtcblx0XHQvLyBubyBtb2R1bGUuaWQgbmVlZGVkXG5cdFx0Ly8gbm8gbW9kdWxlLmxvYWRlZCBuZWVkZWRcblx0XHRleHBvcnRzOiB7fVxuXHR9O1xuXG5cdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuXHRfX3dlYnBhY2tfbW9kdWxlc19fW21vZHVsZUlkXShtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuXHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuXHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG59XG5cbiIsIi8vIGdldERlZmF1bHRFeHBvcnQgZnVuY3Rpb24gZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBub24taGFybW9ueSBtb2R1bGVzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLm4gPSAobW9kdWxlKSA9PiB7XG5cdHZhciBnZXR0ZXIgPSBtb2R1bGUgJiYgbW9kdWxlLl9fZXNNb2R1bGUgP1xuXHRcdCgpID0+IChtb2R1bGVbJ2RlZmF1bHQnXSkgOlxuXHRcdCgpID0+IChtb2R1bGUpO1xuXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQoZ2V0dGVyLCB7IGE6IGdldHRlciB9KTtcblx0cmV0dXJuIGdldHRlcjtcbn07IiwiLy8gZGVmaW5lIGdldHRlciBmdW5jdGlvbnMgZm9yIGhhcm1vbnkgZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5kID0gKGV4cG9ydHMsIGRlZmluaXRpb24pID0+IHtcblx0Zm9yKHZhciBrZXkgaW4gZGVmaW5pdGlvbikge1xuXHRcdGlmKF9fd2VicGFja19yZXF1aXJlX18ubyhkZWZpbml0aW9uLCBrZXkpICYmICFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywga2V5KSkge1xuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIGtleSwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGRlZmluaXRpb25ba2V5XSB9KTtcblx0XHR9XG5cdH1cbn07IiwiX193ZWJwYWNrX3JlcXVpcmVfXy5nID0gKGZ1bmN0aW9uKCkge1xuXHRpZiAodHlwZW9mIGdsb2JhbFRoaXMgPT09ICdvYmplY3QnKSByZXR1cm4gZ2xvYmFsVGhpcztcblx0dHJ5IHtcblx0XHRyZXR1cm4gdGhpcyB8fCBuZXcgRnVuY3Rpb24oJ3JldHVybiB0aGlzJykoKTtcblx0fSBjYXRjaCAoZSkge1xuXHRcdGlmICh0eXBlb2Ygd2luZG93ID09PSAnb2JqZWN0JykgcmV0dXJuIHdpbmRvdztcblx0fVxufSkoKTsiLCJfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSAob2JqLCBwcm9wKSA9PiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCkpIiwiLy8gZGVmaW5lIF9fZXNNb2R1bGUgb24gZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5yID0gKGV4cG9ydHMpID0+IHtcblx0aWYodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnRvU3RyaW5nVGFnKSB7XG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFN5bWJvbC50b1N0cmluZ1RhZywgeyB2YWx1ZTogJ01vZHVsZScgfSk7XG5cdH1cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcbn07IiwiaW1wb3J0ICogYXMgbWF0ZXJpYWxzIGZyb20gXCJAbHRzL21hdGVyaWFscy9sZWdhY3kvbGVnYWN5LWN1c3RvbVwiO1xyXG5leHBvcnQgeyBtYXRlcmlhbHMgfTtcclxuZXhwb3J0IGRlZmF1bHQgbWF0ZXJpYWxzO1xyXG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=