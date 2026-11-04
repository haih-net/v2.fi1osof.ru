import { styled } from '@linaria/react'
import { theme } from 'app/Custom/theme'

export const AdminErrorsStyled = styled.section`
  padding: 24px 16px;
  max-width: 1440px;
  margin: auto;
  nav {
    margin: 16px 0;
  }
  .toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
  }
  select {
    padding: 8px;
  }
  .table-scroll {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
  }
  th,
  td {
    padding: 12px;
    border-bottom: 1px solid ${theme.colors.border};
    vertical-align: top;
  }
  td:first-child {
    min-width: 180px;
    overflow-wrap: anywhere;
  }
  time {
    white-space: nowrap;
  }
  [role='alert'] {
    color: #a52424;
  }
  @media (min-width: 800px) {
    padding: 40px 24px;
  }
`
