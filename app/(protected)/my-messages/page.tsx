import { Suspense } from 'react';
import { PortalCommunicationManager } from '@/components/communication/portal-communication-manager';

export default function MyMessagesPage() {
    return (
        <Suspense>
            <PortalCommunicationManager />
        </Suspense>
    );
}
