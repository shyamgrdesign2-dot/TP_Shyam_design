import React, { forwardRef } from 'react';
import { Header, Toggle, TPLibraryIcon } from '@dhspl-tatvacare/tesseract-ui';
import { Dropdown } from 'antd';
import ProfilePopover from '../ProfilePopover';
import { prescriptionHeaderActions } from './prescriptionHeaderActions';
import styles from './HeaderPrescription.module.scss';
import './RxWorkflowHeader.scss';

// The shared shell accepts mode-specific actions; workflow handlers stay with their pages.
export default function RxWorkflowHeader({ patient, leading, actions, children, className = '', variant = 'voice-rx', ...props }) {
    return <>
        <Header data-rx-variant={variant} height={62} back backIconVariant="linear" {...props}
            className={`headerprescription headerprescription--new-ui rx-workflow-header ${styles.header} ${className}`}
            leading={leading || <ProfilePopover patient_data={patient} isPrescriptionPage tesseract />}
            actions={Array.isArray(actions) ? actions : prescriptionHeaderActions(actions || {})} />
        {children}
    </>;
}

export function rxClearAction(onClick, disabled = false) {
    return { ariaLabel: 'More prescription options',
        wrap: node => <Dropdown trigger={['click']} menu={{ items: [{ key: 'clear', label: 'Clear All', disabled, onClick,
            icon: <TPLibraryIcon name="eraser" family="design-tools" corner="rounded" variant="linear" size={18} /> }] }}>{node}</Dropdown> };
}

export const RxFulfilmentToggle = forwardRef(function RxFulfilmentToggle({ checked, onChange, label = 'PillUp', logo, help, disabled }, ref) {
    return <div ref={ref} className="rx-fulfilment-toggle" role="group" aria-label={`${label} fulfilment`}>
        <img src={logo} alt={label} className="rx-fulfilment-logo" />
        {help}
        <Toggle size="sm" checked={Boolean(checked)} onCheckedChange={onChange} disabled={disabled} ariaLabel={`${label} fulfilment`} />
    </div>;
});
