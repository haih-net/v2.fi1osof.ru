import { styled } from '@linaria/react'
export const UserStatusStyled = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border-radius: 999px;
  padding: 6px 11px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.5;
  white-space: nowrap;
  background: #eaf6ed;
  color: #246a39;
  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }
  &[data-status='blocked'] {
    background: #ffe8e5;
    color: #a52c2c;
  }
  &[data-status='newbie'] {
    background: #fff3d1;
    color: #79500a;
  }
`
export const UserStatusActionsStyled = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  [role='alert'] {
    flex-basis: 100%;
    color: #a52c2c;
    font-size: 13px;
    margin: 0;
  }
`
