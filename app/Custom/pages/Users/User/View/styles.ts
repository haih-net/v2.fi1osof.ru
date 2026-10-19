import { theme } from 'app/Custom/theme'
import { styled } from '@linaria/react'
export const UserPageActionsStyled = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`
export const UserPageViewToolbarStyled = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 20px;
  padding: 24px;
  border: 1px solid ${theme.colors.border};
  border-radius: 16px;
  background: white;
  .profile-heading {
    flex: 1 1 180px;
    min-width: 0;
  }
  h1 {
    margin: 0 0 8px;
    font-size: clamp(24px, 4vw, 32px);
    line-height: 1.2;
    overflow-wrap: anywhere;
  }
  .profile-meta {
    color: ${theme.colors.text.secondary};
    font-size: 13px;
    margin: 8px 0 0;
  }
  .profile-avatar {
    width: 72px;
    height: 72px;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #edf1e8;
    color: ${theme.colors.primary};
    font-size: 26px;
    font-weight: 700;
  }
`
export const UserPageViewAvatarStyled = styled.img`
  border-radius: 50%;
  object-fit: cover;
  width: 72px;
  height: 72px;
  flex-shrink: 0;
`
export const UserPageViewInfoStyled = styled.section`
  padding: 24px;
  border: 1px solid ${theme.colors.border};
  border-radius: 16px;
  background: white;
  overflow-wrap: anywhere;
  h2 {
    margin: 0 0 16px;
    font-size: 18px;
  }
  .empty-profile {
    margin: 0;
    color: ${theme.colors.text.secondary};
  }
`
export const UserPageViewStyled = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 960px;
  margin: 0 auto;
  min-width: 0;
  gap: 20px;
  .back-link {
    font-size: 14px;
    color: ${theme.colors.text.secondary};
    align-self: flex-start;
    text-decoration: none;
  }
  .back-link:hover {
    color: ${theme.colors.primary};
    text-decoration: underline;
  }
`
