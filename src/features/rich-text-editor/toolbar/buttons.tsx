import { IonIcon } from '@ionic/react';
type ToolbarButtonProps = {
  ariaLabel: string;
  icon: string;
  disabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  isActive?: boolean;
};

export function Divider() {
  return <div className="divider" />;
}

export function ToolbarButton({
  ariaLabel,
  icon,
  disabled = false,
  isActive = false,
  onClick
}: ToolbarButtonProps) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={'toolbar-item ' + (isActive ? 'active' : '')}
      aria-label={ariaLabel}
    >
      <IonIcon className="format" src={icon}></IonIcon>
    </button>
  );
}
