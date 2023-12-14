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
import { RGBShiftShader } from "three/addons/shaders/RGBShiftShader.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { VignetteShader } from "three/examples/jsm/shaders/VignetteShader.js";

export const urls: loadedURLS = {
    green: "textures/green500x500.png",
    google: "textures/google.png",
    skeleton: "fbx/endy-rigged.fbx",
};
export type CustomLight = {
    color: THREE.ColorRepresentation;
    intensity: number;
    pos?: THREE.Vector3;
    rot?: THREE.Euler;
    type: "point" | "directional" | "ambient" | "spot";
};
export type ActionList = {
    slider?: { min: number; max: number; defaultValue: number; onValue: (args: number) => void; addon: number } | undefined;
    functions: { [key: string]: (() => void | true) | { function: () => void | true; disabled: () => boolean } };
};

export default function (
    name: string,
    {
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
            SetBalance: React.Dispatch<number>;
            SetTurnBalance: React.Dispatch<number>;
            SetState: React.Dispatch<string>;
            SetPList: React.Dispatch<
                {
                    name: string;
                    balance: number;
                    balanceTurn: number;
                }[]
            >;
            setWinName: React.Dispatch<string | undefined>;
        };
    }
) {
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

    let composer: EffectComposer,
        effectFXAA: ShaderPass,
        outlinePassCards: OutlinePass,
        outlinePassBodies: OutlinePass,
        boardManager: BoardManager,
        rgbSplitter: ShaderPass,
        bloomPass: UnrealBloomPass,
        vigneteShader: ShaderPass;

    const localLight = new THREE.SpotLight(0xfffff, 100, 1000, Math.PI / 5, 1);
    // scene.add(localLight);
    const raycaster = new THREE.Raycaster();
    const clients = new Map<string, OnlinePlayer>();
    // const raycaster = new THREE.Raycaster();

    OnlinePlayer.playerBody = assets.fbx.skeleton;
    OnlinePlayer.textureManager = cardTextures;
    const localPlayer = new LocalPlayer(camera).add(scene);
    let sumMoney: number = 0;
    const camRotation = new THREE.Vector2(0, 1);
    const updates: (() => void)[] = [];
    let val: number = 0;
    const ActionSets: { default: ActionList; raising: ActionList } = {
        default: {
            functions: {
                Call: () => {
                    socket.emit("act", true);
                },
                Raise: {
                    disabled: () => (ActionSets.raising.slider ? ActionSets.raising.slider.min > ActionSets.raising.slider.max : true),
                    function: () => {
                        if (!ActionSets.raising.slider) throw Error("ActionSets.raising.slider is null");

                        val = ActionSets.raising.slider?.defaultValue!;
                        react.SetAction(ActionSets.raising);
                        return true;
                    },
                },
                Fold: () => {
                    socket.emit("act", false);
                },
            },
        } as ActionList,
        raising: {
            slider: {
                defaultValue: 50,
                max: localPlayer.money,
                min: 50,
                onValue(args) {
                    val = args;
                },
                addon: 0,
            },
            functions: {
                Cancel: () => {
                    react.SetAction(ActionSets.default);
                    return true;
                },

                submit: () => {
                    socket.emit("act", val);
                },
                "all In": () => {
                    socket.emit("act", localPlayer.money);
                },
            },
        } as ActionList,
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
        groundMesh.receiveShadow = true;
        groundMesh.castShadow = true;
        scene.add(groundMesh);
    }
    function _createLights() {
        function clightx(c: CustomLight[]) {
            for (const x of c) {
                let l;
                if (x.type === "directional") {
                    l = new THREE.DirectionalLight(x.color, x.intensity);
                } else if (x.type === "point") {
                    l = new THREE.PointLight(x.color, x.intensity);
                } else if (x.type === "spot") {
                    l = new THREE.SpotLight(x.color, x.intensity, 100000, Math.PI / 4, 1);
                    const spotLightHelper = new THREE.SpotLightHelper(l);
                    scene.add(spotLightHelper);
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
        }

        clightx([
            {
                color: 0xffffff,
                intensity: 2,
                type: "directional",
                rot: new THREE.Euler(0.1, 0.1, 0),
            },
            {
                color: 0xffffff,
                intensity: 0.7,
                type: "ambient",
                rot: new THREE.Euler(0.9, 0.5, 0),
            },
            {
                color: 0xffffff,
                intensity: 150,
                type: "spot",
                pos: new THREE.Vector3(0, 0, 10),
                rot: new THREE.Euler(0, 0, 0),
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
                    const material1 = new THREE.MeshToonMaterial({
                        map: v[0],
                        color: 0xc0c0c0,
                    });
                    const material2 = new THREE.MeshToonMaterial({
                        map: v[1],
                        color: 0xc0c0c0,
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

        outlinePassCards = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera);

        outlinePassCards.edgeStrength = 5.0;
        outlinePassCards.edgeGlow = 0; //0.5;
        outlinePassCards.edgeThickness = 1;
        outlinePassCards.pulsePeriod = 0;
        outlinePassCards.visibleEdgeColor = new THREE.Color("white");
        outlinePassCards.hiddenEdgeColor = new THREE.Color("white"); //"190a05");

        outlinePassBodies = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera);

        outlinePassBodies.edgeStrength = 5.0;
        outlinePassBodies.edgeGlow = 0; //0.5;
        outlinePassBodies.edgeThickness = 1;
        outlinePassBodies.pulsePeriod = 0;
        outlinePassBodies.visibleEdgeColor = new THREE.Color("white");
        outlinePassBodies.hiddenEdgeColor = new THREE.Color("black"); //"190a05");

        rgbSplitter = new ShaderPass(RGBShiftShader);
        rgbSplitter.uniforms["amount"].value = 0.0015 / 4;

        bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1, 0.4, 5);

        vigneteShader = new ShaderPass(VignetteShader);
        vigneteShader.uniforms["offset"].value = 1.1;
        vigneteShader.uniforms["darkness"].value = 1.05;
        // composer.addPass(bloomPass);
        // composer.addPass(rgbSplitter);
        composer.addPass(outlinePassBodies);
        composer.addPass(outlinePassCards);
        composer.addPass(vigneteShader);

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
        function updateSelected() {
            const cardsmeshes = goldenCards();
            const onlinesmeshes = Array.from(clients.values())
                .filter((v) => v.myturn === true)
                .map((v) => v.body);
            if (onlinesmeshes.length >= 2)
                throw new Error("too many", {
                    cause: {
                        arr: onlinesmeshes,
                        size: onlinesmeshes.length,
                        what: Array.from(clients.values()).filter((v) => v.myturn === true),
                        whatSize: Array.from(clients.values()).filter((v) => v.myturn === true).length,
                    },
                });
            outlinePassCards.selectedObjects = cardsmeshes;
            outlinePassBodies.selectedObjects = onlinesmeshes;
        }
        function goldenCards() {
            console.group("Golden Cards");
            console.log("%c\n===========\ngolden cards", "font-family:consolas; color:green");
            const allCards = [...boardManager.currentValues, ...localPlayer.cardsvalues];
            console.log("\tcards", allCards);
            const stateResult = CardsAPI.state(allCards);
            const cards = stateResult.cards.map((v) => (v % 100 === 14 ? v - 13 : v));
            console.log("%c\tstate result cards", "font-family:consolas; color:green", stateResult.stateId, cards);
            const playerMeshes = Array.from(localPlayer.cardsValToMesh.keys())
                .filter((val) => cards.includes(val))
                .map((v) => {
                    const xmesh = localPlayer.cardsValToMesh.get(v) as THREE.Mesh;
                    return xmesh;
                });
            const boardMeshes = boardManager.getMeshes(cards);
            const meshes = playerMeshes.concat(boardMeshes).filter((v) => v !== undefined);
            console.log(
                "%c\tall",
                "font-family:consolas; color:green",
                meshes,
                "%cboard",
                "font-family:consolas; color:green",
                boardMeshes,
                "%cplayer",
                "font-family:consolas; color:green",
                playerMeshes
            );

            const statesArr: string[] = [
                "highCard",
                "onePair",
                "twoPair",
                "threeOfAKind",
                "straight",
                "flush",
                "fullHouse",
                "fourOfaKind",
                "straightFlush",
                "royaleFlush",
            ];
            console.groupEnd();
            react.SetState(
                (function (input: string) {
                    const words = input.split(/(?=[A-Z])/);

                    // Convert each word to uppercase
                    const uppercasedWords = words.map((word) => word.toUpperCase());

                    // Join the words with "-"
                    const result = uppercasedWords.join(" ");

                    return result;
                })(statesArr[stateResult.stateId])
            );
            return meshes;
        }
        function orderOnlines() {
            let theta = -Math.PI;
            clients.forEach((player) => {
                let vec = new THREE.Vector3();
                theta += (2 * Math.PI) / (clients.size + 1);
                vec.setFromSphericalCoords(3.5, theta, Math.PI / 2);
                vec.add(new THREE.Vector3(0, 0, -1.5));
                player.position(vec, new THREE.Vector3(0, 0, 0));
            });
        }
        socket.on("i", (args: { op: { [k: string]: string } }) => {
            // console.log(socket.id, args);
            try {
                for (const p of Array.from(Object.entries(args.op))) {
                    const xonline = new OnlinePlayer(p[1]);
                    clients.set(p[0], xonline);
                    xonline.add(scene);
                    // reposition every player in a circle
                }

                // console.log("clients", clients);
                react.SetAction({
                    slider: undefined,
                    functions: {
                        Ready: () => {
                            socket.emit("r");
                        },
                    },
                });
                react.SetPList(
                    Array.from(clients.values()).map((v) => ({
                        name: v.name,
                        balance: v.money,
                        balanceTurn: v.turnbalance,
                    }))
                );
                orderOnlines();
            } catch (e) {
                console.error(e);
            }
        });
        socket.on("n-p", (args: { id: string; n: string }) => {
            const xonline = new OnlinePlayer(args.n);
            clients.set(args.id, xonline);
            xonline.add(scene);
            react.SetPList(
                Array.from(clients.values()).map((v) => ({
                    name: v.name,
                    balance: v.money,
                    balanceTurn: v.turnbalance,
                }))
            );
            orderOnlines();
        });
        socket.on("st", (args: { b: number[]; c1: number; c2: number; rn: number }) => {
            // console.log("[client]", "args.boardcards", args.b);
            boardManager = new BoardManager(args.b, scene, cardTextures);
            boardManager.OpenRound().then(() => updateSelected());
            localPlayer.cardsvalues = [args.c1, args.c2];

            _userCards(args.c1, args.c2).then((v) => {
                updates.push(v);
            });
            for (const xonline of clients.values()) {
                xonline.startCards(scene);
            }
        });
        socket.on("nxt", () => {
            boardManager.Next().then(() => {
                updateSelected();
            });
        });
        socket.on("act", (args: { m: number; id: string }) => {
            for (const xclient of clients.values()) {
                xclient.myturn = false;
            }
            if (args.id !== socket.id) {
                const xonline = clients.get(args.id);
                if (xonline === undefined) throw Error("xonline === undefined");
                xonline.myturn = true;
            } else {
                ActionSets.raising.slider ? (ActionSets.raising.slider.min = ActionSets.raising.slider.defaultValue = args.m + 50) : 0;
                react.SetAction(ActionSets.default);
            }

            updateSelected();
        });
        socket.on("bl", (args: { id: string; b: number; c: number; s: number }) => {
            sumMoney = args.s;
            if (args.id === socket.id) {
                localPlayer.money = args.b;
                localPlayer.turnbalance = args.c;
                react.SetBalance(localPlayer.money);
                react.SetTurnBalance(localPlayer.turnbalance);
                ActionSets.raising.slider ? (ActionSets.raising.slider.max = localPlayer.money) : 0;
            } else {
                const xplayer = clients.get(args.id);

                if (xplayer) {
                    xplayer.money = args.b;
                    xplayer.turnbalance = args.c;
                    react.SetPList(
                        Array.from(clients.values()).map((v) => ({
                            name: v.name,
                            balance: v.money,
                            balanceTurn: v.turnbalance,
                        }))
                    );
                }
            }
        });
        socket.on("win", (args: { [key: string]: number }) => {
            // alert(str);
            // console.log("win 1");
            const winnerId = Object.keys(args).reduce((a, b) => (args[a] > args[b] ? a : b));
            // console.log("win 2");
            const clientIsWinner = socket.id === winnerId;
            // console.log("win 3");
            // console.log("clientIsWinner", clientIsWinner);
            // console.log(clientIsWinner ? "YOU WON" : `${clients.get(winnerId)?.name} WIN`);
            react.setWinName(clientIsWinner ? "YOU WON" : `${clients.get(winnerId)?.name} WIN`);
            setTimeout(() => {
                react.setWinName(undefined);
            }, 2000);
        });
        socket.on("jnbl", (isJoinable: number) => {
            // console.log("isJoinable", isJoinable);
            switch (isJoinable) {
                case 0:
                    socket.emit("n", name);
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
            orderOnlines();
            react.SetPList(
                Array.from(clients.values()).map((v) => ({
                    name: v.name,
                    balance: v.money,
                    balanceTurn: v.turnbalance,
                }))
            );
        });
        socket.on("mse", (args: { id: string; x: number; y: number }) => {
            const xonline = clients.get(args.id);
            if (xonline === undefined) throw Error("xonline is undefined");

            xonline.handleLook(args.x, args.y);
        });

        socket.emit("jnbl");
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
        for (const entry of Object.entries(server.functions)) {
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
            localLight.position.copy(camera.position);
            localLight.lookAt(
                camera.position.clone().add(
                    (() => {
                        const forwardVec = new THREE.Vector3(0, 1, 0);
                        forwardVec.applyQuaternion(camera.quaternion);
                        return camera.position.clone().add(forwardVec.multiplyScalar(5));
                    })()
                )
            );

            // camera.rotateOnWorldAxis(new THREE.Vector3(1, , 0), camRotation.x);
        }

        localPlayer.update();
        for (const ikUpdate of Array.from(clients.values()).map((v) => v.update)) ikUpdate();
        for (const update of [...updates]) update();
    });
}
