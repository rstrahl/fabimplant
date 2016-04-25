import React from 'react';
import { findDOMNode } from 'react-dom';
import { bind } from 'decko';

export default class BoundedRangeInput extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			value: { min:0, max:1 }
		};
	}

	componentWillReceiveProps(nextProps) {
		let { value } = nextProps;
		if (value) {
			this.setState({ value });
		}
	}

	componentDidUpdate() {
		this.updateSize();
	}

	componentDidMount() {
		if (this.props.vertical) {
			findDOMNode(this).setAttribute('vertical', true);
		}
		this.updateSize();
	}

	render() {
		let { vertical } = this.props,
			{ value: { min, max } } = this.state;
		let offset = vertical ? 'bottom' : 'left',
			width = vertical ? 'height' : 'width',
			innerStyle = {
				[offset]: (min * 100) + '%',
				[width]: (max - min) * 100 + '%'
			};
		return (
			<div className="bounded-range">
				<div className="bounded-range inner" style={innerStyle}>
					<Hooker className="bounded-range min" onDrag={this.startChange} onDragStart={this.dragStart} />
					<Hooker className="bounded range content" onDrag={this.move} onDragStart={this.dragStart}>
					</Hooker>
					<Hooker className="bounded-range max" onDrag={this.endChange} onDragStart={this.dragStart} />
				</div>
			</div>
		);
	}

	updateSize() {
		let vert = this.props.vertical,
			w = vert ? 'offsetHeight' : 'offsetWidth',
			l = vert ? 'offsetTop' : 'offsetLeft';
		this.size = findDOMNode(this)[w];
		let min = findDOMNode(this).querySelector(vert?'.max':'.min');
		this.handleSize = min[w] + min[l];
	}

	setValue({ min=0, max=1 }, done) {
		let value = { min, max };
		this.setState({ value });
		let { onChange, onInput } = this.props,
			evt = { target:this, value };
		if (onInput) onInput(evt);
		if (done && onChange) onChange(evt);
	}

	@bind
	dragStart() {
		let { min, max } = this.state.value;
		this.setState({ preDragValue: { min, max } });
	}

	@bind
	startChange({ x, y, done }, set) {
		let { value, preDragValue } = this.state,
			dim = this.props.vertical ? -y : x,
			offset = dim / (this.size - this.handleSize*2),
			p = preDragValue.min + offset,
			max = (value.max || value.max===0) ? value.max : 1;
		value.min = Math.max(0, Math.min(max, p));
		if (set!==false) this.setValue(value, done);
	}

	@bind
	endChange({ x, y, done }) {
		let { value, preDragValue } = this.state,
			dim = this.props.vertical ? -y : x,
			offset = dim / (this.size - this.handleSize*2),
			p = preDragValue.max + offset;
		value.max = Math.max(value.min || 0, Math.min(1, p));
		this.setValue(value, done);
	}

	@bind
	move({ x, y, done }) {
		this.startChange({ x, y }, false);
		this.endChange({ x, y, done });
	}

}

class Hooker extends React.Component {

	render() {
		let { onDrag, onDragging, onDragEnd, children, ...props } = this.props;
		return (
			<div {...props} onMouseDown={this.handler}>
				{ children }
			</div>
		);
	}

	@bind
	handler(e) {
		let { onDragging, onDrag, onDragStart, onDragEnd } = this.props,
			start;
		function diff(e, done) {
			let evt = {
					x: e.pageX - start.pageX,
					y: e.pageY - start.pageY,
					done
				},
				fn = done ? onDragEnd : onDragging;
			if (onDrag) onDrag(evt);
			if (fn) fn(evt);
		}
		function move(e) {
			if (!start) {
				start = e;
				if (onDragStart) onDragStart();
			}
			diff(e, false);
		}
		function up(e) {
			removeEventListener('mousemove', move);
			removeEventListener('mouseup', up);
			if (start) diff(e, true);
			start = null;
		}
		addEventListener('mousemove', move);
		addEventListener('mouseup', up);
		return e.preventDefault(), false;
	}

}
