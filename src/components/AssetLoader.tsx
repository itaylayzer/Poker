import { useEffect, useState } from "react";
import { loadMeshes, loadedAssets, loadedURLS } from "../scripts/assetLoader";
export default function ({ assets, resolve }: { assets: loadedURLS; resolve: (data: loadedAssets) => JSX.Element }) {
    const [pvalue, SetProgress] = useState<number | string | loadedAssets>(0);
    useEffect(() => {
        loadMeshes(assets, SetProgress)
            .then((meshes) => {
                SetProgress(meshes);
            })
            .catch((r: ErrorEvent) => {
                console.error(r);
                SetProgress(r.message);
            });
    }, []);

    return typeof pvalue === "number" ? (
        <article className="progress">
            <main>
                <h3>Loading</h3>
                <div>
                    <progress value={pvalue} max={1}></progress> <p>{(pvalue * 100).toFixed(2)}%</p>
                </div>
            </main>
        </article>
    ) : typeof pvalue === "object" ? (
        resolve(pvalue)
    ) : (
        <p>{pvalue}</p>
    );
}
