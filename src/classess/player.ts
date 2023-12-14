import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import * as THREE from "three";
import { clamp } from "../scripts/functions";
import { CardTextureManager } from "./textureManager";
import { CCDIKSolver, IKS } from "three/examples/jsm/animation/CCDIKSolver.js";
import { Font } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
export class Player {
    public cards: THREE.Mesh[];
    public money: number;
    public turnbalance: number;
    public cardsvalues: [number, number];

    constructor() {
        this.cards = [];
        this.cardsvalues = [0, 0];
        this.money = 1000;
        this.turnbalance = 0;
    }
}

function copyPositionWithScale(source: THREE.Object3D, target: THREE.Object3D, offset: THREE.Vector3) {
    const targetVec = source.localToWorld(source.position.clone()).add(offset);
    target.position.copy(targetVec);
}

function copyPositionWithScale2(source: THREE.Object3D, target: THREE.Object3D, offset: THREE.Vector3) {
    const p = source.worldToLocal(target.position.clone().add(offset));
    source.position.copy(p);
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

export class LocalPlayer extends Player {
    public body: THREE.Object3D;
    public cardsValToMesh: Map<number, THREE.Mesh>;
    public update: () => void;

    public iksolver: CCDIKSolver;
    public iks: IKS[];

    constructor(camera: THREE.Camera) {
        super();
        this.update = () => {};
        this.body = SkeletonUtils.clone(OnlinePlayer.playerBody);
        this.cardsValToMesh = new Map();
        this.body.scale.multiplyScalar(0.01);
        this.body.rotateX(Math.PI / 2);
        this.body.rotateY(Math.PI);
        this.body.position.copy(camera.position).add(new THREE.Vector3(0, -0.1, -3));

        this.iks = this.attachHands();

        const skMesh = this.body.children[0] as THREE.SkinnedMesh;
        this.iksolver = new CCDIKSolver(skMesh, this.iks);

        this.update = () => {
            if (this.movHands()) this.iksolver.update();
        };
    }
    add(scene: THREE.Scene) {
        scene.add(this.body);
        return this;
    }

    movHands() {
        const rightHand = findBoneByName(this.body, "mixamorigRightHand");
        const leftHand = findBoneByName(this.body, "mixamorigLeftHand");
        if (rightHand == null || leftHand == null || this.cards.length < 2) {
            return false;
        }
        // Right Hand
        // Copy the position with scale for the right hand
        const offset = new THREE.Vector3(0, -0.32, 0);
        copyPositionWithScale2(rightHand, this.cards[0], offset);

        // Copy the position with scale for the left hand
        copyPositionWithScale2(leftHand, this.cards[1], offset);
        return true;
    }
    attachHands() {
        const skMesh = this.body.children[0] as THREE.SkinnedMesh;

        const obj = BonesOBJID(this.body);
        skMesh.skeleton.bones[obj.mixamorigRightHand].parent = skMesh.skeleton.bones[obj.mixamorigRightForeArm];
        skMesh.skeleton.bones[obj.mixamorigLeftHand].parent = skMesh.skeleton.bones[obj.mixamorigLeftForeArm];
        const rightIKS: IKS = {
            target: obj.mixamorigRightHand,
            effector: obj.mixamorigRightForeArm,
            links: [{ index: obj.mixamorigRightArm }, { index: obj.mixamorigRightShoulder }],
        };
        const leftIKS: IKS = {
            target: obj.mixamorigLeftHand,
            effector: obj.mixamorigLeftForeArm,
            links: [{ index: obj.mixamorigLeftArm }, { index: obj.mixamorigLeftShoulder }],
        };
        console.groupEnd();
        return [rightIKS, leftIKS];
    }
}

export class OnlinePlayer extends Player {
    public body: THREE.Object3D;
    public name: string;
    public static textureManager: CardTextureManager;
    public static playerBody: THREE.Object3D;
    public static font: Font;
    public myturn: boolean;
    public update: (camera: THREE.Camera) => void;
    public fontMesh: THREE.Mesh;
    public order: number;

    public static Best: OnlinePlayer | null = null;
    constructor(name: string, order: number) {
        super();
        this.update = () => {};
        this.order = order;
        this.name = name;
        this.body = SkeletonUtils.clone(OnlinePlayer.playerBody);
        this.body.scale.multiplyScalar(0.013);
        this.body.rotateX(Math.PI / 2);
        this.myturn = false;
        const skMesh = this.body.children[0] as THREE.SkinnedMesh;
        const mat = new THREE.MeshPhongMaterial({ color: 0xffffff, specular: 0x111111, shininess: 5 });
        skMesh.material = mat;
        skMesh.receiveShadow = true;
        skMesh.castShadow = true;
        this.fontMesh = new THREE.Mesh(
            new TextGeometry(name, {
                font: OnlinePlayer.font,
                depth: 0.1,
                size: 5,
                height: 1,
            }),
            mat
        );
        this.cards = [];

        this.update = (camera: THREE.Camera) => {
            this.movHands();
            this.fontMesh.lookAt(camera.position);
            this.fontMesh.rotation.x = Math.PI / 2;
            this.fontMesh.rotation.z = 0;
            // this.fontMesh.rotation.y = Math.atan2(camera.position.x - this.fontMesh.position.x, camera.position.z - this.fontMesh.position.z);
        };
    }
    startCards(scene: THREE.Scene) {
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
        this.cards.push(...[createMesh(), createMesh()]);
        for (const xmesh of this.cards) {
            xmesh.scale.set(2, 2, 2);
            scene.add(xmesh);
        }
    }
    bonesObj() {
        return Object.fromEntries((this.body.children[0] as THREE.SkinnedMesh).skeleton.bones.map((v) => [v.name, v]));
    }
    movHands() {
        const bones = this.bonesObj();

        const rightHand = bones["mixamorigRightHand"];
        const leftHand = bones["mixamorigLeftHand"];
        if (rightHand == null || leftHand == null || this.cards.length < 2) {
            return;
        }

        // Set Rotation Block
        bones["mixamorigLeftForeArm"].rotation.set(0.607, 0.6707, 1.49);
        bones["mixamorigLeftHand"].rotation.set(0.37, 0.3, 0.79);
        bones["mixamorigRightShoulder"].rotation.set(1.6, 0.39, 1.6);
        bones["mixamorigRightArm"].rotation.set(0.48, 6.3, 0);
        bones["mixamorigRightForeArm"].rotation.set(6.283, 5.8, 4.5);
        bones["mixamorigRightHand"].rotation.set(0.86, 0, 5.3);

        // Right Hand
        // Copy the position with scale for the right hand
        this.cardsPos();
    }
    cardsPos() {
        const bones = this.bonesObj();

        const rightHand = bones["mixamorigRightHand"];
        const leftHand = bones["mixamorigLeftHand"];
        if (rightHand == null || leftHand == null || this.cards.length < 2) {
            return;
        }
        const offset = new THREE.Vector3(0, 0, -0.2);
        const vec = new THREE.Vector3(0, 0, 1).applyQuaternion(this.body.quaternion);
        offset.add(vec.multiplyScalar(-0.3));
        copyPositionWithScale(rightHand, this.cards[0], offset);
        copyPositionWithScale(leftHand, this.cards[1], offset);
    }
    add(scene: THREE.Scene) {
        scene.add(this.body);
        scene.add(this.fontMesh);
    }
    position(position: THREE.Vector3, lookAt: THREE.Vector3) {
        const yRotation = Math.atan2(lookAt.x - position.x, lookAt.z - position.z);
        this.body.rotation.y = yRotation;
        this.body.position.copy(position);

        this.cardsPos();
        for (const [index, card] of this.cards.entries()) {
            // card.lookAt(this.body.position.clone().add(this.body.up.clone().multiplyScalar(3)));
            card.rotation.z = (index * 2 - 1) / 10;
            card.rotation.x = Math.PI;
            card.rotation.y = yRotation;
        }
        this.fontMesh.position
            .copy(this.body.position)
            .add(new THREE.Vector3(0, 0, 5.3))
            .add(new THREE.Vector3(-1, 0, 0).applyQuaternion(this.body.quaternion).multiplyScalar(this.name.length / 15));
        this.fontMesh.scale.set(0.04, 0.04, 0.00001);
    }
    handleLook(x: number, y: number) {
        const bone = findBoneByName(this.body, "mixamorigHead");
        if (!bone) {
            throw Error("head bone is null");
        }

        const xRotation = new THREE.Vector2();
        const multiplyer = (0.5 - clamp(y - 0.5, 0, 0.5)) * 2;
        xRotation.y = Math.PI - ((clamp(1 - y, 0.5, 0.75) + 1) / 2) * Math.PI;
        xRotation.x = (x - 0.5) * multiplyer;
        bone.quaternion.setFromEuler(new THREE.Euler(xRotation.y, 0, 0));
        bone.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), xRotation.x);
    }
    dispose(scene: THREE.Scene) {
        for (const xmesh of this.cards) {
            scene.remove(xmesh);
        }
        scene.remove(this.body);
    }
}
