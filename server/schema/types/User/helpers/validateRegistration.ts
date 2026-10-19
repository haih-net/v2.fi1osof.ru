export interface RegistrationData {
  username?: string | null
  email?: string | null
  password: string
}
export function validateRegistration(data: RegistrationData): string | null {
  if (!data.username && !data.email) {
    return 'Укажите логин или электронную почту'
  }
  if (data.username && !/^[a-zA-Z0-9_]+$/.test(data.username)) {
    return 'Логин может содержать только латинские буквы, цифры и подчёркивания'
  }
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return 'Неверный формат адреса электронной почты'
  }
  if (!data.password) {
    return 'Укажите пароль'
  }
  if (
    data.password.length < 8 ||
    !/[a-z]/.test(data.password) ||
    !/[A-Z]/.test(data.password) ||
    !/[0-9]/.test(data.password)
  ) {
    return 'Пароль должен содержать не менее 8 символов, строчную и заглавную латинские буквы и цифру'
  }
  if (new TextEncoder().encode(data.password).length > 72) {
    return 'Пароль не должен превышать 72 байта'
  }
  return null
}
