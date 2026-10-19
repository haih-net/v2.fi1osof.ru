import { theme } from 'app/Custom/theme'
import { styled } from '@linaria/react'
export const UsersViewStyled = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  h1 {
    margin: 0 0 8px;
    font-size: clamp(26px, 4vw, 34px);
  }
  .list-description {
    color: ${theme.colors.text.secondary};
    margin: 0 0 28px;
  }
`
export const UsersViewGridStyled = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
`
export const UsersViewCardStyled = styled.div`
  padding: 20px;
  border: 1px solid ${theme.colors.border};
  border-radius: 14px;
  background: white;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  > a {
    font-weight: 700;
    text-decoration: none;
  }
  > a:hover {
    text-decoration: underline;
  }
  time {
    color: ${theme.colors.text.secondary};
    font-size: 13px;
  }
  @media (max-width: 559px) {
    > a {
      flex-basis: 100%;
    }
    > span {
      display: none;
    }
  }
`
