import React, { Component } from 'react';
import { Router, Redirect } from '@reach/router';
import DocEdit from './pages/document';
import Documents from './pages/documents';
import uuid from 'uuid/v4';

interface AppState {
  clientId: string;
  error?: Error | string;
}

interface AppProps {
  apiEndpoint: string;
  wsEndpoint: string;
}

export default class App extends Component<AppProps, AppState> {
  constructor(props: AppProps) {
    super(props);
    this.state = {
      clientId: uuid(),
    };
  }

  componentDidCatch(e) {
    console.error('App Error Boundary: Caught error', e);
    throw e;
  }

  render() {
    const { apiEndpoint, wsEndpoint } = this.props;
    const { clientId } = this.state;
    return (
      <Router>
        <Home path="/" />
        <Documents path="/docs" />
        <DocEdit path="docs/:docId" apiEndpoint={apiEndpoint} clientId={clientId} wsEndpoint={wsEndpoint} />
      </Router>
    );
  }
}

const Home = ({ path }) => <Redirect to="docs/1" noThrow />;
