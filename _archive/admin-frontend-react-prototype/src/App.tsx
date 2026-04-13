import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Login from "./pages/Login";
import Layout from "./pages/Layout";
import Dashboard from "./pages/Dashboard";
import ListPage from "./pages/ListPage";
import { api } from "./api";

const qc = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login/>}/>
          <Route element={<Layout/>}>
            <Route index element={<Dashboard/>}/>
            <Route path="reservations" element={<ListPage title="Réservations" queryKey="reservations" fetcher={api.reservations}/>}/>
            <Route path="menus" element={<ListPage title="Menus" queryKey="menus" fetcher={api.menus}/>}/>
            <Route path="paiements" element={<ListPage title="Paiements" queryKey="paiements" fetcher={api.paiements}/>}/>
            <Route path="tables" element={<ListPage title="Tables" queryKey="tables" fetcher={api.tables}/>}/>
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
