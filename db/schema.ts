import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const trips = sqliteTable('trips', {id:text('id').primaryKey(),owner:text('owner').notNull(),name:text('name').notNull(),destination:text('destination').notNull(),currency:text('currency').notNull(),start:text('start').notNull(),end:text('end').notNull(),created:integer('created').notNull()});
export const members = sqliteTable('members',{id:text('id').primaryKey(),trip:text('trip').notNull(),user:text('user').notNull()});
export const invites = sqliteTable('invites',{id:text('id').primaryKey(),trip:text('trip').notNull(),expires:integer('expires').notNull()});
export const expenses = sqliteTable('expenses',{id:text('id').primaryKey(),trip:text('trip').notNull(),user:text('user').notNull(),amount:integer('amount').notNull(),currency:text('currency').notNull(),category:text('category').notNull(),description:text('description').notNull(),date:text('date').notNull(),receipt:text('receipt'),authorName:text('authorName'),deleted:integer('deleted').notNull().default(0),updated:integer('updated').notNull()});

export const categories = sqliteTable('categories',{id:text('id').primaryKey(),trip:text('trip').notNull(),name:text('name').notNull(),icon:text('icon').notNull().default('other'),aliases:text('aliases').notNull().default('[]'),key:text('key').notNull().unique(),creator:text('creator').notNull()});
