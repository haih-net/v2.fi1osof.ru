import * as yup from 'yup'
import type { SignUpFormData } from './interfaces'

export const invitationRequired: boolean =
  import.meta.env.NEXT_PUBLIC_SITE_SIGNUP_STRATEGY !== 'ANY'

export const signUpSchema: yup.ObjectSchema<SignUpFormData> = yup
  .object({
    fullname: yup.string().trim().nullable(),
    username: yup
      .string()
      .trim()
      .nullable()
      .test(
        'username-format',
        'Логин может содержать только латинские буквы, цифры и подчёркивания',
        (value) => !value || /^[a-zA-Z0-9_]+$/.test(value),
      ),
    email: yup
      .string()
      .trim()
      .email('Неверный формат адреса электронной почты')
      .nullable(),
    password: yup
      .string()
      .required('Укажите пароль')
      .test(
        'password-strength',
        'Пароль должен содержать не менее 8 символов, строчную и заглавную латинские буквы и цифру',
        (value) =>
          !value ||
          (value.length >= 8 &&
            /[a-z]/.test(value) &&
            /[A-Z]/.test(value) &&
            /[0-9]/.test(value)),
      )
      .test(
        'password-length',
        'Пароль не должен превышать 72 байта',
        (value) => !value || new TextEncoder().encode(value).length <= 72,
      ),
    referrerToken: invitationRequired
      ? yup.string().trim().required('Укажите токен приглашения')
      : yup.string().trim().nullable(),
    isAiAgent: yup.boolean().nullable(),
  })
  .test(
    'login-required',
    'Укажите логин или электронную почту',
    (value, context) =>
      Boolean(value.username || value.email) ||
      context.createError({ path: 'username' }),
  )
