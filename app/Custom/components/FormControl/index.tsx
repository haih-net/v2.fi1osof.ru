import type React from 'react'
import {
  FormControlStyled,
  FormControlLabel,
  FormControlHelperText,
  FormControlToolbar,
  FormControlContent,
} from './styles'

export interface FormControlProps {
  children: React.ReactNode
  label?: React.ReactNode
  helperText?: React.ReactNode
  required?: boolean
  error?: boolean
  disabled?: boolean
  toolbarAfter?: React.ReactNode
  htmlFor?: string
}
export const FormControl: React.FC<FormControlProps> = ({
  children,
  label,
  helperText,
  required,
  error,
  disabled,
  toolbarAfter,
  htmlFor,
}) => (
  <FormControlStyled data-error={error} data-disabled={disabled}>
    <FormControlToolbar>
      {label && (
        <FormControlLabel htmlFor={htmlFor}>
          {label}
          {required && <span aria-hidden="true"> *</span>}
        </FormControlLabel>
      )}
      {toolbarAfter}
    </FormControlToolbar>
    <FormControlContent>{children}</FormControlContent>
    {helperText && (
      <FormControlHelperText role={error ? 'alert' : undefined}>
        {helperText}
      </FormControlHelperText>
    )}
  </FormControlStyled>
)
