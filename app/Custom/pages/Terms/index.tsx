import type * as React from 'react'
import { Link } from 'react-router'
import { EditorialPage } from 'app/Custom/components/EditorialPage'
export const TermsPage: React.FC = () => (
  <EditorialPage>
    <h1 tabIndex={-1}>Термины и технологии</h1>
    <p className="lead">
      Что стоит за решениями, которые работают на сайтах моих клиентов.
    </p>
    <div className="card">
      <h2>
        <Link to="/terms/polza.ai">Polza.ai</Link>
      </h2>
      <p>
        Провайдер доступа к ИИ-моделям: единый API, расчёты в рублях, управление
        ключами и расходами. Объясняю, почему использую его для своих агентов.
      </p>
    </div>
  </EditorialPage>
)
