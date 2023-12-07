import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import * as THREE from "three";
import { clamp } from "../scripts/functions";
import { CardTextureManager } from "./textureManager";
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

export function BonesOBJID(object: THREE.Object3D) {
    function iterate(object: THREE.Object3D, obj: { [key: string]: number }) {
        for (const child of object.children) {
            if (child as THREE.Bone) {
                const bone = child as THREE.Bone;
                obj[bone.name] = bone.id;
            }
            iterate(child, obj);
        }
    }

    const obj: { [key: string]: number } = {};
    iterate(object, obj);
    return obj;
}

export class OnlinePlayer extends Player {
    public body: THREE.Object3D;
    public iksolver: CCDIKSolver;

    public static textureManager: CardTextureManager;
    public static playerBody: THREE.Object3D;
    constructor() {
        super();
        this.body = SkeletonUtils.clone(OnlinePlayer.playerBody);
        this.body.scale.multiplyScalar(0.02);
        this.body.rotateX(Math.PI / 2);

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
        // console.warn("got here: a");
        const iks = this.attachHands();
        try {
            this.iksolver = new CCDIKSolver(this.body as THREE.SkinnedMesh, iks);
        } catch (e) {
            console.error(e);
        }
        // console.warn("got here: b");
    }
    movHands() {
        const rightHand = findBoneByName(this.body, "mixamorigRightHand");
        const leftHand = findBoneByName(this.body, "mixamorigLeftHand");
        if (rightHand == null || leftHand == null) {
            // console.log("nulls");
        } else {
            this.cards[0].matrix;
            // rightHand.position.copy();
            const vec = new THREE.Vector3();
            this.cards[0].getWorldPosition(vec);
            leftHand.position.copy(vec);
            leftHand.position.x /= this.body.scale.x;
            leftHand.position.y /= this.body.scale.y;
            leftHand.position.z /= this.body.scale.z;
            // leftHand.position.copy(leftHand.worldToLocal(.clone()));
        }
    }
    attachHands(): IKS[] {
        const rightHand = findBoneByName(this.body, "mixamorigRightHand");
        const leftHand = findBoneByName(this.body, "mixamorigLeftHand");
        if (rightHand == null || leftHand == null) throw Error("nulls");
        // console.warn("got here: aa", rightHand == null || leftHand == null);
        this.movHands();
        // console.warn("got here: ab");
        const obj = BonesOBJID(this.body);
        // console.warn("got here: ac", obj);
        const rightIKS: IKS = {
            target: obj.mixamorigRightHand,
            effector: obj.mixamorigRightForeArm,
            links: [{ index: obj.mixamorigRightShoulder }, { index: obj.mixamorigRightArm }, { index: obj.mixamorigRightForeArm }],
        };
        const leftIKS: IKS = {
            target: obj.mixamorigLeftHand,
            effector: obj.mixamorigLefttForeArm,
            links: [{ index: obj.mixamorigLeftShoulder }, { index: obj.mixamorigLeftArm }, { index: obj.mixamorigLefttForeArm }],
        };
        // console.warn("got here: ad");
        return [leftIKS, rightIKS];
    }
    add(scene: THREE.Scene) {
        for (const xmesh of this.cards) {
            scene.add(xmesh);
        }

        scene.add(this.body);
    }
    position(vec: THREE.Vector3) {
        this.body.position.copy(vec);
        for (const [index, card] of this.cards.entries()) {
            card.position.copy(vec).add(new THREE.Vector3((index * 2 - 1) / 10, -2, 5 + (index * 2 - 1) / 100));
            card.rotateZ((index * 2 - 1) / 10);
            card.rotateX(-0.5);
            card.scale.multiplyScalar(2);
        }
    }
    handleLook(x: number, y: number) {
        const bone = findBoneByName(this.body, "mixamorigHead");
        if (!bone) {
            // console.log("head bone is null", this.body.children);
            throw Error("head bone is null");
        }

        const bodyPos = this.body.position.clone();

        const xRotation = new THREE.Vector2();
        const multiplyer = (0.5 - clamp(y - 0.5, 0, 0.5)) * 2;
        xRotation.y = Math.PI - ((clamp(1 - y, 0.5, 0.75) + 1) / 2) * Math.PI;
        xRotation.x = (x - 0.5) * multiplyer;
        bone.quaternion.setFromEuler(new THREE.Euler(xRotation.y, 0, 0));
        bone.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), xRotation.x);

        for (const [index, card] of this.cards.entries()) {
            card.position
                .copy(bodyPos)
                .add(new THREE.Vector3((index * 2 - 1) / 10, -2, 5 + (index * 2 - 1) / 100))
                .add(new THREE.Vector3(xRotation.x, 0, 0));
        }

        this.movHands();
        this.iksolver.update();
    }
    dispose(scene: THREE.Scene) {
        for (const xmesh of this.cards) {
            scene.remove(xmesh);
        }
        scene.remove(this.body);
    }
}

