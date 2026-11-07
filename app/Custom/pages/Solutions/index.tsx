import type * as React from 'react'
import { Link } from 'react-router'
import { EditorialPage } from 'app/Custom/components/EditorialPage'
import { SupportContact } from 'app/Custom/components/SupportContact'
export const SolutionsPage: React.FC = () => (
  <EditorialPage>
    <h1 tabIndex={-1}>Решения для вашего сайта</h1>
    <p className="lead">Что может получить ваш бизнес на моём сопровождении.</p>
    <p>
      Здесь — примеры решений, которые я создаю и развиваю. Подбираю их под
      задачи конкретного проекта: вашему сайту не обязательно нужно всё
      перечисленное. Возможности моей работы этим списком не ограничиваются.
    </p>
    <div className="card">
      <h2>
        <Link to="/solutions/ai-seller">ИИ-продавец и консультант сайта</Link>
      </h2>
      <p>
        Помогает посетителю разобраться в предложении, найти подходящий товар и
        перейти к следующему шагу. Работает с данными и инструментами самого
        сайта.
      </p>
    </div>
    <div className="card">
      <h2>
        <Link to="/solutions/incremental-sales">
          Дополнительные возможности для продаж
        </Link>
      </h2>
      <p>
        Помощь тем, кто уже пришёл: понятный поиск, ответы на вопросы,
        рекомендации и удобный путь до заказа.
      </p>
    </div>
    <div className="card">
      <h2>
        <Link to="/solutions/business-operations">
          Сайт, на котором работает бизнес
        </Link>
      </h2>
      <p>
        Личные кабинеты, пропуска и заявки. Ежедневные процессы сотрудников,
        арендаторов и клиентов.
      </p>
    </div>
    <div className="card">
      <h2>
        <Link to="/solutions/ai-visibility">
          Компания в генеративном поиске
        </Link>
      </h2>
      <p>
        Информационный контур, который помогает поисковым системам и ИИ
        понимать, кто вы и чем полезны.
      </p>
    </div>
    <p>
      Я предлагаю одну услугу — постоянное сопровождение сайта. Решения
      внедряются и развиваются в рамках этого сотрудничества.
    </p>
    <SupportContact />
  </EditorialPage>
)
