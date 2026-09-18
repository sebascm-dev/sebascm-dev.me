import { pgTable, serial, text, varchar, integer, timestamp, boolean, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Perfil personal — un solo registro
export const profile = pgTable("profile", {
  id: serial("id").primaryKey(),
  // Datos personales
  firstName: varchar("first_name", { length: 100 }),
  lastName1: varchar("last_name_1", { length: 100 }),
  lastName2: varchar("last_name_2", { length: 100 }),
  birthDate: date("birth_date"),
  dni: varchar("dni", { length: 20 }),
  email: varchar("email", { length: 100 }),
  phone: varchar("phone", { length: 30 }),
  location: varchar("location", { length: 150 }),
  province: varchar("province", { length: 100 }),
  zip: varchar("zip", { length: 10 }),
  community: varchar("community", { length: 150 }),
  country: varchar("country", { length: 100 }),
  // Datos profesionales
  jobTitle: varchar("job_title", { length: 100 }),
  experience: integer("experience"),
  degree: varchar("degree", { length: 150 }),
  bio: text("bio"),
  available: boolean("available").default(false),
  // Redes sociales
  github: text("github"),
  linkedin: text("linkedin"),
  twitter: text("twitter"),
  instagram: text("instagram"),
  youtube: text("youtube"),
  website: text("website"),
  // Archivos en R2
  avatarUrl: text("avatar_url"),
  avatarKey: text("avatar_key"),
  cvUrl: text("cv_url"),
  cvKey: text("cv_key"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Proyectos
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  title: varchar("title", { length: 150 }).notNull(),
  description: text("description"),
  content: text("content"), // contenido del blog en markdown
  coverUrl: text("cover_url"),
  coverKey: text("cover_key"),
  techStack: text("tech_stack").array(),
  liveUrl: text("live_url"),
  repoUrl: text("repo_url"),
  published: boolean("published").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Imágenes de un proyecto además de la portada: mockups e imágenes referenciadas desde el markdown
export const projectImages = pgTable("project_images", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  key: text("key").notNull(),
  kind: varchar("kind", { length: 20 }).notNull().default("mockup"), // 'mockup' | 'content'
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projectsRelations = relations(projects, ({ many }) => ({
  images: many(projectImages),
}));

export const projectImagesRelations = relations(projectImages, ({ one }) => ({
  project: one(projects, { fields: [projectImages.projectId], references: [projects.id] }),
}));
