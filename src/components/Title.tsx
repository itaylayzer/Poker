import { useEffect } from "react";

export default function Title({ children }: { children: string }) {
    useEffect(() => {
        document.title = children;
    }, []);
    return <></>;
}
