export class PointerMesh {
    public mesh: THREE.Object3D<THREE.Object3DEventMap>;
    public hover: boolean;
    public onEnter: () => void;
    public onLeave: () => void;
    public onClick: () => void;
    public static meshes: PointerMesh[] = [];
    constructor(f: THREE.Object3D<THREE.Object3DEventMap>) {
        this.mesh = f;
        this.hover = false;
        this.onEnter = this.onLeave = this.onClick = () => {};
        PointerMesh.meshes.push(this);
    }

    public setHover(newHover: boolean) {
        if (newHover != this.hover) {
            if (newHover) {
                // Enter
                this.onEnter();
            } else {
                // Leave
                this.onLeave();
            }
        }
        this.hover = newHover;
    }
    public destroy() {
        PointerMesh.meshes = PointerMesh.meshes.filter((v) => v.mesh.id !== this.mesh.id);
    }

    public onEnterLeave(onenter: () => void, onleave: () => void) {
        (this.onEnter = onenter), (this.onLeave = onleave);
    }
}
