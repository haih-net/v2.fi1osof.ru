import type * as React from 'react'
import { ButtonStyled } from './styles'
export interface ButtonProps extends React.ComponentPropsWithRef<'button'> {
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'success' | 'ghost'
  size?: 'normal' | 'small'
}
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'normal',
  type = 'button',
  ...props
}) => (
  <ButtonStyled
    {...props}
    type={type}
    data-variant={variant}
    data-size={size}
  />
)
