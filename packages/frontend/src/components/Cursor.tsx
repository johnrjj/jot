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
  background-color: green;
`;

const SpanRelativeAnchor = styled.span`
  position: relative;
`;

const SpanRelativeAnchorWithBackgroundColor = styled.span`
  position: relative;
  pointer-events: none;
  background-color: rgba(138, 208, 222, 0.3);
`;

const AbsoluteFullWidth = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  user-select: none;
`;

const TinyGreenMarker = styled.span`
  position: absolute;
  width: 5px;
  height: 10px;
  top: 0;
  left: 0;
  background-color: green;
`;

const RemoteCursorCollaprsedMark = ({ children, ...rest }) => {
  return <div>{children}</div>;
};

export {
  TinyGreenMarker,
  Cursor,
  SpanRelativeAnchor,
  AbsoluteFullWidth,
  RemoteCursorRangeMark,
  SpanRelativeAnchorWithBackgroundColor,
};

// export default class Cursor extends Component {

//   static propTypes = {
//     blink: PropTypes.bool,
//     show: PropTypes.bool,
//     element: PropTypes.node,
//     hideWhenDone: PropTypes.bool,
//     hideWhenDoneDelay: PropTypes.number,
//     isDone: PropTypes.bool,
//   }

//   static defaultProps = {
//     blink: true,
//     show: true,
//     element: '|',
//     hideWhenDone: false,
//     hideWhenDoneDelay: 1000,
//     isDone: false,
//   }

//   constructor(props) {
//     super(props);
//     this._isReRenderingCursor = false;
//     this.state = {
//       shouldRender: this.props.show,
//     };
//   }

//   componentWillReceiveProps(nextProps) {
//     const shouldHide = !this.props.isDone && nextProps.isDone && this.props.hideWhenDone;
//     if (shouldHide) {
//       setTimeout(() => this.setState({ shouldRender: false }), this.props.hideWhenDoneDelay);
//     }
//   }

//   componentDidUpdate() {
//     const { show, isDone } = this.props;
//     if (!show) { return; }
//     if (isDone) { return; }
//     if (this._isReRenderingCursor) { return; }

//     // In webkit and blink, rendering the cursor alongside the text as it
//     // animates sometimes causes the text to stop rendering when it reaches
//     // a new line break, even though the underlying DOM /does/ contain
//     // the text. This seems to happen when the space available for the text is
//     // at a specific width that makes it so the line break happens within a
//     // word.
//     // Using dev tools, when in this state, if you modify the dom or any style,
//     // it immediately renders all of the text in its correct position.
//     // Given that observation, this is a hackish solutions that re-renders the
//     // cursor every time a character is rendered, just to ensure that the text
//     // is rendered correctly.
//     // See #13 and #15 for more details
//     this._reRenderCursor();
//   }

//   _reRenderCursor() {
//     this._isReRenderingCursor = true;
//     this.setState({ shouldRender: false }, () => {
//       this.setState({ shouldRender: true }, () => {
//         this._isReRenderingCursor = false;
//       });
//     });
//   }

//   render() {
//     if (this.state.shouldRender) {
//       const className = this.props.blink ? ' Cursor--blinking' : '';
//       return (
//         <span className={`Cursor${className}`}>
//           {this.props.element}
//         </span>
//       );
//     }
//     return null;
//   }

// }
