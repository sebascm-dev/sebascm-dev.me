export interface Skill {
  name: string
  icon: string
  level?: 'básico' | 'intermedio' | 'avanzado'
}

export interface SkillCategory {
  name: string
  skills: Skill[]
}

export interface About {
  name: string
  role: string
  tagline: string
  bio: string
  photo: string
  email: string
  github: string
  linkedin: string
}
