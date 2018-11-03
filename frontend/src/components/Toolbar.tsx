import React from 'react';
import styled from 'styled-components';
export const Button = styled('span')`
  cursor: pointer;
  color: ${props =>
    props.reversed ? (props.active ? 'white' : '#aaa') : props.active ? 'black' : '#ccc'};
`;

const Icon = styled(({ className, ...rest }) => {
  return <span className={`material-icons ${className}`} {...rest} />;
})`
  font-size: 18px;
  vertical-align: text-bottom;
`;

const Menu = styled('div')`
  & > * {
    display: inline-block;
  }

  & > * + * {
    margin-left: 15px;
  }
`;

const Toolbar = styled(Menu)`
  position: relative;
  padding: 1px 18px 17px;
  margin: 0 -20px;
  border-bottom: 2px solid #eee;
  margin-bottom: 20px;
`;
export { Icon, Menu, Toolbar };
