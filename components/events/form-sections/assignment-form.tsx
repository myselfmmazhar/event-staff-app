'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { SearchIcon, PlusIcon, ChevronDownIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/client/trpc';
import { assignmentFormSchema, type AssignmentFormInput } from '@/lib/schemas/assignment.schema';
import {
  ASSIGNMENT_TYPE_OPTIONS,
  COST_UNIT_TYPE_OPTIONS,
  PRICE_UNIT_TYPE_OPTIONS,
  EXPERIENCE_REQUIREMENT_OPTIONS,
  STAFF_RATING_OPTIONS,
  RATE_TYPE_OPTIONS,
} from '@/lib/constants/enums';
import { RateType } from '@prisma/client';
import type {
  Assignment,
  AssignmentSaveAction,
  ProductItem,
  ServiceItem,
} from '@/lib/types/assignment.types';

interface AssignmentFormProps {
  /** Existing assignment to edit (null for new) */
  assignment: Assignment | null;
  /** Called when assignment is saved */
  onSave: (assignment: Assignment, action: AssignmentSaveAction) => void;
  /** Called when form is cancelled */
  onCancel: () => void;
  /** Opens modal to create new service */
  onCreateService?: () => void;
  /** Opens modal to create new product */
  onCreateProduct?: () => void;
  /** Whether form is disabled */
  disabled?: boolean;
}

