import { styled } from '@linaria/react'
import { theme } from 'app/Custom/theme'

export const SignInPageStyled = styled.section`
  box-sizing: border-box;
  width: calc(100% - 32px);
  max-width: 460px;
  margin: 40px auto;
  padding: 24px;
  border: 1px solid ${theme.colors.border};
  border-radius: 16px;
  background: ${theme.backgrounds.paper};
  h1 {
    margin: 0 0 12px;
  }
  > p {
    margin: 0 0 24px;
    color: ${theme.colors.text.secondary};
  }
  @media (min-width: 560px) {
    margin: 64px auto;
    padding: 36px;
  }
`
