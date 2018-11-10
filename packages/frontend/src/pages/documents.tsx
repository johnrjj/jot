import React, { Component } from 'react';
import { Link, Redirect } from '@reach/router';

export default class Documents extends Component<any, any> {
  render() {
    return (
      <div>
        <DocLink id={'1'} />
        <DocLink id={'does_not_exist'} />
      </div>
    );
  }
}

const DocLink = ({ id }: { id: string }) => (
  <div>
    <Link to={`/docs/${id}`}>{`Document ${id}`}</Link>
  </div>
);
