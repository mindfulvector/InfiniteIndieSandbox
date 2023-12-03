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

/***/ "../../../dev/materials/src/water/index.ts":
/*!*************************************************!*\
  !*** ../../../dev/materials/src/water/index.ts ***!
  \*************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   WaterMaterial: () => (/* reexport safe */ _waterMaterial__WEBPACK_IMPORTED_MODULE_0__.WaterMaterial)
/* harmony export */ });
/* harmony import */ var _waterMaterial__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./waterMaterial */ "../../../dev/materials/src/water/waterMaterial.ts");



/***/ }),

/***/ "../../../dev/materials/src/water/water.fragment.ts":
/*!**********************************************************!*\
  !*** ../../../dev/materials/src/water/water.fragment.ts ***!
  \**********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   waterPixelShader: () => (/* binding */ waterPixelShader)
/* harmony export */ });
/* harmony import */ var babylonjs_Engines_shaderStore__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! babylonjs/Shaders/ShadersInclude/fogFragment */ "babylonjs/Materials/effect");
/* harmony import */ var babylonjs_Engines_shaderStore__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(babylonjs_Engines_shaderStore__WEBPACK_IMPORTED_MODULE_0__);
// Do not edit.















var name = "waterPixelShader";
var shader = "#ifdef LOGARITHMICDEPTH\n#extension GL_EXT_frag_depth : enable\n#endif\nprecision highp float;uniform vec4 vEyePosition;uniform vec4 vDiffuseColor;\n#ifdef SPECULARTERM\nuniform vec4 vSpecularColor;\n#endif\nvarying vec3 vPositionW;\n#ifdef NORMAL\nvarying vec3 vNormalW;\n#endif\n#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)\nvarying vec4 vColor;\n#endif\n#include<helperFunctions>\n#include<imageProcessingDeclaration>\n#include<imageProcessingFunctions>\n#include<__decl__lightFragment>[0..maxSimultaneousLights]\n#include<lightsFragmentFunctions>\n#include<shadowsFragmentFunctions>\n#ifdef BUMP\nvarying vec2 vNormalUV;\n#ifdef BUMPSUPERIMPOSE\nvarying vec2 vNormalUV2;\n#endif\nuniform sampler2D normalSampler;uniform vec2 vNormalInfos;\n#endif\nuniform sampler2D refractionSampler;uniform sampler2D reflectionSampler;const float LOG2=1.442695;uniform vec3 cameraPosition;uniform vec4 waterColor;uniform float colorBlendFactor;uniform vec4 waterColor2;uniform float colorBlendFactor2;uniform float bumpHeight;uniform float time;varying vec3 vRefractionMapTexCoord;varying vec3 vReflectionMapTexCoord;\n#include<clipPlaneFragmentDeclaration>\n#include<logDepthDeclaration>\n#include<fogFragmentDeclaration>\n#define CUSTOM_FRAGMENT_DEFINITIONS\nvoid main(void) {\n#define CUSTOM_FRAGMENT_MAIN_BEGIN\n#include<clipPlaneFragment>\nvec3 viewDirectionW=normalize(vEyePosition.xyz-vPositionW);vec4 baseColor=vec4(1.,1.,1.,1.);vec3 diffuseColor=vDiffuseColor.rgb;float alpha=vDiffuseColor.a;\n#ifdef BUMP\n#ifdef BUMPSUPERIMPOSE\nbaseColor=0.6*texture2D(normalSampler,vNormalUV)+0.4*texture2D(normalSampler,vec2(vNormalUV2.x,vNormalUV2.y));\n#else\nbaseColor=texture2D(normalSampler,vNormalUV);\n#endif\nvec3 bumpColor=baseColor.rgb;\n#ifdef ALPHATEST\nif (baseColor.a<0.4)\ndiscard;\n#endif\nbaseColor.rgb*=vNormalInfos.y;\n#else\nvec3 bumpColor=vec3(1.0);\n#endif\n#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)\nbaseColor.rgb*=vColor.rgb;\n#endif\n#ifdef NORMAL\nvec2 perturbation=bumpHeight*(baseColor.rg-0.5);\n#ifdef BUMPAFFECTSREFLECTION\nvec3 normalW=normalize(vNormalW+vec3(perturbation.x*8.0,0.0,perturbation.y*8.0));if (normalW.y<0.0) {normalW.y=-normalW.y;}\n#else\nvec3 normalW=normalize(vNormalW);\n#endif\n#else\nvec3 normalW=vec3(1.0,1.0,1.0);vec2 perturbation=bumpHeight*(vec2(1.0,1.0)-0.5);\n#endif\n#ifdef FRESNELSEPARATE\n#ifdef REFLECTION\nvec2 projectedRefractionTexCoords=clamp(vRefractionMapTexCoord.xy/vRefractionMapTexCoord.z+perturbation*0.5,0.0,1.0);vec4 refractiveColor=texture2D(refractionSampler,projectedRefractionTexCoords);\n#ifdef IS_REFRACTION_LINEAR\nrefractiveColor.rgb=toGammaSpace(refractiveColor.rgb);\n#endif\nvec2 projectedReflectionTexCoords=clamp(vec2(\nvReflectionMapTexCoord.x/vReflectionMapTexCoord.z+perturbation.x*0.3,\nvReflectionMapTexCoord.y/vReflectionMapTexCoord.z+perturbation.y\n),0.0,1.0);vec4 reflectiveColor=texture2D(reflectionSampler,projectedReflectionTexCoords);\n#ifdef IS_REFLECTION_LINEAR\nreflectiveColor.rgb=toGammaSpace(reflectiveColor.rgb);\n#endif\nvec3 upVector=vec3(0.0,1.0,0.0);float fresnelTerm=clamp(abs(pow(dot(viewDirectionW,upVector),3.0)),0.05,0.65);float IfresnelTerm=1.0-fresnelTerm;refractiveColor=colorBlendFactor*waterColor+(1.0-colorBlendFactor)*refractiveColor;reflectiveColor=IfresnelTerm*colorBlendFactor2*waterColor+(1.0-colorBlendFactor2*IfresnelTerm)*reflectiveColor;vec4 combinedColor=refractiveColor*fresnelTerm+reflectiveColor*IfresnelTerm;baseColor=combinedColor;\n#endif\nvec3 diffuseBase=vec3(0.,0.,0.);lightingInfo info;float shadow=1.;float aggShadow=0.;float numLights=0.;\n#ifdef SPECULARTERM\nfloat glossiness=vSpecularColor.a;vec3 specularBase=vec3(0.,0.,0.);vec3 specularColor=vSpecularColor.rgb;\n#else\nfloat glossiness=0.;\n#endif\n#include<lightFragment>[0..maxSimultaneousLights]\nvec3 finalDiffuse=clamp(baseColor.rgb,0.0,1.0);\n#if defined(VERTEXALPHA) || defined(INSTANCESCOLOR) && defined(INSTANCES)\nalpha*=vColor.a;\n#endif\n#ifdef SPECULARTERM\nvec3 finalSpecular=specularBase*specularColor;\n#else\nvec3 finalSpecular=vec3(0.0);\n#endif\n#else \n#ifdef REFLECTION\nvec2 projectedRefractionTexCoords=clamp(vRefractionMapTexCoord.xy/vRefractionMapTexCoord.z+perturbation,0.0,1.0);vec4 refractiveColor=texture2D(refractionSampler,projectedRefractionTexCoords);\n#ifdef IS_REFRACTION_LINEAR\nrefractiveColor.rgb=toGammaSpace(refractiveColor.rgb);\n#endif\nvec2 projectedReflectionTexCoords=clamp(vReflectionMapTexCoord.xy/vReflectionMapTexCoord.z+perturbation,0.0,1.0);vec4 reflectiveColor=texture2D(reflectionSampler,projectedReflectionTexCoords);\n#ifdef IS_REFLECTION_LINEAR\nreflectiveColor.rgb=toGammaSpace(reflectiveColor.rgb);\n#endif\nvec3 upVector=vec3(0.0,1.0,0.0);float fresnelTerm=max(dot(viewDirectionW,upVector),0.0);vec4 combinedColor=refractiveColor*fresnelTerm+reflectiveColor*(1.0-fresnelTerm);baseColor=colorBlendFactor*waterColor+(1.0-colorBlendFactor)*combinedColor;\n#endif\nvec3 diffuseBase=vec3(0.,0.,0.);lightingInfo info;float shadow=1.;float aggShadow=0.;float numLights=0.;\n#ifdef SPECULARTERM\nfloat glossiness=vSpecularColor.a;vec3 specularBase=vec3(0.,0.,0.);vec3 specularColor=vSpecularColor.rgb;\n#else\nfloat glossiness=0.;\n#endif\n#include<lightFragment>[0..maxSimultaneousLights]\nvec3 finalDiffuse=clamp(baseColor.rgb,0.0,1.0);\n#if defined(VERTEXALPHA) || defined(INSTANCESCOLOR) && defined(INSTANCES)\nalpha*=vColor.a;\n#endif\n#ifdef SPECULARTERM\nvec3 finalSpecular=specularBase*specularColor;\n#else\nvec3 finalSpecular=vec3(0.0);\n#endif\n#endif\nvec4 color=vec4(finalDiffuse+finalSpecular,alpha);\n#include<logDepthFragment>\n#include<fogFragment>\n#ifdef IMAGEPROCESSINGPOSTPROCESS\ncolor.rgb=toLinearSpace(color.rgb);\n#elif defined(IMAGEPROCESSING)\ncolor.rgb=toLinearSpace(color.rgb);color=applyImageProcessing(color);\n#endif\ngl_FragColor=color;\n#define CUSTOM_FRAGMENT_MAIN_END\n}\n";
// Sideeffect
babylonjs_Engines_shaderStore__WEBPACK_IMPORTED_MODULE_0__.ShaderStore.ShadersStore[name] = shader;
/** @internal */
var waterPixelShader = { name: name, shader: shader };


/***/ }),

/***/ "../../../dev/materials/src/water/water.vertex.ts":
/*!********************************************************!*\
  !*** ../../../dev/materials/src/water/water.vertex.ts ***!
  \********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   waterVertexShader: () => (/* binding */ waterVertexShader)
/* harmony export */ });
/* harmony import */ var babylonjs_Engines_shaderStore__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! babylonjs/Shaders/ShadersInclude/logDepthVertex */ "babylonjs/Materials/effect");
/* harmony import */ var babylonjs_Engines_shaderStore__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(babylonjs_Engines_shaderStore__WEBPACK_IMPORTED_MODULE_0__);
// Do not edit.

















var name = "waterVertexShader";
var shader = "precision highp float;attribute vec3 position;\n#ifdef NORMAL\nattribute vec3 normal;\n#endif\n#ifdef UV1\nattribute vec2 uv;\n#endif\n#ifdef UV2\nattribute vec2 uv2;\n#endif\n#ifdef VERTEXCOLOR\nattribute vec4 color;\n#endif\n#include<bonesDeclaration>\n#include<bakedVertexAnimationDeclaration>\n#include<instancesDeclaration>\nuniform mat4 view;uniform mat4 viewProjection;\n#ifdef BUMP\nvarying vec2 vNormalUV;\n#ifdef BUMPSUPERIMPOSE\nvarying vec2 vNormalUV2;\n#endif\nuniform mat4 normalMatrix;uniform vec2 vNormalInfos;\n#endif\n#ifdef POINTSIZE\nuniform float pointSize;\n#endif\nvarying vec3 vPositionW;\n#ifdef NORMAL\nvarying vec3 vNormalW;\n#endif\n#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)\nvarying vec4 vColor;\n#endif\n#include<clipPlaneVertexDeclaration>\n#include<fogVertexDeclaration>\n#include<__decl__lightFragment>[0..maxSimultaneousLights]\n#include<logDepthDeclaration>\nuniform mat4 reflectionViewProjection;uniform vec2 windDirection;uniform float waveLength;uniform float time;uniform float windForce;uniform float waveHeight;uniform float waveSpeed;uniform float waveCount;varying vec3 vRefractionMapTexCoord;varying vec3 vReflectionMapTexCoord;\n#define CUSTOM_VERTEX_DEFINITIONS\nvoid main(void) {\n#define CUSTOM_VERTEX_MAIN_BEGIN\n#include<instancesVertex>\n#include<bonesVertex>\n#include<bakedVertexAnimation>\nvec4 worldPos=finalWorld*vec4(position,1.0);vPositionW=vec3(worldPos);\n#ifdef NORMAL\nvNormalW=normalize(vec3(finalWorld*vec4(normal,0.0)));\n#endif\n#ifndef UV1\nvec2 uv=vec2(0.,0.);\n#endif\n#ifndef UV2\nvec2 uv2=vec2(0.,0.);\n#endif\n#ifdef BUMP\nif (vNormalInfos.x==0.)\n{vNormalUV=vec2(normalMatrix*vec4((uv*1.0)/waveLength+time*windForce*windDirection,1.0,0.0));\n#ifdef BUMPSUPERIMPOSE\nvNormalUV2=vec2(normalMatrix*vec4((uv*0.721)/waveLength+time*1.2*windForce*windDirection,1.0,0.0));\n#endif\n}\nelse\n{vNormalUV=vec2(normalMatrix*vec4((uv2*1.0)/waveLength+time*windForce*windDirection ,1.0,0.0));\n#ifdef BUMPSUPERIMPOSE\nvNormalUV2=vec2(normalMatrix*vec4((uv2*0.721)/waveLength+time*1.2*windForce*windDirection ,1.0,0.0));\n#endif\n}\n#endif\n#include<clipPlaneVertex>\n#include<fogVertex>\n#include<shadowsVertex>[0..maxSimultaneousLights]\n#include<vertexColorMixing>\n#if defined(POINTSIZE) && !defined(WEBGPU)\ngl_PointSize=pointSize;\n#endif\nfloat finalWaveCount=1.0/(waveCount*0.5);\n#ifdef USE_WORLD_COORDINATES\nvec3 p=worldPos.xyz;\n#else\nvec3 p=position;\n#endif\nfloat newY=(sin(((p.x/finalWaveCount)+time*waveSpeed))*waveHeight*windDirection.x*5.0)\n+ (cos(((p.z/finalWaveCount)+ time*waveSpeed))*waveHeight*windDirection.y*5.0);p.y+=abs(newY);\n#ifdef USE_WORLD_COORDINATES\ngl_Position=viewProjection*vec4(p,1.0);\n#else\ngl_Position=viewProjection*finalWorld*vec4(p,1.0);\n#endif\n#ifdef REFLECTION\nvRefractionMapTexCoord.x=0.5*(gl_Position.w+gl_Position.x);vRefractionMapTexCoord.y=0.5*(gl_Position.w+gl_Position.y);vRefractionMapTexCoord.z=gl_Position.w;worldPos=reflectionViewProjection*finalWorld*vec4(position,1.0);vReflectionMapTexCoord.x=0.5*(worldPos.w+worldPos.x);vReflectionMapTexCoord.y=0.5*(worldPos.w+worldPos.y);vReflectionMapTexCoord.z=worldPos.w;\n#endif\n#include<logDepthVertex>\n#define CUSTOM_VERTEX_MAIN_END\n}\n";
// Sideeffect
babylonjs_Engines_shaderStore__WEBPACK_IMPORTED_MODULE_0__.ShaderStore.ShadersStore[name] = shader;
/** @internal */
var waterVertexShader = { name: name, shader: shader };


/***/ }),

/***/ "../../../dev/materials/src/water/waterMaterial.ts":
/*!*********************************************************!*\
  !*** ../../../dev/materials/src/water/waterMaterial.ts ***!
  \*********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   WaterMaterial: () => (/* binding */ WaterMaterial)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! tslib */ "../../../../node_modules/tslib/tslib.es6.mjs");
/* harmony import */ var babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! babylonjs/Materials/clipPlaneMaterialHelper */ "babylonjs/Materials/effect");
/* harmony import */ var babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _water_fragment__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./water.fragment */ "../../../dev/materials/src/water/water.fragment.ts");
/* harmony import */ var _water_vertex__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./water.vertex */ "../../../dev/materials/src/water/water.vertex.ts");





















