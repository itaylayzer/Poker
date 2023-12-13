import { CardTextureManager } from "./textureManager";
import * as THREE from "three";

export class BoardManager {
    private cards: number[];
    private scene: THREE.Scene;
    private meshes: THREE.Mesh[];
    private textureManager: CardTextureManager;
    private current: number;
    private cardsmeshes: Map<number, THREE.Mesh>;
    constructor(cards: number[], scene: THREE.Scene, textureManager: CardTextureManager) {
        this.scene = scene;
        this.cards = [...cards];
        this.textureManager = textureManager;
        this.meshes = [];
        this.cardsmeshes = new Map();
        this.current = 0;

        for (let i = 0; i < this.cards.length; i++)
            this.createMesh().then((obj) => {
                obj.position.copy(this.getPos(i));
                obj.scale.multiplyScalar(3);
                this.meshes.push(obj);
                scene.add(obj);
            });
    }
    public OpenRound() {
        return new Promise<void>((resolve) => {
            this.cardsmeshes = new Map();
            (async function (obj: BoardManager) {
                while (obj.current < 3) {
                    await obj.Next();
                }
            })(this).then(() => {
                resolve();
            });
        });
    }
    public Next() {
        return new Promise<void>((resolve) => {
            if (this.current === this.cards.length) return;
            const cv = this.cards[this.current];
            this.createMesh(cv).then((obj) => {
                const xmesh = this.meshes.shift() as THREE.Mesh;
                obj.position.copy(xmesh.position);
                obj.scale.multiplyScalar(3);
                this.scene.remove(xmesh);
                this.scene.add(obj);
                this.cardsmeshes.set(cv, obj);
                resolve();
            });
            this.current++;
        });
    }
    private getPos(index: number) {
        return new THREE.Vector3((index - 2) * 1, 0, 0.1);
    }
    private async createMesh(args?: number) {
        const texture = await (args === undefined ? this.textureManager.enemy() : this.textureManager.card(args % 100, Math.floor(args / 100)));
        const material = new THREE.MeshToonMaterial({
            map: texture,
            color: 0xc0c0c0,
        });

        return new THREE.Mesh(new THREE.BoxGeometry(0.58 / 2, 0.78 / 2, 0.0), material);
    }
    public get CurrentMeshes() {
        return this.cardsmeshes;
    }
    public getMeshes(cmpArray: number[]): THREE.Mesh[] {
        // console.log(this.cardsmeshes);
        const arr = Array.from(this.cardsmeshes.keys()).filter((v) => cmpArray.includes(v));
        // console.warn("\tinside get meshes", "arr.length", arr.length, arr);
        return arr.map((v) => {
            return this.cardsmeshes.get(v) as THREE.Mesh;
        });
    }
    public get currentValues() {
        const copy = [...this.cards];
        return copy.splice(0, this.current);
    }
}
