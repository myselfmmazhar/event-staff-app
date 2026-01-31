import type { ServiceSelect } from './prisma-types';

export type Service = ServiceSelect;

export type ServiceTableRow = Pick<
  Service,
  | 'id'
  | 'serviceId'
  | 'title'
  | 'costUnitType'
  | 'experienceRequirement'
  | 'ratingRequirement'
  | 'cost'
  | 'price'
  | 'isActive'
  | 'createdAt'
>;

export type ServiceDeleteInfo = Pick<Service, 'title' | 'serviceId'>;

