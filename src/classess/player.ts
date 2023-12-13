import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import * as THREE from "three";
import { clamp } from "../scripts/functions";
import { CardTextureManager } from "./textureManager";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { CCDIKSolver, IKS } from "three/examples/jsm/animation/CCDIKSolver.js";

export class Player {
    public cards: THREE.Mesh[];
    public money: number;
    public cardsvalues: [number, number];

    constructor() {
        this.cards = [];
        this.cardsvalues = [0, 0];
        this.money = 1000;
    }
}
export class LocalPlayer extends Player {
    public cardsValToMesh: Map<number, THREE.Mesh>;
    constructor() {
        super();
        this.cardsValToMesh = new Map();
    }
}

function copyPositionWithScale(source: THREE.Object3D, target: THREE.Object3D) {
    const targetVec = source.worldToLocal(target.position.clone());
    source.position.copy(targetVec);
}

export function findBoneByName(object: THREE.Object3D, boneName: string): THREE.Bone | null {
    if (object instanceof THREE.Bone) {
        if (object.name === boneName) {
            return object as THREE.Bone;
        }
    }

    for (const child of object.children) {
        const foundBone = findBoneByName(child, boneName);
        if (foundBone) {
            return foundBone;
        }
    }

    return null;
}

export function BonesOBJID(object: THREE.Object3D): { [key: string]: number } {
    const skMesh = object.children[0] as THREE.SkinnedMesh;
    const bones = skMesh.skeleton.bones;

    return Object.fromEntries(bones.map((v, i) => [v.name, i]));
}

