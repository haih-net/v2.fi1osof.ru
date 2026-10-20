import type React from 'react'
import { TextFieldStyled } from './styles'

export type TextFieldProps = React.ComponentPropsWithRef<'input'>
export const TextField: React.FC<TextFieldProps> = (props) => (
  <TextFieldStyled {...props} />
)