`
[72]: EndyMesh
player.ts:43 [73]: mixamorigHips
player.ts:43 [74]: mixamorigSpine
player.ts:43 [75]: mixamorigSpine1
player.ts:43 [76]: mixamorigSpine2
player.ts:43 [77]: mixamorigRightShoulder
player.ts:43 [78]: mixamorigRightArm
player.ts:43 [79]: mixamorigRightForeArm
player.ts:43 [80]: mixamorigRightHand
player.ts:43 [81]: mixamorigRightHandThumb1
player.ts:43 [82]: mixamorigRightHandThumb2
player.ts:43 [83]: mixamorigRightHandThumb3
player.ts:43 [84]: mixamorigRightHandThumb4
player.ts:43 [85]: mixamorigRightHandIndex1
player.ts:43 [86]: mixamorigRightHandIndex2
player.ts:43 [87]: mixamorigRightHandIndex3
player.ts:43 [88]: mixamorigRightHandIndex4
player.ts:43 [89]: mixamorigRightHandMiddle1
player.ts:43 [90]: mixamorigRightHandMiddle2
player.ts:43 [91]: mixamorigRightHandMiddle3
player.ts:43 [92]: mixamorigRightHandMiddle4
player.ts:43 [93]: mixamorigNeck
player.ts:43 [94]: mixamorigHead
player.ts:43 [95]: mixamorigHeadTop_End
player.ts:43 [96]: mixamorigLeftShoulder
player.ts:43 [97]: mixamorigLeftArm
player.ts:43 [98]: mixamorigLeftForeArm
player.ts:43 [99]: mixamorigLeftHand
player.ts:43 [100]: mixamorigLeftHandIndex1
player.ts:43 [101]: mixamorigLeftHandIndex2
player.ts:43 [102]: mixamorigLeftHandIndex3
player.ts:43 [103]: mixamorigLeftHandIndex4
player.ts:43 [104]: mixamorigLeftHandMiddle1
player.ts:43 [105]: mixamorigLeftHandMiddle2
player.ts:43 [106]: mixamorigLeftHandMiddle3
player.ts:43 [107]: mixamorigLeftHandMiddle4
player.ts:43 [108]: mixamorigLeftHandThumb1
player.ts:43 [109]: mixamorigLeftHandThumb2
player.ts:43 [110]: mixamorigLeftHandThumb3
player.ts:43 [111]: mixamorigLeftHandThumb4
player.ts:43 [112]: mixamorigLeftUpLeg
player.ts:43 [113]: mixamorigLeftLeg
player.ts:43 [114]: mixamorigLeftFoot
player.ts:43 [115]: mixamorigLeftToeBase
player.ts:43 [116]: mixamorigLeftToe_End
player.ts:43 [117]: mixamorigRightUpLeg
player.ts:43 [118]: mixamorigRightLeg
player.ts:43 [119]: mixamorigRightFoot
player.ts:43 [120]: mixamorigRightToeBase
player.ts:43 [121]: mixamorigRightToe_End`;
