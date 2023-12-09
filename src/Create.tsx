import { useState } from "react";
import Title from "./components/Title";

export default function Hub() {
    const [name, SetName] = useState<string>();
    return (
        <>
            <Title>Poker Hub</Title>
            <div className="page hub">
                <div className="center">
                    <div
                        onClick={() => {
                            document.location.href = "/";
                        }}
                        className="header"
                    >
                        <div className="img-header">
                            {/* <img src="iconclean.png" alt="" /> */}
                            <h3>Poker</h3>
                        </div>
                        <h5>@coder-1t45</h5>
                    </div>
                    <input type="text" placeholder="Enter Name" />
                    <div className="buttons">
                        <button>JOIN</button>
                        <button>CREATE</button>
                    </div>
                </div>
            </div>
        </>
    );
}
