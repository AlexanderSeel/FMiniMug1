import React from 'react';
import ReactDOM from 'react-dom/client';
import {FM1Virtual} from './FM1Virtual';
import {FM1InputBridge} from './FM1InputBridge';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FM1Virtual/>
    <FM1InputBridge/>
  </React.StrictMode>
);
