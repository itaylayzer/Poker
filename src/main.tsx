import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import Packet from "./Packet.tsx";
import "./index.css";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import Hub from "./Hub.tsx";
const router = createBrowserRouter([
    {
        path: "/Poker/",
        element: <App name="casualUser" />,
    },
    {
        path: "/Poker/Packet",
        element: <Packet />,
    },
    {
        path: "/Poker/Hub",
        element: <Hub />,
    },
]);

function Switch() {
    return <RouterProvider router={router} />;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(<Switch />);