export function AssignmentForm({
  assignment,
  onSave,
  onCancel,
  onCreateService,
  onCreateProduct,
  disabled = false,
}: AssignmentFormProps) {
  const [productSelectorOpen, setProductSelectorOpen] = useState(false);
  const [serviceSelectorOpen, setServiceSelectorOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(
    assignment?.type === 'PRODUCT' ? assignment.product : null
  );
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(
    assignment?.type === 'SERVICE' ? assignment.service : null
  );

  // Fetch products and services
  const productsQuery = trpc.product.getAll.useQuery(
    { search: '', isActive: true, limit: 100 },
    { staleTime: 30000 }
  );
  const servicesQuery = trpc.service.getAll.useQuery(
    { search: '', isActive: true, limit: 100 },
    { staleTime: 30000 }
  );

  // Form setup
  const form = useForm<AssignmentFormInput>({
    resolver: zodResolver(assignmentFormSchema) as any,
    defaultValues: assignment
      ? {
          type: assignment.type,
          productId: assignment.type === 'PRODUCT' ? assignment.productId : undefined,
          serviceId: assignment.type === 'SERVICE' ? assignment.serviceId : undefined,
          quantity: assignment.quantity,
          customCost: assignment.customCost,
          customPrice: assignment.customPrice,
          costUnitType: assignment.costUnitType,
          commission: assignment.commission,
          description: assignment.type === 'PRODUCT' ? assignment.description : undefined,
          instructions: assignment.type === 'PRODUCT' ? assignment.instructions : undefined,
          startDate: assignment.type === 'SERVICE' ? assignment.startDate : undefined,
          startTime: assignment.type === 'SERVICE' ? assignment.startTime : undefined,
          endDate: assignment.type === 'SERVICE' ? assignment.endDate : undefined,
          endTime: assignment.type === 'SERVICE' ? assignment.endTime : undefined,
          experienceRequired: assignment.type === 'SERVICE' ? assignment.experienceRequired : 'ANY',
          ratingRequired: assignment.type === 'SERVICE' ? assignment.ratingRequired : 'ANY',
          approveOvertime: assignment.type === 'SERVICE' ? assignment.approveOvertime : false,
          payRate: assignment.type === 'SERVICE' ? assignment.payRate : null,
          billRate: assignment.type === 'SERVICE' ? assignment.billRate : null,
          rateType: assignment.type === 'SERVICE' ? assignment.rateType : null,
          notes: assignment.type === 'SERVICE' ? assignment.notes : null,
        }
      : {
          type: 'SERVICE',
          quantity: 1,
          customCost: null,
          customPrice: null,
          costUnitType: null,
          commission: false,
          experienceRequired: 'ANY',
          ratingRequired: 'ANY',
          approveOvertime: false,
          payRate: null,
          billRate: null,
          rateType: null,
          notes: null,
        },
  });

  const { register, control, watch, setValue, handleSubmit, formState: { errors }, trigger } = form;
  const assignmentType = watch('type');
  const startDate = watch('startDate');

  // Filter products based on search
  const filteredProducts = useMemo(() => {
    const products = (productsQuery.data?.data || []) as ProductItem[];
    if (!productSearch.trim()) return products;
    const searchLower = productSearch.toLowerCase();
    return products.filter(
      (p) =>
        p.title.toLowerCase().includes(searchLower) ||
        p.productId.toLowerCase().includes(searchLower) ||
        (p.category && p.category.toLowerCase().includes(searchLower))
    );
  }, [productsQuery.data, productSearch]);

  // Filter services based on search
  const filteredServices = useMemo(() => {
    const services = (servicesQuery.data?.data || []) as ServiceItem[];
    if (!serviceSearch.trim()) return services;
    const searchLower = serviceSearch.toLowerCase();
    return services.filter(
      (s) =>
        s.title.toLowerCase().includes(searchLower) ||
        s.serviceId.toLowerCase().includes(searchLower)
    );
  }, [servicesQuery.data, serviceSearch]);

  // Handle product selection
  const handleProductSelect = (product: ProductItem) => {
    setSelectedProduct(product);
    setValue('productId', product.id);
    setValue('customCost', product.cost);
    setValue('customPrice', product.price);
    setValue('costUnitType', product.priceUnitType || 'UNIT');
    setValue('description', product.description || '');
    setProductSelectorOpen(false);
    setProductSearch('');
  };

  // Handle service selection
  const handleServiceSelect = (service: ServiceItem) => {
    setSelectedService(service);
    setValue('serviceId', service.id);
    setValue('customCost', service.cost);
    setValue('customPrice', service.price);
    setValue('costUnitType', service.costUnitType || 'ASSIGNMENT');
    // Auto-fill pay/bill rates from service cost/price
    setValue('payRate', service.cost);
    setValue('billRate', service.price);
    // Map costUnitType to RateType
    const rateTypeMap: Record<string, RateType> = {
      'HOURLY': 'PER_HOUR',
      'SHIFT': 'PER_SHIFT',
      'DAY': 'PER_DAY',
      'JOB': 'PER_EVENT',
      'ASSIGNMENT': 'PER_SHIFT',
    };
    setValue('rateType', service.costUnitType ? rateTypeMap[service.costUnitType] || 'PER_HOUR' : 'PER_HOUR');
    setServiceSelectorOpen(false);
    setServiceSearch('');
  };

  // Clear selection when type changes
  useEffect(() => {
    if (assignmentType === 'PRODUCT') {
      setSelectedService(null);
      setValue('serviceId', undefined);
    } else {
      setSelectedProduct(null);
      setValue('productId', undefined);
    }
  }, [assignmentType, setValue]);

  // Auto-set end date to match start date when start date changes (for SERVICE assignments)
  useEffect(() => {
    if (assignmentType === 'SERVICE' && startDate) {
      setValue('endDate', startDate);
    }
  }, [assignmentType, startDate, setValue]);

  // Format price for display
  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return '';
    return `$${Number(price).toFixed(2)}`;
  };

  // Handle form submission with action
  const handleSaveWithAction = async (action: AssignmentSaveAction) => {
    const isValid = await trigger();
    if (!isValid) return;

    handleSubmit((data) => {
      const id = assignment?.id || crypto.randomUUID();

      if (data.type === 'PRODUCT') {
        const productAssignment: Assignment = {
          id,
          type: 'PRODUCT',
          productId: data.productId!,
          product: selectedProduct,
          quantity: data.quantity,
          customCost: data.customCost ?? null,
          customPrice: data.customPrice ?? null,
          costUnitType: data.costUnitType ?? null,
          commission: data.commission,
          description: data.description ?? null,
          instructions: data.instructions ?? null,
        };
        onSave(productAssignment, action);
      } else {
        const serviceAssignment: Assignment = {
          id,
          type: 'SERVICE',
          serviceId: data.serviceId!,
          service: selectedService,
          quantity: data.quantity,
          customCost: data.customCost ?? null,
          customPrice: data.customPrice ?? null,
          costUnitType: data.costUnitType ?? null,
          commission: data.commission,
          startDate: data.startDate ?? null,
          startTime: data.startTime ?? null,
          endDate: data.endDate ?? null,
          endTime: data.endTime ?? null,
          experienceRequired: data.experienceRequired || 'ANY',
          ratingRequired: data.ratingRequired || 'ANY',
          approveOvertime: data.approveOvertime || false,
          payRate: data.payRate ?? null,
          billRate: data.billRate ?? null,
          rateType: data.rateType ?? null,
          notes: data.notes ?? null,
        };
        onSave(serviceAssignment, action);
      }
    })();
  };

  return (
    <div>
      {/* Form Content */}
      <div className="space-y-6">
      {/* Assignment Type */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Assignment Type</Label>
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNMENT_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Product Selection (when type is PRODUCT) */}
      {assignmentType === 'PRODUCT' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_120px] gap-4 items-end">
            <div>
              <Label className="text-sm font-medium mb-2 block">Select Product</Label>
              <Popover open={productSelectorOpen} onOpenChange={setProductSelectorOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between"
                    disabled={disabled}
                  >
                    {selectedProduct ? selectedProduct.title : 'Add new or type saved selection'}
                    <ChevronDownIcon className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                  <div className="p-2 border-b">
                    <div className="relative">
                      <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search products..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="pl-8 h-9"
                      />
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {productsQuery.isLoading ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
                    ) : filteredProducts.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        {productSearch ? 'No products found' : 'No products available'}
                      </div>
                    ) : (
                      <div className="py-1">
                        {filteredProducts.map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            className="w-full flex items-start gap-3 px-3 py-2 text-left hover:bg-accent/50 transition-colors"
                            onClick={() => handleProductSelect(product)}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{product.title}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {product.productId}
                                {product.category && ` • ${product.category}`}
                              </div>
                            </div>
                            {product.cost !== null && (
                              <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                                {formatPrice(product.cost)}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {onCreateProduct && (
                    <div className="border-t p-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-2"
                        onClick={() => {
                          onCreateProduct();
                          setProductSelectorOpen(false);
                        }}
                      >
                        <PlusIcon className="h-4 w-4" />
                        Create New Product
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              {errors.productId && (
                <p className="text-sm text-destructive mt-1">{errors.productId.message}</p>
              )}
            </div>

            {onCreateProduct && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCreateProduct}
                disabled={disabled}
                className="gap-1"
              >
                <PlusIcon className="h-4 w-4" />
                Create New
              </Button>
            )}

            <div>
              <Label htmlFor="quantity" className="text-sm font-medium mb-2 block">Qty Needed</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                {...register('quantity', { valueAsNumber: true })}
                disabled={disabled}
              />
            </div>
          </div>

          {/* Product Description */}
          <div>
            <Label htmlFor="description" className="text-sm font-medium mb-2 block">Product Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              disabled={disabled}
              placeholder="Prefilled based on saved product, but can be overridden"
              rows={2}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Prefilled based on saved product, but can be override on individual case basis
            </p>
          </div>

          {/* Instructions */}
          <div>
            <Label htmlFor="instructions" className="text-sm font-medium mb-2 block">Instructions</Label>
            <Textarea
              id="instructions"
              {...register('instructions')}
              disabled={disabled}
              placeholder="Special instructions for this product..."
              rows={2}
            />
          </div>
        </>
      )}

      {/* Service Selection (when type is SERVICE) */}
      {assignmentType === 'SERVICE' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_120px] gap-4 items-end">
            <div>
              <Label className="text-sm font-medium mb-2 block">Select Service</Label>
              <Popover open={serviceSelectorOpen} onOpenChange={setServiceSelectorOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between"
                    disabled={disabled}
                  >
                    {selectedService ? selectedService.title : 'Add new or type saved selection'}
                    <ChevronDownIcon className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                  <div className="p-2 border-b">
                    <div className="relative">
                      <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search services..."
                        value={serviceSearch}
                        onChange={(e) => setServiceSearch(e.target.value)}
                        className="pl-8 h-9"
                      />
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {servicesQuery.isLoading ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
                    ) : filteredServices.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        {serviceSearch ? 'No services found' : 'No services available'}
                      </div>
                    ) : (
                      <div className="py-1">
                        {filteredServices.map((service) => (
                          <button
                            key={service.id}
                            type="button"
                            className="w-full flex items-start gap-3 px-3 py-2 text-left hover:bg-accent/50 transition-colors"
                            onClick={() => handleServiceSelect(service)}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{service.title}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {service.serviceId}
                              </div>
                            </div>
                            {service.cost !== null && (
                              <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                                {formatPrice(service.cost)}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {onCreateService && (
                    <div className="border-t p-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-2"
                        onClick={() => {
                          onCreateService();
                          setServiceSelectorOpen(false);
                        }}
                      >
                        <PlusIcon className="h-4 w-4" />
                        Create New Service
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              {errors.serviceId && (
                <p className="text-sm text-destructive mt-1">{errors.serviceId.message}</p>
              )}
            </div>

            {onCreateService && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCreateService}
                disabled={disabled}
                className="gap-1"
              >
                <PlusIcon className="h-4 w-4" />
                Create New
              </Button>
            )}

            <div>
              <Label htmlFor="quantity" className="text-sm font-medium mb-2 block">Qty Needed</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                {...register('quantity', { valueAsNumber: true })}
                disabled={disabled}
              />
            </div>
          </div>

          {/* Date & Time Fields */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="startDate" className="text-sm font-medium mb-2 block">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                {...register('startDate')}
                disabled={disabled}
              />
            </div>
            <div>
              <Label htmlFor="startTime" className="text-sm font-medium mb-2 block">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                {...register('startTime')}
                disabled={disabled}
              />
            </div>
            <div>
              <Label htmlFor="endDate" className="text-sm font-medium mb-2 block">End Date</Label>
              <Input
                id="endDate"
                type="date"
                {...register('endDate')}
                disabled={disabled}
              />
            </div>
            <div>
              <Label htmlFor="endTime" className="text-sm font-medium mb-2 block">End Time</Label>
              <Input
                id="endTime"
                type="time"
                {...register('endTime')}
                disabled={disabled}
              />
            </div>
          </div>

          {/* Experience & Rating */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Experience</Label>
              <Controller
                name="experienceRequired"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPERIENCE_REQUIREMENT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">Rating</Label>
              <Controller
                name="ratingRequired"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      {STAFF_RATING_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">Approve Overtime?</Label>
              <div className="flex items-center gap-4 h-10">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="approveOvertime"
                    checked={watch('approveOvertime') === true}
                    onChange={() => setValue('approveOvertime', true)}
                    disabled={disabled}
                    className="accent-primary"
                  />
                  <span className="text-sm">Yes</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="approveOvertime"
                    checked={watch('approveOvertime') === false}
                    onChange={() => setValue('approveOvertime', false)}
                    disabled={disabled}
                    className="accent-primary"
                  />
                  <span className="text-sm">No</span>
                </label>
              </div>
            </div>
          </div>

          {/* Pay Rate, Bill Rate, Rate Type */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="payRate" className="text-sm font-medium mb-2 block">Pay Rate</Label>
              <Input
                id="payRate"
                type="number"
                step="0.01"
                min={0}
                {...register('payRate', { valueAsNumber: true })}
                disabled={disabled}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Rate paid to staff
              </p>
            </div>
            <div>
              <Label htmlFor="billRate" className="text-sm font-medium mb-2 block">Bill Rate</Label>
              <Input
                id="billRate"
                type="number"
                step="0.01"
                min={0}
                {...register('billRate', { valueAsNumber: true })}
                disabled={disabled}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Rate billed to client
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">Rate Type</Label>
              <Controller
                name="rateType"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || ''}
                    onValueChange={field.onChange}
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select rate type" />
                    </SelectTrigger>
                    <SelectContent>
                      {RATE_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

        </>
      )}

      {/* Cost, Price, Unit Type - Common for both */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="customCost" className="text-sm font-medium mb-2 block">
            {assignmentType === 'SERVICE' ? 'Estimated Cost' : 'Cost'}
          </Label>
          <Input
            id="customCost"
            type="number"
            step="0.01"
            min={0}
            {...register('customCost', { valueAsNumber: true })}
            disabled={disabled}
            placeholder="0.00"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Prefilled based on saved {assignmentType === 'SERVICE' ? 'service' : 'product'}, but can be override on individual case basis
          </p>
        </div>
        <div>
          <Label htmlFor="customPrice" className="text-sm font-medium mb-2 block">
            {assignmentType === 'SERVICE' ? 'Estimated Price' : 'Price'}
          </Label>
          <Input
            id="customPrice"
            type="number"
            step="0.01"
            min={0}
            {...register('customPrice', { valueAsNumber: true })}
            disabled={disabled}
            placeholder="0.00"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Prefilled based on saved {assignmentType === 'SERVICE' ? 'service' : 'product'}, but can be override on individual case basis
          </p>
        </div>
        <div>
          <Label className="text-sm font-medium mb-2 block">Cost/Price Unit Type</Label>
          <Controller
            name="costUnitType"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value || ''}
                onValueChange={field.onChange}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit type" />
                </SelectTrigger>
                <SelectContent>
                  {(assignmentType === 'SERVICE' ? COST_UNIT_TYPE_OPTIONS : PRICE_UNIT_TYPE_OPTIONS).map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div>
          <Label className="text-sm font-medium mb-2 block">Commission?</Label>
          <div className="flex items-center gap-4 h-10">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="commission"
                checked={watch('commission') === true}
                onChange={() => setValue('commission', true)}
                disabled={disabled}
                className="accent-primary"
              />
              <span className="text-sm">Yes</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="commission"
                checked={watch('commission') === false}
                onChange={() => setValue('commission', false)}
                disabled={disabled}
                className="accent-primary"
              />
              <span className="text-sm">No</span>
            </label>
          </div>
        </div>
      </div>

      {/* Notes - Service only, at end */}
      {assignmentType === 'SERVICE' && (
        <div>
          <Label htmlFor="notes" className="text-sm font-medium mb-2 block">Notes</Label>
          <Textarea
            id="notes"
            {...register('notes')}
            disabled={disabled}
            placeholder="Internal notes for this assignment..."
            rows={3}
          />
        </div>
      )}

      </div>

      {/* Save Options */}
      <div className="border-t pt-4 mt-4">
        <Label className="text-sm font-medium mb-3 block">Save options</Label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="default"
            onClick={() => handleSaveWithAction('close')}
            disabled={disabled}
          >
            Save & Close
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleSaveWithAction('new')}
            disabled={disabled}
          >
            Save & New
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleSaveWithAction('repeat')}
            disabled={disabled}
          >
            Save & Repeat
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={disabled}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
