import { useEffect } from "react";
import * as THREE from "three";

import { GUI } from "dat.gui";
import { loadedAssets } from "./scripts/assetLoader";
import AssetLoader from "./components/AssetLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

function App({ data }: { data: loadedAssets }) {
    useEffect(() => {
        const container = document.querySelector("div.gameContainer") as HTMLDivElement;
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(renderer.domElement);
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 10000);
        camera.position.set(0, 0, 4);
        const controls = new OrbitControls(camera, container);
        camera.rotation.x = 0;

        const skeleton = data.fbx.body;
        skeleton.scale.multiplyScalar(0.01);
        skeleton.position.y -= 2;
        skeleton.rotation.x = 0;
        const skMesh = skeleton.children[0] as THREE.SkinnedMesh;
        scene.add(new THREE.AmbientLight(0xffffff, 1), new THREE.DirectionalLight(0xffffff, 1));
        // add skeleton to the scene
        scene.add(skeleton);
        scene.background = new THREE.Color(0xffffff);
        const helper = new THREE.SkeletonHelper(skMesh);
        helper.visible = true;
        scene.add(helper);
        const gui = new GUI();

        function doesNotHaveDigits(input: string): boolean {
            const char = input.at(-1) as string;
            if (char >= "0" && char <= "9") {
                return false;
            }

            return true;
        }

        for (const bone of skMesh.skeleton.bones.filter((v) => {
            const name = v.name.toLowerCase();
            return (name.includes("hand") || name.includes("arm") || name.includes("shoulder")) && doesNotHaveDigits(name);
        })) {
            const d = Math.PI * 2;
            bone.rotation.x = (bone.rotation.x + d) % d;
            bone.rotation.y = (bone.rotation.y + d) % d;
            bone.rotation.z = (bone.rotation.z + d) % d;
            const folder = gui.addFolder(bone.name);
            folder.add(bone.rotation, "x", 0, Math.PI * 2);
            folder.add(bone.rotation, "y", 0, Math.PI * 2);
            folder.add(bone.rotation, "z", 0, Math.PI * 2);

            folder.close();
        }

        renderer.setAnimationLoop(() => {
            controls.update();
            renderer.render(scene, camera);
        });

        return () => {
            gui.destroy();
            gui.hide();
            document.location.reload();
        };
    }, []);
    return <div className="gameContainer"></div>;
}
export default function () {
    return (
        <AssetLoader
            assets={{
                body: "fbx/endy-rigged.fbx",
            }}
            resolve={(data) => <App data={data} />}
        />
    );
}
