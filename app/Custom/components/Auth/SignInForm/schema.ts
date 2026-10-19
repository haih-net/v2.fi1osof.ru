import * as yup from 'yup'
import { SignInFormData } from './interfaces'

export const signInSchema: yup.ObjectSchema<SignInFormData> = yup.object({
  username: yup.string().trim().required('Укажите логин или электронную почту'),
  password: yup.string().required('Укажите пароль'),
})
