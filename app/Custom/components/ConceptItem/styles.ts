import { styled } from '@linaria/react'
export const ConceptPageStyled = styled.article`
  min-width: 0;
`
export const ConceptHeadingStyled = styled.header`
  padding: 24px 24px 0;
  max-width: 1328px;
  margin: auto;
  h1 {
    font-size: clamp(26px, 3.5vw, 42px);
    line-height: 1.18;
    letter-spacing: -0.025em;
    overflow-wrap: anywhere;
  }
  p {
    margin-bottom: 12px;
    color: #64748b;
    font-size: 13px;
    letter-spacing: 0.04em;
  }
  @media (min-width: 800px) {
    padding: 32px 40px 0;
  }
`
export const ConceptContentStyled = styled.section`
  margin-top: 24px;
  padding: 20px;
  line-height: 1.75;
  overflow-wrap: anywhere;
  img {
    max-width: 100%;
    height: auto;
  }
  @media (min-width: 560px) {
    margin-top: 36px;
    padding: 28px 32px;
  }
`
