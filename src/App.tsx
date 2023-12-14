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
import { TranslateCode } from "./classess/code.env";

type connectionResultType = {
    socket: Socket;
    code: string;
    server: ActionList | undefined;
};

function App({ name, data, socket }: { data: loadedAssets; name: string; socket: connectionResultType }) {
    // game usage
    const [actions, SetAction] = useState<ActionList | undefined>(undefined);
    const [playerList, SetPList] = useState<Array<{ name: string; balance: number; balanceTurn: number }>>([]);
    const [balance, SetBalance] = useState<number>(1000);
    const [turnBalance, SetTurnBalance] = useState<number>(0);
    const [sumMoney, SetSumMoney] = useState<number>(0);
    const [state, SetState] = useState<string>();
    const [winName, setWinName] = useState<string | undefined>();
    useEffect(() => {
        document.title = "Poker | by Coder-1t45";
        game(name, {
            assets: data,
            socket: socket.socket,
            server: socket.server,
            react: {
                SetAction,
                SetBalance,
                SetTurnBalance,
                SetState,
                SetPList,
                setWinName,
                SetSumMoney,
            },
        });
    }, []);
    return (
        <>
            <div className="gameContainer"></div>
            <div className="gui">
                {!!winName ? <p className="winner">{winName}</p> : <></>}

                <div className="player-list">
                    {playerList.map((player) => (
                        <div className="player-info">
                            <div className="outline gold">
                                <div className="outline black">
                                    <p>{player.name}</p>
                                    <p className="balance">{player.balance}</p>
                                </div>
                                <p className="balance">{player.balanceTurn}</p>
                            </div>
                        </div>
                    ))}
                </div>

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
                <p className="code">{socket.code}</p>
                {sumMoney ? <p className="sumMoney">{sumMoney}</p> : <></>}
                <div className="information">
                    <img src="donald.png" alt="" />
                    <div className="inner">
                        <p>{name}</p>
                        <hr />
                        <p className="balance">{balance}</p>
                        <p>{turnBalance}</p>
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
                const deafultIP = "coder-1t45-trial-poker";
                let connectionResult: Promise<connectionResultType>;
                if (args.ip === undefined) {
                    connectionResult = new Promise((resolve) => {
                        ios(deafultIP).then((v) => resolve({ server: v.server, socket: v.socket, code: "" }));
                    });
                } else {
                    if (args.create === true) {
                        connectionResult = new Promise((resolve) => {
                            const xactions = run({
                                onOpen(_uri, server) {
                                    io(_uri).then((sock) => {
                                        resolve({ socket: sock, server: xactions, code: server.Code });
                                    });
                                },
                            });
                        });
                    } else {
                        connectionResult = new Promise((resolve) => {
                            io(TranslateCode(args.ip as string)).then((v) => {
                                resolve({
                                    server: undefined,
                                    socket: v,
                                    code: args.ip as string,
                                });
                            });
                        });
                    }
                }
                return connectionResult;
            }}
            meanwhile={
                <article className="progress">
                    <main>
                        <img src="iconclean.png" />
                    </main>
                </article>
            }
            reject={(r) => (
                <article className="progress">
                    <main>
                        <p>
                            Networking Problem: {r}
                            <br /> JSON Format {JSON.stringify(r)}
                        </p>
                    </main>
                </article>
            )}
            resolve={(sock) => <AssetLoader assets={urls} resolve={(data) => <App data={data} name={args.name} socket={sock} />} />}
        />
    );
}
