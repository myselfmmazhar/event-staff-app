import type { ProductSelect } from './prisma-types';

export type Product = ProductSelect;

export type ProductTableRow = Pick<
  Product,
  | 'id'
  | 'productId'
  | 'title'
  | 'priceUnitType'
  | 'minimumPurchase'
  | 'trackInventory'
  | 'category'
  | 'cost'
  | 'price'
  | 'isActive'
  | 'createdAt'
>;

export type ProductDeleteInfo = Pick<Product, 'title' | 'productId'>;

