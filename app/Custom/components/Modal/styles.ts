import { theme } from 'app/Custom/theme'
import { styled } from '@linaria/react'

export const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${theme.zIndex.modal};
  padding: ${theme.spacing.lg};
`

export const ModalContent = styled.div`
  background: ${theme.backgrounds.paper};
  border-radius: ${theme.radii.lg};
  box-shadow: ${theme.shadows.md};
  max-width: 600px;
  width: 100%;
  max-height: 80dvh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`

export const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing.lg};
  border-bottom: 1px solid ${theme.colors.border};
`

export const ModalTitle = styled.h2`
  margin: 0;
  font-size: ${theme.fontSizes.xl};
  font-weight: 600;
  color: ${theme.colors.text.primary};
`

export const ModalClose = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: ${theme.colors.text.secondary};
  padding: ${theme.spacing.xs};
  line-height: 1;
  transition: color ${theme.transitions.fast};

  &:hover {
    color: ${theme.colors.text.primary};
  }
`

export const ModalBody = styled.div`
  padding: ${theme.spacing.lg};
  overflow-y: auto;
`
