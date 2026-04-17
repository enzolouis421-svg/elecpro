// Point d'entrée — Routes + Providers
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import './index.css'

import { AppProvider } from './context/AppContext'
import App from './App'

// Pages
import Dashboard from './pages/Dashboard'
import ClientsList from './pages/clients/ClientsList'
import ClientDetail from './pages/clients/ClientDetail'
import ClientForm from './pages/clients/ClientForm'
import ChantiersList from './pages/chantiers/ChantiersList'
import ChantierDetail from './pages/chantiers/ChantierDetail'
import ChantierForm from './pages/chantiers/ChantierForm'
import DevisList from './pages/devis/DevisList'
import DevisDetail from './pages/devis/DevisDetail'
import DevisForm from './pages/devis/DevisForm'
import FacturesList from './pages/factures/FacturesList'
import FactureDetail from './pages/factures/FactureDetail'
import FactureForm from './pages/factures/FactureForm'
import Parametres from './pages/parametres/Parametres'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppProvider>
        <Routes>
          <Route path="/" element={<App />}>
            <Route index element={<Dashboard />} />

            {/* Clients */}
            <Route path="clients" element={<ClientsList />} />
            <Route path="clients/nouveau" element={<ClientForm />} />
            <Route path="clients/:id" element={<ClientDetail />} />
            <Route path="clients/:id/modifier" element={<ClientForm />} />

            {/* Chantiers */}
            <Route path="chantiers" element={<ChantiersList />} />
            <Route path="chantiers/nouveau" element={<ChantierForm />} />
            <Route path="chantiers/:id" element={<ChantierDetail />} />
            <Route path="chantiers/:id/modifier" element={<ChantierForm />} />

            {/* Devis */}
            <Route path="devis" element={<DevisList />} />
            <Route path="devis/nouveau" element={<DevisForm />} />
            <Route path="devis/:id" element={<DevisDetail />} />
            <Route path="devis/:id/modifier" element={<DevisForm />} />

            {/* Factures */}
            <Route path="factures" element={<FacturesList />} />
            <Route path="factures/nouveau" element={<FactureForm />} />
            <Route path="factures/:id" element={<FactureDetail />} />
            <Route path="factures/:id/modifier" element={<FactureForm />} />

            {/* Paramètres */}
            <Route path="parametres" element={<Parametres />} />
          </Route>
        </Routes>

        {/* Système de notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#1E293B',
              color: '#F8FAFC',
              border: '1px solid #334155',
              borderRadius: '12px',
              fontSize: '14px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            },
            success: {
              iconTheme: { primary: '#10B981', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#EF4444', secondary: '#fff' },
            },
          }}
        />
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>
)
