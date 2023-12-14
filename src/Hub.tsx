import { useState } from "react";
import Title from "./components/Title";
import App from "./App";
function Hub(args: {
    SetName: React.Dispatch<React.SetStateAction<string | undefined>>;
    SetScreen: React.Dispatch<React.SetStateAction<number>>;
    SetCode: React.Dispatch<React.SetStateAction<string | undefined>>;
}) {
    const [isJoin, SetIsJoin] = useState<boolean>(false);
    return (
        <>
            <Title>Poker Hub</Title>
            <div className="page hub">
                <div className="center aside">
                    <div>
                        <div className="header">
                            <div className="img-header">
                                {/* <img src="iconclean.png" alt="" /> */}
                                <h3>Poker</h3>
                            </div>
                            <h5
                                onClick={() => {
                                    document.location.href = "https://coder-1t45.github.io/";
                                }}
                            >
                                @coder-1t45
                                <img src="smallheart.png" alt="" style={{ height: 25, width: 25, marginBlock: "auto", translate: "5px 5px" }} />
                            </h5>
                        </div>
                        <input
                            type="text"
                            placeholder="Enter Name"
                            onChange={(e) => {
                                args.SetName(e.currentTarget.value);
                            }}
                        />
                        {isJoin ? (
                            <input
                                type="text"
                                placeholder="Enter Code"
                                onChange={(e) => {
                                    args.SetCode(e.currentTarget.value);
                                }}
                            />
                        ) : (
                            <></>
                        )}
                        <div className="buttons">
                            {isJoin ? (
                                <>
                                    {" "}
                                    <button
                                        onClick={() => {
                                            SetIsJoin(false);
                                        }}
                                    >
                                        BACK
                                    </button>
                                    <button
                                        onClick={() => {
                                            args.SetScreen(1);
                                        }}
                                    >
                                        JOIN
                                    </button>
                                </>
                            ) : (
                                <>
                                    {" "}
                                    <button
                                        onClick={() => {
                                            SetIsJoin(true);
                                        }}
                                    >
                                        JOIN
                                    </button>
                                    <button
                                        onClick={() => {
                                            args.SetScreen(2);
                                        }}
                                    >
                                        CREATE
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                    <img src="cards.png" className="hubanimcards" alt="" />
                </div>
                <footer>
                    <button
                        onClick={() => {
                            args.SetScreen(3);
                        }}
                    >
                        credits
                    </button>
                    {/* <button
                        onClick={() => {
                            args.SetScreen(4);
                        }}
                    >
                        settings
                    </button> */}
                </footer>
            </div>
        </>
    );
}

function Join({ name, code }: { name: string; code: string }) {
    return <App name={name} ip={code} />;
}

function Create({ name }: { name: string }) {
    return <App name={name} ip="coder-1t45-poker" create={true} />;
}

function Credits({ SetScreen }: { SetScreen: React.Dispatch<React.SetStateAction<number>> }) {
    return (
        <div className="page hub">
            <div className="center">
                <div className="credits">
                    <h2>Textures</h2>
                    <p>
                        {" "}
                        Cards from <a href="https://g.co/kgs/kRstRo">Google Solitare</a> ripped by{" "}
                        <a href="https://www.spriters-resource.com/browser_games/googlesolitaire/sheet/147613/">DogToon64</a>
                    </p>
                </div>
                <br />
                <br />
                <button
                    onClick={() => {
                        SetScreen(0);
                    }}
                    style={{ minWidth: 175 }}
                >
                    BACK
                </button>
            </div>
        </div>
    );
}
function Settings({ SetScreen }: { SetScreen: React.Dispatch<React.SetStateAction<number>> }) {
    return (
        <div className="page hub">
            <div className="center">
                <div className="settings">
                    <h2>Textures</h2>
                    <p>
                        <select name="" id="">
                            <option value=""></option>
                            <option value=""></option>
                        </select>
                    </p>
                    <p>Cards Texture</p>
                </div>
                <br />
                <br />
                <button
                    onClick={() => {
                        SetScreen(0);
                    }}
                    style={{ minWidth: 175 }}
                >
                    BACK
                </button>
            </div>
        </div>
    );
}

function Switch() {
    const [name, SetName] = useState<string>();
    const [code, SetCode] = useState<string>();
    const [screen, SetScreen] = useState<number>(0);

    if (name !== undefined) {
        switch (screen) {
            case 1:
                if (code != undefined) return <Join name={name} code={code} />;
                else alert("YOU NEED TO ENTER CODE FIRST");
                return <Hub SetName={SetName} SetScreen={SetScreen} SetCode={SetCode} />;
            case 2:
                return <Create name={name} />;
            default:
                return <Hub SetName={SetName} SetScreen={SetScreen} SetCode={SetCode} />;
        }
    } else {
        if ([1, 2].includes(screen)) {
            alert("YOU NEED TO ENTER A NAME FIRST");
            SetScreen(0);
        }
        switch (screen) {
            case 3:
                // credit
                return <Credits SetScreen={SetScreen} />;
            case 4:
                // credit
                return <Settings SetScreen={SetScreen} />;
            default:
                return <Hub SetName={SetName} SetScreen={SetScreen} SetCode={SetCode} />;
        }
    }
}

export default Switch;
