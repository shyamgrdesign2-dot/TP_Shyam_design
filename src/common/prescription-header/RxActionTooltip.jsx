import React, { forwardRef, useState } from 'react';
import { Tooltip } from 'antd';

// A hover hint never competes with the control's open popover, drawer or dialog.
const RxActionTooltip = forwardRef(function RxActionTooltip({ title, active = false, children, placement = 'bottom', ...props }, ref) {
    const [hovered, setHovered] = useState(false);
    const [clicked, setClicked] = useState(false);
    return <Tooltip title={title} placement={placement} open={Boolean(title) && hovered && !clicked && !active} trigger={[]}>
        <span {...props} ref={ref} className={`d-inline-flex ${props.className || ''}`}
            onMouseEnter={event => { setHovered(true); props.onMouseEnter?.(event); }}
            onMouseLeave={event => { setHovered(false); setClicked(false); props.onMouseLeave?.(event); }}
            onClickCapture={event => { setClicked(true); props.onClickCapture?.(event); }}>
            {children}
        </span>
    </Tooltip>;
});
export default RxActionTooltip;
