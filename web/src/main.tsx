import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import {WorkstationPrototype} from './WorkstationPrototype';
import {WorkstationSceneBar} from './WorkstationSceneBar';
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WorkstationSceneBar/>
    <WorkstationPrototype/>
    <App/>
  </React.StrictMode>
);
