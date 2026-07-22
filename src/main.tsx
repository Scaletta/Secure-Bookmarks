import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

document.documentElement.classList.add('popup-page');
document.body.classList.add('popup-page');
document.body.classList.remove('options-page');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
