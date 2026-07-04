// GravityBody
// -----------
// A small, reusable gravity + ground-collision stepper. It applies the same
// kind of gravity the player uses (Babylon ellipsoid collisions moved with
// `moveWithCollisions`, 9.8 m/s^2, delta-time based) so any mesh — the player
// avatar or an AI enemy — falls, lands on and slides along the world terrain
// identically. This factors that behaviour out of the player's character
// controller so enemies can share it.
class GravityBody {
    constructor(scene, mesh, opts) {
        opts = opts || {};
        this.scene = scene;
        this.mesh = mesh;
        this.gravity = (opts.gravity != null) ? opts.gravity : 9.8;    // m/s^2 (matches the player)
        this.terminal = (opts.terminal != null) ? opts.terminal : 30;  // m/s fall cap
        this.vy = 0;
        this.grounded = false;

        // Collision ellipsoid, exactly like the player: origin at the feet,
        // ellipsoid centred one unit up.
        mesh.ellipsoid = opts.ellipsoid || new BABYLON.Vector3(0.5, 1, 0.5);
        mesh.ellipsoidOffset = opts.ellipsoidOffset || new BABYLON.Vector3(0, 1, 0);
        mesh.checkCollisions = true;
    }

    // Advance one frame: `vx`/`vz` are the desired horizontal velocity in
    // units/second; gravity supplies the vertical component. Returns whether the
    // body is standing on ground this frame.
    step(vx, vz) {
        const dt = Math.min(0.05, this.scene.getEngine().getDeltaTime() / 1000);
        this.vy -= this.gravity * dt;
        if (this.vy < -this.terminal) this.vy = -this.terminal;

        const beforeY = this.mesh.position.y;
        const intendedDy = this.vy * dt;
        this.mesh.moveWithCollisions(new BABYLON.Vector3(vx * dt, intendedDy, vz * dt));

        // If we meant to fall but were stopped short, we've landed.
        const actualDy = this.mesh.position.y - beforeY;
        if (this.vy <= 0 && actualDy > intendedDy + 1e-4) {
            this.grounded = true;
            this.vy = 0;
        } else if (this.vy > 0 || intendedDy < -0.015 * this.mesh.ellipsoid.y) {
            // Only a conclusive move may clear the flag. Babylon's collision
            // response parks a resting body ~0.01 * ellipsoid.y above the
            // surface (CollisionsEpsilon * 10), so at high frame rates the
            // first micro-fall after vy resets is smaller than that hover gap,
            // touches nothing, and proves nothing about the ground below.
            this.grounded = false;
        }
        return this.grounded;
    }

    jump(speed) {
        if (this.grounded) {
            this.vy = speed;
            this.grounded = false;
        }
    }
}
