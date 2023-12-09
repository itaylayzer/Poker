import { useEffect, useState } from "react";

export default function AsyncTask<T>(args: {
    task: () => Promise<T>;
    meanwhile: JSX.Element;
    resolve: (args: T) => JSX.Element;
    reject: (r: any) => JSX.Element;
}) {
    const [value, SetValue] = useState<T>();
    const [reason, SetReason] = useState<any>();
    useEffect(() => {
        args.task()
            .then((v) => {
                console.log("finishedTask");
                SetValue(v);
            })
            .catch((r) => SetReason(r));
    }, []);
    return value === undefined && reason === undefined ? <>{args.meanwhile}</> : value !== undefined ? args.resolve(value) : args.reject(reason);
}
