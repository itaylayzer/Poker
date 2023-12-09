import { useState } from "react";

export default function Slider({
    step,
    min,
    max,
    addon,
    onValue,
    defualtValue,
}: {
    defualtValue: number;
    step?: number;
    min?: number;
    max?: number;
    addon?: number;
    onValue?: (d: number) => void;
}) {
    const n = useState<number>(defualtValue ?? 0);
    return (
        <div className="slider">
            <input
                type="range"
                step={step ?? 1}
                min={min ?? 0}
                max={max ?? 10}
                defaultValue={n[0].toString()}
                onChange={(e) => {
                    n[1](e.currentTarget.valueAsNumber);
                    onValue?.(e.currentTarget.valueAsNumber);
                }}
            />
            <span>{n[0] + (addon ?? 0)}</span>
        </div>
    );
}
