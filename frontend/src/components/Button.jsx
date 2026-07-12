import './Button.css';

export default function Button({
  variant = 'primary',
  size = 'md',
  as: Comp = 'button',
  className = '',
  ...props
}) {
  return <Comp className={`btn btn--${variant} btn--${size} ${className}`} {...props} />;
}
