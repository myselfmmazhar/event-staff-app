'use client';

import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ItemSelector, type ServiceItem, type ProductItem } from './item-selector';
import { AttachedItemsList, type AttachedServiceItem, type AttachedProductItem } from './attached-items-list';
import { ServiceFormModal } from '@/components/catalog/services/service-form-modal';
import { ProductFormModal } from '@/components/catalog/products/product-form-modal';
import { WrenchScrewdriverIcon, CubeIcon } from '@/components/ui/icons';
import { trpc } from '@/lib/client/trpc';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import type { CreateServiceInput } from '@/lib/schemas/service.schema';
import type { CreateProductInput } from '@/lib/schemas/product.schema';

interface EventAttachmentsSectionProps {
  attachedServices: AttachedServiceItem[];
  attachedProducts: AttachedProductItem[];
  onServicesChange: (services: AttachedServiceItem[]) => void;
  onProductsChange: (products: AttachedProductItem[]) => void;
  disabled?: boolean;
  className?: string;
}

export function EventAttachmentsSection({
  attachedServices,
  attachedProducts,
  onServicesChange,
  onProductsChange,
  disabled = false,
  className,
}: EventAttachmentsSectionProps) {
  const [showCreateService, setShowCreateService] = useState(false);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Service mutation
  const createServiceMutation = trpc.service.create.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Service created',
        description: 'Service created successfully',
      });
      // Map the created service to ServiceItem format and attach it
      const serviceItem: ServiceItem = {
        id: data.id,
        serviceId: data.serviceId,
        title: data.title,
        cost: data.cost ? Number(data.cost) : null,
        price: data.price ? Number(data.price) : null,
        costUnitType: data.costUnitType,
        description: data.description,
        isActive: data.isActive,
      };
      handleServiceSelect(serviceItem);
      setShowCreateService(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create service',
        variant: 'error',
      });
    },
  });

  // Product mutation
  const createProductMutation = trpc.product.create.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Product created',
        description: 'Product created successfully',
      });
      // Map the created product to ProductItem format and attach it
      const productItem: ProductItem = {
        id: data.id,
        productId: data.productId,
        title: data.title,
        cost: data.cost ? Number(data.cost) : null,
        price: data.price ? Number(data.price) : null,
        priceUnitType: data.priceUnitType,
        description: data.description,
        category: data.category,
        isActive: data.isActive,
      };
      handleProductSelect(productItem);
      setShowCreateProduct(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create product',
        variant: 'error',
      });
    },
  });

  // Service handlers
  const handleServiceSelect = useCallback((service: ServiceItem) => {
    const newAttachment: AttachedServiceItem = {
      serviceId: service.id,
      quantity: 1,
      customPrice: null,
      notes: null,
      service,
    };
    onServicesChange([...attachedServices, newAttachment]);
  }, [attachedServices, onServicesChange]);

  const handleServiceQuantityChange = useCallback((serviceId: string, quantity: number) => {
    onServicesChange(
      attachedServices.map((s) =>
        s.serviceId === serviceId ? { ...s, quantity } : s
      )
    );
  }, [attachedServices, onServicesChange]);

  const handleServicePriceChange = useCallback((serviceId: string, customPrice: number | null) => {
    onServicesChange(
      attachedServices.map((s) =>
        s.serviceId === serviceId ? { ...s, customPrice } : s
      )
    );
  }, [attachedServices, onServicesChange]);

  const handleServiceRemove = useCallback((serviceId: string) => {
    onServicesChange(attachedServices.filter((s) => s.serviceId !== serviceId));
  }, [attachedServices, onServicesChange]);

  const handleServiceSubmit = (data: CreateServiceInput) => {
    createServiceMutation.mutate(data);
  };

  // Product handlers
  const handleProductSelect = useCallback((product: ProductItem) => {
    const newAttachment: AttachedProductItem = {
      productId: product.id,
      quantity: 1,
      customPrice: null,
      notes: null,
      product,
    };
    onProductsChange([...attachedProducts, newAttachment]);
  }, [attachedProducts, onProductsChange]);

  const handleProductQuantityChange = useCallback((productId: string, quantity: number) => {
    onProductsChange(
      attachedProducts.map((p) =>
        p.productId === productId ? { ...p, quantity } : p
      )
    );
  }, [attachedProducts, onProductsChange]);

  const handleProductPriceChange = useCallback((productId: string, customPrice: number | null) => {
    onProductsChange(
      attachedProducts.map((p) =>
        p.productId === productId ? { ...p, customPrice } : p
      )
    );
  }, [attachedProducts, onProductsChange]);

  const handleProductRemove = useCallback((productId: string) => {
    onProductsChange(attachedProducts.filter((p) => p.productId !== productId));
  }, [attachedProducts, onProductsChange]);

  const handleProductSubmit = (data: CreateProductInput) => {
    createProductMutation.mutate(data);
  };

  // Calculate totals
  const servicesTotal = attachedServices.reduce((sum, item) => {
    const price = item.customPrice ?? item.service.cost;
    return sum + (price !== null ? Number(price) * item.quantity : 0);
  }, 0);

  const productsTotal = attachedProducts.reduce((sum, item) => {
    const price = item.customPrice ?? item.product.cost;
    return sum + (price !== null ? Number(price) * item.quantity : 0);
  }, 0);

  const grandTotal = servicesTotal + productsTotal;

  // Render modals via portal to avoid nested form issues
  const serviceModal = mounted && showCreateService
    ? createPortal(
      <ServiceFormModal
        service={null}
        open={showCreateService}
        onClose={() => setShowCreateService(false)}
        onSubmit={handleServiceSubmit}
        isSubmitting={createServiceMutation.isPending}
      />,
      document.body
    )
    : null;

  const productModal = mounted && showCreateProduct
    ? createPortal(
      <ProductFormModal
        product={null}
        open={showCreateProduct}
        onClose={() => setShowCreateProduct(false)}
        onSubmit={handleProductSubmit}
        isSubmitting={createProductMutation.isPending}
      />,
      document.body
    )
    : null;

  return (
    <div className={cn("bg-accent/5 border border-border/30 p-5 rounded-lg", className)}>
      <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">
        Services & Products
      </h3>

      <div className="space-y-6">
        {/* Services Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <WrenchScrewdriverIcon className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">Services</h4>
              {attachedServices.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({attachedServices.length})
                </span>
              )}
            </div>
            <ItemSelector
              type="service"
              excludeIds={attachedServices.map((s) => s.serviceId)}
              onSelect={handleServiceSelect}
              onCreateNew={() => setShowCreateService(true)}
              disabled={disabled}
            />
          </div>

          <AttachedItemsList
            type="service"
            items={attachedServices}
            onQuantityChange={handleServiceQuantityChange}
            onCustomPriceChange={handleServicePriceChange}
            onRemove={handleServiceRemove}
            disabled={disabled}
          />
        </div>

        {/* Products Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CubeIcon className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">Products</h4>
              {attachedProducts.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({attachedProducts.length})
                </span>
              )}
            </div>
            <ItemSelector
              type="product"
              excludeIds={attachedProducts.map((p) => p.productId)}
              onSelect={handleProductSelect}
              onCreateNew={() => setShowCreateProduct(true)}
              disabled={disabled}
            />
          </div>

          <AttachedItemsList
            type="product"
            items={attachedProducts}
            onQuantityChange={handleProductQuantityChange}
            onCustomPriceChange={handleProductPriceChange}
            onRemove={handleProductRemove}
            disabled={disabled}
          />
        </div>

        {/* Grand Total */}
        {(attachedServices.length > 0 || attachedProducts.length > 0) && (
          <div className="border-t pt-4">
            <div className="flex justify-end items-center gap-4">
              <span className="text-sm font-semibold">Grand Total:</span>
              <span className="text-lg font-bold">${grandTotal.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Modals rendered via portal */}
      {serviceModal}
      {productModal}
    </div>
  );
}

// Re-export types for convenience
export type { AttachedServiceItem, AttachedProductItem } from './attached-items-list';
export type { ServiceItem, ProductItem } from './item-selector';
