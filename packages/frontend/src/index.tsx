import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

const API_ENDPOINT_ROOT =
  process.env.NODE_ENV === 'development' ? 'http://localhost:3001/api/v0' : 'https://jot-api-prod.herokuapp.com/api/v0';

const WS_ENDPOINT =
  process.env.NODE_ENV === 'development' ? 'ws://localhost:3001/ws' : 'wss://jot-api-prod.herokuapp.com/ws';

ReactDOM.render(<App apiEndpoint={API_ENDPOINT_ROOT} wsEndpoint={WS_ENDPOINT} />, document.getElementById('app'));
