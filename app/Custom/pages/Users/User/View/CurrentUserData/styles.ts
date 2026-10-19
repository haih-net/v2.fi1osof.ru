import { styled } from '@linaria/react'
import { theme } from 'app/Custom/theme'
export const CurrentUserDataRowStyled = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 16px 0;
  border-top: 1px solid ${theme.colors.border};
  .account-icon {
    flex-shrink: 0;
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    background: #f0f3ed;
  }
  .account-copy {
    flex: 1 1 180px;
    min-width: 0;
    display: grid;
    gap: 4px;
  }
  .account-copy span {
    color: ${theme.colors.text.secondary};
    font-size: 13px;
    overflow-wrap: anywhere;
  }
  .connected {
    font-size: 13px;
    color: #246a39;
    font-weight: 700;
  }
  > div:last-child {
    width: auto;
    max-width: 100%;
  }
`
export const CurrentUserDataStyled = styled.section`
  padding: 24px;
  border: 1px solid ${theme.colors.border};
  border-radius: 16px;
  background: white;
  min-width: 0;
  h2 {
    margin: 0 0 8px;
    font-size: 18px;
  }
  .section-description {
    color: ${theme.colors.text.secondary};
    font-size: 14px;
    margin: 0 0 20px;
  }
`
