import type { CategorySelect } from './prisma-types';

export type Category = CategorySelect;

export type CategoryTableRow = Pick<
  Category,
  | 'id'
  | 'categoryId'
  | 'name'
  | 'description'
  | 'isActive'
  | 'createdAt'
>;

export type CategoryDeleteInfo = Pick<Category, 'name' | 'categoryId'>;
