class Utils {
    // Helper method to get the ground point under the camera
    getGroundPoint(scene, camera) {
        var ray = camera.getForwardRay();
        var pickInfo = scene.pickWithRay(ray, (mesh) => { return mesh.isPickable && mesh.isEnabled(); });
        if (pickInfo.hit) {
            return pickInfo.pickedPoint;
        }
        return null;
    }
}
