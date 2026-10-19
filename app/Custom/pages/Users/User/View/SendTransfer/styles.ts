import { styled } from '@linaria/react'

export const SendTransferStyled = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-top: 16px;
`

export const SendTransferHeaderStyled = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
`

export const SendTransferFormStyled = styled.form`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

export const SendTransferFieldStyled = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

export const SendTransferLabelStyled = styled.label`
  font-size: 13px;
  font-weight: 500;
  color: #555;
`

export const SendTransferInputStyled = styled.input`
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;

  &:disabled {
    opacity: 0.6;
    background: #eee;
  }

  &:focus {
    outline: none;
    border-color: #007bff;
  }
`

export const SendTransferActionsStyled = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 4px;
`

export const SendTransferErrorStyled = styled.div`
  color: #dc3545;
  font-size: 13px;
`

export const SendTransferSuccessStyled = styled.div`
  color: #28a745;
  font-size: 13px;
`
