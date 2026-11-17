import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './App.css';

const root = ReactDOM.createRoot(document.getElementById('root'));

async function enableMocking() {
  //carga y activa msw antes de peticiones
  const { worker } = await import('./mocks/browser');
  return worker.start({
    serviceWorker: { url: `${process.env.PUBLIC_URL}/mockServiceWorker.js` },
    onUnhandledRequest: 'bypass'
  });
}

function iniciar() {
  root.render(<p className="inicio" role="status">Iniciando la API simulada...</p>);
  enableMocking().then(() => {
    root.render(<React.StrictMode><App /></React.StrictMode>);
  }).catch(() => {
    root.render(<main className="inicio" role="alert">
      <h1>No se pudo iniciar la API simulada</h1>
      <button onClick={iniciar}>Reintentar</button>
    </main>);
  });
}

iniciar();
