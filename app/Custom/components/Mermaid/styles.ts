import { styled } from '@linaria/react'
import { theme } from 'app/Custom/theme'

const MOBILE_BREAKPOINT = `${theme.breakpoints.sm}px`

export const mermaidStyles = `
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100px;
  margin: 1em 0;

  svg {
    max-width: 100%;
    height: auto;
  }

  .error {
    color: ${theme.colors.error};
    background: ${theme.colors.error}10;
    padding: 1em;
    border-radius: 6px;
    border: 1px solid ${theme.colors.error}30;
  }
`

export const MermaidToolbarStyled = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  z-index: 1;
`

export const MermaidIconButtonStyled = styled.button`
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radii.sm};
  background: ${theme.backgrounds.paper};
  color: ${theme.colors.text.secondary};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all ${theme.transitions.fast};

  &:hover {
    background: ${theme.colors.gray[100]};
    border-color: ${theme.colors.borderHover};
    color: ${theme.colors.text.primary};
  }

  &:active {
    background: ${theme.colors.gray[200]};
  }

  svg {
    width: 16px;
    height: 16px;
  }
`

export const MermaidTabsStyled = styled.div`
  display: none;
  border-bottom: 1px solid ${theme.colors.border};
  margin-bottom: 8px;

  @media (max-width: ${MOBILE_BREAKPOINT}) {
    display: flex;
  }
`

export const MermaidTabStyled = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: ${({ $active }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};
  font-size: ${theme.fontSizes.sm};
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid
    ${({ $active }) => ($active ? theme.colors.primary : 'transparent')};
  transition: all ${theme.transitions.fast};

  &:hover {
    color: ${theme.colors.primary};
  }
`

export const MermaidContentWrapperStyled = styled.div<{ $showSource: boolean }>`
  display: flex;
  gap: 16px;

  @media (max-width: ${MOBILE_BREAKPOINT}) {
    flex-direction: column;
  }
`

export const MermaidDiagramPanelStyled = styled.div<{ $showSource: boolean }>`
  flex: 1;
  min-width: 0;

  @media (max-width: ${MOBILE_BREAKPOINT}) {
    display: ${({ $showSource }) => ($showSource ? 'none' : 'block')};
  }
`

export const MermaidSourcePanelStyled = styled.div<{ $showSource: boolean }>`
  flex: 1;
  min-width: 0;
  display: ${({ $showSource }) => ($showSource ? 'block' : 'none')};

  @media (max-width: ${MOBILE_BREAKPOINT}) {
    display: ${({ $showSource }) => ($showSource ? 'block' : 'none')};
  }
`

export const MermaidSourceCodeStyled = styled.pre`
  margin: 0;
  padding: 12px;
  background: ${theme.colors.gray[50]};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radii.md};
  font-size: ${theme.fontSizes.sm};
  font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  color: ${theme.colors.text.primary};
  line-height: 1.5;
`

export const MermaidContainerStyled = styled.div`
  ${mermaidStyles}
  width: 100%;
  height: 100%;
`

export const MermaidStyled = styled.div`
  position: relative;
  padding: 40px 0 12px;
  border-top: 1px solid ${theme.colors.border};
  border-bottom: 1px solid ${theme.colors.border};

  &[data-fullwidth='true'] {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 48px 16px 16px;
    background-color: ${theme.backgrounds.paper};
    z-index: ${theme.zIndex.modal};

    ${MermaidContainerStyled} {
      overflow: auto;
    }

    ${MermaidToolbarStyled} {
      top: 12px;
      right: 12px;
    }
  }
`
