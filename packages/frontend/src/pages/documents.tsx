import React, { Component, ReactChildren } from 'react';
import { Link, Redirect } from '@reach/router';

export default class Documents extends Component<any, any> {
  render() {
    return (
      <div>
        <DocLink id={'1'}>doc 1</DocLink>
        <DocLink id={'does_not_exist'}>Document that doesn't exist</DocLink>
      </div>
    );
  }
}

const DocLink = ({ id, children }: { id: string; children?: ReactChildren | string }) => (
  <Link to={`/docs/${id}`}>{children}</Link>
);
