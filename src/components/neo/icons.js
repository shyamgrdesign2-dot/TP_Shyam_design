import React from 'react';
import {
  ArrowRight2,
  Bluetooth,
  Calendar1,
  ClipboardText,
  CloseSquare,
  Copy,
  DocumentText,
  Element,
  Flash,
  Health,
  LampOn,
  MagicStar,
  Microphone2,
  Refresh,
  SearchNormal,
  Setting2,
  TickCircle,
  Trash,
  User,
  VolumeHigh,
} from 'iconsax-reactjs';

export const NEO_ICON_VARIANT = 'Linear';

export function NeoIcon({
  icon: Icon,
  size = 20,
  color = 'currentColor',
  className,
  style,
  ...rest
}) {
  if (!Icon) return null;
  return (
    <Icon
      variant={NEO_ICON_VARIANT}
      size={size}
      color={color}
      className={className}
      style={style}
      {...rest}
    />
  );
}

const wrap = (Icon) => (props) => <NeoIcon icon={Icon} {...props} />;

export const NeoMicIcon = wrap(Microphone2);
export const NeoArrowRightIcon = wrap(ArrowRight2);
export const NeoCheckCircleIcon = wrap(TickCircle);
export const NeoCopyIcon = wrap(Copy);
export const NeoRefreshIcon = wrap(Refresh);
export const NeoTrashIcon = wrap(Trash);
export const NeoFlashIcon = wrap(Flash);
export const NeoBulbIcon = wrap(LampOn);
export const NeoHeartIcon = wrap(Health);
export const NeoCalendarIcon = wrap(Calendar1);
export const NeoClipboardIcon = wrap(ClipboardText);
export const NeoUserIcon = wrap(User);
export const NeoVolumeIcon = wrap(VolumeHigh);
export const NeoDocumentIcon = wrap(DocumentText);
export const NeoSparkleIcon = wrap(MagicStar);
export const NeoBluetoothIcon = wrap(Bluetooth);
export const NeoCloseIcon = wrap(CloseSquare);
export const NeoSettingIcon = wrap(Setting2);
export const NeoSearchIcon = wrap(SearchNormal);
export const NeoFlaskIcon = wrap(Element);

/** Medication — iconsax has no pill glyph; same inline SVG as Tatva Pendant note icons. */
export function NeoPillIcon({ size = 20, color = 'currentColor', className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
      <path d="m8.5 8.5 7 7" />
    </svg>
  );
}
