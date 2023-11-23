class Utils {
    // Helper method to get the ground point under the camera
    static getGroundPoint(scene, camera) {
        var ray = camera.getForwardRay();
        var pickInfo = scene.pickWithRay(ray, (mesh) => { return mesh.isPickable && mesh.isEnabled(); });
        if (pickInfo.hit) {
            return pickInfo.pickedPoint;
        }
        return null;
    }

    static rnd(v) {
        return Math.round((v + Number.EPSILON) * 100) / 100;
    }
}
