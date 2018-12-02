import React, { Component, ReactChildren } from 'react';
import { Link } from '@reach/router';

const DocLink = ({ id, children }: { id: string; children?: ReactChildren | string }) => (
  <Link to={`/docs/${id}`}>{children}</Link>
);

class Documents extends Component<any, any> {
  render() {
    return (
      <div>
        <DocLink id={'1'}>doc 1</DocLink>
        <DocLink id={'does_not_exist'}>Document that doesn't exist</DocLink>
      </div>
    );
  }
}

export default Documents;
