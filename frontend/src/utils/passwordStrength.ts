const LETTER = /[a-zA-ZÀ-ÿ]/
const NUMBER = /\d/
/** Caractere que não seja letra nem dígito (símbolo ou pontuação). */
const SYMBOL = /[^a-zA-ZÀ-ÿ0-9]/

export type PasswordStrengthLevel = 'none' | 'weak' | 'medium' | 'strong'

export type PasswordStrength = {
  level: PasswordStrengthLevel
  label: string
  hasLetter: boolean
  hasNumber: boolean
  hasSymbol: boolean
  /** Critérios mínimos: letra, número, símbolo e 8+ caracteres. */
  meetsMinimum: boolean
}

export function analyzePasswordStrength(password: string): PasswordStrength {
  const hasLetter = LETTER.test(password)
  const hasNumber = NUMBER.test(password)
  const hasSymbol = SYMBOL.test(password)
  const meetsMinimum = hasLetter && hasNumber && hasSymbol && password.length >= 8

  if (password.length === 0) {
    return {
      level: 'none',
      label: '',
      hasLetter,
      hasNumber,
      hasSymbol,
      meetsMinimum: false,
    }
  }

  if (!meetsMinimum) {
    return {
      level: 'weak',
      label: 'Fraca',
      hasLetter,
      hasNumber,
      hasSymbol,
      meetsMinimum: false,
    }
  }

  if (password.length >= 12) {
    return {
      level: 'strong',
      label: 'Forte',
      hasLetter,
      hasNumber,
      hasSymbol,
      meetsMinimum: true,
    }
  }

  return {
    level: 'medium',
    label: 'Média',
    hasLetter,
    hasNumber,
    hasSymbol,
    meetsMinimum: true,
  }
}

export function passwordRegistrationError(password: string): string | null {
  const { hasLetter, hasNumber, hasSymbol, meetsMinimum } = analyzePasswordStrength(password)
  if (meetsMinimum) return null
  const missing: string[] = []
  if (!hasLetter) missing.push('letras')
  if (!hasNumber) missing.push('números')
  if (!hasSymbol) missing.push('um símbolo')
  if (password.length < 8) missing.push('pelo menos 8 caracteres')
  return `A senha deve incluir ${missing.join(', ')}.`
}
