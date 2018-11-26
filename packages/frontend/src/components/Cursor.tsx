import React from 'react';
import styled, { keyframes } from 'styled-components';

// blink
const blink = keyframes`
    0% { opacity:1; }
    49% { opacity:1; }
    50% { opacity:0; }
    99% { opacity:0; }
    100% { opacity:1; }
`;

const Cursor = styled.div`
  opacity: 1;
  animation: ${blink} 1s linear infinite;
`;

const RemoteCursorRangeMark = styled.div`
  overflow: hidden;
  position: absolute;
  width: 2px;
  height: 100%;
  top: 0;
  left: ${props => (props.isCollapsedAtEnd ? '100%' : 0)};
  bottom: 0;
  background-color: ${props => props.markerColor};
`;

const SpanRelativeAnchor = styled.span`
  position: relative;
`;

const SpanRelativeAnchorWithBackgroundColor = styled.span`
  position: relative;
  pointer-events: none;
  line-height: 2;
  background-color: ${props => props.markerColor};
`;

const AbsoluteFullWidth = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  user-select: none;
`;

const CursorMarker = styled.span`
  position: absolute;
  width: 5px;
  height: 10px;
  top: 0;
  left: 0;
  background-color: ${props => props.markerColor};
`;

const RemoteCursorCollaprsedMark = ({ children, ...rest }) => {
  return <div>{children}</div>;
};

export {
  CursorMarker,
  Cursor,
  SpanRelativeAnchor,
  AbsoluteFullWidth,
  RemoteCursorRangeMark,
  SpanRelativeAnchorWithBackgroundColor,
};
