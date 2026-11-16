import React from 'react';
import { Button, TPIcon, TPLibraryIcon } from '@dhspl-tatvacare/tesseract-ui';
import { ReactComponent as MoreIcon } from './icons/3-dots-more.svg';
import { ReactComponent as EndVisitIcon } from './icons/login.svg';
import { ReactComponent as CustomizeIcon } from './icons/setting.svg';
import { ReactComponent as VideoConsultIcon } from './icons/video-bulk.svg';
import RxActionTooltip from './RxActionTooltip';

export const headerIcon = (name, size = 20) => <TPIcon name={name} corner="rounded" variant="linear" size={size} />;
export const visitActionIcon = <EndVisitIcon width={20} height={20} aria-hidden="true" focusable="false" />;

function actionNode(action) {
    if (['tele', 'teleconsult', 'video-consult', 'letterhead'].includes(action.key)) {
        action = { ...action, ariaLabel: action.ariaLabel || action.label, label: undefined, variant: 'tonal', theme: 'neutral' };
    }
    if (['tele', 'teleconsult', 'video-consult'].includes(action.key)) {
        action = { ...action, theme: 'primary', icon: <VideoConsultIcon width={20} height={20} aria-hidden="true" focusable="false" /> };
    }
    if (action.label === 'Submit') action = { ...action, label: 'Visit', icon: visitActionIcon };
    if (action.node) return { key: action.key, type: 'node', node: action.node };
    const button = (
        <Button variant={action.variant || (action.label ? 'outline' : 'tonal')}
            theme={action.theme || (action.label ? 'primary' : 'neutral')}
            size="md" icon={!action.label ? action.icon : undefined}
            leftIcon={action.label ? action.icon : undefined}
            aria-label={action.ariaLabel || action.label}
            disabled={action.disabled} loading={action.loading}
            menu={action.menu} onClick={action.onClick} style={action.style}
            data-testid={action.testId}>
            {action.label}
        </Button>
    );
    const control = !action.label ? <RxActionTooltip title={action.ariaLabel} active={action.active}>{button}</RxActionTooltip> : button;
    return { key: action.key, type: 'node', node: action.wrap ? action.wrap(control) : control };
}

// Shared by the real header and the local CTA smoke-test page.
export function prescriptionHeaderActions({ tutorial, tools = [], smart = [], primary, visit, more, extras = [], previewEnabled = false }) {
    // Mode switching belongs outside the consultation header. Preview is reserved
    // for a later release; individual workflows retain their underlying handlers.
    smart = smart.filter(action => !['voice', 'voice-rx', 'snap', 'snap-rx', 'smart', 'smart-rx', 'repeat', 'repeat-rx'].includes(action.key) && (action.key !== 'preview' || previewEnabled));
    const result = [...extras];
    if (tutorial) result.push(actionNode(tutorial), { key: 'after-tutorial', type: 'divider' });
    result.push(...tools.map(action => actionNode(action.key === 'customize'
        ? { ...action, icon: <CustomizeIcon width={20} height={20} aria-hidden="true" focusable="false" /> }
        : action)));
    if (tools.length && (smart.length || visit || primary)) result.push({ key: 'after-tools', type: 'divider' });
    result.push(...smart.map(actionNode));
    if (smart.length && (visit || primary)) result.push({ key: 'before-visit', type: 'divider' });
    if (primary) result.push(actionNode({ ...primary, key: primary.key || 'primary', variant: 'solid', theme: 'primary' }));
    if (visit) {
        const endVisitIcon = <EndVisitIcon width={20} height={20} aria-hidden="true" focusable="false" />;
        // Use the requested arrow in the trailing slot instead of the default chevron.
        const trailingArrow = <TPLibraryIcon name="arrow-right4" family="arrow" corner="rounded" variant="linear" size={16} />;
        const menu = [
            { id: 'end-visit', label: 'End Visit', onClick: visit.onClick, shortcut: trailingArrow,
                disabled: visit.disabled || visit.loading || visit.endVisitDisabled },
            ...(visit.menu || []).filter(item => item.id !== 'end-visit').map(item =>
                ['draft', 'save-draft'].includes(item.id)
                    ? { ...item, icon: undefined, shortcut: trailingArrow }
                    : item),
        ];
        result.push(actionNode({ ...visit, key: 'visit', variant: 'solid', theme: 'primary', icon: endVisitIcon, menu }));
    }
    if (more) result.push(actionNode({ ...more, key: 'more', variant: 'ghost', theme: 'neutral',
        style: { ...more.style, width: 20, minWidth: 20, padding: 0 },
        icon: <MoreIcon width={20} height={20} style={{ transform: 'rotate(90deg)' }} aria-hidden="true" focusable="false" /> }));
    return result;
}
