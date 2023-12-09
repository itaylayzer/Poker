import { useEffect, useState } from "react";

import "react-toastify/dist/ReactToastify.css";
import cards from "./scripts/cards";
export default function () {
    const [cPacket, SetPacket] = useState<{ reset: () => void; next: () => number; all: number[] }>();
    const [fillArray, SetFillArray] = useState<Array<number>>([]);
    const [nextValue, SetNext] = useState<number>();
    useEffect(() => {
        SetPacket(cards.packet());
    }, []);
    useEffect(() => {
        setInterval(() => {
            const nxt = cPacket?.next()!;
            if (fillArray.includes(nxt)) alert("INCLUDES");
            SetFillArray((old) => [...old, nxt]);
            SetNext(nxt);
        }, 1);
    }, [cPacket]);
    return !!cPacket ? (
        <>
            <p>
                ({cPacket.all.length}) [{cPacket.all.toString()}]
            </p>
            <h3>next:{nextValue}</h3>
            <button
                onClick={() => {
                    const nxt = cPacket.next();
                    if (fillArray.includes(nxt)) alert("INCLUDES");
                    SetFillArray((old) => [...old, nxt]);
                    SetNext(nxt);
                }}
            >
                set next()
            </button>
            <p>
                [
                {JSON.stringify(
                    cPacket.all.filter((value) => {
                        const searchArray = cPacket.all.filter((second) => second === value);
                        return searchArray.length > 1;
                    })
                )}
                ]
            </p>
            <p>
                ({fillArray.length}) [{fillArray.toString()}]
            </p>
            <p>
                [
                {JSON.stringify(
                    fillArray.filter((value) => {
                        const searchArray = fillArray.filter((second) => second === value);
                        return searchArray.length > 1;
                    })
                )}
                ]
            </p>
        </>
    ) : (
        <></>
    );
}
