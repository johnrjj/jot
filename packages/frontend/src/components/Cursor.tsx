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
import { lighten, desaturate, opacify, transparentize, getLuminance, darken } from 'polished';

const RemoteCursorRangeMark = styled.div`
  overflow: hidden;
  position: absolute;
  width: 2px;
  height: 100%;
  top: 0;
  left: ${props => (props.isCollapsedAtEnd ? '100%' : 0)};
  bottom: 0;
  background-color: ${props => darken(0.3, props.markerColor)};
`;

const SpanRelativeAnchor = styled.span`
  position: relative;
`;

const SpanRelativeAnchorWithBackgroundColor = styled.span`
  position: relative;
  pointer-events: none;
  line-height: 2;
  background-color: ${props => transparentize(0.3, props.markerColor)};
`;

const AbsoluteFullWidth = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  user-select: none;
`;

const MARKER_HEIGHT = 12;
const MARKET_WIDTH = 6;
const CursorMarker = styled.span`
  position: absolute;
  width: ${MARKET_WIDTH};
  height: ${MARKER_HEIGHT};
  top: -${MARKER_HEIGHT / 2};
  left: -${MARKET_WIDTH / 2};
  background-color: ${props => darken(0.2, props.markerColor)};
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
