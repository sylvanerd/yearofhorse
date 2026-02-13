// -----JS CODE-----
// PortalController.js
// Version: 0.0.4
// Event: Initialized
// Description: The primary script that drives the Portal template.

// @input SceneObject camera

// @ui {"widget":"group_start", "label":"Portal"}
// @input SceneObject portalObject
// @input Component.MaterialMeshVisual portalOccluderMesh
// @ui {"widget":"group_end"}

// Gyro Options

// @ui {"widget":"group_start", "label":"Gyro Fallback"}
// @input bool useGyroFallback = false
// @input SceneObject gyroFallbackPositionSurface {"label": "Gyro Transform", "showIf": "useGyroFallback"}
// @ui {"widget":"group_end"}

// Advanced Options

// @input bool Advanced = false
// @ui {"widget":"group_start", "label":"Tracking Properties", "showIf": "Advanced", "showIfValue": true}
// @input SceneObject portalCornerMin
// @input SceneObject portalCornerMax
// @input Component.ManipulateComponent manipulateComponent
// @input SceneObject groundGrid
// @input SceneObject trackingTarget
// @input bool allowManipulate = true
// @input Asset.Material touchMaterial
// @input Asset.Material occluderMaterial
// @ui {"widget":"group_end"}

var isCameraInside = false;
var gyroFallbackPosition;
var portalEnterCallback;
var portalExitCallback;
var hasPortalCorners = false;
var hiding = false;
var deviceTrackingComponent;

function initScene() {
    global.touchSystem.enableTouchBlockingException("TouchTypeDoubleTap", true);

    if (script.touchMaterial) {
        script.touchMaterial.getPass(0).baseColor = new vec4(0, 0, 0, 0);
    }

    if (script.portalCornerMin) {
        script.portalCornerMin.enabled = false;
    } else {
        print("Missing PortalCornerMin SceneObject. Please refer to Lens Studio Documentation.");
    }

    if (script.portalCornerMax) {
        script.portalCornerMax.enabled = false;
    } else {
        print("Missing PortalCornerMax SceneObject. Please refer to Lens Studio Documentation.");
    }

    hasPortalCorners = (script.portalCornerMin && script.portalCornerMax);
}

function initEvents() {
    // Update Event
    var updateEvent = script.createEvent("UpdateEvent");
    updateEvent.bind(onUpdate);

    // World Tracking Reset Event
    var worldTrackingResetEvent = script.createEvent("WorldTrackingResetEvent");
    worldTrackingResetEvent.bind(onWorldTrackingReset);

    // Front Camera Event
    var cameraFrontEvent = script.createEvent("CameraFrontEvent");
    cameraFrontEvent.bind(onCameraFront);

    // Back Camera Event
    var cameraBackEvent = script.createEvent("CameraBackEvent");
    cameraBackEvent.bind(onCameraBack);
}

function initTracking() {
    global.gyroFallback = false;


    initSurfaceTracking();

    if (script.manipulateComponent) {
        script.manipulateComponent.enabled = script.allowManipulate;
    }
}

function initBounds() {
    if (script.portalOccluderMesh) {
        if (script.occluderMaterial) {
            script.portalOccluderMesh.mainMaterial = script.occluderMaterial;
        }
    }
}

function onUpdate(eventData) {
    if (global.scene.getCameraType() == "back") {
        if (script.camera) {
            var cameraPosition = script.camera.getTransform().getWorldPosition();

            if (isPointInPortal(cameraPosition)) {
                if (!isCameraInside) {
                    onPortalEnter();
                }
            } else {
                if (isCameraInside) {
                    onPortalExit();
                }
            }
        }
    }
}

function onWorldTrackingReset(eventData) {
    script.manipulateComponent.getSceneObject().getTransform().setLocalPosition(new vec3(0, 0, 0));
    script.manipulateComponent.getSceneObject().getTransform().setLocalRotation(quat.quatIdentity());
}

function onCameraFront(eventData) {
    script.portalObject.enabled = false;

    script.manipulateComponent.enabled = false;

    if (script.groundGrid) {
        script.groundGrid.enabled = false;
    }

    if (isCameraInside) {
        onPortalExit();
    }
}

