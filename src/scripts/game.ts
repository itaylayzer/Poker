import { PointerMesh } from "../classess/pointerMesh";
import { loadedAssets, loadedURLS } from "./assetLoader";
import * as THREE from "three";
// Shaders For Outline
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutlinePass } from "three/addons/postprocessing/OutlinePass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { FXAAShader } from "three/addons/shaders/FXAAShader.js";
import { CardTextureManager } from "../classess/textureManager";
import { Socket } from "../classess/socket.io";
import { GUI } from "dat.gui";
import { BoardManager } from "../classess/boardManager";
import { LocalPlayer, OnlinePlayer } from "../classess/player";
import { toast } from "react-toastify";
import { clamp } from "./functions";
import CardsAPI from "./cards";

export const urls: loadedURLS = {
    green: "textures/green500x500.png",
    gray: "textures/bricks500x500x2.png",
    google: "textures/google.png",
    skeleton: "fbx/endy-rigged.fbx",
};
export type CustomLight = {
    color: THREE.ColorRepresentation;
    intensity: number;
    pos?: THREE.Vector3;
    rot?: THREE.Euler;
    type: "point" | "directional" | "ambient";
};
export type ActionList = { [key: string]: () => void };

export default function ({
    assets,
    socket,
    server,
    react,
}: {
    assets: loadedAssets;
    socket: Socket;
    server: ActionList | undefined;
    react: {
        SetAction: React.Dispatch<ActionList | undefined>;
    };
}) {
    const container = document.querySelector("div.gameContainer") as HTMLDivElement;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog("#115f13", 0, 40);
    scene.background = new THREE.Color("#115f13");

    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 10000);
    camera.position.set(0, -3.5, 3);
    camera.rotation.x = 1;
    const cameraStartedQuaternion = new THREE.Quaternion().copy(camera.quaternion);
    const cardTextures = new CardTextureManager(assets.textures.google);

    let composer: EffectComposer, effectFXAA: ShaderPass, outlinePass: OutlinePass, boardManager: BoardManager;
    const localPlayer = new LocalPlayer();
    const raycaster = new THREE.Raycaster();
    const clients = new Map<string, OnlinePlayer>();
    // const raycaster = new THREE.Raycaster();

    OnlinePlayer.playerBody = assets.fbx.skeleton;
    OnlinePlayer.textureManager = cardTextures;

    const camRotation = new THREE.Vector2(0, 1);
    const updates: (() => void)[] = [];
    const ActionSets = {
        default: {
            Call: () => {
                socket.emit("act", true);
            },
            Raise: () => {
                socket.emit("act", 50);
            },
            Fold: () => {
                socket.emit("act", false);
            },
        },
    };
    function _createGround() {
        var texture = assets.textures["green"];
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.offset.set(0, 0);
        // texture.repeat.set(200, 200);
        texture.repeat.set(100, 100);

        var material = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            specular: 0x111111,
            shininess: 10,
            map: texture,
            clipShadows: true,
        });

        const groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), material);
        scene.add(groundMesh);
    }
    function _createLights() {
        (function (c: CustomLight[]) {
            for (const x of c) {
                let l;
                if (x.type === "directional") {
                    l = new THREE.DirectionalLight(x.color, x.intensity);
                } else if (x.type === "point") {
                    l = new THREE.PointLight(x.color, x.intensity);
                } else {
                    l = new THREE.AmbientLight(x.color, x.intensity);
                }

                if (x.pos) {
                    l.position.copy(x.pos);
                } else {
                    l.position.set(0, 10, 0);
                }
                if (x.rot) {
                    l.rotation.copy(x.rot);
                }
                if (l.shadow) {
                    l.castShadow = true;
                    l.shadow.mapSize.width = 1024;
                    l.shadow.mapSize.height = 1024;

                    l.shadow.camera.near = 500;
                    l.shadow.camera.far = 4000;
                }

                scene.add(l);
            }
        })([
            {
                color: 0xffffff,
                intensity: 2,
                type: "directional",
                rot: new THREE.Euler(0.1, 0.1, 0),
            },
            {
                color: 0xffffff,
                intensity: 1,
                type: "ambient",
                rot: new THREE.Euler(0.9, 0.5, 0),
            },
        ]);
    }
    function _documentEvents() {
        window.onmousemove = (event) => {
            const mousePrecent = {
                x: event.clientX / window.innerWidth,
                y: event.clientY / window.innerHeight,
            };

            if (socket) {
                socket.emit("mse", mousePrecent);
            }

            const multiplyer = (0.5 - clamp(mousePrecent.y - 0.5, 0, 0.5)) * 2;
            camRotation.y = Math.PI - ((clamp(mousePrecent.y, 0.5, 0.75) + 0.75) / 2) * Math.PI;
            camRotation.x = (0.5 - mousePrecent.x) * multiplyer;

            const mouse = new THREE.Vector2((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
            raycaster.setFromCamera(mouse, camera);
            raycaster.far = 10000000;
            raycaster.near = 0.01;

            const EOD = -1;
            let minIndex = EOD;
            let minDistance = 10000000;
            for (const xplayer of PointerMesh.meshes.entries()) {
                const intersects = raycaster.intersectObject(xplayer[1].mesh);
                if (intersects.length > 0) {
                    const sortedIntersects = intersects.sort((a, b) => a.distance - b.distance);
                    if (minDistance > sortedIntersects[0].distance) {
                        minIndex = xplayer[0];
                    }
                }
            }
            PointerMesh.meshes
                // @ts-ignore
                .filter((v, i) => i !== minIndex)
                .forEach((element) => {
                    element.setHover(false);
                });
            if (minIndex !== EOD) {
                PointerMesh.meshes[minIndex].setHover(true);
            }

            // outlinePass.selectedObjects = Array.from(PointerMesh.meshes.values())
            //     .filter((v) => v.hover)
            //     .map((v) => v.mesh);
        };
        function onWindowResize() {
            const width = window.innerWidth;
            const height = window.innerHeight;

            camera.aspect = width / height;
            camera.updateProjectionMatrix();

            renderer.setSize(width, height);
            composer.setSize(width, height);

            effectFXAA.uniforms["resolution"].value.set(1 / window.innerWidth, 1 / window.innerHeight);
        }
        window.addEventListener("resize", onWindowResize);
    }

    async function _userCards(c1: number, c2: number) {
        scene.remove(...localPlayer.cards);

        return new Promise<() => void>((resolve) => {
            // document.body.innerHTML = "";
            const f2 = cardTextures.card(c1 % 100, Math.floor(c1 / 100));
            const f1 = cardTextures.card(c2 % 100, Math.floor(c2 / 100));

            Promise.all([f1, f2])
                .then((v) => {
                    const material1 = new THREE.MeshPhongMaterial({
                        color: 0xffffff,
                        specular: 0x111111,
                        shininess: 10,
                        map: v[0],
                        clipShadows: true,
                    });
                    const material2 = new THREE.MeshPhongMaterial({
                        color: 0xffffff,
                        specular: 0x111111,
                        shininess: 10,
                        map: v[1],
                        clipShadows: true,
                    });
                    const sprite = new THREE.Mesh(new THREE.BoxGeometry(0.58 / 2, 0.78 / 2, 0.0), material1);
                    const spriteA = new THREE.Mesh(new THREE.BoxGeometry(0.58 / 2, 0.78 / 2, 0.0), material2);
                    const behind1 = new THREE.Vector3()
                        .copy(camera.position)
                        .add(new THREE.Vector3(0.1, -0.5, -1).applyQuaternion(cameraStartedQuaternion));
                    const behind2 = new THREE.Vector3()
                        .copy(camera.position)
                        .add(new THREE.Vector3(-0.1, -0.5, -1.02).applyQuaternion(cameraStartedQuaternion));

                    const after1 = new THREE.Vector3()
                        .copy(camera.position)
                        .add(new THREE.Vector3(0.1, -0.475, -0.95).applyQuaternion(cameraStartedQuaternion));
                    const after2 = new THREE.Vector3()
                        .copy(camera.position)
                        .add(new THREE.Vector3(-0.1, -0.475, -0.95).applyQuaternion(cameraStartedQuaternion));

                    const spriteAPos = new THREE.Vector3().copy(behind1);
                    const spriteBPos = new THREE.Vector3().copy(behind2);
                    sprite.position.copy(spriteAPos);
                    spriteA.position.copy(spriteBPos);

                    scene.add(sprite, spriteA);

                    sprite.rotation.x = spriteA.rotation.x = 1;
                    sprite.rotation.z = -0.1;
                    spriteA.rotation.z = 0.1;
                    localPlayer.cards.push(spriteA, sprite);
                    localPlayer.cardsValToMesh.set(c1, spriteA);
                    localPlayer.cardsValToMesh.set(c2, sprite);
                    new PointerMesh(sprite).onEnterLeave(
                        () => {
                            spriteAPos.copy(after1);
                        },
                        () => {
                            spriteAPos.copy(behind1);
                        }
                    );
                    new PointerMesh(spriteA).onEnterLeave(
                        () => {
                            spriteBPos.copy(after2);
                        },
                        () => {
                            spriteBPos.copy(behind2);
                        }
                    );

                    resolve(() => {
                        sprite.lookAt(camera.position);
                        spriteA.lookAt(camera.position);
                        sprite.rotation.z = -0.1;
                        spriteA.rotation.z = 0.1;

                        sprite.position.lerp(spriteAPos, 0.1);
                        spriteA.position.lerp(spriteBPos, 0.1);
                    });
                })
                .catch((r) => {
                    alert(r);
                });
        });
    }
    function _postProcessing() {
        composer = new EffectComposer(renderer);

        const renderPass = new RenderPass(scene, camera);
        composer.addPass(renderPass);

        outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera);

        outlinePass.edgeStrength = 5.0;
        outlinePass.edgeGlow = 0;
        outlinePass.edgeThickness = 1;
        outlinePass.pulsePeriod = 1;
        outlinePass.visibleEdgeColor = new THREE.Color("ffffff");
        outlinePass.hiddenEdgeColor = new THREE.Color("190a05");

        composer.addPass(outlinePass);

        const outputPass = new OutputPass();
        composer.addPass(outputPass);

        effectFXAA = new ShaderPass(FXAAShader);
        effectFXAA.uniforms["resolution"].value.set(1 / window.innerWidth, 1 / window.innerHeight);
        composer.addPass(effectFXAA);

        return () => {
            composer.render();
        };
    }

    function _socketInitiate() {
        function goldenCards() {
            console.log("\n===========\ngolden cards");
            const allCards = [...boardManager.currentValues, ...localPlayer.cardsvalues];
            console.log("\tcards", allCards);
            const stateResult = CardsAPI.state(allCards);
            console.log("\tstate result cards", stateResult.stateId, stateResult.cards);
            const playerMeshes = Array.from(localPlayer.cardsValToMesh.keys())
                .filter((val) => stateResult.cards.includes(val))
                .map((v) => {
                    const xmesh = localPlayer.cardsValToMesh.get(v) as THREE.Mesh;
                    return xmesh;
                });
            const boardMeshes = boardManager.getMeshes(stateResult.cards);
            const meshes = playerMeshes.concat(boardMeshes).filter((v) => v !== undefined);
            console.log("\tall", meshes, "board", boardMeshes, "player", playerMeshes);
            outlinePass.selectedObjects = meshes;
        }

        socket.on("i", (args: { op: string[] }) => {
            for (const p of args.op) {
                const xonline = new OnlinePlayer();
                clients.set(p, xonline);
                xonline.position(new THREE.Vector3(0, 2.5, -3.5));
                xonline.add(scene);
            }
            react.SetAction({
                Ready: () => {
                    socket.emit("r");
                },
            });
        });
        socket.on("n-p", (args: string) => {
            const xonline = new OnlinePlayer();
            clients.set(args, xonline);
            xonline.position(new THREE.Vector3(0, 2.5, -3.5));
            xonline.add(scene);
        });
        socket.on("st", (args: { b: number[]; c1: number; c2: number }) => {
            console.log("[client]", "args.boardcards", args.b);
            boardManager = new BoardManager(args.b, scene, cardTextures);
            boardManager.OpenRound().then(() => goldenCards());
            localPlayer.cardsvalues = [args.c1, args.c2];

            _userCards(args.c1, args.c2).then((v) => {
                updates.push(v);
            });
        });
        socket.on("nxt", () => {
            boardManager.Next().then(() => {
                goldenCards();
            });
        });
        socket.on("act", () => {
            react.SetAction(ActionSets.default);
        });
        socket.on(
            "win",
            (args: {
                scores: {
                    [key: string]: number;
                };
                money: number;
            }) => {
                // alert(str);
                const winnerId = Object.keys(args.scores).reduce((a, b) => (args.scores[a] > args.scores[b] ? a : b));
                const clientIsWinner = socket.id === winnerId;
                toast.info(clientIsWinner ? "winner" : "losser");
                localPlayer.money += args.money;
            }
        );
        socket.on("jnbl", (isJoinable: number) => {
            switch (isJoinable) {
                case 0:
                    socket.emit("n");
                    break;
                case 1:
                    alert("game started");
                    break;
                case 2:
                    alert("too many players");
                    break;
            }
        });
        socket.on("p-d", (args: string) => {
            toast.warn(`${args} has disconnected`);
            const xonline = clients.get(args);
            if (xonline) {
                xonline.dispose(scene);
            }
            clients.delete(args);
        });
        socket.on("mse", (args: { id: string; x: number; y: number }) => {
            const xonline = clients.get(args.id);
            if (xonline === undefined) throw Error("xonline is undefined");

            xonline.handleLook(args.x, args.y);
        });
    }

    // Init function
    _createGround();
    _createLights();
    _documentEvents();

    updates.push(_postProcessing());
    _socketInitiate();
    // Update function

    if (server) {
        const gui = new GUI();
        for (const entry of Object.entries(server)) {
            gui.add({ [entry[0]]: entry[1] }, entry[0]);
        }
    }

    renderer.setAnimationLoop(() => {
        // rotate camera
        {
            const oldRot = new THREE.Euler().copy(camera.rotation);
            camera.quaternion.setFromEuler(new THREE.Euler(camRotation.y, 0, 0));
            camera.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), camRotation.x);
            const newRot = new THREE.Euler().copy(camera.rotation);
            camera.rotation.copy(oldRot);
            camera.quaternion.slerp(new THREE.Quaternion().setFromEuler(newRot), 0.2);
            // camera.rotateOnWorldAxis(new THREE.Vector3(1, , 0), camRotation.x);
        }

        for (const update of updates) {
            update();
        }
    });
}
