// RecruitScript
// -------------
// Makes pr_recruit a hireable NPC post: walking up opens that companion's
// DIALOG TREE (App.recruitTree via the digit-driven menu system -- keyboard,
// pad, and tests all work for free). The `who` param picks the companion.
// Hired companions live on the PROGRESSION SLOT (iis_companions) and follow
// the player as ground-walking rigs (PlayMode.updateCompanions).
class RecruitScript {
    constructor(app, wo, inst) {
        this.app = app;
        this.wo = wo;
        this.inst = inst;

        this.paramDefs = [
            { key: 'who', label: 'Companion', type: 'enum',
              options: ['fern', 'rusty', 'lumen'], default: 'fern' },
        ];
        this.noAutoParams = true;
        this.eventDefs = [];
        this.inputs = [];
        this.outputs = [
            { id: 'hired', label: 'Companion Hired' },
        ];

        this._near = false;
        this._cool = 0;
        this._wasHired = null;
    }

    getParam(key) {
        if (this.inst.params && this.inst.params[key] != null) return this.inst.params[key];
        const def = this.paramDefs.find((d) => d.key === key);
        return def ? def.default : null;
    }

    update(isPlayMode, mode) {
        const inst = this.inst;
        // Gentle beckoning bob so recruits read as people, not posts.
        inst.rotation.y += 0.005;
        if (!isPlayMode) { this._near = false; this._cool = 0; return; }
        if (this._cool > 0) this._cool--;

        const comp = this.app.companionById(this.getParam('who'));
        if (!comp) return;

        // Fire the wired `hired` edge when OUR companion joins the roster.
        const hired = this.app.companionHired(comp.id);
        if (this._wasHired === false && hired) this.app.fireEvent(inst, 'hired');
        this._wasHired = hired;

        const player = mode && mode.player;
        if (!player || mode.driving || mode.grinding) return;
        const d = BABYLON.Vector3.Distance(player.position, inst.position);
        if (d < 2.4 && !this._near) {
            this._near = true;
            // Only open over the HUD -- never stomp another menu or dialog.
            if (this.app.menu.state === 0 && this._cool <= 0) {
                this.app.openDialog(this.app.recruitTree(comp));
                this._cool = 40;
            }
        } else if (d >= 2.4) {
            this._near = false;
        }
    }
}