function onCameraBack(eventData) {
    if (!hiding) {
        script.portalObject.enabled = true;
    }

    if (script.allowManipulate && script.manipulateComponent) {
        script.manipulateComponent.enabled = true;
    }

    if (script.groundGrid) {
        script.groundGrid.enabled = true;
    }
}

function onPortalEnter() {
    isCameraInside = true;

    if (portalEnterCallback) {
        portalEnterCallback();
    }

    global.touchSystem.touchBlocking = true;

    if (script.allowManipulate && script.manipulateComponent) {
        script.manipulateComponent.enabled = false;
    }
}

function onPortalExit() {
    isCameraInside = false;

    if (portalExitCallback) {
        portalExitCallback();
    }

    global.touchSystem.touchBlocking = false;

    if (script.allowManipulate && script.manipulateComponent) {
        script.manipulateComponent.enabled = true;
    }
}

function initSurfaceTracking() {
    deviceTrackingComponent.requestDeviceTrackingMode(DeviceTrackingMode.Surface);
    deviceTrackingComponent.surfaceOptions.enhanceWithNativeAR = true;

    if (script.trackingTarget) {
        deviceTrackingComponent.surfaceTrackingTarget = script.trackingTarget;
    }

    if (safeSupportsNativeTracking()) {
        hidePortal(1.0);
    } else {
        if (script.useGyroFallback) {
            gyroFallbackPosition = script.gyroFallbackPositionSurface;
            enableGyroFallback();
        }
    }
}

function hidePortal(hideTime) {
    hiding = true;

    if (script.portalObject) {
        script.portalObject.enabled = false;
    }

    var hideTimer = script.createEvent("DelayedCallbackEvent");
    hideTimer.bind(onHideTimerDone);
    hideTimer.reset(hideTime);
}

function onHideTimerDone() {
    hiding = false;

    if (script.portalObject) {
        if (global.scene.getCameraType() == "back") {
            script.portalObject.enabled = true;
        }
    }
}

function enableGyroFallback() {

    deviceTrackingComponent.requestDeviceTrackingMode(DeviceTrackingMode.Surface);

    // Set camera to gyro fall back position
    if (gyroFallbackPosition) {
        script.camera.getTransform().setWorldPosition(gyroFallbackPosition.getTransform().getWorldPosition());
        script.camera.getTransform().setWorldRotation(gyroFallbackPosition.getTransform().getWorldRotation());
    }

    script.manipulateComponent.enabled = false;
    script.groundGrid.enabled = false;
}

// Helpers

function safeSupportsNativeTracking() {
    if (deviceTrackingComponent === null) {
        print("Missing device tracking component.");
        return false;
    }

    var supported = deviceTrackingComponent.isDeviceTrackingModeSupported(DeviceTrackingMode.World);

    return supported;
}

function isPointInPortal(point) {
    if (!hasPortalCorners || !script.camera || !script.portalObject) {
        return false;
    }

    var box =
    {
        min: script.portalCornerMin.getTransform().getLocalPosition(),
        max: script.portalCornerMax.getTransform().getLocalPosition()
    };

    var pointTransformed = script.portalObject.getTransform().getInvertedWorldTransform().multiplyPoint(point);

    var inBounds =
    (
        ((pointTransformed.x >= box.min.x) && (pointTransformed.y >= box.min.y) && (pointTransformed.z >= box.min.z)) &&
        ((pointTransformed.x <= box.max.x) && (pointTransformed.y <= box.max.y) && (pointTransformed.z <= box.max.z))
    );

    return inBounds;
}

init();

function init() {
    if (!script.camera || !script.camera.getComponent("Component.DeviceTracking")){
        print("Portal Controller Error: Please add a camera with device tracking component as an input")
        return;
    } else {
        deviceTrackingComponent = script.camera.getComponent("Component.DeviceTracking");
        farClippingPlane = script.camera.getComponent("Component.Camera").far;
        if (farClippingPlane < 10000){
            script.camera.getComponent("Component.Camera").far = 10000;
        }
    }
    initScene();
    initEvents();
    initTracking();
    initBounds();
}

script.setPortalEnterCallback = function(callback) {
    portalEnterCallback = callback;
};

script.setPortalExitCallback = function(callback) {
    portalExitCallback = callback;
};

script.isCameraInPortal = function() {
    return isCameraInside;
};
