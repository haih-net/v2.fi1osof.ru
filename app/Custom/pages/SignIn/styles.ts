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

export const SignInRegistrationStyled = styled.div`
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid ${theme.colors.border};
  text-align: center;

  > p {
    margin: 0 0 12px;
    color: ${theme.colors.text.primary};
  }

  > a {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 46px;
    padding: 10px 16px;
    border: 1px solid ${theme.colors.primary};
    border-radius: 10px;
    color: ${theme.colors.primary};
    font-weight: 700;
    text-decoration: none;

    &:hover {
      background: #f0f3ed;
    }

    &:focus-visible {
      outline: 3px solid #8eae9b;
      outline-offset: 3px;
    }
  }
`
