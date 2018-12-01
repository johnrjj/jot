// from react-portal-tooltip
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ReactDOM, { unstable_renderSubtreeIntoContainer as renderSubtreeIntoContainer } from 'react-dom';

const FG_SIZE = 8;
const BG_SIZE = 9;

interface CardProps {
  active: boolean;
  position: 'top' | 'right' | 'bottom' | 'left';
  arrow?: 'center' | 'top' | 'right' | 'bottom' | 'left';
  align?: 'center' | 'right' | 'left';
  style: any;
  useHover: boolean;
  parentEl: any;
}

interface CardState {
  hover: boolean;
  transition: 'opacity' | 'all';
  width: number;
  height: number;
}

class Card extends Component<CardProps, CardState> {
  MARGIN_SPACING = 15;

  defaultArrowStyle = {
    color: '#fff',
    borderColor: 'rgba(0,0,0,.4)',
  };

  static defaultProps = {
    active: false,
    position: 'right',
    arrow: null,
    align: null,
    style: { style: {}, arrowStyle: {} },
    useHover: true,
  };

  constructor(props) {
    super(props);
    this.state = {
      hover: false,
      transition: 'opacity',
      width: 0,
      height: 0,
    };
  }

  getGlobalStyle() {
    if (!this.props.parentEl) {
      return { display: 'none' };
    }

    const style = {
      position: 'absolute',
      padding: '5px',
      background: '#fff',
      boxShadow: '0 0 8px rgba(0,0,0,.3)',
      borderRadius: '3px',
      //   transition: `${this.state.transition} .01s ease-in-out, visibility .01s ease-in-out`,
      opacity: this.state.hover || this.props.active ? 1 : 0,
      visibility: this.state.hover || this.props.active ? 'visible' : 'hidden',
      zIndex: 50,
      ...this.getStyle(this.props.position, this.props.arrow),
    };

    return this.mergeStyle(style, this.props.style.style);
  }
  getBaseArrowStyle() {
    return {
      position: 'absolute',
      content: '""',
      //   transition: 'all .3s ease-in-out',
    };
  }
  getArrowStyle() {
    let fgStyle: any = this.getBaseArrowStyle();
    let bgStyle: any = this.getBaseArrowStyle();
    fgStyle.zIndex = 60;
    bgStyle.zIndex = 55;

    let arrowStyle = { ...this.defaultArrowStyle, ...this.props.style.arrowStyle };
    let bgBorderColor = arrowStyle.borderColor ? arrowStyle.borderColor : 'transparent';

    let fgColorBorder = `10px solid ${arrowStyle.color}`;
    let fgTransBorder = `${FG_SIZE}px solid transparent`;
    let bgColorBorder = `11px solid ${bgBorderColor}`;
    let bgTransBorder = `${BG_SIZE}px solid transparent`;

    let { position, arrow } = this.props;

    if (position === 'left' || position === 'right') {
      fgStyle.top = '50%';
      fgStyle.borderTop = fgTransBorder;
      fgStyle.borderBottom = fgTransBorder;
      fgStyle.marginTop = -7;

      bgStyle.borderTop = bgTransBorder;
      bgStyle.borderBottom = bgTransBorder;
      bgStyle.top = '50%';
      bgStyle.marginTop = -8;

      if (position === 'left') {
        fgStyle.right = -10;
        fgStyle.borderLeft = fgColorBorder;
        bgStyle.right = -11;
        bgStyle.borderLeft = bgColorBorder;
      } else {
        fgStyle.left = -10;
        fgStyle.borderRight = fgColorBorder;
        bgStyle.left = -11;
        bgStyle.borderRight = bgColorBorder;
      }

      if (arrow === 'top') {
        fgStyle.top = this.MARGIN_SPACING;
        bgStyle.top = this.MARGIN_SPACING;
      }
      if (arrow === 'bottom') {
        fgStyle.top = null;
        fgStyle.bottom = this.MARGIN_SPACING - 7;
        bgStyle.top = null;
        bgStyle.bottom = this.MARGIN_SPACING - 8;
      }
    } else {
      fgStyle.left = Math.round(this.state.width / 2 - FG_SIZE);
      fgStyle.borderLeft = fgTransBorder;
      fgStyle.borderRight = fgTransBorder;
      fgStyle.marginLeft = 0;
      bgStyle.left = fgStyle.left - 1;
      bgStyle.borderLeft = bgTransBorder;
      bgStyle.borderRight = bgTransBorder;
      bgStyle.marginLeft = 0;

      if (position === 'top') {
        fgStyle.bottom = -10;
        fgStyle.borderTop = fgColorBorder;
        bgStyle.bottom = -11;
        bgStyle.borderTop = bgColorBorder;
      } else {
        fgStyle.top = -10;
        fgStyle.borderBottom = fgColorBorder;
        bgStyle.top = -11;
        bgStyle.borderBottom = bgColorBorder;
      }

      if (arrow === 'right') {
        fgStyle.left = null;
        fgStyle.right = this.MARGIN_SPACING + 1 - FG_SIZE;
        bgStyle.left = null;
        bgStyle.right = this.MARGIN_SPACING - FG_SIZE;
      }
      if (arrow === 'left') {
        fgStyle.left = this.MARGIN_SPACING + 1 - FG_SIZE;
        bgStyle.left = this.MARGIN_SPACING - FG_SIZE;
      }
    }

    let { color, borderColor, ...propsArrowStyle } = this.props.style.arrowStyle;

    return {
      fgStyle: this.mergeStyle(fgStyle, propsArrowStyle),
      bgStyle: this.mergeStyle(bgStyle, propsArrowStyle),
    };
  }
  mergeStyle(style, theme) {
    if (theme) {
      let { position, top, left, right, bottom, marginLeft, marginRight, ...validTheme } = theme;

      return {
        ...style,
        ...validTheme,
      };
    }

    return style;
  }
  getStyle(position, arrow) {
    let alignOffset = 0;
    let parent = this.props.parentEl;
    let align = this.props.align;
    let tooltipPosition = parent.getBoundingClientRect();
    let scrollY = window.scrollY !== undefined ? window.scrollY : window.pageYOffset;
    let scrollX = window.scrollX !== undefined ? window.scrollX : window.pageXOffset;
    let top = scrollY + tooltipPosition.top;
    let left = scrollX + tooltipPosition.left;
    let style = {} as any;

    const parentSize = {
      width: parent.offsetWidth,
      height: parent.offsetHeight,
    };

    // fix for svg
    if (!parent.offsetHeight && parent.getBoundingClientRect) {
      parentSize.width = parent.getBoundingClientRect().width;
      parentSize.height = parent.getBoundingClientRect().height;
    }

    if (align === 'left') {
      alignOffset = -parentSize.width / 2 + FG_SIZE;
    } else if (align === 'right') {
      alignOffset = parentSize.width / 2 - FG_SIZE;
    }

    const stylesFromPosition = {
      left: () => {
        style.top = top + parentSize.height / 2 - this.state.height / 2;
        style.left = left - this.state.width; //- this.MARGIN_SPACING;
      },
      right: () => {
        style.top = top + parentSize.height / 2 - this.state.height / 2;
        style.left = left + parentSize.width; //+ this.MARGIN_SPACING;
      },
      top: () => {
        // style.left = left - this.state.width / 2 + parentSize.width / 2 + alignOffset;
        // style.top = top - this.state.height - this.MARGIN_SPACING;
        style.left = left;
        style.top = top - this.state.height;
      },
      bottom: () => {
        style.left = left - this.state.width / 2 + parentSize.width / 2; //+ alignOffset;
        style.top = top + parentSize.height; //+ this.MARGIN_SPACING;
      },
    };

    const stylesFromArrow = {
      left: () => {
        style.left = left + parentSize.width / 2 - this.MARGIN_SPACING + alignOffset;
      },
      right: () => {
        style.left = left - this.state.width + parentSize.width / 2 + this.MARGIN_SPACING + alignOffset;
      },
      top: () => {
        style.top = top + parentSize.height / 2 - this.MARGIN_SPACING;
      },
      bottom: () => {
        style.top = top + parentSize.height / 2 - this.state.height + this.MARGIN_SPACING;
      },
    };

    executeFunctionIfExist(stylesFromPosition, position);
    executeFunctionIfExist(stylesFromArrow, arrow);

    return style;
  }
  checkWindowPosition(style, arrowStyle) {
    if (this.props.position === 'top' || this.props.position === 'bottom') {
      if (style.left < 0) {
        const parent = this.props.parentEl;
        if (parent) {
          const tooltipWidth = this.state.width;
          let bgStyleRight = arrowStyle.bgStyle.right;
          // For arrow = center
          if (!bgStyleRight) {
            bgStyleRight = tooltipWidth / 2 - BG_SIZE;
          }
          const newBgRight = Math.round(bgStyleRight - style.left + this.MARGIN_SPACING);
          arrowStyle = {
            ...arrowStyle,
            bgStyle: {
              ...arrowStyle.bgStyle,
              right: newBgRight,
              left: null,
            },
            fgStyle: {
              ...arrowStyle.fgStyle,
              right: newBgRight + 1,
              left: null,
            },
          };
        }
        style.left = this.MARGIN_SPACING;
      } else {
        let rightOffset = style.left + this.state.width - window.innerWidth;
        if (rightOffset > 0) {
          let originalLeft = style.left;
          style.left = window.innerWidth - this.state.width - this.MARGIN_SPACING;
          arrowStyle.fgStyle.marginLeft += originalLeft - style.left;
          arrowStyle.bgStyle.marginLeft += originalLeft - style.left;
        }
      }
    }

    return { style, arrowStyle };
  }
  handleMouseEnter = () => {
    this.props.active && this.props.useHover && this.setState({ hover: true });
  };
  handleMouseLeave = () => {
    this.setState({ hover: false });
  };
  componentDidMount() {
    this.updateSize();
  }
  componentWillReceiveProps() {
    this.setState({ transition: this.state.hover || this.props.active ? 'all' : 'opacity' }, () => {
      this.updateSize();
    });
  }
  updateSize() {
    let self: any = ReactDOM.findDOMNode(this);
    this.setState({
      width: self.offsetWidth,
      height: self.offsetHeight,
    });
  }
  render() {
    let { style, arrowStyle } = this.checkWindowPosition(this.getGlobalStyle(), this.getArrowStyle());

    return (
      <div style={style} onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
        {this.props.arrow ? (
          <div>
            <span style={arrowStyle.fgStyle} />
            <span style={arrowStyle.bgStyle} />
          </div>
        ) : null}
        {this.props.children}
      </div>
    );
  }
}

