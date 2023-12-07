import AssetLoader from "./components/AssetLoader";
import { useEffect, useState } from "react";
import game, { urls, ActionList } from "./scripts/game";
import { loadedAssets } from "./scripts/assetLoader";
import { ios } from "./scripts/server";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
function App({ data }: { data: loadedAssets }) {
    const [actions, SetAction] = useState<ActionList | undefined>({});
    useEffect(() => {
        ios("coder-1t45-trial-poker").then((v) => {
            document.title = "Poker";
            game({
                assets: data,
                socket: v.socket,
                server: v.server,
                react: {
                    SetAction,
                },
            });
        });
    }, []);
    return (
        <>
            <div className="gameContainer"></div>
            <div className="gui">
                {actions !== undefined ? (
                    <div className="actions">
                        {Object.entries(actions).map(([value, func]) => (
                            <button
                                id={value}
                                onClick={() => {
                                    func();
                                    SetAction(undefined);
                                }}
                            >
                                {value}
                            </button>
                        ))}
                    </div>
                ) : (
                    <></>
                )}
            </div>
            <ToastContainer
                position="bottom-left"
                theme="light"
                autoClose={4000}
                closeOnClick
                // toastClassName = {() => "relative flex py-4 px-3 rounded overflow-hidden cursor-pointer bg-white shadow-lg"}
                // bodyClassName  = {() => "text-black text-base font-normal"}
            />
        </>
    );
}

export default function () {
    return <AssetLoader assets={urls} resolve={(data) => <App data={data} />} />;
}
