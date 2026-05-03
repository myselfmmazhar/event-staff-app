import type { ServiceSelect } from './prisma-types';

export type Service = ServiceSelect;

export type ServiceTableRow = Pick<
  Service,
  | 'id'
  | 'serviceId'
  | 'title'
  | 'costUnitType'
  | 'cost'
  | 'price'
  | 'minimum'
  | 'expenditure'
  | 'expenditureAmount'
  | 'expenditureAmountType'
  | 'isActive'
  | 'createdAt'
  | 'category'
>;

export type ServiceDeleteInfo = Pick<Service, 'title' | 'serviceId'>;
