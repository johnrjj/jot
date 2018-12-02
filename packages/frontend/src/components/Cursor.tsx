import React from 'react';
import styled, { keyframes } from 'styled-components';
import { lighten, desaturate, opacify, transparentize, getLuminance, darken } from 'polished';

const blink = keyframes`
  0% { opacity:1; }
  49% { opacity:1; }
  50% { opacity:0; }
  99% { opacity:0; }
  100% { opacity:1; }
`;

const popUpwards = keyframes`
  0% { 
    opacity:0;
    transform: matrix(.97, 0, 0, 1, 0, 12); 
  }
  20% { 
    opacity:0.7; 
    transform: matrix(.99, 0, 0, 1, 0, 2);
  }
  40% { 
    opacity:1;
    transform: matrix(1, 0, 0, 1, 0, -1); 
  }
  70% { 
    opacity:1;
    transform: matrix(1, 0, 0, 1, 0, 0); 
  }
  100% { 
    opacity:1;
    transform: matrix(1, 0, 0, 1, 0, 0); 
  }
`;

const ActiveMenu = styled.div`
  background-color: black;
  display: inline-block;
  visibility: visible;
  transition: top 75ms ease-out, left 75ms ease-out;
  animation: ${popUpwards} 180ms linear;
`;

const RemoteCursorRangeMark = styled.div`
  /* overflow: hidden; */
  position: absolute;
  min-width: 2px;
  width: 2px;
  /* height: 100%; */
  top: 0;
  left: ${props => (props.isCollapsedAtEnd ? '100%' : `calc(0px - 1px)`)};
  bottom: 0;
  background-color: ${props => darken(0.2, props.markerColor)};
`;

const SpanRelativeAnchor = styled.span`
  position: relative;
  pointer-events: none;
`;

const SpanRelativeAnchorWithBackgroundColor = styled.span`
  position: relative;
  pointer-events: none;
  background-color: ${props => transparentize(0.3, props.markerColor)};
`;

const AbsoluteFullWidth = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  user-select: none;
  min-width: 2px;
`;

const MARKER_HEIGHT = 12;
const MARKET_WIDTH = 6;
const CursorMarker = styled.span`
  position: absolute;
  width: ${MARKET_WIDTH};
  height: ${MARKER_HEIGHT};
  top: 0;
  left: ${props => (props.isCollapsedAtEnd ? '100%' : 0)};

  background-color: ${props => darken(0.2, props.markerColor)};
`;

export {
  CursorMarker,
  SpanRelativeAnchor,
  AbsoluteFullWidth,
  RemoteCursorRangeMark,
  SpanRelativeAnchorWithBackgroundColor,
  ActiveMenu,
};
