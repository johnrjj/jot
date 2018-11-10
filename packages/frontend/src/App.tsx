import React, { Component } from 'react';
import { Router, Redirect } from '@reach/router';
import DocEdit from './pages/document';
import Documents from './pages/documents';

interface AppState {
  clientId?: string;
  error?: Error | string;
}

interface AppProps {
  apiEndpoint: string;
  wsEndpoint: string;
}

export default class App extends Component<AppProps, AppState> {
  componentDidCatch(e) {
    console.error('App Error Boundary: Caught error', e);
    throw e;
  }

  render() {
    return (
      <Router>
        <Home path="/" />
        <Documents path="/docs" />
        <DocEdit
          path="docs/:docId"
          apiEndpoint={this.props.apiEndpoint}
          wsEndpoint={this.props.wsEndpoint}
        />
      </Router>
    );
  }
}

const Home = ({ path }) => <Redirect to="docs/1" noThrow />;
