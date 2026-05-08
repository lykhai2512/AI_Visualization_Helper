import { createBrowserRouter, Navigate } from "react-router";
import { ChatPage } from "../pages/ChatPage.jsx";

const RootRedirect = () => {
    return <Navigate to= "/chat" replace />;
};

const router = createBrowserRouter([
    {
        path: "/chat",
        element: <ChatPage />
    },
    {
        path: "/",
        element: <RootRedirect />
    }
]);

export default router;
