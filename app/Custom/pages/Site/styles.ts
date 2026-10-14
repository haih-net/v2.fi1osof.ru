import { styled } from '@linaria/react'

export const PageStyled = styled.div`
  .breadcrumb {
    font: 12px monospace;
    color: #8a8578;
    margin: 0 0 20px;
  }
  .breadcrumb a {
    text-decoration: none;
  }
  .lead {
    color: #5a5a5a;
    max-width: 850px;
    margin: 0 0 32px;
  }
  &[data-section='projects'] {
    padding: 24px;
  }
  &[data-section='projects'] > section {
    padding: 48px 0 0;
  }
  &[data-section='projects'] .lead {
    border-bottom: 1px solid #e6e1d6;
    padding-bottom: 28px;
    max-width: 100%;
  }
  .project-card {
    background: white;
    border: 1px solid #e6e1d6;
    border-radius: 3px;
    overflow: hidden;
  }
  .project-card > a {
    display: block;
  }
  .project-card img {
    width: 100%;
    height: 160px;
    object-fit: cover;
    display: block;
  }
  .project-card > div {
    padding: 20px;
  }
  .project-card h3 {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    font-size: 17px;
    margin: 0 0 20px;
  }
  .project-card h3 a {
    text-decoration: none;
  }
  .project-card .badge {
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: 0.05em;
  }
  .grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .card,
  .article {
    background: #fff;
    border: 1px solid #e1e4e8;
    border-radius: 12px;
    padding: 20px 24px;
    box-shadow: 0 1px 2px #00000008;
  }
  .card {
    margin-bottom: 16px;
    min-width: 0;
  }
  .card h2,
  .card h3 {
    margin: 0 0 10px;
  }
  .card h2 {
    font-size: 22px;
  }
  .card h3 {
    font-size: 18px;
  }
  .card h2 a,
  .card h3 a {
    text-decoration: none;
  }
  .card h2 a:hover,
  .card h3 a:hover {
    color: #1e3a8a;
  }
  .grid .card {
    margin: 0;
    border-radius: 4px;
  }
  .article h1 {
    margin: 8px 0 28px;
  }
  .article {
    overflow: hidden;
  }
  .article img {
    max-width: 100%;
    height: auto;
  }
  .metadata {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    color: #8a8578;
    font: 12px/1.6 monospace;
    margin: 8px 0 16px;
  }
  .metadata a {
    color: #1e3a8a;
  }
  .badge {
    border-radius: 4px;
    padding: 2px 7px;
    background: #e8ecf7;
    color: #1e3a8a;
    font: 12px monospace;
  }
  .badge[data-status='Done'] {
    background: #e7f3ea;
    color: #1f6f43;
  }
  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 20px 0;
  }
  .filters a,
  .pagination a,
  .submit {
    padding: 7px 12px;
    border: 1px solid #e6e1d6;
    border-radius: 5px;
    text-decoration: none;
    background: #fff;
  }
  .filters a[aria-current='page'] {
    background: #1e3a8a;
    color: white;
    border-color: #1e3a8a;
  }
  .pagination {
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: center;
    margin: 32px 0;
  }
  .about {
    display: grid;
    gap: 32px;
  }
  .about img {
    width: 100%;
    max-width: 380px;
    border-radius: 8px;
  }
  .signin {
    max-width: 420px;
    margin: 40px auto;
  }
  .signin label {
    display: block;
    margin: 18px 0;
  }
  .signin input {
    display: block;
    width: 100%;
    padding: 10px;
    border: 1px solid #e6e1d6;
    border-radius: 4px;
  }
  .submit {
    cursor: pointer;
    background: #1e3a8a;
    color: white;
  }
  .error {
    color: #b7410e;
  }
  .project-image {
    width: 100%;
    height: 150px;
    object-fit: cover;
    margin-bottom: 12px;
  }
  @media (min-width: 768px) {
    .grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .about {
      grid-template-columns: 340px 1fr;
    }
  }
  @media (min-width: 1100px) {
    .grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }
`
