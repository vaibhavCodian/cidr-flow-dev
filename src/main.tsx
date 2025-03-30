import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './context/ThemeContext.tsx'; // Import ThemeProvider

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Wrap App with ThemeProvider here */}
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
);