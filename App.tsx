/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './lib/LanguageContext';
import { BusinessProvider } from './lib/BusinessContext';
import LandingPage from './components/LandingPage';
import MenuPage from './components/MenuPage';
import ManagerDashboard from './components/ManagerDashboard';
import DeveloperDashboard from './components/DeveloperDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <BusinessProvider>
        <LanguageProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/manager" element={<ManagerDashboard />} />
            <Route path="/developer" element={<DeveloperDashboard />} />
          </Routes>
        </LanguageProvider>
      </BusinessProvider>
    </BrowserRouter>
  );
}
