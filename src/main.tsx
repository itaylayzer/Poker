import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import Packet from "./Packet.tsx";
import "./index.css";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
const router = createBrowserRouter([
    {
        path: "/Poker/",
        element: <App />,
    },
    {
        path: "/Poker/Packet",
        element: <Packet />,
    },
]);

function Switch() {
    return <RouterProvider router={router} />;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(<Switch />);
