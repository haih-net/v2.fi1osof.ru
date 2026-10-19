import React, { useCallback } from 'react'
import { Link } from 'react-router'
import { ArrowUpRight, Send } from 'lucide-react'
import { useChatContext } from '../../../components/Chat/ChatWidget/context'
import { MainPageViewStyled } from './styles'
import { useAppContext } from '../../../hooks/useAppContext'
import portrait from './assets/portrait.webp'
import technologies from './assets/technologies.webp'
import projectBefore from './assets/project-before.webp'
import projectAfter from './assets/project-after.webp'

export const MainPageView: React.FC = () => {
  const { openFeedback } = useAppContext()
  const chat = useChatContext()
  const { setIsOpen } = chat
  const openChat = useCallback((): void => setIsOpen(true), [setIsOpen])

  return (
    <MainPageViewStyled>
      <section className="intro" aria-labelledby="intro-title">
        <div>
          <h1 id="intro-title" tabIndex={-1}>
            Николай Ланец.
            <br />
            Программист, исследователь,
            <br />
            ИТ / ИИ-консультант
          </h1>
          <p>
            С 2007 года я занимаюсь разработкой: разбираюсь в чужом коде, создаю
            собственные платформы, поддерживаю работающие системы и исследую
            новые технологии. За это время я работал самостоятельно, руководил
            разработкой и участвовал в проектах крупных компаний.
          </p>
          <p>
            Сегодня я консультирую по ИТ и ИИ, внедряю агентов в реальные
            процессы и помогаю бизнесу поддерживать и развивать своё присутствие
            в интернете. Могу подключиться к отдельному вопросу или взять на
            себя длительную работу с проектом.
          </p>
          <p>
            Чтобы познакомиться, необязательно иметь большое техническое
            задание. Иногда полезнее начать с разговора.
          </p>
          <div className="actions">
            <button
              className="primary-action"
              type="button"
              onClick={openFeedback}
            >
              Обсудить вашу задачу
            </button>
            <button className="text-action" onClick={openChat} type="button">
              Пообщаться с моим ИИ <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
        <img
          className="portrait"
          src={portrait}
          alt="Николай Ланец"
          width={317}
          height={350}
          fetchPriority="high"
        />
      </section>

      <section aria-labelledby="experience-title">
        <h2 id="experience-title">19+ лет активного программирования</h2>
        <div className="two-columns">
          <p>
            Я продолжаю быть программистом, потому что это моя суть. С опытом
            многие специалисты переходят к управлению. У меня тоже был опыт
            технического руководства, но мне по-прежнему важно самому
            разбираться, писать код и проверять идеи в работе.
          </p>
          <p>
            Я основал MODX-Клуб в 2013 году, развивал собственные CMS и
            образовательную площадку Freecode Academy. Работал тимлидом и
            ведущим программистом в СберЛаб виртуальной и дополненной
            реальности. Сейчас исследую практическое применение ИИ и создаю
            собственные инструменты.
          </p>
        </div>
        <h3 className="technology-title">
          Работаю с разными поколениями веб-технологий
        </h3>
        <div className="technology-strip">
          <img
            src={technologies}
            width={677}
            height={59}
            alt="TypeScript, React, Node.js, GraphQL, Docker, PostgreSQL, PHP, MODX, Next.js, Prisma, Three.js"
            loading="lazy"
          />
        </div>
      </section>

      <section aria-labelledby="services-title">
        <h2 id="services-title">С чем я могу быть полезен</h2>
        <div className="service-row">
          <h3>
            ИТ / ИИ-консультант
            <br />и ментор
          </h3>
          <div>
            <p>
              Помогу разобраться в техническом вопросе, оценить предложенное
              решение или понять, с чего начать. Можно обратиться с конкретной
              проблемой, архитектурой проекта или вопросами о применении ИИ.
            </p>
            <p>
              Работаю с владельцами бизнеса, разработчиками и командами.
              Объясняю ход рассуждений и последствия решений — чтобы вы могли
              дальше действовать осознанно.
            </p>
          </div>
          <button className="text-action" type="button" onClick={openFeedback}>
            Обсудить вопрос <span aria-hidden="true">→</span>
          </button>
        </div>
        <div className="service-row">
          <h3>ИИ-интегратор</h3>
          <div>
            <p>
              Встраиваю ИИ в существующие сайты и рабочие процессы: диалоги с
              посетителями, работу с информацией, инструменты и действия
              агентов. Начинаю с задачи и доступных данных.
            </p>
            <p>
              Разрабатываю собственных агентов и чаты. Могу разобраться, где
              готового решения достаточно, а где нужны индивидуальная логика,
              память или интеграция с вашей системой.
            </p>
          </div>
          <button className="text-action" type="button" onClick={openFeedback}>
            Рассказать о процессе <span aria-hidden="true">→</span>
          </button>
        </div>
        <div className="service-row">
          <h3>Полное сопровождение бизнеса в интернете</h3>
          <div>
            <p>
              Разбираюсь в состоянии сайтов и связанных систем, восстанавливаю
              функции и последовательно развиваю проект. Необязательно заранее
              составлять список технических задач.
            </p>
            <p>
              Мой сильный опыт — сложные и устаревшие проекты. Чужой код,
              накопленные доработки и отсутствие документации не мешают начать
              разбор. Важно сохранить данные, полезные функции и привычные
              процессы.
            </p>
          </div>
          <button className="text-action" type="button" onClick={openFeedback}>
            Показать ваш проект <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>

      <section id="ai-chat" aria-labelledby="chat-title">
        <h2 id="chat-title">Мои ИИ-чаты — попробуйте в разговоре</h2>
        <div className="two-columns chat-columns">
          <div>
            <p>
              Я создаю собственных ИИ-агентов для разных задач. Это могут быть
              помощники для сайта, внутренние инструменты, чаты с доступом к
              вашим данным и интеграциями в рабочие процессы.
            </p>
            <p>
              Один из моих ИИ-чатов уже работает на этом сайте. Вы можете задать
              ему вопрос, попросить совет или обсудить идею. Так проще понять,
              как может выглядеть подобный помощник в вашей задаче.
            </p>
          </div>
          <div className="chat-preview">
            <div className="chat-heading">
              <img
                src={portrait}
                alt=""
                width={44}
                height={44}
                loading="lazy"
              />
              <strong>Мой ИИ-помощник</strong>
            </div>
            <p className="chat-greeting">
              Здравствуйте! Что вы хотели бы обсудить?
            </p>
            <button className="chat-launch" type="button" onClick={openChat}>
              <span>Ваш вопрос</span>
              <span className="send-icon">
                <Send size={20} aria-hidden="true" />
              </span>
              <span className="visually-hidden"> — открыть чат</span>
            </button>
          </div>
        </div>
      </section>

      <section aria-labelledby="projects-title">
        <h2 id="projects-title">Примеры проектов</h2>
        <h3>HappyBaby2000 — развитие существующего магазина</h3>
        <div className="two-columns project-images">
          <figure>
            <img
              src={projectBefore}
              alt="Прежняя витрина магазина HappyBaby2000"
              width={325}
              height={214}
              loading="lazy"
            />
            <figcaption>До</figcaption>
          </figure>
          <figure>
            <img
              src={projectAfter}
              alt="Обновлённая витрина магазина HappyBaby2000"
              width={315}
              height={214}
              loading="lazy"
            />
            <figcaption>После</figcaption>
          </figure>
        </div>
        <div className="project-description">
          <p>
            В этом проекте новая публичная часть связана с существующей базой.
            Управление магазином осталось в привычной MODX-админке. Такой подход
            позволяет обновлять сайт постепенно, сохраняя каталог, исторические
            адреса и рабочие процессы.
          </p>
          <Link className="text-action" to="/projects">
            Все проекты <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="two-columns upcoming-projects">
          {[1, 2].map((project) => (
            <figure key={project}>
              <div className="placeholder-pair" aria-hidden="true">
                <div />
                <div />
              </div>
              <figcaption>Материалы следующего проекта</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section aria-labelledby="contact-title">
        <h2 id="contact-title">Полезно просто быть на связи</h2>
        <div className="two-columns">
          <div>
            <p>
              Большой проект не обязателен. Можно прийти с небольшим вопросом,
              показать непонятную ошибку или попросить взгляд со стороны. Даже
              короткий разговор иногда помогает понять, куда двигаться.
            </p>
            <a
              className="primary-action telegram-action"
              href="https://t.me/Fi1osof"
              target="_blank"
              rel="noreferrer"
            >
              <Send size={20} aria-hidden="true" /> Написать в Telegram{' '}
              <ArrowUpRight size={18} aria-hidden="true" />
            </a>
          </div>
          <p>
            Я открыт и к небольшим, недорогим проектам. Они позволяют мне
            продолжать любимую работу — исследовать новые технологии и находить
            им практическое применение. Расскажите о своей задаче и бюджете, и
            мы обсудим подходящий объём работы.
          </p>
        </div>
      </section>
    </MainPageViewStyled>
  )
}