var WaterMaterialDefines = /** @class */ (function (_super) {
    (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__extends)(WaterMaterialDefines, _super);
    function WaterMaterialDefines() {
        var _this = _super.call(this) || this;
        _this.BUMP = false;
        _this.REFLECTION = false;
        _this.CLIPPLANE = false;
        _this.CLIPPLANE2 = false;
        _this.CLIPPLANE3 = false;
        _this.CLIPPLANE4 = false;
        _this.CLIPPLANE5 = false;
        _this.CLIPPLANE6 = false;
        _this.ALPHATEST = false;
        _this.DEPTHPREPASS = false;
        _this.POINTSIZE = false;
        _this.FOG = false;
        _this.NORMAL = false;
        _this.UV1 = false;
        _this.UV2 = false;
        _this.VERTEXCOLOR = false;
        _this.VERTEXALPHA = false;
        _this.NUM_BONE_INFLUENCERS = 0;
        _this.BonesPerMesh = 0;
        _this.INSTANCES = false;
        _this.INSTANCESCOLOR = false;
        _this.SPECULARTERM = false;
        _this.LOGARITHMICDEPTH = false;
        _this.USE_REVERSE_DEPTHBUFFER = false;
        _this.FRESNELSEPARATE = false;
        _this.BUMPSUPERIMPOSE = false;
        _this.BUMPAFFECTSREFLECTION = false;
        _this.USE_WORLD_COORDINATES = false;
        _this.IMAGEPROCESSING = false;
        _this.VIGNETTE = false;
        _this.VIGNETTEBLENDMODEMULTIPLY = false;
        _this.VIGNETTEBLENDMODEOPAQUE = false;
        _this.TONEMAPPING = false;
        _this.TONEMAPPING_ACES = false;
        _this.CONTRAST = false;
        _this.EXPOSURE = false;
        _this.COLORCURVES = false;
        _this.COLORGRADING = false;
        _this.COLORGRADING3D = false;
        _this.SAMPLER3DGREENDEPTH = false;
        _this.SAMPLER3DBGRMAP = false;
        _this.DITHER = false;
        _this.IMAGEPROCESSINGPOSTPROCESS = false;
        _this.SKIPFINALCOLORCLAMP = false;
        _this.rebuild();
        return _this;
    }
    return WaterMaterialDefines;
}(babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.MaterialDefines));
var WaterMaterial = /** @class */ (function (_super) {
    (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__extends)(WaterMaterial, _super);
    /**
     * Constructor
     * @param name
     * @param scene
     * @param renderTargetSize
     */
    function WaterMaterial(name, scene, renderTargetSize) {
        if (renderTargetSize === void 0) { renderTargetSize = new babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.Vector2(512, 512); }
        var _this = _super.call(this, name, scene) || this;
        _this.renderTargetSize = renderTargetSize;
        _this.diffuseColor = new babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.Color3(1, 1, 1);
        _this.specularColor = new babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.Color3(0, 0, 0);
        _this.specularPower = 64;
        _this._disableLighting = false;
        _this._maxSimultaneousLights = 4;
        /**
         * Defines the wind force.
         */
        _this.windForce = 6;
        /**
         * Defines the direction of the wind in the plane (X, Z).
         */
        _this.windDirection = new babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.Vector2(0, 1);
        /**
         * Defines the height of the waves.
         */
        _this.waveHeight = 0.4;
        /**
         * Defines the bump height related to the bump map.
         */
        _this.bumpHeight = 0.4;
        /**
         * Defines wether or not: to add a smaller moving bump to less steady waves.
         */
        _this._bumpSuperimpose = false;
        /**
         * Defines wether or not color refraction and reflection differently with .waterColor2 and .colorBlendFactor2. Non-linear (physically correct) fresnel.
         */
        _this._fresnelSeparate = false;
        /**
         * Defines wether or not bump Wwves modify the reflection.
         */
        _this._bumpAffectsReflection = false;
        /**
         * Defines the water color blended with the refraction (near).
         */
        _this.waterColor = new babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.Color3(0.1, 0.1, 0.6);
        /**
         * Defines the blend factor related to the water color.
         */
        _this.colorBlendFactor = 0.2;
        /**
         * Defines the water color blended with the reflection (far).
         */
        _this.waterColor2 = new babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.Color3(0.1, 0.1, 0.6);
        /**
         * Defines the blend factor related to the water color (reflection, far).
         */
        _this.colorBlendFactor2 = 0.2;
        /**
         * Defines the maximum length of a wave.
         */
        _this.waveLength = 0.1;
        /**
         * Defines the waves speed.
         */
        _this.waveSpeed = 1.0;
        /**
         * Defines the number of times waves are repeated. This is typically used to adjust waves count according to the ground's size where the material is applied on.
         */
        _this.waveCount = 20;
        /**
         * Sets or gets whether or not automatic clipping should be enabled or not. Setting to true will save performances and
         * will avoid calculating useless pixels in the pixel shader of the water material.
         */
        _this.disableClipPlane = false;
        /**
         * Defines whether or not to use world coordinates for wave deformations.
         * The default value is false, meaning that the deformation is applied in object (local) space.
         * You will probably need to set it to true if you are using instances or thin instances for your water objects.
         */
        _this._useWorldCoordinatesForWaveDeformation = false;
        _this._renderTargets = new babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.SmartArray(16);
        /*
         * Private members
         */
        _this._mesh = null;
        _this._reflectionTransform = babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.Matrix.Zero();
        _this._lastTime = 0;
        _this._lastDeltaTime = 0;
        _this._createRenderTargets(_this.getScene(), renderTargetSize);
        // Create render targets
        _this.getRenderTargetTextures = function () {
            _this._renderTargets.reset();
            _this._renderTargets.push(_this._reflectionRTT);
            _this._renderTargets.push(_this._refractionRTT);
            return _this._renderTargets;
        };
        _this._imageProcessingConfiguration = _this.getScene().imageProcessingConfiguration;
        if (_this._imageProcessingConfiguration) {
            _this._imageProcessingObserver = _this._imageProcessingConfiguration.onUpdateParameters.add(function () {
                _this._markAllSubMeshesAsImageProcessingDirty();
            });
        }
        return _this;
    }
    Object.defineProperty(WaterMaterial.prototype, "hasRenderTargetTextures", {
        /**
         * Gets a boolean indicating that current material needs to register RTT
         */
        get: function () {
            return true;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(WaterMaterial.prototype, "useLogarithmicDepth", {
        get: function () {
            return this._useLogarithmicDepth;
        },
        set: function (value) {
            this._useLogarithmicDepth = value && this.getScene().getEngine().getCaps().fragmentDepthSupported;
            this._markAllSubMeshesAsMiscDirty();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(WaterMaterial.prototype, "refractionTexture", {
        // Get / Set
        get: function () {
            return this._refractionRTT;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(WaterMaterial.prototype, "reflectionTexture", {
        get: function () {
            return this._reflectionRTT;
        },
        enumerable: false,
        configurable: true
    });
    // Methods
    WaterMaterial.prototype.addToRenderList = function (node) {
        if (this._refractionRTT && this._refractionRTT.renderList) {
            this._refractionRTT.renderList.push(node);
        }
        if (this._reflectionRTT && this._reflectionRTT.renderList) {
            this._reflectionRTT.renderList.push(node);
        }
    };
    WaterMaterial.prototype.removeFromRenderList = function (node) {
        if (this._refractionRTT && this._refractionRTT.renderList) {
            var idx = this._refractionRTT.renderList.indexOf(node);
            if (idx !== -1) {
                this._refractionRTT.renderList.splice(idx, 1);
            }
        }
        if (this._reflectionRTT && this._reflectionRTT.renderList) {
            var idx = this._reflectionRTT.renderList.indexOf(node);
            if (idx !== -1) {
                this._reflectionRTT.renderList.splice(idx, 1);
            }
        }
    };
    WaterMaterial.prototype.enableRenderTargets = function (enable) {
        var refreshRate = enable ? 1 : 0;
        if (this._refractionRTT) {
            this._refractionRTT.refreshRate = refreshRate;
        }
        if (this._reflectionRTT) {
            this._reflectionRTT.refreshRate = refreshRate;
        }
    };
    WaterMaterial.prototype.getRenderList = function () {
        return this._refractionRTT ? this._refractionRTT.renderList : [];
    };
    Object.defineProperty(WaterMaterial.prototype, "renderTargetsEnabled", {
        get: function () {
            return !(this._refractionRTT && this._refractionRTT.refreshRate === 0);
        },
        enumerable: false,
        configurable: true
    });
    WaterMaterial.prototype.needAlphaBlending = function () {
        return this.alpha < 1.0;
    };
    WaterMaterial.prototype.needAlphaTesting = function () {
        return false;
    };
    WaterMaterial.prototype.getAlphaTestTexture = function () {
        return null;
    };
    WaterMaterial.prototype.isReadyForSubMesh = function (mesh, subMesh, useInstances) {
        if (this.isFrozen) {
            if (subMesh.effect && subMesh.effect._wasPreviouslyReady && subMesh.effect._wasPreviouslyUsingInstances === useInstances) {
                return true;
            }
        }
        if (!subMesh.materialDefines) {
            subMesh.materialDefines = new WaterMaterialDefines();
        }
        var defines = subMesh.materialDefines;
        var scene = this.getScene();
        if (this._isReadyForSubMesh(subMesh)) {
            return true;
        }
        var engine = scene.getEngine();
        // Textures
        if (defines._areTexturesDirty) {
            defines._needUVs = false;
            if (scene.texturesEnabled) {
                if (this.bumpTexture && babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.MaterialFlags.BumpTextureEnabled) {
                    if (!this.bumpTexture.isReady()) {
                        return false;
                    }
                    else {
                        defines._needUVs = true;
                        defines.BUMP = true;
                    }
                }
                if (babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.MaterialFlags.ReflectionTextureEnabled) {
                    defines.REFLECTION = true;
                }
            }
        }
        babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.MaterialHelper.PrepareDefinesForFrameBoundValues(scene, engine, this, defines, useInstances ? true : false);
        babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.MaterialHelper.PrepareDefinesForMisc(mesh, scene, this._useLogarithmicDepth, this.pointsCloud, this.fogEnabled, this._shouldTurnAlphaTestOn(mesh), defines);
        if (defines._areMiscDirty) {
            defines.FRESNELSEPARATE = this._fresnelSeparate;
            defines.BUMPSUPERIMPOSE = this._bumpSuperimpose;
            defines.BUMPAFFECTSREFLECTION = this._bumpAffectsReflection;
            defines.USE_WORLD_COORDINATES = this._useWorldCoordinatesForWaveDeformation;
        }
        // Lights
        defines._needNormals = babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.MaterialHelper.PrepareDefinesForLights(scene, mesh, defines, true, this._maxSimultaneousLights, this._disableLighting);
        // Image processing
        if (defines._areImageProcessingDirty && this._imageProcessingConfiguration) {
            if (!this._imageProcessingConfiguration.isReady()) {
                return false;
            }
            this._imageProcessingConfiguration.prepareDefines(defines);
            defines.IS_REFLECTION_LINEAR = this.reflectionTexture != null && !this.reflectionTexture.gammaSpace;
            defines.IS_REFRACTION_LINEAR = this.refractionTexture != null && !this.refractionTexture.gammaSpace;
        }
        // Attribs
        babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.MaterialHelper.PrepareDefinesForAttributes(mesh, defines, true, true);
        // Configure this
        this._mesh = mesh;
        if (this._waitingRenderList) {
            for (var i = 0; i < this._waitingRenderList.length; i++) {
                this.addToRenderList(scene.getNodeById(this._waitingRenderList[i]));
            }
            this._waitingRenderList = null;
        }
        // Get correct effect
        if (defines.isDirty) {
            defines.markAsProcessed();
            scene.resetCachedMaterial();
            // Fallbacks
            var fallbacks = new babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.EffectFallbacks();
            if (defines.FOG) {
                fallbacks.addFallback(1, "FOG");
            }
            if (defines.LOGARITHMICDEPTH) {
                fallbacks.addFallback(0, "LOGARITHMICDEPTH");
            }
            babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.MaterialHelper.HandleFallbacksForShadows(defines, fallbacks, this.maxSimultaneousLights);
            if (defines.NUM_BONE_INFLUENCERS > 0) {
                fallbacks.addCPUSkinningFallback(0, mesh);
            }
            //Attributes
            var attribs = [babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.VertexBuffer.PositionKind];
            if (defines.NORMAL) {
                attribs.push(babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.VertexBuffer.NormalKind);
            }
            if (defines.UV1) {
                attribs.push(babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.VertexBuffer.UVKind);
            }
            if (defines.UV2) {
                attribs.push(babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.VertexBuffer.UV2Kind);
            }
            if (defines.VERTEXCOLOR) {
                attribs.push(babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.VertexBuffer.ColorKind);
            }
            babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.MaterialHelper.PrepareAttributesForBones(attribs, mesh, defines, fallbacks);
            babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.MaterialHelper.PrepareAttributesForInstances(attribs, defines);
            // Legacy browser patch
            var shaderName = "water";
            var join = defines.toString();
            var uniforms = [
                "world",
                "view",
                "viewProjection",
                "vEyePosition",
                "vLightsType",
                "vDiffuseColor",
                "vSpecularColor",
                "vFogInfos",
                "vFogColor",
                "pointSize",
                "vNormalInfos",
                "mBones",
                "normalMatrix",
                "logarithmicDepthConstant",
                // Water
                "reflectionViewProjection",
                "windDirection",
                "waveLength",
                "time",
                "windForce",
                "cameraPosition",
                "bumpHeight",
                "waveHeight",
                "waterColor",
                "waterColor2",
                "colorBlendFactor",
                "colorBlendFactor2",
                "waveSpeed",
                "waveCount",
            ];
            var samplers = [
                "normalSampler",
                // Water
                "refractionSampler",
                "reflectionSampler",
            ];
            var uniformBuffers = [];
            if (babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.ImageProcessingConfiguration) {
                babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.ImageProcessingConfiguration.PrepareUniforms(uniforms, defines);
                babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.ImageProcessingConfiguration.PrepareSamplers(samplers, defines);
            }
            (0,babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.addClipPlaneUniforms)(uniforms);
            babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.MaterialHelper.PrepareUniformsAndSamplersList({
                uniformsNames: uniforms,
                uniformBuffersNames: uniformBuffers,
                samplers: samplers,
                defines: defines,
                maxSimultaneousLights: this.maxSimultaneousLights,
            });
            subMesh.setEffect(scene.getEngine().createEffect(shaderName, {
                attributes: attribs,
                uniformsNames: uniforms,
                uniformBuffersNames: uniformBuffers,
                samplers: samplers,
                defines: join,
                fallbacks: fallbacks,
                onCompiled: this.onCompiled,
                onError: this.onError,
                indexParameters: { maxSimultaneousLights: this._maxSimultaneousLights },
            }, engine), defines, this._materialContext);
        }
        if (!subMesh.effect || !subMesh.effect.isReady()) {
            return false;
        }
        defines._renderId = scene.getRenderId();
        subMesh.effect._wasPreviouslyReady = true;
        subMesh.effect._wasPreviouslyUsingInstances = !!useInstances;
        return true;
    };
    WaterMaterial.prototype.bindForSubMesh = function (world, mesh, subMesh) {
        var scene = this.getScene();
        var defines = subMesh.materialDefines;
        if (!defines) {
            return;
        }
        var effect = subMesh.effect;
        if (!effect || !this._mesh) {
            return;
        }
        this._activeEffect = effect;
        // Matrices
        this.bindOnlyWorldMatrix(world);
        this._activeEffect.setMatrix("viewProjection", scene.getTransformMatrix());
        // Bones
        babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.MaterialHelper.BindBonesParameters(mesh, this._activeEffect);
        if (this._mustRebind(scene, effect)) {
            // Textures
            if (this.bumpTexture && babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.MaterialFlags.BumpTextureEnabled) {
                this._activeEffect.setTexture("normalSampler", this.bumpTexture);
                this._activeEffect.setFloat2("vNormalInfos", this.bumpTexture.coordinatesIndex, this.bumpTexture.level);
                this._activeEffect.setMatrix("normalMatrix", this.bumpTexture.getTextureMatrix());
            }
            // Clip plane
            (0,babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.bindClipPlane)(effect, this, scene);
            // Point size
            if (this.pointsCloud) {
                this._activeEffect.setFloat("pointSize", this.pointSize);
            }
            scene.bindEyePosition(effect);
        }
        this._activeEffect.setColor4("vDiffuseColor", this.diffuseColor, this.alpha * mesh.visibility);
        if (defines.SPECULARTERM) {
            this._activeEffect.setColor4("vSpecularColor", this.specularColor, this.specularPower);
        }
        if (scene.lightsEnabled && !this.disableLighting) {
            babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.MaterialHelper.BindLights(scene, mesh, this._activeEffect, defines, this.maxSimultaneousLights);
        }
        // View
        if (scene.fogEnabled && mesh.applyFog && scene.fogMode !== babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.Scene.FOGMODE_NONE) {
            this._activeEffect.setMatrix("view", scene.getViewMatrix());
        }
        // Fog
        babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.MaterialHelper.BindFogParameters(scene, mesh, this._activeEffect);
        // Log. depth
        babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.MaterialHelper.BindLogDepth(defines, this._activeEffect, scene);
        // Water
        if (babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.MaterialFlags.ReflectionTextureEnabled) {
            this._activeEffect.setTexture("refractionSampler", this._refractionRTT);
            this._activeEffect.setTexture("reflectionSampler", this._reflectionRTT);
        }
        var wrvp = this._reflectionTransform.multiply(scene.getProjectionMatrix());
        // Add delta time. Prevent adding delta time if it hasn't changed.
        var deltaTime = scene.getEngine().getDeltaTime();
        if (deltaTime !== this._lastDeltaTime) {
            this._lastDeltaTime = deltaTime;
            this._lastTime += this._lastDeltaTime;
        }
        this._activeEffect.setMatrix("reflectionViewProjection", wrvp);
        this._activeEffect.setVector2("windDirection", this.windDirection);
        this._activeEffect.setFloat("waveLength", this.waveLength);
        this._activeEffect.setFloat("time", this._lastTime / 100000);
        this._activeEffect.setFloat("windForce", this.windForce);
        this._activeEffect.setFloat("waveHeight", this.waveHeight);
        this._activeEffect.setFloat("bumpHeight", this.bumpHeight);
        this._activeEffect.setColor4("waterColor", this.waterColor, 1.0);
        this._activeEffect.setFloat("colorBlendFactor", this.colorBlendFactor);
        this._activeEffect.setColor4("waterColor2", this.waterColor2, 1.0);
        this._activeEffect.setFloat("colorBlendFactor2", this.colorBlendFactor2);
        this._activeEffect.setFloat("waveSpeed", this.waveSpeed);
        this._activeEffect.setFloat("waveCount", this.waveCount);
        // image processing
        if (this._imageProcessingConfiguration && !this._imageProcessingConfiguration.applyByPostProcess) {
            this._imageProcessingConfiguration.bind(this._activeEffect);
        }
        this._afterBind(mesh, this._activeEffect);
    };
    WaterMaterial.prototype._createRenderTargets = function (scene, renderTargetSize) {
        var _this = this;
        // Render targets
        this._refractionRTT = new babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.RenderTargetTexture(name + "_refraction", { width: renderTargetSize.x, height: renderTargetSize.y }, scene, false, true);
        this._refractionRTT.wrapU = babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.Constants.TEXTURE_MIRROR_ADDRESSMODE;
        this._refractionRTT.wrapV = babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.Constants.TEXTURE_MIRROR_ADDRESSMODE;
        this._refractionRTT.ignoreCameraViewport = true;
        this._reflectionRTT = new babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.RenderTargetTexture(name + "_reflection", { width: renderTargetSize.x, height: renderTargetSize.y }, scene, false, true);
        this._reflectionRTT.wrapU = babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.Constants.TEXTURE_MIRROR_ADDRESSMODE;
        this._reflectionRTT.wrapV = babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.Constants.TEXTURE_MIRROR_ADDRESSMODE;
        this._reflectionRTT.ignoreCameraViewport = true;
        var isVisible;
        var clipPlane = null;
        var savedViewMatrix;
        var mirrorMatrix = babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.Matrix.Zero();
        this._refractionRTT.onBeforeRender = function () {
            if (_this._mesh) {
                isVisible = _this._mesh.isVisible;
                _this._mesh.isVisible = false;
            }
            // Clip plane
            if (!_this.disableClipPlane) {
                clipPlane = scene.clipPlane;
                var positiony = _this._mesh ? _this._mesh.absolutePosition.y : 0.0;
                scene.clipPlane = babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.Plane.FromPositionAndNormal(new babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, positiony + 0.05, 0), new babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, 1, 0));
            }
        };
        this._refractionRTT.onAfterRender = function () {
            if (_this._mesh) {
                _this._mesh.isVisible = isVisible;
            }
            // Clip plane
            if (!_this.disableClipPlane) {
                scene.clipPlane = clipPlane;
            }
        };
        this._reflectionRTT.onBeforeRender = function () {
            if (_this._mesh) {
                isVisible = _this._mesh.isVisible;
                _this._mesh.isVisible = false;
            }
            // Clip plane
            if (!_this.disableClipPlane) {
                clipPlane = scene.clipPlane;
                var positiony = _this._mesh ? _this._mesh.absolutePosition.y : 0.0;
                scene.clipPlane = babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.Plane.FromPositionAndNormal(new babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, positiony - 0.05, 0), new babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.Vector3(0, -1, 0));
                babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.Matrix.ReflectionToRef(scene.clipPlane, mirrorMatrix);
            }
            // Transform
            savedViewMatrix = scene.getViewMatrix();
            mirrorMatrix.multiplyToRef(savedViewMatrix, _this._reflectionTransform);
            scene.setTransformMatrix(_this._reflectionTransform, scene.getProjectionMatrix());
            scene._mirroredCameraPosition = babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.Vector3.TransformCoordinates(scene.activeCamera.position, mirrorMatrix);
        };
        this._reflectionRTT.onAfterRender = function () {
            if (_this._mesh) {
                _this._mesh.isVisible = isVisible;
            }
            // Clip plane
            scene.clipPlane = clipPlane;
            // Transform
            scene.setTransformMatrix(savedViewMatrix, scene.getProjectionMatrix());
            scene._mirroredCameraPosition = null;
        };
    };
    WaterMaterial.prototype.getAnimatables = function () {
        var results = [];
        if (this.bumpTexture && this.bumpTexture.animations && this.bumpTexture.animations.length > 0) {
            results.push(this.bumpTexture);
        }
        if (this._reflectionRTT && this._reflectionRTT.animations && this._reflectionRTT.animations.length > 0) {
            results.push(this._reflectionRTT);
        }
        if (this._refractionRTT && this._refractionRTT.animations && this._refractionRTT.animations.length > 0) {
            results.push(this._refractionRTT);
        }
        return results;
    };
    WaterMaterial.prototype.getActiveTextures = function () {
        var activeTextures = _super.prototype.getActiveTextures.call(this);
        if (this._bumpTexture) {
            activeTextures.push(this._bumpTexture);
        }
        return activeTextures;
    };
    WaterMaterial.prototype.hasTexture = function (texture) {
        if (_super.prototype.hasTexture.call(this, texture)) {
            return true;
        }
        if (this._bumpTexture === texture) {
            return true;
        }
        return false;
    };
    WaterMaterial.prototype.dispose = function (forceDisposeEffect) {
        if (this.bumpTexture) {
            this.bumpTexture.dispose();
        }
        var index = this.getScene().customRenderTargets.indexOf(this._refractionRTT);
        if (index != -1) {
            this.getScene().customRenderTargets.splice(index, 1);
        }
        index = -1;
        index = this.getScene().customRenderTargets.indexOf(this._reflectionRTT);
        if (index != -1) {
            this.getScene().customRenderTargets.splice(index, 1);
        }
        if (this._reflectionRTT) {
            this._reflectionRTT.dispose();
        }
        if (this._refractionRTT) {
            this._refractionRTT.dispose();
        }
        // Remove image-processing observer
        if (this._imageProcessingConfiguration && this._imageProcessingObserver) {
            this._imageProcessingConfiguration.onUpdateParameters.remove(this._imageProcessingObserver);
        }
        _super.prototype.dispose.call(this, forceDisposeEffect);
    };
    WaterMaterial.prototype.clone = function (name) {
        var _this = this;
        return babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.SerializationHelper.Clone(function () { return new WaterMaterial(name, _this.getScene()); }, this);
    };
    WaterMaterial.prototype.serialize = function () {
        var serializationObject = _super.prototype.serialize.call(this);
        serializationObject.customType = "BABYLON.WaterMaterial";
        serializationObject.renderList = [];
        if (this._refractionRTT && this._refractionRTT.renderList) {
            for (var i = 0; i < this._refractionRTT.renderList.length; i++) {
                serializationObject.renderList.push(this._refractionRTT.renderList[i].id);
            }
        }
        return serializationObject;
    };
    WaterMaterial.prototype.getClassName = function () {
        return "WaterMaterial";
    };
    // Statics
    WaterMaterial.Parse = function (source, scene, rootUrl) {
        var mat = babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.SerializationHelper.Parse(function () { return new WaterMaterial(source.name, scene); }, source, scene, rootUrl);
        mat._waitingRenderList = source.renderList;
        return mat;
    };
    WaterMaterial.CreateDefaultMesh = function (name, scene) {
        var mesh = (0,babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.CreateGround)(name, { width: 512, height: 512, subdivisions: 32, updatable: false }, scene);
        return mesh;
    };
    (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__decorate)([
        (0,babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.serializeAsTexture)("bumpTexture")
    ], WaterMaterial.prototype, "_bumpTexture", void 0);
    (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__decorate)([
        (0,babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.expandToProperty)("_markAllSubMeshesAsTexturesDirty")
    ], WaterMaterial.prototype, "bumpTexture", void 0);
    (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__decorate)([
        (0,babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.serializeAsColor3)()
    ], WaterMaterial.prototype, "diffuseColor", void 0);
    (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__decorate)([
        (0,babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.serializeAsColor3)()
    ], WaterMaterial.prototype, "specularColor", void 0);
    (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__decorate)([
        (0,babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.serialize)()
    ], WaterMaterial.prototype, "specularPower", void 0);
    (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__decorate)([
        (0,babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.serialize)("disableLighting")
    ], WaterMaterial.prototype, "_disableLighting", void 0);
    (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__decorate)([
        (0,babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.expandToProperty)("_markAllSubMeshesAsLightsDirty")
    ], WaterMaterial.prototype, "disableLighting", void 0);
    (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__decorate)([
        (0,babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.serialize)("maxSimultaneousLights")
    ], WaterMaterial.prototype, "_maxSimultaneousLights", void 0);
    (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__decorate)([
        (0,babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.expandToProperty)("_markAllSubMeshesAsLightsDirty")
    ], WaterMaterial.prototype, "maxSimultaneousLights", void 0);
    (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__decorate)([
        (0,babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.serialize)()
    ], WaterMaterial.prototype, "windForce", void 0);
    (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__decorate)([
        (0,babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.serializeAsVector2)()
    ], WaterMaterial.prototype, "windDirection", void 0);
    (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__decorate)([
        (0,babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.serialize)()
    ], WaterMaterial.prototype, "waveHeight", void 0);
    (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__decorate)([
        (0,babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.serialize)()
    ], WaterMaterial.prototype, "bumpHeight", void 0);
    (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__decorate)([
        (0,babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.serialize)("bumpSuperimpose")
    ], WaterMaterial.prototype, "_bumpSuperimpose", void 0);
    (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__decorate)([
        (0,babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.expandToProperty)("_markAllSubMeshesAsMiscDirty")
    ], WaterMaterial.prototype, "bumpSuperimpose", void 0);
    (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__decorate)([
        (0,babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.serialize)("fresnelSeparate")
    ], WaterMaterial.prototype, "_fresnelSeparate", void 0);
    (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__decorate)([
        (0,babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.expandToProperty)("_markAllSubMeshesAsMiscDirty")
    ], WaterMaterial.prototype, "fresnelSeparate", void 0);
    (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__decorate)([
        (0,babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.serialize)("bumpAffectsReflection")
    ], WaterMaterial.prototype, "_bumpAffectsReflection", void 0);
    (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__decorate)([
        (0,babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.expandToProperty)("_markAllSubMeshesAsMiscDirty")
    ], WaterMaterial.prototype, "bumpAffectsReflection", void 0);
    (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__decorate)([
        (0,babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.serializeAsColor3)()
    ], WaterMaterial.prototype, "waterColor", void 0);
    (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__decorate)([
        (0,babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.serialize)()
    ], WaterMaterial.prototype, "colorBlendFactor", void 0);
    (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__decorate)([
        (0,babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.serializeAsColor3)()
    ], WaterMaterial.prototype, "waterColor2", void 0);
    (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__decorate)([
        (0,babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.serialize)()
    ], WaterMaterial.prototype, "colorBlendFactor2", void 0);
    (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__decorate)([
        (0,babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.serialize)()
    ], WaterMaterial.prototype, "waveLength", void 0);
    (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__decorate)([
        (0,babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.serialize)()
    ], WaterMaterial.prototype, "waveSpeed", void 0);
    (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__decorate)([
        (0,babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.serialize)()
    ], WaterMaterial.prototype, "waveCount", void 0);
    (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__decorate)([
        (0,babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.serialize)()
    ], WaterMaterial.prototype, "disableClipPlane", void 0);
    (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__decorate)([
        (0,babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.serialize)("useWorldCoordinatesForWaveDeformation")
    ], WaterMaterial.prototype, "_useWorldCoordinatesForWaveDeformation", void 0);
    (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__decorate)([
        (0,babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.expandToProperty)("_markAllSubMeshesAsMiscDirty")
    ], WaterMaterial.prototype, "useWorldCoordinatesForWaveDeformation", void 0);
    (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__decorate)([
        (0,babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.serialize)()
    ], WaterMaterial.prototype, "useLogarithmicDepth", null);
    return WaterMaterial;
}(babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.PushMaterial));
(0,babylonjs_Misc_decorators__WEBPACK_IMPORTED_MODULE_0__.RegisterClass)("BABYLON.WaterMaterial", WaterMaterial);


/***/ }),

/***/ "../../../lts/materials/src/legacy/legacy-water.ts":
/*!*********************************************************!*\
  !*** ../../../lts/materials/src/legacy/legacy-water.ts ***!
  \*********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   WaterMaterial: () => (/* reexport safe */ materials_water_index__WEBPACK_IMPORTED_MODULE_0__.WaterMaterial)
/* harmony export */ });
/* harmony import */ var materials_water_index__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! materials/water/index */ "../../../dev/materials/src/water/index.ts");
/* eslint-disable import/no-internal-modules */

/**
 * This is the entry point for the UMD module.
 * The entry point for a future ESM package should be index.ts
 */
var globalObject = typeof __webpack_require__.g !== "undefined" ? __webpack_require__.g : typeof window !== "undefined" ? window : undefined;
if (typeof globalObject !== "undefined") {
    for (var key in materials_water_index__WEBPACK_IMPORTED_MODULE_0__) {
        globalObject.BABYLON[key] = materials_water_index__WEBPACK_IMPORTED_MODULE_0__[key];
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
/*!**********************!*\
  !*** ./src/water.ts ***!
  \**********************/
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   materials: () => (/* reexport module object */ _lts_materials_legacy_legacy_water__WEBPACK_IMPORTED_MODULE_0__)
/* harmony export */ });
/* harmony import */ var _lts_materials_legacy_legacy_water__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @lts/materials/legacy/legacy-water */ "../../../lts/materials/src/legacy/legacy-water.ts");


/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (_lts_materials_legacy_legacy_water__WEBPACK_IMPORTED_MODULE_0__);

})();

