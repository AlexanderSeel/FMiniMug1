import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import {WorkstationPrototype} from './WorkstationPrototype';
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WorkstationPrototype/>
    <App/>
  </React.StrictMode>
);
