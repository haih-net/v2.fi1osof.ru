import type * as React from 'react'
import { Link } from 'react-router'
import { EditorialPage } from 'app/Custom/components/EditorialPage'
import { SupportContact } from 'app/Custom/components/SupportContact'

export const ClientsPage: React.FC = () => (
  <EditorialPage>
    <h1 tabIndex={-1}>Клиенты, с которыми мы работаем годами</h1>
    <p className="lead">
      Три компании, для которых я создавал сайты больше десяти лет назад.
    </p>
    <p>
      В 2026 году все три проекта перешли на мою комплексную модель
      сопровождения, а сайты были полностью переработаны. Долгое знакомство с
      бизнесом помогает развивать их дальше, сохраняя накопленные данные и
      полезные процессы.
    </p>
    <div className="card">
      <h2>
        <Link to="/clients/kilfor">Kilfor.Ru</Link>
      </h2>
      <p>
        Бизнес-центр. Сотрудничество с 2016 года: сайт, пропуска и
        взаимодействие арендаторов с диспетчерской.
      </p>
    </div>
    <div className="card">
      <h2>
        <Link to="/clients/happybaby2000">HappyBaby2000.Ru</Link>
      </h2>
      <p>
        Магазин детских товаров. Новая витрина, поиск и собственный ИИ-помощник,
        связанные с существующим каталогом.
      </p>
    </div>
    <div className="card">
      <h2>
        <Link to="/clients/balldecor">BallDecor.Ru</Link>
      </h2>
      <p>
        Воздушные шары и оформление мероприятий. Обновление давнего сайта и
        возвращение к его постоянному развитию.
      </p>
    </div>
    <p>
      Предлагаю стать одним из таких клиентов: передать сайт специалисту,
      который знает его историю и заинтересован в долгом сотрудничестве.
    </p>
    <SupportContact />
  </EditorialPage>
)
