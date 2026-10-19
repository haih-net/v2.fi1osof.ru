import { theme } from 'app/Custom/theme'
import { styled } from '@linaria/react'

export const GetReferrerTokenTextStyled = styled.div`
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1 1 100%;
  @media (min-width: 560px) {
    flex: 1;
  }
  min-width: 0;
`

export const GetReferrerTokenRowStyled = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  min-width: 0;
  gap: 10px;
`

export const GetReferrerTokenStyled = styled.section`
  padding: 24px;
  border: 1px solid ${theme.colors.border};
  border-radius: 16px;
  background: white;
  h2 {
    margin: 0;
    font-size: 18px;
  }
  .section-description {
    margin: 0;
    color: ${theme.colors.text.secondary};
    font-size: 14px;
  }
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 15px;
`