export class OnlinePlayer extends Player {
    public body: THREE.Object3D;
    public name: string;
    public iksolver: CCDIKSolver;
    public iks: IKS[];
    public tcontrols: TransformControls;
    public static textureManager: CardTextureManager;
    public static playerBody: THREE.Object3D;
    public myturn: boolean;
    public update: () => void;
    public static Best: OnlinePlayer | null = null;
    constructor(name: string, tcontrols: TransformControls) {
        super();
        if (OnlinePlayer.Best === null) {
            OnlinePlayer.Best = this;
            globalThis.Best = OnlinePlayer.Best;
            globalThis.Vector3 = THREE.Vector3;
        }
        this.update = () => {};
        this.tcontrols = tcontrols;
        this;
        this.name = name;
        this.body = SkeletonUtils.clone(OnlinePlayer.playerBody);
        this.body.scale.multiplyScalar(0.013);
        this.body.rotateX(Math.PI / 2);
        this.myturn = false;
        function createMesh() {
            const texture = OnlinePlayer.textureManager.enemy();
            const material = new THREE.MeshPhongMaterial({
                color: 0xffffff,
                specular: 0x111111,
                shininess: 10,
                map: texture,
                clipShadows: true,
            });
            return new THREE.Mesh(new THREE.BoxGeometry(0.58 / 2, 0.78 / 2, 0.0), material);
        }

        this.cards = [createMesh(), createMesh()];

        this.iks = this.attachHands();
        // console.log(this.body);
        console.group("CCDIK");

        const skMesh = this.body.children[0] as THREE.SkinnedMesh;
        // console.log(this.iks);
        this.iksolver = new CCDIKSolver(skMesh, this.iks);
        // try {
        //     this.ccdikhelper = this.iksolver.createHelper();
        // } catch (er) {
        //     console.error("ccdikhelper", er);
        // }

        console.groupEnd();
        this.update = () => {
            this.movHands(); // for creation of new Bone
            for (const ik of this.iks) this.iksolver.updateOne(ik);
        };
    }
    movHands() {
        const rightHand = findBoneByName(this.body, "mixamorigRightHand");
        const leftHand = findBoneByName(this.body, "mixamorigLeftHand");
        if (rightHand == null || leftHand == null) {
            console.log("Hands not found");
            return;
        }
        // Right Hand
        // Copy the position with scale for the right hand
        copyPositionWithScale(rightHand, this.cards[0]);

        // Copy the position with scale for the left hand
        copyPositionWithScale(leftHand, this.cards[1]);
    }
    attachHands(): IKS[] {
        const skMesh = this.body.children[0] as THREE.SkinnedMesh;
        console.group("IKS");
        // console.log("model", this.body);

        const obj = BonesOBJID(this.body);
        // console.log("obj", obj);
        skMesh.skeleton.bones[obj.mixamorigRightHand].parent = skMesh.skeleton.bones[obj.mixamorigRightForeArm];
        skMesh.skeleton.bones[obj.mixamorigLeftHand].parent = skMesh.skeleton.bones[obj.mixamorigLeftForeArm];
        // console.log(this.body.children);
        const rightIKS: IKS = {
            target: obj.mixamorigRightHand,
            effector: obj.mixamorigRightForeArm,
            links: [{ index: obj.mixamorigRightArm }, { index: obj.mixamorigRightShoulder }],
        };
        // console.log("rightIKS", rightIKS);
        const leftIKS: IKS = {
            target: obj.mixamorigLeftHand,
            effector: obj.mixamorigLeftForeArm,
            links: [{ index: obj.mixamorigLeftArm }, { index: obj.mixamorigLeftShoulder }],
        };
        // console.log("leftIKS", leftIKS);
        console.groupEnd();
        return [rightIKS, leftIKS];
    }
    add(scene: THREE.Scene) {
        for (const xmesh of this.cards) {
            scene.add(xmesh);
        }

        if (this.body as THREE.Mesh) {
            // console.log("yes");
        } else console.log(this.body);
        scene.add(this.body);
    }
    private cardsNewPos(index: number): THREE.Vector3 {
        const vec = new THREE.Vector3();
        vec.copy(this.body.position);
        vec.z = -vec.z;
        const addonVec = new THREE.Vector3((index * 2 - 1) / 10, 0 + (index * 2 - 1) / 100, 1);
        addonVec.applyQuaternion(this.body.quaternion);
        vec.add(addonVec);
        return vec.clone();
    }
    position(position: THREE.Vector3, lookAt: THREE.Vector3) {
        const yRotation = Math.atan2(lookAt.x - position.x, lookAt.z - position.z);
        this.body.rotation.y = yRotation;
        this.body.position.copy(position);

        for (const [index, card] of this.cards.entries()) {
            card.position.copy(this.cardsNewPos(index));

            card.lookAt(this.body.position.clone().add(new THREE.Vector3(0, 0, 4)));
            card.rotation.z = (index * 2 - 1) / 10;
            card.scale.set(1, 1, 1);
        }
    }
    handleLook(x: number, y: number) {
        const bone = findBoneByName(this.body, "mixamorigHead");
        if (!bone) {
            console.log("head bone is null", this.body.children);
            throw Error("head bone is null");
        }

        const xRotation = new THREE.Vector2();
        const multiplyer = (0.5 - clamp(y - 0.5, 0, 0.5)) * 2;
        xRotation.y = Math.PI - ((clamp(1 - y, 0.5, 0.75) + 1) / 2) * Math.PI;
        xRotation.x = (x - 0.5) * multiplyer;
        bone.quaternion.setFromEuler(new THREE.Euler(xRotation.y, 0, 0));
        bone.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), xRotation.x);

        for (const [index, card] of this.cards.entries()) {
            card.position
                .copy(this.cardsNewPos(index))
                // .add(new THREE.Vector3((index * 2 - 1) / 10, -2, 5 + (index * 2 - 1) / 100))
                .add(new THREE.Vector3(xRotation.x, 0, 0).applyQuaternion(this.body.quaternion));
        }
    }
    dispose(scene: THREE.Scene) {
        for (const xmesh of this.cards) {
            scene.remove(xmesh);
        }
        scene.remove(this.body);
    }
}