var portalNodes = {};

interface ToolTipProps {
  parent: string | object;
  active: boolean;
  position?: string;
  align?: string;
  group: string;
  tooltipTimeout: number;
  autoHide: boolean;
}

interface ToolTipState {}

export default class ToolTip extends Component<ToolTipProps, ToolTipState> {
  static defaultProps = {
    active: false,
    autoHide: false,
    group: 'main',
    tooltipTimeout: 500,
  };
  componentDidMount() {
    if (!this.props.active) {
      return;
    }

    this.renderPortal(this.props);
  }
  componentWillReceiveProps(nextProps) {
    if ((!portalNodes[this.props.group] && !nextProps.active) || (!this.props.active && !nextProps.active)) {
      return;
    }

    let props = { ...nextProps };
    let newProps = { ...nextProps };

    if (portalNodes[this.props.group] && portalNodes[this.props.group].timeout) {
      clearTimeout(portalNodes[this.props.group].timeout);
    }

    if (this.props.active && !props.active) {
      newProps.active = true;
      portalNodes[this.props.group].timeout = setTimeout(() => {
        props.active = false;
        this.renderPortal(props);
      }, this.props.tooltipTimeout);
    }

    this.renderPortal(newProps);
  }
  componentWillUnmount() {
    console.warn('TooltipUnmounting');
    if (portalNodes[this.props.group]) {
      try {
        ReactDOM.unmountComponentAtNode(portalNodes[this.props.group].node);
        clearTimeout(portalNodes[this.props.group].timeout);
        // document.body.removeChild(portalNodes[this.props.group].node);
      } catch (e) {
        console.error('Error unmounting tooltip', e);
        throw e;
      }
    }
  }
  createPortal() {
    portalNodes[this.props.group] = {
      node: document.createElement('div'),
      timeout: false,
    };
    portalNodes[this.props.group].node.className = 'ToolTipPortal';
    document.body.appendChild(portalNodes[this.props.group].node);
  }
  renderPortal(props) {
    if (!portalNodes[this.props.group]) {
      this.createPortal();
    }
    let { parent, ...other } = props;
    let parentEl = typeof parent === 'string' ? document.querySelector(parent) : parent;
    renderSubtreeIntoContainer(this, <Card parentEl={parentEl} {...other} />, portalNodes[this.props.group].node);
  }
  shouldComponentUpdate() {
    return false;
  }
  render() {
    return null;
  }
}

const executeFunctionIfExist = (object, key) => {
  if (Object.prototype.hasOwnProperty.call(object, key)) {
    object[key]();
  }
};

// export class StatefulToolTip extends Component {
//   static propTypes = {
//     className: PropTypes.string,
//   };

//   static defaultProps = {
//     className: '',
//   };

//   state = {
//     tooltipVisible: false,
//   };

//   onMouseEnter = () => {
//     this.setState({ tooltipVisible: true });
//   };

//   onMouseLeave = () => {
//     this.setState({ tooltipVisible: false });
//   };

//   render() {
//     const { children, className, parent, ...props } = this.props;

//     return [
//       <span
//         className={className}
//         onMouseEnter={this.onMouseEnter}
//         onMouseLeave={this.onMouseLeave}
//         ref={p => (this.parent = p)}
//         key="parent"
//       >
//         {this.props.parent}
//       </span>,
//       this.parent ? (
//         <ToolTip {...props} active={this.state.tooltipVisible} parent={this.parent} key="tooltip">
//           {this.props.children}
//         </ToolTip>
//       ) : null,
//     ];
//   }
// }
