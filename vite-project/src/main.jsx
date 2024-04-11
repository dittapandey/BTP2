import React from 'react'
import ReactDOM from 'react-dom/client'
import LandingPage from './pages/landingpage.jsx'
import ErrorPage from './pages/errorpage.jsx'
import ResultPage from './pages/results.jsx'
import './index.css'
import { createBrowserRouter, RouterProvider } from "react-router-dom";

const router = createBrowserRouter([
  {
    path: "/",
    element: <ResultPage />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/r",
    element: <LandingPage />,
    errorElement: <ErrorPage />,
  }
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
