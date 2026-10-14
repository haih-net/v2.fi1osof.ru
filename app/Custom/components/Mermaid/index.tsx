import React, { useCallback, useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import mermaid, { MermaidConfig } from 'mermaid'

import {
  MermaidContainerStyled,
  MermaidContentWrapperStyled,
  MermaidDiagramPanelStyled,
  MermaidIconButtonStyled,
  MermaidSourceCodeStyled,
  MermaidSourcePanelStyled,
  MermaidStyled,
  MermaidTabsStyled,
  MermaidTabStyled,
  MermaidToolbarStyled,
} from './styles'

import { useBoolean } from 'app/Custom/hooks/useBoolean'

const ExpandIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
  </svg>
)

const CollapseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 14h6v6M14 4h6v6M10 14l-7 7M21 3l-7 7" />
  </svg>
)

const CodeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
  </svg>
)

type tabName = 'diagram' | 'source'

function isValidTabValue(value: string): value is tabName {
  return ['diagram', 'source'].includes(value) ? true : false
}

type MermaidProps = MermaidConfig & {
  source: string | null | undefined
  className?: string
}

export const Mermaid: React.FC<MermaidProps> = ({
  source,
  className,
  securityLevel = 'strict',
  ...other
}) => {
  const containerRef = useRef<HTMLDivElement>(null)

  const [expanded, , , toggleExpanded] = useBoolean()
  const [showSource, , , toggleSource] = useBoolean()
  const [activeTab, setActiveTab] = useState<tabName>('diagram')

  const toggleView = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault()
      event.stopPropagation()

      const value = event.currentTarget.value

      if (isValidTabValue(value)) {
        setActiveTab(value)
      }
    },
    [],
  )

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel,
    })
  }, [securityLevel])

  const options = JSON.stringify(other)

  useEffect(() => {
    let cancelled = false
    if (!source || !containerRef.current) {
      return
    }

    const renderDiagram = async () => {
      try {
        const id = `mermaid-${crypto.randomUUID()}`

        const program = `
%%{init: ${options}}%%

${source}
        `

        const { svg } = await mermaid.render(id, program)

        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg
        }
      } catch (error) {
        console.error('Mermaid render error:', error)
        if (!cancelled && containerRef.current) {
          containerRef.current.textContent = String(error)
        }
      }
    }

    void renderDiagram()
    return () => {
      cancelled = true
    }
  }, [options, source, expanded, securityLevel])

  const content = source ? (
    <MermaidStyled className={className} data-fullwidth={expanded}>
      <MermaidToolbarStyled>
        <MermaidIconButtonStyled onClick={toggleSource} title="Show source">
          <CodeIcon />
        </MermaidIconButtonStyled>
        <MermaidIconButtonStyled
          onClick={toggleExpanded}
          title={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? <CollapseIcon /> : <ExpandIcon />}
        </MermaidIconButtonStyled>
      </MermaidToolbarStyled>

      <MermaidTabsStyled>
        <MermaidTabStyled
          $active={activeTab === 'diagram'}
          onClick={toggleView}
          value="diagram"
        >
          Diagram
        </MermaidTabStyled>
        <MermaidTabStyled
          $active={activeTab === 'source'}
          onClick={toggleView}
          value="source"
        >
          Source
        </MermaidTabStyled>
      </MermaidTabsStyled>

      <MermaidContentWrapperStyled $showSource={showSource}>
        <MermaidDiagramPanelStyled $showSource={activeTab === 'source'}>
          <MermaidContainerStyled ref={containerRef} />
        </MermaidDiagramPanelStyled>
        <MermaidSourcePanelStyled
          $showSource={showSource || activeTab === 'source'}
        >
          <MermaidSourceCodeStyled>{source}</MermaidSourceCodeStyled>
        </MermaidSourcePanelStyled>
      </MermaidContentWrapperStyled>
    </MermaidStyled>
  ) : null

  return expanded ? ReactDOM.createPortal(content, document.body) : content
}
