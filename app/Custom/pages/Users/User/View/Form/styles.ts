import { FormStyled } from 'app/Custom/components/Form/styles'
import { styled } from '@linaria/react'
export const UserEditFormStyled = styled(FormStyled)`
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  label {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  input {
    padding: 8px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
  }
  fieldset {
    border: 0;
    padding: 0;
    margin: 0;
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
    > * {
      min-width: 0;
    }
  }
`
