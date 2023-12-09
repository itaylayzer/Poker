import AssetLoader from "./components/AssetLoader";
import { useEffect, useState } from "react";
import game, { urls, ActionList } from "./scripts/game";
import { loadedAssets } from "./scripts/assetLoader";
import run, { ios } from "./scripts/server";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Slider from "./components/Slider";
import { Socket, io } from "./classess/socket.io";
import AsyncTask from "./components/AsyncTask";

type connectionResultType = {
    socket: Socket;
    server: ActionList | undefined;
};

function App({ name, data, socket }: { data: loadedAssets; name: string; socket: connectionResultType }) {
    // game usage
    const [actions, SetAction] = useState<ActionList | undefined>(undefined);
    const [playerList, SetPList] = useState<Array<{ name: string; balance: number }>>([]);
    const [balance, SetBalance] = useState<number>(1000);
    const [state, SetState] = useState<string>();
    const [winName, setWinName] = useState<string | undefined>();
    useEffect(() => {
        const connect = async () => {
            document.title = "Poker";
            game(name, {
                assets: data,
                socket: socket.socket,
                server: socket.server,
                react: {
                    SetAction,
                    SetBalance,
                    SetState,
                    SetPList,
                    setWinName,
                },
            });
        };
        connect();
    }, []);
    return (
        <>
            <div className="gameContainer"></div>
            <div className="gui">
                {!!winName ? <p className="winner">{winName}</p> : <></>}
                {playerList.length > 0 ? (
                    <div className="player-list">
                        {playerList.map((player) => (
                            <div className="player-info">
                                <p>{player.name}</p>
                                <p className="balance">{player.balance}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <></>
                )}

                <div className="actions-bar">
                    {state !== undefined ? (
                        <div className="top" data-has={actions !== undefined}>
                            <p>{state}</p>
                        </div>
                    ) : (
                        <></>
                    )}

                    {actions !== undefined ? (
                        <>
                            {actions.slider != undefined ? (
                                <Slider
                                    defualtValue={actions.slider.defaultValue ?? 50}
                                    min={actions.slider.min ?? 50}
                                    max={actions.slider.max ?? 100}
                                    addon={actions.slider.addon ?? 0}
                                    onValue={(e) => {
                                        actions.slider?.onValue(e);
                                    }}
                                />
                            ) : (
                                <></>
                            )}
                            <div className="actions" data-has={actions.slider != undefined}>
                                {Object.entries(actions.functions).map(([value, func]) => (
                                    <button
                                        id={value}
                                        disabled={/*value === "Raise"*/ typeof func === "object" && func.disabled()}
                                        onClick={() => {
                                            if (typeof func === "function") {
                                                const reVal = func();
                                                if (reVal !== true) SetAction(undefined);
                                            } else {
                                                const reVal = func.function();
                                                if (reVal !== true) SetAction(undefined);
                                            }
                                        }}
                                    >
                                        {value}
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <></>
                    )}
                </div>

                <div className="information">
                    <img src="donald.png" alt="" />
                    <div className="inner">
                        <p>{name}</p>
                        <hr />
                        <p className="balance">{balance}</p>
                    </div>
                </div>
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

export default function (args: { name: string; ip?: string; create?: boolean }) {
    return (
        <AsyncTask<connectionResultType>
            task={() => {
                let connectionResult: Promise<{
                    socket: Socket;
                    server: ActionList | undefined;
                }>;
                if (args.ip === undefined) {
                    connectionResult = ios("coder-1t45-trial-poker");
                } else {
                    if (args.create === true) {
                        connectionResult = new Promise((resolve) => {
                            const xactions = run({
                                uri: args.ip,
                                onOpen(_uri) {
                                    if (_uri !== args.ip) {
                                        alert("Uri is diffrent");
                                        console.log("_uri", _uri, "uri", args.ip);
                                    }
                                    io(_uri).then((sock) => {
                                        resolve({ socket: sock, server: xactions });
                                    });
                                },
                            });
                        });
                    } else {
                        connectionResult = new Promise((resolve) => {
                            io(args.ip as string).then((v) => {
                                resolve({
                                    server: undefined,
                                    socket: v,
                                });
                            });
                        });
                    }
                }
                return connectionResult;
            }}
            meanwhile={<p>loading</p>}
            reject={(r) => (
                <p>
                    Networking Problem: {r}
                    <br /> JSON Format {JSON.stringify(r)}
                </p>
            )}
            resolve={(sock) => <AssetLoader assets={urls} resolve={(data) => <App data={data} name={args.name} socket={sock} />} />}
        />
    );
}
