import React from 'react';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFont,
  faQuoteRight,
  faBold,
  faItalic,
  faCode,
  faUnderline,
  faUndo,
  faRedo,
} from '@fortawesome/free-solid-svg-icons';

const FontIcon = props => <FontAwesomeIcon icon={faFont} {...props} />;
const QuoteIcon = props => <FontAwesomeIcon icon={faQuoteRight} {...props} />;
const BoldIcon = props => <FontAwesomeIcon icon={faBold} {...props} />;
const ItalicIcon = props => <FontAwesomeIcon icon={faItalic} {...props} />;
const CodeIcon = props => <FontAwesomeIcon icon={faCode} {...props} />;
const UnderlineIcon = props => <FontAwesomeIcon icon={faUnderline} {...props} />;
const UndoIcon = props => <FontAwesomeIcon icon={faUndo} {...props} />;
const RedoIcon = props => <FontAwesomeIcon icon={faRedo} {...props} />;

const Button = styled('span')`
  cursor: pointer;
  color: ${props => (props.reversed ? (props.active ? 'white' : '#aaa') : props.active ? 'black' : '#ccc')};
`;

// const Icon = styled(({ className, ...rest }) => {
//   return <span className={`material-icons ${className}`} {...rest} />;
// })`
//   font-size: 18px;
//   vertical-align: text-bottom;
// `;

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

export {
  Button,
  Menu,
  Toolbar,
  FontIcon,
  QuoteIcon,
  BoldIcon,
  ItalicIcon,
  CodeIcon,
  UnderlineIcon,
  RedoIcon,
  UndoIcon,
};
