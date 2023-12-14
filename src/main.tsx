import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import Packet from "./Packet.tsx";
import "./index.css";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import Hub from "./Hub.tsx";
import CharacterView from "./CharacterView.tsx";
const router = createBrowserRouter([
    {
        path: "/Poker/Tick",
        element: <App name="casualUser" />,
    },
    {
        path: "/Poker/Packet",
        element: <Packet />,
    },
    {
        path: "/Poker/",
        element: <Hub />,
    },
    {
        path: "/Poker/Char",
        element: <CharacterView />,
    },
]);

function Switch() {
    return <RouterProvider router={router} />;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(<Switch />);