__webpack_exports__ = __webpack_exports__["default"];
/******/ 	return __webpack_exports__;
/******/ })()
;
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFieWxvbi53YXRlck1hdGVyaWFsLmpzIiwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7OztBQ1ZBOzs7Ozs7Ozs7Ozs7Ozs7OztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQXdJQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7Ozs7Ozs7QUM3SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQWdHQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDckhBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUdBO0FBRUE7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBS0E7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUFBO0FBK0NBO0FBQUE7QUE5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUlBOztBQUNBO0FBQ0E7QUFBQTtBQUVBO0FBQUE7QUEwSkE7Ozs7O0FBS0E7QUFDQTtBQUdBO0FBSEE7QUFHQTtBQXpKQTtBQUdBO0FBR0E7QUFHQTtBQUtBO0FBSUE7O0FBRUE7QUFFQTtBQUNBOztBQUVBO0FBRUE7QUFDQTs7QUFFQTtBQUVBO0FBQ0E7O0FBRUE7QUFFQTtBQUNBOztBQUVBO0FBRUE7QUFJQTs7QUFFQTtBQUVBO0FBSUE7O0FBRUE7QUFFQTtBQUlBOztBQUVBO0FBRUE7QUFDQTs7QUFFQTtBQUVBO0FBQ0E7O0FBRUE7QUFFQTtBQUNBOztBQUVBO0FBRUE7QUFDQTs7QUFFQTtBQUVBO0FBRUE7O0FBRUE7QUFFQTtBQUVBOztBQUVBO0FBRUE7QUFDQTs7O0FBR0E7QUFFQTtBQUVBOzs7O0FBSUE7QUFFQTtBQUlBO0FBRUE7O0FBRUE7QUFDQTtBQUtBO0FBQ0E7QUFDQTtBQTZCQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBO0FBbENBO0FBSEE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7OztBQUFBO0FBbUNBO0FBQUE7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7OztBQUxBO0FBUUE7QUFEQTtBQUNBO0FBQ0E7QUFDQTs7O0FBQUE7QUFFQTtBQUFBO0FBQ0E7QUFDQTs7O0FBQUE7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBRUE7QUFBQTtBQUNBO0FBQ0E7OztBQUFBO0FBRUE7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUVBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFFQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFFQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBRUE7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUVBO0FBRUE7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQU1BO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUVBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBRUE7QUFFQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFFQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFFQTtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUVBO0FBQ0E7QUFFQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7QUFFQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBRUE7QUFBQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBO0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUE3dUJBO0FBREE7QUFDQTtBQUVBO0FBREE7QUFDQTtBQUdBO0FBREE7QUFDQTtBQUdBO0FBREE7QUFDQTtBQUdBO0FBREE7QUFDQTtBQUdBO0FBREE7QUFDQTtBQUVBO0FBREE7QUFDQTtBQUdBO0FBREE7QUFDQTtBQUVBO0FBREE7QUFDQTtBQU1BO0FBREE7QUFDQTtBQUtBO0FBREE7QUFDQTtBQUtBO0FBREE7QUFDQTtBQUtBO0FBREE7QUFDQTtBQUtBO0FBREE7QUFDQTtBQUVBO0FBREE7QUFDQTtBQU1BO0FBREE7QUFDQTtBQUVBO0FBREE7QUFDQTtBQU1BO0FBREE7QUFDQTtBQUVBO0FBREE7QUFDQTtBQU1BO0FBREE7QUFDQTtBQUtBO0FBREE7QUFDQTtBQUtBO0FBREE7QUFDQTtBQUtBO0FBREE7QUFDQTtBQUtBO0FBREE7QUFDQTtBQU1BO0FBREE7QUFDQTtBQU1BO0FBREE7QUFDQTtBQU1BO0FBREE7QUFDQTtBQVFBO0FBREE7QUFDQTtBQUVBO0FBREE7QUFDQTtBQStEQTtBQURBO0FBR0E7QUFzakJBO0FBQUE7QUFFQTs7Ozs7Ozs7Ozs7Ozs7OztBQzMwQkE7QUFDQTtBQUVBOzs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUVBOzs7Ozs7Ozs7OztBQ2RBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7OztBQ2pYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDUEE7Ozs7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7Ozs7QUNOQTtBQUNBO0FBQ0EiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9NQVRFUklBTFMvd2VicGFjay91bml2ZXJzYWxNb2R1bGVEZWZpbml0aW9uIiwid2VicGFjazovL01BVEVSSUFMUy8uLi8uLi8uLi9kZXYvbWF0ZXJpYWxzL3NyYy93YXRlci9pbmRleC50cyIsIndlYnBhY2s6Ly9NQVRFUklBTFMvLi4vLi4vLi4vZGV2L21hdGVyaWFscy9zcmMvd2F0ZXIvd2F0ZXIuZnJhZ21lbnQudHMiLCJ3ZWJwYWNrOi8vTUFURVJJQUxTLy4uLy4uLy4uL2Rldi9tYXRlcmlhbHMvc3JjL3dhdGVyL3dhdGVyLnZlcnRleC50cyIsIndlYnBhY2s6Ly9NQVRFUklBTFMvLi4vLi4vLi4vZGV2L21hdGVyaWFscy9zcmMvd2F0ZXIvd2F0ZXJNYXRlcmlhbC50cyIsIndlYnBhY2s6Ly9NQVRFUklBTFMvLi4vLi4vLi4vbHRzL21hdGVyaWFscy9zcmMvbGVnYWN5L2xlZ2FjeS13YXRlci50cyIsIndlYnBhY2s6Ly9NQVRFUklBTFMvZXh0ZXJuYWwgdW1kIHtcInJvb3RcIjpcIkJBQllMT05cIixcImNvbW1vbmpzXCI6XCJiYWJ5bG9uanNcIixcImNvbW1vbmpzMlwiOlwiYmFieWxvbmpzXCIsXCJhbWRcIjpcImJhYnlsb25qc1wifSIsIndlYnBhY2s6Ly9NQVRFUklBTFMvLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL3RzbGliL3RzbGliLmVzNi5tanMiLCJ3ZWJwYWNrOi8vTUFURVJJQUxTL3dlYnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovL01BVEVSSUFMUy93ZWJwYWNrL3J1bnRpbWUvY29tcGF0IGdldCBkZWZhdWx0IGV4cG9ydCIsIndlYnBhY2s6Ly9NQVRFUklBTFMvd2VicGFjay9ydW50aW1lL2RlZmluZSBwcm9wZXJ0eSBnZXR0ZXJzIiwid2VicGFjazovL01BVEVSSUFMUy93ZWJwYWNrL3J1bnRpbWUvZ2xvYmFsIiwid2VicGFjazovL01BVEVSSUFMUy93ZWJwYWNrL3J1bnRpbWUvaGFzT3duUHJvcGVydHkgc2hvcnRoYW5kIiwid2VicGFjazovL01BVEVSSUFMUy93ZWJwYWNrL3J1bnRpbWUvbWFrZSBuYW1lc3BhY2Ugb2JqZWN0Iiwid2VicGFjazovL01BVEVSSUFMUy8uL3NyYy93YXRlci50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gd2VicGFja1VuaXZlcnNhbE1vZHVsZURlZmluaXRpb24ocm9vdCwgZmFjdG9yeSkge1xuXHRpZih0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcpXG5cdFx0bW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoXCJiYWJ5bG9uanNcIikpO1xuXHRlbHNlIGlmKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZClcblx0XHRkZWZpbmUoXCJiYWJ5bG9uanMtbWF0ZXJpYWxzXCIsIFtcImJhYnlsb25qc1wiXSwgZmFjdG9yeSk7XG5cdGVsc2UgaWYodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKVxuXHRcdGV4cG9ydHNbXCJiYWJ5bG9uanMtbWF0ZXJpYWxzXCJdID0gZmFjdG9yeShyZXF1aXJlKFwiYmFieWxvbmpzXCIpKTtcblx0ZWxzZVxuXHRcdHJvb3RbXCJNQVRFUklBTFNcIl0gPSBmYWN0b3J5KHJvb3RbXCJCQUJZTE9OXCJdKTtcbn0pKCh0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdGhpcyksIChfX1dFQlBBQ0tfRVhURVJOQUxfTU9EVUxFX2JhYnlsb25qc19NYXRlcmlhbHNfZWZmZWN0X18pID0+IHtcbnJldHVybiAiLCJleHBvcnQgKiBmcm9tIFwiLi93YXRlck1hdGVyaWFsXCI7XHJcbiIsIi8vIERvIG5vdCBlZGl0LlxuaW1wb3J0IHsgU2hhZGVyU3RvcmUgfSBmcm9tIFwiY29yZS9FbmdpbmVzL3NoYWRlclN0b3JlXCI7XG5pbXBvcnQgXCJjb3JlL1NoYWRlcnMvU2hhZGVyc0luY2x1ZGUvaGVscGVyRnVuY3Rpb25zXCI7XG5pbXBvcnQgXCJjb3JlL1NoYWRlcnMvU2hhZGVyc0luY2x1ZGUvaW1hZ2VQcm9jZXNzaW5nRGVjbGFyYXRpb25cIjtcbmltcG9ydCBcImNvcmUvU2hhZGVycy9TaGFkZXJzSW5jbHVkZS9pbWFnZVByb2Nlc3NpbmdGdW5jdGlvbnNcIjtcbmltcG9ydCBcImNvcmUvU2hhZGVycy9TaGFkZXJzSW5jbHVkZS9saWdodEZyYWdtZW50RGVjbGFyYXRpb25cIjtcbmltcG9ydCBcImNvcmUvU2hhZGVycy9TaGFkZXJzSW5jbHVkZS9saWdodFVib0RlY2xhcmF0aW9uXCI7XG5pbXBvcnQgXCJjb3JlL1NoYWRlcnMvU2hhZGVyc0luY2x1ZGUvbGlnaHRzRnJhZ21lbnRGdW5jdGlvbnNcIjtcbmltcG9ydCBcImNvcmUvU2hhZGVycy9TaGFkZXJzSW5jbHVkZS9zaGFkb3dzRnJhZ21lbnRGdW5jdGlvbnNcIjtcbmltcG9ydCBcImNvcmUvU2hhZGVycy9TaGFkZXJzSW5jbHVkZS9jbGlwUGxhbmVGcmFnbWVudERlY2xhcmF0aW9uXCI7XG5pbXBvcnQgXCJjb3JlL1NoYWRlcnMvU2hhZGVyc0luY2x1ZGUvbG9nRGVwdGhEZWNsYXJhdGlvblwiO1xuaW1wb3J0IFwiY29yZS9TaGFkZXJzL1NoYWRlcnNJbmNsdWRlL2ZvZ0ZyYWdtZW50RGVjbGFyYXRpb25cIjtcbmltcG9ydCBcImNvcmUvU2hhZGVycy9TaGFkZXJzSW5jbHVkZS9jbGlwUGxhbmVGcmFnbWVudFwiO1xuaW1wb3J0IFwiY29yZS9TaGFkZXJzL1NoYWRlcnNJbmNsdWRlL2xpZ2h0RnJhZ21lbnRcIjtcbmltcG9ydCBcImNvcmUvU2hhZGVycy9TaGFkZXJzSW5jbHVkZS9sb2dEZXB0aEZyYWdtZW50XCI7XG5pbXBvcnQgXCJjb3JlL1NoYWRlcnMvU2hhZGVyc0luY2x1ZGUvZm9nRnJhZ21lbnRcIjtcblxuY29uc3QgbmFtZSA9IFwid2F0ZXJQaXhlbFNoYWRlclwiO1xuY29uc3Qgc2hhZGVyID0gYCNpZmRlZiBMT0dBUklUSE1JQ0RFUFRIXG4jZXh0ZW5zaW9uIEdMX0VYVF9mcmFnX2RlcHRoIDogZW5hYmxlXG4jZW5kaWZcbnByZWNpc2lvbiBoaWdocCBmbG9hdDt1bmlmb3JtIHZlYzQgdkV5ZVBvc2l0aW9uO3VuaWZvcm0gdmVjNCB2RGlmZnVzZUNvbG9yO1xuI2lmZGVmIFNQRUNVTEFSVEVSTVxudW5pZm9ybSB2ZWM0IHZTcGVjdWxhckNvbG9yO1xuI2VuZGlmXG52YXJ5aW5nIHZlYzMgdlBvc2l0aW9uVztcbiNpZmRlZiBOT1JNQUxcbnZhcnlpbmcgdmVjMyB2Tm9ybWFsVztcbiNlbmRpZlxuI2lmIGRlZmluZWQoVkVSVEVYQ09MT1IpIHx8IGRlZmluZWQoSU5TVEFOQ0VTQ09MT1IpICYmIGRlZmluZWQoSU5TVEFOQ0VTKVxudmFyeWluZyB2ZWM0IHZDb2xvcjtcbiNlbmRpZlxuI2luY2x1ZGU8aGVscGVyRnVuY3Rpb25zPlxuI2luY2x1ZGU8aW1hZ2VQcm9jZXNzaW5nRGVjbGFyYXRpb24+XG4jaW5jbHVkZTxpbWFnZVByb2Nlc3NpbmdGdW5jdGlvbnM+XG4jaW5jbHVkZTxfX2RlY2xfX2xpZ2h0RnJhZ21lbnQ+WzAuLm1heFNpbXVsdGFuZW91c0xpZ2h0c11cbiNpbmNsdWRlPGxpZ2h0c0ZyYWdtZW50RnVuY3Rpb25zPlxuI2luY2x1ZGU8c2hhZG93c0ZyYWdtZW50RnVuY3Rpb25zPlxuI2lmZGVmIEJVTVBcbnZhcnlpbmcgdmVjMiB2Tm9ybWFsVVY7XG4jaWZkZWYgQlVNUFNVUEVSSU1QT1NFXG52YXJ5aW5nIHZlYzIgdk5vcm1hbFVWMjtcbiNlbmRpZlxudW5pZm9ybSBzYW1wbGVyMkQgbm9ybWFsU2FtcGxlcjt1bmlmb3JtIHZlYzIgdk5vcm1hbEluZm9zO1xuI2VuZGlmXG51bmlmb3JtIHNhbXBsZXIyRCByZWZyYWN0aW9uU2FtcGxlcjt1bmlmb3JtIHNhbXBsZXIyRCByZWZsZWN0aW9uU2FtcGxlcjtjb25zdCBmbG9hdCBMT0cyPTEuNDQyNjk1O3VuaWZvcm0gdmVjMyBjYW1lcmFQb3NpdGlvbjt1bmlmb3JtIHZlYzQgd2F0ZXJDb2xvcjt1bmlmb3JtIGZsb2F0IGNvbG9yQmxlbmRGYWN0b3I7dW5pZm9ybSB2ZWM0IHdhdGVyQ29sb3IyO3VuaWZvcm0gZmxvYXQgY29sb3JCbGVuZEZhY3RvcjI7dW5pZm9ybSBmbG9hdCBidW1wSGVpZ2h0O3VuaWZvcm0gZmxvYXQgdGltZTt2YXJ5aW5nIHZlYzMgdlJlZnJhY3Rpb25NYXBUZXhDb29yZDt2YXJ5aW5nIHZlYzMgdlJlZmxlY3Rpb25NYXBUZXhDb29yZDtcbiNpbmNsdWRlPGNsaXBQbGFuZUZyYWdtZW50RGVjbGFyYXRpb24+XG4jaW5jbHVkZTxsb2dEZXB0aERlY2xhcmF0aW9uPlxuI2luY2x1ZGU8Zm9nRnJhZ21lbnREZWNsYXJhdGlvbj5cbiNkZWZpbmUgQ1VTVE9NX0ZSQUdNRU5UX0RFRklOSVRJT05TXG52b2lkIG1haW4odm9pZCkge1xuI2RlZmluZSBDVVNUT01fRlJBR01FTlRfTUFJTl9CRUdJTlxuI2luY2x1ZGU8Y2xpcFBsYW5lRnJhZ21lbnQ+XG52ZWMzIHZpZXdEaXJlY3Rpb25XPW5vcm1hbGl6ZSh2RXllUG9zaXRpb24ueHl6LXZQb3NpdGlvblcpO3ZlYzQgYmFzZUNvbG9yPXZlYzQoMS4sMS4sMS4sMS4pO3ZlYzMgZGlmZnVzZUNvbG9yPXZEaWZmdXNlQ29sb3IucmdiO2Zsb2F0IGFscGhhPXZEaWZmdXNlQ29sb3IuYTtcbiNpZmRlZiBCVU1QXG4jaWZkZWYgQlVNUFNVUEVSSU1QT1NFXG5iYXNlQ29sb3I9MC42KnRleHR1cmUyRChub3JtYWxTYW1wbGVyLHZOb3JtYWxVVikrMC40KnRleHR1cmUyRChub3JtYWxTYW1wbGVyLHZlYzIodk5vcm1hbFVWMi54LHZOb3JtYWxVVjIueSkpO1xuI2Vsc2VcbmJhc2VDb2xvcj10ZXh0dXJlMkQobm9ybWFsU2FtcGxlcix2Tm9ybWFsVVYpO1xuI2VuZGlmXG52ZWMzIGJ1bXBDb2xvcj1iYXNlQ29sb3IucmdiO1xuI2lmZGVmIEFMUEhBVEVTVFxuaWYgKGJhc2VDb2xvci5hPDAuNClcbmRpc2NhcmQ7XG4jZW5kaWZcbmJhc2VDb2xvci5yZ2IqPXZOb3JtYWxJbmZvcy55O1xuI2Vsc2VcbnZlYzMgYnVtcENvbG9yPXZlYzMoMS4wKTtcbiNlbmRpZlxuI2lmIGRlZmluZWQoVkVSVEVYQ09MT1IpIHx8IGRlZmluZWQoSU5TVEFOQ0VTQ09MT1IpICYmIGRlZmluZWQoSU5TVEFOQ0VTKVxuYmFzZUNvbG9yLnJnYio9dkNvbG9yLnJnYjtcbiNlbmRpZlxuI2lmZGVmIE5PUk1BTFxudmVjMiBwZXJ0dXJiYXRpb249YnVtcEhlaWdodCooYmFzZUNvbG9yLnJnLTAuNSk7XG4jaWZkZWYgQlVNUEFGRkVDVFNSRUZMRUNUSU9OXG52ZWMzIG5vcm1hbFc9bm9ybWFsaXplKHZOb3JtYWxXK3ZlYzMocGVydHVyYmF0aW9uLngqOC4wLDAuMCxwZXJ0dXJiYXRpb24ueSo4LjApKTtpZiAobm9ybWFsVy55PDAuMCkge25vcm1hbFcueT0tbm9ybWFsVy55O31cbiNlbHNlXG52ZWMzIG5vcm1hbFc9bm9ybWFsaXplKHZOb3JtYWxXKTtcbiNlbmRpZlxuI2Vsc2VcbnZlYzMgbm9ybWFsVz12ZWMzKDEuMCwxLjAsMS4wKTt2ZWMyIHBlcnR1cmJhdGlvbj1idW1wSGVpZ2h0Kih2ZWMyKDEuMCwxLjApLTAuNSk7XG4jZW5kaWZcbiNpZmRlZiBGUkVTTkVMU0VQQVJBVEVcbiNpZmRlZiBSRUZMRUNUSU9OXG52ZWMyIHByb2plY3RlZFJlZnJhY3Rpb25UZXhDb29yZHM9Y2xhbXAodlJlZnJhY3Rpb25NYXBUZXhDb29yZC54eS92UmVmcmFjdGlvbk1hcFRleENvb3JkLnorcGVydHVyYmF0aW9uKjAuNSwwLjAsMS4wKTt2ZWM0IHJlZnJhY3RpdmVDb2xvcj10ZXh0dXJlMkQocmVmcmFjdGlvblNhbXBsZXIscHJvamVjdGVkUmVmcmFjdGlvblRleENvb3Jkcyk7XG4jaWZkZWYgSVNfUkVGUkFDVElPTl9MSU5FQVJcbnJlZnJhY3RpdmVDb2xvci5yZ2I9dG9HYW1tYVNwYWNlKHJlZnJhY3RpdmVDb2xvci5yZ2IpO1xuI2VuZGlmXG52ZWMyIHByb2plY3RlZFJlZmxlY3Rpb25UZXhDb29yZHM9Y2xhbXAodmVjMihcbnZSZWZsZWN0aW9uTWFwVGV4Q29vcmQueC92UmVmbGVjdGlvbk1hcFRleENvb3JkLnorcGVydHVyYmF0aW9uLngqMC4zLFxudlJlZmxlY3Rpb25NYXBUZXhDb29yZC55L3ZSZWZsZWN0aW9uTWFwVGV4Q29vcmQueitwZXJ0dXJiYXRpb24ueVxuKSwwLjAsMS4wKTt2ZWM0IHJlZmxlY3RpdmVDb2xvcj10ZXh0dXJlMkQocmVmbGVjdGlvblNhbXBsZXIscHJvamVjdGVkUmVmbGVjdGlvblRleENvb3Jkcyk7XG4jaWZkZWYgSVNfUkVGTEVDVElPTl9MSU5FQVJcbnJlZmxlY3RpdmVDb2xvci5yZ2I9dG9HYW1tYVNwYWNlKHJlZmxlY3RpdmVDb2xvci5yZ2IpO1xuI2VuZGlmXG52ZWMzIHVwVmVjdG9yPXZlYzMoMC4wLDEuMCwwLjApO2Zsb2F0IGZyZXNuZWxUZXJtPWNsYW1wKGFicyhwb3coZG90KHZpZXdEaXJlY3Rpb25XLHVwVmVjdG9yKSwzLjApKSwwLjA1LDAuNjUpO2Zsb2F0IElmcmVzbmVsVGVybT0xLjAtZnJlc25lbFRlcm07cmVmcmFjdGl2ZUNvbG9yPWNvbG9yQmxlbmRGYWN0b3Iqd2F0ZXJDb2xvcisoMS4wLWNvbG9yQmxlbmRGYWN0b3IpKnJlZnJhY3RpdmVDb2xvcjtyZWZsZWN0aXZlQ29sb3I9SWZyZXNuZWxUZXJtKmNvbG9yQmxlbmRGYWN0b3IyKndhdGVyQ29sb3IrKDEuMC1jb2xvckJsZW5kRmFjdG9yMipJZnJlc25lbFRlcm0pKnJlZmxlY3RpdmVDb2xvcjt2ZWM0IGNvbWJpbmVkQ29sb3I9cmVmcmFjdGl2ZUNvbG9yKmZyZXNuZWxUZXJtK3JlZmxlY3RpdmVDb2xvcipJZnJlc25lbFRlcm07YmFzZUNvbG9yPWNvbWJpbmVkQ29sb3I7XG4jZW5kaWZcbnZlYzMgZGlmZnVzZUJhc2U9dmVjMygwLiwwLiwwLik7bGlnaHRpbmdJbmZvIGluZm87ZmxvYXQgc2hhZG93PTEuO2Zsb2F0IGFnZ1NoYWRvdz0wLjtmbG9hdCBudW1MaWdodHM9MC47XG4jaWZkZWYgU1BFQ1VMQVJURVJNXG5mbG9hdCBnbG9zc2luZXNzPXZTcGVjdWxhckNvbG9yLmE7dmVjMyBzcGVjdWxhckJhc2U9dmVjMygwLiwwLiwwLik7dmVjMyBzcGVjdWxhckNvbG9yPXZTcGVjdWxhckNvbG9yLnJnYjtcbiNlbHNlXG5mbG9hdCBnbG9zc2luZXNzPTAuO1xuI2VuZGlmXG4jaW5jbHVkZTxsaWdodEZyYWdtZW50PlswLi5tYXhTaW11bHRhbmVvdXNMaWdodHNdXG52ZWMzIGZpbmFsRGlmZnVzZT1jbGFtcChiYXNlQ29sb3IucmdiLDAuMCwxLjApO1xuI2lmIGRlZmluZWQoVkVSVEVYQUxQSEEpIHx8IGRlZmluZWQoSU5TVEFOQ0VTQ09MT1IpICYmIGRlZmluZWQoSU5TVEFOQ0VTKVxuYWxwaGEqPXZDb2xvci5hO1xuI2VuZGlmXG4jaWZkZWYgU1BFQ1VMQVJURVJNXG52ZWMzIGZpbmFsU3BlY3VsYXI9c3BlY3VsYXJCYXNlKnNwZWN1bGFyQ29sb3I7XG4jZWxzZVxudmVjMyBmaW5hbFNwZWN1bGFyPXZlYzMoMC4wKTtcbiNlbmRpZlxuI2Vsc2UgXG4jaWZkZWYgUkVGTEVDVElPTlxudmVjMiBwcm9qZWN0ZWRSZWZyYWN0aW9uVGV4Q29vcmRzPWNsYW1wKHZSZWZyYWN0aW9uTWFwVGV4Q29vcmQueHkvdlJlZnJhY3Rpb25NYXBUZXhDb29yZC56K3BlcnR1cmJhdGlvbiwwLjAsMS4wKTt2ZWM0IHJlZnJhY3RpdmVDb2xvcj10ZXh0dXJlMkQocmVmcmFjdGlvblNhbXBsZXIscHJvamVjdGVkUmVmcmFjdGlvblRleENvb3Jkcyk7XG4jaWZkZWYgSVNfUkVGUkFDVElPTl9MSU5FQVJcbnJlZnJhY3RpdmVDb2xvci5yZ2I9dG9HYW1tYVNwYWNlKHJlZnJhY3RpdmVDb2xvci5yZ2IpO1xuI2VuZGlmXG52ZWMyIHByb2plY3RlZFJlZmxlY3Rpb25UZXhDb29yZHM9Y2xhbXAodlJlZmxlY3Rpb25NYXBUZXhDb29yZC54eS92UmVmbGVjdGlvbk1hcFRleENvb3JkLnorcGVydHVyYmF0aW9uLDAuMCwxLjApO3ZlYzQgcmVmbGVjdGl2ZUNvbG9yPXRleHR1cmUyRChyZWZsZWN0aW9uU2FtcGxlcixwcm9qZWN0ZWRSZWZsZWN0aW9uVGV4Q29vcmRzKTtcbiNpZmRlZiBJU19SRUZMRUNUSU9OX0xJTkVBUlxucmVmbGVjdGl2ZUNvbG9yLnJnYj10b0dhbW1hU3BhY2UocmVmbGVjdGl2ZUNvbG9yLnJnYik7XG4jZW5kaWZcbnZlYzMgdXBWZWN0b3I9dmVjMygwLjAsMS4wLDAuMCk7ZmxvYXQgZnJlc25lbFRlcm09bWF4KGRvdCh2aWV3RGlyZWN0aW9uVyx1cFZlY3RvciksMC4wKTt2ZWM0IGNvbWJpbmVkQ29sb3I9cmVmcmFjdGl2ZUNvbG9yKmZyZXNuZWxUZXJtK3JlZmxlY3RpdmVDb2xvciooMS4wLWZyZXNuZWxUZXJtKTtiYXNlQ29sb3I9Y29sb3JCbGVuZEZhY3Rvcip3YXRlckNvbG9yKygxLjAtY29sb3JCbGVuZEZhY3RvcikqY29tYmluZWRDb2xvcjtcbiNlbmRpZlxudmVjMyBkaWZmdXNlQmFzZT12ZWMzKDAuLDAuLDAuKTtsaWdodGluZ0luZm8gaW5mbztmbG9hdCBzaGFkb3c9MS47ZmxvYXQgYWdnU2hhZG93PTAuO2Zsb2F0IG51bUxpZ2h0cz0wLjtcbiNpZmRlZiBTUEVDVUxBUlRFUk1cbmZsb2F0IGdsb3NzaW5lc3M9dlNwZWN1bGFyQ29sb3IuYTt2ZWMzIHNwZWN1bGFyQmFzZT12ZWMzKDAuLDAuLDAuKTt2ZWMzIHNwZWN1bGFyQ29sb3I9dlNwZWN1bGFyQ29sb3IucmdiO1xuI2Vsc2VcbmZsb2F0IGdsb3NzaW5lc3M9MC47XG4jZW5kaWZcbiNpbmNsdWRlPGxpZ2h0RnJhZ21lbnQ+WzAuLm1heFNpbXVsdGFuZW91c0xpZ2h0c11cbnZlYzMgZmluYWxEaWZmdXNlPWNsYW1wKGJhc2VDb2xvci5yZ2IsMC4wLDEuMCk7XG4jaWYgZGVmaW5lZChWRVJURVhBTFBIQSkgfHwgZGVmaW5lZChJTlNUQU5DRVNDT0xPUikgJiYgZGVmaW5lZChJTlNUQU5DRVMpXG5hbHBoYSo9dkNvbG9yLmE7XG4jZW5kaWZcbiNpZmRlZiBTUEVDVUxBUlRFUk1cbnZlYzMgZmluYWxTcGVjdWxhcj1zcGVjdWxhckJhc2Uqc3BlY3VsYXJDb2xvcjtcbiNlbHNlXG52ZWMzIGZpbmFsU3BlY3VsYXI9dmVjMygwLjApO1xuI2VuZGlmXG4jZW5kaWZcbnZlYzQgY29sb3I9dmVjNChmaW5hbERpZmZ1c2UrZmluYWxTcGVjdWxhcixhbHBoYSk7XG4jaW5jbHVkZTxsb2dEZXB0aEZyYWdtZW50PlxuI2luY2x1ZGU8Zm9nRnJhZ21lbnQ+XG4jaWZkZWYgSU1BR0VQUk9DRVNTSU5HUE9TVFBST0NFU1NcbmNvbG9yLnJnYj10b0xpbmVhclNwYWNlKGNvbG9yLnJnYik7XG4jZWxpZiBkZWZpbmVkKElNQUdFUFJPQ0VTU0lORylcbmNvbG9yLnJnYj10b0xpbmVhclNwYWNlKGNvbG9yLnJnYik7Y29sb3I9YXBwbHlJbWFnZVByb2Nlc3NpbmcoY29sb3IpO1xuI2VuZGlmXG5nbF9GcmFnQ29sb3I9Y29sb3I7XG4jZGVmaW5lIENVU1RPTV9GUkFHTUVOVF9NQUlOX0VORFxufVxuYDtcbi8vIFNpZGVlZmZlY3RcblNoYWRlclN0b3JlLlNoYWRlcnNTdG9yZVtuYW1lXSA9IHNoYWRlcjtcbi8qKiBAaW50ZXJuYWwgKi9cbmV4cG9ydCBjb25zdCB3YXRlclBpeGVsU2hhZGVyID0geyBuYW1lLCBzaGFkZXIgfTtcbiIsIi8vIERvIG5vdCBlZGl0LlxuaW1wb3J0IHsgU2hhZGVyU3RvcmUgfSBmcm9tIFwiY29yZS9FbmdpbmVzL3NoYWRlclN0b3JlXCI7XG5pbXBvcnQgXCJjb3JlL1NoYWRlcnMvU2hhZGVyc0luY2x1ZGUvYm9uZXNEZWNsYXJhdGlvblwiO1xuaW1wb3J0IFwiY29yZS9TaGFkZXJzL1NoYWRlcnNJbmNsdWRlL2Jha2VkVmVydGV4QW5pbWF0aW9uRGVjbGFyYXRpb25cIjtcbmltcG9ydCBcImNvcmUvU2hhZGVycy9TaGFkZXJzSW5jbHVkZS9pbnN0YW5jZXNEZWNsYXJhdGlvblwiO1xuaW1wb3J0IFwiY29yZS9TaGFkZXJzL1NoYWRlcnNJbmNsdWRlL2NsaXBQbGFuZVZlcnRleERlY2xhcmF0aW9uXCI7XG5pbXBvcnQgXCJjb3JlL1NoYWRlcnMvU2hhZGVyc0luY2x1ZGUvZm9nVmVydGV4RGVjbGFyYXRpb25cIjtcbmltcG9ydCBcImNvcmUvU2hhZGVycy9TaGFkZXJzSW5jbHVkZS9saWdodEZyYWdtZW50RGVjbGFyYXRpb25cIjtcbmltcG9ydCBcImNvcmUvU2hhZGVycy9TaGFkZXJzSW5jbHVkZS9saWdodFVib0RlY2xhcmF0aW9uXCI7XG5pbXBvcnQgXCJjb3JlL1NoYWRlcnMvU2hhZGVyc0luY2x1ZGUvbG9nRGVwdGhEZWNsYXJhdGlvblwiO1xuaW1wb3J0IFwiY29yZS9TaGFkZXJzL1NoYWRlcnNJbmNsdWRlL2luc3RhbmNlc1ZlcnRleFwiO1xuaW1wb3J0IFwiY29yZS9TaGFkZXJzL1NoYWRlcnNJbmNsdWRlL2JvbmVzVmVydGV4XCI7XG5pbXBvcnQgXCJjb3JlL1NoYWRlcnMvU2hhZGVyc0luY2x1ZGUvYmFrZWRWZXJ0ZXhBbmltYXRpb25cIjtcbmltcG9ydCBcImNvcmUvU2hhZGVycy9TaGFkZXJzSW5jbHVkZS9jbGlwUGxhbmVWZXJ0ZXhcIjtcbmltcG9ydCBcImNvcmUvU2hhZGVycy9TaGFkZXJzSW5jbHVkZS9mb2dWZXJ0ZXhcIjtcbmltcG9ydCBcImNvcmUvU2hhZGVycy9TaGFkZXJzSW5jbHVkZS9zaGFkb3dzVmVydGV4XCI7XG5pbXBvcnQgXCJjb3JlL1NoYWRlcnMvU2hhZGVyc0luY2x1ZGUvdmVydGV4Q29sb3JNaXhpbmdcIjtcbmltcG9ydCBcImNvcmUvU2hhZGVycy9TaGFkZXJzSW5jbHVkZS9sb2dEZXB0aFZlcnRleFwiO1xuXG5jb25zdCBuYW1lID0gXCJ3YXRlclZlcnRleFNoYWRlclwiO1xuY29uc3Qgc2hhZGVyID0gYHByZWNpc2lvbiBoaWdocCBmbG9hdDthdHRyaWJ1dGUgdmVjMyBwb3NpdGlvbjtcbiNpZmRlZiBOT1JNQUxcbmF0dHJpYnV0ZSB2ZWMzIG5vcm1hbDtcbiNlbmRpZlxuI2lmZGVmIFVWMVxuYXR0cmlidXRlIHZlYzIgdXY7XG4jZW5kaWZcbiNpZmRlZiBVVjJcbmF0dHJpYnV0ZSB2ZWMyIHV2MjtcbiNlbmRpZlxuI2lmZGVmIFZFUlRFWENPTE9SXG5hdHRyaWJ1dGUgdmVjNCBjb2xvcjtcbiNlbmRpZlxuI2luY2x1ZGU8Ym9uZXNEZWNsYXJhdGlvbj5cbiNpbmNsdWRlPGJha2VkVmVydGV4QW5pbWF0aW9uRGVjbGFyYXRpb24+XG4jaW5jbHVkZTxpbnN0YW5jZXNEZWNsYXJhdGlvbj5cbnVuaWZvcm0gbWF0NCB2aWV3O3VuaWZvcm0gbWF0NCB2aWV3UHJvamVjdGlvbjtcbiNpZmRlZiBCVU1QXG52YXJ5aW5nIHZlYzIgdk5vcm1hbFVWO1xuI2lmZGVmIEJVTVBTVVBFUklNUE9TRVxudmFyeWluZyB2ZWMyIHZOb3JtYWxVVjI7XG4jZW5kaWZcbnVuaWZvcm0gbWF0NCBub3JtYWxNYXRyaXg7dW5pZm9ybSB2ZWMyIHZOb3JtYWxJbmZvcztcbiNlbmRpZlxuI2lmZGVmIFBPSU5UU0laRVxudW5pZm9ybSBmbG9hdCBwb2ludFNpemU7XG4jZW5kaWZcbnZhcnlpbmcgdmVjMyB2UG9zaXRpb25XO1xuI2lmZGVmIE5PUk1BTFxudmFyeWluZyB2ZWMzIHZOb3JtYWxXO1xuI2VuZGlmXG4jaWYgZGVmaW5lZChWRVJURVhDT0xPUikgfHwgZGVmaW5lZChJTlNUQU5DRVNDT0xPUikgJiYgZGVmaW5lZChJTlNUQU5DRVMpXG52YXJ5aW5nIHZlYzQgdkNvbG9yO1xuI2VuZGlmXG4jaW5jbHVkZTxjbGlwUGxhbmVWZXJ0ZXhEZWNsYXJhdGlvbj5cbiNpbmNsdWRlPGZvZ1ZlcnRleERlY2xhcmF0aW9uPlxuI2luY2x1ZGU8X19kZWNsX19saWdodEZyYWdtZW50PlswLi5tYXhTaW11bHRhbmVvdXNMaWdodHNdXG4jaW5jbHVkZTxsb2dEZXB0aERlY2xhcmF0aW9uPlxudW5pZm9ybSBtYXQ0IHJlZmxlY3Rpb25WaWV3UHJvamVjdGlvbjt1bmlmb3JtIHZlYzIgd2luZERpcmVjdGlvbjt1bmlmb3JtIGZsb2F0IHdhdmVMZW5ndGg7dW5pZm9ybSBmbG9hdCB0aW1lO3VuaWZvcm0gZmxvYXQgd2luZEZvcmNlO3VuaWZvcm0gZmxvYXQgd2F2ZUhlaWdodDt1bmlmb3JtIGZsb2F0IHdhdmVTcGVlZDt1bmlmb3JtIGZsb2F0IHdhdmVDb3VudDt2YXJ5aW5nIHZlYzMgdlJlZnJhY3Rpb25NYXBUZXhDb29yZDt2YXJ5aW5nIHZlYzMgdlJlZmxlY3Rpb25NYXBUZXhDb29yZDtcbiNkZWZpbmUgQ1VTVE9NX1ZFUlRFWF9ERUZJTklUSU9OU1xudm9pZCBtYWluKHZvaWQpIHtcbiNkZWZpbmUgQ1VTVE9NX1ZFUlRFWF9NQUlOX0JFR0lOXG4jaW5jbHVkZTxpbnN0YW5jZXNWZXJ0ZXg+XG4jaW5jbHVkZTxib25lc1ZlcnRleD5cbiNpbmNsdWRlPGJha2VkVmVydGV4QW5pbWF0aW9uPlxudmVjNCB3b3JsZFBvcz1maW5hbFdvcmxkKnZlYzQocG9zaXRpb24sMS4wKTt2UG9zaXRpb25XPXZlYzMod29ybGRQb3MpO1xuI2lmZGVmIE5PUk1BTFxudk5vcm1hbFc9bm9ybWFsaXplKHZlYzMoZmluYWxXb3JsZCp2ZWM0KG5vcm1hbCwwLjApKSk7XG4jZW5kaWZcbiNpZm5kZWYgVVYxXG52ZWMyIHV2PXZlYzIoMC4sMC4pO1xuI2VuZGlmXG4jaWZuZGVmIFVWMlxudmVjMiB1djI9dmVjMigwLiwwLik7XG4jZW5kaWZcbiNpZmRlZiBCVU1QXG5pZiAodk5vcm1hbEluZm9zLng9PTAuKVxue3ZOb3JtYWxVVj12ZWMyKG5vcm1hbE1hdHJpeCp2ZWM0KCh1dioxLjApL3dhdmVMZW5ndGgrdGltZSp3aW5kRm9yY2Uqd2luZERpcmVjdGlvbiwxLjAsMC4wKSk7XG4jaWZkZWYgQlVNUFNVUEVSSU1QT1NFXG52Tm9ybWFsVVYyPXZlYzIobm9ybWFsTWF0cml4KnZlYzQoKHV2KjAuNzIxKS93YXZlTGVuZ3RoK3RpbWUqMS4yKndpbmRGb3JjZSp3aW5kRGlyZWN0aW9uLDEuMCwwLjApKTtcbiNlbmRpZlxufVxuZWxzZVxue3ZOb3JtYWxVVj12ZWMyKG5vcm1hbE1hdHJpeCp2ZWM0KCh1djIqMS4wKS93YXZlTGVuZ3RoK3RpbWUqd2luZEZvcmNlKndpbmREaXJlY3Rpb24gLDEuMCwwLjApKTtcbiNpZmRlZiBCVU1QU1VQRVJJTVBPU0VcbnZOb3JtYWxVVjI9dmVjMihub3JtYWxNYXRyaXgqdmVjNCgodXYyKjAuNzIxKS93YXZlTGVuZ3RoK3RpbWUqMS4yKndpbmRGb3JjZSp3aW5kRGlyZWN0aW9uICwxLjAsMC4wKSk7XG4jZW5kaWZcbn1cbiNlbmRpZlxuI2luY2x1ZGU8Y2xpcFBsYW5lVmVydGV4PlxuI2luY2x1ZGU8Zm9nVmVydGV4PlxuI2luY2x1ZGU8c2hhZG93c1ZlcnRleD5bMC4ubWF4U2ltdWx0YW5lb3VzTGlnaHRzXVxuI2luY2x1ZGU8dmVydGV4Q29sb3JNaXhpbmc+XG4jaWYgZGVmaW5lZChQT0lOVFNJWkUpICYmICFkZWZpbmVkKFdFQkdQVSlcbmdsX1BvaW50U2l6ZT1wb2ludFNpemU7XG4jZW5kaWZcbmZsb2F0IGZpbmFsV2F2ZUNvdW50PTEuMC8od2F2ZUNvdW50KjAuNSk7XG4jaWZkZWYgVVNFX1dPUkxEX0NPT1JESU5BVEVTXG52ZWMzIHA9d29ybGRQb3MueHl6O1xuI2Vsc2VcbnZlYzMgcD1wb3NpdGlvbjtcbiNlbmRpZlxuZmxvYXQgbmV3WT0oc2luKCgocC54L2ZpbmFsV2F2ZUNvdW50KSt0aW1lKndhdmVTcGVlZCkpKndhdmVIZWlnaHQqd2luZERpcmVjdGlvbi54KjUuMClcbisgKGNvcygoKHAuei9maW5hbFdhdmVDb3VudCkrIHRpbWUqd2F2ZVNwZWVkKSkqd2F2ZUhlaWdodCp3aW5kRGlyZWN0aW9uLnkqNS4wKTtwLnkrPWFicyhuZXdZKTtcbiNpZmRlZiBVU0VfV09STERfQ09PUkRJTkFURVNcbmdsX1Bvc2l0aW9uPXZpZXdQcm9qZWN0aW9uKnZlYzQocCwxLjApO1xuI2Vsc2VcbmdsX1Bvc2l0aW9uPXZpZXdQcm9qZWN0aW9uKmZpbmFsV29ybGQqdmVjNChwLDEuMCk7XG4jZW5kaWZcbiNpZmRlZiBSRUZMRUNUSU9OXG52UmVmcmFjdGlvbk1hcFRleENvb3JkLng9MC41KihnbF9Qb3NpdGlvbi53K2dsX1Bvc2l0aW9uLngpO3ZSZWZyYWN0aW9uTWFwVGV4Q29vcmQueT0wLjUqKGdsX1Bvc2l0aW9uLncrZ2xfUG9zaXRpb24ueSk7dlJlZnJhY3Rpb25NYXBUZXhDb29yZC56PWdsX1Bvc2l0aW9uLnc7d29ybGRQb3M9cmVmbGVjdGlvblZpZXdQcm9qZWN0aW9uKmZpbmFsV29ybGQqdmVjNChwb3NpdGlvbiwxLjApO3ZSZWZsZWN0aW9uTWFwVGV4Q29vcmQueD0wLjUqKHdvcmxkUG9zLncrd29ybGRQb3MueCk7dlJlZmxlY3Rpb25NYXBUZXhDb29yZC55PTAuNSood29ybGRQb3Mudyt3b3JsZFBvcy55KTt2UmVmbGVjdGlvbk1hcFRleENvb3JkLno9d29ybGRQb3MudztcbiNlbmRpZlxuI2luY2x1ZGU8bG9nRGVwdGhWZXJ0ZXg+XG4jZGVmaW5lIENVU1RPTV9WRVJURVhfTUFJTl9FTkRcbn1cbmA7XG4vLyBTaWRlZWZmZWN0XG5TaGFkZXJTdG9yZS5TaGFkZXJzU3RvcmVbbmFtZV0gPSBzaGFkZXI7XG4vKiogQGludGVybmFsICovXG5leHBvcnQgY29uc3Qgd2F0ZXJWZXJ0ZXhTaGFkZXIgPSB7IG5hbWUsIHNoYWRlciB9O1xuIiwiLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25hbWluZy1jb252ZW50aW9uICovXHJcbmltcG9ydCB0eXBlIHsgTnVsbGFibGUgfSBmcm9tIFwiY29yZS90eXBlc1wiO1xyXG5pbXBvcnQgeyBzZXJpYWxpemVBc1ZlY3RvcjIsIHNlcmlhbGl6ZUFzVGV4dHVyZSwgc2VyaWFsaXplLCBleHBhbmRUb1Byb3BlcnR5LCBzZXJpYWxpemVBc0NvbG9yMywgU2VyaWFsaXphdGlvbkhlbHBlciB9IGZyb20gXCJjb3JlL01pc2MvZGVjb3JhdG9yc1wiO1xyXG5pbXBvcnQgeyBNYXRyaXgsIFZlY3RvcjIsIFZlY3RvcjMgfSBmcm9tIFwiY29yZS9NYXRocy9tYXRoLnZlY3RvclwiO1xyXG5pbXBvcnQgeyBDb2xvcjMgfSBmcm9tIFwiY29yZS9NYXRocy9tYXRoLmNvbG9yXCI7XHJcbmltcG9ydCB7IFBsYW5lIH0gZnJvbSBcImNvcmUvTWF0aHMvbWF0aC5wbGFuZVwiO1xyXG5pbXBvcnQgdHlwZSB7IElBbmltYXRhYmxlIH0gZnJvbSBcImNvcmUvQW5pbWF0aW9ucy9hbmltYXRhYmxlLmludGVyZmFjZVwiO1xyXG5pbXBvcnQgeyBDb25zdGFudHMgfSBmcm9tIFwiY29yZS9FbmdpbmVzL2NvbnN0YW50c1wiO1xyXG5pbXBvcnQgeyBTbWFydEFycmF5IH0gZnJvbSBcImNvcmUvTWlzYy9zbWFydEFycmF5XCI7XHJcbmltcG9ydCB0eXBlIHsgT2JzZXJ2ZXIgfSBmcm9tIFwiY29yZS9NaXNjL29ic2VydmFibGVcIjtcclxuaW1wb3J0IHR5cGUgeyBCYXNlVGV4dHVyZSB9IGZyb20gXCJjb3JlL01hdGVyaWFscy9UZXh0dXJlcy9iYXNlVGV4dHVyZVwiO1xyXG5pbXBvcnQgeyBSZW5kZXJUYXJnZXRUZXh0dXJlIH0gZnJvbSBcImNvcmUvTWF0ZXJpYWxzL1RleHR1cmVzL3JlbmRlclRhcmdldFRleHR1cmVcIjtcclxuaW1wb3J0IHR5cGUgeyBJRWZmZWN0Q3JlYXRpb25PcHRpb25zIH0gZnJvbSBcImNvcmUvTWF0ZXJpYWxzL2VmZmVjdFwiO1xyXG5pbXBvcnQgeyBNYXRlcmlhbERlZmluZXMgfSBmcm9tIFwiY29yZS9NYXRlcmlhbHMvbWF0ZXJpYWxEZWZpbmVzXCI7XHJcbmltcG9ydCB0eXBlIHsgSUltYWdlUHJvY2Vzc2luZ0NvbmZpZ3VyYXRpb25EZWZpbmVzIH0gZnJvbSBcImNvcmUvTWF0ZXJpYWxzL2ltYWdlUHJvY2Vzc2luZ0NvbmZpZ3VyYXRpb25cIjtcclxuaW1wb3J0IHsgSW1hZ2VQcm9jZXNzaW5nQ29uZmlndXJhdGlvbiB9IGZyb20gXCJjb3JlL01hdGVyaWFscy9pbWFnZVByb2Nlc3NpbmdDb25maWd1cmF0aW9uXCI7XHJcbmltcG9ydCB7IE1hdGVyaWFsSGVscGVyIH0gZnJvbSBcImNvcmUvTWF0ZXJpYWxzL21hdGVyaWFsSGVscGVyXCI7XHJcbmltcG9ydCB7IFB1c2hNYXRlcmlhbCB9IGZyb20gXCJjb3JlL01hdGVyaWFscy9wdXNoTWF0ZXJpYWxcIjtcclxuaW1wb3J0IHsgTWF0ZXJpYWxGbGFncyB9IGZyb20gXCJjb3JlL01hdGVyaWFscy9tYXRlcmlhbEZsYWdzXCI7XHJcbmltcG9ydCB7IFZlcnRleEJ1ZmZlciB9IGZyb20gXCJjb3JlL0J1ZmZlcnMvYnVmZmVyXCI7XHJcbmltcG9ydCB0eXBlIHsgQWJzdHJhY3RNZXNoIH0gZnJvbSBcImNvcmUvTWVzaGVzL2Fic3RyYWN0TWVzaFwiO1xyXG5pbXBvcnQgdHlwZSB7IFN1Yk1lc2ggfSBmcm9tIFwiY29yZS9NZXNoZXMvc3ViTWVzaFwiO1xyXG5pbXBvcnQgdHlwZSB7IE1lc2ggfSBmcm9tIFwiY29yZS9NZXNoZXMvbWVzaFwiO1xyXG5pbXBvcnQgdHlwZSB7IENhbWVyYSB9IGZyb20gXCJjb3JlL0NhbWVyYXMvY2FtZXJhXCI7XHJcbmltcG9ydCB7IFNjZW5lIH0gZnJvbSBcImNvcmUvc2NlbmVcIjtcclxuaW1wb3J0IHsgUmVnaXN0ZXJDbGFzcyB9IGZyb20gXCJjb3JlL01pc2MvdHlwZVN0b3JlXCI7XHJcblxyXG5pbXBvcnQgXCIuL3dhdGVyLmZyYWdtZW50XCI7XHJcbmltcG9ydCBcIi4vd2F0ZXIudmVydGV4XCI7XHJcbmltcG9ydCB7IEVmZmVjdEZhbGxiYWNrcyB9IGZyb20gXCJjb3JlL01hdGVyaWFscy9lZmZlY3RGYWxsYmFja3NcIjtcclxuaW1wb3J0IHsgQ3JlYXRlR3JvdW5kIH0gZnJvbSBcImNvcmUvTWVzaGVzL0J1aWxkZXJzL2dyb3VuZEJ1aWxkZXJcIjtcclxuaW1wb3J0IHsgYWRkQ2xpcFBsYW5lVW5pZm9ybXMsIGJpbmRDbGlwUGxhbmUgfSBmcm9tIFwiY29yZS9NYXRlcmlhbHMvY2xpcFBsYW5lTWF0ZXJpYWxIZWxwZXJcIjtcclxuXHJcbmNsYXNzIFdhdGVyTWF0ZXJpYWxEZWZpbmVzIGV4dGVuZHMgTWF0ZXJpYWxEZWZpbmVzIGltcGxlbWVudHMgSUltYWdlUHJvY2Vzc2luZ0NvbmZpZ3VyYXRpb25EZWZpbmVzIHtcclxuICAgIHB1YmxpYyBCVU1QID0gZmFsc2U7XHJcbiAgICBwdWJsaWMgUkVGTEVDVElPTiA9IGZhbHNlO1xyXG4gICAgcHVibGljIENMSVBQTEFORSA9IGZhbHNlO1xyXG4gICAgcHVibGljIENMSVBQTEFORTIgPSBmYWxzZTtcclxuICAgIHB1YmxpYyBDTElQUExBTkUzID0gZmFsc2U7XHJcbiAgICBwdWJsaWMgQ0xJUFBMQU5FNCA9IGZhbHNlO1xyXG4gICAgcHVibGljIENMSVBQTEFORTUgPSBmYWxzZTtcclxuICAgIHB1YmxpYyBDTElQUExBTkU2ID0gZmFsc2U7XHJcbiAgICBwdWJsaWMgQUxQSEFURVNUID0gZmFsc2U7XHJcbiAgICBwdWJsaWMgREVQVEhQUkVQQVNTID0gZmFsc2U7XHJcbiAgICBwdWJsaWMgUE9JTlRTSVpFID0gZmFsc2U7XHJcbiAgICBwdWJsaWMgRk9HID0gZmFsc2U7XHJcbiAgICBwdWJsaWMgTk9STUFMID0gZmFsc2U7XHJcbiAgICBwdWJsaWMgVVYxID0gZmFsc2U7XHJcbiAgICBwdWJsaWMgVVYyID0gZmFsc2U7XHJcbiAgICBwdWJsaWMgVkVSVEVYQ09MT1IgPSBmYWxzZTtcclxuICAgIHB1YmxpYyBWRVJURVhBTFBIQSA9IGZhbHNlO1xyXG4gICAgcHVibGljIE5VTV9CT05FX0lORkxVRU5DRVJTID0gMDtcclxuICAgIHB1YmxpYyBCb25lc1Blck1lc2ggPSAwO1xyXG4gICAgcHVibGljIElOU1RBTkNFUyA9IGZhbHNlO1xyXG4gICAgcHVibGljIElOU1RBTkNFU0NPTE9SID0gZmFsc2U7XHJcbiAgICBwdWJsaWMgU1BFQ1VMQVJURVJNID0gZmFsc2U7XHJcbiAgICBwdWJsaWMgTE9HQVJJVEhNSUNERVBUSCA9IGZhbHNlO1xyXG4gICAgcHVibGljIFVTRV9SRVZFUlNFX0RFUFRIQlVGRkVSID0gZmFsc2U7XHJcbiAgICBwdWJsaWMgRlJFU05FTFNFUEFSQVRFID0gZmFsc2U7XHJcbiAgICBwdWJsaWMgQlVNUFNVUEVSSU1QT1NFID0gZmFsc2U7XHJcbiAgICBwdWJsaWMgQlVNUEFGRkVDVFNSRUZMRUNUSU9OID0gZmFsc2U7XHJcbiAgICBwdWJsaWMgVVNFX1dPUkxEX0NPT1JESU5BVEVTID0gZmFsc2U7XHJcblxyXG4gICAgcHVibGljIElNQUdFUFJPQ0VTU0lORyA9IGZhbHNlO1xyXG4gICAgcHVibGljIFZJR05FVFRFID0gZmFsc2U7XHJcbiAgICBwdWJsaWMgVklHTkVUVEVCTEVORE1PREVNVUxUSVBMWSA9IGZhbHNlO1xyXG4gICAgcHVibGljIFZJR05FVFRFQkxFTkRNT0RFT1BBUVVFID0gZmFsc2U7XHJcbiAgICBwdWJsaWMgVE9ORU1BUFBJTkcgPSBmYWxzZTtcclxuICAgIHB1YmxpYyBUT05FTUFQUElOR19BQ0VTID0gZmFsc2U7XHJcbiAgICBwdWJsaWMgQ09OVFJBU1QgPSBmYWxzZTtcclxuICAgIHB1YmxpYyBFWFBPU1VSRSA9IGZhbHNlO1xyXG4gICAgcHVibGljIENPTE9SQ1VSVkVTID0gZmFsc2U7XHJcbiAgICBwdWJsaWMgQ09MT1JHUkFESU5HID0gZmFsc2U7XHJcbiAgICBwdWJsaWMgQ09MT1JHUkFESU5HM0QgPSBmYWxzZTtcclxuICAgIHB1YmxpYyBTQU1QTEVSM0RHUkVFTkRFUFRIID0gZmFsc2U7XHJcbiAgICBwdWJsaWMgU0FNUExFUjNEQkdSTUFQID0gZmFsc2U7XHJcbiAgICBwdWJsaWMgRElUSEVSID0gZmFsc2U7XHJcbiAgICBwdWJsaWMgSU1BR0VQUk9DRVNTSU5HUE9TVFBST0NFU1MgPSBmYWxzZTtcclxuICAgIHB1YmxpYyBTS0lQRklOQUxDT0xPUkNMQU1QID0gZmFsc2U7XHJcblxyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgc3VwZXIoKTtcclxuICAgICAgICB0aGlzLnJlYnVpbGQoKTtcclxuICAgIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFdhdGVyTWF0ZXJpYWwgZXh0ZW5kcyBQdXNoTWF0ZXJpYWwge1xyXG4gICAgLypcclxuICAgICAqIFB1YmxpYyBtZW1iZXJzXHJcbiAgICAgKi9cclxuICAgIEBzZXJpYWxpemVBc1RleHR1cmUoXCJidW1wVGV4dHVyZVwiKVxyXG4gICAgcHJpdmF0ZSBfYnVtcFRleHR1cmU6IEJhc2VUZXh0dXJlO1xyXG4gICAgQGV4cGFuZFRvUHJvcGVydHkoXCJfbWFya0FsbFN1Yk1lc2hlc0FzVGV4dHVyZXNEaXJ0eVwiKVxyXG4gICAgcHVibGljIGJ1bXBUZXh0dXJlOiBCYXNlVGV4dHVyZTtcclxuXHJcbiAgICBAc2VyaWFsaXplQXNDb2xvcjMoKVxyXG4gICAgcHVibGljIGRpZmZ1c2VDb2xvciA9IG5ldyBDb2xvcjMoMSwgMSwgMSk7XHJcblxyXG4gICAgQHNlcmlhbGl6ZUFzQ29sb3IzKClcclxuICAgIHB1YmxpYyBzcGVjdWxhckNvbG9yID0gbmV3IENvbG9yMygwLCAwLCAwKTtcclxuXHJcbiAgICBAc2VyaWFsaXplKClcclxuICAgIHB1YmxpYyBzcGVjdWxhclBvd2VyID0gNjQ7XHJcblxyXG4gICAgQHNlcmlhbGl6ZShcImRpc2FibGVMaWdodGluZ1wiKVxyXG4gICAgcHJpdmF0ZSBfZGlzYWJsZUxpZ2h0aW5nID0gZmFsc2U7XHJcbiAgICBAZXhwYW5kVG9Qcm9wZXJ0eShcIl9tYXJrQWxsU3ViTWVzaGVzQXNMaWdodHNEaXJ0eVwiKVxyXG4gICAgcHVibGljIGRpc2FibGVMaWdodGluZzogYm9vbGVhbjtcclxuXHJcbiAgICBAc2VyaWFsaXplKFwibWF4U2ltdWx0YW5lb3VzTGlnaHRzXCIpXHJcbiAgICBwcml2YXRlIF9tYXhTaW11bHRhbmVvdXNMaWdodHMgPSA0O1xyXG4gICAgQGV4cGFuZFRvUHJvcGVydHkoXCJfbWFya0FsbFN1Yk1lc2hlc0FzTGlnaHRzRGlydHlcIilcclxuICAgIHB1YmxpYyBtYXhTaW11bHRhbmVvdXNMaWdodHM6IG51bWJlcjtcclxuXHJcbiAgICAvKipcclxuICAgICAqIERlZmluZXMgdGhlIHdpbmQgZm9yY2UuXHJcbiAgICAgKi9cclxuICAgIEBzZXJpYWxpemUoKVxyXG4gICAgcHVibGljIHdpbmRGb3JjZTogbnVtYmVyID0gNjtcclxuICAgIC8qKlxyXG4gICAgICogRGVmaW5lcyB0aGUgZGlyZWN0aW9uIG9mIHRoZSB3aW5kIGluIHRoZSBwbGFuZSAoWCwgWikuXHJcbiAgICAgKi9cclxuICAgIEBzZXJpYWxpemVBc1ZlY3RvcjIoKVxyXG4gICAgcHVibGljIHdpbmREaXJlY3Rpb246IFZlY3RvcjIgPSBuZXcgVmVjdG9yMigwLCAxKTtcclxuICAgIC8qKlxyXG4gICAgICogRGVmaW5lcyB0aGUgaGVpZ2h0IG9mIHRoZSB3YXZlcy5cclxuICAgICAqL1xyXG4gICAgQHNlcmlhbGl6ZSgpXHJcbiAgICBwdWJsaWMgd2F2ZUhlaWdodDogbnVtYmVyID0gMC40O1xyXG4gICAgLyoqXHJcbiAgICAgKiBEZWZpbmVzIHRoZSBidW1wIGhlaWdodCByZWxhdGVkIHRvIHRoZSBidW1wIG1hcC5cclxuICAgICAqL1xyXG4gICAgQHNlcmlhbGl6ZSgpXHJcbiAgICBwdWJsaWMgYnVtcEhlaWdodDogbnVtYmVyID0gMC40O1xyXG4gICAgLyoqXHJcbiAgICAgKiBEZWZpbmVzIHdldGhlciBvciBub3Q6IHRvIGFkZCBhIHNtYWxsZXIgbW92aW5nIGJ1bXAgdG8gbGVzcyBzdGVhZHkgd2F2ZXMuXHJcbiAgICAgKi9cclxuICAgIEBzZXJpYWxpemUoXCJidW1wU3VwZXJpbXBvc2VcIilcclxuICAgIHByaXZhdGUgX2J1bXBTdXBlcmltcG9zZSA9IGZhbHNlO1xyXG4gICAgQGV4cGFuZFRvUHJvcGVydHkoXCJfbWFya0FsbFN1Yk1lc2hlc0FzTWlzY0RpcnR5XCIpXHJcbiAgICBwdWJsaWMgYnVtcFN1cGVyaW1wb3NlOiBib29sZWFuO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogRGVmaW5lcyB3ZXRoZXIgb3Igbm90IGNvbG9yIHJlZnJhY3Rpb24gYW5kIHJlZmxlY3Rpb24gZGlmZmVyZW50bHkgd2l0aCAud2F0ZXJDb2xvcjIgYW5kIC5jb2xvckJsZW5kRmFjdG9yMi4gTm9uLWxpbmVhciAocGh5c2ljYWxseSBjb3JyZWN0KSBmcmVzbmVsLlxyXG4gICAgICovXHJcbiAgICBAc2VyaWFsaXplKFwiZnJlc25lbFNlcGFyYXRlXCIpXHJcbiAgICBwcml2YXRlIF9mcmVzbmVsU2VwYXJhdGUgPSBmYWxzZTtcclxuICAgIEBleHBhbmRUb1Byb3BlcnR5KFwiX21hcmtBbGxTdWJNZXNoZXNBc01pc2NEaXJ0eVwiKVxyXG4gICAgcHVibGljIGZyZXNuZWxTZXBhcmF0ZTogYm9vbGVhbjtcclxuXHJcbiAgICAvKipcclxuICAgICAqIERlZmluZXMgd2V0aGVyIG9yIG5vdCBidW1wIFd3dmVzIG1vZGlmeSB0aGUgcmVmbGVjdGlvbi5cclxuICAgICAqL1xyXG4gICAgQHNlcmlhbGl6ZShcImJ1bXBBZmZlY3RzUmVmbGVjdGlvblwiKVxyXG4gICAgcHJpdmF0ZSBfYnVtcEFmZmVjdHNSZWZsZWN0aW9uID0gZmFsc2U7XHJcbiAgICBAZXhwYW5kVG9Qcm9wZXJ0eShcIl9tYXJrQWxsU3ViTWVzaGVzQXNNaXNjRGlydHlcIilcclxuICAgIHB1YmxpYyBidW1wQWZmZWN0c1JlZmxlY3Rpb246IGJvb2xlYW47XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBEZWZpbmVzIHRoZSB3YXRlciBjb2xvciBibGVuZGVkIHdpdGggdGhlIHJlZnJhY3Rpb24gKG5lYXIpLlxyXG4gICAgICovXHJcbiAgICBAc2VyaWFsaXplQXNDb2xvcjMoKVxyXG4gICAgcHVibGljIHdhdGVyQ29sb3I6IENvbG9yMyA9IG5ldyBDb2xvcjMoMC4xLCAwLjEsIDAuNik7XHJcbiAgICAvKipcclxuICAgICAqIERlZmluZXMgdGhlIGJsZW5kIGZhY3RvciByZWxhdGVkIHRvIHRoZSB3YXRlciBjb2xvci5cclxuICAgICAqL1xyXG4gICAgQHNlcmlhbGl6ZSgpXHJcbiAgICBwdWJsaWMgY29sb3JCbGVuZEZhY3RvcjogbnVtYmVyID0gMC4yO1xyXG4gICAgLyoqXHJcbiAgICAgKiBEZWZpbmVzIHRoZSB3YXRlciBjb2xvciBibGVuZGVkIHdpdGggdGhlIHJlZmxlY3Rpb24gKGZhcikuXHJcbiAgICAgKi9cclxuICAgIEBzZXJpYWxpemVBc0NvbG9yMygpXHJcbiAgICBwdWJsaWMgd2F0ZXJDb2xvcjI6IENvbG9yMyA9IG5ldyBDb2xvcjMoMC4xLCAwLjEsIDAuNik7XHJcbiAgICAvKipcclxuICAgICAqIERlZmluZXMgdGhlIGJsZW5kIGZhY3RvciByZWxhdGVkIHRvIHRoZSB3YXRlciBjb2xvciAocmVmbGVjdGlvbiwgZmFyKS5cclxuICAgICAqL1xyXG4gICAgQHNlcmlhbGl6ZSgpXHJcbiAgICBwdWJsaWMgY29sb3JCbGVuZEZhY3RvcjI6IG51bWJlciA9IDAuMjtcclxuICAgIC8qKlxyXG4gICAgICogRGVmaW5lcyB0aGUgbWF4aW11bSBsZW5ndGggb2YgYSB3YXZlLlxyXG4gICAgICovXHJcbiAgICBAc2VyaWFsaXplKClcclxuICAgIHB1YmxpYyB3YXZlTGVuZ3RoOiBudW1iZXIgPSAwLjE7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBEZWZpbmVzIHRoZSB3YXZlcyBzcGVlZC5cclxuICAgICAqL1xyXG4gICAgQHNlcmlhbGl6ZSgpXHJcbiAgICBwdWJsaWMgd2F2ZVNwZWVkOiBudW1iZXIgPSAxLjA7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBEZWZpbmVzIHRoZSBudW1iZXIgb2YgdGltZXMgd2F2ZXMgYXJlIHJlcGVhdGVkLiBUaGlzIGlzIHR5cGljYWxseSB1c2VkIHRvIGFkanVzdCB3YXZlcyBjb3VudCBhY2NvcmRpbmcgdG8gdGhlIGdyb3VuZCdzIHNpemUgd2hlcmUgdGhlIG1hdGVyaWFsIGlzIGFwcGxpZWQgb24uXHJcbiAgICAgKi9cclxuICAgIEBzZXJpYWxpemUoKVxyXG4gICAgcHVibGljIHdhdmVDb3VudDogbnVtYmVyID0gMjA7XHJcbiAgICAvKipcclxuICAgICAqIFNldHMgb3IgZ2V0cyB3aGV0aGVyIG9yIG5vdCBhdXRvbWF0aWMgY2xpcHBpbmcgc2hvdWxkIGJlIGVuYWJsZWQgb3Igbm90LiBTZXR0aW5nIHRvIHRydWUgd2lsbCBzYXZlIHBlcmZvcm1hbmNlcyBhbmRcclxuICAgICAqIHdpbGwgYXZvaWQgY2FsY3VsYXRpbmcgdXNlbGVzcyBwaXhlbHMgaW4gdGhlIHBpeGVsIHNoYWRlciBvZiB0aGUgd2F0ZXIgbWF0ZXJpYWwuXHJcbiAgICAgKi9cclxuICAgIEBzZXJpYWxpemUoKVxyXG4gICAgcHVibGljIGRpc2FibGVDbGlwUGxhbmU6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIERlZmluZXMgd2hldGhlciBvciBub3QgdG8gdXNlIHdvcmxkIGNvb3JkaW5hdGVzIGZvciB3YXZlIGRlZm9ybWF0aW9ucy5cclxuICAgICAqIFRoZSBkZWZhdWx0IHZhbHVlIGlzIGZhbHNlLCBtZWFuaW5nIHRoYXQgdGhlIGRlZm9ybWF0aW9uIGlzIGFwcGxpZWQgaW4gb2JqZWN0IChsb2NhbCkgc3BhY2UuXHJcbiAgICAgKiBZb3Ugd2lsbCBwcm9iYWJseSBuZWVkIHRvIHNldCBpdCB0byB0cnVlIGlmIHlvdSBhcmUgdXNpbmcgaW5zdGFuY2VzIG9yIHRoaW4gaW5zdGFuY2VzIGZvciB5b3VyIHdhdGVyIG9iamVjdHMuXHJcbiAgICAgKi9cclxuICAgIEBzZXJpYWxpemUoXCJ1c2VXb3JsZENvb3JkaW5hdGVzRm9yV2F2ZURlZm9ybWF0aW9uXCIpXHJcbiAgICBwcml2YXRlIF91c2VXb3JsZENvb3JkaW5hdGVzRm9yV2F2ZURlZm9ybWF0aW9uID0gZmFsc2U7XHJcbiAgICBAZXhwYW5kVG9Qcm9wZXJ0eShcIl9tYXJrQWxsU3ViTWVzaGVzQXNNaXNjRGlydHlcIilcclxuICAgIHB1YmxpYyB1c2VXb3JsZENvb3JkaW5hdGVzRm9yV2F2ZURlZm9ybWF0aW9uOiBib29sZWFuO1xyXG5cclxuICAgIHByb3RlY3RlZCBfcmVuZGVyVGFyZ2V0cyA9IG5ldyBTbWFydEFycmF5PFJlbmRlclRhcmdldFRleHR1cmU+KDE2KTtcclxuXHJcbiAgICAvKlxyXG4gICAgICogUHJpdmF0ZSBtZW1iZXJzXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgX21lc2g6IE51bGxhYmxlPEFic3RyYWN0TWVzaD4gPSBudWxsO1xyXG5cclxuICAgIHByaXZhdGUgX3JlZnJhY3Rpb25SVFQ6IE51bGxhYmxlPFJlbmRlclRhcmdldFRleHR1cmU+O1xyXG4gICAgcHJpdmF0ZSBfcmVmbGVjdGlvblJUVDogTnVsbGFibGU8UmVuZGVyVGFyZ2V0VGV4dHVyZT47XHJcblxyXG4gICAgcHJpdmF0ZSBfcmVmbGVjdGlvblRyYW5zZm9ybTogTWF0cml4ID0gTWF0cml4Llplcm8oKTtcclxuICAgIHByaXZhdGUgX2xhc3RUaW1lOiBudW1iZXIgPSAwO1xyXG4gICAgcHJpdmF0ZSBfbGFzdERlbHRhVGltZTogbnVtYmVyID0gMDtcclxuXHJcbiAgICBwcml2YXRlIF91c2VMb2dhcml0aG1pY0RlcHRoOiBib29sZWFuO1xyXG5cclxuICAgIHByaXZhdGUgX3dhaXRpbmdSZW5kZXJMaXN0OiBOdWxsYWJsZTxzdHJpbmdbXT47XHJcblxyXG4gICAgcHJpdmF0ZSBfaW1hZ2VQcm9jZXNzaW5nQ29uZmlndXJhdGlvbjogTnVsbGFibGU8SW1hZ2VQcm9jZXNzaW5nQ29uZmlndXJhdGlvbj47XHJcbiAgICBwcml2YXRlIF9pbWFnZVByb2Nlc3NpbmdPYnNlcnZlcjogTnVsbGFibGU8T2JzZXJ2ZXI8SW1hZ2VQcm9jZXNzaW5nQ29uZmlndXJhdGlvbj4+O1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogR2V0cyBhIGJvb2xlYW4gaW5kaWNhdGluZyB0aGF0IGN1cnJlbnQgbWF0ZXJpYWwgbmVlZHMgdG8gcmVnaXN0ZXIgUlRUXHJcbiAgICAgKi9cclxuICAgIHB1YmxpYyBnZXQgaGFzUmVuZGVyVGFyZ2V0VGV4dHVyZXMoKTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDb25zdHJ1Y3RvclxyXG4gICAgICogQHBhcmFtIG5hbWVcclxuICAgICAqIEBwYXJhbSBzY2VuZVxyXG4gICAgICogQHBhcmFtIHJlbmRlclRhcmdldFNpemVcclxuICAgICAqL1xyXG4gICAgY29uc3RydWN0b3IoXHJcbiAgICAgICAgbmFtZTogc3RyaW5nLFxyXG4gICAgICAgIHNjZW5lPzogU2NlbmUsXHJcbiAgICAgICAgcHVibGljIHJlbmRlclRhcmdldFNpemU6IFZlY3RvcjIgPSBuZXcgVmVjdG9yMig1MTIsIDUxMilcclxuICAgICkge1xyXG4gICAgICAgIHN1cGVyKG5hbWUsIHNjZW5lKTtcclxuXHJcbiAgICAgICAgdGhpcy5fY3JlYXRlUmVuZGVyVGFyZ2V0cyh0aGlzLmdldFNjZW5lKCksIHJlbmRlclRhcmdldFNpemUpO1xyXG5cclxuICAgICAgICAvLyBDcmVhdGUgcmVuZGVyIHRhcmdldHNcclxuICAgICAgICB0aGlzLmdldFJlbmRlclRhcmdldFRleHR1cmVzID0gKCk6IFNtYXJ0QXJyYXk8UmVuZGVyVGFyZ2V0VGV4dHVyZT4gPT4ge1xyXG4gICAgICAgICAgICB0aGlzLl9yZW5kZXJUYXJnZXRzLnJlc2V0KCk7XHJcbiAgICAgICAgICAgIHRoaXMuX3JlbmRlclRhcmdldHMucHVzaCg8UmVuZGVyVGFyZ2V0VGV4dHVyZT50aGlzLl9yZWZsZWN0aW9uUlRUKTtcclxuICAgICAgICAgICAgdGhpcy5fcmVuZGVyVGFyZ2V0cy5wdXNoKDxSZW5kZXJUYXJnZXRUZXh0dXJlPnRoaXMuX3JlZnJhY3Rpb25SVFQpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3JlbmRlclRhcmdldHM7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5faW1hZ2VQcm9jZXNzaW5nQ29uZmlndXJhdGlvbiA9IHRoaXMuZ2V0U2NlbmUoKS5pbWFnZVByb2Nlc3NpbmdDb25maWd1cmF0aW9uO1xyXG4gICAgICAgIGlmICh0aGlzLl9pbWFnZVByb2Nlc3NpbmdDb25maWd1cmF0aW9uKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2ltYWdlUHJvY2Vzc2luZ09ic2VydmVyID0gdGhpcy5faW1hZ2VQcm9jZXNzaW5nQ29uZmlndXJhdGlvbi5vblVwZGF0ZVBhcmFtZXRlcnMuYWRkKCgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuX21hcmtBbGxTdWJNZXNoZXNBc0ltYWdlUHJvY2Vzc2luZ0RpcnR5KCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBAc2VyaWFsaXplKClcclxuICAgIHB1YmxpYyBnZXQgdXNlTG9nYXJpdGhtaWNEZXB0aCgpOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fdXNlTG9nYXJpdGhtaWNEZXB0aDtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc2V0IHVzZUxvZ2FyaXRobWljRGVwdGgodmFsdWU6IGJvb2xlYW4pIHtcclxuICAgICAgICB0aGlzLl91c2VMb2dhcml0aG1pY0RlcHRoID0gdmFsdWUgJiYgdGhpcy5nZXRTY2VuZSgpLmdldEVuZ2luZSgpLmdldENhcHMoKS5mcmFnbWVudERlcHRoU3VwcG9ydGVkO1xyXG4gICAgICAgIHRoaXMuX21hcmtBbGxTdWJNZXNoZXNBc01pc2NEaXJ0eSgpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEdldCAvIFNldFxyXG4gICAgcHVibGljIGdldCByZWZyYWN0aW9uVGV4dHVyZSgpOiBOdWxsYWJsZTxSZW5kZXJUYXJnZXRUZXh0dXJlPiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX3JlZnJhY3Rpb25SVFQ7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldCByZWZsZWN0aW9uVGV4dHVyZSgpOiBOdWxsYWJsZTxSZW5kZXJUYXJnZXRUZXh0dXJlPiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX3JlZmxlY3Rpb25SVFQ7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gTWV0aG9kc1xyXG4gICAgcHVibGljIGFkZFRvUmVuZGVyTGlzdChub2RlOiBhbnkpOiB2b2lkIHtcclxuICAgICAgICBpZiAodGhpcy5fcmVmcmFjdGlvblJUVCAmJiB0aGlzLl9yZWZyYWN0aW9uUlRULnJlbmRlckxpc3QpIHtcclxuICAgICAgICAgICAgdGhpcy5fcmVmcmFjdGlvblJUVC5yZW5kZXJMaXN0LnB1c2gobm9kZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5fcmVmbGVjdGlvblJUVCAmJiB0aGlzLl9yZWZsZWN0aW9uUlRULnJlbmRlckxpc3QpIHtcclxuICAgICAgICAgICAgdGhpcy5fcmVmbGVjdGlvblJUVC5yZW5kZXJMaXN0LnB1c2gobm9kZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyByZW1vdmVGcm9tUmVuZGVyTGlzdChub2RlOiBhbnkpOiB2b2lkIHtcclxuICAgICAgICBpZiAodGhpcy5fcmVmcmFjdGlvblJUVCAmJiB0aGlzLl9yZWZyYWN0aW9uUlRULnJlbmRlckxpc3QpIHtcclxuICAgICAgICAgICAgY29uc3QgaWR4ID0gdGhpcy5fcmVmcmFjdGlvblJUVC5yZW5kZXJMaXN0LmluZGV4T2Yobm9kZSk7XHJcbiAgICAgICAgICAgIGlmIChpZHggIT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9yZWZyYWN0aW9uUlRULnJlbmRlckxpc3Quc3BsaWNlKGlkeCwgMSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICh0aGlzLl9yZWZsZWN0aW9uUlRUICYmIHRoaXMuX3JlZmxlY3Rpb25SVFQucmVuZGVyTGlzdCkge1xyXG4gICAgICAgICAgICBjb25zdCBpZHggPSB0aGlzLl9yZWZsZWN0aW9uUlRULnJlbmRlckxpc3QuaW5kZXhPZihub2RlKTtcclxuICAgICAgICAgICAgaWYgKGlkeCAhPT0gLTEpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuX3JlZmxlY3Rpb25SVFQucmVuZGVyTGlzdC5zcGxpY2UoaWR4LCAxKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZW5hYmxlUmVuZGVyVGFyZ2V0cyhlbmFibGU6IGJvb2xlYW4pOiB2b2lkIHtcclxuICAgICAgICBjb25zdCByZWZyZXNoUmF0ZSA9IGVuYWJsZSA/IDEgOiAwO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5fcmVmcmFjdGlvblJUVCkge1xyXG4gICAgICAgICAgICB0aGlzLl9yZWZyYWN0aW9uUlRULnJlZnJlc2hSYXRlID0gcmVmcmVzaFJhdGU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGhpcy5fcmVmbGVjdGlvblJUVCkge1xyXG4gICAgICAgICAgICB0aGlzLl9yZWZsZWN0aW9uUlRULnJlZnJlc2hSYXRlID0gcmVmcmVzaFJhdGU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXRSZW5kZXJMaXN0KCk6IE51bGxhYmxlPEFic3RyYWN0TWVzaFtdPiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX3JlZnJhY3Rpb25SVFQgPyB0aGlzLl9yZWZyYWN0aW9uUlRULnJlbmRlckxpc3QgOiBbXTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0IHJlbmRlclRhcmdldHNFbmFibGVkKCk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiAhKHRoaXMuX3JlZnJhY3Rpb25SVFQgJiYgdGhpcy5fcmVmcmFjdGlvblJUVC5yZWZyZXNoUmF0ZSA9PT0gMCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIG5lZWRBbHBoYUJsZW5kaW5nKCk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmFscGhhIDwgMS4wO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBuZWVkQWxwaGFUZXN0aW5nKCk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgZ2V0QWxwaGFUZXN0VGV4dHVyZSgpOiBOdWxsYWJsZTxCYXNlVGV4dHVyZT4ge1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBpc1JlYWR5Rm9yU3ViTWVzaChtZXNoOiBBYnN0cmFjdE1lc2gsIHN1Yk1lc2g6IFN1Yk1lc2gsIHVzZUluc3RhbmNlcz86IGJvb2xlYW4pOiBib29sZWFuIHtcclxuICAgICAgICBpZiAodGhpcy5pc0Zyb3plbikge1xyXG4gICAgICAgICAgICBpZiAoc3ViTWVzaC5lZmZlY3QgJiYgc3ViTWVzaC5lZmZlY3QuX3dhc1ByZXZpb3VzbHlSZWFkeSAmJiBzdWJNZXNoLmVmZmVjdC5fd2FzUHJldmlvdXNseVVzaW5nSW5zdGFuY2VzID09PSB1c2VJbnN0YW5jZXMpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIXN1Yk1lc2gubWF0ZXJpYWxEZWZpbmVzKSB7XHJcbiAgICAgICAgICAgIHN1Yk1lc2gubWF0ZXJpYWxEZWZpbmVzID0gbmV3IFdhdGVyTWF0ZXJpYWxEZWZpbmVzKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBkZWZpbmVzID0gPFdhdGVyTWF0ZXJpYWxEZWZpbmVzPnN1Yk1lc2gubWF0ZXJpYWxEZWZpbmVzO1xyXG4gICAgICAgIGNvbnN0IHNjZW5lID0gdGhpcy5nZXRTY2VuZSgpO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5faXNSZWFkeUZvclN1Yk1lc2goc3ViTWVzaCkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBlbmdpbmUgPSBzY2VuZS5nZXRFbmdpbmUoKTtcclxuXHJcbiAgICAgICAgLy8gVGV4dHVyZXNcclxuICAgICAgICBpZiAoZGVmaW5lcy5fYXJlVGV4dHVyZXNEaXJ0eSkge1xyXG4gICAgICAgICAgICBkZWZpbmVzLl9uZWVkVVZzID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGlmIChzY2VuZS50ZXh0dXJlc0VuYWJsZWQpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmJ1bXBUZXh0dXJlICYmIE1hdGVyaWFsRmxhZ3MuQnVtcFRleHR1cmVFbmFibGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLmJ1bXBUZXh0dXJlLmlzUmVhZHkoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5lcy5fbmVlZFVWcyA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluZXMuQlVNUCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChNYXRlcmlhbEZsYWdzLlJlZmxlY3Rpb25UZXh0dXJlRW5hYmxlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGRlZmluZXMuUkVGTEVDVElPTiA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIE1hdGVyaWFsSGVscGVyLlByZXBhcmVEZWZpbmVzRm9yRnJhbWVCb3VuZFZhbHVlcyhzY2VuZSwgZW5naW5lLCB0aGlzLCBkZWZpbmVzLCB1c2VJbnN0YW5jZXMgPyB0cnVlIDogZmFsc2UpO1xyXG5cclxuICAgICAgICBNYXRlcmlhbEhlbHBlci5QcmVwYXJlRGVmaW5lc0Zvck1pc2MobWVzaCwgc2NlbmUsIHRoaXMuX3VzZUxvZ2FyaXRobWljRGVwdGgsIHRoaXMucG9pbnRzQ2xvdWQsIHRoaXMuZm9nRW5hYmxlZCwgdGhpcy5fc2hvdWxkVHVybkFscGhhVGVzdE9uKG1lc2gpLCBkZWZpbmVzKTtcclxuXHJcbiAgICAgICAgaWYgKGRlZmluZXMuX2FyZU1pc2NEaXJ0eSkge1xyXG4gICAgICAgICAgICBkZWZpbmVzLkZSRVNORUxTRVBBUkFURSA9IHRoaXMuX2ZyZXNuZWxTZXBhcmF0ZTtcclxuICAgICAgICAgICAgZGVmaW5lcy5CVU1QU1VQRVJJTVBPU0UgPSB0aGlzLl9idW1wU3VwZXJpbXBvc2U7XHJcbiAgICAgICAgICAgIGRlZmluZXMuQlVNUEFGRkVDVFNSRUZMRUNUSU9OID0gdGhpcy5fYnVtcEFmZmVjdHNSZWZsZWN0aW9uO1xyXG4gICAgICAgICAgICBkZWZpbmVzLlVTRV9XT1JMRF9DT09SRElOQVRFUyA9IHRoaXMuX3VzZVdvcmxkQ29vcmRpbmF0ZXNGb3JXYXZlRGVmb3JtYXRpb247XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBMaWdodHNcclxuICAgICAgICBkZWZpbmVzLl9uZWVkTm9ybWFscyA9IE1hdGVyaWFsSGVscGVyLlByZXBhcmVEZWZpbmVzRm9yTGlnaHRzKHNjZW5lLCBtZXNoLCBkZWZpbmVzLCB0cnVlLCB0aGlzLl9tYXhTaW11bHRhbmVvdXNMaWdodHMsIHRoaXMuX2Rpc2FibGVMaWdodGluZyk7XHJcblxyXG4gICAgICAgIC8vIEltYWdlIHByb2Nlc3NpbmdcclxuICAgICAgICBpZiAoZGVmaW5lcy5fYXJlSW1hZ2VQcm9jZXNzaW5nRGlydHkgJiYgdGhpcy5faW1hZ2VQcm9jZXNzaW5nQ29uZmlndXJhdGlvbikge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuX2ltYWdlUHJvY2Vzc2luZ0NvbmZpZ3VyYXRpb24uaXNSZWFkeSgpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMuX2ltYWdlUHJvY2Vzc2luZ0NvbmZpZ3VyYXRpb24ucHJlcGFyZURlZmluZXMoZGVmaW5lcyk7XHJcblxyXG4gICAgICAgICAgICBkZWZpbmVzLklTX1JFRkxFQ1RJT05fTElORUFSID0gdGhpcy5yZWZsZWN0aW9uVGV4dHVyZSAhPSBudWxsICYmICF0aGlzLnJlZmxlY3Rpb25UZXh0dXJlLmdhbW1hU3BhY2U7XHJcbiAgICAgICAgICAgIGRlZmluZXMuSVNfUkVGUkFDVElPTl9MSU5FQVIgPSB0aGlzLnJlZnJhY3Rpb25UZXh0dXJlICE9IG51bGwgJiYgIXRoaXMucmVmcmFjdGlvblRleHR1cmUuZ2FtbWFTcGFjZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEF0dHJpYnNcclxuICAgICAgICBNYXRlcmlhbEhlbHBlci5QcmVwYXJlRGVmaW5lc0ZvckF0dHJpYnV0ZXMobWVzaCwgZGVmaW5lcywgdHJ1ZSwgdHJ1ZSk7XHJcblxyXG4gICAgICAgIC8vIENvbmZpZ3VyZSB0aGlzXHJcbiAgICAgICAgdGhpcy5fbWVzaCA9IG1lc2g7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLl93YWl0aW5nUmVuZGVyTGlzdCkge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuX3dhaXRpbmdSZW5kZXJMaXN0Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmFkZFRvUmVuZGVyTGlzdChzY2VuZS5nZXROb2RlQnlJZCh0aGlzLl93YWl0aW5nUmVuZGVyTGlzdFtpXSkpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLl93YWl0aW5nUmVuZGVyTGlzdCA9IG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBHZXQgY29ycmVjdCBlZmZlY3RcclxuICAgICAgICBpZiAoZGVmaW5lcy5pc0RpcnR5KSB7XHJcbiAgICAgICAgICAgIGRlZmluZXMubWFya0FzUHJvY2Vzc2VkKCk7XHJcbiAgICAgICAgICAgIHNjZW5lLnJlc2V0Q2FjaGVkTWF0ZXJpYWwoKTtcclxuXHJcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrc1xyXG4gICAgICAgICAgICBjb25zdCBmYWxsYmFja3MgPSBuZXcgRWZmZWN0RmFsbGJhY2tzKCk7XHJcbiAgICAgICAgICAgIGlmIChkZWZpbmVzLkZPRykge1xyXG4gICAgICAgICAgICAgICAgZmFsbGJhY2tzLmFkZEZhbGxiYWNrKDEsIFwiRk9HXCIpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoZGVmaW5lcy5MT0dBUklUSE1JQ0RFUFRIKSB7XHJcbiAgICAgICAgICAgICAgICBmYWxsYmFja3MuYWRkRmFsbGJhY2soMCwgXCJMT0dBUklUSE1JQ0RFUFRIXCIpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBNYXRlcmlhbEhlbHBlci5IYW5kbGVGYWxsYmFja3NGb3JTaGFkb3dzKGRlZmluZXMsIGZhbGxiYWNrcywgdGhpcy5tYXhTaW11bHRhbmVvdXNMaWdodHMpO1xyXG5cclxuICAgICAgICAgICAgaWYgKGRlZmluZXMuTlVNX0JPTkVfSU5GTFVFTkNFUlMgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBmYWxsYmFja3MuYWRkQ1BVU2tpbm5pbmdGYWxsYmFjaygwLCBtZXNoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy9BdHRyaWJ1dGVzXHJcbiAgICAgICAgICAgIGNvbnN0IGF0dHJpYnMgPSBbVmVydGV4QnVmZmVyLlBvc2l0aW9uS2luZF07XHJcblxyXG4gICAgICAgICAgICBpZiAoZGVmaW5lcy5OT1JNQUwpIHtcclxuICAgICAgICAgICAgICAgIGF0dHJpYnMucHVzaChWZXJ0ZXhCdWZmZXIuTm9ybWFsS2luZCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChkZWZpbmVzLlVWMSkge1xyXG4gICAgICAgICAgICAgICAgYXR0cmlicy5wdXNoKFZlcnRleEJ1ZmZlci5VVktpbmQpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoZGVmaW5lcy5VVjIpIHtcclxuICAgICAgICAgICAgICAgIGF0dHJpYnMucHVzaChWZXJ0ZXhCdWZmZXIuVVYyS2luZCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChkZWZpbmVzLlZFUlRFWENPTE9SKSB7XHJcbiAgICAgICAgICAgICAgICBhdHRyaWJzLnB1c2goVmVydGV4QnVmZmVyLkNvbG9yS2luZCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIE1hdGVyaWFsSGVscGVyLlByZXBhcmVBdHRyaWJ1dGVzRm9yQm9uZXMoYXR0cmlicywgbWVzaCwgZGVmaW5lcywgZmFsbGJhY2tzKTtcclxuICAgICAgICAgICAgTWF0ZXJpYWxIZWxwZXIuUHJlcGFyZUF0dHJpYnV0ZXNGb3JJbnN0YW5jZXMoYXR0cmlicywgZGVmaW5lcyk7XHJcblxyXG4gICAgICAgICAgICAvLyBMZWdhY3kgYnJvd3NlciBwYXRjaFxyXG4gICAgICAgICAgICBjb25zdCBzaGFkZXJOYW1lID0gXCJ3YXRlclwiO1xyXG4gICAgICAgICAgICBjb25zdCBqb2luID0gZGVmaW5lcy50b1N0cmluZygpO1xyXG4gICAgICAgICAgICBjb25zdCB1bmlmb3JtcyA9IFtcclxuICAgICAgICAgICAgICAgIFwid29ybGRcIixcclxuICAgICAgICAgICAgICAgIFwidmlld1wiLFxyXG4gICAgICAgICAgICAgICAgXCJ2aWV3UHJvamVjdGlvblwiLFxyXG4gICAgICAgICAgICAgICAgXCJ2RXllUG9zaXRpb25cIixcclxuICAgICAgICAgICAgICAgIFwidkxpZ2h0c1R5cGVcIixcclxuICAgICAgICAgICAgICAgIFwidkRpZmZ1c2VDb2xvclwiLFxyXG4gICAgICAgICAgICAgICAgXCJ2U3BlY3VsYXJDb2xvclwiLFxyXG4gICAgICAgICAgICAgICAgXCJ2Rm9nSW5mb3NcIixcclxuICAgICAgICAgICAgICAgIFwidkZvZ0NvbG9yXCIsXHJcbiAgICAgICAgICAgICAgICBcInBvaW50U2l6ZVwiLFxyXG4gICAgICAgICAgICAgICAgXCJ2Tm9ybWFsSW5mb3NcIixcclxuICAgICAgICAgICAgICAgIFwibUJvbmVzXCIsXHJcbiAgICAgICAgICAgICAgICBcIm5vcm1hbE1hdHJpeFwiLFxyXG4gICAgICAgICAgICAgICAgXCJsb2dhcml0aG1pY0RlcHRoQ29uc3RhbnRcIixcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBXYXRlclxyXG4gICAgICAgICAgICAgICAgXCJyZWZsZWN0aW9uVmlld1Byb2plY3Rpb25cIixcclxuICAgICAgICAgICAgICAgIFwid2luZERpcmVjdGlvblwiLFxyXG4gICAgICAgICAgICAgICAgXCJ3YXZlTGVuZ3RoXCIsXHJcbiAgICAgICAgICAgICAgICBcInRpbWVcIixcclxuICAgICAgICAgICAgICAgIFwid2luZEZvcmNlXCIsXHJcbiAgICAgICAgICAgICAgICBcImNhbWVyYVBvc2l0aW9uXCIsXHJcbiAgICAgICAgICAgICAgICBcImJ1bXBIZWlnaHRcIixcclxuICAgICAgICAgICAgICAgIFwid2F2ZUhlaWdodFwiLFxyXG4gICAgICAgICAgICAgICAgXCJ3YXRlckNvbG9yXCIsXHJcbiAgICAgICAgICAgICAgICBcIndhdGVyQ29sb3IyXCIsXHJcbiAgICAgICAgICAgICAgICBcImNvbG9yQmxlbmRGYWN0b3JcIixcclxuICAgICAgICAgICAgICAgIFwiY29sb3JCbGVuZEZhY3RvcjJcIixcclxuICAgICAgICAgICAgICAgIFwid2F2ZVNwZWVkXCIsXHJcbiAgICAgICAgICAgICAgICBcIndhdmVDb3VudFwiLFxyXG4gICAgICAgICAgICBdO1xyXG4gICAgICAgICAgICBjb25zdCBzYW1wbGVycyA9IFtcclxuICAgICAgICAgICAgICAgIFwibm9ybWFsU2FtcGxlclwiLFxyXG4gICAgICAgICAgICAgICAgLy8gV2F0ZXJcclxuICAgICAgICAgICAgICAgIFwicmVmcmFjdGlvblNhbXBsZXJcIixcclxuICAgICAgICAgICAgICAgIFwicmVmbGVjdGlvblNhbXBsZXJcIixcclxuICAgICAgICAgICAgXTtcclxuICAgICAgICAgICAgY29uc3QgdW5pZm9ybUJ1ZmZlcnM6IHN0cmluZ1tdID0gW107XHJcblxyXG4gICAgICAgICAgICBpZiAoSW1hZ2VQcm9jZXNzaW5nQ29uZmlndXJhdGlvbikge1xyXG4gICAgICAgICAgICAgICAgSW1hZ2VQcm9jZXNzaW5nQ29uZmlndXJhdGlvbi5QcmVwYXJlVW5pZm9ybXModW5pZm9ybXMsIGRlZmluZXMpO1xyXG4gICAgICAgICAgICAgICAgSW1hZ2VQcm9jZXNzaW5nQ29uZmlndXJhdGlvbi5QcmVwYXJlU2FtcGxlcnMoc2FtcGxlcnMsIGRlZmluZXMpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBhZGRDbGlwUGxhbmVVbmlmb3Jtcyh1bmlmb3Jtcyk7XHJcblxyXG4gICAgICAgICAgICBNYXRlcmlhbEhlbHBlci5QcmVwYXJlVW5pZm9ybXNBbmRTYW1wbGVyc0xpc3QoPElFZmZlY3RDcmVhdGlvbk9wdGlvbnM+e1xyXG4gICAgICAgICAgICAgICAgdW5pZm9ybXNOYW1lczogdW5pZm9ybXMsXHJcbiAgICAgICAgICAgICAgICB1bmlmb3JtQnVmZmVyc05hbWVzOiB1bmlmb3JtQnVmZmVycyxcclxuICAgICAgICAgICAgICAgIHNhbXBsZXJzOiBzYW1wbGVycyxcclxuICAgICAgICAgICAgICAgIGRlZmluZXM6IGRlZmluZXMsXHJcbiAgICAgICAgICAgICAgICBtYXhTaW11bHRhbmVvdXNMaWdodHM6IHRoaXMubWF4U2ltdWx0YW5lb3VzTGlnaHRzLFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgc3ViTWVzaC5zZXRFZmZlY3QoXHJcbiAgICAgICAgICAgICAgICBzY2VuZS5nZXRFbmdpbmUoKS5jcmVhdGVFZmZlY3QoXHJcbiAgICAgICAgICAgICAgICAgICAgc2hhZGVyTmFtZSxcclxuICAgICAgICAgICAgICAgICAgICA8SUVmZmVjdENyZWF0aW9uT3B0aW9ucz57XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IGF0dHJpYnMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVuaWZvcm1zTmFtZXM6IHVuaWZvcm1zLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB1bmlmb3JtQnVmZmVyc05hbWVzOiB1bmlmb3JtQnVmZmVycyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2FtcGxlcnM6IHNhbXBsZXJzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbmVzOiBqb2luLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmYWxsYmFja3M6IGZhbGxiYWNrcyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgb25Db21waWxlZDogdGhpcy5vbkNvbXBpbGVkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBvbkVycm9yOiB0aGlzLm9uRXJyb3IsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4UGFyYW1ldGVyczogeyBtYXhTaW11bHRhbmVvdXNMaWdodHM6IHRoaXMuX21heFNpbXVsdGFuZW91c0xpZ2h0cyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgZW5naW5lXHJcbiAgICAgICAgICAgICAgICApLFxyXG4gICAgICAgICAgICAgICAgZGVmaW5lcyxcclxuICAgICAgICAgICAgICAgIHRoaXMuX21hdGVyaWFsQ29udGV4dFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoIXN1Yk1lc2guZWZmZWN0IHx8ICFzdWJNZXNoLmVmZmVjdC5pc1JlYWR5KCkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZGVmaW5lcy5fcmVuZGVySWQgPSBzY2VuZS5nZXRSZW5kZXJJZCgpO1xyXG4gICAgICAgIHN1Yk1lc2guZWZmZWN0Ll93YXNQcmV2aW91c2x5UmVhZHkgPSB0cnVlO1xyXG4gICAgICAgIHN1Yk1lc2guZWZmZWN0Ll93YXNQcmV2aW91c2x5VXNpbmdJbnN0YW5jZXMgPSAhIXVzZUluc3RhbmNlcztcclxuXHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGJpbmRGb3JTdWJNZXNoKHdvcmxkOiBNYXRyaXgsIG1lc2g6IE1lc2gsIHN1Yk1lc2g6IFN1Yk1lc2gpOiB2b2lkIHtcclxuICAgICAgICBjb25zdCBzY2VuZSA9IHRoaXMuZ2V0U2NlbmUoKTtcclxuXHJcbiAgICAgICAgY29uc3QgZGVmaW5lcyA9IDxXYXRlck1hdGVyaWFsRGVmaW5lcz5zdWJNZXNoLm1hdGVyaWFsRGVmaW5lcztcclxuICAgICAgICBpZiAoIWRlZmluZXMpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZWZmZWN0ID0gc3ViTWVzaC5lZmZlY3Q7XHJcbiAgICAgICAgaWYgKCFlZmZlY3QgfHwgIXRoaXMuX21lc2gpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLl9hY3RpdmVFZmZlY3QgPSBlZmZlY3Q7XHJcblxyXG4gICAgICAgIC8vIE1hdHJpY2VzXHJcbiAgICAgICAgdGhpcy5iaW5kT25seVdvcmxkTWF0cml4KHdvcmxkKTtcclxuICAgICAgICB0aGlzLl9hY3RpdmVFZmZlY3Quc2V0TWF0cml4KFwidmlld1Byb2plY3Rpb25cIiwgc2NlbmUuZ2V0VHJhbnNmb3JtTWF0cml4KCkpO1xyXG5cclxuICAgICAgICAvLyBCb25lc1xyXG4gICAgICAgIE1hdGVyaWFsSGVscGVyLkJpbmRCb25lc1BhcmFtZXRlcnMobWVzaCwgdGhpcy5fYWN0aXZlRWZmZWN0KTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuX211c3RSZWJpbmQoc2NlbmUsIGVmZmVjdCkpIHtcclxuICAgICAgICAgICAgLy8gVGV4dHVyZXNcclxuICAgICAgICAgICAgaWYgKHRoaXMuYnVtcFRleHR1cmUgJiYgTWF0ZXJpYWxGbGFncy5CdW1wVGV4dHVyZUVuYWJsZWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuX2FjdGl2ZUVmZmVjdC5zZXRUZXh0dXJlKFwibm9ybWFsU2FtcGxlclwiLCB0aGlzLmJ1bXBUZXh0dXJlKTtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLl9hY3RpdmVFZmZlY3Quc2V0RmxvYXQyKFwidk5vcm1hbEluZm9zXCIsIHRoaXMuYnVtcFRleHR1cmUuY29vcmRpbmF0ZXNJbmRleCwgdGhpcy5idW1wVGV4dHVyZS5sZXZlbCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9hY3RpdmVFZmZlY3Quc2V0TWF0cml4KFwibm9ybWFsTWF0cml4XCIsIHRoaXMuYnVtcFRleHR1cmUuZ2V0VGV4dHVyZU1hdHJpeCgpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBDbGlwIHBsYW5lXHJcbiAgICAgICAgICAgIGJpbmRDbGlwUGxhbmUoZWZmZWN0LCB0aGlzLCBzY2VuZSk7XHJcblxyXG4gICAgICAgICAgICAvLyBQb2ludCBzaXplXHJcbiAgICAgICAgICAgIGlmICh0aGlzLnBvaW50c0Nsb3VkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9hY3RpdmVFZmZlY3Quc2V0RmxvYXQoXCJwb2ludFNpemVcIiwgdGhpcy5wb2ludFNpemUpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBzY2VuZS5iaW5kRXllUG9zaXRpb24oZWZmZWN0KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuX2FjdGl2ZUVmZmVjdC5zZXRDb2xvcjQoXCJ2RGlmZnVzZUNvbG9yXCIsIHRoaXMuZGlmZnVzZUNvbG9yLCB0aGlzLmFscGhhICogbWVzaC52aXNpYmlsaXR5KTtcclxuXHJcbiAgICAgICAgaWYgKGRlZmluZXMuU1BFQ1VMQVJURVJNKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2FjdGl2ZUVmZmVjdC5zZXRDb2xvcjQoXCJ2U3BlY3VsYXJDb2xvclwiLCB0aGlzLnNwZWN1bGFyQ29sb3IsIHRoaXMuc3BlY3VsYXJQb3dlcik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoc2NlbmUubGlnaHRzRW5hYmxlZCAmJiAhdGhpcy5kaXNhYmxlTGlnaHRpbmcpIHtcclxuICAgICAgICAgICAgTWF0ZXJpYWxIZWxwZXIuQmluZExpZ2h0cyhzY2VuZSwgbWVzaCwgdGhpcy5fYWN0aXZlRWZmZWN0LCBkZWZpbmVzLCB0aGlzLm1heFNpbXVsdGFuZW91c0xpZ2h0cyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBWaWV3XHJcbiAgICAgICAgaWYgKHNjZW5lLmZvZ0VuYWJsZWQgJiYgbWVzaC5hcHBseUZvZyAmJiBzY2VuZS5mb2dNb2RlICE9PSBTY2VuZS5GT0dNT0RFX05PTkUpIHtcclxuICAgICAgICAgICAgdGhpcy5fYWN0aXZlRWZmZWN0LnNldE1hdHJpeChcInZpZXdcIiwgc2NlbmUuZ2V0Vmlld01hdHJpeCgpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEZvZ1xyXG4gICAgICAgIE1hdGVyaWFsSGVscGVyLkJpbmRGb2dQYXJhbWV0ZXJzKHNjZW5lLCBtZXNoLCB0aGlzLl9hY3RpdmVFZmZlY3QpO1xyXG5cclxuICAgICAgICAvLyBMb2cuIGRlcHRoXHJcbiAgICAgICAgTWF0ZXJpYWxIZWxwZXIuQmluZExvZ0RlcHRoKGRlZmluZXMsIHRoaXMuX2FjdGl2ZUVmZmVjdCwgc2NlbmUpO1xyXG5cclxuICAgICAgICAvLyBXYXRlclxyXG4gICAgICAgIGlmIChNYXRlcmlhbEZsYWdzLlJlZmxlY3Rpb25UZXh0dXJlRW5hYmxlZCkge1xyXG4gICAgICAgICAgICB0aGlzLl9hY3RpdmVFZmZlY3Quc2V0VGV4dHVyZShcInJlZnJhY3Rpb25TYW1wbGVyXCIsIHRoaXMuX3JlZnJhY3Rpb25SVFQpO1xyXG4gICAgICAgICAgICB0aGlzLl9hY3RpdmVFZmZlY3Quc2V0VGV4dHVyZShcInJlZmxlY3Rpb25TYW1wbGVyXCIsIHRoaXMuX3JlZmxlY3Rpb25SVFQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3Qgd3J2cCA9IHRoaXMuX3JlZmxlY3Rpb25UcmFuc2Zvcm0ubXVsdGlwbHkoc2NlbmUuZ2V0UHJvamVjdGlvbk1hdHJpeCgpKTtcclxuXHJcbiAgICAgICAgLy8gQWRkIGRlbHRhIHRpbWUuIFByZXZlbnQgYWRkaW5nIGRlbHRhIHRpbWUgaWYgaXQgaGFzbid0IGNoYW5nZWQuXHJcbiAgICAgICAgY29uc3QgZGVsdGFUaW1lID0gc2NlbmUuZ2V0RW5naW5lKCkuZ2V0RGVsdGFUaW1lKCk7XHJcbiAgICAgICAgaWYgKGRlbHRhVGltZSAhPT0gdGhpcy5fbGFzdERlbHRhVGltZSkge1xyXG4gICAgICAgICAgICB0aGlzLl9sYXN0RGVsdGFUaW1lID0gZGVsdGFUaW1lO1xyXG4gICAgICAgICAgICB0aGlzLl9sYXN0VGltZSArPSB0aGlzLl9sYXN0RGVsdGFUaW1lO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5fYWN0aXZlRWZmZWN0LnNldE1hdHJpeChcInJlZmxlY3Rpb25WaWV3UHJvamVjdGlvblwiLCB3cnZwKTtcclxuICAgICAgICB0aGlzLl9hY3RpdmVFZmZlY3Quc2V0VmVjdG9yMihcIndpbmREaXJlY3Rpb25cIiwgdGhpcy53aW5kRGlyZWN0aW9uKTtcclxuICAgICAgICB0aGlzLl9hY3RpdmVFZmZlY3Quc2V0RmxvYXQoXCJ3YXZlTGVuZ3RoXCIsIHRoaXMud2F2ZUxlbmd0aCk7XHJcbiAgICAgICAgdGhpcy5fYWN0aXZlRWZmZWN0LnNldEZsb2F0KFwidGltZVwiLCB0aGlzLl9sYXN0VGltZSAvIDEwMDAwMCk7XHJcbiAgICAgICAgdGhpcy5fYWN0aXZlRWZmZWN0LnNldEZsb2F0KFwid2luZEZvcmNlXCIsIHRoaXMud2luZEZvcmNlKTtcclxuICAgICAgICB0aGlzLl9hY3RpdmVFZmZlY3Quc2V0RmxvYXQoXCJ3YXZlSGVpZ2h0XCIsIHRoaXMud2F2ZUhlaWdodCk7XHJcbiAgICAgICAgdGhpcy5fYWN0aXZlRWZmZWN0LnNldEZsb2F0KFwiYnVtcEhlaWdodFwiLCB0aGlzLmJ1bXBIZWlnaHQpO1xyXG4gICAgICAgIHRoaXMuX2FjdGl2ZUVmZmVjdC5zZXRDb2xvcjQoXCJ3YXRlckNvbG9yXCIsIHRoaXMud2F0ZXJDb2xvciwgMS4wKTtcclxuICAgICAgICB0aGlzLl9hY3RpdmVFZmZlY3Quc2V0RmxvYXQoXCJjb2xvckJsZW5kRmFjdG9yXCIsIHRoaXMuY29sb3JCbGVuZEZhY3Rvcik7XHJcbiAgICAgICAgdGhpcy5fYWN0aXZlRWZmZWN0LnNldENvbG9yNChcIndhdGVyQ29sb3IyXCIsIHRoaXMud2F0ZXJDb2xvcjIsIDEuMCk7XHJcbiAgICAgICAgdGhpcy5fYWN0aXZlRWZmZWN0LnNldEZsb2F0KFwiY29sb3JCbGVuZEZhY3RvcjJcIiwgdGhpcy5jb2xvckJsZW5kRmFjdG9yMik7XHJcbiAgICAgICAgdGhpcy5fYWN0aXZlRWZmZWN0LnNldEZsb2F0KFwid2F2ZVNwZWVkXCIsIHRoaXMud2F2ZVNwZWVkKTtcclxuICAgICAgICB0aGlzLl9hY3RpdmVFZmZlY3Quc2V0RmxvYXQoXCJ3YXZlQ291bnRcIiwgdGhpcy53YXZlQ291bnQpO1xyXG5cclxuICAgICAgICAvLyBpbWFnZSBwcm9jZXNzaW5nXHJcbiAgICAgICAgaWYgKHRoaXMuX2ltYWdlUHJvY2Vzc2luZ0NvbmZpZ3VyYXRpb24gJiYgIXRoaXMuX2ltYWdlUHJvY2Vzc2luZ0NvbmZpZ3VyYXRpb24uYXBwbHlCeVBvc3RQcm9jZXNzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2ltYWdlUHJvY2Vzc2luZ0NvbmZpZ3VyYXRpb24uYmluZCh0aGlzLl9hY3RpdmVFZmZlY3QpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5fYWZ0ZXJCaW5kKG1lc2gsIHRoaXMuX2FjdGl2ZUVmZmVjdCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBfY3JlYXRlUmVuZGVyVGFyZ2V0cyhzY2VuZTogU2NlbmUsIHJlbmRlclRhcmdldFNpemU6IFZlY3RvcjIpOiB2b2lkIHtcclxuICAgICAgICAvLyBSZW5kZXIgdGFyZ2V0c1xyXG4gICAgICAgIHRoaXMuX3JlZnJhY3Rpb25SVFQgPSBuZXcgUmVuZGVyVGFyZ2V0VGV4dHVyZShuYW1lICsgXCJfcmVmcmFjdGlvblwiLCB7IHdpZHRoOiByZW5kZXJUYXJnZXRTaXplLngsIGhlaWdodDogcmVuZGVyVGFyZ2V0U2l6ZS55IH0sIHNjZW5lLCBmYWxzZSwgdHJ1ZSk7XHJcbiAgICAgICAgdGhpcy5fcmVmcmFjdGlvblJUVC53cmFwVSA9IENvbnN0YW50cy5URVhUVVJFX01JUlJPUl9BRERSRVNTTU9ERTtcclxuICAgICAgICB0aGlzLl9yZWZyYWN0aW9uUlRULndyYXBWID0gQ29uc3RhbnRzLlRFWFRVUkVfTUlSUk9SX0FERFJFU1NNT0RFO1xyXG4gICAgICAgIHRoaXMuX3JlZnJhY3Rpb25SVFQuaWdub3JlQ2FtZXJhVmlld3BvcnQgPSB0cnVlO1xyXG5cclxuICAgICAgICB0aGlzLl9yZWZsZWN0aW9uUlRUID0gbmV3IFJlbmRlclRhcmdldFRleHR1cmUobmFtZSArIFwiX3JlZmxlY3Rpb25cIiwgeyB3aWR0aDogcmVuZGVyVGFyZ2V0U2l6ZS54LCBoZWlnaHQ6IHJlbmRlclRhcmdldFNpemUueSB9LCBzY2VuZSwgZmFsc2UsIHRydWUpO1xyXG4gICAgICAgIHRoaXMuX3JlZmxlY3Rpb25SVFQud3JhcFUgPSBDb25zdGFudHMuVEVYVFVSRV9NSVJST1JfQUREUkVTU01PREU7XHJcbiAgICAgICAgdGhpcy5fcmVmbGVjdGlvblJUVC53cmFwViA9IENvbnN0YW50cy5URVhUVVJFX01JUlJPUl9BRERSRVNTTU9ERTtcclxuICAgICAgICB0aGlzLl9yZWZsZWN0aW9uUlRULmlnbm9yZUNhbWVyYVZpZXdwb3J0ID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgbGV0IGlzVmlzaWJsZTogYm9vbGVhbjtcclxuICAgICAgICBsZXQgY2xpcFBsYW5lOiBOdWxsYWJsZTxQbGFuZT4gPSBudWxsO1xyXG4gICAgICAgIGxldCBzYXZlZFZpZXdNYXRyaXg6IE1hdHJpeDtcclxuICAgICAgICBjb25zdCBtaXJyb3JNYXRyaXggPSBNYXRyaXguWmVybygpO1xyXG5cclxuICAgICAgICB0aGlzLl9yZWZyYWN0aW9uUlRULm9uQmVmb3JlUmVuZGVyID0gKCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5fbWVzaCkge1xyXG4gICAgICAgICAgICAgICAgaXNWaXNpYmxlID0gdGhpcy5fbWVzaC5pc1Zpc2libGU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9tZXNoLmlzVmlzaWJsZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBDbGlwIHBsYW5lXHJcbiAgICAgICAgICAgIGlmICghdGhpcy5kaXNhYmxlQ2xpcFBsYW5lKSB7XHJcbiAgICAgICAgICAgICAgICBjbGlwUGxhbmUgPSBzY2VuZS5jbGlwUGxhbmU7XHJcblxyXG4gICAgICAgICAgICAgICAgY29uc3QgcG9zaXRpb255ID0gdGhpcy5fbWVzaCA/IHRoaXMuX21lc2guYWJzb2x1dGVQb3NpdGlvbi55IDogMC4wO1xyXG4gICAgICAgICAgICAgICAgc2NlbmUuY2xpcFBsYW5lID0gUGxhbmUuRnJvbVBvc2l0aW9uQW5kTm9ybWFsKG5ldyBWZWN0b3IzKDAsIHBvc2l0aW9ueSArIDAuMDUsIDApLCBuZXcgVmVjdG9yMygwLCAxLCAwKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLl9yZWZyYWN0aW9uUlRULm9uQWZ0ZXJSZW5kZXIgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLl9tZXNoKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9tZXNoLmlzVmlzaWJsZSA9IGlzVmlzaWJsZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gQ2xpcCBwbGFuZVxyXG4gICAgICAgICAgICBpZiAoIXRoaXMuZGlzYWJsZUNsaXBQbGFuZSkge1xyXG4gICAgICAgICAgICAgICAgc2NlbmUuY2xpcFBsYW5lID0gY2xpcFBsYW5lO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgdGhpcy5fcmVmbGVjdGlvblJUVC5vbkJlZm9yZVJlbmRlciA9ICgpID0+IHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuX21lc2gpIHtcclxuICAgICAgICAgICAgICAgIGlzVmlzaWJsZSA9IHRoaXMuX21lc2guaXNWaXNpYmxlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fbWVzaC5pc1Zpc2libGUgPSBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gQ2xpcCBwbGFuZVxyXG4gICAgICAgICAgICBpZiAoIXRoaXMuZGlzYWJsZUNsaXBQbGFuZSkge1xyXG4gICAgICAgICAgICAgICAgY2xpcFBsYW5lID0gc2NlbmUuY2xpcFBsYW5lO1xyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IHBvc2l0aW9ueSA9IHRoaXMuX21lc2ggPyB0aGlzLl9tZXNoLmFic29sdXRlUG9zaXRpb24ueSA6IDAuMDtcclxuICAgICAgICAgICAgICAgIHNjZW5lLmNsaXBQbGFuZSA9IFBsYW5lLkZyb21Qb3NpdGlvbkFuZE5vcm1hbChuZXcgVmVjdG9yMygwLCBwb3NpdGlvbnkgLSAwLjA1LCAwKSwgbmV3IFZlY3RvcjMoMCwgLTEsIDApKTtcclxuXHJcbiAgICAgICAgICAgICAgICBNYXRyaXguUmVmbGVjdGlvblRvUmVmKHNjZW5lLmNsaXBQbGFuZSwgbWlycm9yTWF0cml4KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gVHJhbnNmb3JtXHJcbiAgICAgICAgICAgIHNhdmVkVmlld01hdHJpeCA9IHNjZW5lLmdldFZpZXdNYXRyaXgoKTtcclxuXHJcbiAgICAgICAgICAgIG1pcnJvck1hdHJpeC5tdWx0aXBseVRvUmVmKHNhdmVkVmlld01hdHJpeCwgdGhpcy5fcmVmbGVjdGlvblRyYW5zZm9ybSk7XHJcbiAgICAgICAgICAgIHNjZW5lLnNldFRyYW5zZm9ybU1hdHJpeCh0aGlzLl9yZWZsZWN0aW9uVHJhbnNmb3JtLCBzY2VuZS5nZXRQcm9qZWN0aW9uTWF0cml4KCkpO1xyXG4gICAgICAgICAgICBzY2VuZS5fbWlycm9yZWRDYW1lcmFQb3NpdGlvbiA9IFZlY3RvcjMuVHJhbnNmb3JtQ29vcmRpbmF0ZXMoKDxDYW1lcmE+c2NlbmUuYWN0aXZlQ2FtZXJhKS5wb3NpdGlvbiwgbWlycm9yTWF0cml4KTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB0aGlzLl9yZWZsZWN0aW9uUlRULm9uQWZ0ZXJSZW5kZXIgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLl9tZXNoKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLl9tZXNoLmlzVmlzaWJsZSA9IGlzVmlzaWJsZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gQ2xpcCBwbGFuZVxyXG4gICAgICAgICAgICBzY2VuZS5jbGlwUGxhbmUgPSBjbGlwUGxhbmU7XHJcblxyXG4gICAgICAgICAgICAvLyBUcmFuc2Zvcm1cclxuICAgICAgICAgICAgc2NlbmUuc2V0VHJhbnNmb3JtTWF0cml4KHNhdmVkVmlld01hdHJpeCwgc2NlbmUuZ2V0UHJvamVjdGlvbk1hdHJpeCgpKTtcclxuICAgICAgICAgICAgc2NlbmUuX21pcnJvcmVkQ2FtZXJhUG9zaXRpb24gPSBudWxsO1xyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldEFuaW1hdGFibGVzKCk6IElBbmltYXRhYmxlW10ge1xyXG4gICAgICAgIGNvbnN0IHJlc3VsdHMgPSBbXTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuYnVtcFRleHR1cmUgJiYgdGhpcy5idW1wVGV4dHVyZS5hbmltYXRpb25zICYmIHRoaXMuYnVtcFRleHR1cmUuYW5pbWF0aW9ucy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIHJlc3VsdHMucHVzaCh0aGlzLmJ1bXBUZXh0dXJlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHRoaXMuX3JlZmxlY3Rpb25SVFQgJiYgdGhpcy5fcmVmbGVjdGlvblJUVC5hbmltYXRpb25zICYmIHRoaXMuX3JlZmxlY3Rpb25SVFQuYW5pbWF0aW9ucy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIHJlc3VsdHMucHVzaCh0aGlzLl9yZWZsZWN0aW9uUlRUKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHRoaXMuX3JlZnJhY3Rpb25SVFQgJiYgdGhpcy5fcmVmcmFjdGlvblJUVC5hbmltYXRpb25zICYmIHRoaXMuX3JlZnJhY3Rpb25SVFQuYW5pbWF0aW9ucy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIHJlc3VsdHMucHVzaCh0aGlzLl9yZWZyYWN0aW9uUlRUKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiByZXN1bHRzO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBnZXRBY3RpdmVUZXh0dXJlcygpOiBCYXNlVGV4dHVyZVtdIHtcclxuICAgICAgICBjb25zdCBhY3RpdmVUZXh0dXJlcyA9IHN1cGVyLmdldEFjdGl2ZVRleHR1cmVzKCk7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLl9idW1wVGV4dHVyZSkge1xyXG4gICAgICAgICAgICBhY3RpdmVUZXh0dXJlcy5wdXNoKHRoaXMuX2J1bXBUZXh0dXJlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBhY3RpdmVUZXh0dXJlcztcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgaGFzVGV4dHVyZSh0ZXh0dXJlOiBCYXNlVGV4dHVyZSk6IGJvb2xlYW4ge1xyXG4gICAgICAgIGlmIChzdXBlci5oYXNUZXh0dXJlKHRleHR1cmUpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuX2J1bXBUZXh0dXJlID09PSB0ZXh0dXJlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBkaXNwb3NlKGZvcmNlRGlzcG9zZUVmZmVjdD86IGJvb2xlYW4pOiB2b2lkIHtcclxuICAgICAgICBpZiAodGhpcy5idW1wVGV4dHVyZSkge1xyXG4gICAgICAgICAgICB0aGlzLmJ1bXBUZXh0dXJlLmRpc3Bvc2UoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBpbmRleCA9IHRoaXMuZ2V0U2NlbmUoKS5jdXN0b21SZW5kZXJUYXJnZXRzLmluZGV4T2YoPFJlbmRlclRhcmdldFRleHR1cmU+dGhpcy5fcmVmcmFjdGlvblJUVCk7XHJcbiAgICAgICAgaWYgKGluZGV4ICE9IC0xKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZ2V0U2NlbmUoKS5jdXN0b21SZW5kZXJUYXJnZXRzLnNwbGljZShpbmRleCwgMSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGluZGV4ID0gLTE7XHJcbiAgICAgICAgaW5kZXggPSB0aGlzLmdldFNjZW5lKCkuY3VzdG9tUmVuZGVyVGFyZ2V0cy5pbmRleE9mKDxSZW5kZXJUYXJnZXRUZXh0dXJlPnRoaXMuX3JlZmxlY3Rpb25SVFQpO1xyXG4gICAgICAgIGlmIChpbmRleCAhPSAtMSkge1xyXG4gICAgICAgICAgICB0aGlzLmdldFNjZW5lKCkuY3VzdG9tUmVuZGVyVGFyZ2V0cy5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKHRoaXMuX3JlZmxlY3Rpb25SVFQpIHtcclxuICAgICAgICAgICAgdGhpcy5fcmVmbGVjdGlvblJUVC5kaXNwb3NlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0aGlzLl9yZWZyYWN0aW9uUlRUKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX3JlZnJhY3Rpb25SVFQuZGlzcG9zZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gUmVtb3ZlIGltYWdlLXByb2Nlc3Npbmcgb2JzZXJ2ZXJcclxuICAgICAgICBpZiAodGhpcy5faW1hZ2VQcm9jZXNzaW5nQ29uZmlndXJhdGlvbiAmJiB0aGlzLl9pbWFnZVByb2Nlc3NpbmdPYnNlcnZlcikge1xyXG4gICAgICAgICAgICB0aGlzLl9pbWFnZVByb2Nlc3NpbmdDb25maWd1cmF0aW9uLm9uVXBkYXRlUGFyYW1ldGVycy5yZW1vdmUodGhpcy5faW1hZ2VQcm9jZXNzaW5nT2JzZXJ2ZXIpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc3VwZXIuZGlzcG9zZShmb3JjZURpc3Bvc2VFZmZlY3QpO1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBjbG9uZShuYW1lOiBzdHJpbmcpOiBXYXRlck1hdGVyaWFsIHtcclxuICAgICAgICByZXR1cm4gU2VyaWFsaXphdGlvbkhlbHBlci5DbG9uZSgoKSA9PiBuZXcgV2F0ZXJNYXRlcmlhbChuYW1lLCB0aGlzLmdldFNjZW5lKCkpLCB0aGlzKTtcclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc2VyaWFsaXplKCk6IGFueSB7XHJcbiAgICAgICAgY29uc3Qgc2VyaWFsaXphdGlvbk9iamVjdCA9IHN1cGVyLnNlcmlhbGl6ZSgpO1xyXG4gICAgICAgIHNlcmlhbGl6YXRpb25PYmplY3QuY3VzdG9tVHlwZSA9IFwiQkFCWUxPTi5XYXRlck1hdGVyaWFsXCI7XHJcblxyXG4gICAgICAgIHNlcmlhbGl6YXRpb25PYmplY3QucmVuZGVyTGlzdCA9IFtdO1xyXG4gICAgICAgIGlmICh0aGlzLl9yZWZyYWN0aW9uUlRUICYmIHRoaXMuX3JlZnJhY3Rpb25SVFQucmVuZGVyTGlzdCkge1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuX3JlZnJhY3Rpb25SVFQucmVuZGVyTGlzdC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgc2VyaWFsaXphdGlvbk9iamVjdC5yZW5kZXJMaXN0LnB1c2godGhpcy5fcmVmcmFjdGlvblJUVC5yZW5kZXJMaXN0W2ldLmlkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHNlcmlhbGl6YXRpb25PYmplY3Q7XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIGdldENsYXNzTmFtZSgpOiBzdHJpbmcge1xyXG4gICAgICAgIHJldHVybiBcIldhdGVyTWF0ZXJpYWxcIjtcclxuICAgIH1cclxuXHJcbiAgICAvLyBTdGF0aWNzXHJcbiAgICBwdWJsaWMgc3RhdGljIFBhcnNlKHNvdXJjZTogYW55LCBzY2VuZTogU2NlbmUsIHJvb3RVcmw6IHN0cmluZyk6IFdhdGVyTWF0ZXJpYWwge1xyXG4gICAgICAgIGNvbnN0IG1hdCA9IFNlcmlhbGl6YXRpb25IZWxwZXIuUGFyc2UoKCkgPT4gbmV3IFdhdGVyTWF0ZXJpYWwoc291cmNlLm5hbWUsIHNjZW5lKSwgc291cmNlLCBzY2VuZSwgcm9vdFVybCk7XHJcbiAgICAgICAgbWF0Ll93YWl0aW5nUmVuZGVyTGlzdCA9IHNvdXJjZS5yZW5kZXJMaXN0O1xyXG5cclxuICAgICAgICByZXR1cm4gbWF0O1xyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBzdGF0aWMgQ3JlYXRlRGVmYXVsdE1lc2gobmFtZTogc3RyaW5nLCBzY2VuZTogU2NlbmUpOiBNZXNoIHtcclxuICAgICAgICBjb25zdCBtZXNoID0gQ3JlYXRlR3JvdW5kKG5hbWUsIHsgd2lkdGg6IDUxMiwgaGVpZ2h0OiA1MTIsIHN1YmRpdmlzaW9uczogMzIsIHVwZGF0YWJsZTogZmFsc2UgfSwgc2NlbmUpO1xyXG4gICAgICAgIHJldHVybiBtZXNoO1xyXG4gICAgfVxyXG59XHJcblxyXG5SZWdpc3RlckNsYXNzKFwiQkFCWUxPTi5XYXRlck1hdGVyaWFsXCIsIFdhdGVyTWF0ZXJpYWwpO1xyXG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBpbXBvcnQvbm8taW50ZXJuYWwtbW9kdWxlcyAqL1xyXG5pbXBvcnQgKiBhcyBNYXRMaWIgZnJvbSBcIm1hdGVyaWFscy93YXRlci9pbmRleFwiO1xyXG5cclxuLyoqXHJcbiAqIFRoaXMgaXMgdGhlIGVudHJ5IHBvaW50IGZvciB0aGUgVU1EIG1vZHVsZS5cclxuICogVGhlIGVudHJ5IHBvaW50IGZvciBhIGZ1dHVyZSBFU00gcGFja2FnZSBzaG91bGQgYmUgaW5kZXgudHNcclxuICovXHJcbmNvbnN0IGdsb2JhbE9iamVjdCA9IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDogdW5kZWZpbmVkO1xyXG5pZiAodHlwZW9mIGdsb2JhbE9iamVjdCAhPT0gXCJ1bmRlZmluZWRcIikge1xyXG4gICAgZm9yIChjb25zdCBrZXkgaW4gTWF0TGliKSB7XHJcbiAgICAgICAgKDxhbnk+Z2xvYmFsT2JqZWN0KS5CQUJZTE9OW2tleV0gPSAoPGFueT5NYXRMaWIpW2tleV07XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCAqIGZyb20gXCJtYXRlcmlhbHMvd2F0ZXIvaW5kZXhcIjtcclxuIiwibW9kdWxlLmV4cG9ydHMgPSBfX1dFQlBBQ0tfRVhURVJOQUxfTU9EVUxFX2JhYnlsb25qc19NYXRlcmlhbHNfZWZmZWN0X187IiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQgQ29ycG9yYXRpb24uXG5cblBlcm1pc3Npb24gdG8gdXNlLCBjb3B5LCBtb2RpZnksIGFuZC9vciBkaXN0cmlidXRlIHRoaXMgc29mdHdhcmUgZm9yIGFueVxucHVycG9zZSB3aXRoIG9yIHdpdGhvdXQgZmVlIGlzIGhlcmVieSBncmFudGVkLlxuXG5USEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiIEFORCBUSEUgQVVUSE9SIERJU0NMQUlNUyBBTEwgV0FSUkFOVElFUyBXSVRIXG5SRUdBUkQgVE8gVEhJUyBTT0ZUV0FSRSBJTkNMVURJTkcgQUxMIElNUExJRUQgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFlcbkFORCBGSVRORVNTLiBJTiBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SIEJFIExJQUJMRSBGT1IgQU5ZIFNQRUNJQUwsIERJUkVDVCxcbklORElSRUNULCBPUiBDT05TRVFVRU5USUFMIERBTUFHRVMgT1IgQU5ZIERBTUFHRVMgV0hBVFNPRVZFUiBSRVNVTFRJTkcgRlJPTVxuTE9TUyBPRiBVU0UsIERBVEEgT1IgUFJPRklUUywgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIE5FR0xJR0VOQ0UgT1Jcbk9USEVSIFRPUlRJT1VTIEFDVElPTiwgQVJJU0lORyBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBVU0UgT1JcblBFUkZPUk1BTkNFIE9GIFRISVMgU09GVFdBUkUuXG4qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiAqL1xuLyogZ2xvYmFsIFJlZmxlY3QsIFByb21pc2UsIFN1cHByZXNzZWRFcnJvciwgU3ltYm9sICovXG5cbnZhciBleHRlbmRTdGF0aWNzID0gZnVuY3Rpb24oZCwgYikge1xuICBleHRlbmRTdGF0aWNzID0gT2JqZWN0LnNldFByb3RvdHlwZU9mIHx8XG4gICAgICAoeyBfX3Byb3RvX186IFtdIH0gaW5zdGFuY2VvZiBBcnJheSAmJiBmdW5jdGlvbiAoZCwgYikgeyBkLl9fcHJvdG9fXyA9IGI7IH0pIHx8XG4gICAgICBmdW5jdGlvbiAoZCwgYikgeyBmb3IgKHZhciBwIGluIGIpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYiwgcCkpIGRbcF0gPSBiW3BdOyB9O1xuICByZXR1cm4gZXh0ZW5kU3RhdGljcyhkLCBiKTtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBfX2V4dGVuZHMoZCwgYikge1xuICBpZiAodHlwZW9mIGIgIT09IFwiZnVuY3Rpb25cIiAmJiBiICE9PSBudWxsKVxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNsYXNzIGV4dGVuZHMgdmFsdWUgXCIgKyBTdHJpbmcoYikgKyBcIiBpcyBub3QgYSBjb25zdHJ1Y3RvciBvciBudWxsXCIpO1xuICBleHRlbmRTdGF0aWNzKGQsIGIpO1xuICBmdW5jdGlvbiBfXygpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGQ7IH1cbiAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xufVxuXG5leHBvcnQgdmFyIF9fYXNzaWduID0gZnVuY3Rpb24oKSB7XG4gIF9fYXNzaWduID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiBfX2Fzc2lnbih0KSB7XG4gICAgICBmb3IgKHZhciBzLCBpID0gMSwgbiA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgICBzID0gYXJndW1lbnRzW2ldO1xuICAgICAgICAgIGZvciAodmFyIHAgaW4gcykgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzLCBwKSkgdFtwXSA9IHNbcF07XG4gICAgICB9XG4gICAgICByZXR1cm4gdDtcbiAgfVxuICByZXR1cm4gX19hc3NpZ24uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9fcmVzdChzLCBlKSB7XG4gIHZhciB0ID0ge307XG4gIGZvciAodmFyIHAgaW4gcykgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzLCBwKSAmJiBlLmluZGV4T2YocCkgPCAwKVxuICAgICAgdFtwXSA9IHNbcF07XG4gIGlmIChzICE9IG51bGwgJiYgdHlwZW9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMgPT09IFwiZnVuY3Rpb25cIilcbiAgICAgIGZvciAodmFyIGkgPSAwLCBwID0gT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhzKTsgaSA8IHAubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZiAoZS5pbmRleE9mKHBbaV0pIDwgMCAmJiBPYmplY3QucHJvdG90eXBlLnByb3BlcnR5SXNFbnVtZXJhYmxlLmNhbGwocywgcFtpXSkpXG4gICAgICAgICAgICAgIHRbcFtpXV0gPSBzW3BbaV1dO1xuICAgICAgfVxuICByZXR1cm4gdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9fZGVjb3JhdGUoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpIHtcbiAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLCByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYywgZDtcbiAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0LmRlY29yYXRlID09PSBcImZ1bmN0aW9uXCIpIHIgPSBSZWZsZWN0LmRlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKTtcbiAgZWxzZSBmb3IgKHZhciBpID0gZGVjb3JhdG9ycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkgaWYgKGQgPSBkZWNvcmF0b3JzW2ldKSByID0gKGMgPCAzID8gZChyKSA6IGMgPiAzID8gZCh0YXJnZXQsIGtleSwgcikgOiBkKHRhcmdldCwga2V5KSkgfHwgcjtcbiAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9fcGFyYW0ocGFyYW1JbmRleCwgZGVjb3JhdG9yKSB7XG4gIHJldHVybiBmdW5jdGlvbiAodGFyZ2V0LCBrZXkpIHsgZGVjb3JhdG9yKHRhcmdldCwga2V5LCBwYXJhbUluZGV4KTsgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gX19lc0RlY29yYXRlKGN0b3IsIGRlc2NyaXB0b3JJbiwgZGVjb3JhdG9ycywgY29udGV4dEluLCBpbml0aWFsaXplcnMsIGV4dHJhSW5pdGlhbGl6ZXJzKSB7XG4gIGZ1bmN0aW9uIGFjY2VwdChmKSB7IGlmIChmICE9PSB2b2lkIDAgJiYgdHlwZW9mIGYgIT09IFwiZnVuY3Rpb25cIikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkZ1bmN0aW9uIGV4cGVjdGVkXCIpOyByZXR1cm4gZjsgfVxuICB2YXIga2luZCA9IGNvbnRleHRJbi5raW5kLCBrZXkgPSBraW5kID09PSBcImdldHRlclwiID8gXCJnZXRcIiA6IGtpbmQgPT09IFwic2V0dGVyXCIgPyBcInNldFwiIDogXCJ2YWx1ZVwiO1xuICB2YXIgdGFyZ2V0ID0gIWRlc2NyaXB0b3JJbiAmJiBjdG9yID8gY29udGV4dEluW1wic3RhdGljXCJdID8gY3RvciA6IGN0b3IucHJvdG90eXBlIDogbnVsbDtcbiAgdmFyIGRlc2NyaXB0b3IgPSBkZXNjcmlwdG9ySW4gfHwgKHRhcmdldCA/IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBjb250ZXh0SW4ubmFtZSkgOiB7fSk7XG4gIHZhciBfLCBkb25lID0gZmFsc2U7XG4gIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICB2YXIgY29udGV4dCA9IHt9O1xuICAgICAgZm9yICh2YXIgcCBpbiBjb250ZXh0SW4pIGNvbnRleHRbcF0gPSBwID09PSBcImFjY2Vzc1wiID8ge30gOiBjb250ZXh0SW5bcF07XG4gICAgICBmb3IgKHZhciBwIGluIGNvbnRleHRJbi5hY2Nlc3MpIGNvbnRleHQuYWNjZXNzW3BdID0gY29udGV4dEluLmFjY2Vzc1twXTtcbiAgICAgIGNvbnRleHQuYWRkSW5pdGlhbGl6ZXIgPSBmdW5jdGlvbiAoZikgeyBpZiAoZG9uZSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBhZGQgaW5pdGlhbGl6ZXJzIGFmdGVyIGRlY29yYXRpb24gaGFzIGNvbXBsZXRlZFwiKTsgZXh0cmFJbml0aWFsaXplcnMucHVzaChhY2NlcHQoZiB8fCBudWxsKSk7IH07XG4gICAgICB2YXIgcmVzdWx0ID0gKDAsIGRlY29yYXRvcnNbaV0pKGtpbmQgPT09IFwiYWNjZXNzb3JcIiA/IHsgZ2V0OiBkZXNjcmlwdG9yLmdldCwgc2V0OiBkZXNjcmlwdG9yLnNldCB9IDogZGVzY3JpcHRvcltrZXldLCBjb250ZXh0KTtcbiAgICAgIGlmIChraW5kID09PSBcImFjY2Vzc29yXCIpIHtcbiAgICAgICAgICBpZiAocmVzdWx0ID09PSB2b2lkIDApIGNvbnRpbnVlO1xuICAgICAgICAgIGlmIChyZXN1bHQgPT09IG51bGwgfHwgdHlwZW9mIHJlc3VsdCAhPT0gXCJvYmplY3RcIikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdCBleHBlY3RlZFwiKTtcbiAgICAgICAgICBpZiAoXyA9IGFjY2VwdChyZXN1bHQuZ2V0KSkgZGVzY3JpcHRvci5nZXQgPSBfO1xuICAgICAgICAgIGlmIChfID0gYWNjZXB0KHJlc3VsdC5zZXQpKSBkZXNjcmlwdG9yLnNldCA9IF87XG4gICAgICAgICAgaWYgKF8gPSBhY2NlcHQocmVzdWx0LmluaXQpKSBpbml0aWFsaXplcnMudW5zaGlmdChfKTtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKF8gPSBhY2NlcHQocmVzdWx0KSkge1xuICAgICAgICAgIGlmIChraW5kID09PSBcImZpZWxkXCIpIGluaXRpYWxpemVycy51bnNoaWZ0KF8pO1xuICAgICAgICAgIGVsc2UgZGVzY3JpcHRvcltrZXldID0gXztcbiAgICAgIH1cbiAgfVxuICBpZiAodGFyZ2V0KSBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBjb250ZXh0SW4ubmFtZSwgZGVzY3JpcHRvcik7XG4gIGRvbmUgPSB0cnVlO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIF9fcnVuSW5pdGlhbGl6ZXJzKHRoaXNBcmcsIGluaXRpYWxpemVycywgdmFsdWUpIHtcbiAgdmFyIHVzZVZhbHVlID0gYXJndW1lbnRzLmxlbmd0aCA+IDI7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgaW5pdGlhbGl6ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YWx1ZSA9IHVzZVZhbHVlID8gaW5pdGlhbGl6ZXJzW2ldLmNhbGwodGhpc0FyZywgdmFsdWUpIDogaW5pdGlhbGl6ZXJzW2ldLmNhbGwodGhpc0FyZyk7XG4gIH1cbiAgcmV0dXJuIHVzZVZhbHVlID8gdmFsdWUgOiB2b2lkIDA7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gX19wcm9wS2V5KHgpIHtcbiAgcmV0dXJuIHR5cGVvZiB4ID09PSBcInN5bWJvbFwiID8geCA6IFwiXCIuY29uY2F0KHgpO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIF9fc2V0RnVuY3Rpb25OYW1lKGYsIG5hbWUsIHByZWZpeCkge1xuICBpZiAodHlwZW9mIG5hbWUgPT09IFwic3ltYm9sXCIpIG5hbWUgPSBuYW1lLmRlc2NyaXB0aW9uID8gXCJbXCIuY29uY2F0KG5hbWUuZGVzY3JpcHRpb24sIFwiXVwiKSA6IFwiXCI7XG4gIHJldHVybiBPYmplY3QuZGVmaW5lUHJvcGVydHkoZiwgXCJuYW1lXCIsIHsgY29uZmlndXJhYmxlOiB0cnVlLCB2YWx1ZTogcHJlZml4ID8gXCJcIi5jb25jYXQocHJlZml4LCBcIiBcIiwgbmFtZSkgOiBuYW1lIH0pO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIF9fbWV0YWRhdGEobWV0YWRhdGFLZXksIG1ldGFkYXRhVmFsdWUpIHtcbiAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0Lm1ldGFkYXRhID09PSBcImZ1bmN0aW9uXCIpIHJldHVybiBSZWZsZWN0Lm1ldGFkYXRhKG1ldGFkYXRhS2V5LCBtZXRhZGF0YVZhbHVlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9fYXdhaXRlcih0aGlzQXJnLCBfYXJndW1lbnRzLCBQLCBnZW5lcmF0b3IpIHtcbiAgZnVuY3Rpb24gYWRvcHQodmFsdWUpIHsgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgUCA/IHZhbHVlIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZSh2YWx1ZSk7IH0pOyB9XG4gIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IGFkb3B0KHJlc3VsdC52YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxuICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpO1xuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9fZ2VuZXJhdG9yKHRoaXNBcmcsIGJvZHkpIHtcbiAgdmFyIF8gPSB7IGxhYmVsOiAwLCBzZW50OiBmdW5jdGlvbigpIHsgaWYgKHRbMF0gJiAxKSB0aHJvdyB0WzFdOyByZXR1cm4gdFsxXTsgfSwgdHJ5czogW10sIG9wczogW10gfSwgZiwgeSwgdCwgZztcbiAgcmV0dXJuIGcgPSB7IG5leHQ6IHZlcmIoMCksIFwidGhyb3dcIjogdmVyYigxKSwgXCJyZXR1cm5cIjogdmVyYigyKSB9LCB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgKGdbU3ltYm9sLml0ZXJhdG9yXSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpczsgfSksIGc7XG4gIGZ1bmN0aW9uIHZlcmIobikgeyByZXR1cm4gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIHN0ZXAoW24sIHZdKTsgfTsgfVxuICBmdW5jdGlvbiBzdGVwKG9wKSB7XG4gICAgICBpZiAoZikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkdlbmVyYXRvciBpcyBhbHJlYWR5IGV4ZWN1dGluZy5cIik7XG4gICAgICB3aGlsZSAoZyAmJiAoZyA9IDAsIG9wWzBdICYmIChfID0gMCkpLCBfKSB0cnkge1xuICAgICAgICAgIGlmIChmID0gMSwgeSAmJiAodCA9IG9wWzBdICYgMiA/IHlbXCJyZXR1cm5cIl0gOiBvcFswXSA/IHlbXCJ0aHJvd1wiXSB8fCAoKHQgPSB5W1wicmV0dXJuXCJdKSAmJiB0LmNhbGwoeSksIDApIDogeS5uZXh0KSAmJiAhKHQgPSB0LmNhbGwoeSwgb3BbMV0pKS5kb25lKSByZXR1cm4gdDtcbiAgICAgICAgICBpZiAoeSA9IDAsIHQpIG9wID0gW29wWzBdICYgMiwgdC52YWx1ZV07XG4gICAgICAgICAgc3dpdGNoIChvcFswXSkge1xuICAgICAgICAgICAgICBjYXNlIDA6IGNhc2UgMTogdCA9IG9wOyBicmVhaztcbiAgICAgICAgICAgICAgY2FzZSA0OiBfLmxhYmVsKys7IHJldHVybiB7IHZhbHVlOiBvcFsxXSwgZG9uZTogZmFsc2UgfTtcbiAgICAgICAgICAgICAgY2FzZSA1OiBfLmxhYmVsKys7IHkgPSBvcFsxXTsgb3AgPSBbMF07IGNvbnRpbnVlO1xuICAgICAgICAgICAgICBjYXNlIDc6IG9wID0gXy5vcHMucG9wKCk7IF8udHJ5cy5wb3AoKTsgY29udGludWU7XG4gICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICBpZiAoISh0ID0gXy50cnlzLCB0ID0gdC5sZW5ndGggPiAwICYmIHRbdC5sZW5ndGggLSAxXSkgJiYgKG9wWzBdID09PSA2IHx8IG9wWzBdID09PSAyKSkgeyBfID0gMDsgY29udGludWU7IH1cbiAgICAgICAgICAgICAgICAgIGlmIChvcFswXSA9PT0gMyAmJiAoIXQgfHwgKG9wWzFdID4gdFswXSAmJiBvcFsxXSA8IHRbM10pKSkgeyBfLmxhYmVsID0gb3BbMV07IGJyZWFrOyB9XG4gICAgICAgICAgICAgICAgICBpZiAob3BbMF0gPT09IDYgJiYgXy5sYWJlbCA8IHRbMV0pIHsgXy5sYWJlbCA9IHRbMV07IHQgPSBvcDsgYnJlYWs7IH1cbiAgICAgICAgICAgICAgICAgIGlmICh0ICYmIF8ubGFiZWwgPCB0WzJdKSB7IF8ubGFiZWwgPSB0WzJdOyBfLm9wcy5wdXNoKG9wKTsgYnJlYWs7IH1cbiAgICAgICAgICAgICAgICAgIGlmICh0WzJdKSBfLm9wcy5wb3AoKTtcbiAgICAgICAgICAgICAgICAgIF8udHJ5cy5wb3AoKTsgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIG9wID0gYm9keS5jYWxsKHRoaXNBcmcsIF8pO1xuICAgICAgfSBjYXRjaCAoZSkgeyBvcCA9IFs2LCBlXTsgeSA9IDA7IH0gZmluYWxseSB7IGYgPSB0ID0gMDsgfVxuICAgICAgaWYgKG9wWzBdICYgNSkgdGhyb3cgb3BbMV07IHJldHVybiB7IHZhbHVlOiBvcFswXSA/IG9wWzFdIDogdm9pZCAwLCBkb25lOiB0cnVlIH07XG4gIH1cbn1cblxuZXhwb3J0IHZhciBfX2NyZWF0ZUJpbmRpbmcgPSBPYmplY3QuY3JlYXRlID8gKGZ1bmN0aW9uKG8sIG0sIGssIGsyKSB7XG4gIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XG4gIHZhciBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihtLCBrKTtcbiAgaWYgKCFkZXNjIHx8IChcImdldFwiIGluIGRlc2MgPyAhbS5fX2VzTW9kdWxlIDogZGVzYy53cml0YWJsZSB8fCBkZXNjLmNvbmZpZ3VyYWJsZSkpIHtcbiAgICAgIGRlc2MgPSB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBtW2tdOyB9IH07XG4gIH1cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIGsyLCBkZXNjKTtcbn0pIDogKGZ1bmN0aW9uKG8sIG0sIGssIGsyKSB7XG4gIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XG4gIG9bazJdID0gbVtrXTtcbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gX19leHBvcnRTdGFyKG0sIG8pIHtcbiAgZm9yICh2YXIgcCBpbiBtKSBpZiAocCAhPT0gXCJkZWZhdWx0XCIgJiYgIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvLCBwKSkgX19jcmVhdGVCaW5kaW5nKG8sIG0sIHApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gX192YWx1ZXMobykge1xuICB2YXIgcyA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBTeW1ib2wuaXRlcmF0b3IsIG0gPSBzICYmIG9bc10sIGkgPSAwO1xuICBpZiAobSkgcmV0dXJuIG0uY2FsbChvKTtcbiAgaWYgKG8gJiYgdHlwZW9mIG8ubGVuZ3RoID09PSBcIm51bWJlclwiKSByZXR1cm4ge1xuICAgICAgbmV4dDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGlmIChvICYmIGkgPj0gby5sZW5ndGgpIG8gPSB2b2lkIDA7XG4gICAgICAgICAgcmV0dXJuIHsgdmFsdWU6IG8gJiYgb1tpKytdLCBkb25lOiAhbyB9O1xuICAgICAgfVxuICB9O1xuICB0aHJvdyBuZXcgVHlwZUVycm9yKHMgPyBcIk9iamVjdCBpcyBub3QgaXRlcmFibGUuXCIgOiBcIlN5bWJvbC5pdGVyYXRvciBpcyBub3QgZGVmaW5lZC5cIik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfX3JlYWQobywgbikge1xuICB2YXIgbSA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvW1N5bWJvbC5pdGVyYXRvcl07XG4gIGlmICghbSkgcmV0dXJuIG87XG4gIHZhciBpID0gbS5jYWxsKG8pLCByLCBhciA9IFtdLCBlO1xuICB0cnkge1xuICAgICAgd2hpbGUgKChuID09PSB2b2lkIDAgfHwgbi0tID4gMCkgJiYgIShyID0gaS5uZXh0KCkpLmRvbmUpIGFyLnB1c2goci52YWx1ZSk7XG4gIH1cbiAgY2F0Y2ggKGVycm9yKSB7IGUgPSB7IGVycm9yOiBlcnJvciB9OyB9XG4gIGZpbmFsbHkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgICBpZiAociAmJiAhci5kb25lICYmIChtID0gaVtcInJldHVyblwiXSkpIG0uY2FsbChpKTtcbiAgICAgIH1cbiAgICAgIGZpbmFsbHkgeyBpZiAoZSkgdGhyb3cgZS5lcnJvcjsgfVxuICB9XG4gIHJldHVybiBhcjtcbn1cblxuLyoqIEBkZXByZWNhdGVkICovXG5leHBvcnQgZnVuY3Rpb24gX19zcHJlYWQoKSB7XG4gIGZvciAodmFyIGFyID0gW10sIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKVxuICAgICAgYXIgPSBhci5jb25jYXQoX19yZWFkKGFyZ3VtZW50c1tpXSkpO1xuICByZXR1cm4gYXI7XG59XG5cbi8qKiBAZGVwcmVjYXRlZCAqL1xuZXhwb3J0IGZ1bmN0aW9uIF9fc3ByZWFkQXJyYXlzKCkge1xuICBmb3IgKHZhciBzID0gMCwgaSA9IDAsIGlsID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IGlsOyBpKyspIHMgKz0gYXJndW1lbnRzW2ldLmxlbmd0aDtcbiAgZm9yICh2YXIgciA9IEFycmF5KHMpLCBrID0gMCwgaSA9IDA7IGkgPCBpbDsgaSsrKVxuICAgICAgZm9yICh2YXIgYSA9IGFyZ3VtZW50c1tpXSwgaiA9IDAsIGpsID0gYS5sZW5ndGg7IGogPCBqbDsgaisrLCBrKyspXG4gICAgICAgICAgcltrXSA9IGFbal07XG4gIHJldHVybiByO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gX19zcHJlYWRBcnJheSh0bywgZnJvbSwgcGFjaykge1xuICBpZiAocGFjayB8fCBhcmd1bWVudHMubGVuZ3RoID09PSAyKSBmb3IgKHZhciBpID0gMCwgbCA9IGZyb20ubGVuZ3RoLCBhcjsgaSA8IGw7IGkrKykge1xuICAgICAgaWYgKGFyIHx8ICEoaSBpbiBmcm9tKSkge1xuICAgICAgICAgIGlmICghYXIpIGFyID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZnJvbSwgMCwgaSk7XG4gICAgICAgICAgYXJbaV0gPSBmcm9tW2ldO1xuICAgICAgfVxuICB9XG4gIHJldHVybiB0by5jb25jYXQoYXIgfHwgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZnJvbSkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gX19hd2FpdCh2KSB7XG4gIHJldHVybiB0aGlzIGluc3RhbmNlb2YgX19hd2FpdCA/ICh0aGlzLnYgPSB2LCB0aGlzKSA6IG5ldyBfX2F3YWl0KHYpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gX19hc3luY0dlbmVyYXRvcih0aGlzQXJnLCBfYXJndW1lbnRzLCBnZW5lcmF0b3IpIHtcbiAgaWYgKCFTeW1ib2wuYXN5bmNJdGVyYXRvcikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5hc3luY0l0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcbiAgdmFyIGcgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSksIGksIHEgPSBbXTtcbiAgcmV0dXJuIGkgPSB7fSwgdmVyYihcIm5leHRcIiksIHZlcmIoXCJ0aHJvd1wiKSwgdmVyYihcInJldHVyblwiKSwgaVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9LCBpO1xuICBmdW5jdGlvbiB2ZXJiKG4pIHsgaWYgKGdbbl0pIGlbbl0gPSBmdW5jdGlvbiAodikgeyByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKGEsIGIpIHsgcS5wdXNoKFtuLCB2LCBhLCBiXSkgPiAxIHx8IHJlc3VtZShuLCB2KTsgfSk7IH07IH1cbiAgZnVuY3Rpb24gcmVzdW1lKG4sIHYpIHsgdHJ5IHsgc3RlcChnW25dKHYpKTsgfSBjYXRjaCAoZSkgeyBzZXR0bGUocVswXVszXSwgZSk7IH0gfVxuICBmdW5jdGlvbiBzdGVwKHIpIHsgci52YWx1ZSBpbnN0YW5jZW9mIF9fYXdhaXQgPyBQcm9taXNlLnJlc29sdmUoci52YWx1ZS52KS50aGVuKGZ1bGZpbGwsIHJlamVjdCkgOiBzZXR0bGUocVswXVsyXSwgcik7IH1cbiAgZnVuY3Rpb24gZnVsZmlsbCh2YWx1ZSkgeyByZXN1bWUoXCJuZXh0XCIsIHZhbHVlKTsgfVxuICBmdW5jdGlvbiByZWplY3QodmFsdWUpIHsgcmVzdW1lKFwidGhyb3dcIiwgdmFsdWUpOyB9XG4gIGZ1bmN0aW9uIHNldHRsZShmLCB2KSB7IGlmIChmKHYpLCBxLnNoaWZ0KCksIHEubGVuZ3RoKSByZXN1bWUocVswXVswXSwgcVswXVsxXSk7IH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9fYXN5bmNEZWxlZ2F0b3Iobykge1xuICB2YXIgaSwgcDtcbiAgcmV0dXJuIGkgPSB7fSwgdmVyYihcIm5leHRcIiksIHZlcmIoXCJ0aHJvd1wiLCBmdW5jdGlvbiAoZSkgeyB0aHJvdyBlOyB9KSwgdmVyYihcInJldHVyblwiKSwgaVtTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSwgaTtcbiAgZnVuY3Rpb24gdmVyYihuLCBmKSB7IGlbbl0gPSBvW25dID8gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIChwID0gIXApID8geyB2YWx1ZTogX19hd2FpdChvW25dKHYpKSwgZG9uZTogZmFsc2UgfSA6IGYgPyBmKHYpIDogdjsgfSA6IGY7IH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9fYXN5bmNWYWx1ZXMobykge1xuICBpZiAoIVN5bWJvbC5hc3luY0l0ZXJhdG9yKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3ltYm9sLmFzeW5jSXRlcmF0b3IgaXMgbm90IGRlZmluZWQuXCIpO1xuICB2YXIgbSA9IG9bU3ltYm9sLmFzeW5jSXRlcmF0b3JdLCBpO1xuICByZXR1cm4gbSA/IG0uY2FsbChvKSA6IChvID0gdHlwZW9mIF9fdmFsdWVzID09PSBcImZ1bmN0aW9uXCIgPyBfX3ZhbHVlcyhvKSA6IG9bU3ltYm9sLml0ZXJhdG9yXSgpLCBpID0ge30sIHZlcmIoXCJuZXh0XCIpLCB2ZXJiKFwidGhyb3dcIiksIHZlcmIoXCJyZXR1cm5cIiksIGlbU3ltYm9sLmFzeW5jSXRlcmF0b3JdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSwgaSk7XG4gIGZ1bmN0aW9uIHZlcmIobikgeyBpW25dID0gb1tuXSAmJiBmdW5jdGlvbiAodikgeyByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkgeyB2ID0gb1tuXSh2KSwgc2V0dGxlKHJlc29sdmUsIHJlamVjdCwgdi5kb25lLCB2LnZhbHVlKTsgfSk7IH07IH1cbiAgZnVuY3Rpb24gc2V0dGxlKHJlc29sdmUsIHJlamVjdCwgZCwgdikgeyBQcm9taXNlLnJlc29sdmUodikudGhlbihmdW5jdGlvbih2KSB7IHJlc29sdmUoeyB2YWx1ZTogdiwgZG9uZTogZCB9KTsgfSwgcmVqZWN0KTsgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gX19tYWtlVGVtcGxhdGVPYmplY3QoY29va2VkLCByYXcpIHtcbiAgaWYgKE9iamVjdC5kZWZpbmVQcm9wZXJ0eSkgeyBPYmplY3QuZGVmaW5lUHJvcGVydHkoY29va2VkLCBcInJhd1wiLCB7IHZhbHVlOiByYXcgfSk7IH0gZWxzZSB7IGNvb2tlZC5yYXcgPSByYXc7IH1cbiAgcmV0dXJuIGNvb2tlZDtcbn07XG5cbnZhciBfX3NldE1vZHVsZURlZmF1bHQgPSBPYmplY3QuY3JlYXRlID8gKGZ1bmN0aW9uKG8sIHYpIHtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIFwiZGVmYXVsdFwiLCB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiB2IH0pO1xufSkgOiBmdW5jdGlvbihvLCB2KSB7XG4gIG9bXCJkZWZhdWx0XCJdID0gdjtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBfX2ltcG9ydFN0YXIobW9kKSB7XG4gIGlmIChtb2QgJiYgbW9kLl9fZXNNb2R1bGUpIHJldHVybiBtb2Q7XG4gIHZhciByZXN1bHQgPSB7fTtcbiAgaWYgKG1vZCAhPSBudWxsKSBmb3IgKHZhciBrIGluIG1vZCkgaWYgKGsgIT09IFwiZGVmYXVsdFwiICYmIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChtb2QsIGspKSBfX2NyZWF0ZUJpbmRpbmcocmVzdWx0LCBtb2QsIGspO1xuICBfX3NldE1vZHVsZURlZmF1bHQocmVzdWx0LCBtb2QpO1xuICByZXR1cm4gcmVzdWx0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gX19pbXBvcnREZWZhdWx0KG1vZCkge1xuICByZXR1cm4gKG1vZCAmJiBtb2QuX19lc01vZHVsZSkgPyBtb2QgOiB7IGRlZmF1bHQ6IG1vZCB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gX19jbGFzc1ByaXZhdGVGaWVsZEdldChyZWNlaXZlciwgc3RhdGUsIGtpbmQsIGYpIHtcbiAgaWYgKGtpbmQgPT09IFwiYVwiICYmICFmKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiUHJpdmF0ZSBhY2Nlc3NvciB3YXMgZGVmaW5lZCB3aXRob3V0IGEgZ2V0dGVyXCIpO1xuICBpZiAodHlwZW9mIHN0YXRlID09PSBcImZ1bmN0aW9uXCIgPyByZWNlaXZlciAhPT0gc3RhdGUgfHwgIWYgOiAhc3RhdGUuaGFzKHJlY2VpdmVyKSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCByZWFkIHByaXZhdGUgbWVtYmVyIGZyb20gYW4gb2JqZWN0IHdob3NlIGNsYXNzIGRpZCBub3QgZGVjbGFyZSBpdFwiKTtcbiAgcmV0dXJuIGtpbmQgPT09IFwibVwiID8gZiA6IGtpbmQgPT09IFwiYVwiID8gZi5jYWxsKHJlY2VpdmVyKSA6IGYgPyBmLnZhbHVlIDogc3RhdGUuZ2V0KHJlY2VpdmVyKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9fY2xhc3NQcml2YXRlRmllbGRTZXQocmVjZWl2ZXIsIHN0YXRlLCB2YWx1ZSwga2luZCwgZikge1xuICBpZiAoa2luZCA9PT0gXCJtXCIpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJQcml2YXRlIG1ldGhvZCBpcyBub3Qgd3JpdGFibGVcIik7XG4gIGlmIChraW5kID09PSBcImFcIiAmJiAhZikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlByaXZhdGUgYWNjZXNzb3Igd2FzIGRlZmluZWQgd2l0aG91dCBhIHNldHRlclwiKTtcbiAgaWYgKHR5cGVvZiBzdGF0ZSA9PT0gXCJmdW5jdGlvblwiID8gcmVjZWl2ZXIgIT09IHN0YXRlIHx8ICFmIDogIXN0YXRlLmhhcyhyZWNlaXZlcikpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3Qgd3JpdGUgcHJpdmF0ZSBtZW1iZXIgdG8gYW4gb2JqZWN0IHdob3NlIGNsYXNzIGRpZCBub3QgZGVjbGFyZSBpdFwiKTtcbiAgcmV0dXJuIChraW5kID09PSBcImFcIiA/IGYuY2FsbChyZWNlaXZlciwgdmFsdWUpIDogZiA/IGYudmFsdWUgPSB2YWx1ZSA6IHN0YXRlLnNldChyZWNlaXZlciwgdmFsdWUpKSwgdmFsdWU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBfX2NsYXNzUHJpdmF0ZUZpZWxkSW4oc3RhdGUsIHJlY2VpdmVyKSB7XG4gIGlmIChyZWNlaXZlciA9PT0gbnVsbCB8fCAodHlwZW9mIHJlY2VpdmVyICE9PSBcIm9iamVjdFwiICYmIHR5cGVvZiByZWNlaXZlciAhPT0gXCJmdW5jdGlvblwiKSkgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCB1c2UgJ2luJyBvcGVyYXRvciBvbiBub24tb2JqZWN0XCIpO1xuICByZXR1cm4gdHlwZW9mIHN0YXRlID09PSBcImZ1bmN0aW9uXCIgPyByZWNlaXZlciA9PT0gc3RhdGUgOiBzdGF0ZS5oYXMocmVjZWl2ZXIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gX19hZGREaXNwb3NhYmxlUmVzb3VyY2UoZW52LCB2YWx1ZSwgYXN5bmMpIHtcbiAgaWYgKHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSB2b2lkIDApIHtcbiAgICBpZiAodHlwZW9mIHZhbHVlICE9PSBcIm9iamVjdFwiICYmIHR5cGVvZiB2YWx1ZSAhPT0gXCJmdW5jdGlvblwiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiT2JqZWN0IGV4cGVjdGVkLlwiKTtcbiAgICB2YXIgZGlzcG9zZTtcbiAgICBpZiAoYXN5bmMpIHtcbiAgICAgICAgaWYgKCFTeW1ib2wuYXN5bmNEaXNwb3NlKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3ltYm9sLmFzeW5jRGlzcG9zZSBpcyBub3QgZGVmaW5lZC5cIik7XG4gICAgICAgIGRpc3Bvc2UgPSB2YWx1ZVtTeW1ib2wuYXN5bmNEaXNwb3NlXTtcbiAgICB9XG4gICAgaWYgKGRpc3Bvc2UgPT09IHZvaWQgMCkge1xuICAgICAgICBpZiAoIVN5bWJvbC5kaXNwb3NlKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3ltYm9sLmRpc3Bvc2UgaXMgbm90IGRlZmluZWQuXCIpO1xuICAgICAgICBkaXNwb3NlID0gdmFsdWVbU3ltYm9sLmRpc3Bvc2VdO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIGRpc3Bvc2UgIT09IFwiZnVuY3Rpb25cIikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdCBub3QgZGlzcG9zYWJsZS5cIik7XG4gICAgZW52LnN0YWNrLnB1c2goeyB2YWx1ZTogdmFsdWUsIGRpc3Bvc2U6IGRpc3Bvc2UsIGFzeW5jOiBhc3luYyB9KTtcbiAgfVxuICBlbHNlIGlmIChhc3luYykge1xuICAgIGVudi5zdGFjay5wdXNoKHsgYXN5bmM6IHRydWUgfSk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG52YXIgX1N1cHByZXNzZWRFcnJvciA9IHR5cGVvZiBTdXBwcmVzc2VkRXJyb3IgPT09IFwiZnVuY3Rpb25cIiA/IFN1cHByZXNzZWRFcnJvciA6IGZ1bmN0aW9uIChlcnJvciwgc3VwcHJlc3NlZCwgbWVzc2FnZSkge1xuICB2YXIgZSA9IG5ldyBFcnJvcihtZXNzYWdlKTtcbiAgcmV0dXJuIGUubmFtZSA9IFwiU3VwcHJlc3NlZEVycm9yXCIsIGUuZXJyb3IgPSBlcnJvciwgZS5zdXBwcmVzc2VkID0gc3VwcHJlc3NlZCwgZTtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBfX2Rpc3Bvc2VSZXNvdXJjZXMoZW52KSB7XG4gIGZ1bmN0aW9uIGZhaWwoZSkge1xuICAgIGVudi5lcnJvciA9IGVudi5oYXNFcnJvciA/IG5ldyBfU3VwcHJlc3NlZEVycm9yKGUsIGVudi5lcnJvciwgXCJBbiBlcnJvciB3YXMgc3VwcHJlc3NlZCBkdXJpbmcgZGlzcG9zYWwuXCIpIDogZTtcbiAgICBlbnYuaGFzRXJyb3IgPSB0cnVlO1xuICB9XG4gIGZ1bmN0aW9uIG5leHQoKSB7XG4gICAgd2hpbGUgKGVudi5zdGFjay5sZW5ndGgpIHtcbiAgICAgIHZhciByZWMgPSBlbnYuc3RhY2sucG9wKCk7XG4gICAgICB0cnkge1xuICAgICAgICB2YXIgcmVzdWx0ID0gcmVjLmRpc3Bvc2UgJiYgcmVjLmRpc3Bvc2UuY2FsbChyZWMudmFsdWUpO1xuICAgICAgICBpZiAocmVjLmFzeW5jKSByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHJlc3VsdCkudGhlbihuZXh0LCBmdW5jdGlvbihlKSB7IGZhaWwoZSk7IHJldHVybiBuZXh0KCk7IH0pO1xuICAgICAgfVxuICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICBmYWlsKGUpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoZW52Lmhhc0Vycm9yKSB0aHJvdyBlbnYuZXJyb3I7XG4gIH1cbiAgcmV0dXJuIG5leHQoKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQge1xuICBfX2V4dGVuZHMsXG4gIF9fYXNzaWduLFxuICBfX3Jlc3QsXG4gIF9fZGVjb3JhdGUsXG4gIF9fcGFyYW0sXG4gIF9fbWV0YWRhdGEsXG4gIF9fYXdhaXRlcixcbiAgX19nZW5lcmF0b3IsXG4gIF9fY3JlYXRlQmluZGluZyxcbiAgX19leHBvcnRTdGFyLFxuICBfX3ZhbHVlcyxcbiAgX19yZWFkLFxuICBfX3NwcmVhZCxcbiAgX19zcHJlYWRBcnJheXMsXG4gIF9fc3ByZWFkQXJyYXksXG4gIF9fYXdhaXQsXG4gIF9fYXN5bmNHZW5lcmF0b3IsXG4gIF9fYXN5bmNEZWxlZ2F0b3IsXG4gIF9fYXN5bmNWYWx1ZXMsXG4gIF9fbWFrZVRlbXBsYXRlT2JqZWN0LFxuICBfX2ltcG9ydFN0YXIsXG4gIF9faW1wb3J0RGVmYXVsdCxcbiAgX19jbGFzc1ByaXZhdGVGaWVsZEdldCxcbiAgX19jbGFzc1ByaXZhdGVGaWVsZFNldCxcbiAgX19jbGFzc1ByaXZhdGVGaWVsZEluLFxuICBfX2FkZERpc3Bvc2FibGVSZXNvdXJjZSxcbiAgX19kaXNwb3NlUmVzb3VyY2VzLFxufTtcbiIsIi8vIFRoZSBtb2R1bGUgY2FjaGVcbnZhciBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX18gPSB7fTtcblxuLy8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbmZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG5cdHZhciBjYWNoZWRNb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdO1xuXHRpZiAoY2FjaGVkTW9kdWxlICE9PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4gY2FjaGVkTW9kdWxlLmV4cG9ydHM7XG5cdH1cblx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcblx0dmFyIG1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0gPSB7XG5cdFx0Ly8gbm8gbW9kdWxlLmlkIG5lZWRlZFxuXHRcdC8vIG5vIG1vZHVsZS5sb2FkZWQgbmVlZGVkXG5cdFx0ZXhwb3J0czoge31cblx0fTtcblxuXHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cblx0X193ZWJwYWNrX21vZHVsZXNfX1ttb2R1bGVJZF0obW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cblx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcblx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xufVxuXG4iLCIvLyBnZXREZWZhdWx0RXhwb3J0IGZ1bmN0aW9uIGZvciBjb21wYXRpYmlsaXR5IHdpdGggbm9uLWhhcm1vbnkgbW9kdWxlc1xuX193ZWJwYWNrX3JlcXVpcmVfXy5uID0gKG1vZHVsZSkgPT4ge1xuXHR2YXIgZ2V0dGVyID0gbW9kdWxlICYmIG1vZHVsZS5fX2VzTW9kdWxlID9cblx0XHQoKSA9PiAobW9kdWxlWydkZWZhdWx0J10pIDpcblx0XHQoKSA9PiAobW9kdWxlKTtcblx0X193ZWJwYWNrX3JlcXVpcmVfXy5kKGdldHRlciwgeyBhOiBnZXR0ZXIgfSk7XG5cdHJldHVybiBnZXR0ZXI7XG59OyIsIi8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb25zIGZvciBoYXJtb255IGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uZCA9IChleHBvcnRzLCBkZWZpbml0aW9uKSA9PiB7XG5cdGZvcih2YXIga2V5IGluIGRlZmluaXRpb24pIHtcblx0XHRpZihfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZGVmaW5pdGlvbiwga2V5KSAmJiAhX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIGtleSkpIHtcblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBrZXksIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBkZWZpbml0aW9uW2tleV0gfSk7XG5cdFx0fVxuXHR9XG59OyIsIl9fd2VicGFja19yZXF1aXJlX18uZyA9IChmdW5jdGlvbigpIHtcblx0aWYgKHR5cGVvZiBnbG9iYWxUaGlzID09PSAnb2JqZWN0JykgcmV0dXJuIGdsb2JhbFRoaXM7XG5cdHRyeSB7XG5cdFx0cmV0dXJuIHRoaXMgfHwgbmV3IEZ1bmN0aW9uKCdyZXR1cm4gdGhpcycpKCk7XG5cdH0gY2F0Y2ggKGUpIHtcblx0XHRpZiAodHlwZW9mIHdpbmRvdyA9PT0gJ29iamVjdCcpIHJldHVybiB3aW5kb3c7XG5cdH1cbn0pKCk7IiwiX193ZWJwYWNrX3JlcXVpcmVfXy5vID0gKG9iaiwgcHJvcCkgPT4gKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApKSIsIi8vIGRlZmluZSBfX2VzTW9kdWxlIG9uIGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uciA9IChleHBvcnRzKSA9PiB7XG5cdGlmKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1N0cmluZ1RhZykge1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBTeW1ib2wudG9TdHJpbmdUYWcsIHsgdmFsdWU6ICdNb2R1bGUnIH0pO1xuXHR9XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG59OyIsImltcG9ydCAqIGFzIG1hdGVyaWFscyBmcm9tIFwiQGx0cy9tYXRlcmlhbHMvbGVnYWN5L2xlZ2FjeS13YXRlclwiO1xyXG5leHBvcnQgeyBtYXRlcmlhbHMgfTtcclxuZXhwb3J0IGRlZmF1bHQgbWF0ZXJpYWxzO1xyXG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=