import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { SplashScreen } from './components/SplashScreen';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* basename: permite publicar la tienda en una subcarpeta, como en GitHub Pages. */}
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
      <SplashScreen />
    </BrowserRouter>
  </StrictMode>,
);
