'use client';

import { useState, useCallback } from 'react';
import { ItemSelector, type ServiceItem, type ProductItem } from './item-selector';
import { AttachedItemsList, type AttachedServiceItem, type AttachedProductItem } from './attached-items-list';
import { QuickCreateServiceModal } from './quick-create-service-modal';
import { QuickCreateProductModal } from './quick-create-product-modal';
import { WrenchScrewdriverIcon, CubeIcon } from '@/components/ui/icons';

interface EventAttachmentsSectionProps {
  attachedServices: AttachedServiceItem[];
  attachedProducts: AttachedProductItem[];
  onServicesChange: (services: AttachedServiceItem[]) => void;
  onProductsChange: (products: AttachedProductItem[]) => void;
  disabled?: boolean;
}

export function EventAttachmentsSection({
  attachedServices,
  attachedProducts,
  onServicesChange,
  onProductsChange,
  disabled = false,
}: EventAttachmentsSectionProps) {
  const [showCreateService, setShowCreateService] = useState(false);
  const [showCreateProduct, setShowCreateProduct] = useState(false);

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

  const handleServiceCreated = useCallback((service: ServiceItem) => {
    // Automatically attach the newly created service
    handleServiceSelect(service);
  }, [handleServiceSelect]);

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

  const handleProductCreated = useCallback((product: ProductItem) => {
    // Automatically attach the newly created product
    handleProductSelect(product);
  }, [handleProductSelect]);

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

  return (
    <div className="bg-accent/5 border border-border/30 p-5 rounded-lg mb-6">
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

      {/* Quick Create Modals */}
      <QuickCreateServiceModal
        open={showCreateService}
        onClose={() => setShowCreateService(false)}
        onCreated={handleServiceCreated}
      />
      <QuickCreateProductModal
        open={showCreateProduct}
        onClose={() => setShowCreateProduct(false)}
        onCreated={handleProductCreated}
      />
    </div>
  );
}

// Re-export types for convenience
export type { AttachedServiceItem, AttachedProductItem } from './attached-items-list';
export type { ServiceItem, ProductItem } from './item-selector';
