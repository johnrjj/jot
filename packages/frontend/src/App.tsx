import React, { Component } from 'react';
import { Router, Redirect } from '@reach/router';
import DocEdit from './pages/doc-edit';

export default class App extends Component<any, any> {
  render() {
    return (
      <Router>
        <Home path="/" />
        <DocEdit
          path="doc/:docId"
          apiEndpoint={this.props.apiEndpoint}
          wsEndpoint={this.props.wsEndpoint}
        />
      </Router>
    );
  }
}

const Home = ({ path }) => <Redirect to="doc/1" />;
