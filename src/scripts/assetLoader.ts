import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { Font, FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import * as React from "react"
import * as THREE from "three"
// https://gero3.github.io/facetype.js/
export type loadedAssets = {
    gltf: { [key: string]: GLTF };
    fbx: { [key: string]: THREE.Group };
    textures: { [key: string]: THREE.Texture };
    fonts: { [key:string]:Font};
};
export type loadedURLS = { [key: string]: string };


export function loadMeshes(items: { [key: string]: string }, SetProgress:React.Dispatch<number>): Promise<loadedAssets> {
    return new Promise((resolve, reject) => {
        const loadingManager = new THREE.LoadingManager();
        const gltfLoader = new GLTFLoader(loadingManager);
        const fbxLodaer = new FBXLoader(loadingManager);
        const textureLoader = new THREE.TextureLoader(loadingManager);
        const fontLoader = new FontLoader(loadingManager);
        const l = {
            gltf: {},
            fbx: {},
            textures: {},
            fonts:{}
        } as loadedAssets;
        const s = Object.keys(items).length;
        let i = 0;
        let minerI = 0;
        for (const x of Object.entries(items)) {
            if (x[1].endsWith(".fbx")) {
                fbxLodaer.load(
                    x[1],
                    (mesh1) => {
                        l.fbx[x[0]] = mesh1;

                        i += 1 / s;
                        minerI = 0;
                        SetProgress(i);
                    },
                    (progres) => {
                        minerI = progres.loaded / progres.total;
                        SetProgress(i + minerI / s);
                    }, // onProgress callback (useful for progress tracking)
                    (error) => {
                        reject(error); // Reject the promise if there's an error
                    }
                );
            } else if (x[1].endsWith(".gltf")) {
                gltfLoader.load(
                    x[1],
                    (mesh1) => {
                        l.gltf[x[0]] = mesh1;

                        i += 1 / s;
                        minerI = 0;
                        SetProgress(i);
                    },
                    (progres) => {
                        minerI = progres.loaded / progres.total;
                        SetProgress(i + minerI / s);
                    }, // onProgress callback (useful for progress tracking)
                    (error) => {
                        reject(error); // Reject the promise if there's an error
                    }
                );
            } else if (x[1].endsWith(".png")) {
                textureLoader.load(
                    x[1],
                    (mesh1) => {
                        l.textures[x[0]] = mesh1;

                        i += 1 / s;
                        minerI = 0;
                        SetProgress(i);
                    },
                    (progres) => {
                        minerI = progres.loaded / progres.total;
                        SetProgress(i + minerI / s);
                    }, // onProgress callback (useful for progress tracking)
                    (error) => {
                        reject(error); // Reject the promise if there's an error
                    }
                );
            }
            else if (x[1].endsWith(".typeface.json")){
                // console.log(x[1])
                fontLoader.load(
                    x[1],
                    (font) => {
                        l.fonts[x[0]] = font;
                        i += 1 / s;
                        minerI = 0;
                        SetProgress(i);
                        
                    },
                    (progres) => {
                        minerI = progres.loaded / progres.total;
                        SetProgress(i + minerI / s);
                    }, // onProgress callback (useful for progress tracking)
                    (error) => {
                        reject(error); // Reject the promise if there's an error
                    }
                );
            }
        }

        loadingManager.onLoad = () => {
            // console.log(`Loaded FBX`, JSON.stringify(Array.from(Object.keys(l.fbx))));
            // console.log(`Loaded GLTF`, JSON.stringify(Array.from(Object.keys(l.gltf))));
            // console.log(`Loaded Textures`, JSON.stringify(Array.from(Object.keys(l.textures))));
            // console.log(`Loaded Fonts`, JSON.stringify(Array.from(Object.keys(l.fonts))));
            SetProgress(1);
            resolve(l);
        };
    });
}