// VillagerScript
// --------------
// Makes pr_villager ambient LIFE: it ambles around its home on a short
// leash (GravityBody, dt-based), and when the player comes close it stops,
// faces them, and shows a TALK BUBBLE with its next line -- cycling through
// its mood's lines on each fresh approach. Every greet edge-fires `talked`,
// so "talk to N villagers" quests are stock wiring (l_quest counts distinct
// sources). The `say` input forces the bubble from afar for cinematics.
// Recruits own dialog TREES; villagers are non-blocking color + quest hooks.
class VillagerScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        this.paramDefs = [
            { key: 'mood', label: 'Mood', type: 'enum',
              options: ['friendly', 'mysterious', 'grumpy', 'heroic'], default: 'friendly' },
        ];
        this.noAutoParams = true;
        this.eventDefs = [];
        this.inputs = [
            { id: 'say', label: 'Say Line' },
        ];
        this.outputs = [
            { id: 'talked', label: 'Talked To' },
        ];

        this._home = null;
        this._body = null;
        this._legs = null;
        this._bubble = null;
        this._bubbleTex = null;
        this._bubbleTimer = 0;
        this._target = null;
        this._pause = 0;
        this._walkPhase = 0;
        this._near = false;
        this._lineIdx = 0;
        this._wasPlay = null;
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    _lines() {
        switch (this.getParam('mood')) {
        case 'mysterious': return [
            'The stars fell here once…', 'Not every door leads where it opens.',
            'You have the look of a builder.', 'Listen. The pixels hum.'];
        case 'grumpy': return [
            'Hmph. Tourists.', 'Mind the flowerbeds. If I had any.',
            'In MY day the terrain was flat.', 'You again?'];
        case 'heroic': return [
            'Stand tall, friend!', 'I once fought three blobs at dawn!',
            'Adventure waits for no one!', 'To glory! …after lunch.'];
        default: return [
            'Lovely day in the sandbox!', 'Welcome to the neighborhood!',
            'Have you seen the hills? Gorgeous.', 'Say hi to the others for me!'];
        }
    }

    _ensureRig() {
        const inst = this.inst;
        if (!this._body) {
            (inst.getChildMeshes ? inst.getChildMeshes() : [])
                .forEach((m) => { m.checkCollisions = false; });   // the mount lesson
            this._legs = (inst.getChildMeshes ? inst.getChildMeshes() : [])
                .filter((m) => m.name && m.name.indexOf('vleg') >= 0);
            this._body = new GravityBody(this.app.scene, inst, {
                ellipsoid: new BABYLON.Vector3(0.35, 0.9, 0.35),
                ellipsoidOffset: new BABYLON.Vector3(0, 0.9, 0),
            });
        }
        if (!this._bubble) {
            const plane = BABYLON.MeshBuilder.CreatePlane('villagerBubble' + inst.worldId,
                { width: 2.6, height: 0.7 }, this.app.scene);
            plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
            plane.parent = inst;
            plane.position = new BABYLON.Vector3(0, 2.1, 0);
            plane.isPickable = false;
            const tex = new BABYLON.DynamicTexture('villagerBubbleTex' + inst.worldId,
                { width: 512, height: 138 }, this.app.scene, false);
            const mat = new BABYLON.StandardMaterial('villagerBubbleMat' + inst.worldId, this.app.scene);
            mat.diffuseTexture = tex;
            mat.emissiveColor = new BABYLON.Color3(1, 1, 1);
            mat.disableLighting = true;
            mat.diffuseTexture.hasAlpha = true;
            plane.material = mat;
            plane.isVisible = false;
            this._bubble = plane;
            this._bubbleTex = tex;
        }
    }

    _showLine(text) {
        this._ensureRig();
        const ctx = this._bubbleTex.getContext();
        ctx.clearRect(0, 0, 512, 138);
        ctx.fillStyle = 'rgba(10, 12, 30, 0.85)';
        ctx.fillRect(0, 0, 512, 138);
        ctx.strokeStyle = '#8fe9ff';
        ctx.lineWidth = 6;
        ctx.strokeRect(3, 3, 506, 132);
        this._bubbleTex.drawText(text, null, 88, 'bold 34px sans-serif', '#ffffff', null);
        this._bubble.isVisible = true;
        this._bubbleTimer = 999999;   // stays up while near; timed when forced
    }

    _hideBubble() {
        if (this._bubble) this._bubble.isVisible = false;
    }

    onInput(action) {
        if (action === 'say') {
            const lines = this._lines();
            this._showLine(lines[this._lineIdx % lines.length]);
            this._bubbleTimer = 180;   // forced lines fade on their own
        }
    }

    onPlayReset(mode) {
        if (this._home) this.inst.position.copyFrom(this._home);
        if (this._body) this._body.vy = 0;
        this._hideBubble();
        this._near = false;
        this._lineIdx = 0;
        this._target = null;
    }

    update(isPlayMode, mode) {
        const inst = this.inst;
        if (!isPlayMode) {
            if (this._wasPlay !== false) {
                this._wasPlay = false;
                if (this._home) inst.position.copyFrom(this._home);
                this._hideBubble();
                this._near = false;
            }
            this._home = inst.position.clone();
            inst.restPos = this._home;
            return;
        }
        if (this._wasPlay !== true) {
            this._wasPlay = true;
            if (!this._home) { this._home = inst.position.clone(); inst.restPos = this._home; }
        }
        this._ensureRig();
        const dt = Math.min(0.05, this.app.scene.getEngine().getDeltaTime() / 1000);
        if (this._bubbleTimer < 999999 && this._bubbleTimer > 0 && --this._bubbleTimer === 0) {
            this._hideBubble();
        }

        // Greeting: near player -> stop, face, speak; edges advance lines.
        const player = mode && mode.player;
        let vx = 0, vz = 0, moving = false;
        if (player) {
            const toP = player.position.subtract(inst.position);
            toP.y = 0;
            const d = toP.length();
            if (d < 2.6 && !this._near) {
                this._near = true;
                const lines = this._lines();
                this._showLine(lines[this._lineIdx % lines.length]);
                this._lineIdx++;
                this.app.fireEvent(inst, 'talked');
            } else if (d >= 3.2 && this._near) {
                this._near = false;
                this._hideBubble();
            }
            if (this._near) {
                // Stop and face the player while chatting.
                if (d > 0.3) { inst.rotationQuaternion = null; inst.rotation.y = Math.atan2(toP.x, toP.z); }
                this._body.step(0, 0);
                this._legs.forEach((l) => { l.rotation.x *= 0.8; });
                return;
            }
        }

        // Wander: amble to random spots on a short leash around home.
        if (this._pause > 0) {
            this._pause -= dt;
        } else if (!this._target) {
            const a = Math.random() * Math.PI * 2;
            const r = 1.5 + Math.random() * 3.5;
            this._target = this._home.add(new BABYLON.Vector3(Math.sin(a) * r, 0, Math.cos(a) * r));
        } else {
            const to = this._target.subtract(inst.position);
            to.y = 0;
            const d = to.length();
            if (d < 0.4) {
                this._target = null;
                this._pause = 0.8 + Math.random() * 1.6;
            } else {
                to.scaleInPlace(1 / d);
                vx = to.x * 1.4; vz = to.z * 1.4;
                inst.rotationQuaternion = null;
                inst.rotation.y = Math.atan2(to.x, to.z);
                moving = true;
            }
        }
        this._body.step(vx, vz);
        if (moving) this._walkPhase += 0.2; else this._walkPhase *= 0.8;
        const sw = Math.sin(this._walkPhase) * 0.45;
        if (this._legs.length >= 2) {
            this._legs[0].rotation.x = sw;
            this._legs[1].rotation.x = -sw;
        }
    }
}
