import React from 'react';
import ReactDOM from 'react-dom/client';
import OptionsApp from './OptionsApp';
import './styles.css';

document.documentElement.classList.add('options-page');
document.body.classList.add('options-page');
document.body.classList.remove('popup-page');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <OptionsApp />
  </React.StrictMode>,
);
